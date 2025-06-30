# AI Workflow Template

A CLI tool to create AI-powered GitHub workflow automation projects. Get AI-assisted development up and running in your
GitHub repository in minutes.

## 🚀 Quick Start

### Install via npm

```bash
# Install globally
npm install -g @stillrivercode/stillriver-ai-bot

# Create a new project
stillriver-ai-bot my-ai-project
cd my-ai-project

# Run the local install script
./install.sh
```

### Or use npx (no installation required)

```bash
# Create project directly
npx @stillrivercode/stillriver-ai-bot my-ai-project
cd my-ai-project

# Run the local install script
./install.sh
```

## 🎯 What You Get

✅ **GitHub Actions workflows** for AI task automation
✅ **Issue templates** for requesting AI assistance
✅ **Pre-configured labels** and automation
✅ **Cost monitoring** and usage optimization
✅ **Security scanning** and quality gates
✅ **Complete documentation** for your team

## 🛠️ Setup Process

After running the init command, you'll have a complete project with:

1. **AI-powered GitHub workflows** that respond to labeled issues
2. **Issue templates** for different types of AI tasks
3. **Automated quality checks** (linting, security, tests)
4. **Cost controls** and monitoring
5. **Documentation** tailored to your project

### Required Secrets

Add this to your GitHub repository settings:

```bash
# Required: OpenRouter API key for AI functionality
gh secret set OPENROUTER_API_KEY
```

**Get your OpenRouter API key**: [openrouter.ai](https://openrouter.ai)

## 📋 How It Works

1. **Create Issue**: Add `ai-task` label to any GitHub issue
2. **AI Processing**: GitHub Action automatically implements the solution
3. **Pull Request**: AI creates PR with code, tests, and documentation
4. **Review & Merge**: Your team reviews and merges AI-generated code

### Example Workflow

```bash
# 1. Create an issue requesting a feature
gh issue create --title "Add user authentication" --label "ai-task"

# 2. AI automatically:
#    - Creates feature branch
#    - Implements the code
#    - Adds tests
#    - Creates pull request

# 3. Review and merge the PR
gh pr review --approve
gh pr merge
```

## 🏷️ Available Labels

The setup creates these labels for different AI workflows:

- `ai-task` - General AI development tasks
- `ai-bug-fix` - AI-assisted bug fixes
- `ai-refactor` - Code refactoring requests
- `ai-test` - Test generation
- `ai-docs` - Documentation updates
- `ai-fix-lint` - Automatic lint fixes
- `ai-fix-security` - Security issue fixes
- `ai-fix-tests` - Test failure fixes

## 📚 Documentation

After setup, your project includes:

- **Getting Started Guide** - Team onboarding
- **AI Workflow Guide** - How to use AI assistance
- **Security Guidelines** - Safe AI development practices
- **Troubleshooting** - Common issues and solutions

## 🔒 Security Features

- **Automated security scanning** with Bandit and Semgrep
- **Dependency vulnerability checks**
- **Secret detection** and prevention
- **AI-powered security fixes** for detected issues
- **Cost controls** to prevent runaway API usage

## ⚡ CLI Commands

```bash
# Create new project
stillriver-ai-bot <project-name>

# Get help
stillriver-ai-bot --help

# Check version
stillriver-ai-bot --version
```

### CLI Options

```bash
# Basic setup
stillriver-ai-bot my-project

# Force overwrite existing directory
stillriver-ai-bot my-project --force

# Use specific template
stillriver-ai-bot my-project --template enterprise

# Initialize git repository
stillriver-ai-bot my-project --git-init
```

### Install Script Options

```bash
# Non-interactive installation
./install.sh --auto-yes --anthropic-key YOUR_KEY

# Development installation
./install.sh --dev

# Skip specific components
./install.sh --skip-labels --skip-claude
```

## 🆘 Support & Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| API key not working | Verify key at [openrouter.ai](https://openrouter.ai) |
| Workflows not triggering | Check repository secrets are set |
| AI tasks failing | Review workflow logs in GitHub Actions |
| Permission errors | Check GitHub Actions permissions |

### Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/stillrivercode/stillriver-ai-bot/issues)
- **Documentation**: Check the generated docs in your project
- **Examples**: See working examples in the template repository

## 🔄 Updates

Keep your AI workflows up to date:

```bash
# Check for updates
npm update @stillrivercode/stillriver-ai-bot

# Update your project workflows (manual sync with template)
git fetch template
git log --oneline template/main ^HEAD
```

## 📄 License

MIT License - free for personal and commercial use.

---

**Ready to supercharge your development with AI?**

```bash
npx @stillrivercode/stillriver-ai-bot my-ai-project
```
