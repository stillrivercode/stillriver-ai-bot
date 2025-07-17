import * as core from '@actions/core';
import { callOpenRouter } from './openrouter';

export async function getReview(
  openrouterApiKey: string,
  changedFiles: string[]
): Promise<string | null> {
  const model = core.getInput('model');
  const maxTokens = parseInt(core.getInput('max_tokens'), 10);
  const temperature = parseFloat(core.getInput('temperature'));
  const timeout = parseInt(core.getInput('request_timeout_seconds'), 10) * 1000;

  const prompt = `
    Please review the following code changes.
    Changed files:
    ${changedFiles.join('\n')}
  `;

  return callOpenRouter(openrouterApiKey, model, prompt, maxTokens, temperature, timeout);
}
