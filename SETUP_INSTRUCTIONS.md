# Setup Instructions

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

### 1. OpenRouter API Key
- Go to: `Settings` → `Secrets and variables` → `Actions`
- Click `New repository secret`
- Name: `OPENROUTER_API_KEY`
- Value: Your OpenRouter API key (starts with `sk-or-`)

### 2. GitHub Personal Access Token (Optional)
- Only needed for advanced workflows that require cross-workflow triggering
- Name: `GH_PAT`
- Scopes needed: `repo`, `workflow`, `write:packages`, `read:org`

## Repository Labels

Run this script to setup AI workflow labels:

```bash
./scripts/setup-labels.sh
```

Or manually create these labels:

- `ai-task` - AI development tasks
- `ai-bug-fix` - AI-assisted bug fixes
- `ai-refactor` - Code refactoring requests
- `ai-test` - Test generation
- `ai-docs` - Documentation updates
- `ai-fix-all` - Triggers comprehensive AI fixes
- `ai-orchestrate` - Alternative trigger for coordinated AI fixes
- `ai-fix-lint` - Automatically added when lint checks fail
- `ai-fix-security` - Automatically added when security scans fail
- `ai-fix-tests` - Automatically added when test suites fail
- `ai-review-needed` - Requests AI code review

## Next Steps

1. Push this repository to GitHub
2. Configure the secrets above
3. Setup repository labels
4. Create your first AI task issue with the `ai-task` label
5. Watch the AI workflows in action!

## Troubleshooting

If you encounter issues:

1. Check that all secrets are properly configured
2. Verify repository labels exist
3. Ensure workflows have proper permissions
4. Review the workflow logs for detailed error messages

For more help, see: https://github.com/stillrivercode/agentic-workflow-template/issues
