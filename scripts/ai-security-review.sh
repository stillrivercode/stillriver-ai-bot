#!/bin/bash

# AI Security Review Script
# Performs AI-powered security analysis on code changes

set -e

ISSUE_NUMBER="$1"
ISSUE_TITLE="$2"
ISSUE_BODY="$3"

echo "🔒 Starting AI Security Review for Issue #$ISSUE_NUMBER"

# Create security analysis prompt
SECURITY_PROMPT="# Security Review Request

## Issue Details
- **Issue #**: $ISSUE_NUMBER
- **Title**: $ISSUE_TITLE
- **Description**: $ISSUE_BODY

## Security Analysis Requirements

Please perform a comprehensive security analysis of the codebase focusing on:

### 1. Authentication & Authorization
- Verify proper authentication mechanisms
- Check for authorization bypass vulnerabilities
- Review session management
- Validate token handling

### 2. Input Validation & Sanitization
- Check for SQL injection vulnerabilities
- Verify XSS prevention measures
- Review file upload security
- Validate input sanitization

### 3. Data Protection
- Review sensitive data handling
- Check encryption implementations
- Verify secure storage practices
- Validate data transmission security

### 4. Configuration Security
- Review security configuration
- Check for hardcoded secrets
- Verify environment variable usage
- Validate secure defaults

### 5. Dependency Security
- Review third-party dependencies
- Check for known vulnerabilities
- Verify dependency management
- Validate update practices

### 6. Error Handling
- Check for information disclosure
- Review error message security
- Verify logging practices
- Validate exception handling

### 7. API Security
- Review API endpoint security
- Check rate limiting
- Verify CORS configuration
- Validate API authentication

Please provide:
1. **Security Assessment**: Overall security posture
2. **Critical Issues**: Any critical security vulnerabilities found
3. **Recommendations**: Specific security improvements
4. **Compliance**: Any regulatory compliance considerations
5. **Risk Rating**: Overall risk level (Low/Medium/High/Critical)

Focus on practical, actionable security recommendations."

# Run AI security analysis
echo "🤖 Running AI-powered security analysis..."

# Use Claude Code to perform security analysis
claude "$SECURITY_PROMPT" --model claude-3-5-sonnet-20241022 > ai-security-analysis.md

# Append AI analysis to security report
echo "" >> security-report.md
echo "## AI-Powered Security Analysis" >> security-report.md
echo "" >> security-report.md
cat ai-security-analysis.md >> security-report.md

# Check for critical security issues
if grep -q -i "critical\|high risk\|vulnerability\|security issue" ai-security-analysis.md; then
    echo "⚠️  Critical security issues detected!"
    echo "critical_issues_found=true" >> $GITHUB_OUTPUT
else
    echo "✅ No critical security issues detected"
    echo "critical_issues_found=false" >> $GITHUB_OUTPUT
fi

echo "🔒 AI Security Review completed"
