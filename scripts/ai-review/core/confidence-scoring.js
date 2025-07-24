#!/usr/bin/env node

/**
 * Confidence Scoring Engine for AI Resolvable Comments
 *
 * Implements the multi-factor scoring algorithm defined in the specification:
 * - Issue Severity: 40%
 * - Static Analysis Confidence: 30%
 * - Code Context Clarity: 20%
 * - Historical Patterns: 10%
 */

const CONFIDENCE_THRESHOLDS = {
  RESOLVABLE: 0.95,    // Resolvable suggestion (critical issues only)
  ENHANCED: 0.80,      // Enhanced comment with suggestion context
  REGULAR: 0.65,       // Regular informational comment
  SUPPRESS: 0.65       // Suppress or aggregate into summary
};

const FACTOR_WEIGHTS = {
  ISSUE_SEVERITY: 0.40,
  STATIC_ANALYSIS: 0.30,
  CODE_CONTEXT: 0.20,
  HISTORICAL_PATTERNS: 0.10
};

class ConfidenceScorer {
  constructor(historicalData = null) {
    this.historicalData = historicalData || {
      acceptanceRates: {},
      patternMatches: {}
    };
  }

  /**
   * Calculate confidence score for a suggestion
   * @param {Object} suggestion - The AI suggestion object
   * @param {Object} context - Additional context for scoring
   * @returns {Object} Score result with confidence level and classification
   */
  calculateScore(suggestion, context = {}) {
    const factors = {
      issueSeverity: this.scoreIssueSeverity(suggestion),
      staticAnalysis: this.scoreStaticAnalysis(suggestion, context),
      codeContext: this.scoreCodeContext(suggestion, context),
      historicalPatterns: this.scoreHistoricalPatterns(suggestion)
    };

    // Calculate weighted score
    const weightedScore =
      factors.issueSeverity * FACTOR_WEIGHTS.ISSUE_SEVERITY +
      factors.staticAnalysis * FACTOR_WEIGHTS.STATIC_ANALYSIS +
      factors.codeContext * FACTOR_WEIGHTS.CODE_CONTEXT +
      factors.historicalPatterns * FACTOR_WEIGHTS.HISTORICAL_PATTERNS;

    const classification = this.classifyConfidence(weightedScore);

    return {
      score: weightedScore,
      classification,
      factors,
      threshold: CONFIDENCE_THRESHOLDS[classification],
      suggestion: {
        ...suggestion,
        confidence: weightedScore,
        type: classification
      }
    };
  }

  /**
   * Score issue severity (40% weight)
   * High scores for: security vulnerabilities, logic errors, null pointer risks
   */
  scoreIssueSeverity(suggestion) {
    const severityKeywords = {
      critical: [
        'security', 'vulnerability', 'injection', 'xss', 'csrf',
        'authentication', 'authorization', 'credential', 'password',
        'null pointer', 'null reference', 'undefined access',
        'memory leak', 'buffer overflow', 'race condition'
      ],
      high: [
        'logic error', 'data corruption', 'infinite loop',
        'deadlock', 'resource leak', 'exception', 'crash',
        'type mismatch', 'compilation error', 'syntax error'
      ],
      medium: [
        'performance', 'optimization', 'efficiency',
        'best practice', 'code smell', 'maintainability',
        'deprecated', 'warning', 'convention'
      ],
      low: [
        'style', 'formatting', 'naming', 'comment',
        'documentation', 'readability', 'refactor'
      ]
    };

    const description = (suggestion.description || '').toLowerCase();
    const title = (suggestion.title || '').toLowerCase();
    const combined = `${title} ${description}`;

    // Check for critical severity indicators
    if (severityKeywords.critical.some(keyword => combined.includes(keyword))) {
      return 1.0;
    }
    if (severityKeywords.high.some(keyword => combined.includes(keyword))) {
      return 0.85;
    }
    if (severityKeywords.medium.some(keyword => combined.includes(keyword))) {
      return 0.65;
    }
    if (severityKeywords.low.some(keyword => combined.includes(keyword))) {
      return 0.35;
    }

    return 0.5; // Default medium severity
  }

  /**
   * Score static analysis confidence (30% weight)
   * High scores for: definitive rule violations, type mismatches
   */
  scoreStaticAnalysis(suggestion, context) {
    const analysisIndicators = {
      definitive: [
        'definitely', 'certainly', 'must', 'always', 'never',
        'violation', 'error', 'incorrect', 'wrong', 'invalid',
        'type mismatch', 'undefined', 'null', 'missing'
      ],
      probable: [
        'likely', 'probably', 'should', 'recommended',
        'suggest', 'consider', 'potential', 'possible'
      ],
      uncertain: [
        'might', 'could', 'perhaps', 'maybe',
        'opinion', 'preference', 'alternative'
      ]
    };

    const text = (suggestion.description || '').toLowerCase();

    // Check if suggestion includes specific line numbers or code references
    const hasSpecificReference = /line \d+|:\d+|`[^`]+`/.test(suggestion.description);

    // Check for static analysis tool references
    const hasToolReference = /eslint|tslint|pylint|rubocop|sonar|semgrep|bandit/i.test(text);

    let baseScore = 0.5;

    if (analysisIndicators.definitive.some(ind => text.includes(ind))) {
      baseScore = 0.9;
    } else if (analysisIndicators.probable.some(ind => text.includes(ind))) {
      baseScore = 0.7;
    } else if (analysisIndicators.uncertain.some(ind => text.includes(ind))) {
      baseScore = 0.4;
    }

    // Boost score for specific references and tool mentions
    if (hasSpecificReference) baseScore += 0.05;
    if (hasToolReference) baseScore += 0.05;

    // Static analysis results from context
    if (context.staticAnalysisResults) {
      const { confidence, toolName } = context.staticAnalysisResults;
      if (confidence) baseScore = Math.max(baseScore, confidence);
    }

    return Math.min(1.0, baseScore);
  }

  /**
   * Score code context clarity (20% weight)
   * High scores for: clear function scope, obvious intent
   */
  scoreCodeContext(suggestion, context) {
    let score = 0.5;

    // Check if we have clear context information
    if (context.codeBlock) {
      const { functionName, scope, linesOfCode, complexity } = context.codeBlock;

      // Clear function scope
      if (functionName && scope) {
        score += 0.2;
      }

      // Small, focused code blocks are clearer
      if (linesOfCode && linesOfCode < 20) {
        score += 0.15;
      } else if (linesOfCode && linesOfCode < 50) {
        score += 0.1;
      }

      // Lower complexity is clearer
      if (complexity && complexity < 5) {
        score += 0.15;
      } else if (complexity && complexity < 10) {
        score += 0.1;
      }
    }

    // Check if suggestion includes clear before/after code
    if (suggestion.suggestedCode && suggestion.originalCode) {
      score += 0.1;
    }

    // Check for clear, specific file and line references
    if (suggestion.file && suggestion.line) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  /**
   * Score historical patterns (10% weight)
   * High scores for: high acceptance rate for similar suggestions
   */
  scoreHistoricalPatterns(suggestion) {
    if (!this.historicalData.acceptanceRates) {
      return 0.5; // Neutral score if no historical data
    }

    // Get suggestion type/category
    const suggestionType = this.categorizeSuggestion(suggestion);

    // Look up historical acceptance rate
    const acceptanceRate = this.historicalData.acceptanceRates[suggestionType] || 0.5;

    // Check for similar patterns that were accepted
    const patternMatch = this.findSimilarPattern(suggestion);
    if (patternMatch && patternMatch.acceptanceRate > 0.8) {
      return Math.max(acceptanceRate, patternMatch.acceptanceRate);
    }

    return acceptanceRate;
  }

  /**
   * Classify confidence level based on score
   */
  classifyConfidence(score) {
    if (score >= CONFIDENCE_THRESHOLDS.RESOLVABLE) {
      return 'RESOLVABLE';
    } else if (score >= CONFIDENCE_THRESHOLDS.ENHANCED) {
      return 'ENHANCED';
    } else if (score >= CONFIDENCE_THRESHOLDS.REGULAR) {
      return 'REGULAR';
    } else {
      return 'SUPPRESS';
    }
  }

  /**
   * Categorize suggestion for historical pattern matching
   */
  categorizeSuggestion(suggestion) {
    const categories = [
      { pattern: /security|vulnerability|injection/i, category: 'security' },
      { pattern: /null|undefined|type/i, category: 'type-safety' },
      { pattern: /performance|optimization|efficiency/i, category: 'performance' },
      { pattern: /style|format|naming/i, category: 'style' },
      { pattern: /test|coverage|assertion/i, category: 'testing' },
      { pattern: /documentation|comment/i, category: 'documentation' }
    ];

    const text = `${suggestion.title || ''} ${suggestion.description || ''}`;

    for (const { pattern, category } of categories) {
      if (pattern.test(text)) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * Find similar historical pattern
   */
  findSimilarPattern(suggestion) {
    if (!this.historicalData.patternMatches) {
      return null;
    }

    const suggestionKey = this.generatePatternKey(suggestion);
    return this.historicalData.patternMatches[suggestionKey] || null;
  }

  /**
   * Generate pattern key for matching
   */
  generatePatternKey(suggestion) {
    const category = this.categorizeSuggestion(suggestion);
    const keywords = this.extractKeywords(suggestion.description || '');
    return `${category}:${keywords.slice(0, 3).join(':')}`;
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but']);
    return text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .sort((a, b) => b.length - a.length);
  }

  /**
   * Update historical data with new acceptance result
   */
  updateHistoricalData(suggestion, accepted) {
    const category = this.categorizeSuggestion(suggestion);

    if (!this.historicalData.acceptanceRates[category]) {
      this.historicalData.acceptanceRates[category] = 0.5;
    }

    // Update with exponential moving average
    const alpha = 0.1; // Learning rate
    this.historicalData.acceptanceRates[category] =
      alpha * (accepted ? 1 : 0) + (1 - alpha) * this.historicalData.acceptanceRates[category];

    // Update pattern matches
    const patternKey = this.generatePatternKey(suggestion);
    if (!this.historicalData.patternMatches[patternKey]) {
      this.historicalData.patternMatches[patternKey] = {
        count: 0,
        accepted: 0,
        acceptanceRate: 0.5
      };
    }

    const pattern = this.historicalData.patternMatches[patternKey];
    pattern.count++;
    if (accepted) pattern.accepted++;
    pattern.acceptanceRate = pattern.accepted / pattern.count;
  }
}

module.exports = {
  ConfidenceScorer,
  CONFIDENCE_THRESHOLDS,
  FACTOR_WEIGHTS
};
