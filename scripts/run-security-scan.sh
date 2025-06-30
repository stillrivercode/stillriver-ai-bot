#!/bin/bash
#
# Run security scans with proper configuration
#

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running Security Scan...${NC}"

# Ensure we're in the project root
cd "$(dirname "$0")/.."

# Install bandit if not already installed
if ! command -v bandit &> /dev/null; then
    echo -e "${YELLOW}Installing bandit...${NC}"
    pip install bandit
fi

# Run bandit with our configuration
echo -e "\n${GREEN}Running Bandit security scan...${NC}"

# For production code (excluding tests)
echo -e "\n${YELLOW}Scanning production code...${NC}"
bandit -r . -f json -o bandit-report-prod.json \
    --exclude ./tests,./test,./venv,./.venv,./node_modules \
    || true

# Convert JSON to readable format
if [ -f bandit-report-prod.json ]; then
    echo -e "\n${GREEN}Production Code Security Report:${NC}"
    python3 -c "
import json
with open('bandit-report-prod.json', 'r') as f:
    data = json.load(f)
    metrics = data.get('metrics', {})
    total = metrics.get('_totals', {})
    print(f\"Total Issues: {total.get('SEVERITY.UNDEFINED', 0) + total.get('SEVERITY.LOW', 0) + total.get('SEVERITY.MEDIUM', 0) + total.get('SEVERITY.HIGH', 0)}\")
    print(f\"High: {total.get('SEVERITY.HIGH', 0)}\")
    print(f\"Medium: {total.get('SEVERITY.MEDIUM', 0)}\")
    print(f\"Low: {total.get('SEVERITY.LOW', 0)}\")

    if data.get('results'):
        print(\"\\nIssues Found:\")
        for issue in data['results'][:10]:  # Show first 10 issues
            print(f\"- [{issue['issue_severity']}] {issue['test_id']}: {issue['issue_text'][:80]}...\")
            print(f\"  File: {issue['filename']}:{issue['line_number']}\")
    "
fi

# For test code (more lenient)
echo -e "\n${YELLOW}Scanning test code (excluding B101)...${NC}"
bandit -r ./tests -f json -o bandit-report-tests.json \
    -s B101 \
    || true

# Summary
echo -e "\n${GREEN}Security Scan Complete!${NC}"
echo -e "Reports generated:"
echo -e "  - bandit-report-prod.json (production code)"
echo -e "  - bandit-report-tests.json (test code)"

# Check if there are high severity issues
if [ -f bandit-report-prod.json ]; then
    high_issues=$(python3 -c "
import json
with open('bandit-report-prod.json', 'r') as f:
    data = json.load(f)
    print(data.get('metrics', {}).get('_totals', {}).get('SEVERITY.HIGH', 0))
    ")

    if [ "$high_issues" -gt 0 ]; then
        echo -e "\n${RED}WARNING: Found $high_issues high severity issues!${NC}"
        exit 1
    fi
fi

echo -e "\n${GREEN}No high severity issues found.${NC}"
