import axios from 'axios';
import { callOpenRouter } from '../src/openrouter';
import * as core from '@actions/core';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('callOpenRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the content from the first choice', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        choices: [{ message: { content: 'AI review content' } }],
      },
    });

    const content = await callOpenRouter('api-key', 'model', 'prompt', 1024, 0.7, 30000);
    expect(content).toBe('AI review content');
  });

  it('should return null if there are no choices', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { choices: [] },
    });

    const content = await callOpenRouter('api-key', 'model', 'prompt', 1024, 0.7, 30000);
    expect(content).toBeNull();
  });

  it('should handle axios errors', async () => {
    const coreSetFailed = jest.spyOn(core, 'setFailed');
    mockedAxios.post.mockRejectedValue(new Error('Network error'));

    const content = await callOpenRouter('api-key', 'model', 'prompt', 1024, 0.7, 30000);
    expect(content).toBeNull();
    expect(coreSetFailed).toHaveBeenCalledWith('An unknown error occurred while calling OpenRouter: Error: Network error');
  });
});
