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
      core.error(`Axios error calling OpenRouter: ${error.message}`);
      if (error.response) {
        core.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
    } else {
      core.error(`Unknown error calling OpenRouter: ${error}`);
    }
    return null;
  }
}
