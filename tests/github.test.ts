import { getChangedFiles, getReviewComments } from '../src/github';

const mockListFiles = jest.fn();
const mockListReviewComments = jest.fn();

const octokit = {
  rest: {
    pulls: {
      listFiles: mockListFiles,
      listReviewComments: mockListReviewComments,
    },
  },
};

describe('GitHub API functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getChangedFiles', () => {
    it('should return a list of changed files with their patches', async () => {
      mockListFiles.mockResolvedValue({
        data: [
          { filename: 'file1.ts', patch: 'patch1' },
          { filename: 'file2.ts', patch: 'patch2' },
        ],
      });

      const files = await getChangedFiles(octokit as any, 'owner', 'repo', 123);

      expect(files).toEqual([
        { filename: 'file1.ts', patch: 'patch1' },
        { filename: 'file2.ts', patch: 'patch2' },
      ]);
      expect(mockListFiles).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 123,
      });
    });
  });

  describe('getReviewComments', () => {
    it('should return a list of review comment bodies', async () => {
      mockListReviewComments.mockResolvedValue({
        data: [
          { body: 'comment1' },
          { body: 'comment2' },
        ],
      });

      const comments = await getReviewComments(octokit as any, 'owner', 'repo', 123);

      expect(comments).toEqual(['comment1', 'comment2']);
      expect(mockListReviewComments).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 123,
      });
    });
  });
});
