#!/bin/bash

# Format AI review suggestions with confidence levels and GitHub suggestion syntax
# This script handles formatting of resolvable suggestions, enhanced comments, and batch operations

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

# Convenience aliases for common functions
info() { log_info "$@"; }
success() { log_success "$@"; }
error() { log_error "$@"; }
warning() { log_warning "$@"; }

# Default values
CONFIDENCE_THRESHOLD_RESOLVABLE=0.95
CONFIDENCE_THRESHOLD_ENHANCED=0.80
CONFIDENCE_THRESHOLD_REGULAR=0.65
MAX_RESOLVABLE_PER_PR=5
FORMAT_TYPE="individual"  # individual, batch, summary
ENABLE_INLINE_COMMENTS="${AI_ENABLE_INLINE_COMMENTS:-true}"  # Enable/disable inline resolvable comments

# Confidence level icons
ICON_CRITICAL="🔒"
ICON_HIGH="⚡"
ICON_MEDIUM="💡"
ICON_INFO="ℹ️"

# Function to display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Format AI review suggestions with appropriate confidence levels and GitHub syntax.

Options:
    -i, --input FILE              Input JSON file containing suggestions
    -o, --output FILE             Output file for formatted suggestions
    -t, --type TYPE               Format type: individual, batch, summary (default: individual)
    -m, --max-resolvable NUM      Maximum resolvable suggestions per PR (default: 5)
    --threshold-resolvable NUM    Confidence threshold for resolvable (default: 0.95)
    --threshold-enhanced NUM      Confidence threshold for enhanced (default: 0.80)
    --threshold-regular NUM       Confidence threshold for regular (default: 0.65)
    --enable-inline BOOL          Enable inline resolvable comments (default: true)
    --disable-inline              Disable inline resolvable comments (force to enhanced)
    -h, --help                    Display this help message

Environment Variables:
    AI_ENABLE_INLINE_COMMENTS     Enable/disable inline comments (true/false, default: true)

Example:
    $0 -i suggestions.json -o formatted.md -t batch
EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -i|--input)
                INPUT_FILE="$2"
                shift 2
                ;;
            -o|--output)
                OUTPUT_FILE="$2"
                shift 2
                ;;
            -t|--type)
                FORMAT_TYPE="$2"
                shift 2
                ;;
            -m|--max-resolvable)
                MAX_RESOLVABLE_PER_PR="$2"
                shift 2
                ;;
            --threshold-resolvable)
                CONFIDENCE_THRESHOLD_RESOLVABLE="$2"
                shift 2
                ;;
            --threshold-enhanced)
                CONFIDENCE_THRESHOLD_ENHANCED="$2"
                shift 2
                ;;
            --threshold-regular)
                CONFIDENCE_THRESHOLD_REGULAR="$2"
                shift 2
                ;;
            --enable-inline)
                ENABLE_INLINE_COMMENTS="$2"
                shift 2
                ;;
            --disable-inline)
                ENABLE_INLINE_COMMENTS="false"
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done

    # Validate required arguments
    if [[ -z "${INPUT_FILE:-}" ]]; then
        error "Input file is required"
        usage
        exit 1
    fi

    if [[ ! -f "$INPUT_FILE" ]]; then
        error "Input file does not exist: $INPUT_FILE"
        exit 1
    fi

    OUTPUT_FILE="${OUTPUT_FILE:-/dev/stdout}"
}

# Get confidence icon based on level
get_confidence_icon() {
    local confidence=$1

    if (( $(echo "$confidence >= $CONFIDENCE_THRESHOLD_RESOLVABLE" | bc -l) )); then
        echo "$ICON_CRITICAL"
    elif (( $(echo "$confidence >= $CONFIDENCE_THRESHOLD_ENHANCED" | bc -l) )); then
        echo "$ICON_HIGH"
    elif (( $(echo "$confidence >= $CONFIDENCE_THRESHOLD_REGULAR" | bc -l) )); then
        echo "$ICON_MEDIUM"
    else
        echo "$ICON_INFO"
    fi
}

# Get confidence label
get_confidence_label() {
    local confidence=$1

    if (( $(echo "$confidence >= $CONFIDENCE_THRESHOLD_RESOLVABLE" | bc -l) )); then
        echo "Critical"
    elif (( $(echo "$confidence >= $CONFIDENCE_THRESHOLD_ENHANCED" | bc -l) )); then
        echo "High"
    elif (( $(echo "$confidence >= $CONFIDENCE_THRESHOLD_REGULAR" | bc -l) )); then
        echo "Medium"
    else
        echo "Low"
    fi
}

# Format resolvable suggestion
format_resolvable_suggestion() {
    local suggestion="$1"
    local confidence=$(echo "$suggestion" | jq -r '.confidence')
    local percentage=$(printf "%.0f" $(echo "$confidence * 100" | bc -l))
    local icon=$(get_confidence_icon "$confidence")
    local label=$(get_confidence_label "$confidence")
    local category=$(echo "$suggestion" | jq -r '.category // "General"')
    local description=$(echo "$suggestion" | jq -r '.description')
    local code=$(echo "$suggestion" | jq -r '.suggested_code')
    local file_path=$(echo "$suggestion" | jq -r '.file_path')
    local line_start=$(echo "$suggestion" | jq -r '.line_start')
    local line_end=$(echo "$suggestion" | jq -r '.line_end // .line_start')

    cat << EOF
$icon AI ${category} Alert ($label - ${percentage}% Confidence)
${description} - requires resolution

\`\`\`suggestion
${code}
\`\`\`

[ Accept Suggestion ] [ Dismiss ] [ Provide Feedback ]

---

EOF
}

# Format enhanced comment
format_enhanced_comment() {
    local suggestion="$1"
    local confidence=$(echo "$suggestion" | jq -r '.confidence')
    local percentage=$(printf "%.0f" $(echo "$confidence * 100" | bc -l))
    local icon=$(get_confidence_icon "$confidence")
    local label=$(get_confidence_label "$confidence")
    local category=$(echo "$suggestion" | jq -r '.category // "General"')
    local description=$(echo "$suggestion" | jq -r '.description')
    local code=$(echo "$suggestion" | jq -r '.suggested_code // ""')

    cat << EOF
$icon AI ${category} Suggestion ($label - ${percentage}% Confidence)
${description}

EOF

    if [[ -n "$code" && "$code" != "null" ]]; then
        cat << EOF
\`\`\`${suggestion_language:-javascript}
// Suggested improvement:
${code}
\`\`\`

EOF
    fi

    cat << EOF
[ 👍 Helpful ] [ 👎 Not Helpful ] [ More Info ]

---

EOF
}

# Format regular comment
format_regular_comment() {
    local suggestion="$1"
    local confidence=$(echo "$suggestion" | jq -r '.confidence')
    local percentage=$(printf "%.0f" $(echo "$confidence * 100" | bc -l))
    local icon=$(get_confidence_icon "$confidence")
    local label=$(get_confidence_label "$confidence")
    local category=$(echo "$suggestion" | jq -r '.category // "General"')
    local description=$(echo "$suggestion" | jq -r '.description')

    cat << EOF
$icon AI ${category} Note ($label - ${percentage}% Confidence)
${description}

---

EOF
}

# Format suppressed suggestions summary
format_suppressed_summary() {
    local suggestions="$1"
    local count=$(echo "$suggestions" | jq length)

    if [[ $count -eq 0 ]]; then
        return
    fi

    cat << EOF
## 📊 Additional Insights (Low Confidence)

<details>
<summary>View ${count} additional low-confidence suggestions</summary>

EOF

    echo "$suggestions" | jq -c '.[]' | while read -r suggestion; do
        local category=$(echo "$suggestion" | jq -r '.category // "General"')
        local description=$(echo "$suggestion" | jq -r '.description')
        local confidence=$(echo "$suggestion" | jq -r '.confidence')
        local percentage=$(printf "%.0f" $(echo "$confidence * 100" | bc -l))

        echo "- **${category}** (${percentage}%): ${description}"
    done

    cat << EOF

</details>

---

EOF
}

# Format batch operations summary
format_batch_summary() {
    local resolvable_count=$1
    local enhanced_count=$2
    local regular_count=$3
    local suppressed_count=$4
    local inline_enabled=${5:-true}
    local total_count=$((resolvable_count + enhanced_count + regular_count + suppressed_count))

    # Adjust labels based on inline comments setting
    local critical_label="Critical (Resolvable)"
    local critical_action="Apply all ${resolvable_count} resolvable suggestions"

    if [[ "$inline_enabled" == "false" ]]; then
        critical_label="Critical (Enhanced)"
        critical_action="Review all ${resolvable_count} critical suggestions"
    fi

    cat << EOF
## 🤖 AI Review Summary

**Total Suggestions**: ${total_count}$(if [[ "$inline_enabled" == "false" ]]; then echo " (Inline comments disabled)"; fi)
- ${ICON_CRITICAL} **${critical_label}**: ${resolvable_count} - Action required
- ${ICON_HIGH} **High Confidence**: ${enhanced_count} - Recommended improvements
- ${ICON_MEDIUM} **Medium Confidence**: ${regular_count} - Consider these insights
- ${ICON_INFO} **Low Confidence**: ${suppressed_count} - Additional thoughts (collapsed)

### Quick Actions
- [ **Accept All Critical** ] - ${critical_action}
- [ **Review by Category** ] - Filter suggestions by type
- [ **Export Report** ] - Download full analysis

---

EOF
}

# Process individual suggestions
process_individual() {
    local suggestions="$1"
    local output=""
    local resolvable_count=0

    # Check if inline comments are enabled
    local inline_enabled="true"
    if [[ "${ENABLE_INLINE_COMMENTS}" == "false" ]] || [[ "${ENABLE_INLINE_COMMENTS}" == "0" ]]; then
        inline_enabled="false"
    fi

    # Separate suggestions by confidence level
    local resolvable=$(echo "$suggestions" | jq -c "[.[] | select(.confidence >= $CONFIDENCE_THRESHOLD_RESOLVABLE)] | sort_by(.confidence) | reverse | .[:$MAX_RESOLVABLE_PER_PR]")
    local enhanced=$(echo "$suggestions" | jq -c "[.[] | select(.confidence >= $CONFIDENCE_THRESHOLD_ENHANCED and .confidence < $CONFIDENCE_THRESHOLD_RESOLVABLE)]")
    local regular=$(echo "$suggestions" | jq -c "[.[] | select(.confidence >= $CONFIDENCE_THRESHOLD_REGULAR and .confidence < $CONFIDENCE_THRESHOLD_ENHANCED)]")
    local suppressed=$(echo "$suggestions" | jq -c "[.[] | select(.confidence < $CONFIDENCE_THRESHOLD_REGULAR)]")

    # Format resolvable suggestions (or enhanced if inline disabled)
    if [[ "$inline_enabled" == "true" ]]; then
        # Use resolvable suggestion format with inline comments
        echo "$resolvable" | jq -c '.[]' | while read -r suggestion; do
            format_resolvable_suggestion "$suggestion"
            ((resolvable_count++))
        done
    else
        # Disable inline comments - treat resolvable as enhanced
        info "ℹ️  Inline comments disabled - converting resolvable suggestions to enhanced format"
        echo "$resolvable" | jq -c '.[]' | while read -r suggestion; do
            format_enhanced_comment "$suggestion"
        done
    fi

    # Format enhanced comments
    echo "$enhanced" | jq -c '.[]' | while read -r suggestion; do
        format_enhanced_comment "$suggestion"
    done

    # Format regular comments
    echo "$regular" | jq -c '.[]' | while read -r suggestion; do
        format_regular_comment "$suggestion"
    done

    # Format suppressed summary
    format_suppressed_summary "$suppressed"
}

# Process batch format
process_batch() {
    local suggestions="$1"

    # Check if inline comments are enabled
    local inline_enabled="true"
    if [[ "${ENABLE_INLINE_COMMENTS}" == "false" ]] || [[ "${ENABLE_INLINE_COMMENTS}" == "0" ]]; then
        inline_enabled="false"
    fi

    # Count suggestions by type
    local resolvable_suggestions=$(echo "$suggestions" | jq "[.[] | select(.confidence >= $CONFIDENCE_THRESHOLD_RESOLVABLE)] | sort_by(.confidence) | reverse | .[:$MAX_RESOLVABLE_PER_PR]")
    local resolvable_count=$(echo "$resolvable_suggestions" | jq length)
    local enhanced_count=$(echo "$suggestions" | jq "[.[] | select(.confidence >= $CONFIDENCE_THRESHOLD_ENHANCED and .confidence < $CONFIDENCE_THRESHOLD_RESOLVABLE)] | length")
    local regular_count=$(echo "$suggestions" | jq "[.[] | select(.confidence >= $CONFIDENCE_THRESHOLD_REGULAR and .confidence < $CONFIDENCE_THRESHOLD_ENHANCED)] | length")
    local suppressed_count=$(echo "$suggestions" | jq "[.[] | select(.confidence < $CONFIDENCE_THRESHOLD_REGULAR)] | length")

    # Format batch summary
    format_batch_summary "$resolvable_count" "$enhanced_count" "$regular_count" "$suppressed_count" "$inline_enabled"

    # Then process individual suggestions
    process_individual "$suggestions"
}

# Process summary format
process_summary() {
    local suggestions="$1"

    # Group suggestions by category
    local categories=$(echo "$suggestions" | jq -r '.[].category // "General"' | sort | uniq)

    cat << EOF
## 📋 AI Review Analysis Summary

EOF

    for category in $categories; do
        local category_suggestions=$(echo "$suggestions" | jq -c "[.[] | select(.category == \"$category\" or (.category == null and \"$category\" == \"General\"))]")
        local count=$(echo "$category_suggestions" | jq length)

        # Skip empty categories
        if [[ $count -eq 0 ]]; then
            continue
        fi

        local avg_confidence=$(echo "$category_suggestions" | jq '[.[].confidence] | if length > 0 then add/length else 0 end')
        local avg_percentage=$(printf "%.0f" $(echo "$avg_confidence * 100" | bc -l))

        cat << EOF
### ${category} (${count} suggestions, avg confidence: ${avg_percentage}%)

EOF

        # Show top 3 suggestions for this category
        echo "$category_suggestions" | jq -c '.[:3] | .[]' | while read -r suggestion; do
            local description=$(echo "$suggestion" | jq -r '.description')
            local confidence=$(echo "$suggestion" | jq -r '.confidence')
            local percentage=$(printf "%.0f" $(echo "$confidence * 100" | bc -l))
            local icon=$(get_confidence_icon "$confidence")

            echo "${icon} ${description} (${percentage}%)"
        done

        if [[ $count -gt 3 ]]; then
            echo "... and $((count - 3)) more"
        fi

        echo ""
    done
}

# Main function
main() {
    parse_arguments "$@"

    info "Reading suggestions from: $INPUT_FILE"

    # Read and validate JSON
    if ! suggestions=$(jq '.' "$INPUT_FILE" 2>/dev/null); then
        error "Invalid JSON in input file"
        exit 1
    fi

    # Ensure it's an array
    if ! echo "$suggestions" | jq -e 'type == "array"' >/dev/null 2>&1; then
        error "Input must be a JSON array of suggestions"
        exit 1
    fi

    info "Processing ${FORMAT_TYPE} format..."

    # Process based on format type
    case $FORMAT_TYPE in
        individual)
            output=$(process_individual "$suggestions")
            ;;
        batch)
            output=$(process_batch "$suggestions")
            ;;
        summary)
            output=$(process_summary "$suggestions")
            ;;
        *)
            error "Invalid format type: $FORMAT_TYPE"
            exit 1
            ;;
    esac

    # Write output
    if [[ "$OUTPUT_FILE" == "/dev/stdout" ]]; then
        echo "$output"
    else
        echo "$output" > "$OUTPUT_FILE"
        success "Formatted suggestions written to: $OUTPUT_FILE"
    fi
}

# Run main function
main "$@"
