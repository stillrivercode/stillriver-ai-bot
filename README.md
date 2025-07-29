# AI PR Review with Resolvable Comments

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-AI%20PR%20Review-blue.svg?colorA=24292e&colorB=0366d6&style=flat&longCache=true&logo=github)](https://github.com/marketplace/actions/ai-pr-review-with-resolvable-comments)
[![GitHub release](https://img.shields.io/github/release/stillrivercode/stillriver-ai-workflows.svg)](https://GitHub.com/stillrivercode/stillriver-ai-workflows/releases/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🤖 **AI-powered code review with GitHub's native resolvable suggestions**. Provides intelligent, confidence-based feedback with one-click code fixes directly in your pull requests.

## ✨ Key Features

- **🎯 GitHub Native Resolvable Suggestions**: High-confidence AI recommendations (≥95%) become one-click applicable code changes
- **📊 Confidence-Based Intelligence**: Multi-factor scoring algorithm evaluates suggestions based on issue severity, static analysis, code context, and historical patterns
- **⚡ Smart Rate Limiting**: Maximum 5 resolvable suggestions per PR to prevent cognitive overload
- **🎚️ Graduated Response System**: Different presentation formats based on confidence levels (95%+ resolvable, 80-94% enhanced, 65-79% informational)
- **🔧 Configurable Integration**: Enable/disable inline comments and customize AI models and parameters
- **🛡️ Comprehensive Analysis**: Security, performance, quality, and architectural review capabilities

## 🚀 Quick Start

### Step 1: Add Secrets
Add your OpenRouter API key to your repository secrets:
- Go to your repository → Settings → Secrets and variables → Actions
- Add `OPENROUTER_API_KEY` with your [OpenRouter API key](https://openrouter.ai/)

### Step 2: Create Workflow
Create `.github/workflows/ai-review.yml` in your repository:

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

      - name: AI PR Review with Resolvable Comments
        uses: stillrivercode/stillriver-ai-workflows@v1.0.12
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          openrouter_api_key: ${{ secrets.OPENROUTER_API_KEY }}
          model: 'google/gemini-2.5-pro'  # or any OpenRouter model
          review_type: 'full'
          post_comment: true  # Enable resolvable comments
```

### Step 3: Open a Pull Request
The action will automatically:
- ✅ Analyze your code changes with AI
- ✅ Post intelligent, confidence-based feedback
- ✅ Create resolvable suggestions for high-confidence recommendations
- ✅ Provide one-click code fixes directly in GitHub

## AI Resolvable Comments

This action features an advanced AI review system that generates **GitHub's native resolvable suggestions**, transforming AI feedback into actionable, one-click applicable code changes.

### Key Features

- **🎯 Confidence-Based Suggestions**: Multi-factor scoring algorithm evaluates Issue Severity (40%), Static Analysis (30%), Code Context (20%), and Historical Patterns (10%)
- **✨ Native GitHub Integration**: High-confidence suggestions (≥95%) become GitHub's resolvable suggestions with one-click application
- **📊 Intelligent Rate Limiting**: Maximum 5 resolvable suggestions per PR to prevent cognitive overload
- **🎚️ Graduated Response**: Different presentation formats based on confidence levels
- **⚙️ Configurable Inline Comments**: Enable/disable GitHub's native resolvable suggestions via environment variables

### Confidence Thresholds

| Confidence | Type | Description |
|------------|------|-------------|
| **≥95%** | 🔒 Resolvable | Critical issues that become GitHub's native resolvable suggestions |
| **80-94%** | ⚡ Enhanced | High-confidence recommendations with detailed context |
| **65-79%** | 💡 Regular | Medium-confidence informational comments |
| **<65%** | ℹ️ Suppressed | Low-confidence suggestions aggregated into summary |

### Configuration

The AI resolvable comments system can be configured via environment variables and repository settings:

#### Environment Variables

- `AI_ENABLE_INLINE_COMMENTS` - Enable/disable GitHub's native resolvable suggestions (default: `true`)
  - `true`: High-confidence suggestions become resolvable with one-click application
  - `false`: All suggestions use enhanced format without inline resolution
- `AI_REVIEW_RATE_LIMIT_MINUTES` - Rate limit between AI reviews (default: `1` minute)
- `AI_MODEL` - AI model to use for analysis (default: `google/gemini-2.5-pro`)

#### Repository Variables

Set these in your repository's **Settings → Secrets and variables → Actions → Variables**:

- `AI_ENABLE_INLINE_COMMENTS` - Repository-level control over inline comments
- `AI_REVIEW_RATE_LIMIT_MINUTES` - Repository-level rate limiting configuration
- `AI_MODEL` - Repository-level AI model selection

#### Usage Examples

```bash
# Default behavior (inline comments enabled)
npm run ai-review-resolvable

# Disable inline comments
AI_ENABLE_INLINE_COMMENTS=false npm run ai-review-resolvable

# Use different model with inline comments disabled
AI_ENABLE_INLINE_COMMENTS=false AI_MODEL=anthropic/claude-3.5-sonnet npm run ai-review-analyze

# Direct script access
./scripts/ai-review-resolvable.sh analyze 123
AI_ENABLE_INLINE_COMMENTS=false ./scripts/ai-review-resolvable.sh analyze 123
```

### Available Commands

```bash
# Complete AI review workflow with resolvable comments
npm run ai-review-resolvable

# Analyze code changes and generate suggestions
npm run ai-review-analyze

# Demonstration of suggestion formatting
npm run ai-review-demo

# Direct script access for PR analysis
./scripts/ai-review-resolvable.sh analyze --pr-number=123
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

AI reviews with resolvable comments feature:
- **Resolvable Suggestions**: High-confidence suggestions (≥95%) appear as GitHub's native resolvable suggestions with one-click application (configurable)
- **Enhanced Comments**: Medium-high confidence suggestions (80-94%) provide detailed context and rationale
- **Graduated Response**: Different presentation formats based on confidence levels
- **Rate Limiting**: Maximum 5 resolvable suggestions per PR to prevent cognitive overload
- **Summary Reports**: Comprehensive analysis with categorized suggestions and confidence metrics
- **Flexible Configuration**: Inline comments can be disabled, converting resolvable suggestions to enhanced format

### Review Status

The action sets the `review_status` output to indicate the result:

- **`success`**: Review was generated and posted successfully
- **`skipped`**: Review was skipped (duplicate review exists, no changed files, or no files after filtering)
- **`failure`**: An error occurred during the review process

## Contributing


Contributions are welcome! Please see `CONTRIBUTING.md` for more information.
