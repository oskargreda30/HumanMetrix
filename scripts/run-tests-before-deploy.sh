#!/bin/bash

# Pre-deployment test runner script
# This script runs comprehensive tests before deployment
# Tests can be skipped by:
#   1. Setting SKIP_DEPLOY_TESTS=true environment variable
#   2. Toggling off in the admin dashboard (System Settings)

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

# Check the config file written by admin dashboard toggle
CONFIG_FILE="./.test-config.json"
if [ -f "$CONFIG_FILE" ]; then
  echo "Found test configuration file..."
  
  # Parse the skipTests value from JSON
  SKIP_TESTS=$(cat "$CONFIG_FILE" | grep -o '"skipTests":[^,}]*' | cut -d':' -f2 | tr -d ' ')
  
  if [ "$SKIP_TESTS" = "true" ]; then
    UPDATED_BY=$(cat "$CONFIG_FILE" | grep -o '"updatedBy":"[^"]*"' | cut -d'"' -f4)
    UPDATED_AT=$(cat "$CONFIG_FILE" | grep -o '"updatedAt":"[^"]*"' | cut -d'"' -f4)
    echo "Admin dashboard setting: Tests DISABLED"
    echo "  Disabled by: $UPDATED_BY"
    echo "  Disabled at: $UPDATED_AT"
    echo ""
    echo "Proceeding directly to build..."
    exit 0
  fi
  
  echo "Admin dashboard setting: Tests ENABLED"
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
