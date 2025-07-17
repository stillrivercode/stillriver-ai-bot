#!/bin/bash

# Shell Script Validation Tests
# Basic tests for shell script repository

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧪 Running shell script validation tests..."

# Test 1: Core workflow scripts exist
echo "📝 Validating core workflow scripts..."
CORE_SCRIPTS=(
    "execute-ai-task.sh"
    "setup-labels.sh"
    "create-pr.sh"
    "safe-commit.sh"
    "comment-no-changes.sh"
    "commit-changes.sh"
    "push-changes.sh"
    "cost-monitor.sh"
    "run-security-scan.sh"
)

for script in "${CORE_SCRIPTS[@]}"; do
    if [ -x "$REPO_ROOT/scripts/$script" ]; then
        echo "✅ $script exists and is executable"
    else
        echo "❌ $script missing or not executable"
        exit 1
    fi
done

# Test 2: Core library files exist
echo "📚 Validating core library files..."
CORE_LIBS=(
    "common.sh"
    "prerequisite-validation.sh"
    "error-handling.sh"
    "openrouter-client.sh"
    "cost-estimator.sh"
    "retry-utils.sh"
    "security-utils.sh"
)

for lib in "${CORE_LIBS[@]}"; do
    if [ -f "$REPO_ROOT/scripts/lib/$lib" ]; then
        echo "✅ $lib library exists"
    else
        echo "❌ $lib library missing"
        exit 1
    fi
done

# Test 3: Documentation exists
echo "📄 Validating documentation..."
if [ -f "$REPO_ROOT/README.md" ]; then
    echo "✅ README.md exists"
else
    echo "❌ README.md missing"
    exit 1
fi

if [ -f "$REPO_ROOT/CLAUDE.md" ]; then
    echo "✅ CLAUDE.md exists"
else
    echo "❌ CLAUDE.md missing"
    exit 1
fi

# Test 4: GitHub workflows exist
echo "🔄 Validating GitHub workflows..."
if [ -f "$REPO_ROOT/.github/workflows/quality-checks.yml" ]; then
    echo "✅ quality-checks.yml exists"
else
    echo "❌ quality-checks.yml missing"
    exit 1
fi

echo ""
echo "🎉 All shell script validation tests passed!"
exit 0
