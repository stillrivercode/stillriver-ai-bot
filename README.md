# AI PR Review Action

An AI-powered GitHub Action for automated pull request reviews using OpenRouter.

## Getting Started

To use this action, create a workflow file (e.g., `.github/workflows/ai-review.yml`) in your repository with the following content:

```yaml
name: AI PR Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: AI PR Review
        uses: stillrivercode/stillriver-ai-bot@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          openrouter_api_key: ${{ secrets.OPENROUTER_API_KEY }}
```

## Inputs

See `action.yml` for a full list of inputs.

### `github_token` Permissions

This action requires the `pull-requests: write` permission to post review comments. You can grant this permission in your workflow file:

```yaml
permissions:
  pull-requests: write
```

## How It Works

### AI Review Types

The action supports different review types that tailor the AI's focus:

- **`full`** (default): Comprehensive review covering bugs, improvements, security, and code style
- **`security`**: Focused on identifying security vulnerabilities
- **`performance`**: Focused on identifying performance issues

### Review Deduplication

The action automatically prevents duplicate reviews by checking for existing AI reviews on the pull request. If an AI review (containing "## 🤖 AI Review") already exists from the `github-actions[bot]` user, the action will skip the review and set `review_status` to `skipped`.

### Review Status

The action sets the `review_status` output to indicate the result:

- **`success`**: Review was generated and posted successfully
- **`skipped`**: Review was skipped (duplicate review exists, no changed files, or no files after filtering)
- **`failure`**: An error occurred during the review process

## Contributing


Contributions are welcome! Please see `CONTRIBUTING.md` for more information.
