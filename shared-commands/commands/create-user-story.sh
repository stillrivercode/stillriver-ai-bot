#!/bin/bash

# Create GitHub issue and comprehensive user story document in unified workflow
# Usage: ./shared-commands/commands/create-user-story.sh --title "TITLE" [OPTIONS]

set -e

# Get script directory and source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/common-utils.sh"
source "$SCRIPT_DIR/../lib/github-utils.sh"
source "$SCRIPT_DIR/../lib/github-integration.sh"
source "$SCRIPT_DIR/../lib/markdown-utils.sh"

# Command configuration
COMMAND_NAME="create-user-story"
DESCRIPTION="Creates a GitHub issue and comprehensive user story document in a unified workflow."

# Parse command line arguments
if ! parse_unified_args "$@"; then
    exit 1
fi

# Show help if requested
if [[ "$PARSED_HELP" == "true" ]]; then
    show_unified_help "$COMMAND_NAME" "$DESCRIPTION"
    exit 0
fi

# Validate required arguments
if [[ -z "$PARSED_TITLE" ]] && [[ -z "$PARSED_ISSUE" ]]; then
    log_error "Either --title or --issue is required"
    show_unified_help "$COMMAND_NAME" "$DESCRIPTION"
    exit 1
fi

# Set up variables
title="$PARSED_TITLE"
body="${PARSED_BODY:-}"
labels="$PARSED_LABELS"
assignee="${PARSED_ASSIGNEE:-}"
parent_issue="${PARSED_PARENT_ISSUE:-}"
issue_number="${PARSED_ISSUE:-}"
ai_task="${PARSED_AI_TASK:-false}"
dry_run="${PARSED_DRY_RUN:-false}"

# If issue number is provided, fetch title and body
if [[ -n "$issue_number" ]] && [[ -z "$title" ]]; then
    log_info "Fetching details for issue #$issue_number..."
    issue_data=$(gh issue view "$issue_number" --json title,body)
    title=$(echo "$issue_data" | jq -r '.title')
    body=$(echo "$issue_data" | jq -r '.body')
fi

# Add ai-task to labels if requested
if [[ "$ai_task" == "true" ]]; then
    labels=$(add_default_labels "user-story" "$labels")
    if [[ "$labels" != *"ai-task"* ]]; then
        labels="$labels,ai-task"
    fi
else
    labels=$(add_default_labels "user-story" "$labels")
fi

# Main execution
main() {
    log_info "Creating user story: $title"
    echo

    # Validate GitHub setup
    if ! check_github_cli; then
        exit 1
    fi

    # Validate labels
    validate_github_labels "$labels"
    echo

    # Create GitHub issue
    log_info "Step 1: Creating GitHub issue..."
    local issue_number
    if ! issue_number=$(create_github_issue "$title" "$body" "$labels" "$assignee" "$dry_run" "$parent_issue"); then
        log_error "Failed to create GitHub issue"
        exit 1
    fi

    echo
    log_info "Step 2: Generating user story document..."

    # Create output directory
    ensure_directory "user-stories"

    # Generate filename using issue number
    local sanitized_title filename issue_url
    sanitized_title=$(sanitize_filename "$title")
    filename="user-stories/issue-${issue_number}-${sanitized_title}.md"

    # Get issue URL
    if [[ "$dry_run" != "true" ]]; then
        issue_url=$(get_issue_url "$issue_number")
    else
        issue_url="https://github.com/owner/repo/issues/$issue_number"
    fi

    # Generate user story document
    if [[ "$dry_run" == "true" ]]; then
        log_info "DRY RUN - Would create: $filename"
    else
        generate_user_story_document > "$filename"
    fi

    log_success "User story created: $filename"

    # Check for related specs
    local spec_file="specs/issue-${issue_number}-${sanitized_title}.md"
    echo
    if [[ -f "$spec_file" ]]; then
        log_info "Related technical specification found: $spec_file"
    else
        log_info "💡 Consider creating a technical specification with:"
        log_info "   ./shared-commands/commands/create-spec.sh --title \"$title Architecture\" --user-story-issue $issue_number"
    fi

    # Show completion summary
    echo
    log_success "✅ Unified workflow completed!"
    echo
    echo "📋 **Created:**"
    echo "   • GitHub Issue #$issue_number: $issue_url"
    echo "   • User Story: $filename"
    echo

    if [[ "$ai_task" == "true" ]]; then
        echo "🤖 **AI Workflow:**"
        echo "   • AI implementation will start automatically"
        echo "   • Monitor progress in GitHub Actions"
        echo "   • Review generated PR when ready"
        echo
    fi

    echo "📚 **Next Steps:**"
    if [[ "$ai_task" != "true" ]]; then
        echo "   • Add 'ai-task' label to trigger AI implementation"
    fi
    echo "   • Create technical specification if needed"
    echo "   • Assign issue to team members"
    echo "   • Add to project boards for tracking"
}

# Generate the complete user story document
generate_user_story_document() {
    # Document header
    generate_header 1 "User Story: $title"

    # Metadata
    generate_metadata "$issue_number" "$title" "$issue_url" "$(get_current_date)" "User Story"

    # Table of contents
    generate_toc "User Story Overview" "Acceptance Criteria" "Test Scenarios" "Technical Requirements" "Implementation Plan" "Related Documents" "Issue Reference"

    # User story overview
    generate_header 2 "User Story Overview"

    cat << EOF
### Story Statement

As a [user type], I want [functionality] so that [business value].

### Background

${body:-This user story was generated from GitHub issue requirements. Please customize the background section with specific context and requirements.}

### Business Value

- **Primary Goal**: [Describe the main business objective]
- **Success Metrics**: [Define how success will be measured]
- **User Impact**: [Describe impact on end users]

EOF

    # Acceptance criteria
    generate_acceptance_criteria

    # Test scenarios
    generate_test_scenarios

    # Technical requirements
    generate_technical_requirements

    # Implementation plan
    generate_implementation_plan

    # Related documents
    generate_header 2 "Related Documents"

    cat << EOF
### Technical Specifications

- [Technical Specification for Issue #$issue_number](../specs/issue-$issue_number-$(sanitize_filename "$title").md)

### Related User Stories

- [List related user stories]

### API Documentation

- [Link to relevant API docs]

### Design Documents

- [Link to design documents]

EOF

    # Issue reference
    generate_issue_reference_unified "$issue_number" "$title" "$body" "$issue_url" "$labels"

    # Footer
    cat << EOF
---

**Generated**: $(get_current_date)
**Tool**: $COMMAND_NAME
**Repository**: $(get_repository_name 2>/dev/null || echo "Unknown")
**Workflow**: Unified Issue & Documentation Creation
EOF
}

# Generate issue reference section for unified workflow
generate_issue_reference_unified() {
    local issue_number="$1"
    local issue_title="$2"
    local issue_body="$3"
    local issue_url="$4"
    local labels="$5"

    cat << EOF
## Issue Reference

**GitHub Issue**: [#$issue_number - $issue_title]($issue_url)

### Original Description

${issue_body:-No description provided}

### Labels

EOF

    if [[ -n "$labels" ]]; then
        # Convert comma-separated labels to list
        echo "$labels" | tr ',' '\n' | while read -r label; do
            label=$(echo "$label" | xargs)  # Trim whitespace
            if [[ -n "$label" ]]; then
                echo "- \`$label\`"
            fi
        done
    else
        echo "- None"
    fi

    echo
    echo "### Workflow Integration"
    echo
    if [[ "$labels" == *"ai-task"* ]]; then
        echo "- ✅ **AI Task**: This issue will trigger automated AI implementation"
        echo "- 📊 **Monitoring**: Track progress in GitHub Actions tab"
        echo "- 🔄 **Automation**: PR will be created automatically when implementation is complete"
    else
        echo "- 📝 **Manual**: Add 'ai-task' label to trigger AI implementation"
        echo "- 👥 **Assignment**: Assign to team members for manual implementation"
        echo "- 📋 **Tracking**: Add to project boards and milestones"
    fi

    echo
}

# Execute main function
main "$@"
