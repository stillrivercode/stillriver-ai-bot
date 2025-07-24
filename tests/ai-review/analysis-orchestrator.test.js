/* eslint-disable @typescript-eslint/no-require-imports */
const AnalysisOrchestrator = require('../../scripts/ai-review/services/analysis-orchestrator');
const GitHubAPIService = require('../../scripts/ai-review/services/github-api-service');
const AIAnalysisService = require('../../scripts/ai-review/services/ai-analysis-service');

// Mock dependencies
jest.mock('../../scripts/ai-review/services/github-api-service');
jest.mock('../../scripts/ai-review/services/ai-analysis-service');

describe('AnalysisOrchestrator', () => {
  let orchestrator;
  let mockGitHub;
  let mockAI;

  const mockPRData = {
    number: 123,
    title: 'Test PR',
    body: 'Test description',
    user: { login: 'testuser' },
    base: { ref: 'main', sha: 'base123' },
    head: { ref: 'feature', sha: 'head456' },
    files: [
      {
        filename: 'src/test.js',
        status: 'modified',
        changes: 10,
        additions: 5,
        deletions: 5,
        patch: '@@ -1,3 +1,3 @@\n-old code\n+new code',
      },
    ],
  };

  const mockRepoContext = {
    name: 'test-repo',
    description: 'Test repository',
    language: 'JavaScript',
    topics: ['test', 'javascript'],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup GitHub API service mock
    mockGitHub = {
      fetchPullRequest: jest.fn().mockResolvedValue(mockPRData),
      getRepositoryContext: jest.fn().mockResolvedValue(mockRepoContext),
      getCodingStandards: jest
        .fn()
        .mockResolvedValue('ESLint configuration found'),
      filterFilesForAnalysis: jest.fn().mockReturnValue(mockPRData.files),
      postComment: jest.fn().mockResolvedValue({ success: true }),
      postReview: jest.fn().mockResolvedValue({ success: true }),
      postInlineComment: jest.fn().mockResolvedValue({ success: true }),
    };
    GitHubAPIService.mockImplementation(() => mockGitHub);

    // Setup AI analysis service mock
    mockAI = {
      analyzePullRequest: jest.fn(),
    };
    AIAnalysisService.mockImplementation(() => mockAI);

    orchestrator = new AnalysisOrchestrator();
  });

  describe('analyzePullRequest', () => {
    it('should post summary comment when no suggestions are found', async () => {
      // Mock no suggestions returned
      mockAI.analyzePullRequest.mockResolvedValue([]);

      const result = await orchestrator.analyzePullRequest(123);

      expect(result).toEqual([]);
      expect(mockGitHub.postComment).toHaveBeenCalledWith(
        123,
        expect.stringContaining('Great work!') &&
          expect.stringContaining('No significant issues were found')
      );
      expect(mockGitHub.postComment).toHaveBeenCalledTimes(1);
    });

    it('should post summary and detailed comments when suggestions exist', async () => {
      const mockSuggestions = [
        {
          description: 'Use const instead of let',
          file_path: 'src/test.js',
          line_number: 5,
          category: 'best_practices',
          severity: 'medium',
          originalCode: 'let x = 1',
          suggestedCode: 'const x = 1',
        },
      ];

      mockAI.analyzePullRequest.mockResolvedValue(mockSuggestions);

      const result = await orchestrator.analyzePullRequest(123);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('confidence');
      expect(result[0]).toHaveProperty('confidence_level');

      // Should post summary comment
      expect(mockGitHub.postComment).toHaveBeenCalledWith(
        123,
        expect.stringContaining('AI Review by')
      );

      // Should post detailed review in summary
      expect(mockGitHub.postComment).toHaveBeenCalledWith(
        123,
        expect.stringContaining('Detailed Review')
      );
    });

    it('should post inline comments for high-confidence resolvable suggestions', async () => {
      process.env.AI_ENABLE_INLINE_COMMENTS = 'true';

      const mockSuggestions = [
        {
          description: 'Critical security issue',
          file_path: 'src/test.js',
          line_number: 10,
          category: 'security',
          severity: 'critical',
          originalCode: 'eval(userInput)',
          suggestedCode: 'safeEval(userInput)',
        },
      ];

      mockAI.analyzePullRequest.mockResolvedValue(mockSuggestions);

      // Mock high confidence score
      jest
        .spyOn(orchestrator.confidenceScorer, 'calculateScore')
        .mockReturnValue({ score: 0.96, classification: 'RESOLVABLE' });

      await orchestrator.analyzePullRequest(123);

      // Should post summary
      expect(mockGitHub.postComment).toHaveBeenCalledWith(
        123,
        expect.stringContaining('AI Review by')
      );

      // Should post inline comment
      expect(mockGitHub.postInlineComment).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          path: 'src/test.js',
          line: 10,
          body: expect.stringContaining('Critical'),
        })
      );
    });

    it('should handle API failures gracefully', async () => {
      mockGitHub.fetchPullRequest.mockRejectedValue(new Error('API Error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(orchestrator.analyzePullRequest(123)).rejects.toThrow(
        'API Error'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Analysis orchestration failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle comment posting failures gracefully', async () => {
      mockAI.analyzePullRequest.mockResolvedValue([]);
      mockGitHub.postComment.mockRejectedValue(new Error('Comment failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await orchestrator.analyzePullRequest(123);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Failed to post summary comment:',
        'Comment failed'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('postNoSuggestionsComment', () => {
    it('should generate appropriate summary for clean code', async () => {
      await orchestrator.postNoSuggestionsComment(123, mockPRData, 5);

      expect(mockGitHub.postComment).toHaveBeenCalledWith(
        123,
        expect.stringMatching(/Great work!.*No significant issues were found/s)
      );

      const call = mockGitHub.postComment.mock.calls[0];
      const comment = call[1];

      expect(comment).toContain('Files Analyzed**: 5');
      expect(comment).toContain('Issues Found**: 0');
      expect(comment).toContain('Code quality and maintainability');
      expect(comment).toContain('Security vulnerabilities');
      expect(comment).toContain(mockPRData.head.sha.substring(0, 8));
    });

    it('should indicate review type based on inline comments setting', async () => {
      process.env.AI_ENABLE_INLINE_COMMENTS = 'false';

      await orchestrator.postNoSuggestionsComment(123, mockPRData, 3);

      expect(mockGitHub.postComment).toHaveBeenCalledWith(
        123,
        expect.stringContaining('Enhanced Comments')
      );
    });
  });

  describe('generateStatistics', () => {
    it('should correctly categorize suggestions by confidence', () => {
      const suggestions = [
        { confidence: 0.96, category: 'security', severity: 'critical' },
        { confidence: 0.85, category: 'performance', severity: 'medium' },
        { confidence: 0.7, category: 'style', severity: 'low' },
        { confidence: 0.5, category: 'documentation', severity: 'low' },
      ];

      const stats = orchestrator.generateStatistics(suggestions);

      expect(stats.total).toBe(4);
      expect(stats.by_confidence.very_high).toBe(1);
      expect(stats.by_confidence.high).toBe(1);
      expect(stats.by_confidence.medium).toBe(1);
      expect(stats.by_confidence.low).toBe(1);
      expect(stats.by_category.security).toBe(1);
      expect(stats.by_category.performance).toBe(1);
      expect(stats.by_severity.critical).toBe(1);
      expect(stats.by_severity.medium).toBe(1);
      expect(stats.by_severity.low).toBe(2);
    });
  });

  describe('hasResolvableSuggestions', () => {
    it('should return true when suggestions have confidence >= 0.95', () => {
      const suggestions = [{ confidence: 0.96 }, { confidence: 0.8 }];

      expect(orchestrator.hasResolvableSuggestions(suggestions)).toBe(true);
    });

    it('should return false when no suggestions have confidence >= 0.95', () => {
      const suggestions = [{ confidence: 0.94 }, { confidence: 0.8 }];

      expect(orchestrator.hasResolvableSuggestions(suggestions)).toBe(false);
    });
  });

  describe('generateInlineComments', () => {
    it('should generate inline comments for resolvable suggestions', () => {
      const suggestions = [
        {
          confidence: 0.96,
          description: 'Use const instead of let',
          file_path: 'src/test.js',
          line_number: 5,
          category: 'best_practices',
          originalCode: 'let x = 1',
          suggestedCode: 'const x = 1',
        },
        {
          confidence: 0.97,
          description: 'Remove unused variable',
          file_path: 'src/test.js',
          line_number: 10,
          category: 'cleanup',
          originalCode: 'let unused = 1;',
          suggestedCode: '// Remove this line',
        },
      ];

      const inlineComments = orchestrator.generateInlineComments(suggestions);

      expect(inlineComments).toHaveLength(2);
      expect(inlineComments[0]).toEqual({
        path: 'src/test.js',
        line: 5,
        body: expect.stringContaining(
          '🔒 **Critical**: Use const instead of let'
        ),
      });
      expect(inlineComments[0].body).toContain(
        '```suggestion\nconst x = 1\n```'
      );
      expect(inlineComments[0].body).toContain('**Confidence**: 96%');
    });

    it('should limit resolvable suggestions to 5 per PR', () => {
      const suggestions = Array(10)
        .fill(null)
        .map((_, i) => ({
          confidence: 0.96,
          description: `Issue ${i}`,
          file_path: 'src/test.js',
          line_number: i + 1,
          category: 'test',
          originalCode: `old${i}`,
          suggestedCode: `new${i}`,
        }));

      const inlineComments = orchestrator.generateInlineComments(suggestions);

      expect(inlineComments).toHaveLength(5);
    });
  });

  describe('formatSuggestionsAsComment', () => {
    it('should format suggestions with appropriate icons and confidence levels', () => {
      const suggestions = [
        {
          confidence: 0.96,
          description: 'Critical issue',
          file_path: 'src/test.js',
          line_number: 5,
          category: 'security',
          originalCode: 'unsafe code',
          suggestedCode: 'safe code',
        },
        {
          confidence: 0.85,
          description: 'High priority issue',
          file_path: 'src/other.js',
          category: 'performance',
        },
      ];

      const comment = orchestrator.formatSuggestionsAsComment(suggestions);

      expect(comment).toContain('## 📋 Detailed Suggestions');
      expect(comment).toContain('### 🔒 Critical: Critical issue');
      expect(comment).toContain('### ⚡ High: High priority issue');
      expect(comment).toContain('**File**: `src/test.js`:5');
      expect(comment).toContain('**Current Code:**\n```\nunsafe code\n```');
      expect(comment).toContain('**Suggested Code:**\n```\nsafe code\n```');
      expect(comment).toContain('**Confidence**: 96% | **Category**: security');
    });
  });

  afterEach(() => {
    delete process.env.AI_ENABLE_INLINE_COMMENTS;
  });
});
