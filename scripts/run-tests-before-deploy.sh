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
SETTING_RESULT=$(npx tsx scripts/check-test-setting.ts 2>/dev/null || echo "RUN_TESTS")

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
