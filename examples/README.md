# Custom Review Rules Examples

This directory contains example custom review rules files that can be used with the AI PR Review Action to customize the review process for specific project needs.

## Available Examples

### 🔒 Security-Focused Review
**File:** `custom-rules-security-focus.json`
- **Use Case:** High-security applications, financial services, healthcare
- **Focus:** OWASP Top 10, input validation, authentication, cryptography
- **Best For:** Applications handling sensitive data or requiring compliance

### ⚡ Performance Optimization Review
**File:** `custom-rules-performance-optimization.json`
- **Use Case:** High-traffic applications, microservices, real-time systems
- **Focus:** Algorithm efficiency, database optimization, caching, scalability
- **Best For:** Performance-critical applications and bottleneck identification

### ⚛️ TypeScript React Review
**File:** `custom-rules-typescript-react.json`
- **Use Case:** React applications with TypeScript
- **Focus:** Component patterns, type safety, accessibility, React best practices
- **Best For:** Frontend applications, component libraries, React-based projects

### 🚀 Node.js API Review
**File:** `custom-rules-node-api.json`
- **Use Case:** REST APIs, microservices, backend applications
- **Focus:** RESTful design, authentication, validation, middleware, monitoring
- **Best For:** Backend services, API gateways, server-side applications

### 🏗️ Code Quality Review
**File:** `custom-rules-code-quality.json`
- **Use Case:** General code quality and maintainability
- **Focus:** Code organization, documentation, testing, technical debt
- **Best For:** Legacy code improvement, team coding standards, refactoring projects

## How to Use

### 1. Choose an Example
Select the custom rules file that best matches your project type and requirements.

### 2. Copy to Your Repository
Copy the chosen JSON file to your repository, typically in a `.github/` or `docs/` directory:

```bash
cp examples/custom-rules-security-focus.json .github/custom-review-rules.json
```

### 3. Customize the Rules
Edit the copied file to match your specific requirements:

```json
{
  "title": "Your Project Security Review",
  "description": "Custom security review for your specific needs",
  "guidelines": [
    "Your specific guidelines here"
  ],
  "focusAreas": [
    "Your focus areas"
  ],
  "additionalInstructions": "Any additional context or requirements"
}
```

### 4. Configure Your Workflow
Update your GitHub Actions workflow to use the custom rules:

```yaml
- name: AI PR Review
  uses: stillrivercode/stillriver-ai-bot@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    openrouter_api_key: ${{ secrets.OPENROUTER_API_KEY }}
    model: 'anthropic/claude-3.5-sonnet'
    review_type: 'security'  # or 'performance', 'comprehensive'
    custom_review_rules: '.github/custom-review-rules.json'
```

## Custom Rules Structure

Custom review rules files use the following JSON structure:

```json
{
  "title": "Review Title (overrides base review type title)",
  "description": "Description of the review focus",
  "guidelines": [
    "Specific guidelines for reviewers to follow",
    "Each guideline should be actionable and clear"
  ],
  "focusAreas": [
    "Specific areas to pay attention to",
    "These appear as bullet points in the review prompt"
  ],
  "examples": [
    "Concrete examples of what to look for",
    "Best practices to suggest"
  ],
  "additionalInstructions": "Free-form additional context and instructions"
}
```

### Field Descriptions

- **title** *(optional)*: Overrides the default review type title
- **description** *(optional)*: Brief description of the review's purpose
- **guidelines** *(optional)*: Array of specific review guidelines
- **focusAreas** *(optional)*: Array of areas to focus on during review
- **examples** *(optional)*: Array of concrete examples or suggestions
- **additionalInstructions** *(optional)*: Free-form additional context

### Merging Behavior

Custom rules are merged with base review configurations:
- If a field is provided in custom rules, it overrides the base configuration
- If a field is missing, the base configuration is used as fallback
- This allows for partial customization while maintaining sensible defaults

## Best Practices

### 1. Be Specific
- Use concrete, actionable guidelines
- Provide specific examples relevant to your codebase
- Focus on measurable outcomes

### 2. Maintain Consistency
- Use consistent terminology across your custom rules
- Align with your team's coding standards and practices
- Keep the language clear and professional

### 3. Regular Updates
- Update custom rules as your project evolves
- Incorporate lessons learned from previous reviews
- Remove outdated or irrelevant guidelines

### 4. Team Collaboration
- Involve your team in creating and maintaining custom rules
- Review and discuss the effectiveness of custom rules regularly
- Consider different rules for different types of changes (features, bug fixes, refactoring)

## Troubleshooting

### File Not Found
If you get a "file not found" error:
- Verify the path in your workflow is correct
- Ensure the file is committed to your repository
- Check file permissions and accessibility

### Invalid JSON
If you get a JSON parsing error:
- Validate your JSON syntax using a JSON validator
- Check for trailing commas, missing quotes, or other syntax errors
- Ensure all strings are properly escaped

### No Effect
If custom rules don't seem to be applied:
- Check the action logs for warnings about loading custom rules
- Verify the file structure matches the expected format
- Ensure you're using a compatible version of the action

## Contributing

Have a useful custom rules example? Consider contributing it to this collection by:
1. Creating a new example file following the naming convention
2. Adding documentation to this README
3. Submitting a pull request with your contribution

## Support

For questions about custom review rules:
- Check the main project documentation
- Review the action's GitHub repository
- Open an issue for bugs or feature requests
