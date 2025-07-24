const GitHubAPIService = require('../../scripts/ai-review/services/github-api-service');
const { execSync } = require('child_process');

// Mock child_process
jest.mock('child_process');

describe('GitHubAPIService', () => {
  let service;
  const mockToken = 'test-token';
  const mockRepo = 'owner/repo';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful git remote command
    execSync.mockImplementation((command, options) => {
      if (command === 'git remote get-url origin') {
        return 'https://github.com/owner/repo.git\n';
      }
      return '{}';
    });

    service = new GitHubAPIService({ token: mockToken, repo: mockRepo });
  });

  describe('constructor', () => {
    it('should initialize with provided token and repo', () => {
      expect(service.token).toBe(mockToken);
      expect(service.repo).toBe(mockRepo);
    });

    it('should infer repository from git remote when not provided', () => {
      const serviceWithoutRepo = new GitHubAPIService({ token: mockToken });
      expect(serviceWithoutRepo.repo).toBe('owner/repo');
      expect(execSync).toHaveBeenCalledWith('git remote get-url origin', {
        encoding: 'utf8'
      });
    });

    it('should throw error when no token provided', () => {
      delete process.env.GITHUB_TOKEN;
      expect(() => new GitHubAPIService()).toThrow('GITHUB_TOKEN is required');
    });

    it('should use environment token when not provided in options', () => {
      process.env.GITHUB_TOKEN = 'env-token';
      const serviceFromEnv = new GitHubAPIService({ repo: mockRepo });
      expect(serviceFromEnv.token).toBe('env-token');
      delete process.env.GITHUB_TOKEN;
    });
  });

  describe('postComment', () => {
    it('should post comment successfully', async () => {
      const mockResponse = 'Comment posted successfully';
      execSync.mockReturnValue(mockResponse);

      const result = await service.postComment(123, 'Test comment');

      expect(result).toEqual({ success: true, output: mockResponse });
      expect(execSync).toHaveBeenCalledWith(
        'gh pr comment 123 --body "Test comment"',
        {
          encoding: 'utf8',
          env: expect.objectContaining({
            GITHUB_TOKEN: mockToken
          })
        }
      );
    });

    it('should escape quotes in comment body', async () => {
      execSync.mockReturnValue('Success');

      await service.postComment(123, 'Comment with "quotes"');

      expect(execSync).toHaveBeenCalledWith(
        'gh pr comment 123 --body "Comment with \\"quotes\\""',
        expect.any(Object)
      );
    });

    it('should handle command failure', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      await expect(service.postComment(123, 'Test')).rejects.toThrow(
        'Failed to post comment to PR 123: Command failed'
      );
    });
  });

  describe('postInlineComment', () => {
    it('should post inline comment successfully', async () => {
      const mockResponse = 'Inline comment posted';
      execSync.mockReturnValue(mockResponse);

      const comment = {
        path: 'src/test.js',
        line: 10,
        body: 'Test inline comment with\nmultiple lines'
      };

      const result = await service.postInlineComment(123, comment);

      expect(result).toEqual({ success: true, output: mockResponse });
      expect(execSync).toHaveBeenCalledWith(
        'gh pr comment 123 --body "Test inline comment with\\nmultiple lines"',
        expect.any(Object)
      );
    });

    it('should escape quotes and newlines in inline comment body', async () => {
      execSync.mockReturnValue('Success');

      const comment = {
        path: 'src/test.js',
        line: 5,
        body: 'Comment with "quotes" and\nnewlines'
      };

      await service.postInlineComment(123, comment);

      expect(execSync).toHaveBeenCalledWith(
        'gh pr comment 123 --body "Comment with \\"quotes\\" and\\nnewlines"',
        expect.any(Object)
      );
    });

    it('should handle inline comment failure', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Inline comment failed');
      });

      const comment = { path: 'test.js', line: 1, body: 'Test' };

      await expect(service.postInlineComment(123, comment)).rejects.toThrow(
        'Failed to post inline comment to PR 123: Inline comment failed'
      );
    });
  });

  describe('postReview', () => {
    it('should post regular comment when no inline comments provided', async () => {
      const mockResponse = 'Review posted';
      execSync.mockReturnValue(mockResponse);

      const result = await service.postReview(123, 'Review body', []);

      expect(result).toEqual({ success: true, output: mockResponse });
      expect(execSync).toHaveBeenCalledWith(
        'gh pr comment 123 --body "Review body"',
        expect.any(Object)
      );
    });

    it('should create review with inline comments', async () => {
      const mockResponse = '{"id": 456, "body": "Review body"}';
      execSync.mockReturnValue(mockResponse);

      const comments = [
        { path: 'src/test.js', position: 5, body: 'Comment 1' },
        { path: 'src/other.js', position: 10, body: 'Comment 2' }
      ];

      const result = await service.postReview(123, 'Review body', comments);

      expect(result).toEqual({ id: 456, body: 'Review body' });
      expect(execSync).toHaveBeenCalledWith(
        'gh api "/repos/owner/repo/pulls/123/reviews" --method POST --input -',
        {
          encoding: 'utf8',
          input: JSON.stringify({
            body: 'Review body',
            event: 'COMMENT',
            comments: [
              { path: 'src/test.js', position: 5, body: 'Comment 1' },
              { path: 'src/other.js', position: 10, body: 'Comment 2' }
            ]
          }),
          env: expect.objectContaining({
            GITHUB_TOKEN: mockToken
          })
        }
      );
    });

    it('should fallback to regular comment when review fails', async () => {
      // First call (review) fails, second call (fallback comment) succeeds
      execSync
        .mockImplementationOnce(() => {
          throw new Error('Review failed');
        })
        .mockReturnValueOnce('Fallback comment posted');

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const comments = [{ path: 'test.js', position: 1, body: 'Test' }];
      const result = await service.postReview(123, 'Review body', comments);

      expect(result).toEqual({ success: true, output: 'Fallback comment posted' });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Review comment failed, falling back to regular comment: Review failed'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('callGitHubAPI', () => {
    it('should make GET request successfully', () => {
      const mockResponse = '{"data": "test"}';
      execSync.mockReturnValue(mockResponse);

      const result = service.callGitHubAPI('/test/endpoint');

      expect(result).toEqual({ data: 'test' });
      expect(execSync).toHaveBeenCalledWith(
        'gh api "/test/endpoint"',
        {
          encoding: 'utf8',
          input: null,
          env: expect.objectContaining({
            GITHUB_TOKEN: mockToken
          })
        }
      );
    });

    it('should make POST request with data', () => {
      const mockResponse = '{"success": true}';
      execSync.mockReturnValue(mockResponse);

      const postData = { key: 'value' };
      const result = service.callGitHubAPI('/test/endpoint', 'POST', postData);

      expect(result).toEqual({ success: true });
      expect(execSync).toHaveBeenCalledWith(
        'gh api "/test/endpoint" --method POST --input -',
        {
          encoding: 'utf8',
          input: JSON.stringify(postData),
          env: expect.objectContaining({
            GITHUB_TOKEN: mockToken
          })
        }
      );
    });

    it('should handle API errors', () => {
      execSync.mockImplementation(() => {
        throw new Error('API call failed');
      });

      expect(() => service.callGitHubAPI('/test')).toThrow(
        'GitHub API call failed: API call failed'
      );
    });
  });

  describe('fetchPullRequest', () => {
    it('should fetch PR data with files', async () => {
      const mockPRData = {
        number: 123,
        title: 'Test PR',
        body: 'Description'
      };
      const mockFilesData = [
        { filename: 'test.js', additions: 5, deletions: 2 }
      ];

      execSync
        .mockReturnValueOnce(JSON.stringify(mockPRData))
        .mockReturnValueOnce(JSON.stringify(mockFilesData));

      const result = await service.fetchPullRequest(123);

      expect(result).toEqual({
        ...mockPRData,
        files: mockFilesData
      });
      expect(execSync).toHaveBeenCalledWith(
        'gh api "/repos/owner/repo/pulls/123"',
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        'gh api "/repos/owner/repo/pulls/123/files"',
        expect.any(Object)
      );
    });

    it('should handle fetch errors', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Fetch failed');
      });

      await expect(service.fetchPullRequest(123)).rejects.toThrow(
        'Failed to fetch PR 123: Fetch failed'
      );
    });
  });

  describe('filterFilesForAnalysis', () => {
    const testFiles = [
      { filename: 'src/test.js', status: 'modified', changes: 10, binary: false },
      { filename: 'src/test.ts', status: 'added', changes: 5, binary: false },
      { filename: 'package.json', status: 'modified', changes: 2, binary: false },
      { filename: 'dist/bundle.js', status: 'modified', changes: 1000, binary: false },
      { filename: 'node_modules/lib.js', status: 'added', changes: 1, binary: false },
      { filename: 'image.png', status: 'added', changes: 0, binary: true },
      { filename: 'deleted.js', status: 'removed', changes: 0, binary: false },
      { filename: 'large.js', status: 'modified', changes: 2000, binary: false },
      { filename: 'Dockerfile', status: 'modified', changes: 5, binary: false }
    ];

    it('should filter files appropriately for analysis', () => {
      const result = service.filterFilesForAnalysis(testFiles);

      expect(result).toHaveLength(4);
      expect(result.map(f => f.filename)).toEqual([
        'src/test.js',
        'src/test.ts', 
        'package.json',
        'Dockerfile'
      ]);
    });

    it('should skip removed files', () => {
      const files = [{ filename: 'test.js', status: 'removed' }];
      expect(service.filterFilesForAnalysis(files)).toHaveLength(0);
    });

    it('should skip binary files', () => {
      const files = [{ filename: 'test.png', binary: true }];
      expect(service.filterFilesForAnalysis(files)).toHaveLength(0);
    });

    it('should skip files with too many changes', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const files = [{ filename: 'huge.js', changes: 1500 }];
      
      const result = service.filterFilesForAnalysis(files);
      
      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Skipping huge.js: too many changes (1500)'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('getRepositoryContext', () => {
    it('should fetch repository context with README', async () => {
      const mockRepoData = {
        name: 'test-repo',
        description: 'Test repository',
        language: 'JavaScript',
        topics: ['test', 'javascript']
      };
      const mockReadmeData = {
        content: Buffer.from('# Test Repo\nThis is a test').toString('base64')
      };

      execSync
        .mockReturnValueOnce(JSON.stringify(mockRepoData))
        .mockReturnValueOnce(JSON.stringify(mockReadmeData));

      const result = await service.getRepositoryContext();

      expect(result).toEqual({
        name: 'test-repo',
        description: 'Test repository',
        language: 'JavaScript',
        topics: ['test', 'javascript'],
        readme: '# Test Repo\nThis is a test'
      });
    });

    it('should handle missing README gracefully', async () => {
      const mockRepoData = { name: 'test-repo' };
      
      execSync
        .mockReturnValueOnce(JSON.stringify(mockRepoData))
        .mockImplementationOnce(() => {
          throw new Error('README not found');
        });

      const result = await service.getRepositoryContext();

      expect(result.readme).toBe('');
    });

    it('should handle repository fetch errors', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Repo fetch failed');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await service.getRepositoryContext();
      
      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get repository context: Repo fetch failed'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('getCodingStandards', () => {
    it('should detect ESLint configuration', async () => {
      const mockEslintConfig = { content: Buffer.from('{}').toString('base64') };
      
      execSync
        .mockReturnValueOnce(JSON.stringify(mockEslintConfig))
        .mockImplementation(() => {
          throw new Error('File not found');
        });

      const result = await service.getCodingStandards();

      expect(result).toContain('ESLint configuration found');
    });

    it('should detect multiple configuration files', async () => {
      const mockConfig = { content: Buffer.from('{}').toString('base64') };
      
      execSync.mockReturnValue(JSON.stringify(mockConfig));

      const result = await service.getCodingStandards();

      expect(result).toContain('ESLint configuration found');
      expect(result).toContain('Prettier configuration found');
      expect(result).toContain('TypeScript configuration found');
    });

    it('should return empty string when no standards found', async () => {
      execSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = await service.getCodingStandards();

      expect(result).toBe('');
    });
  });
});