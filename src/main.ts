import * as core from '@actions/core';
import * as github from '@actions/github';
import { getChangedFiles, getReviewComments } from './github';
import { getReview } from './review';

async function run(): Promise<void> {
  try {
    core.info('Starting AI PR Review Action...');

    const github_token = core.getInput('github_token', { required: true });
    const openrouter_api_key = core.getInput('openrouter_api_key', { required: true });

    const octokit = github.getOctokit(github_token);
    const { context } = github;

    if (!context.payload.pull_request) {
      throw new Error('This action can only be run on pull requests.');
    }

    const pr = context.payload.pull_request;

    const existingComments = await getReviewComments(octokit, context.repo.owner, context.repo.repo, pr.number);
    if (existingComments.some(comment => comment.includes('AI Review'))) {
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

    const review = await getReview(
      openrouter_api_key,
      changedFiles,
      model,
      maxTokens,
      temperature,
      timeout,
      excludePatterns,
      pr.title,
      pr.body || ''
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


run();
