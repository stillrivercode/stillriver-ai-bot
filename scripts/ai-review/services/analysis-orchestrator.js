#!/usr/bin/env node

/**
 * Analysis Orchestrator
 *
 * Coordinates AI analysis, confidence scoring, and suggestion formatting
 * for the complete AI resolvable comments workflow
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const GitHubAPIService = require('./github-api-service');
const AIAnalysisService = require('./ai-analysis-service');
const { ConfidenceScorer } = require('../core/confidence-scoring');

class AnalysisOrchestrator {
  constructor(options = {}) {
    this.github = new GitHubAPIService(options);
    this.aiAnalysis = new AIAnalysisService(options);
    this.confidenceScorer = new ConfidenceScorer();
    this.options = options;
  }

  /**
   * Analyze a pull request and generate confidence-scored suggestions
   * @param {string|number} prNumber - Pull request number
   * @param {Object} config - Analysis configuration
   * @returns {Array} Scored suggestions ready for formatting
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  async analyzePullRequest(prNumber, _config = {}) {
    try {
      console.log(`🔍 Fetching PR #${prNumber} data...`);

      // Fetch PR data and context
      const prData = await this.github.fetchPullRequest(prNumber);
      const repoContext = await this.github.getRepositoryContext();
      const codingStandards = await this.github.getCodingStandards();

      // Filter files for analysis
      const analysisFiles = this.github.filterFilesForAnalysis(prData.files);

      if (analysisFiles.length === 0) {
        console.log('ℹ️  No files suitable for AI analysis found');
        return [];
      }

      console.log(`📁 Analyzing ${analysisFiles.length} files...`);

      // Build analysis context
      const analysisContext = {
        codingStandards,
        projectContext: this.buildProjectContext(repoContext),
        prMetadata: {
          title: prData.title,
          body: prData.body,
          author: prData.user.login,
          baseBranch: prData.base.ref,
          headBranch: prData.head.ref,
        },
      };

      // Generate AI suggestions
      console.log('🤖 Generating AI suggestions...');
      const rawSuggestions = await this.aiAnalysis.analyzePullRequest(
        prData,
        analysisFiles,
        analysisContext
      );

      if (rawSuggestions.length === 0) {
        console.log('✅ No issues found by AI analysis');

        // Post summary comment when no suggestions found
        await this.postNoSuggestionsComment(
          prNumber,
          prData,
          analysisFiles.length
        );

        return [];
      }

      console.log(`📊 Scoring ${rawSuggestions.length} suggestions...`);

      // Apply confidence scoring
      const scoredSuggestions = await this.applySuggestionScoring(
        rawSuggestions,
        analysisContext,
        prData
      );

      // Sort by confidence score (highest first)
      scoredSuggestions.sort((a, b) => b.confidence - a.confidence);

      console.log(
        `✅ Generated ${scoredSuggestions.length} confidence-scored suggestions`
      );

      // Post suggestions as GitHub comments/reviews
      await this.postSuggestionsToGitHub(prNumber, scoredSuggestions, prData);

      return scoredSuggestions;
    } catch (error) {
      console.error('❌ Analysis orchestration failed:', error);
      throw error;
    }
  }

  /**
   * Apply confidence scoring to raw AI suggestions
   */
  async applySuggestionScoring(suggestions, context, prData) {
    const scoredSuggestions = [];

    for (const suggestion of suggestions) {
      try {
        // Build confidence scoring context
        const scoringContext = {
          prMetadata: context.prMetadata,
          fileContext: {
            filename: suggestion.file || suggestion.file_path,
            language: this.detectLanguage(
              suggestion.file || suggestion.file_path
            ),
            changeType: this.determineChangeType(suggestion),
          },
          staticAnalysisResults: {
            hasLinter: context.codingStandards.includes('eslint'),
            hasTypeChecker: context.codingStandards.includes('typescript'),
            hasSecurityScanner: true, // We use Bandit/Semgrep
          },
          repositoryContext: context.projectContext,
        };

        // Calculate confidence score
        const confidenceResult = this.confidenceScorer.calculateScore(
          suggestion,
          scoringContext
        );

        // Extract numeric score from result object
        const confidenceScore =
          typeof confidenceResult === 'object'
            ? confidenceResult.score
            : confidenceResult;

        // Add confidence score and additional metadata
        const scoredSuggestion = {
          ...suggestion,
          confidence: confidenceScore,
          confidence_level: this.getConfidenceLevel(confidenceScore),
          file_path: suggestion.file || suggestion.file_path,
          analysis_timestamp: new Date().toISOString(),
          context: {
            pr_number: prData.number,
            base_sha: prData.base.sha,
            head_sha: prData.head.sha,
          },
        };

        // Ensure required fields are present
        if (this.validateSuggestion(scoredSuggestion)) {
          scoredSuggestions.push(scoredSuggestion);
        } else {
          console.warn(
            `Skipping invalid suggestion: ${JSON.stringify(scoredSuggestion, null, 2)}`
          );
        }
      } catch (error) {
        console.error('Error scoring suggestion:', error);
        // Include unscored suggestion with low confidence
        scoredSuggestions.push({
          ...suggestion,
          confidence: 0.3,
          confidence_level: 'low',
          error: error.message,
        });
      }
    }

    return scoredSuggestions;
  }

  /**
   * Build project context for AI analysis
   */
  buildProjectContext(repoContext) {
    const context = [];

    if (repoContext.description) {
      context.push(`Project: ${repoContext.description}`);
    }

    if (repoContext.language) {
      context.push(`Primary Language: ${repoContext.language}`);
    }

    if (repoContext.topics && repoContext.topics.length > 0) {
      context.push(`Technologies: ${repoContext.topics.join(', ')}`);
    }

    if (repoContext.readme) {
      // Extract key sections from README
      const readmeContext = this.extractReadmeContext(repoContext.readme);
      if (readmeContext) {
        context.push(`Context: ${readmeContext}`);
      }
    }

    return context.join('\n');
  }

  /**
   * Extract relevant context from README
   */
  extractReadmeContext(readme) {
    const lines = readme.split('\n');

    // Look for architecture, usage, or technology sections
    const relevantSections = [];
    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('#')) {
        const header = line.toLowerCase();
        if (
          header.includes('architecture') ||
          header.includes('technology') ||
          header.includes('usage') ||
          header.includes('getting started')
        ) {
          currentSection = line.replace(/^#+\s*/, '').trim();
        } else {
          currentSection = '';
        }
      } else if (currentSection && line.trim()) {
        relevantSections.push(line.trim());
        if (relevantSections.length >= 3) {
          break;
        } // Limit context
      }
    }

    return relevantSections.join(' ').substring(0, 500);
  }

  /**
   * Detect programming language from filename
   */
  detectLanguage(filename) {
    if (!filename) {
      return 'unknown';
    }

    const ext = filename.split('.').pop().toLowerCase();
    const languageMap = {
      js: 'javascript',
      ts: 'typescript',
      jsx: 'javascript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      go: 'go',
      rb: 'ruby',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      rs: 'rust',
      sql: 'sql',
    };

    // eslint-disable-next-line security/detect-object-injection
    return languageMap[ext] || 'unknown';
  }

  /**
   * Determine type of change from suggestion
   */
  determineChangeType(suggestion) {
    if (suggestion.suggestedCode && suggestion.originalCode) {
      return 'modification';
    } else if (suggestion.suggestedCode) {
      return 'addition';
    } else {
      return 'review';
    }
  }

  /**
   * Get confidence level label from numerical score
   */
  getConfidenceLevel(score) {
    if (score >= 0.95) {
      return 'very_high';
    }
    if (score >= 0.8) {
      return 'high';
    }
    if (score >= 0.65) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Validate suggestion has required fields
   */
  validateSuggestion(suggestion) {
    const required = ['description', 'confidence', 'category'];

    for (const field of required) {
      // eslint-disable-next-line security/detect-object-injection
      if (!suggestion[field]) {
        console.warn(`Missing required field: ${field}`);
        return false;
      }
    }

    if (
      typeof suggestion.confidence !== 'number' ||
      suggestion.confidence < 0 ||
      suggestion.confidence > 1
    ) {
      console.warn(`Invalid confidence score: ${suggestion.confidence}`);
      return false;
    }

    return true;
  }

  /**
   * Generate summary statistics
   */
  generateStatistics(suggestions) {
    const stats = {
      total: suggestions.length,
      by_confidence: {
        very_high: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      by_category: {},
      by_severity: {},
    };

    for (const suggestion of suggestions) {
      // Count by confidence level
      const level = this.getConfidenceLevel(suggestion.confidence);
      // eslint-disable-next-line security/detect-object-injection
      stats.by_confidence[level]++;

      // Count by category
      const category = suggestion.category || 'unknown';
      // eslint-disable-next-line security/detect-object-injection
      stats.by_category[category] = (stats.by_category[category] || 0) + 1;

      // Count by severity
      const severity = suggestion.severity || 'unknown';
      // eslint-disable-next-line security/detect-object-injection
      stats.by_severity[severity] = (stats.by_severity[severity] || 0) + 1;
    }

    return stats;
  }

  /**
   * Post a summary comment when no suggestions are found
   */
  async postNoSuggestionsComment(prNumber, prData, filesAnalyzed) {
    try {
      const inlineEnabled = process.env.AI_ENABLE_INLINE_COMMENTS !== 'false';
      const reviewType = inlineEnabled
        ? 'Resolvable Comments'
        : 'Enhanced Comments';

      const summaryComment = `## 🤖 AI Review by ${reviewType}

✅ **Great work!** No significant issues were found during the AI analysis.

### Analysis Summary
- **Files Analyzed**: ${filesAnalyzed}
- **Issues Found**: 0
- **Confidence**: High

### What was reviewed:
- Code quality and maintainability
- Security vulnerabilities
- Performance considerations
- Best practices adherence
- Type safety (where applicable)

## ✅ Recommendation: **APPROVE**

The code changes in this pull request meet quality standards and are ready for approval. No blocking issues were identified.

---
*AI Review completed at ${new Date().toISOString()}*
*Model: ${this.options.model || 'default'} | Analysis ID: ${prData.head.sha.substring(0, 8)}*`;

      await this.github.postComment(prNumber, summaryComment);
      console.log('✅ Posted no-suggestions summary comment to PR');
    } catch (error) {
      console.error('❌ Failed to post summary comment:', error.message);
      // Don't throw - this shouldn't break the workflow
    }
  }

  /**
   * Post suggestions to GitHub as comments or reviews
   */
  async postSuggestionsToGitHub(prNumber, suggestions, prData) {
    try {
      const inlineEnabled = process.env.AI_ENABLE_INLINE_COMMENTS !== 'false';
      const stats = this.generateStatistics(suggestions);

      // Generate summary comment with statistics
      const summaryComment = this.generateSummaryComment(
        suggestions,
        stats,
        inlineEnabled,
        prData
      );

      // Always post summary comment first for visibility
      await this.github.postComment(prNumber, summaryComment);
      console.log('✅ Posted AI review summary comment');

      if (inlineEnabled && this.hasResolvableSuggestions(suggestions)) {
        // Post inline comments for resolvable suggestions
        const inlineComments = this.generateInlineComments(suggestions);

        // Post each inline comment individually since we already posted the summary
        for (const comment of inlineComments) {
          try {
            await this.github.postInlineComment(prNumber, comment);
          } catch (error) {
            console.warn(`Failed to post inline comment: ${error.message}`);
          }
        }
        console.log(
          `✅ Posted ${inlineComments.length} inline resolvable suggestions`
        );
      } else {
        // Post detailed suggestions in a separate comment
        const detailsComment = this.formatSuggestionsAsComment(suggestions);
        await this.github.postComment(prNumber, detailsComment);
        console.log('✅ Posted detailed suggestions comment');
      }
    } catch (error) {
      console.error('❌ Failed to post suggestions to GitHub:', error.message);
      // Don't throw - this shouldn't break the workflow
    }
  }

  /**
   * Generate summary comment header
   */
  generateSummaryComment(suggestions, stats, inlineEnabled, prData) {
    const reviewType = inlineEnabled
      ? 'Resolvable Comments'
      : 'Enhanced Comments';
    const hasResolvable = stats.by_confidence.very_high > 0;
    const hasHigh = stats.by_confidence.high > 0;
    const recommendation = this.generateApprovalRecommendation(stats);

    let summary = `## 🤖 AI Review by ${reviewType}\n\n`;

    if (hasResolvable && inlineEnabled) {
      summary += `🔒 **${stats.by_confidence.very_high} critical suggestion${stats.by_confidence.very_high !== 1 ? 's' : ''} require${stats.by_confidence.very_high === 1 ? 's' : ''} immediate attention** (resolvable)\n\n`;
    }

    summary += `### Analysis Summary
- **Total Suggestions**: ${stats.total}
- **Critical** (≥95%): ${stats.by_confidence.very_high} ${inlineEnabled ? '(resolvable)' : '(high priority)'}
- **High** (80-94%): ${stats.by_confidence.high} (enhanced comments)
- **Medium** (65-79%): ${stats.by_confidence.medium} (informational)
- **Low** (<65%): ${stats.by_confidence.low} (suppressed)

### Categories
${Object.entries(stats.by_category)
  .map(([category, count]) => `- **${category}**: ${count}`)
  .join('\n')}`;

    // Add approval recommendation
    summary += `\n\n${recommendation.icon} **Recommendation: ${recommendation.action}**\n\n${recommendation.reasoning}`;

    if (hasResolvable && inlineEnabled) {
      summary += `\n\n### 📝 Action Required
Please review and resolve the critical suggestions marked with 🔒 below. These can be applied with one click using GitHub's suggestion feature.`;
    }

    summary += `\n\n---
*AI Review completed at ${new Date().toISOString()}*
*Model: ${this.options.model || 'default'} | Analysis ID: ${prData.head.sha.substring(0, 8)}*`;

    return summary;
  }

  /**
   * Generate approval recommendation based on suggestion statistics
   */
  generateApprovalRecommendation(stats) {
    const hasCritical = stats.by_confidence.very_high > 0;
    const hasHigh = stats.by_confidence.high > 0;
    const totalBlockingIssues = stats.by_confidence.very_high + stats.by_confidence.high;

    if (hasCritical) {
      return {
        action: 'CHANGES REQUESTED',
        icon: '🚫',
        reasoning: `Critical issues (${stats.by_confidence.very_high}) must be addressed before approval. These represent potential bugs, security vulnerabilities, or significant maintainability concerns.`
      };
    }

    if (hasHigh && stats.by_confidence.high >= 3) {
      return {
        action: 'CHANGES REQUESTED',
        icon: '⚠️',
        reasoning: `Multiple high-confidence issues (${stats.by_confidence.high}) should be addressed before approval to maintain code quality standards.`
      };
    }

    if (hasHigh) {
      return {
        action: 'APPROVE WITH SUGGESTIONS',
        icon: '✅',
        reasoning: `${stats.by_confidence.high} high-confidence suggestion${stats.by_confidence.high !== 1 ? 's' : ''} identified. Consider addressing these improvements, but they don't block approval.`
      };
    }

    if (stats.by_confidence.medium > 0) {
      return {
        action: 'APPROVE',
        icon: '✅',
        reasoning: `Only minor suggestions found (${stats.by_confidence.medium} medium confidence). The code meets quality standards for approval.`
      };
    }

    return {
      action: 'APPROVE',
      icon: '✅',
      reasoning: 'All suggestions are low confidence. The code is ready for approval.'
    };
  }

  /**
   * Check if there are any resolvable suggestions
   */
  hasResolvableSuggestions(suggestions) {
    return suggestions.some(s => s.confidence >= 0.95);
  }

  /**
   * Generate inline comments for GitHub review
   */
  generateInlineComments(suggestions) {
    const inlineComments = [];
    const resolvableLimit = 5; // Limit to prevent spam
    let resolvableCount = 0;

    for (const suggestion of suggestions) {
      if (suggestion.confidence >= 0.95 && resolvableCount < resolvableLimit) {
        // Generate resolvable suggestion only if we have required fields
        if (
          suggestion.line_number &&
          suggestion.suggestedCode &&
          suggestion.originalCode &&
          suggestion.file_path
        ) {
          inlineComments.push({
            path: suggestion.file_path,
            line: suggestion.line_number,
            body: `🔒 **Critical**: ${suggestion.description}

\`\`\`suggestion
${suggestion.suggestedCode}
\`\`\`

**Confidence**: ${Math.round(suggestion.confidence * 100)}% | **Category**: ${suggestion.category}`,
          });
          resolvableCount++;
        }
      }
    }

    return inlineComments;
  }

  /**
   * Format all suggestions as a comment (fallback when inline not available)
   */
  formatSuggestionsAsComment(suggestions) {
    let comment = '## 📋 Detailed Suggestions\n\n';

    for (const suggestion of suggestions) {
      const icon =
        suggestion.confidence >= 0.95
          ? '🔒'
          : suggestion.confidence >= 0.8
            ? '⚡'
            : suggestion.confidence >= 0.65
              ? '💡'
              : 'ℹ️';

      const confidenceLevel =
        suggestion.confidence >= 0.95
          ? 'Critical'
          : suggestion.confidence >= 0.8
            ? 'High'
            : suggestion.confidence >= 0.65
              ? 'Medium'
              : 'Low';

      comment += `### ${icon} ${confidenceLevel}: ${suggestion.description}\n\n`;

      if (suggestion.file_path) {
        comment += `**File**: \`${suggestion.file_path}\``;
        if (suggestion.line_number) {
          comment += `:${suggestion.line_number}`;
        }
        comment += '\n\n';
      }

      if (suggestion.originalCode && suggestion.suggestedCode) {
        comment += '**Current Code:**\n```\n';
        comment += suggestion.originalCode;
        comment += '\n```\n\n**Suggested Code:**\n```\n';
        comment += suggestion.suggestedCode;
        comment += '\n```\n\n';
      }

      comment += `**Confidence**: ${Math.round(suggestion.confidence * 100)}% | **Category**: ${suggestion.category}\n\n`;
      comment += '---\n\n';
    }

    return comment;
  }
}

module.exports = AnalysisOrchestrator;
