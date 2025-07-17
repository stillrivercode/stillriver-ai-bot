import * as core from '@actions/core';
import * as github from '@actions/github';
import { getChangedFiles, getReviews } from './github';
import { getReview } from './review';

function validateInputs() {
  const maxTokens = parseInt(core.getInput('max_tokens'), 10);
  if (isNaN(maxTokens) || maxTokens <= 0) {
    throw new Error('`max_tokens` must be a positive integer.');
  }

  const temperature = parseFloat(core.getInput('temperature'));
  if (isNaN(temperature) || temperature < 0 || temperature > 1) {
    throw new Error('`temperature` must be a number between 0 and 1.');
  }

  const retries = parseInt(core.getInput('retries'), 10);
  if (isNaN(retries) || retries < 0) {
    throw new Error('`retries` must be a non-negative integer.');
  }
}

export async function run(): Promise<void> {
  try {
    core.info('Starting AI PR Review Action...');
    validateInputs();

    const github_token = core.getInput('github_token', { required: true });
    const openrouter_api_key = core.getInput('openrouter_api_key', { required: true });

    const octokit = github.getOctokit(github_token);
    const { context } = github;

    if (!context.payload.pull_request) {
      throw new Error('This action can only be run on pull requests.');
    }

    const pr = context.payload.pull_request;

    const existingReviews = await getReviews(octokit, context.repo.owner, context.repo.repo, pr.number);
    if (existingReviews.some(review => review.user?.login === 'github-actions[bot]' && review.body.includes('## 🤖 AI Review'))) {
      core.info('An AI review already exists for this pull request. Skipping.');
      return;
    }

    const changedFiles = await getChangedFiles(octokit, context.repo.owner, context.repo.repo, pr.number);
    core.info(`Found ${changedFiles.length} changed files.`);

    if (changedFiles.length === 0) {
      core.info('No changed files found. Skipping review.');
      return;
    }

    const model = core.getInput('model');
    const maxTokens = parseInt(core.getInput('max_tokens'), 10);
    const temperature = parseFloat(core.getInput('temperature'));
    const timeout = parseInt(core.getInput('request_timeout_seconds'), 10) * 1000;
    const excludePatterns = core.getInput('exclude_patterns').split(',').map(p => p.trim()).filter(p => p.length > 0);
    const retries = parseInt(core.getInput('retries'), 10);
    const reviewType = core.getInput('review_type');

    const review = await getReview(
      openrouter_api_key,
      changedFiles,
      model,
      maxTokens,
      temperature,
      timeout,
      excludePatterns,
      pr.title,
      pr.body || '',
      reviewType,
      retries
    );

    if (review) {
      await octokit.rest.pulls.createReview({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: pr.number,
        body: `## 🤖 AI Review\n\n${review}`,
        event: 'COMMENT',
      });
      core.setOutput('review_status', 'success');
    } else {
      core.setOutput('review_status', 'failure');
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}


// Only run if this file is executed directly (not imported)
if (require.main === module) {
  run();
}
