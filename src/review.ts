import * as core from '@actions/core';
import { callOpenRouter } from './openrouter';
import { Minimatch } from 'minimatch';

export async function getReview(
  openrouterApiKey: string,
  changedFiles: { filename: string; patch: string }[],
  model: string,
  maxTokens: number,
  temperature: number,
  timeout: number,
  excludePatterns: string[],
  prTitle: string,
  prBody: string
): Promise<string | null> {
  const filteredFiles = changedFiles.filter(
    (file) => !excludePatterns.some((pattern) => new Minimatch(pattern).match(file.filename))
  );

  if (filteredFiles.length === 0) {
    core.info('No files to review after applying exclusion patterns.');
    return null;
  }

  const diffs = filteredFiles.map(file => `File: ${file.filename}\n\`\`\`diff\n${file.patch}\n\`\`\``).join('\n\n');

  const prompt = `
    Please review the following pull request.

    **PR Title:** ${prTitle}
    **PR Description:**
    ${prBody}

    **Changed Files:**
    ${diffs}

    **Review Guidelines:**
    - Point out potential bugs.
    - Suggest improvements to the code.
    - Identify any security vulnerabilities.
    - Comment on code style and best practices.
  `;

  return callOpenRouter(openrouterApiKey, model, prompt, maxTokens, temperature, timeout);
}
