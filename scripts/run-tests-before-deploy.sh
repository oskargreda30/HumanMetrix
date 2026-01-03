#!/bin/bash

# Pre-deployment test runner script
# This script runs comprehensive tests before deployment
# Tests can be skipped by toggling off in the admin dashboard (System Settings)

set -e

echo "=========================================="
echo "Pre-Deployment Test Runner"
echo "=========================================="

# Check the database setting via CLI script
echo "Checking admin dashboard setting from database..."
# Run the script - it outputs debug info to stderr and result to stdout
# Use a temp file to capture stdout while letting stderr through
TEMP_RESULT_FILE=$(mktemp)
npx tsx scripts/check-test-setting.ts > "$TEMP_RESULT_FILE" 2>&1
cat "$TEMP_RESULT_FILE"  # Show all output in logs
SETTING_RESULT=$(grep -E "^(RUN_TESTS|SKIP_TESTS)$" "$TEMP_RESULT_FILE" | tail -n1)
rm -f "$TEMP_RESULT_FILE"
# Fallback if script fails or no valid result found
if [ -z "$SETTING_RESULT" ]; then
  echo "Warning: Could not determine test setting, defaulting to RUN_TESTS"
  SETTING_RESULT="RUN_TESTS"
fi

if [ "$SETTING_RESULT" = "SKIP_TESTS" ]; then
  echo "Admin dashboard setting: Tests DISABLED"
  echo "Proceeding directly to build..."
  exit 0
fi

echo "Admin dashboard setting: Tests ENABLED"
echo ""
echo "Running comprehensive test suite..."
echo ""

# Run unit tests
echo "----------------------------------------"
echo "Running Unit Tests..."
echo "----------------------------------------"
npx vitest run tests/unit --reporter=verbose || {
  echo ""
  echo "ERROR: Unit tests failed! Deployment blocked."
  echo "Fix the failing tests and try again."
  exit 1
}
echo "Unit tests passed!"
echo ""

# Run integration tests  
echo "----------------------------------------"
echo "Running Integration Tests..."
echo "----------------------------------------"
npx vitest run tests/integration --reporter=verbose || {
  echo ""
  echo "ERROR: Integration tests failed! Deployment blocked."
  echo "Fix the failing tests and try again."
  exit 1
}
echo "Integration tests passed!"
echo ""

# E2E tests note
echo "----------------------------------------"
echo "E2E Tests"
echo "----------------------------------------"
echo "Note: E2E tests are run via Playwright testing tool during development"
echo "      They are not run automatically during deployment."
echo ""

echo "=========================================="
echo "All tests passed! Proceeding to build..."
echo "=========================================="
exit 0
