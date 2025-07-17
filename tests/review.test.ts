import { getReview } from '../src/review';
import * as openrouter from '../src/openrouter';

jest.mock('../src/openrouter');

describe('getReview', () => {
  const callOpenRouterMock = openrouter.callOpenRouter as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call openrouter with a well-formed prompt', async () => {
    const changedFiles = [{ filename: 'src/main.ts', patch: '...' }];
    await getReview('api-key', changedFiles, 'model', 1024, 0.7, 30000, [], 'Test PR', 'PR Body');

    expect(callOpenRouterMock).toHaveBeenCalled();
    const prompt = callOpenRouterMock.mock.calls[0][2];
    expect(prompt).toContain('**PR Title:** Test PR');
    expect(prompt).toContain('**PR Description:**\n    PR Body');
    expect(prompt).toContain('File: src/main.ts');
  });

  it('should filter files based on exclude patterns', async () => {
    const changedFiles = [
      { filename: 'src/main.ts', patch: '...' },
      { filename: 'package.json', patch: '...' },
    ];
    await getReview('api-key', changedFiles, 'model', 1024, 0.7, 30000, ['*.json'], 'Test PR', 'PR Body');

    const prompt = callOpenRouterMock.mock.calls[0][2];
    expect(prompt).toContain('src/main.ts');
    expect(prompt).not.toContain('package.json');
  });

  it('should return null if all files are filtered', async () => {
    const changedFiles = [{ filename: 'package.json', patch: '...' }];
    const result = await getReview('api-key', changedFiles, 'model', 1024, 0.7, 30000, ['*.json'], 'Test PR', 'PR Body');
    expect(result).toBeNull();
    expect(callOpenRouterMock).not.toHaveBeenCalled();
  });
});
