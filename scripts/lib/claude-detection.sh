#!/bin/bash

# Claude CLI Detection Library
# Provides functions to detect and validate Claude CLI installations

set -euo pipefail

# Detect available Claude CLI command
detect_claude_cli() {
  local claude_cmd=""

  echo "🔍 CLAUDE CLI DETECTION"
  echo "----------------------------------------"

  if command -v claude-code >/dev/null 2>&1; then
    claude_cmd="claude-code"
    echo "✅ Found claude-code at: $(which claude-code)"
  elif command -v claude >/dev/null 2>&1; then
    claude_cmd="claude"
    echo "✅ Found claude at: $(which claude)"
  elif command -v npx >/dev/null 2>&1; then
    claude_cmd="npx @anthropic-ai/claude-code"
    echo "⚠️  Using npx fallback: $claude_cmd"
  else
    echo "❌ No Claude CLI found"
    return 1
  fi

  echo "Selected command: $claude_cmd"
  echo "----------------------------------------"
  echo ""

  # Return the command via stdout for capture
  echo "$claude_cmd"
}

# Get detailed information about Claude CLI
get_claude_cli_info() {
  local claude_cmd="$1"

  echo "🔍 CLAUDE CLI INFORMATION"
  echo "----------------------------------------"
  echo "Command: $claude_cmd"

  if [[ "$claude_cmd" != "npx @anthropic-ai/claude-code" ]]; then
    echo "Location: $(which "${claude_cmd%% *}" 2>/dev/null || echo 'not found')"

    echo ""
    echo "📋 Version Information:"
    if $claude_cmd --version 2>&1; then
      echo "   ✅ Version check successful"
    else
      echo "   ❌ Version check failed"
    fi

    echo ""
    echo "📋 Flag Support Analysis:"
    local flags=("--print" "--model" "--dangerously-skip-permissions" "--quiet" "--no-color" "-p")
    for flag in "${flags[@]}"; do
      if $claude_cmd --help 2>&1 | grep -q -- "$flag"; then
        echo "   ✅ $flag: supported"
      else
        echo "   ❌ $flag: not supported"
      fi
    done
  else
    echo "   ⚠️  npx command - skipping detailed analysis to avoid delays"
  fi

  echo "----------------------------------------"
  echo ""
}

# Check if Claude CLI supports a specific flag
check_flag_support() {
  local claude_cmd="$1"
  local flag="$2"

  echo "   🔍 Checking if $claude_cmd supports $flag..."

  # Try to run help command and check for flag
  if $claude_cmd --help 2>&1 | grep -q -- "$flag"; then
    echo "   ✅ Flag $flag is supported"
    return 0
  else
    echo "   ❌ Flag $flag is not supported"
    return 1
  fi
}

# Validate environment for Claude CLI execution
validate_environment() {
  echo "🔧 ENVIRONMENT VALIDATION"
  echo "----------------------------------------"
  echo "ANTHROPIC_API_KEY: $(if [ -n "${ANTHROPIC_API_KEY:-}" ]; then echo "✅ Set (${#ANTHROPIC_API_KEY} characters)"; else echo "❌ Not set"; fi)"
  echo "GITHUB_TOKEN: $(if [ -n "${GITHUB_TOKEN:-}" ]; then echo "✅ Set (${#GITHUB_TOKEN} characters)"; else echo "❌ Not set"; fi)"
  echo "PATH: $PATH"
  echo "----------------------------------------"
  echo ""
}
