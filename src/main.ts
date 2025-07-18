import * as core from '@actions/core';
import * as github from '@actions/github';
import { getChangedFiles, getReviews } from './github';
import { getReview } from './review';
import {
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterApiError,
  OpenRouterTimeoutError,
  ConfigurationError,
  InvalidCustomRulesError,
} from './errors';

function validateInputs(): void {
  const maxTokens = parseInt(core.getInput('max_tokens'), 10);
  if (isNaN(maxTokens) || maxTokens <= 0) {
    throw new RangeError('`max_tokens` must be a positive integer');
  }

  const temperature = parseFloat(core.getInput('temperature'));
  if (isNaN(temperature) || temperature < 0 || temperature > 1) {
    throw new RangeError('`temperature` must be a number between 0 and 1');
  }

  const retries = parseInt(core.getInput('retries'), 10);
  if (isNaN(retries) || retries < 0) {
    throw new RangeError('`retries` must be a non-negative integer');
  }
}

export async function run(): Promise<void> {
  try {
    core.info('Starting AI PR Review Action...');
    validateInputs();

    const github_token = core.getInput('github_token', { required: true });
    const openrouter_api_key = core.getInput('openrouter_api_key', {
      required: true,
    });

    const octokit = github.getOctokit(github_token);
    const { context } = github;

    if (!context.payload.pull_request) {
      throw new TypeError(
        'This action can only be run on pull requests. Please ensure the workflow is triggered on pull_request events'
      );
    }

    const pr = context.payload.pull_request;

    const existingReviews = await getReviews(
      octokit,
      context.repo.owner,
      context.repo.repo,
      pr.number
    );
    if (
      existingReviews.some(
        review =>
          review.user?.login === 'github-actions[bot]' &&
          review.body.includes('## 🤖 AI Review')
      )
    ) {
      core.info('An AI review already exists for this pull request. Skipping.');
      core.setOutput('review_status', 'skipped');
      return;
    }

    const changedFiles = await getChangedFiles(
      octokit,
      context.repo.owner,
      context.repo.repo,
      pr.number
    );
    core.info(`Found ${changedFiles.length} changed files.`);

    if (changedFiles.length === 0) {
      core.info('No changed files found. Skipping review.');
      core.setOutput('review_status', 'skipped');
      return;
    }

    const model = core.getInput('model');
    const maxTokens = parseInt(core.getInput('max_tokens'), 10);
    const temperature = parseFloat(core.getInput('temperature'));
    const timeout =
      parseInt(core.getInput('request_timeout_seconds'), 10) * 1000;
    const excludePatterns = core
      .getInput('exclude_patterns')
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    const retries = parseInt(core.getInput('retries'), 10);
    const reviewType = core.getInput('review_type');
    const customRulesPath = core.getInput('custom_review_rules');

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
      retries,
      customRulesPath
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
      core.setOutput('review_status', 'skipped');
    }
  } catch (error) {
    core.setOutput('review_status', 'failure');

    // Handle specific error types with tailored messages
    if (error instanceof OpenRouterAuthError) {
      core.setFailed(error.message);
    } else if (error instanceof OpenRouterRateLimitError) {
      core.setFailed(
        `OpenRouter API rate limit exceeded. Please try again later${
          error.retryAfter ? ` (retry after ${error.retryAfter}s)` : ''
        }.`
      );
    } else if (error instanceof OpenRouterTimeoutError) {
      core.setFailed(
        `OpenRouter API request timed out after ${error.timeout}ms. Consider increasing request_timeout_seconds.`
      );
    } else if (error instanceof OpenRouterApiError) {
      const details = error.statusCode ? ` (HTTP ${error.statusCode})` : '';
      core.setFailed(`OpenRouter API error: ${error.message}${details}`);
    } else if (error instanceof InvalidCustomRulesError) {
      core.setFailed(
        `Invalid custom review rules in ${error.filePath}: ${error.message}`
      );
    } else if (error instanceof ConfigurationError) {
      core.setFailed(`Configuration error: ${error.message}`);
    } else if (error instanceof TypeError) {
      core.setFailed(
        `Configuration error: ${error.message}. Please check your action inputs.`
      );
    } else if (error instanceof RangeError) {
      core.setFailed(
        `Input validation error: ${error.message}. Please check your numeric inputs.`
      );
    } else if (error instanceof Error) {
      // Check for specific error patterns
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes('github') || errorMessage.includes('api')) {
        core.setFailed(
          `GitHub API error: ${error.message}. Please check your GITHUB_TOKEN permissions.`
        );
      } else if (
        errorMessage.includes('openrouter') ||
        errorMessage.includes('unauthorized')
      ) {
        core.setFailed(
          `OpenRouter API error: ${error.message}. Please check your OPENROUTER_API_KEY.`
        );
      } else if (
        errorMessage.includes('network') ||
        errorMessage.includes('timeout')
      ) {
        core.setFailed(
          `Network error: ${error.message}. Please try again or check your connectivity.`
        );
      } else if (
        errorMessage.includes('pull request') ||
        errorMessage.includes('context')
      ) {
        core.setFailed(
          `Action context error: ${error.message}. This action must be run on pull requests.`
        );
      } else {
        core.setFailed(`Unexpected error: ${error.message}`);
      }
    } else {
      // Handle non-Error objects (strings, numbers, objects, etc.)
      const errorMessage = (error as Error)?.message || String(error);
      core.setFailed(`Unknown error occurred: ${errorMessage}`);
    }
  }
}
