#!/bin/bash
# Generate User Story
#
# This script generates a user story and appends it as a comment to an existing GitHub issue.
#
# Usage:
# ./shared-commands/commands/generate-user-story.sh --issue <ISSUE_NUMBER>
#
# Arguments:
#   --issue: The number of the issue to which the user story will be appended (required).
#

set -euo pipefail

# Get the directory of the currently executing script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$SCRIPT_DIR/../lib"

# Source shared libraries
# shellcheck source=../lib/common-utils.sh
source "$LIB_DIR/common-utils.sh"
# shellcheck source=../lib/github-integration.sh
source "$LIB_DIR/github-integration.sh"
# shellcheck source=../lib/markdown-utils.sh
source "$LIB_DIR/markdown-utils.sh"

# --- Main Function ---
main() {
    # Argument parsing
    local issue_number=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --issue)
                shift
                issue_number="$1"
                ;;
            *)
                log_error "Unknown argument: $1"
                exit 1
                ;;
        esac
        shift
    done

    # Validate arguments
    if [[ -z "$issue_number" ]]; then
        log_error "Usage: $0 --issue <ISSUE_NUMBER>"
        exit 1
    fi

    log_info "Generating user story for issue #$issue_number..."

    # Fetch issue details
    local issue_data
    issue_data=$(gh issue view "$issue_number" --json title,body)
    local title
    title=$(echo "$issue_data" | jq -r '.title')
    local body
    body=$(echo "$issue_data" | jq -r '.body')

    # Generate user story content
    local user_story_content
    user_story_content=$(generate_user_story_document "$issue_number" "$title" "$body")

    # Add user story as a comment
    if add_issue_comment "$issue_number" "$user_story_content"; then
        log_success "Successfully added user story to issue #$issue_number"
    else
        log_error "Failed to add user story to issue #$issue_number"
        exit 1
    fi
}

# Generate the complete user story document
generate_user_story_document() {
    local issue_number="$1"
    local title="$2"
    local body="$3"

    # Document header
    local header
    header=$(generate_header 2 "User Story: $title")

    # User story overview
    local overview
    overview=$(cat << EOF
### Story Statement

As a [user type], I want [functionality] so that [business value].

### Background

${body:-This user story was generated from GitHub issue requirements. Please customize the background section with specific context and requirements.}

### Business Value

- **Primary Goal**: [Describe the main business objective]
- **Success Metrics**: [Define how success will be measured]
- **User Impact**: [Describe impact on end users]

EOF
)

    # Acceptance criteria
    local acceptance_criteria
    acceptance_criteria=$(generate_acceptance_criteria)

    # Combine all parts
    echo -e "$header\n$overview\n$acceptance_criteria"
}

# --- Run main ---
main "$@"
