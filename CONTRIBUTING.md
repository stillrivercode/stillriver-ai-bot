# Contributing to Stillriver AI Workflows

First off, thank you for considering contributing to the Stillriver AI Workflows! It's people like you that make this such a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, [make one](https://github.com/stillrivercode/stillriver-ai-workflows/issues/new/choose)! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

### Fork & create a branch

If this is something you think you can fix, then [fork the repository](https://github.com/stillrivercode/stillriver-ai-workflows/fork) and create a branch with a descriptive name.

A good branch name would be (where issue #38 is the ticket you're working on):

```sh
git checkout -b 38-add-awesome-new-feature
```

### Get the style right

Your patch should follow the same conventions & pass the same code quality checks as the rest of the project.

#### Code Style
- Use TypeScript for all new code
- Follow ESLint rules configured in the project
- Run `npm run lint` and fix any issues before submitting
- Use Prettier for code formatting
- Write tests for new functionality using Jest

#### Testing
- Run `npm test` to ensure all tests pass
- Write unit tests for new functions and modules
- Include integration tests for GitHub Actions workflows when applicable
- Test with multiple AI models when making changes to the OpenRouter integration

#### Documentation
- Update relevant documentation for any new features
- Use Information Dense Keywords (IDK) commands in examples
- Update CLAUDE.md if adding new AI capabilities
- Follow the established documentation structure

### Make a Pull Request

At this point, you should switch back to your main branch and make sure it's up to date with the main project repository:

```sh
git remote add upstream git@github.com:stillrivercode/stillriver-ai-workflows.git
git checkout main
git pull upstream main
```

Then update your feature branch from your local copy of main, and push it!

```sh
git checkout 38-add-awesome-new-feature
git rebase main
git push --set-upstream origin 38-add-awesome-new-feature
```

Finally, go to GitHub and [make a Pull Request](https://github.com/stillrivercode/stillriver-ai-workflows/compare)

### Keeping your Pull Request updated

If a maintainer asks you to "rebase" your PR, they're saying that a lot of code has changed, and that you need to update your branch so it's easier to merge.

To learn more about rebasing and merging, check out this guide from Atlassian: [Merging vs. Rebasing](https://www.atlassian.com/git/tutorials/merging-vs-rebasing)

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Git
- GitHub account

### Local Development
1. Clone your fork: `git clone https://github.com/YOUR_USERNAME/stillriver-ai-workflows.git`
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Check linting: `npm run lint`

### Environment Variables
For testing GitHub Actions locally, you may need:
- `GITHUB_TOKEN` - GitHub Personal Access Token
- `OPENROUTER_API_KEY` - OpenRouter API key for AI functionality

## Code of Conduct

### Our Pledge
We are committed to making participation in this project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards
- Be respectful and inclusive
- Focus on what is best for the community
- Show empathy towards other community members
- Accept constructive criticism gracefully

### Enforcement
Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project maintainers. All complaints will be reviewed and investigated promptly and fairly.

## Questions?

If you have questions about contributing, feel free to:
- Open an issue with the `question` label
- Start a discussion in the GitHub Discussions tab
- Review existing documentation in the `docs/` directory

Thank you for contributing to Stillriver AI Workflows! 🤖
