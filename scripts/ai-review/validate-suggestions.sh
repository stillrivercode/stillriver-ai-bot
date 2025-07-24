#!/bin/bash

# Validate AI review suggestions JSON format
# This script validates the structure and content of suggestion files

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

# Convenience aliases for common functions
info() { log_info "$@"; }
success() { log_success "$@"; }
error() { log_error "$@"; }
warning() { log_warning "$@"; }

# Function to display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS] INPUT_FILE

Validate AI review suggestions JSON format.

Options:
    -h, --help                    Display this help message
    --strict                      Strict validation mode (fail on warnings)

Required fields:
    - confidence (number 0-1)
    - category (string)
    - description (string)
    - file_path (string)

Optional fields:
    - suggested_code (string)
    - line_start (number)
    - line_end (number)

Example:
    $0 suggestions.json
    $0 --strict suggestions.json
EOF
}

# Parse command line arguments
STRICT_MODE=false
STATS_ONLY=false
INPUT_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --strict)
            STRICT_MODE=true
            shift
            ;;
        --stats-only)
            STATS_ONLY=true
            shift
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
            if [[ -z "$INPUT_FILE" ]]; then
                INPUT_FILE="$1"
            else
                error "Multiple input files not supported"
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate required arguments
if [[ -z "$INPUT_FILE" ]]; then
    error "Input file is required"
    usage
    exit 1
fi

if [[ ! -f "$INPUT_FILE" ]]; then
    error "Input file does not exist: $INPUT_FILE"
    exit 1
fi

# Validation functions
validate_json_structure() {
    local file="$1"

    info "Validating JSON structure..."

    if ! jq '.' "$file" >/dev/null 2>&1; then
        error "Invalid JSON format"
        return 1
    fi

    if ! jq -e 'type == "array"' "$file" >/dev/null 2>&1; then
        error "JSON must be an array of suggestions"
        return 1
    fi

    success "JSON structure is valid"
    return 0
}

validate_required_fields() {
    local file="$1"
    local errors=0

    info "Validating required fields..."

    # Check each suggestion has required fields
    local count=$(jq length "$file")
    for ((i=0; i<count; i++)); do
        local suggestion=$(jq ".[$i]" "$file")

        # Check confidence field
        if ! echo "$suggestion" | jq -e '.confidence' >/dev/null 2>&1; then
            error "Suggestion $i: missing 'confidence' field"
            ((errors++))
        elif ! echo "$suggestion" | jq -e '.confidence | type == "number"' >/dev/null 2>&1; then
            error "Suggestion $i: 'confidence' must be a number"
            ((errors++))
        else
            local confidence=$(echo "$suggestion" | jq -r '.confidence')
            if (( $(echo "$confidence < 0 || $confidence > 1" | bc -l) )); then
                error "Suggestion $i: 'confidence' must be between 0 and 1, got: $confidence"
                ((errors++))
            fi
        fi

        # Check category field
        if ! echo "$suggestion" | jq -e '.category' >/dev/null 2>&1; then
            error "Suggestion $i: missing 'category' field"
            ((errors++))
        elif ! echo "$suggestion" | jq -e '.category | type == "string"' >/dev/null 2>&1; then
            error "Suggestion $i: 'category' must be a string"
            ((errors++))
        fi

        # Check description field
        if ! echo "$suggestion" | jq -e '.description' >/dev/null 2>&1; then
            error "Suggestion $i: missing 'description' field"
            ((errors++))
        elif ! echo "$suggestion" | jq -e '.description | type == "string"' >/dev/null 2>&1; then
            error "Suggestion $i: 'description' must be a string"
            ((errors++))
        elif [[ $(echo "$suggestion" | jq -r '.description | length') -eq 0 ]]; then
            error "Suggestion $i: 'description' cannot be empty"
            ((errors++))
        fi

        # Check file_path field
        if ! echo "$suggestion" | jq -e '.file_path' >/dev/null 2>&1; then
            error "Suggestion $i: missing 'file_path' field"
            ((errors++))
        elif ! echo "$suggestion" | jq -e '.file_path | type == "string"' >/dev/null 2>&1; then
            error "Suggestion $i: 'file_path' must be a string"
            ((errors++))
        fi
    done

    if [[ $errors -eq 0 ]]; then
        success "All required fields are valid"
        return 0
    else
        error "Found $errors validation errors"
        return 1
    fi
}

validate_optional_fields() {
    local file="$1"
    local warnings=0

    info "Validating optional fields..."

    local count=$(jq length "$file")
    for ((i=0; i<count; i++)); do
        local suggestion=$(jq ".[$i]" "$file")

        # Check line_start if present
        if echo "$suggestion" | jq -e '.line_start' >/dev/null 2>&1; then
            if ! echo "$suggestion" | jq -e '.line_start | type == "number"' >/dev/null 2>&1; then
                warning "Suggestion $i: 'line_start' should be a number"
                ((warnings++))
            fi
        fi

        # Check line_end if present
        if echo "$suggestion" | jq -e '.line_end' >/dev/null 2>&1; then
            if ! echo "$suggestion" | jq -e '.line_end | type == "number"' >/dev/null 2>&1; then
                warning "Suggestion $i: 'line_end' should be a number"
                ((warnings++))
            fi
        fi

        # Check suggested_code if present
        if echo "$suggestion" | jq -e '.suggested_code' >/dev/null 2>&1; then
            if ! echo "$suggestion" | jq -e '.suggested_code | type == "string"' >/dev/null 2>&1; then
                warning "Suggestion $i: 'suggested_code' should be a string"
                ((warnings++))
            fi
        fi
    done

    if [[ $warnings -eq 0 ]]; then
        success "All optional fields are valid"
        return 0
    else
        warning "Found $warnings optional field warnings"
        if [[ "$STRICT_MODE" == "true" ]]; then
            return 1
        fi
        return 0
    fi
}

# Statistics function
show_statistics() {
    local file="$1"

    info "Suggestion statistics:"

    local total=$(jq length "$file")
    echo "  Total suggestions: $total"

    local critical=$(jq '[.[] | select(.confidence >= 0.95)] | length' "$file")
    echo "  Critical confidence (≥95%): $critical"

    local high=$(jq '[.[] | select(.confidence >= 0.80 and .confidence < 0.95)] | length' "$file")
    echo "  High confidence (80-94%): $high"

    local medium=$(jq '[.[] | select(.confidence >= 0.65 and .confidence < 0.80)] | length' "$file")
    echo "  Medium confidence (65-79%): $medium"

    local low=$(jq '[.[] | select(.confidence < 0.65)] | length' "$file")
    echo "  Low confidence (<65%): $low"

    echo ""
    echo "  Categories:"
    jq -r '.[].category // "General"' "$file" | sort | uniq -c | sort -nr | while read -r count category; do
        echo "    $category: $count"
    done
}

# Main function
main() {
    # If stats-only mode, just show statistics and exit
    if [[ "$STATS_ONLY" == "true" ]]; then
        show_statistics "$INPUT_FILE"
        exit 0
    fi

    info "Validating: $INPUT_FILE"

    local exit_code=0

    # Validate JSON structure
    if ! validate_json_structure "$INPUT_FILE"; then
        exit_code=1
    fi

    # Validate required fields
    if ! validate_required_fields "$INPUT_FILE"; then
        exit_code=1
    fi

    # Validate optional fields
    if ! validate_optional_fields "$INPUT_FILE"; then
        exit_code=1
    fi

    # Show statistics if validation passed
    if [[ $exit_code -eq 0 ]]; then
        echo ""
        show_statistics "$INPUT_FILE"
        echo ""
        success "Validation completed successfully"
    else
        error "Validation failed"
    fi

    exit $exit_code
}

main
