#!/bin/bash

# Enhanced Claude CLI Execution Script with Modular Architecture
# Usage: ./execute-claude-with-visibility-v2.sh [claude-args...]
#
# This script provides:
# - Comprehensive visibility into Claude CLI execution
# - Robust error handling with retry logic
# - Security-focused output sanitization
# - Cost estimation and tracking
# - Modular architecture for maintainability

set -euo pipefail

# Script configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LIB_DIR="$SCRIPT_DIR/lib"
readonly OUTPUT_DIR="/tmp/claude_execution"
readonly SESSION_ID="claude_$(date +%s)_$$"

# Source library modules
source "$LIB_DIR/claude-detection.sh"
source "$LIB_DIR/output-sanitizer.sh"
source "$LIB_DIR/error-handling.sh"
source "$LIB_DIR/cost-estimator.sh"

# Script header
echo "=============================================="
echo "🤖 CLAUDE CLI EXECUTION WITH ENHANCED VISIBILITY"
echo "=============================================="
echo "Session ID: $SESSION_ID"
echo "Timestamp: $(date)"
echo "Arguments: $*"
echo "Working directory: $(pwd)"
echo "=============================================="
echo ""

# Initialize execution environment
init_execution_environment() {
  # Create output directory
  mkdir -p "$OUTPUT_DIR"

  # Set up trap for cleanup
  trap 'cleanup_on_exit' EXIT

  echo "🏗️  EXECUTION ENVIRONMENT INITIALIZED"
  echo "   Output directory: $OUTPUT_DIR"
  echo "   Session ID: $SESSION_ID"
  echo ""
}

# Cleanup function called on exit
cleanup_on_exit() {
  echo ""
  echo "🧹 PERFORMING CLEANUP..."

  # Clean up sensitive files
  local files_to_clean=(
    "$OUTPUT_DIR/${SESSION_ID}_raw_output.log"
    "$OUTPUT_DIR/${SESSION_ID}_error.log"
    "$OUTPUT_DIR/${SESSION_ID}_prompt_copy"
  )

  secure_cleanup "${files_to_clean[@]}"
  cleanup_cost_tracking "$OUTPUT_DIR/${SESSION_ID}_costs"

  echo "✅ Cleanup completed"
}

# Main execution function
main() {
  local claude_args=("$@")
  local exit_code=0

  # Initialize environment
  init_execution_environment

  # Step 1: Validate prerequisites
  echo "🔍 STEP 1: PREREQUISITE VALIDATION"
  if ! validate_prerequisites; then
    echo "❌ Prerequisites not met - aborting execution"
    return 1
  fi
  echo ""

  # Step 2: Detect Claude CLI
  echo "🔍 STEP 2: CLAUDE CLI DETECTION"
  local claude_cmd
  if ! claude_cmd=$(detect_claude_cli); then
    echo "❌ Claude CLI detection failed"
    return 1
  fi

  # Get detailed CLI information
  get_claude_cli_info "$claude_cmd"

  # Step 3: Cost estimation (if prompt file is provided)
  echo "💰 STEP 3: COST ESTIMATION"
  local estimated_cost="0.0000"
  local prompt_file=""

  # Check if there's a prompt file in arguments or stdin
  for arg in "${claude_args[@]}"; do
    if [[ -f "$arg" ]]; then
      prompt_file="$arg"
      break
    fi
  done

  # If no prompt file in args, check if we're reading from stdin
  if [[ -z "$prompt_file" && ! -t 0 ]]; then
    prompt_file="$OUTPUT_DIR/${SESSION_ID}_prompt_copy"
    cat > "$prompt_file"
    claude_args+=("< $prompt_file")
  fi

  if [[ -n "$prompt_file" && -f "$prompt_file" ]]; then
    estimated_cost=$(estimate_prompt_cost "$prompt_file" "sonnet")
    suggest_cost_optimizations "$prompt_file" "$estimated_cost"
  else
    echo "   ⚠️  No prompt file detected - cost estimation skipped"
    echo "   💡 For better cost control, use file-based prompts"
  fi
  echo ""

  # Step 4: Execute Claude CLI with comprehensive monitoring
  echo "🚀 STEP 4: CLAUDE CLI EXECUTION"
  local raw_output_file="$OUTPUT_DIR/${SESSION_ID}_raw_output.log"
  local sanitized_output_file="$OUTPUT_DIR/${SESSION_ID}_sanitized_output.log"
  local error_file="$OUTPUT_DIR/${SESSION_ID}_error.log"

  echo "   Command: $claude_cmd ${claude_args[*]}"
  echo "   Output capture: $raw_output_file"
  echo "   Timeout: ${AI_EXECUTION_TIMEOUT_MINUTES:-10} minutes"
  echo ""

  # Determine execution strategy based on flag support
  local execution_cmd="$claude_cmd"
  if check_flag_support "$claude_cmd" "--dangerously-skip-permissions"; then
    execution_cmd="$claude_cmd --dangerously-skip-permissions"
    echo "   ✅ Using --dangerously-skip-permissions for CI environment"
  fi

  # Execute with timeout and retry
  local timeout_seconds=$(( ${AI_EXECUTION_TIMEOUT_MINUTES:-10} * 60 ))

  echo "⏱️  Executing with timeout (${timeout_seconds}s)..."

  if execute_with_timeout_and_retry \
    "$execution_cmd ${claude_args[*]} > $raw_output_file 2> $error_file" \
    "$timeout_seconds" \
    3; then

    exit_code=0
    echo "✅ Claude execution completed successfully"
  else
    exit_code=$?
    echo "❌ Claude execution failed with exit code: $exit_code"

    # Generate error report
    local error_output=$(cat "$error_file" 2>/dev/null || echo "No error output captured")
    generate_error_report "Claude CLI execution" "$exit_code" "$error_output" \
      "$OUTPUT_DIR/${SESSION_ID}_error_report.md"

    # Handle specific error types
    handle_claude_error "$exit_code" "$error_output" "main execution"
  fi

  # Step 5: Process and sanitize output
  echo ""
  echo "🔒 STEP 5: OUTPUT PROCESSING & SANITIZATION"

  if [[ -f "$raw_output_file" && -s "$raw_output_file" ]]; then
    # Sanitize output
    sanitize_output "$raw_output_file" "$sanitized_output_file"

    # Display sanitized output
    echo ""
    echo "📋 SANITIZED CLAUDE OUTPUT:"
    echo "----------------------------------------"
    cat "$sanitized_output_file"
    echo "----------------------------------------"

    # Show execution statistics
    local output_size=$(wc -c < "$raw_output_file")
    local output_lines=$(wc -l < "$raw_output_file")

    echo ""
    echo "📊 EXECUTION STATISTICS:"
    echo "   Output size: $output_size bytes"
    echo "   Output lines: $output_lines"
    echo "   Estimated cost: \$$estimated_cost"

    # Track session costs
    track_session_cost "$estimated_cost" "$OUTPUT_DIR/${SESSION_ID}_costs"

  else
    echo "   ⚠️  No output captured or output file is empty"
  fi

  # Step 6: Final summary
  echo ""
  echo "=============================================="
  echo "🤖 EXECUTION SUMMARY"
  echo "=============================================="
  echo "Session ID: $SESSION_ID"
  echo "Exit code: $exit_code"
  echo "Estimated cost: \$$estimated_cost"
  echo "Timestamp: $(date)"

  if [[ $exit_code -eq 0 ]]; then
    echo "Status: ✅ SUCCESS"
  else
    echo "Status: ❌ FAILED"
    echo "Error report: $OUTPUT_DIR/${SESSION_ID}_error_report.md"
  fi
  echo "=============================================="

  return $exit_code
}

# Ensure library directory exists
if [[ ! -d "$LIB_DIR" ]]; then
  echo "❌ Library directory not found: $LIB_DIR"
  echo "   Please ensure all library modules are present:"
  echo "   - $LIB_DIR/claude-detection.sh"
  echo "   - $LIB_DIR/output-sanitizer.sh"
  echo "   - $LIB_DIR/error-handling.sh"
  echo "   - $LIB_DIR/cost-estimator.sh"
  exit 1
fi

# Execute main function with all arguments
main "$@"
