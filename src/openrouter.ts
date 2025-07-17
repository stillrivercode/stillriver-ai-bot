import axios from 'axios';
import * as core from '@actions/core';

export async function callOpenRouter(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
  timeout: number
): Promise<string | null> {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
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
    if (axios.isAxiosError(error)) {
      let errorMessage = `Axios error calling OpenRouter: ${error.message}.`;
      if (error.response) {
        errorMessage += ` Status: ${error.response.status}.`;
        errorMessage += ` Data: ${JSON.stringify(error.response.data)}.`;
        if (error.response.status === 401) {
          core.setFailed('OpenRouter API request failed with status 401: Unauthorized. Please check your `openrouter_api_key`.');
        } else if (error.response.status === 429) {
          core.setFailed('OpenRouter API request failed with status 429: Too Many Requests. Please check your rate limits.');
        } else {
          core.setFailed(errorMessage);
        }
      } else {
        core.setFailed(errorMessage);
      }
    } else {
      core.setFailed(`An unknown error occurred while calling OpenRouter: ${error}`);
    }
    return null;
  }
}
