#!/bin/bash

# Pre-deployment test runner script
# This script runs comprehensive tests before deployment
# Tests can be skipped by:
#   1. Setting SKIP_DEPLOY_TESTS=true environment variable
#   2. Disabling tests in the admin dashboard (System Settings)

set -e

echo "=========================================="
echo "Pre-Deployment Test Runner"
echo "=========================================="

# First check environment variable (takes precedence for quick overrides)
if [ "$SKIP_DEPLOY_TESTS" = "true" ] || [ "$SKIP_DEPLOY_TESTS" = "1" ]; then
  echo "SKIP_DEPLOY_TESTS environment variable is set - skipping all tests"
  echo "Proceeding directly to build..."
  exit 0
fi

# Check if we should query the admin setting
# During build, the app may not be running, so we use the env var as primary
# The API check is optional and can be enabled when the app is accessible
if [ -n "$CHECK_ADMIN_SETTING" ] && [ "$CHECK_ADMIN_SETTING" = "true" ]; then
  echo "Checking admin dashboard setting..."
  
  # Try to fetch the setting from the running app
  API_URL="${APP_URL:-http://localhost:5000}"
  RESPONSE=$(curl -s --max-time 5 "${API_URL}/api/build/should-run-tests" 2>/dev/null || echo '{"shouldRunTests":true}')
  
  SHOULD_RUN=$(echo "$RESPONSE" | grep -o '"shouldRunTests":[^,}]*' | cut -d':' -f2 | tr -d ' ')
  
  if [ "$SHOULD_RUN" = "false" ]; then
    echo "Admin dashboard setting: Tests disabled"
    echo "Proceeding directly to build..."
    exit 0
  fi
  
  echo "Admin dashboard setting: Tests enabled"
fi

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
