#!/bin/bash

# Pre-deployment test runner script
# This script runs comprehensive tests before deployment
# Tests can be skipped by setting SKIP_DEPLOY_TESTS=true

set -e

echo "=========================================="
echo "Pre-Deployment Test Runner"
echo "=========================================="

# Check if tests should be skipped
if [ "$SKIP_DEPLOY_TESTS" = "true" ] || [ "$SKIP_DEPLOY_TESTS" = "1" ]; then
  echo "SKIP_DEPLOY_TESTS is enabled - skipping all tests"
  echo "Proceeding directly to build..."
  exit 0
fi

echo "Running comprehensive test suite..."
echo ""

# Run unit tests
echo "----------------------------------------"
echo "Running Unit Tests..."
echo "----------------------------------------"
npx vitest run --dir tests/unit --reporter=verbose || {
  echo "Unit tests failed! Deployment blocked."
  exit 1
}
echo "Unit tests passed!"
echo ""

# Run integration tests  
echo "----------------------------------------"
echo "Running Integration Tests..."
echo "----------------------------------------"
npx vitest run --dir tests/integration --reporter=verbose || {
  echo "Integration tests failed! Deployment blocked."
  exit 1
}
echo "Integration tests passed!"
echo ""

# E2E tests would go here if configured with Playwright
# For now, we'll note that e2e tests are handled separately by the run_test tool
echo "----------------------------------------"
echo "E2E Tests"
echo "----------------------------------------"
echo "Note: E2E tests are run via Playwright testing tool during development"
echo ""

echo "=========================================="
echo "All tests passed! Proceeding to build..."
echo "=========================================="
exit 0
