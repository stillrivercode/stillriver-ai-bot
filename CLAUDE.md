# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **AI Workflow Template** (npm package `@stillrivercode/agentic-workflow-template`) - a CLI tool that creates AI-powered GitHub workflow automation projects. It generates complete project templates with GitHub Actions workflows that respond to labeled issues and create AI-assisted pull requests.

## Common Commands

```bash
# Package management
npm test                    # Run Jest tests
npm run lint               # ESLint code analysis
npm run setup              # Show usage instructions

# Information Dense Keywords (IDK) System
npm run idk                 # Access IDK command dictionary
npm run idk:update          # Update IDK package

# Script execution
./scripts/execute-ai-task.sh <issue_number>        # Process AI task from GitHub issue
./scripts/create-issue.sh                          # Create new GitHub issue
./scripts/create-pr.sh                             # Create pull request
./scripts/safe-commit.sh                           # Commit changes safely
./scripts/run-security-scan.sh                     # Run security analysis
./scripts/setup-labels.sh                          # Create GitHub repository labels

# AI Review System (Resolvable Comments)
npm run ai-review-resolvable                        # Complete AI review workflow with resolvable comments
npm run ai-review-analyze                           # Analyze code changes and generate suggestions
npm run ai-review-demo                              # Run demonstration of suggestion formatting
npm run ai-review                                   # Format AI suggestions with confidence levels
npm run ai-review-validate                          # Validate AI suggestion JSON format

# Direct script access
./scripts/ai-review-resolvable.sh analyze          # Analyze PR and post resolvable comments
./scripts/ai-review-resolvable.sh format           # Format suggestions by confidence level
./scripts/ai-review-resolvable.sh validate         # Validate suggestion structure
./scripts/ai-review-resolvable.sh demo             # Show formatting examples
```

## Information Dense Keywords (IDK) Commands

This project uses the `@stillrivercode/information-dense-keywords` package for standardized AI command vocabulary. The full command dictionary is available at `/docs/information-dense-keywords.md`.

**Core Reference**: See [docs/AI.md](docs/AI.md) for shared AI assistant instructions and usage patterns.

### Core Commands
- `create [item]` - Create new components, files, or features
- `delete [item]` - Remove components, files, or features
- `fix [issue]` - Resolve bugs, errors, or problems
- `select [criteria]` - Choose or filter items based on criteria

### Development Commands
- `analyze this [component]` - Analyze code structure, patterns, and issues
- `debug this [issue]` - Debug problems and identify root causes
- `optimize this [code]` - Improve performance and efficiency

### Documentation Commands
- `document this [code]` - Generate documentation for code
- `explain this [concept]` - Provide explanations and clarifications
- `research this [topic]` - Research technologies and best practices

### Workflow Commands
- `plan this [implementation]` - Create implementation plans
- `spec this [feature]` - Generate technical specifications
- `roadmap [project]` - Create project roadmaps

### Quality Assurance Commands
- `test this [code]` - Generate tests and test scenarios
- `review this [code]` - Perform code reviews

### Git Commands
- `commit [changes]` - Create commits with proper messages
- `pr [changes]` - Create pull requests
- `gh [action]` - GitHub operations

### Command Chaining
Commands can be chained for complex workflows:
```
analyze this authentication system then spec this improved version then plan this implementation
```

## Architecture Overview

### Core Components

1. **CLI Tool** (`cli/index.js`) - Creates new AI workflow projects from templates
2. **GitHub Actions Workflows** (`.github/workflows/`) - 11 automated workflows handling:
   - AI task processing (`ai-task.yml`)
   - Security fixes (`ai-fix-security.yml`)
   - Lint fixes (`ai-fix-lint.yml`)
   - Test fixes (`ai-fix-tests.yml`)
   - Code review automation (`ai-pr-review.yml`)
   - Emergency controls and quality checks

3. **Shell Scripts** (`scripts/`) - Orchestration layer with:
   - AI task execution with OpenRouter API integration
   - Circuit breaker patterns and retry logic
   - Cost monitoring and security scanning
   - Git operations and GitHub API interactions

4. **AI Review System** (`scripts/ai-review/`) - Resolvable comments feature with:
   - Multi-factor confidence scoring algorithm
   - GitHub suggestion format support
   - Batch processing and validation tools
   - Integration with OpenRouter AI analysis service

5. **Information Dense Keywords** (`@stillrivercode/information-dense-keywords`) - Standardized AI command vocabulary for consistent task execution

### Key Integration Points

- **OpenRouter API**: Primary AI service integration (configurable models)
- **GitHub API**: Issue management, PR creation, repository operations
- **Security Tools**: Bandit, Semgrep integration for vulnerability scanning
- **Cost Controls**: Usage monitoring and circuit breaker patterns

## Workflow Triggers

The system responds to GitHub issues with specific labels:
- `ai-task` - General AI development tasks
- `ai-bug-fix` - AI-assisted bug fixes
- `ai-refactor` - Code refactoring requests
- `ai-fix-lint`, `ai-fix-security`, `ai-fix-tests` - Automated fixes

## Dependencies

### Required Secrets
- `OPENROUTER_API_KEY` - AI service access
- `GH_PAT` - GitHub Personal Access Token (optional for advanced workflows)

### Node.js Dependencies
- `commander` - CLI argument parsing
- `inquirer` - Interactive prompts
- `chalk` - Terminal output formatting
- `fs-extra` - File system utilities

## AI Resolvable Comments System

The repository now includes an advanced AI review system that generates GitHub's native resolvable suggestions. This system transforms AI feedback into actionable, one-click applicable code changes.

### Key Features

- **Confidence-Based Suggestions**: Uses multi-factor scoring algorithm (Issue Severity 40%, Static Analysis 30%, Code Context 20%, Historical Patterns 10%)
- **Resolvable Comments**: High-confidence suggestions (≥95%) become GitHub's native resolvable suggestions
- **Enhanced Comments**: Medium-confidence suggestions (80-94%) provide detailed context
- **Rate Limiting**: Maximum 5 resolvable suggestions per PR to prevent spam
- **Configurable Inline Comments**: Enable/disable resolvable suggestions via environment variables
- **Integration**: Seamlessly integrated with existing AI PR Review workflow

### Confidence Thresholds

- **≥95%**: Resolvable suggestion (critical issues only)
- **80-94%**: Enhanced comment with suggestion context
- **65-79%**: Regular informational comment
- **<65%**: Suppressed or aggregated into summary

### Configuration

The AI resolvable comments system can be configured via environment variables:

#### Environment Variables
- `AI_ENABLE_INLINE_COMMENTS` - Enable/disable GitHub's native resolvable suggestions (default: `true`)
  - `true`: High-confidence suggestions become resolvable with one-click application
  - `false`: All suggestions use enhanced format without inline resolution

#### Repository Variables (GitHub Settings > Variables)
- `AI_ENABLE_INLINE_COMMENTS` - Repository-level control over inline comments
- `AI_REVIEW_RATE_LIMIT_MINUTES` - Rate limit for AI reviews (default: 1 minute)

#### Script Options
```bash
# Enable inline comments (default)
./scripts/ai-review-resolvable.sh analyze 123

# Disable inline comments
AI_ENABLE_INLINE_COMMENTS=false ./scripts/ai-review-resolvable.sh analyze 123

# Format script options
./scripts/ai-review/format-suggestions.sh --enable-inline true
./scripts/ai-review/format-suggestions.sh --disable-inline
```

### Workflow Integration

The AI PR Review workflow (`ai-pr-review.yml`) automatically uses the resolvable comments system:
1. Analyzes PR changes with OpenRouter API
2. Applies confidence scoring to each suggestion
3. Posts suggestions as GitHub resolvable comments based on confidence level (configurable)
4. Adds `ai-reviewed-resolvable` label to indicate completion

## Development Notes

- Uses bash scripts for GitHub Actions orchestration
- Implements retry patterns with exponential backoff
- Cost monitoring prevents runaway API usage
- Security-first approach with output sanitization
- Template-based project generation system
