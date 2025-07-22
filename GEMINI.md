# Gemini Project Overview: stillriver-ai-workflows

This document provides a comprehensive overview of the `stillriver-ai-workflows` project, an AI-powered GitHub workflow automation system.

## Core Purpose

The `stillriver-ai-workflows` is a CLI tool that sets up a complete AI-assisted development environment within a GitHub repository. It provides a suite of GitHub Actions workflows, issue templates, and scripts to automate various software development tasks using AI, primarily leveraging large language models like Claude and those available through OpenRouter.

The system is designed to respond to GitHub issues with specific labels (e.g., `ai-task`, `ai-bug-fix`), automatically generate code, create pull requests, and even fix linting, security, and test failures.

## Key Features

*   **AI Task Automation:** Workflows that trigger on labeled GitHub issues to perform development tasks.
*   **Automated Code Generation:** AI agents implement features, fix bugs, and write tests based on issue descriptions.
*   **Automated Pull Requests:** Automatically creates PRs with the AI-generated changes.
*   **Quality Gates:** Integrates linting, security scanning (Bandit, Semgrep), and automated testing.
*   **Cost Management:** Includes tools for monitoring and controlling AI API usage costs.
*   **Extensible:** The system is built with scripts and templates that can be customized.
*   **Security-Focused:** Includes automated security scanning and best practices for secure AI development.

## How it Works

1.  A user creates a GitHub issue with a specific label, like `ai-task`.
2.  A GitHub Action workflow (`.github/workflows/ai-task.yml`) is triggered by the label.
3.  The workflow executes a script (e.g., `scripts/execute-ai-task.sh`) that uses an AI model (via OpenRouter) to understand the issue and generate code.
4.  The AI-generated code is committed to a new branch.
5.  A pull request is automatically created for human review.
6.  The system includes self-healing capabilities, where failures in linting, security, or tests can trigger other AI-powered workflows to attempt fixes.

## Project Structure

*   `.github/workflows/`: Contains the core GitHub Actions workflows that orchestrate the AI tasks.
*   `scripts/`: A collection of shell scripts and Python scripts that form the backbone of the AI automation. This includes scripts for interacting with AI models, managing git branches, creating PRs, and running security scans.
*   `docs/`: Detailed documentation covering architecture, workflows, security, and usage.
*   `docs/dictionary/`: Information Dense Keywords command dictionary for standardized AI interactions.
*   `package.json`: Defines the project as an NPM package, allowing it to be distributed and used as a CLI tool to bootstrap new projects.

## Setup and Configuration

To use this system, a user needs to:

1.  Install the CLI tool (`npm install -g @stillrivercode/stillriver-ai-workflows`).
2.  Run the setup command (`stillriver-ai-workflows my-ai-project`).
3.  Configure GitHub repository secrets, primarily `OPENROUTER_API_KEY`.
4.  Set up repository labels using the provided script (`./scripts/setup-labels.sh`).

## Primary Technologies

*   **Orchestration:** GitHub Actions
*   **AI Models:** OpenRouter (provides access to various models like Claude, GPT, etc.)
*   **Scripting:** Bash, Python
*   **Package Management:** NPM
*   **Distribution:** The project is packaged as a CLI tool via NPM.
*   **Security:** Bandit, Semgrep
*   **Framework:** The project itself is a template generator, but it is built with Node.js (for the CLI) and shell/python scripts for the automation logic.

## Information Dense Keywords (IDK) System

This project uses the `@stillrivercode/information-dense-keywords` package for standardized AI command vocabulary. The full command dictionary is available at `/docs/information-dense-keywords.md`.

**Core Reference**: See [docs/AI.md](docs/AI.md) for shared AI assistant instructions and usage patterns.

## Usage Examples

### Common IDK Commands
- `create user authentication system` - Generate authentication components
- `fix this security vulnerability` - Resolve security issues
- `test this API endpoint` - Generate comprehensive tests
- `document this codebase` - Create documentation
- `roadmap this project` - Create development roadmap (see: `docs/roadmaps/roadmap-ai-pr-review-action.md`)
