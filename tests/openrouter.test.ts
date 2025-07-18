import axios from 'axios';
import { callOpenRouter } from '../src/openrouter';
import * as core from '@actions/core';
import {
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterApiError,
  OpenRouterTimeoutError,
} from '../src/errors';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock console warnings during tests
let coreWarning: jest.SpyInstance;

describe('callOpenRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    coreWarning = jest.spyOn(core, 'warning').mockImplementation();
  });

  afterEach(() => {
    coreWarning.mockRestore();
  });

  it('should return the content from the first choice', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        choices: [{ message: { content: 'AI review content' } }],
      },
    });

    const content = await callOpenRouter(
      'api-key',
      'model',
      'prompt',
      1024,
      0.7,
      30000,
      3,
      'https://openrouter.ai/api/v1/chat/completions'
    );
    expect(content).toBe('AI review content');
  });

  it('should throw OpenRouterApiError if there are no choices', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { choices: [] },
      status: 200,
    });

    await expect(
      callOpenRouter(
        'api-key',
        'model',
        'prompt',
        1024,
        0.7,
        30000,
        3,
        'https://openrouter.ai/api/v1/chat/completions'
      )
    ).rejects.toThrow(OpenRouterApiError);
  });

  it('should throw error for non-axios errors', async () => {
    const error = new Error('Network error');
    mockedAxios.post.mockRejectedValue(error);

    await expect(
      callOpenRouter(
        'api-key',
        'model',
        'prompt',
        1024,
        0.7,
        30000,
        3,
        'https://openrouter.ai/api/v1/chat/completions'
      )
    ).rejects.toThrow(error);
  });

  it('should retry on 429 errors', async () => {
    const error = new Error('Too Many Requests');
    (error as any).response = { status: 429 };
    (error as any).isAxiosError = true;

    mockedAxios.post.mockRejectedValueOnce(error).mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: 'Success after retry' } }],
      },
    });
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    const content = await callOpenRouter(
      'api-key',
      'model',
      'prompt',
      1024,
      0.7,
      30000,
      3,
      'https://openrouter.ai/api/v1/chat/completions'
    );
    expect(content).toBe('Success after retry');
    expect(coreWarning).toHaveBeenCalledWith(
      expect.stringContaining('Retrying in')
    );
  });

  it('should throw OpenRouterAuthError on 401 errors', async () => {
    const error = new Error('Unauthorized');
    (error as any).response = { status: 401, data: {} };
    (error as any).isAxiosError = true;

    mockedAxios.post.mockRejectedValue(error);
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    await expect(
      callOpenRouter(
        'api-key',
        'model',
        'prompt',
        1024,
        0.7,
        30000,
        3,
        'https://openrouter.ai/api/v1/chat/completions'
      )
    ).rejects.toThrow(OpenRouterAuthError);
  });

  it('should throw OpenRouterTimeoutError on timeout', async () => {
    const error = new Error('Timeout');
    (error as any).code = 'ECONNABORTED';
    (error as any).isAxiosError = true;

    mockedAxios.post.mockRejectedValue(error);
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    await expect(
      callOpenRouter(
        'api-key',
        'model',
        'prompt',
        1024,
        0.7,
        30000,
        3,
        'https://openrouter.ai/api/v1/chat/completions'
      )
    ).rejects.toThrow(OpenRouterTimeoutError);
  });

  it('should throw OpenRouterRateLimitError after exhausting retries on 429', async () => {
    const error = new Error('Too Many Requests');
    (error as any).response = { status: 429, data: {} };
    (error as any).isAxiosError = true;

    mockedAxios.post.mockRejectedValue(error);
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    await expect(
      callOpenRouter(
        'api-key',
        'model',
        'prompt',
        1024,
        0.7,
        1000, // Short timeout for test
        2, // Only 2 retries for test
        'https://openrouter.ai/api/v1/chat/completions'
      )
    ).rejects.toThrow(OpenRouterRateLimitError);
  });

  it('should not retry on 400 errors', async () => {
    const error = new Error('Bad Request');
    (error as any).response = { status: 400, data: { error: 'Invalid input' } };
    (error as any).isAxiosError = true;

    mockedAxios.post.mockRejectedValue(error);
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    await expect(
      callOpenRouter(
        'api-key',
        'model',
        'prompt',
        1024,
        0.7,
        30000,
        3,
        'https://openrouter.ai/api/v1/chat/completions'
      )
    ).rejects.toThrow(OpenRouterApiError);

    // Should only be called once (no retries)
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });
});
