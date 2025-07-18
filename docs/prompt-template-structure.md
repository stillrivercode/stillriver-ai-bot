# Prompt Template Structure

This document describes the structure of the prompt templates used by the AI PR Review Action.

## Base Prompt Template

The action constructs prompts using a structured template with the following sections:

### 1. Introduction
```
Please conduct a {reviewType} for the following pull request.
```
Where `{reviewType}` is replaced with the selected review type (e.g., "Security Review", "Performance Review", "Comprehensive Code Review").

### 2. PR Context
```
**PR Title:** {prTitle}
**PR Description:**
{prBody}
```
Provides the AI with context about the pull request's purpose and goals.

### 3. Changed Files
```
**Changed Files:**
{diffs}
```
Contains the actual code changes in diff format. Each file is formatted as:
```
File: {filename}
```diff
{patch}
```
```

### 4. Review Guidelines
```
**Review Guidelines:**
{guidelines}

**Focus Areas:**
{focusAreas}
```
These are populated based on the review type selected:
- **Security**: Focus on vulnerabilities, authentication, input validation
- **Performance**: Focus on efficiency, algorithms, resource usage
- **Comprehensive**: Covers all aspects of code quality

### 5. Outro (Optional)
```
Please provide specific, actionable feedback with line numbers where applicable.
```

## Custom Review Rules Integration

When `custom_review_rules` is provided, the template can be modified in several ways:

### Custom Rules Format (JSON)
```json
{
  "title": "Custom Security Review",
  "description": "Focus on OWASP Top 10 vulnerabilities",
  "guidelines": [
    "Check for SQL injection vulnerabilities",
    "Verify proper authentication"
  ],
  "focusAreas": [
    "Input validation",
    "Session management"
  ],
  "examples": [
    "Use parameterized queries instead of string concatenation"
  ],
  "additionalInstructions": "Pay special attention to database queries"
}
```

### How Custom Rules Modify the Template

1. **Title & Description**: Override the default review type title
2. **Guidelines**: Replace or extend the default guidelines
3. **Focus Areas**: Replace or extend the default focus areas
4. **Examples**: Added as a new section when provided
5. **Additional Instructions**: Appended after the main template sections

## Example Complete Prompt

For a security review with custom rules:

```
Please conduct a Custom Security Review for the following pull request.

**PR Title:** Add user authentication endpoint
**PR Description:**
Implements JWT-based authentication for the API

**Changed Files:**
File: src/auth.js
```diff
+ function authenticate(username, password) {
+   const query = `SELECT * FROM users WHERE username = '${username}'`;
+   // ... rest of diff
```

**Review Guidelines:**
- Check for SQL injection vulnerabilities
- Verify proper authentication

**Focus Areas:**
- Input validation
- Session management

**Examples:**
- Use parameterized queries instead of string concatenation

**Additional Instructions:**
Pay special attention to database queries

Please provide specific, actionable feedback with line numbers where applicable.
```

## Diff Truncation

For large PRs, diffs are automatically truncated to fit within token limits:
- The action calculates available tokens based on `max_tokens` input
- Reserves ~1000 tokens for the prompt template and AI response
- Distributes remaining tokens among changed files
- Preserves the beginning and end of large diffs
- Inserts `[TRUNCATED - diff too large]` in the middle when truncation occurs

## Tips for Custom Rules

1. **Be Specific**: More specific guidelines yield better AI feedback
2. **Provide Examples**: Concrete examples help the AI understand expectations
3. **Focus on Your Domain**: Tailor rules to your specific technology stack
4. **Iterate**: Refine your custom rules based on the quality of reviews received
