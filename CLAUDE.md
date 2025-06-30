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

# Installation and setup
./install.sh               # Main installation script with interactive prompts
./install.sh --dev         # Development installation
./install.sh --auto-yes --anthropic-key YOUR_KEY  # Non-interactive setup
./scripts/setup-labels.sh  # Create GitHub repository labels

# Script execution
./scripts/execute-ai-task.sh <issue_number>        # Process AI task from GitHub issue
./scripts/create-issue.sh                          # Create new GitHub issue
./scripts/create-pr.sh                             # Create pull request
./scripts/safe-commit.sh                           # Commit changes safely
./scripts/run-security-scan.sh                     # Run security analysis
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

4. **Shared Commands** (`shared-commands/`) - Reusable utilities for issue analysis, spec generation, and GitHub integration

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

## Development Notes

- Uses bash scripts for GitHub Actions orchestration
- Implements retry patterns with exponential backoff
- Cost monitoring prevents runaway API usage
- Security-first approach with output sanitization
- Template-based project generation system