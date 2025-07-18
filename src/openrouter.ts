import axios from 'axios';
import * as core from '@actions/core';
import {
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterApiError,
  OpenRouterTimeoutError,
} from './errors';

export async function callOpenRouter(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
  timeout: number,
  retries = 3,
  openrouterUrl: string
): Promise<string> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(
        openrouterUrl,
        {
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout,
        }
      );

      if (response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      }

      throw new OpenRouterApiError(
        'OpenRouter API returned no choices in response',
        response.status,
        response.data
      );
    } catch (error) {
      lastError = error as Error;
      if (axios.isAxiosError(error) && error.response) {
        const { status } = error.response;
        if (status === 429 || status >= 500) {
          const delay = Math.pow(2, i) * 1000; // Exponential backoff
          core.warning(
            `OpenRouter API request failed with status ${status}. Retrying in ${delay}ms...`
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Don't retry for other client-side errors (e.g., 400, 401)
          break;
        }
      } else {
        // Don't retry for non-axios errors
        break;
      }
    }
  }

  // If we get here, we've exhausted all retries
  if (lastError) {
    if (axios.isAxiosError(lastError)) {
      if (lastError.code === 'ECONNABORTED' || lastError.code === 'ETIMEDOUT') {
        throw new OpenRouterTimeoutError(timeout);
      }

      if (lastError.response) {
        const { status, data } = lastError.response;

        if (status === 401) {
          throw new OpenRouterAuthError(
            'OpenRouter API request failed with status 401: Unauthorized. Please check your openrouter_api_key.'
          );
        }

        if (status === 429) {
          throw new OpenRouterRateLimitError();
        }

        throw new OpenRouterApiError(
          `OpenRouter API request failed: ${lastError.message}`,
          status,
          data
        );
      }

      // Network error or other axios error without response
      throw new OpenRouterApiError(
        `Network error calling OpenRouter: ${lastError.message}`
      );
    }

    // Re-throw non-axios errors as-is
    throw lastError;
  }

  // This should never happen, but TypeScript needs it
  throw new OpenRouterApiError('OpenRouter request failed after all retries');
}
