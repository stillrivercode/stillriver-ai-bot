# Shared Commands Directory

This directory contains commands that can be shared between different AI assistants
(Claude, Gemini, etc.) to provide consistent functionality across the project.

## Structure

```text
shared-commands/
├── README.md                    # This file
├── commands/                    # Command implementations
│   ├── user-story-this.sh      # Create user story from GitHub issue
│   ├── spec-this.sh            # Create technical spec from GitHub issue
│   └── analyze-issue.sh        # Analyze GitHub issue for requirements
├── templates/                   # Command templates and examples
│   ├── user-story-template.md  # Template for user stories
│   ├── spec-template.md        # Template for technical specs
│   └── analysis-template.md    # Template for issue analysis
└── lib/                        # Shared utilities
    ├── github-utils.sh         # GitHub API utilities
    ├── markdown-utils.sh       # Markdown processing utilities
    └── common-utils.sh         # Common utility functions
```

## Usage

### For AI Assistants

AI assistants can reference these shared commands using:

```bash
# Execute a shared command
./shared-commands/commands/user-story-this.sh --issue 25

# Source shared utilities
source ./shared-commands/lib/github-utils.sh
```

### Available Commands

1. **create-epic** - Creates a new "Epic" issue for a feature from the roadmap.
2. **create-user-story** - Creates GitHub issue and comprehensive user story documentation in unified workflow
3. **create-spec** - Creates GitHub issue and detailed technical specifications in unified workflow
4. **analyze-issue** - Analyzes existing GitHub issues for requirements and scope

## Integration

### In CLAUDE.md

```markdown
## Shared Commands

### create-user-story --title "TITLE" [OPTIONS]
### create-spec --title "TITLE" [OPTIONS]
### analyze-issue --issue NUMBER [OPTIONS]
```

### In GEMINI.md

```markdown
## Available Commands

- `create-user-story --title "TITLE"` - Create GitHub issue and user story
- `create-spec --title "TITLE"` - Create GitHub issue and technical spec
- `analyze-issue --issue NUMBER` - Analyze existing issue requirements
```

## Benefits

- **Consistency**: Same commands work across all AI assistants
- **Maintainability**: Single source of truth for command logic
- **Extensibility**: Easy to add new shared commands
- **Reusability**: Commands can be used in multiple contexts
