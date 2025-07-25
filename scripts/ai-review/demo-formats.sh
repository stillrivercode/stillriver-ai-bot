#!/bin/bash

# Demonstration script for AI review suggestion formatting
# Shows different output formats and options

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

# Convenience aliases for common functions
info() { log_info "$@"; }
success() { log_success "$@"; }
error() { log_error "$@"; }

# Default test file
TEST_FILE="${SCRIPT_DIR}/test-suggestions.json"

info "AI Review Suggestion Formatting Demo"
echo "======================================"
echo ""

# Check if test file exists
if [[ ! -f "$TEST_FILE" ]]; then
    error "Test file not found: $TEST_FILE"
    exit 1
fi

info "Using test data: $TEST_FILE"
echo ""

# Show validation results
info "1. Validation Results:"
echo "----------------------"
"${SCRIPT_DIR}/validate-suggestions.sh" "$TEST_FILE" 2>/dev/null | tail -10
echo ""

# Show individual format
info "2. Individual Format (First 30 lines):"
echo "--------------------------------------"
"${SCRIPT_DIR}/format-suggestions.sh" -i "$TEST_FILE" -t individual 2>/dev/null | head -30
echo "... (truncated)"
echo ""

# Show batch format
info "3. Batch Format (First 20 lines):"
echo "----------------------------------"
"${SCRIPT_DIR}/format-suggestions.sh" -i "$TEST_FILE" -t batch 2>/dev/null | head -20
echo "... (truncated)"
echo ""

# Show summary format
info "4. Summary Format:"
echo "------------------"
"${SCRIPT_DIR}/format-suggestions.sh" -i "$TEST_FILE" -t summary 2>/dev/null
echo ""

# Show different threshold settings
info "5. Custom Thresholds (Resolvable=0.90, Enhanced=0.70):"
echo "-------------------------------------------------------"
"${SCRIPT_DIR}/format-suggestions.sh" \
    -i "$TEST_FILE" \
    -t batch \
    --threshold-resolvable 0.90 \
    --threshold-enhanced 0.70 \
    2>/dev/null | head -15
echo "... (truncated)"
echo ""

# Show limited resolvable suggestions
info "6. Limited Resolvable Suggestions (max=1):"
echo "-------------------------------------------"
"${SCRIPT_DIR}/format-suggestions.sh" \
    -i "$TEST_FILE" \
    -t batch \
    -m 1 \
    2>/dev/null | head -15
echo "... (truncated)"
echo ""

success "Demo completed! Use these scripts in your AI review workflow:"
echo ""
echo "Scripts available:"
echo "  - format-suggestions.sh: Main formatting script"
echo "  - validate-suggestions.sh: JSON validation utility"
echo "  - demo-formats.sh: This demonstration script"
echo ""
echo "Example usage:"
echo "  ./format-suggestions.sh -i suggestions.json -t batch -o formatted.md"
echo "  ./validate-suggestions.sh --strict suggestions.json"
