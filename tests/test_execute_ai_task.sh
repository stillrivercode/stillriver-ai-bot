#!/bin/bash

# Basic test for execute-ai-task.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../scripts/lib/common.sh"

# Mock dependencies
export GITHUB_TOKEN="test_token"
export GITHUB_REPOSITORY="stillrivercode/stillriver-ai-bot"
export OPENROUTER_API_KEY="test_key"
export SKIP_CLAUDE_CLI_VALIDATION="true"

# Test case 1: Valid issue number
log_info "Running test case 1: Valid issue number"
if bash -x "$SCRIPT_DIR/../scripts/execute-ai-task.sh" 1; then
    log_info "Test case 1 passed"
else
    log_error "Test case 1 failed"
    exit 1
fi

# Test case 2: Invalid issue number
log_info "Running test case 2: Invalid issue number"
if ! bash "$SCRIPT_DIR/../scripts/execute-ai-task.sh" "invalid"; then
    log_info "Test case 2 passed"
else
    log_error "Test case 2 failed"
    exit 1
fi

log_info "All tests passed"
exit 0
