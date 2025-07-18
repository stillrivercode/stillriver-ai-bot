import axios from 'axios';
import * as core from '@actions/core';

export async function callOpenRouter(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
  timeout: number,
  retries = 3,
  openrouterUrl: string
): Promise<string | null> {
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

      return null;
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

  if (lastError) {
    if (axios.isAxiosError(lastError)) {
      let errorMessage = `Axios error calling OpenRouter: ${lastError.message}.`;
      if (lastError.response) {
        errorMessage += ` Status: ${lastError.response.status}.`;
        errorMessage += ` Data: ${JSON.stringify(lastError.response.data)}.`;
        if (lastError.response.status === 401) {
          core.setFailed(
            'OpenRouter API request failed with status 401: Unauthorized. Please check your `openrouter_api_key`.'
          );
        } else {
          core.setFailed(errorMessage);
        }
      } else {
        core.setFailed(errorMessage);
      }
    } else {
      core.setFailed(
        `An unknown error occurred while calling OpenRouter: ${lastError}`
      );
    }
  }
  return null;
}
