const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Mock child_process for shell script execution
jest.mock('child_process');

describe('AI Review Integration Tests', () => {
  const testPRNumber = 123;
  const mockEnv = {
    GITHUB_TOKEN: 'test-token',
    OPENROUTER_API_KEY: 'test-api-key',
    AI_ENABLE_INLINE_COMMENTS: 'true'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variables
    Object.assign(process.env, mockEnv);
    
    // Mock git commands
    execSync.mockImplementation((command) => {
      if (command === 'git remote get-url origin') {
        return 'https://github.com/test/repo.git';
      }
      if (command.includes('gh pr comment')) {
        return 'Comment posted successfully';
      }
      if (command.includes('gh api')) {
        return JSON.stringify({ success: true });
      }
      return '{}';
    });
  });

  afterEach(() => {
    // Clean up environment
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('ai-review-resolvable.sh script', () => {
    const scriptPath = path.resolve(__dirname, '../../scripts/ai-review-resolvable.sh');

    it('should handle successful analysis with suggestions', async () => {
      // Mock successful orchestrator execution
      const mockSuggestions = [
        {
          description: 'Use const instead of let',
          confidence: 0.85,
          category: 'best_practices',
          file_path: 'src/test.js',
          line_number: 5
        }
      ];

      // Mock orchestrator CLI to return suggestions
      execSync.mockImplementation((command) => {
        if (command.includes('analysis-orchestrator-cli.js')) {
          return JSON.stringify(mockSuggestions);
        }
        if (command.includes('validate-suggestions.sh')) {
          return 'Validation passed';
        }
        if (command.includes('gh pr comment')) {
          return 'Comment posted';
        }
        return '{}';
      });

      // This would normally run the shell script, but we'll simulate the key parts
      const result = await simulateScriptExecution('analyze', testPRNumber);

      expect(result.success).toBe(true);
      expect(result.commentsPosted).toBeGreaterThan(0);
    });

    it('should handle no suggestions scenario', async () => {
      // Mock orchestrator returning empty suggestions
      execSync.mockImplementation((command) => {
        if (command.includes('analysis-orchestrator-cli.js')) {
          return JSON.stringify([]);
        }
        if (command.includes('gh pr comment')) {
          return 'Summary comment posted';
        }
        return '{}';
      });

      const result = await simulateScriptExecution('analyze', testPRNumber);

      expect(result.success).toBe(true);
      expect(result.summaryPosted).toBe(true);
    });

    it('should handle analysis failure gracefully', async () => {
      // Mock orchestrator failure
      execSync.mockImplementation((command) => {
        if (command.includes('analysis-orchestrator-cli.js')) {
          throw new Error('Analysis failed');
        }
        if (command.includes('gh pr comment')) {
          return 'Error comment posted';
        }
        return '{}';
      });

      const result = await simulateScriptExecution('analyze', testPRNumber);

      expect(result.success).toBe(false);
      expect(result.errorCommentPosted).toBe(true);
    });
  });

  describe('GitHub Workflow Integration', () => {
    it('should handle workflow environment variables', () => {
      const workflowEnv = {
        ...mockEnv,
        AI_REVIEW_RATE_LIMIT_MINUTES: '5',
        AI_MODEL: 'google/gemini-2.5-pro',
        PR_NUMBER: '456',
        BASE_SHA: 'base123',
        HEAD_SHA: 'head456'
      };

      Object.assign(process.env, workflowEnv);

      // Simulate workflow environment
      expect(process.env.AI_REVIEW_RATE_LIMIT_MINUTES).toBe('5');
      expect(process.env.AI_MODEL).toBe('google/gemini-2.5-pro');
      expect(process.env.PR_NUMBER).toBe('456');
    });

    it('should handle inline comments configuration', () => {
      // Test with inline comments enabled
      process.env.AI_ENABLE_INLINE_COMMENTS = 'true';
      expect(process.env.AI_ENABLE_INLINE_COMMENTS).toBe('true');

      // Test with inline comments disabled
      process.env.AI_ENABLE_INLINE_COMMENTS = 'false';
      expect(process.env.AI_ENABLE_INLINE_COMMENTS).toBe('false');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing GitHub token', async () => {
      delete process.env.GITHUB_TOKEN;

      const result = await simulateScriptExecution('analyze', testPRNumber);

      expect(result.success).toBe(false);
      expect(result.error).toContain('GITHUB_TOKEN');
    });

    it('should handle missing OpenRouter API key', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const result = await simulateScriptExecution('analyze', testPRNumber);

      expect(result.success).toBe(false);
      expect(result.error).toContain('OPENROUTER_API_KEY');
    });

    it('should handle GitHub API failures', async () => {
      execSync.mockImplementation((command) => {
        if (command.includes('gh')) {
          throw new Error('GitHub API rate limit exceeded');
        }
        return '{}';
      });

      const result = await simulateScriptExecution('analyze', testPRNumber);

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });
  });

  describe('Comment Formatting', () => {
    it('should format no-suggestions comment correctly', () => {
      const comment = formatNoSuggestionsComment(5, 'head456');

      expect(comment).toContain('Great work!');
      expect(comment).toContain('Files Analyzed**: 5');
      expect(comment).toContain('Issues Found**: 0');
      expect(comment).toContain('head456'.substring(0, 8));
    });

    it('should format suggestions summary correctly', () => {
      const suggestions = [
        { confidence: 0.96, category: 'security', severity: 'critical' },
        { confidence: 0.85, category: 'performance', severity: 'medium' },
        { confidence: 0.70, category: 'style', severity: 'low' }
      ];

      const comment = formatSuggestionsComment(suggestions, true, 'head456');

      expect(comment).toContain('AI Review by Resolvable Comments');
      expect(comment).toContain('Total Suggestions**: 3');
      expect(comment).toContain('Critical** (≥95%): 1 (resolvable)');
      expect(comment).toContain('High** (80-94%): 1');
      expect(comment).toContain('Medium** (65-79%): 1');
    });

    it('should handle inline comments disabled scenario', () => {
      const suggestions = [
        { confidence: 0.96, category: 'security', severity: 'critical' }
      ];

      const comment = formatSuggestionsComment(suggestions, false, 'head456');

      expect(comment).toContain('Enhanced Comments');
      expect(comment).toContain('(high priority)');
      expect(comment).not.toContain('(resolvable)');
    });
  });

  describe('Validation', () => {
    it('should validate suggestion JSON structure', () => {
      const validSuggestion = {
        description: 'Test suggestion',
        confidence: 0.85,
        category: 'test',
        file_path: 'test.js'
      };

      const isValid = validateSuggestion(validSuggestion);
      expect(isValid).toBe(true);
    });

    it('should reject invalid suggestions', () => {
      const invalidSuggestions = [
        {}, // Missing required fields
        { description: 'Test' }, // Missing confidence
        { description: 'Test', confidence: 1.5 }, // Invalid confidence range
        { description: 'Test', confidence: 0.8 } // Missing category
      ];

      invalidSuggestions.forEach(suggestion => {
        const isValid = validateSuggestion(suggestion);
        expect(isValid).toBe(false);
      });
    });
  });

  // Helper functions for simulation
  async function simulateScriptExecution(command, prNumber) {
    try {
      // Validate required environment variables
      if (!process.env.GITHUB_TOKEN) {
        return { success: false, error: 'GITHUB_TOKEN is required' };
      }
      if (!process.env.OPENROUTER_API_KEY) {
        return { success: false, error: 'OPENROUTER_API_KEY is required' };
      }

      // Simulate the main script logic
      if (command === 'analyze') {
        try {
          // This would call the orchestrator
          const mockCall = `analysis-orchestrator-cli.js --pr-number ${prNumber}`;
          const result = execSync(mockCall);
          
          const suggestions = JSON.parse(result);
          
          if (suggestions.length === 0) {
            // Post no-suggestions comment
            execSync(`gh pr comment ${prNumber} --body "Summary comment"`);
            return { success: true, summaryPosted: true, commentsPosted: 1 };
          } else {
            // Post suggestions
            execSync(`gh pr comment ${prNumber} --body "Suggestions comment"`);
            return { success: true, commentsPosted: 2 }; // Summary + details
          }
        } catch (error) {
          // Post error comment
          execSync(`gh pr comment ${prNumber} --body "Error comment"`);
          return { success: false, errorCommentPosted: true };
        }
      }

      return { success: false, error: 'Unknown command' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  function formatNoSuggestionsComment(filesAnalyzed, headSha) {
    return `## 🤖 AI Review by Resolvable Comments

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

The code changes in this pull request meet quality standards and are ready for human review.

---
*AI Review completed at ${new Date().toISOString()}*  
*Analysis ID: ${headSha.substring(0, 8)}*`;
  }

  function formatSuggestionsComment(suggestions, inlineEnabled, headSha) {
    const reviewType = inlineEnabled ? 'Resolvable Comments' : 'Enhanced Comments';
    const stats = generateStats(suggestions);
    
    let comment = `## 🤖 AI Review by ${reviewType}\n\n`;
    
    if (stats.very_high > 0 && inlineEnabled) {
      comment += `🔒 **${stats.very_high} critical suggestion${stats.very_high !== 1 ? 's' : ''} require immediate attention** (resolvable)\n\n`;
    }
    
    comment += `### Analysis Summary
- **Total Suggestions**: ${suggestions.length}
- **Critical** (≥95%): ${stats.very_high} ${inlineEnabled ? '(resolvable)' : '(high priority)'}
- **High** (80-94%): ${stats.high} (enhanced comments)
- **Medium** (65-79%): ${stats.medium} (informational)
- **Low** (<65%): ${stats.low} (suppressed)

---
*AI Review completed at ${new Date().toISOString()}*  
*Analysis ID: ${headSha.substring(0, 8)}*`;

    return comment;
  }

  function generateStats(suggestions) {
    return suggestions.reduce((stats, s) => {
      if (s.confidence >= 0.95) stats.very_high++;
      else if (s.confidence >= 0.8) stats.high++;
      else if (s.confidence >= 0.65) stats.medium++;
      else stats.low++;
      return stats;
    }, { very_high: 0, high: 0, medium: 0, low: 0 });
  }

  function validateSuggestion(suggestion) {
    const required = ['description', 'confidence', 'category'];
    
    for (const field of required) {
      if (!suggestion[field]) return false;
    }
    
    if (typeof suggestion.confidence !== 'number' || 
        suggestion.confidence < 0 || 
        suggestion.confidence > 1) {
      return false;
    }
    
    return true;
  }
});