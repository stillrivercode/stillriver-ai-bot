# Build and Tag Workflow

## Overview

The Build and Tag workflow (`build-and-tag.yml`) automates the process of building, versioning, and tagging releases for the AI workflow automation bot. This workflow ensures consistent builds and proper semantic versioning.

## Triggers

### Automatic (PR Merge to Main)
- Triggers automatically when pull requests are merged to the `main` branch
- Creates a patch version bump by default
- Suitable for regular development releases
- Only runs on successful merges, not PR closures without merge

### Manual (Workflow Dispatch)
- Can be triggered manually from GitHub Actions UI
- Allows selection of version bump type:
  - **patch**: 1.0.0 → 1.0.1 (bug fixes)
  - **minor**: 1.0.0 → 1.1.0 (new features)
  - **major**: 1.0.0 → 2.0.0 (breaking changes)
- Optional custom tag name input

## Workflow Steps

### 1. Build and Validation
```yaml
- Checkout repository with full history
- Setup Node.js 20 with npm cache
- Install dependencies with npm ci
- Run test suite
- Run ESLint validation
- Run security scanning
- Build project with ncc
- Verify build artifacts
```

### 2. Version Management
```yaml
- Determine current version from package.json
- Calculate new version based on bump type
- Update package.json and package-lock.json
- Commit version changes to main branch
```

### 3. Tagging and Release
```yaml
- Create git tag with new version
- Push tag to trigger release workflow
- Generate pre-release notes
- Upload build artifacts
- Verify tag creation
```

## Outputs

### Artifacts
- **Build artifacts**: `dist/` folder with compiled JavaScript
- **Package files**: `package.json`, `README.md`, `LICENSE`
- **Retention**: 90 days

### Git Tags
- Format: `v{major}.{minor}.{patch}` (e.g., `v1.2.3`)
- Automatically triggers the release workflow

## Usage Examples

### Manual Release via GitHub UI

1. Go to **Actions** → **Build and Tag**
2. Click **Run workflow**
3. Select options:
   - **Branch**: `main`
   - **Version bump type**: `patch|minor|major`
   - **Custom tag** (optional): `v2.1.0`
4. Click **Run workflow**

### Automatic Release via PR Merge

```bash
# Create feature branch and make changes
git checkout -b feature/new-feature
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Create and merge PR
gh pr create --title "feat: add new feature"
gh pr merge --squash

# Workflow automatically triggers on merge and creates patch release
```

### CLI Release via GitHub CLI

```bash
# Trigger patch release
gh workflow run build-and-tag.yml --field version_type=patch

# Trigger minor release
gh workflow run build-and-tag.yml --field version_type=minor

# Trigger with custom tag
gh workflow run build-and-tag.yml --field tag_name=v2.0.0-beta.1
```

## Version Bump Logic

| Change Type | Bump Type | Example |
|-------------|-----------|---------|
| Bug fixes, patches | `patch` | 1.0.0 → 1.0.1 |
| New features, backward compatible | `minor` | 1.0.0 → 1.1.0 |
| Breaking changes | `major` | 1.0.0 → 2.0.0 |

## Integration with Release Workflow

The Build and Tag workflow creates tags that automatically trigger the existing Release workflow:

1. **Build and Tag**: Creates `v1.2.3` tag
2. **Release**: Triggers on tag push, creates GitHub release
3. **Distribution**: Packages `dist.zip` for download

## Security and Permissions

### Required Permissions
- `contents: write` - Update package.json and create tags
- `actions: write` - Trigger subsequent workflows

### Security Features
- Validates build before tagging
- Runs security scans
- Verifies tag creation
- Uses GitHub's built-in token authentication

## Troubleshooting

### Common Issues

**Build Failures**
```
Solution: Check build logs, ensure tests pass locally
Commands: npm test && npm run build
```

**Version Conflicts**
```
Solution: Ensure main branch is up to date
Commands: git pull origin main before workflow
```

**Tag Already Exists**
```
Solution: Use custom tag name or different version type
Workaround: Delete existing tag if needed
```

### Debug Information

Each workflow run provides:
- Build verification logs
- Version calculation details
- Tag creation confirmation
- Artifact upload status

## Best Practices

1. **Test Locally First**
   ```bash
   npm test && npm run lint && npm run build
   ```

2. **Use Semantic Versioning**
   - Patch: Bug fixes only
   - Minor: New features, backward compatible
   - Major: Breaking changes

3. **Review Changes**
   - Ensure all tests pass
   - Review security scan results
   - Verify build artifacts

4. **Monitor Workflow**
   - Check workflow completion
   - Verify tag creation
   - Confirm release workflow triggers

## Configuration

### Environment Variables
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
- No additional secrets required

### Customization Options
- Modify version bump logic in workflow file
- Adjust artifact retention period (default: 90 days)
- Update Node.js version (default: 20)
- Customize release notes template
