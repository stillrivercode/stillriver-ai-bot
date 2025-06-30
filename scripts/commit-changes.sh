#!/bin/bash

# Script to commit changes made by AI task
# Usage: ./commit-changes.sh <issue_title> <issue_number>

set -e

ISSUE_TITLE="$1"
ISSUE_NUMBER="$2"

echo "Checking for changes to commit..."

# Stage all changes first
if ! git diff --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  echo "Changes detected, staging files..."
  git add -A
  echo "Files staged successfully"
fi

# Commit any changes made
if ! git diff --cached --quiet; then
  CLEAN_TITLE=$(echo "$ISSUE_TITLE" | sed 's/\[AI Task\] //')
  echo "Committing changes with title: $CLEAN_TITLE"

  git commit -m "AI Task: $CLEAN_TITLE" \
             -m "" \
             -m "Implemented via AI task orchestration workflow." \
             -m "Addresses issue #$ISSUE_NUMBER." \
             -m "" \
             -m "Generated with Claude Code" \
             -m "Co-Authored-By: Claude <noreply@anthropic.com>"

  echo "Changes committed successfully"
else
  echo "No changes to commit"
fi
