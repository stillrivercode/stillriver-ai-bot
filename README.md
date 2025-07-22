# AI Workflows

An AI-powered GitHub workflow automation tool with Information Dense Keywords integration.

## Getting Started

To use this action, create a workflow file (e.g., `.github/workflows/ai-review.yml`) in your repository with the following content:

```yaml
name: AI PR Review

on:
  pull_request:
    types: [opened, labeled]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: AI PR Review
        uses: stillrivercode/stillriver-ai-workflows@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          openrouter_api_key: ${{ secrets.OPENROUTER_API_KEY }}
          model: ${{ vars.AI_MODEL || 'google/gemini-2.5-pro' }}
          review_type: 'full'
          max_tokens: 32768
          temperature: 0.7
```

## Inputs

See `action.yml` for a full list of inputs. For details on how to use `custom_review_rules` and understanding the prompt structure, see [docs/prompt-template-structure.md](docs/prompt-template-structure.md).

### Required Parameters

- `github_token`: Your GitHub token for API access
- `openrouter_api_key`: Your OpenRouter API key for AI model access

### Comment Posting

**By default, the action automatically posts review comments to your PR.**

Set `post_comment: false` if you only want to use the review content via outputs without posting a comment. This allows for maximum flexibility in how you handle the review content.

### `github_token` Permissions

This action requires the `pull-requests: write` permission to post review comments. You can grant this permission in your workflow file:

```yaml
permissions:
  pull-requests: write
```

## How It Works

### Input Types Note

While the input descriptions in `action.yml` use semantic types like `number` or `string` for clarity, all GitHub Actions inputs are received as strings. The action handles the necessary parsing and validation internally. For example, `max_tokens` and `temperature` are parsed from strings to numbers with appropriate validation.

### AI Review Types

The action supports different review types that tailor the AI's focus:

- **`full`** (default): Comprehensive review covering bugs, improvements, security, and code style
- **`security`**: Focused on identifying security vulnerabilities
- **`performance`**: Focused on identifying performance issues

### Review Deduplication

The action automatically prevents duplicate reviews by checking for existing AI reviews on the pull request. If an AI review (containing "## 🤖 AI Review by") already exists from the `github-actions[bot]` user, the action will skip the review and set `review_status` to `skipped`.

### AI Review Format

AI reviews now include dynamic information:
- **Header**: Reflects the actual AI model used (e.g., "## 🤖 AI Review by Gemini 2.5 Pro")
- **Content**: Comprehensive analysis based on the selected review type
- **Footer**: Includes generation timestamp and model details
- **Length Protection**: Automatically truncates long reviews with clear messaging to stay within GitHub's comment limits

### Review Status

The action sets the `review_status` output to indicate the result:

- **`success`**: Review was generated and posted successfully
- **`skipped`**: Review was skipped (duplicate review exists, no changed files, or no files after filtering)
- **`failure`**: An error occurred during the review process

## Contributing


Contributions are welcome! Please see `CONTRIBUTING.md` for more information.
