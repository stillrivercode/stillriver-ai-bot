# AI Review Suggestion Formatting Scripts

This directory contains scripts for formatting AI code review suggestions with confidence levels and GitHub suggestion syntax, implementing the UX design patterns specified in the AI Resolvable Comments technical specification.

## Scripts Overview

### format-suggestions.sh
Main formatting script that transforms JSON suggestion data into formatted GitHub comments with confidence-based presentation.

**Features:**
- GitHub ```suggestion syntax for resolvable suggestions
- Confidence level indicators with icons (🔒 Critical, ⚡ High, 💡 Medium, ℹ️ Info)
- Multiple presentation formats (individual, batch, summary)
- Configurable confidence thresholds
- Batch operations and summary generation

**Usage:**
```bash
./format-suggestions.sh -i suggestions.json -t batch -o formatted.md
./format-suggestions.sh --help
```

### validate-suggestions.sh
JSON validation utility that ensures suggestion data meets the required schema.

**Features:**
- JSON structure validation
- Required field validation (confidence, category, description, file_path)
- Optional field validation with warnings
- Statistics reporting
- Strict mode for CI/CD validation

**Usage:**
```bash
./validate-suggestions.sh suggestions.json
./validate-suggestions.sh --strict suggestions.json
```

### demo-formats.sh
Demonstration script showing all formatting options and capabilities.

**Features:**
- Shows all three format types with examples
- Demonstrates custom threshold settings
- Displays validation statistics
- Provides usage examples

**Usage:**
```bash
./demo-formats.sh
```

## JSON Schema

Suggestion objects must follow this schema:

```json
{
  "confidence": 0.95,        // Required: number 0-1
  "category": "Security",    // Required: string
  "description": "...",      // Required: non-empty string
  "file_path": "src/...",    // Required: string
  "suggested_code": "...",   // Optional: string
  "line_start": 42,          // Optional: number
  "line_end": 45             // Optional: number
}
```

## Confidence Thresholds

The scripts implement a four-tier confidence system:

| Confidence Level | Threshold | Icon | Presentation |
|-----------------|-----------|------|--------------|
| **Critical** | ≥95% | 🔒 | Resolvable suggestion with GitHub syntax |
| **High** | 80-94% | ⚡ | Enhanced comment with context |
| **Medium** | 65-79% | 💡 | Regular informational comment |
| **Low** | <65% | ℹ️ | Suppressed/aggregated in summary |

## Format Types

### Individual Format
Standard format showing each suggestion individually with appropriate confidence-based styling.

### Batch Format
Includes a summary header with quick action buttons, followed by individual suggestions organized by confidence level.

### Summary Format
Condensed view grouping suggestions by category with statistics and top suggestions per category.

## Configuration Options

### Confidence Thresholds
- `--threshold-resolvable` (default: 0.95): Minimum confidence for resolvable suggestions
- `--threshold-enhanced` (default: 0.80): Minimum confidence for enhanced comments
- `--threshold-regular` (default: 0.65): Minimum confidence for regular comments

### Rate Limiting
- `--max-resolvable` (default: 5): Maximum resolvable suggestions per PR to prevent overwhelming developers

### Output Options
- `-o, --output FILE`: Output file (default: stdout)
- `-t, --type TYPE`: Format type (individual, batch, summary)

## Examples

### Basic Usage
```bash
# Format suggestions in batch mode
./format-suggestions.sh -i ai-output.json -t batch -o review-comment.md

# Validate suggestion format
./validate-suggestions.sh ai-output.json

# Run demonstration
./demo-formats.sh
```

### Advanced Usage
```bash
# Custom thresholds for stricter quality control
./format-suggestions.sh \
  -i suggestions.json \
  -t batch \
  --threshold-resolvable 0.98 \
  --threshold-enhanced 0.85 \
  --max-resolvable 3

# Strict validation for CI/CD
./validate-suggestions.sh --strict suggestions.json
```

### Integration with AI Workflow
```bash
# Process AI output and create formatted review
ai-analysis-tool --output suggestions.json
./validate-suggestions.sh suggestions.json
./format-suggestions.sh -i suggestions.json -t batch -o pr-review.md
gh pr comment --body-file pr-review.md
```

## Implementation Notes

### UX Design Compliance
The scripts implement the UX patterns specified in the technical specification:
- Critical suggestions use resolvable GitHub syntax requiring developer action
- High-confidence suggestions provide helpful context without forcing resolution
- Medium-confidence suggestions offer informational feedback
- Low-confidence suggestions are aggregated to reduce noise

### Quality Controls
- Maximum 5 resolvable suggestions per PR (configurable)
- Confidence threshold validation
- JSON schema enforcement
- Duplicate detection prevention
- Rate limiting to prevent overwhelming developers

### Error Handling
- Graceful degradation for invalid JSON
- Clear error messages for validation failures
- Fallback behaviors for missing optional fields
- Comprehensive logging and debug output

## Testing

The directory includes test data (`test-suggestions.json`) demonstrating various confidence levels and categories. Run the demo script to see all formatting options in action.

## Integration

These scripts are designed to integrate with:
- GitHub Actions workflows
- AI code analysis tools
- OpenRouter/OpenAI API responses
- Existing code review processes
- CI/CD quality gates

For more information about the overall AI Resolvable Comments system, see the [technical specification](../../docs/specs/ai-resolvable-comments-spec.md).
