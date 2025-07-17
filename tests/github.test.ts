import { getOctokit } from '@actions/github';
import { getChangedFiles, getReviews } from '../src/github';

const mockListFiles = jest.fn();
const mockListReviews = jest.fn();

const octokit = {
  rest: {
    pulls: {
      listFiles: mockListFiles,
      listReviews: mockListReviews,
    },
  },
} as unknown as ReturnType<typeof getOctokit>;

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

      const files = await getChangedFiles(octokit, 'owner', 'repo', 123);

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

  describe('getReviews', () => {
    it('should return a list of reviews', async () => {
      const mockReviews = [
        { id: 1, user: { login: 'user1' }, body: 'review1', state: 'APPROVED' },
        { id: 2, user: { login: 'user2' }, body: 'review2', state: 'COMMENTED' },
      ];
      mockListReviews.mockResolvedValue({
        data: mockReviews,
      });

      const reviews = await getReviews(octokit, 'owner', 'repo', 123);

      expect(reviews).toEqual(mockReviews);
      expect(mockListReviews).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 123,
      });
    });
  });
});
