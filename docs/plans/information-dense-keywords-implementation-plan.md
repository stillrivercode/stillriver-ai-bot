# Information Dense Keywords Implementation Plan

## Overview

This document outlines the plan to implement `@stillrivercode/information-dense-keywords` as the standardized AI command system for this new repository, replacing the need for custom shared-commands.

## Implementation Strategy

### Phase 1: Package Setup
1. **Install Package**: `npm install @stillrivercode/information-dense-keywords`
2. **Add Scripts**: Configure package.json with convenience scripts
3. **Update CLAUDE.md**: Reference IDK commands instead of shared-commands

### Phase 2: Command Integration
Replace current shared-commands references with IDK equivalents:

| Current Reference | IDK Command | Usage |
|------------------|-------------|--------|
| analyze-issue.sh | `analyze this issue` | Issue analysis and requirements gathering |
| create-epic.sh | `create epic` + `plan this implementation` | Epic creation with planning |
| create-spec.sh | `spec this [system]` | Technical specification generation |
| create-user-story.sh | `create user story` | User story creation |
| generate-spec.sh | `spec this [feature]` | Feature specification |
| generate-user-story.sh | `create user story` | User story generation |

### Phase 3: GitHub Actions Integration
Update workflows to use IDK commands:
- `.github/workflows/ai-task.yml`
- `.github/workflows/ai-pr-review.yml`
- Other AI-powered workflows

### Phase 4: Documentation Updates
- Update README.md with IDK command examples
- Modify CLAUDE.md to reference IDK instead of shared-commands
- Update workflow documentation

## Benefits

### Standardization
- Consistent command vocabulary across all AI assistants
- Standardized output formats and expectations
- Reduced ambiguity in command interpretation

### Maintainability
- External package maintenance (no custom shell scripts)
- Built-in GitHub integration
- Command chaining capabilities

### Scalability
- 20+ predefined commands across multiple categories
- Extensible architecture
- Quality assurance features

## Implementation Timeline

### Week 1: Foundation
- [ ] Install and configure IDK package
- [ ] Update package.json scripts
- [ ] Test basic command functionality

### Week 2: Integration
- [ ] Update CLAUDE.md with IDK commands
- [ ] Modify GitHub Actions workflows
- [ ] Test AI workflow integration

### Week 3: Documentation and Testing
- [ ] Update all documentation
- [ ] Test end-to-end functionality
- [ ] Validate AI assistant compatibility

## Next Steps

1. Install the package
2. Update configuration files
3. Test with AI assistants
4. Remove shared-commands directory references
