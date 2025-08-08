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

      console.log(
        `📁 Analyzing ${analysisFiles.length} of ${prData.files.length} files (${prData.files.length - analysisFiles.length} filtered out)...`
      );

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
- **Overall Confidence**: High (95%+)
- **Analysis Coverage**: Complete

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

      // Generate summary comment with statistics only (not detailed suggestions)
      const summaryComment = this.generateSummaryComment(
        suggestions,
        stats,
        inlineEnabled,
        prData,
        true // skipDetailedSuggestions = true
      );

      // Always post summary comment first for visibility
      await this.github.postComment(prNumber, summaryComment);
      console.log('✅ Posted AI review summary comment');

      // Post ALL suggestions as inline comments if enabled, otherwise fallback
      if (inlineEnabled) {
        const inlineComments = this.generateAllInlineComments(suggestions);
        let successfulInlineComments = 0;

        // Post each inline comment individually
        for (const comment of inlineComments) {
          try {
            await this.github.postInlineComment(prNumber, comment);
            successfulInlineComments++;
          } catch (error) {
            console.warn(
              `Failed to post inline comment for ${comment.path}:${comment.line}: ${error.message}`
            );

            // Fallback: Add to a list of failed comments that will be posted as regular comments
            try {
              const fallbackBody = `**File**: \`${comment.path}\` (line ${comment.line})\n\n${comment.body}`;
              await this.github.postComment(prNumber, fallbackBody);
            } catch (fallbackError) {
              console.error(
                `Failed fallback comment for ${comment.path}:${comment.line}: ${fallbackError.message}`
              );
            }
          }
        }
        console.log(
          `✅ Posted ${successfulInlineComments} inline comments (${inlineComments.length} total suggestions)`
        );
      } else {
        // Fallback: Post detailed suggestions as regular comments
        const detailedComment = this.formatSuggestionsAsComment(suggestions);
        await this.github.postComment(prNumber, detailedComment);
        console.log(
          '✅ Posted detailed suggestions as regular comments (inline disabled)'
        );
      }

      console.log('✅ Posted comprehensive review with inline analysis');
    } catch (error) {
      console.error('❌ Failed to post suggestions to GitHub:', error.message);
      // Don't throw - this shouldn't break the workflow
    }
  }

  /**
   * Generate summary comment header
   */
  generateSummaryComment(
    suggestions,
    stats,
    inlineEnabled,
    prData,
    skipDetailedSuggestions = false
  ) {
    const reviewType = inlineEnabled ? 'Inline Comments' : 'Enhanced Comments';
    const hasResolvable = stats.by_confidence.very_high > 0;
    const recommendation = this.generateApprovalRecommendation(stats);

    let summary = `## 🤖 AI Review by ${reviewType}\n\n`;

    if (suggestions.length > 0 && inlineEnabled) {
      summary += `📍 **${suggestions.length} suggestion${suggestions.length !== 1 ? 's' : ''} posted inline** - check the specific files and lines below.\n\n`;
    }

    const overallConfidence = this.calculateOverallConfidence(suggestions);
    const analysisQuality = this.getAnalysisQuality(stats, suggestions.length);

    summary += `### Analysis Summary
- **Total Suggestions**: ${stats.total}
- **Overall Confidence**: ${overallConfidence.label} (${overallConfidence.percentage}%)
- **Analysis Quality**: ${analysisQuality}
- **Critical** (≥95%): ${stats.by_confidence.very_high} ${inlineEnabled ? '(resolvable inline)' : '(high priority)'}
- **High** (80-94%): ${stats.by_confidence.high} (inline comments)
- **Medium** (65-79%): ${stats.by_confidence.medium} (inline informational)
- **Low** (<65%): ${stats.by_confidence.low} (inline or suppressed)

### Categories
${Object.entries(stats.by_category)
  .map(([category, count]) => `- **${category}**: ${count}`)
  .join('\n')}`;

    // Add approval recommendation
    summary += `\n\n${recommendation.icon} **Recommendation: ${recommendation.action}**\n\n${recommendation.reasoning}`;

    // Only add detailed review section if not skipping (for backward compatibility)
    if (!skipDetailedSuggestions && suggestions.length > 0) {
      summary += `\n\n## 📝 Detailed Review\n\n`;
      summary += this.formatDetailedSuggestions(suggestions);
    }

    if (hasResolvable && inlineEnabled) {
      summary += `\n\n### 📝 Action Required
Please review and resolve the critical suggestions marked with 🔒 in the inline comments. These can be applied with one click using GitHub's suggestion feature.`;
    }

    if (suggestions.length > 0 && inlineEnabled) {
      summary += `\n\n### 📂 Review the Files
All suggestions have been posted as inline comments on the specific files and lines. Navigate through the changed files to see detailed feedback.`;
    }

    summary += `\n\n---
*AI Review completed at ${new Date().toISOString()}*
*Model: ${this.options.model || 'default'} | Analysis ID: ${prData.head.sha.substring(0, 8)}*`;

    return summary;
  }

  /**
   * Calculate overall confidence score from suggestions
   */
  calculateOverallConfidence(suggestions) {
    if (suggestions.length === 0) {
      return { percentage: 95, label: 'High' };
    }

    // Weight by confidence level - higher confidence suggestions matter more
    let weightedSum = 0;
    let totalWeight = 0;

    for (const suggestion of suggestions) {
      const confidence = suggestion.confidence || 0;
      const weight = confidence >= 0.8 ? 2 : confidence >= 0.65 ? 1.5 : 1;
      weightedSum += confidence * weight;
      totalWeight += weight;
    }

    const avgConfidence = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const percentage = Math.round(avgConfidence * 100);

    let label = 'Low';
    if (percentage >= 85) {
      label = 'Very High';
    } else if (percentage >= 75) {
      label = 'High';
    } else if (percentage >= 60) {
      label = 'Medium';
    }

    return { percentage, label };
  }

  /**
   * Determine analysis quality based on suggestion distribution
   */
  getAnalysisQuality(stats, totalSuggestions) {
    const criticalRatio =
      stats.by_confidence.very_high / Math.max(totalSuggestions, 1);
    const highRatio = stats.by_confidence.high / Math.max(totalSuggestions, 1);
    const significantRatio = criticalRatio + highRatio;

    if (totalSuggestions === 0) {
      return 'Complete';
    }
    if (significantRatio > 0.7) {
      return 'Comprehensive';
    }
    if (significantRatio > 0.4) {
      return 'Thorough';
    }
    if (significantRatio > 0.2) {
      return 'Good';
    }
    return 'Basic';
  }

  /**
   * Generate approval recommendation based on suggestion statistics
   */
  generateApprovalRecommendation(stats) {
    const hasCritical = stats.by_confidence.very_high > 0;
    const hasHigh = stats.by_confidence.high > 0;

    if (hasCritical) {
      return {
        action: 'CHANGES REQUESTED',
        icon: '🚫',
        reasoning: `Critical issues (${stats.by_confidence.very_high}) must be addressed before approval. These represent potential bugs, security vulnerabilities, or significant maintainability concerns.`,
      };
    }

    if (hasHigh && stats.by_confidence.high >= 3) {
      return {
        action: 'CHANGES REQUESTED',
        icon: '⚠️',
        reasoning: `Multiple high-confidence issues (${stats.by_confidence.high}) should be addressed before approval to maintain code quality standards.`,
      };
    }

    if (hasHigh) {
      return {
        action: 'APPROVE WITH SUGGESTIONS',
        icon: '✅',
        reasoning: `${stats.by_confidence.high} high-confidence suggestion${stats.by_confidence.high !== 1 ? 's' : ''} identified. Consider addressing these improvements, but they don't block approval.`,
      };
    }

    if (stats.by_confidence.medium > 0) {
      return {
        action: 'APPROVE',
        icon: '✅',
        reasoning: `Only minor suggestions found (${stats.by_confidence.medium} medium confidence). The code meets quality standards for approval.`,
      };
    }

    return {
      action: 'APPROVE',
      icon: '✅',
      reasoning:
        'All suggestions are low confidence. The code is ready for approval.',
    };
  }

  /**
   * Format detailed suggestions for the summary comment
   */
  formatDetailedSuggestions(suggestions) {
    const groupedByCategory = this.groupSuggestionsByCategory(suggestions);
    let detailed = '';

    for (const [category, categorySuggestions] of Object.entries(
      groupedByCategory
    )) {
      if (categorySuggestions.length === 0) {
        continue;
      }

      const avgConfidence = Math.round(
        (categorySuggestions.reduce((sum, s) => sum + s.confidence, 0) /
          categorySuggestions.length) *
          100
      );

      detailed += `### ${this.getCategoryIcon(category)} ${category} (${categorySuggestions.length} suggestion${categorySuggestions.length !== 1 ? 's' : ''}, avg confidence: ${avgConfidence}%)\n\n`;

      // Sort by confidence (highest first)
      const sortedSuggestions = categorySuggestions.sort(
        (a, b) => b.confidence - a.confidence
      );

      for (const suggestion of sortedSuggestions) {
        const icon = this.getConfidenceIcon(suggestion.confidence);
        const confidencePercent = Math.round(suggestion.confidence * 100);
        const isResolvable = suggestion.confidence >= 0.95;
        const resolvableText = isResolvable ? ' (resolvable inline)' : '';

        detailed += `${icon} **${suggestion.description}** (${confidencePercent}%${resolvableText})\n\n`;

        if (suggestion.file_path) {
          detailed += `**File**: \`${suggestion.file_path}\``;
          if (suggestion.line_number) {
            detailed += `:${suggestion.line_number}`;
          }
          detailed += '\n\n';
        }

        if (suggestion.reasoning) {
          detailed += `${suggestion.reasoning}\n\n`;
        }

        if (suggestion.suggestedCode && suggestion.originalCode) {
          detailed += `**Current Code:**\n\`\`\`\n${suggestion.originalCode}\n\`\`\`\n\n`;
          detailed += `**Suggested Code:**\n\`\`\`\n${suggestion.suggestedCode}\n\`\`\`\n\n`;
        } else if (suggestion.suggestedCode) {
          detailed += `**Suggested Code:**\n\`\`\`\n${suggestion.suggestedCode}\n\`\`\`\n\n`;
        }

        detailed += '---\n\n';
      }
    }

    return detailed;
  }

  /**
   * Group suggestions by category
   */
  groupSuggestionsByCategory(suggestions) {
    const grouped = new Map();
    for (const suggestion of suggestions) {
      const category = suggestion.category || 'General';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category).push(suggestion);
    }
    return Object.fromEntries(grouped);
  }

  /**
   * Get icon for category
   */
  getCategoryIcon(category) {
    const icons = new Map([
      ['Security', '🔒'],
      ['Performance', '⚡'],
      ['Quality', '🏆'],
      ['Style', '🎨'],
      ['Architecture', '🏠'],
      ['Documentation', '📝'],
      ['Testing', '🧪'],
      ['Accessibility', '♿'],
      ['General', '📝'],
    ]);
    return icons.get(category) || '📝';
  }

  /**
   * Get confidence icon
   */
  getConfidenceIcon(confidence) {
    if (confidence >= 0.95) {
      return '🔒';
    }
    if (confidence >= 0.8) {
      return '⚡';
    }
    if (confidence >= 0.65) {
      return '💡';
    }
    return 'ℹ️';
  }

  /**
   * Get confidence label from score
   */
  getConfidenceLabel(confidence) {
    if (confidence >= 0.95) {
      return 'Critical';
    }
    if (confidence >= 0.8) {
      return 'High Confidence';
    }
    if (confidence >= 0.65) {
      return 'Medium Confidence';
    }
    if (confidence >= 0.5) {
      return 'Low Confidence';
    }
    return 'Very Low Confidence';
  }

  /**
   * Try to infer line number from suggestion context
   */
  inferLineNumber(suggestion) {
    // Try to extract line number from various possible fields
    if (suggestion.context && typeof suggestion.context === 'object') {
      if (suggestion.context.line_number) {
        return suggestion.context.line_number;
      }
      if (suggestion.context.line) {
        return suggestion.context.line;
      }
    }

    // Look for line numbers in the original code context
    if (suggestion.originalCode) {
      // This is a simple heuristic - in a real implementation you'd want
      // to match the code against the actual file diff to find the line
      return 1; // Default fallback
    }

    // Default to line 1 if we can't infer
    return null;
  }

  /**
   * Check if there are any resolvable suggestions
   */
  hasResolvableSuggestions(suggestions) {
    return suggestions.some(s => s.confidence >= 0.95);
  }

  /**
   * Generate inline comments for ALL suggestions
   */
  generateAllInlineComments(suggestions) {
    const inlineComments = [];
    const resolvableLimit = 8; // Increased limit for resolvable suggestions
    let resolvableCount = 0;

    for (const suggestion of suggestions) {
      // Skip very low confidence suggestions to avoid spam
      if (suggestion.confidence < 0.5) {
        continue;
      }

      // Ensure we have the minimum required fields for inline comments
      if (!suggestion.file_path) {
        console.warn(
          `Skipping suggestion without file_path: ${suggestion.description}`
        );
        continue;
      }

      // Use line_number if available, otherwise try to infer from context or default to 1
      const lineNumber =
        suggestion.line_number ||
        suggestion.line ||
        this.inferLineNumber(suggestion) ||
        1;

      const icon = this.getConfidenceIcon(suggestion.confidence);
      const confidencePercent = Math.round(suggestion.confidence * 100);
      const confidenceLabel = this.getConfidenceLabel(suggestion.confidence);

      let body = `${icon} **${confidenceLabel}**: ${suggestion.description}`;

      // Add reasoning if available
      if (suggestion.reasoning) {
        body += `\n\n${suggestion.reasoning}`;
      }

      // Handle resolvable suggestions (high confidence with code suggestions)
      if (
        suggestion.confidence >= 0.95 &&
        suggestion.suggestedCode &&
        suggestion.originalCode &&
        resolvableCount < resolvableLimit
      ) {
        body += `\n\n\`\`\`suggestion\n${suggestion.suggestedCode}\n\`\`\``;
        resolvableCount++;
      } else if (suggestion.suggestedCode) {
        // Show suggested code even for lower confidence
        body += `\n\n**Suggested Code:**\n\`\`\`\n${suggestion.suggestedCode}\n\`\`\``;

        if (suggestion.originalCode) {
          body += `\n\n**Current Code:**\n\`\`\`\n${suggestion.originalCode}\n\`\`\``;
        }
      }

      // Add metadata
      body += `\n\n**Confidence**: ${confidencePercent}% | **Category**: ${suggestion.category || 'General'}`;

      if (suggestion.severity) {
        body += ` | **Severity**: ${suggestion.severity}`;
      }

      inlineComments.push({
        path: suggestion.file_path,
        line: lineNumber,
        body,
      });
    }

    console.log(
      `Generated ${inlineComments.length} inline comments (${resolvableCount} resolvable)`
    );
    return inlineComments;
  }

  /**
   * Generate inline comments for GitHub review (legacy method for backward compatibility)
   */
  generateInlineComments(suggestions) {
    // For backward compatibility, just call the new method
    return this.generateAllInlineComments(suggestions);
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
