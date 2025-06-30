#!/bin/bash

# Output Sanitization Library
# Provides functions to sanitize sensitive data from Claude CLI output

set -euo pipefail

# Sanitize sensitive data from logs using improved patterns
sanitize_output() {
  local input_file="$1"
  local output_file="$2"

  if [[ ! -f "$input_file" ]]; then
    echo "⚠️  Warning: Input file $input_file not found for sanitization"
    return 1
  fi

  # Create comprehensive but more specific sanitization patterns
  sed -E '
    # Specific API key patterns (more precise than generic long strings)
    s/\b(sk-[A-Za-z0-9]{32,})\b/sk-***REDACTED***/g
    s/\b(sk-ant-[A-Za-z0-9_-]{32,})\b/sk-ant-***REDACTED***/g
    s/\b(gh_[A-Za-z0-9_-]{32,})\b/gh_***REDACTED***/g
    s/\b(ghp_[A-Za-z0-9_-]{32,})\b/ghp_***REDACTED***/g
    s/\b(gho_[A-Za-z0-9_-]{32,})\b/gho_***REDACTED***/g
    s/\b(ghu_[A-Za-z0-9_-]{32,})\b/ghu_***REDACTED***/g
    s/\b(ghs_[A-Za-z0-9_-]{32,})\b/ghs_***REDACTED***/g
    s/\b(ghr_[A-Za-z0-9_-]{32,})\b/ghr_***REDACTED***/g

    # Environment variable assignments (more specific patterns)
    s/([A-Z_]+API_KEY)[[:space:]]*=[[:space:]]*[^[:space:]]+/\1=***REDACTED***/g
    s/(ANTHROPIC_API_KEY)[[:space:]]*=[[:space:]]*[^[:space:]]+/\1=***REDACTED***/g
    s/(GITHUB_TOKEN)[[:space:]]*=[[:space:]]*[^[:space:]]+/\1=***REDACTED***/g
    s/(GH_PAT)[[:space:]]*=[[:space:]]*[^[:space:]]+/\1=***REDACTED***/g
    s/([A-Z_]*TOKEN)[[:space:]]*=[[:space:]]*[^[:space:]]+/\1=***REDACTED***/g
    s/([A-Z_]*SECRET)[[:space:]]*=[[:space:]]*[^[:space:]]+/\1=***REDACTED***/g
    s/([A-Z_]*PASSWORD)[[:space:]]*=[[:space:]]+[^[:space:]]+/\1=***REDACTED***/g

    # Generic sensitive patterns (case-insensitive)
    s/(token|password|secret|key)[[:space:]]*[:=][[:space:]]*[^[:space:]]+/\1=***REDACTED***/gi

    # Bearer tokens and Authorization headers
    s/(Bearer[[:space:]]+)[A-Za-z0-9_-]+/\1***REDACTED***/g
    s/(Authorization:[[:space:]]*Bearer[[:space:]]+)[A-Za-z0-9_-]+/\1***REDACTED***/g

    # JWT tokens (three base64 segments separated by dots)
    s/\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/***JWT_TOKEN_REDACTED***/g

    # Docker/Container registry tokens
    s/\b(docker[[:space:]]*login[[:space:]]*.*-p[[:space:]]*)[^[:space:]]+/\1***REDACTED***/g

    # Base64 encoded potential secrets (only very long ones to avoid false positives)
    s/\b[A-Za-z0-9+/]{64,}={0,2}\b/***BASE64_REDACTED***/g
  ' "$input_file" > "$output_file"

  echo "🔒 Output sanitized: $input_file → $output_file"
}

# Sanitize content from stdin and output to stdout
sanitize_stdin() {
  sed -E '
    # Specific API key patterns
    s/\b(sk-[A-Za-z0-9]{32,})\b/sk-***REDACTED***/g
    s/\b(sk-ant-[A-Za-z0-9_-]{32,})\b/sk-ant-***REDACTED***/g
    s/\b(gh_[A-Za-z0-9_-]{32,})\b/gh_***REDACTED***/g
    s/\b(ghp_[A-Za-z0-9_-]{32,})\b/ghp_***REDACTED***/g

    # Environment variable assignments
    s/([A-Z_]+API_KEY)[[:space:]]*=[[:space:]]*[^[:space:]]+/\1=***REDACTED***/g
    s/(ANTHROPIC_API_KEY)[[:space:]]*=[[:space:]]*[^[:space:]]+/\1=***REDACTED***/g
    s/(GITHUB_TOKEN)[[:space:]]*=[[:space:]]*[^[:space:]]+/\1=***REDACTED***/g
    s/([A-Z_]*TOKEN)[[:space:]]*=[[:space:]]*[^[:space:]]+/\1=***REDACTED***/g

    # Bearer tokens
    s/(Bearer[[:space:]]+)[A-Za-z0-9_-]+/\1***REDACTED***/g

    # JWT tokens
    s/\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/***JWT_TOKEN_REDACTED***/g

    # Base64 encoded potential secrets (64+ chars)
    s/\b[A-Za-z0-9+/]{64,}={0,2}\b/***BASE64_REDACTED***/g
  '
}

# Validate that sanitization patterns are working correctly
validate_sanitization() {
  local test_input="$1"
  local expected_redactions="$2"

  echo "🧪 Testing sanitization patterns..."

  # Create temporary test file
  local temp_file=$(mktemp)
  echo "$test_input" > "$temp_file"

  local sanitized_file=$(mktemp)
  sanitize_output "$temp_file" "$sanitized_file"

  local sanitized_content=$(cat "$sanitized_file")

  # Check if expected patterns were redacted
  local validation_passed=true
  IFS=',' read -ra patterns <<< "$expected_redactions"
  for pattern in "${patterns[@]}"; do
    if echo "$sanitized_content" | grep -q "$pattern"; then
      echo "❌ Pattern '$pattern' was not properly redacted"
      validation_passed=false
    else
      echo "✅ Pattern '$pattern' was successfully redacted"
    fi
  done

  # Cleanup
  rm -f "$temp_file" "$sanitized_file"

  if [[ "$validation_passed" == "true" ]]; then
    echo "✅ All sanitization patterns working correctly"
    return 0
  else
    echo "❌ Some sanitization patterns failed"
    return 1
  fi
}

# Clean up sensitive files securely
secure_cleanup() {
  local files_to_clean=("$@")

  echo "🧹 Performing secure cleanup..."

  for file in "${files_to_clean[@]}"; do
    if [[ -f "$file" ]]; then
      # Overwrite file content before deletion (basic security measure)
      if command -v shred >/dev/null 2>&1; then
        shred -vfz -n 3 "$file" 2>/dev/null || rm -f "$file"
      else
        # Fallback for systems without shred
        dd if=/dev/zero of="$file" bs=1024 count=1 2>/dev/null || true
        rm -f "$file"
      fi
      echo "🗑️  Securely removed: $file"
    fi
  done

  echo "✅ Security cleanup completed"
}
