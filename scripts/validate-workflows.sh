#!/bin/bash

# Workflow Validation Script
# Validates GitHub Actions workflow YAML files for syntax and basic structure
# Usage: ./scripts/validate-workflows.sh

set -e

echo "🔍 Validating GitHub Actions workflows..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
total_files=0
valid_files=0
errors=0

# Function to validate a single workflow file
validate_workflow() {
    local file="$1"
    local filename=$(basename "$file")

    echo -n "Validating $filename... "

    # Check YAML syntax using Python (more universally available)
    if ! python3 -c "
import yaml
import sys
try:
    with open('$file', 'r') as f:
        yaml.safe_load(f)
except Exception as e:
    print(f'YAML Error: {e}', file=sys.stderr)
    sys.exit(1)
" 2>/dev/null; then
        echo -e "${RED}FAILED${NC} - Invalid YAML syntax"
        ((errors++))
        return 1
    fi

    # Check required GitHub Actions structure using grep
    if ! grep -q "^on:" "$file"; then
        echo -e "${RED}FAILED${NC} - Missing 'on' trigger"
        ((errors++))
        return 1
    fi

    if ! grep -q "^jobs:" "$file"; then
        echo -e "${RED}FAILED${NC} - Missing 'jobs' section"
        ((errors++))
        return 1
    fi

    # Check for runs-on in jobs (basic check)
    if ! grep -q "runs-on:" "$file"; then
        echo -e "${YELLOW}WARNING${NC} - No 'runs-on' found"
    fi

    echo -e "${GREEN}PASSED${NC}"
    ((valid_files++))
    return 0
}

# Function to check workflow dependencies
check_workflow_dependencies() {
    local file="$1"
    local filename=$(basename "$file")

    # Check for workflow_call usage
    if grep -q "workflow_call:" "$file"; then
        echo "  📋 $filename: Reusable workflow (workflow_call)"
    fi

    # Check for workflow_dispatch usage
    if grep -q "workflow_dispatch:" "$file"; then
        echo "  🎯 $filename: Manually dispatchable"
    fi

    # Check for job dependencies
    if grep -q "needs:" "$file"; then
        echo "  🔗 $filename: Has job dependencies"
    fi

    # Check for uses: actions (calling other workflows)
    if grep -q "uses: \\./" "$file"; then
        echo "  🔄 $filename: Calls other workflows"
    fi
}

# Find and validate workflow files
workflow_dirs=(".github/workflows" "examples/workflows")

for dir in "${workflow_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo ""
        echo "📁 Checking workflows in $dir..."

        for file in "$dir"/*.yml "$dir"/*.yaml; do
            if [ -f "$file" ]; then
                ((total_files++))
                validate_workflow "$file"
            fi
        done
    fi
done

# Check workflow relationships
echo ""
echo "🔗 Analyzing workflow relationships..."
for dir in "${workflow_dirs[@]}"; do
    if [ -d "$dir" ]; then
        for file in "$dir"/*.yml "$dir"/*.yaml; do
            if [ -f "$file" ]; then
                check_workflow_dependencies "$file"
            fi
        done
    fi
done

# Summary
echo ""
echo "📊 Validation Summary:"
echo "  Total files checked: $total_files"
echo "  Valid workflows: $valid_files"
echo "  Files with errors: $errors"

if [ "$errors" -eq 0 ]; then
    echo -e "${GREEN}✅ All workflows are valid!${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $errors workflow(s) with errors.${NC}"
    exit 1
fi
