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
./scripts/setup-labels.sh  # Create GitHub repository labels
```

## Information Dense Keywords (IDK) Commands

This project uses the `@stillrivercode/information-dense-keywords` package for standardized AI command vocabulary. The full command dictionary is available at `/docs/information-dense-keywords.md`.

**Core Reference**: See [docs/AI.md](docs/AI.md) for shared AI assistant instructions and usage patterns.

### Dictionary Commands by Category

#### Core Commands
- `create [item]` - Create new components, files, or features → [docs/dictionary/core/create.md](docs/dictionary/core/create.md)
- `delete [item]` - Remove components, files, or features → [docs/dictionary/core/delete.md](docs/dictionary/core/delete.md)
- `fix [issue]` - Resolve bugs, errors, or problems → [docs/dictionary/core/fix.md](docs/dictionary/core/fix.md)
- `select [criteria]` - Choose or filter items based on criteria → [docs/dictionary/core/select.md](docs/dictionary/core/select.md)

#### Development Commands
- `analyze this [component]` - Analyze code structure, patterns, and issues → [docs/dictionary/development/analyze-this.md](docs/dictionary/development/analyze-this.md)
- `debug this [issue]` - Debug problems and identify root causes → [docs/dictionary/development/debug-this.md](docs/dictionary/development/debug-this.md)
- `optimize this [code]` - Improve performance and efficiency → [docs/dictionary/development/optimize-this.md](docs/dictionary/development/optimize-this.md)

#### Documentation Commands
- `document this [code]` - Generate documentation for code → [docs/dictionary/documentation/document-this.md](docs/dictionary/documentation/document-this.md)
- `explain this [concept]` - Provide explanations and clarifications → [docs/dictionary/documentation/explain-this.md](docs/dictionary/documentation/explain-this.md)
- `research this [topic]` - Research technologies and best practices → [docs/dictionary/documentation/research-this.md](docs/dictionary/documentation/research-this.md)

#### Workflow Commands
- `plan this [implementation]` - Create implementation plans → [docs/dictionary/workflow/plan-this.md](docs/dictionary/workflow/plan-this.md)
- `spec this [feature]` - Generate technical specifications → [docs/dictionary/workflow/spec-this.md](docs/dictionary/workflow/spec-this.md)
- `roadmap [project]` - Create project roadmaps → [docs/dictionary/workflow/roadmap.md](docs/dictionary/workflow/roadmap.md)

#### Quality Assurance Commands
- `test this [code]` - Generate tests and test scenarios → [docs/dictionary/quality-assurance/test-this.md](docs/dictionary/quality-assurance/test-this.md)
- `review this [code]` - Perform code reviews → [docs/dictionary/quality-assurance/review-this.md](docs/dictionary/quality-assurance/review-this.md)

#### Git Commands
- `commit [changes]` - Create commits with proper messages → [docs/dictionary/git/commit.md](docs/dictionary/git/commit.md)
- `pr [changes]` - Create pull requests → [docs/dictionary/git/pr.md](docs/dictionary/git/pr.md)
- `gh [action]` - GitHub operations → [docs/dictionary/git/gh.md](docs/dictionary/git/gh.md)
- `comment [message]` - Add comments to issues/PRs → [docs/dictionary/git/comment.md](docs/dictionary/git/comment.md)
- `push [changes]` - Push changes to remote repository → [docs/dictionary/git/push.md](docs/dictionary/git/push.md)

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

4. **Information Dense Keywords** (`@stillrivercode/information-dense-keywords`) - Standardized AI command vocabulary for consistent task execution

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
