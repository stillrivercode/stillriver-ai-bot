#!/usr/bin/env node

/**
 * Analysis Orchestrator
 *
 * Coordinates AI analysis, confidence scoring, and suggestion formatting
 * for the complete AI resolvable comments workflow
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const GitHubAPIService = require('./github-api-service');
const AIAnalysisService = require('./ai-analysis-service');
const ConfidenceScorer = require('../core/confidence-scoring');

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
  async analyzePullRequest(prNumber, config = {}) {
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

      console.log(`✅ Generated ${scoredSuggestions.length} confidence-scored suggestions`);

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
            language: this.detectLanguage(suggestion.file || suggestion.file_path),
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
        const confidenceScore = this.confidenceScorer.calculateScore(
          suggestion,
          scoringContext
        );

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
          console.warn(`Skipping invalid suggestion: ${JSON.stringify(scoredSuggestion, null, 2)}`);
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
    const context = [];

    // Look for architecture, usage, or technology sections
    const relevantSections = [];
    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('#')) {
        const header = line.toLowerCase();
        if (header.includes('architecture') ||
            header.includes('technology') ||
            header.includes('usage') ||
            header.includes('getting started')) {
          currentSection = line.replace(/^#+\s*/, '').trim();
        } else {
          currentSection = '';
        }
      } else if (currentSection && line.trim()) {
        relevantSections.push(line.trim());
        if (relevantSections.length >= 3) break; // Limit context
      }
    }

    return relevantSections.join(' ').substring(0, 500);
  }

  /**
   * Detect programming language from filename
   */
  detectLanguage(filename) {
    if (!filename) return 'unknown';

    const ext = filename.split('.').pop().toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rb': 'ruby',
      'php': 'php',
      'swift': 'swift',
      'kt': 'kotlin',
      'rs': 'rust',
      'sql': 'sql',
    };

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
    if (score >= 0.95) return 'very_high';
    if (score >= 0.8) return 'high';
    if (score >= 0.65) return 'medium';
    return 'low';
  }

  /**
   * Validate suggestion has required fields
   */
  validateSuggestion(suggestion) {
    const required = ['description', 'confidence', 'category'];

    for (const field of required) {
      if (!suggestion[field]) {
        console.warn(`Missing required field: ${field}`);
        return false;
      }
    }

    if (typeof suggestion.confidence !== 'number' ||
        suggestion.confidence < 0 ||
        suggestion.confidence > 1) {
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
      stats.by_confidence[level]++;

      // Count by category
      const category = suggestion.category || 'unknown';
      stats.by_category[category] = (stats.by_category[category] || 0) + 1;

      // Count by severity
      const severity = suggestion.severity || 'unknown';
      stats.by_severity[severity] = (stats.by_severity[severity] || 0) + 1;
    }

    return stats;
  }
}

module.exports = AnalysisOrchestrator;
