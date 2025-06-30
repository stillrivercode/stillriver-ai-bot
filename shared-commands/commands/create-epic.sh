#!/bin/bash
# Create Epic Issue
#
# This script creates a new "Epic" issue in the GitHub repository.
#
# Usage:
# ./shared-commands/commands/create-epic.sh --title "Your Epic Title" --body "Your epic description."
#
# Arguments:
#   --title: The title of the epic issue (required).
#   --body: The body of the epic issue (required).
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

# --- Main Function ---
main() {
    # Argument parsing
    local title=""
    local body=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --title)
                shift
                title="$1"
                ;;
            --body)
                shift
                body="$1"
                ;;
            *)
                log_error "Unknown argument: $1"
                exit 1
                ;;
        esac
        shift
    done

    # Validate arguments
    if [[ -z "$title" ]] || [[ -z "$body" ]]; then
        log_error "Usage: $0 --title \"<title>\" --body \"<body>\""
        exit 1
    fi

    log_info "Creating new Epic issue..."

    # Create the issue
    local issue_url
    issue_url=$(gh issue create --title "$title" --body "$body" --label "epic,feature-request")

    if [[ -n "$issue_url" ]]; then
        log_success "Successfully created Epic issue: $issue_url"
    else
        log_error "Failed to create Epic issue."
        exit 1
    fi
}

# --- Run main ---
main "$@"
