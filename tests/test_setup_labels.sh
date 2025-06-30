#!/bin/bash

# Test for setup-labels.sh script
# This test verifies that the script calls the 'gh' command with the correct arguments.

# Mock the gh command
gh() {
  echo "Mock gh command called with: $@" >> gh_mock.log
}

# Source the script to be tested
source ./scripts/setup-labels.sh

# Run the script's main function if it has one, or just source it to make functions available.
# In this case, sourcing is enough.

# Verify that the gh command was called with the expected arguments
if ! grep -q "label create ai-workflow --color 7057FF --description AI workflow development and improvements --force" gh_mock.log; then
  echo "Test failed: 'gh label create' not called for 'ai-workflow'"
  exit 1
fi

if ! grep -q "label create release --color 00FF00 --description Ready for release - triggers npm publishing when PR merged to main --force" gh_mock.log; then
    echo "Test failed: 'gh label create' not called for 'release'"
    exit 1
fi

echo "All tests passed!"

# Clean up
rm gh_mock.log
