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
  prBody: string,
  reviewType: string,
  retries: number
): Promise<string | null> {
  const filteredFiles = changedFiles.filter(
    (file) => !excludePatterns.some((pattern) => new Minimatch(pattern).match(file.filename))
  );

  if (filteredFiles.length === 0) {
    core.info('No files to review after applying exclusion patterns.');
    return null;
  }

  const diffs = filteredFiles.map(file => `File: ${file.filename}
\`\`\`diff
${file.patch}
\`\`\``).join('\n\n');

  let prompt = `
    Please review the following pull request.

    **PR Title:** ${prTitle}
    **PR Description:**
    ${prBody}

    **Changed Files:**
    ${diffs}

    **Review Guidelines:**
  `;

  switch (reviewType) {
    case 'security':
      prompt += '\n- Focus on identifying any security vulnerabilities.';
      break;
    case 'performance':
      prompt += '\n- Focus on identifying any performance issues.';
      break;
    default:
      prompt += `
        - Point out potential bugs.
        - Suggest improvements to the code.
        - Identify any security vulnerabilities.
        - Comment on code style and best practices.
      `;
  }

  const openrouterUrl = core.getInput('openrouter_url');
  return callOpenRouter(openrouterApiKey, model, prompt, maxTokens, temperature, timeout, retries, openrouterUrl);
}
