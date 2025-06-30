#!/bin/bash
# Generate Technical Specification
#
# This script generates a technical specification and appends it as a comment to an existing GitHub issue.
#
# Usage:
# ./shared-commands/commands/generate-spec.sh --issue <ISSUE_NUMBER>
#
# Arguments:
#   --issue: The number of the issue to which the spec will be appended (required).
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

    log_info "Generating technical specification for issue #$issue_number..."

    # Fetch issue details
    local issue_data
    issue_data=$(gh issue view "$issue_number" --json title,body,comments)
    local title
    title=$(echo "$issue_data" | jq -r '.title')
    local body
    body=$(echo "$issue_data" | jq -r '.body')
    local comments
    comments=$(echo "$issue_data" | jq -r '.comments[].body')

    # Generate spec content
    local spec_content
    spec_content=$(generate_spec_document "$issue_number" "$title" "$body" "$comments")

    # Add spec as a comment
    if add_issue_comment "$issue_number" "$spec_content"; then
        log_success "Successfully added technical specification to issue #$issue_number"
    else
        log_error "Failed to add technical specification to issue #$issue_number"
        exit 1
    fi
}

# Generate the complete technical specification document
generate_spec_document() {
    local issue_number="$1"
    local title="$2"
    local body="$3"
    local comments="$4"

    # Document header
    local header
    header=$(generate_header 2 "Technical Specification: $title")

    # Overview
    local overview
    overview=$(cat << EOF
### Problem Statement

${body:-This technical specification was generated from GitHub issue requirements. Please customize the problem statement with specific technical challenges and requirements.}

### Solution Summary

[Provide a high-level summary of the proposed technical solution]

### User Story

${comments:-No user story found in comments. Please add a user story to the issue.}
EOF
)

    # Detailed Design
    local detailed_design
    detailed_design=$(generate_detailed_design)

    # Combine all parts
    echo -e "$header\n$overview\n$detailed_design"
}

# Generate detailed design section
generate_detailed_design() {
    cat << 'EOF'
### Core Components

#### Component 1: [Name]

**Purpose**: [Component purpose]

**Responsibilities**:
- [Responsibility 1]
- [Responsibility 2]

**Interfaces**:
- [Interface 1]
- [Interface 2]

#### Component 2: [Name]

**Purpose**: [Component purpose]

**Responsibilities**:
- [Responsibility 1]
- [Responsibility 2]

### Algorithms and Logic

#### Algorithm 1: [Name]

```
function algorithmName(input) {
    // Algorithm description
    return result
}
```

### Error Handling

- **Error Type 1**: [Handling strategy]
- **Error Type 2**: [Handling strategy]
EOF
}

# --- Run main ---
main "$@"
