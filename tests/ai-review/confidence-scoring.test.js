/* eslint-disable @typescript-eslint/no-require-imports */
const {
  ConfidenceScorer,
} = require('../../scripts/ai-review/core/confidence-scoring');

describe('ConfidenceScorer', () => {
  let scorer;

  beforeEach(() => {
    scorer = new ConfidenceScorer();
  });

  describe('calculateScore', () => {
    const baseSuggestion = {
      description: 'Test suggestion',
      category: 'best_practices',
      severity: 'medium',
      file_path: 'src/test.js',
    };

    const baseContext = {
      prMetadata: {
        title: 'Test PR',
        author: 'testuser',
        baseBranch: 'main',
        headBranch: 'feature',
      },
      fileContext: {
        filename: 'src/test.js',
        language: 'javascript',
        changeType: 'modification',
      },
      staticAnalysisResults: {
        hasLinter: true,
        hasTypeChecker: true,
        hasSecurityScanner: true,
      },
      repositoryContext: 'Test repository context',
    };

    it('should calculate confidence score for security suggestions', () => {
      const suggestion = {
        ...baseSuggestion,
        category: 'security',
        severity: 'critical',
      };

      const result = scorer.calculateScore(suggestion, baseContext);

      expect(result.score).toBeGreaterThan(0.8);
      expect(result.score).toBeLessThanOrEqual(1.0);
      expect(result.classification).toBe('RESOLVABLE');
    });

    it('should give higher scores to critical severity issues', () => {
      const criticalSuggestion = {
        ...baseSuggestion,
        severity: 'critical',
      };
      const lowSuggestion = {
        ...baseSuggestion,
        severity: 'low',
      };

      const criticalResult = scorer.calculateScore(
        criticalSuggestion,
        baseContext
      );
      const lowResult = scorer.calculateScore(lowSuggestion, baseContext);

      expect(criticalResult.score).toBeGreaterThan(lowResult.score);
    });

    it('should give higher scores when static analysis tools are present', () => {
      const contextWithTools = {
        ...baseContext,
        staticAnalysisResults: {
          hasLinter: true,
          hasTypeChecker: true,
          hasSecurityScanner: true,
        },
      };
      const contextWithoutTools = {
        ...baseContext,
        staticAnalysisResults: {
          hasLinter: false,
          hasTypeChecker: false,
          hasSecurityScanner: false,
        },
      };

      const resultWithTools = scorer.calculateScore(
        baseSuggestion,
        contextWithTools
      );
      const resultWithoutTools = scorer.calculateScore(
        baseSuggestion,
        contextWithoutTools
      );

      expect(resultWithTools.score).toBeGreaterThan(resultWithoutTools.score);
    });

    it('should consider file context in scoring', () => {
      const jsContext = {
        ...baseContext,
        fileContext: {
          ...baseContext.fileContext,
          language: 'javascript',
        },
      };
      const unknownContext = {
        ...baseContext,
        fileContext: {
          ...baseContext.fileContext,
          language: 'unknown',
        },
      };

      const jsResult = scorer.calculateScore(baseSuggestion, jsContext);
      const unknownResult = scorer.calculateScore(
        baseSuggestion,
        unknownContext
      );

      expect(jsResult.score).toBeGreaterThanOrEqual(unknownResult.score);
    });

    it('should handle security-related suggestions with high confidence', () => {
      const securitySuggestion = {
        ...baseSuggestion,
        category: 'security',
        severity: 'critical',
        description: 'SQL injection vulnerability detected',
      };

      const result = scorer.calculateScore(securitySuggestion, baseContext);

      expect(result.score).toBeGreaterThan(0.9);
    });

    it('should handle performance suggestions appropriately', () => {
      const performanceSuggestion = {
        ...baseSuggestion,
        category: 'performance',
        severity: 'medium',
        description: 'Inefficient loop detected',
      };

      const result = scorer.calculateScore(performanceSuggestion, baseContext);

      expect(result.score).toBeGreaterThan(0.5);
      expect(result.score).toBeLessThan(1.0);
    });

    it('should give lower scores to style suggestions', () => {
      const styleSuggestion = {
        ...baseSuggestion,
        category: 'style',
        severity: 'low',
        description: 'Missing semicolon',
      };

      const result = scorer.calculateScore(styleSuggestion, baseContext);

      expect(result.score).toBeLessThan(0.8);
    });

    it('should handle suggestions with code context', () => {
      const suggestionWithCode = {
        ...baseSuggestion,
        originalCode: 'let x = 1;',
        suggestedCode: 'const x = 1;',
        line_number: 5,
      };

      const result = scorer.calculateScore(suggestionWithCode, baseContext);

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should return minimum score for invalid suggestions', () => {
      const invalidSuggestion = {};

      const result = scorer.calculateScore(invalidSuggestion, baseContext);

      expect(result.score).toBeGreaterThanOrEqual(0.1);
      expect(result.score).toBeLessThan(0.5);
    });

    it('should handle missing context gracefully', () => {
      const minimalContext = {
        prMetadata: {},
        fileContext: {},
        staticAnalysisResults: {},
        repositoryContext: '',
      };

      const result = scorer.calculateScore(baseSuggestion, minimalContext);

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  describe.skip('calculateIssueSeverityScore', () => {
    it('should return correct scores for different severities', () => {
      expect(scorer.calculateIssueSeverityScore('critical')).toBe(1.0);
      expect(scorer.calculateIssueSeverityScore('high')).toBe(0.8);
      expect(scorer.calculateIssueSeverityScore('medium')).toBe(0.6);
      expect(scorer.calculateIssueSeverityScore('low')).toBe(0.4);
      expect(scorer.calculateIssueSeverityScore('info')).toBe(0.2);
      expect(scorer.calculateIssueSeverityScore('unknown')).toBe(0.3);
    });
  });

  describe.skip('calculateStaticAnalysisScore', () => {
    it('should return higher scores when tools are present', () => {
      const withTools = {
        hasLinter: true,
        hasTypeChecker: true,
        hasSecurityScanner: true,
      };
      const withoutTools = {
        hasLinter: false,
        hasTypeChecker: false,
        hasSecurityScanner: false,
      };

      const scoreWithTools = scorer.calculateStaticAnalysisScore(withTools);
      const scoreWithoutTools =
        scorer.calculateStaticAnalysisScore(withoutTools);

      expect(scoreWithTools).toBeGreaterThan(scoreWithoutTools);
      expect(scoreWithTools).toBeLessThanOrEqual(1.0);
      expect(scoreWithoutTools).toBeGreaterThanOrEqual(0.0);
    });

    it('should handle partial tool availability', () => {
      const partialTools = {
        hasLinter: true,
        hasTypeChecker: false,
        hasSecurityScanner: true,
      };

      const score = scorer.calculateStaticAnalysisScore(partialTools);

      expect(score).toBeGreaterThan(0.0);
      expect(score).toBeLessThan(1.0);
    });
  });

  describe.skip('calculateCodeContextScore', () => {
    it('should score based on file language and change type', () => {
      const jsContext = {
        filename: 'test.js',
        language: 'javascript',
        changeType: 'modification',
      };
      const unknownContext = {
        filename: 'test.txt',
        language: 'unknown',
        changeType: 'addition',
      };

      const jsScore = scorer.calculateCodeContextScore(jsContext);
      const unknownScore = scorer.calculateCodeContextScore(unknownContext);

      expect(jsScore).toBeGreaterThanOrEqual(unknownScore);
    });

    it('should consider different change types', () => {
      const baseContext = {
        filename: 'test.js',
        language: 'javascript',
      };

      const modificationScore = scorer.calculateCodeContextScore({
        ...baseContext,
        changeType: 'modification',
      });
      const additionScore = scorer.calculateCodeContextScore({
        ...baseContext,
        changeType: 'addition',
      });
      const reviewScore = scorer.calculateCodeContextScore({
        ...baseContext,
        changeType: 'review',
      });

      expect(modificationScore).toBeGreaterThan(0);
      expect(additionScore).toBeGreaterThan(0);
      expect(reviewScore).toBeGreaterThan(0);
    });
  });

  describe.skip('calculateHistoricalPatternsScore', () => {
    it('should return baseline score for typical repository', () => {
      const score = scorer.calculateHistoricalPatternsScore('Test repository');

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it('should handle empty repository context', () => {
      const score = scorer.calculateHistoricalPatternsScore('');

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('categorizeSuggestion', () => {
    it('should categorize security-related suggestions', () => {
      const securitySuggestion = {
        description: 'SQL injection vulnerability',
        category: 'security',
      };

      const category = scorer.categorizeSuggestion(securitySuggestion);
      expect(category).toBe('security');
    });

    it('should categorize performance suggestions', () => {
      const performanceSuggestion = {
        description: 'Inefficient database query',
        category: 'performance',
      };

      const category = scorer.categorizeSuggestion(performanceSuggestion);
      expect(category).toBe('performance');
    });

    it('should categorize based on description keywords', () => {
      const suggestions = [
        { description: 'Memory leak detected' },
        { description: 'Unused variable found' },
        { description: 'Missing error handling' },
        { description: 'Type mismatch error' },
        { description: 'Add documentation comment' },
      ];

      const categories = suggestions.map(s => scorer.categorizeSuggestion(s));

      expect(categories).toContain('performance');
      expect(categories).toContain('cleanup');
      expect(categories).toContain('error_handling');
      expect(categories).toContain('type_safety');
      expect(categories).toContain('documentation');
    });

    it('should default to general category for unmatched suggestions', () => {
      const genericSuggestion = {
        description: 'Some random suggestion',
      };

      const category = scorer.categorizeSuggestion(genericSuggestion);
      expect(category).toBe('general');
    });
  });

  describe.skip('normalizeSeverity', () => {
    it('should normalize severity levels correctly', () => {
      expect(scorer.normalizeSeverity('CRITICAL')).toBe('critical');
      expect(scorer.normalizeSeverity('High')).toBe('high');
      expect(scorer.normalizeSeverity('MEDIUM')).toBe('medium');
      expect(scorer.normalizeSeverity('Low')).toBe('low');
      expect(scorer.normalizeSeverity('INFO')).toBe('info');
      expect(scorer.normalizeSeverity('unknown')).toBe('unknown');
      expect(scorer.normalizeSeverity('')).toBe('unknown');
      expect(scorer.normalizeSeverity(undefined)).toBe('unknown');
    });
  });

  describe('edge cases', () => {
    it('should handle null suggestion gracefully', () => {
      const context = {
        prMetadata: {},
        fileContext: {},
        staticAnalysisResults: {},
        repositoryContext: '',
      };

      const result = scorer.calculateScore(null, context);
      expect(result.score).toBeGreaterThanOrEqual(0.1);
    });

    it('should handle undefined context gracefully', () => {
      const suggestion = {
        description: 'Test',
        category: 'general',
      };

      const result = scorer.calculateScore(suggestion, undefined);
      expect(result.score).toBeGreaterThanOrEqual(0.1);
    });

    it('should ensure score is always within valid range', () => {
      // Test with extreme values that might cause out-of-range scores
      const extremeSuggestion = {
        description: 'CRITICAL SECURITY VULNERABILITY DETECTED',
        category: 'security',
        severity: 'critical',
      };
      const extremeContext = {
        prMetadata: { title: 'Emergency fix' },
        fileContext: { language: 'javascript', changeType: 'modification' },
        staticAnalysisResults: {
          hasLinter: true,
          hasTypeChecker: true,
          hasSecurityScanner: true,
        },
        repositoryContext: 'High-security application',
      };

      const result = scorer.calculateScore(extremeSuggestion, extremeContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });
});
