#!/bin/bash

# AI Review with Resolvable Comments
# Wrapper script for the complete AI review workflow with resolvable suggestions

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

# Convenience aliases for common functions
info() { log_info "$@"; }
success() { log_success "$@"; }
error() { log_error "$@"; }
warning() { log_warning "$@"; }

# Function to display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS] [COMMAND]

AI Review with Resolvable Comments - Generate AI-powered code reviews with confidence-based suggestions.

Commands:
    analyze [PR_NUMBER]       Analyze pull request and generate suggestions
    format INPUT_FILE         Format existing suggestions JSON file
    validate INPUT_FILE       Validate suggestions JSON format
    demo                      Run demo with sample suggestions
    help                      Show this help message

Options:
    -m, --model MODEL         AI model to use (default: anthropic/claude-3.5-sonnet)
    -f, --format TYPE         Output format type: individual, batch, summary (default: batch)
    -o, --output FILE         Output file for formatted suggestions
    --max-resolvable NUM      Maximum resolvable suggestions per PR (default: 5)
    --threshold-resolvable NUM    Confidence threshold for resolvable (default: 0.95)
    --threshold-enhanced NUM      Confidence threshold for enhanced (default: 0.80)
    -h, --help                Show this help message

Examples:
    $0 analyze 123                    # Analyze PR #123
    $0 format suggestions.json        # Format suggestions file
    $0 validate suggestions.json      # Validate suggestions format
    $0 demo                          # Run demonstration

Integration Examples:
    # Use with npm scripts
    npm run ai-review -- format suggestions.json
    npm run ai-review-validate suggestions.json

    # Direct shell usage
    ./scripts/ai-review-resolvable.sh analyze 123
    ./scripts/ai-review/format-suggestions.sh -i suggestions.json -t batch

EOF
}

# Default values
MODEL="anthropic/claude-3.5-sonnet"
FORMAT_TYPE="batch"
OUTPUT_FILE=""
MAX_RESOLVABLE=5
THRESHOLD_RESOLVABLE=0.95
THRESHOLD_ENHANCED=0.80
COMMAND=""

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            analyze|format|validate|demo|help)
                COMMAND="$1"
                shift
                ;;
            -m|--model)
                MODEL="$2"
                shift 2
                ;;
            -f|--format)
                FORMAT_TYPE="$2"
                shift 2
                ;;
            -o|--output)
                OUTPUT_FILE="$2"
                shift 2
                ;;
            --max-resolvable)
                MAX_RESOLVABLE="$2"
                shift 2
                ;;
            --threshold-resolvable)
                THRESHOLD_RESOLVABLE="$2"
                shift 2
                ;;
            --threshold-enhanced)
                THRESHOLD_ENHANCED="$2"
                shift 2
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            -*)
                error "Unknown option: $1"
                usage
                exit 1
                ;;
            *)
                # Store additional arguments for commands
                REMAINING_ARGS+=("$1")
                shift
                ;;
        esac
    done
}

# Execute analyze command
cmd_analyze() {
    local pr_number="${1:-}"

    if [[ -z "$pr_number" ]]; then
        error "PR number is required for analyze command"
        usage
        exit 1
    fi

    info "Analyzing PR #$pr_number with AI model: $MODEL"

    # Check if we have the required environment variables
    if [[ -z "${OPENROUTER_API_KEY:-}" ]]; then
        error "OPENROUTER_API_KEY environment variable is required"
        exit 1
    fi

    if [[ -z "${GITHUB_TOKEN:-}" ]]; then
        error "GITHUB_TOKEN environment variable is required"
        exit 1
    fi

    # Use the analysis orchestrator for real AI analysis
    info "Performing real AI analysis with confidence scoring..."

    local temp_suggestions="/tmp/ai-review-suggestions-${pr_number}.json"

    # Run the analysis orchestrator
    if "${SCRIPT_DIR}/ai-review/services/analysis-orchestrator-cli.js" \
        --pr-number "$pr_number" \
        --model "$MODEL" \
        --output "$temp_suggestions"; then

        info "✅ AI analysis completed successfully"

        # Validate the generated suggestions
        if "${SCRIPT_DIR}/ai-review/validate-suggestions.sh" "$temp_suggestions"; then
            info "✅ Suggestions validation passed"
        else
            warning "⚠️  Suggestions validation had warnings"
        fi

        # Suggestions are automatically posted to GitHub by the orchestrator
        info "✅ AI suggestions have been posted to the pull request"

        # Show statistics
        info "📊 Analysis Statistics:"
        "${SCRIPT_DIR}/ai-review/validate-suggestions.sh" --stats-only "$temp_suggestions"

    else
        error "❌ AI analysis failed"

        # Fallback to posting a failure comment
        warning "AI analysis failed - posting error comment to PR"
        
        # Post error comment to PR using gh CLI
        if command -v gh &> /dev/null && [[ -n "${GITHUB_TOKEN:-}" ]]; then
            gh pr comment "$pr_number" --body "## ⚠️ AI Review Failed

The AI review could not be completed due to an analysis error. This could be due to:
- API rate limiting or service issues
- Large diff size exceeding analysis limits
- Temporary connectivity problems

Please retry the review later by adding the \`ai-review-needed\` label or request manual review.

---
*AI Review attempt failed at $(date -u +"%Y-%m-%dT%H:%M:%SZ")*" || true
        fi
    fi

    # Clean up
    rm -f "$temp_suggestions"

    success "Analysis complete for PR #$pr_number"
}

# Execute format command
cmd_format() {
    local input_file="${1:-}"

    if [[ -z "$input_file" ]]; then
        error "Input file is required for format command"
        usage
        exit 1
    fi

    if [[ ! -f "$input_file" ]]; then
        error "Input file does not exist: $input_file"
        exit 1
    fi

    info "Formatting AI suggestions from: $input_file"

    "${SCRIPT_DIR}/ai-review/format-suggestions.sh" \
        -i "$input_file" \
        -t "$FORMAT_TYPE" \
        --max-resolvable "$MAX_RESOLVABLE" \
        --threshold-resolvable "$THRESHOLD_RESOLVABLE" \
        --threshold-enhanced "$THRESHOLD_ENHANCED" \
        ${OUTPUT_FILE:+-o "$OUTPUT_FILE"}

    success "Formatting complete"
}

# Execute validate command
cmd_validate() {
    local input_file="${1:-}"

    if [[ -z "$input_file" ]]; then
        error "Input file is required for validate command"
        usage
        exit 1
    fi

    if [[ ! -f "$input_file" ]]; then
        error "Input file does not exist: $input_file"
        exit 1
    fi

    info "Validating AI suggestions format: $input_file"

    "${SCRIPT_DIR}/ai-review/validate-suggestions.sh" "$input_file"

    success "Validation complete"
}

# Execute demo command
cmd_demo() {
    info "Running AI Review demonstration"

    if [[ ! -f "${SCRIPT_DIR}/ai-review/demo-formats.sh" ]]; then
        error "Demo script not found: ${SCRIPT_DIR}/ai-review/demo-formats.sh"
        exit 1
    fi

    "${SCRIPT_DIR}/ai-review/demo-formats.sh"

    success "Demo complete"
}

# Main function
main() {
    # Initialize array for remaining arguments
    REMAINING_ARGS=()

    # Parse arguments
    parse_arguments "$@"

    # If no command specified, show usage
    if [[ -z "$COMMAND" ]]; then
        usage
        exit 0
    fi

    # Execute the specified command
    case $COMMAND in
        analyze)
            cmd_analyze "${REMAINING_ARGS[@]}"
            ;;
        format)
            cmd_format "${REMAINING_ARGS[@]}"
            ;;
        validate)
            cmd_validate "${REMAINING_ARGS[@]}"
            ;;
        demo)
            cmd_demo
            ;;
        help)
            usage
            ;;
        *)
            error "Unknown command: $COMMAND"
            usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
