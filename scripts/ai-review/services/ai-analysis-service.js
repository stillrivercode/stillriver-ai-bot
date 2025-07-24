#!/usr/bin/env node

/**
 * AI Analysis Service for Code Review
 *
 * Integrates with OpenRouter API to generate code suggestions
 * and analyze pull request changes
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class AIAnalysisService {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
    this.model = options.model || 'anthropic/claude-3.5-sonnet';
    this.maxTokens = options.maxTokens || 4000;
    this.temperature = options.temperature || 0.1;
    this.openRouterScript = path.join(
      __dirname,
      '../../lib/openrouter-client.sh'
    );

    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is required');
    }
  }

  /**
   * Analyze PR diff and generate suggestions
   * @param {Object} prData - Pull request data
   * @param {Array} files - Array of file changes
   * @param {Object} context - Additional context (coding standards, etc.)
   * @returns {Array} Array of suggestions with confidence scores
   */
  async analyzePullRequest(prData, files, context = {}) {
    const suggestions = [];

    for (const file of files) {
      try {
        const fileSuggestions = await this.analyzeFile(file, context);
        suggestions.push(...fileSuggestions);
      } catch (error) {
        console.error('Error analyzing file:', file.filename, error);
      }
    }

    // Return all suggestions - rate limiting will be handled by format-suggestions.sh
    return suggestions;
  }

  /**
   * Analyze a single file and generate suggestions
   */
  async analyzeFile(file, context) {
    const prompt = this.buildAnalysisPrompt(file, context);
    const response = await this.callOpenRouter(prompt);

    try {
      const parsedResponse = this.parseAIResponse(response);
      return this.enrichSuggestions(parsedResponse, file);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return [];
    }
  }

  /**
   * Build analysis prompt for the AI
   */
  buildAnalysisPrompt(file, context) {
    const { filename, patch, additions, deletions } = file;
    const codingStandards = context.codingStandards || '';
    const projectContext = context.projectContext || '';

    return `You are an expert code reviewer. Analyze the following code changes and provide specific, actionable suggestions for improvement.

File: ${filename}
Changes: +${additions} -${deletions}

${codingStandards ? `Coding Standards:\n${codingStandards}\n` : ''}
${projectContext ? `Project Context:\n${projectContext}\n` : ''}

Code Diff:
\`\`\`
${patch}
\`\`\`

Provide your analysis in the following JSON format. Be extremely selective and only flag:
1. Critical security vulnerabilities with definitive fixes
2. Null pointer exceptions with clear resolution paths
3. Type mismatches causing compilation errors
4. Resource leaks with obvious fix patterns
5. Logic errors with unambiguous corrections

For each issue found, provide:
{
  "suggestions": [
    {
      "title": "Brief title of the issue",
      "description": "Detailed explanation of the problem and why it matters",
      "severity": "critical|high|medium|low",
      "category": "security|type-safety|logic-error|performance|style",
      "line": <line number in the new file>,
      "originalCode": "The problematic code",
      "suggestedCode": "The fixed code",
      "ai_certainty": "definitive|probable|possible",
      "rationale": "Why this change is necessary"
    }
  ]
}

Only return suggestions where you have HIGH confidence the issue is real and the fix is correct.
Focus on CRITICAL issues that could cause security vulnerabilities, crashes, or data corruption.
For subjective style preferences or speculative optimizations, do not include them.`;
  }

  /**
   * Call OpenRouter API using the shell script
   */
  async callOpenRouter(prompt) {
    // Create a temporary file for the prompt to handle complex content
    const tmpPromptFile = `/tmp/ai-review-prompt-${Date.now()}.txt`;
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await fs.writeFile(tmpPromptFile, prompt);

    try {
      // Source the OpenRouter client and call the API
      const command = `
        export OPENROUTER_API_KEY="${this.apiKey}"
        source "${this.openRouterScript}"

        # Read prompt from file
        PROMPT=$(cat "${tmpPromptFile}")

        # Call OpenRouter API
        if call_openrouter_api "${this.model}" "$PROMPT" ${this.maxTokens} ${this.temperature}; then
          echo "$OPENROUTER_RESPONSE"
        else
          echo "ERROR: Failed to call OpenRouter API" >&2
          exit 1
        fi
      `;

      const response = execSync(command, {
        shell: '/bin/bash',
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      return response.trim();
    } catch (error) {
      console.error('OpenRouter API call failed:', error);
      throw new Error(`AI analysis failed: ${error.message}`);
    } finally {
      // Clean up temp file
      try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        await fs.unlink(tmpPromptFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Parse AI response and extract suggestions
   */
  parseAIResponse(response) {
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*"suggestions"[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error('Invalid response format');
      }

      return parsed.suggestions;
    } catch {
      // Try to extract suggestions from non-JSON response
      console.warn('Failed to parse JSON, attempting text extraction');
      return this.extractSuggestionsFromText(response);
    }
  }

  /**
   * Fallback text extraction when JSON parsing fails
   */
  extractSuggestionsFromText(response) {
    const suggestions = [];

    // Simple pattern matching for common issue indicators
    const patterns = [
      {
        // eslint-disable-next-line security/detect-unsafe-regex
        regex:
          /(?:security\s+(?:vulnerability|issue)|sql\s+injection|xss|csrf).*?(?:line\s+(\d+))?/gi,
        severity: 'critical',
        category: 'security',
      },
      {
        // eslint-disable-next-line security/detect-unsafe-regex
        regex:
          /(?:null\s+pointer|undefined\s+access|type\s+error).*?(?:line\s+(\d+))?/gi,
        severity: 'high',
        category: 'type-safety',
      },
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(response)) !== null) {
        suggestions.push({
          title: 'Issue detected',
          description: match[0],
          severity: pattern.severity,
          category: pattern.category,
          line: match[1] ? parseInt(match[1]) : null,
          confidence: 'possible',
        });
      }
    }

    return suggestions;
  }

  /**
   * Enrich suggestions with additional context
   */
  enrichSuggestions(suggestions, file) {
    return suggestions.map(suggestion => ({
      ...suggestion,
      file_path: file.filename,
      commit: file.sha || null,
      position: this.calculatePosition(file.patch, suggestion.line),
      timestamp: new Date().toISOString(),
    }));
  }

  /**
   * Calculate diff position for GitHub API
   */
  calculatePosition(patch, lineNumber) {
    if (!patch || !lineNumber) {
      return null;
    }

    const lines = patch.split('\n');
    let currentLine = 0;
    let position = 0;

    for (let i = 0; i < lines.length; i++) {
      // eslint-disable-next-line security/detect-object-injection
      const line = lines[i];

      if (line.startsWith('@@')) {
        const match = line.match(/@@ -\d+,?\d* \+(\d+),?\d* @@/);
        if (match) {
          currentLine = parseInt(match[1]) - 1;
        }
      } else if (line.startsWith('+') || line.startsWith(' ')) {
        currentLine++;
        if (currentLine === lineNumber) {
          return position;
        }
      }

      if (!line.startsWith('\\')) {
        position++;
      }
    }

    return null;
  }


  /**
   * Generate focused prompt for specific issue types
   */
  generateFocusedPrompt(code, issueType) {
    const prompts = {
      security: `Analyze this code for security vulnerabilities only. Focus on:
- SQL injection, XSS, CSRF
- Authentication/authorization issues
- Cryptographic weaknesses
- Input validation problems`,

      'type-safety': `Analyze this code for type safety issues only. Focus on:
- Null pointer exceptions
- Undefined variable access
- Type mismatches
- Missing type guards`,

      performance: `Analyze this code for performance issues only. Focus on:
- Inefficient algorithms (O(n²) or worse)
- Memory leaks
- Unnecessary re-renders or computations
- Database query optimization`,
    };

    // eslint-disable-next-line security/detect-object-injection
    return prompts[issueType] || prompts.security;
  }
}

module.exports = AIAnalysisService;
