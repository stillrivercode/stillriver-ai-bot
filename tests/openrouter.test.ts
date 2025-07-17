import axios from 'axios';
import { callOpenRouter } from '../src/openrouter';
import * as core from '@actions/core';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Suppress console.error and core.setFailed during tests
let coreSetFailed: jest.SpyInstance;

describe('callOpenRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    coreSetFailed = jest.spyOn(core, 'setFailed').mockImplementation();
  });

  afterEach(() => {
    coreSetFailed.mockRestore();
  });

  it('should return the content from the first choice', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        choices: [{ message: { content: 'AI review content' } }],
      },
    });

    const content = await callOpenRouter('api-key', 'model', 'prompt', 1024, 0.7, 30000, 3, 'https://openrouter.ai/api/v1/chat/completions');
    expect(content).toBe('AI review content');
    expect(coreSetFailed).not.toHaveBeenCalled();
  });

  it('should return null if there are no choices', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { choices: [] },
    });

    const content = await callOpenRouter('api-key', 'model', 'prompt', 1024, 0.7, 30000, 3, 'https://openrouter.ai/api/v1/chat/completions');
    expect(content).toBeNull();
    expect(coreSetFailed).not.toHaveBeenCalled();
  });

  it('should handle axios errors', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Network error'));

    const content = await callOpenRouter('api-key', 'model', 'prompt', 1024, 0.7, 30000, 3, 'https://openrouter.ai/api/v1/chat/completions');
    expect(content).toBeNull();
    expect(coreSetFailed).toHaveBeenCalledWith('An unknown error occurred while calling OpenRouter: Error: Network error');
  });

  it('should retry on 429 errors', async () => {
    const error = new Error('Too Many Requests');
    (error as any).response = { status: 429 };
    (error as any).isAxiosError = true;

    mockedAxios.post
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: 'Success after retry' } }],
        },
      });
jest.mocked(axios.isAxiosError).mockReturnValue(true);

    const content = await callOpenRouter('api-key', 'model', 'prompt', 1024, 0.7, 30000, 3, 'https://openrouter.ai/api/v1/chat/completions');
    expect(content).toBe('Success after retry');
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it('should not retry on 401 errors', async () => {
    const error = new Error('Unauthorized');
    (error as any).response = { status: 401, data: { error: 'Invalid API key' } };
    (error as any).isAxiosError = true;

    mockedAxios.post.mockRejectedValueOnce(error);
jest.mocked(axios.isAxiosError).mockReturnValue(true);

    const content = await callOpenRouter('api-key', 'model', 'prompt', 1024, 0.7, 30000, 3, 'https://openrouter.ai/api/v1/chat/completions');
    expect(content).toBeNull();
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(coreSetFailed).toHaveBeenCalledWith('OpenRouter API request failed with status 401: Unauthorized. Please check your `openrouter_api_key`.');
  });
});
