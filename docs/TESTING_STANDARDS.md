# Testing Standards and Best Practices

This document outlines the testing standards and conventions for this project to ensure consistent,
high-quality test code.

## Test File Structure

All test files must follow these conventions:

### 1. File Header

```python
#!/usr/bin/env python3
"""
Module description explaining what this test file validates.
"""
```

### 2. Imports

```python
import os
import pytest
from pathlib import Path
# Other imports as needed
```

### 3. Test Class Structure

Use pytest classes to organize related tests:

```python
class TestFeatureName:
    """Test class description."""

    def setup_method(self):
        """Setup test environment before each test."""
        self.test_data = "example"

    def teardown_method(self):
        """Cleanup after each test."""
        # Cleanup code if needed

    def test_specific_functionality(self):
        """Test description explaining what is being validated."""
        # Test implementation
```

## Required Test Components

### 1. Docstrings

- **Module level**: Explain the purpose of the test file
- **Class level**: Describe what group of functionality is being tested
- **Method level**: Explain what specific behavior is being validated

### 2. Meaningful Test Names

Test method names should clearly indicate what is being tested:

- ✅ `test_workflow_validates_required_fields()`
- ❌ `test_1()`

### 3. Comprehensive Coverage

Each test file should include:

- **Positive test cases**: Verify expected behavior works
- **Negative test cases**: Verify error handling
- **Edge cases**: Test boundary conditions
- **Integration tests**: Test component interactions

### 4. Descriptive Assertions

Use clear assertion messages:

```python
assert workflow_data is not None, "Workflow should contain valid YAML"
assert 'name' in workflow_data, "Workflow should have a name field"
```

## Example Test Structure

Here's a complete example following all conventions:

```python
#!/usr/bin/env python3
"""
Test suite for validating AI workflow functionality.
"""

import os
import pytest
from pathlib import Path


class TestAIWorkflow:
    """Test AI workflow integration and functionality."""

    def setup_method(self):
        """Setup test environment."""
        self.repo_root = Path(__file__).parent.parent
        self.workflows_dir = self.repo_root / ".github" / "workflows"

    def test_workflow_file_exists(self):
        """Test that required workflow files exist."""
        ai_task_file = self.workflows_dir / "ai-task.yml"
        assert ai_task_file.exists(), "ai-task.yml workflow file should exist"
        assert ai_task_file.is_file(), "ai-task.yml should be a regular file"

    def test_workflow_structure(self):
        """Test that workflow has required structure and fields."""
        # Implementation with comprehensive checks

    def test_workflow_triggers(self):
        """Test that workflow responds to correct GitHub events."""
        # Test trigger configuration

    def test_error_handling(self):
        """Test workflow handles errors gracefully."""
        # Test error scenarios


class TestIssueTemplates:
    """Test GitHub issue templates."""

    def setup_method(self):
        """Setup test environment for issue template tests."""
        self.repo_root = Path(__file__).parent.parent
        self.templates_dir = self.repo_root / ".github" / "ISSUE_TEMPLATE"

    def test_ai_task_template_exists(self):
        """Test that AI task issue template exists and is valid."""
        template_file = self.templates_dir / "ai-task.md"
        assert template_file.exists(), "AI task template should exist"
```

## Common Pitfalls to Avoid

1. **Placeholder Tests**: Never create tests that just return `True`
2. **Missing Error Messages**: Always include descriptive assertion messages
3. **Hardcoded Paths**: Use `Path(__file__).parent` for relative paths
4. **No Setup/Teardown**: Use `setup_method()` for test initialization
5. **Poor Test Isolation**: Each test should be independent

## Running Tests

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_workflow_syntax.py

# Run with coverage
pytest --cov=.
```

## Test File Checklist

Before submitting test code, ensure:

- [ ] File has proper shebang and module docstring
- [ ] All imports are at the top of the file
- [ ] Tests use pytest class structure
- [ ] Every test method has a descriptive docstring
- [ ] Assertions include helpful error messages
- [ ] Both positive and negative cases are tested
- [ ] No placeholder or trivial tests
- [ ] Setup/teardown methods are used appropriately
- [ ] Test names clearly indicate what is being tested
- [ ] Code follows project style guidelines
