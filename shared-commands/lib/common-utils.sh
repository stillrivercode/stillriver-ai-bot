#!/bin/bash

# Common utility functions for shared commands
# Source this file in other scripts: source ./shared-commands/lib/common-utils.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}INFO:${NC} $1"
}

log_success() {
    echo -e "${GREEN}SUCCESS:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

log_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

# Check if required command exists
check_command() {
    local cmd="$1"
    if ! command -v "$cmd" &> /dev/null; then
        log_error "Required command '$cmd' not found. Please install it."
        return 1
    fi
    return 0
}

# Check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository"
        return 1
    fi
    return 0
}

# Validate issue number
validate_issue_number() {
    local issue_number="$1"
    if [[ ! "$issue_number" =~ ^[0-9]+$ ]]; then
        log_error "Invalid issue number: $issue_number"
        return 1
    fi
    return 0
}

# Create directory if it doesn't exist
ensure_directory() {
    local dir="$1"
    if [[ ! -d "$dir" ]]; then
        mkdir -p "$dir"
        log_info "Created directory: $dir"
    fi
}

# Sanitize filename
sanitize_filename() {
    local filename="$1"
    # Remove/replace invalid characters
    echo "$filename" | sed -e 's/[^a-zA-Z0-9._-]/-/g' -e 's/-\+/-/g' -e 's/^-\|-$//g' | tr '[:upper:]' '[:lower:]'
}

# Get current date in YYYY-MM-DD format
get_current_date() {
    date "+%Y-%m-%d"
}

# Parse command line arguments for unified commands
parse_unified_args() {
    # Parse arguments for create commands
    while [[ $# -gt 0 ]]; do
        case $1 in
            --title)
                PARSED_TITLE="$2"
                shift 2
                ;;
            --body)
                PARSED_BODY="$2"
                shift 2
                ;;
            --labels)
                PARSED_LABELS="$2"
                shift 2
                ;;
            --assignee)
                PARSED_ASSIGNEE="$2"
                shift 2
                ;;
            --user-story-issue)
                PARSED_USER_STORY_ISSUE="$2"
                shift 2
                ;;
            --parent-issue)
                PARSED_PARENT_ISSUE="$2"
                shift 2
                ;;
            --issue)
                PARSED_ISSUE="$2"
                shift 2
                ;;
            --ai-task)
                PARSED_AI_TASK="true"
                shift
                ;;
            --dry-run)
                PARSED_DRY_RUN="true"
                shift
                ;;
            --help|-h)
                PARSED_HELP="true"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                return 1
                ;;
        esac
    done
}

# Parse command line arguments for analysis commands
parse_analysis_args() {
    # Parse arguments for analyze commands
    while [[ $# -gt 0 ]]; do
        case $1 in
            --issue)
                PARSED_ISSUE="$2"
                shift 2
                ;;
            --generate-docs)
                PARSED_GENERATE_DOCS="true"
                shift
                ;;
            --update-existing)
                PARSED_UPDATE_EXISTING="true"
                shift
                ;;
            --help|-h)
                PARSED_HELP="true"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                return 1
                ;;
        esac
    done
}

# Show help for unified create commands
show_unified_help() {
    local command_name="$1"
    local description="$2"
    local extra_options="$3"

    cat << EOF
Usage: $command_name --title "TITLE" [OPTIONS]

$description

Required Options:
  --title "TITLE"       Issue and document title

Optional Options:
  --body "BODY"         Issue description/body
  --labels "LABELS"     Comma-separated GitHub labels
  --assignee "USER"     GitHub username to assign
  --ai-task             Add ai-task label (triggers AI workflow)
  --dry-run             Preview without creating
  --help, -h            Show this help message

$extra_options

Examples:
  $command_name --title "Add user authentication"
  $command_name --title "Fix login bug" --body "Users cannot log in" --labels "bug,frontend"
  $command_name --title "New feature" --ai-task --assignee "username"

EOF
}

# Show help for analysis commands
show_analysis_help() {
    local command_name="$1"
    local description="$2"

    cat << EOF
Usage: $command_name --issue NUMBER [OPTIONS]

$description

Required Options:
  --issue NUMBER        GitHub issue number

Optional Options:
  --generate-docs       Auto-generate missing documentation
  --update-existing     Update existing documentation
  --help, -h            Show this help message

Examples:
  $command_name --issue 25
  $command_name --issue 100 --generate-docs

EOF
}
