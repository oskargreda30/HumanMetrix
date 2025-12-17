#!/bin/bash

# HumanMetrix Load Testing Suite
# Usage: ./load-tests/run-tests.sh [test-type]
# test-type: quick | standard | stress | auth | all

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create results directory
mkdir -p "$RESULTS_DIR"

echo "=========================================="
echo "HumanMetrix Load Testing Suite"
echo "=========================================="
echo ""

run_test() {
    local test_name=$1
    local config_file=$2
    local output_file="$RESULTS_DIR/${test_name}_${TIMESTAMP}.json"
    
    echo "Running $test_name test..."
    echo "Config: $config_file"
    echo "Results: $output_file"
    echo ""
    
    npx artillery run "$config_file" --output "$output_file" 2>&1
    
    echo ""
    echo "Generating HTML report..."
    npx artillery report "$output_file" --output "${output_file%.json}.html" 2>/dev/null || true
    
    echo "$test_name test completed!"
    echo ""
}

case "${1:-quick}" in
    quick)
        echo "Running quick smoke test (30 seconds)..."
        run_test "quick" "$SCRIPT_DIR/quick-test.yml"
        ;;
    standard)
        echo "Running standard load test (3 minutes)..."
        run_test "standard" "$SCRIPT_DIR/artillery.config.yml"
        ;;
    stress)
        echo "Running stress test (5 minutes) - WARNING: May impact server!"
        run_test "stress" "$SCRIPT_DIR/stress-test.yml"
        ;;
    auth)
        echo "Running auth rate limit test (1 minute)..."
        run_test "auth" "$SCRIPT_DIR/auth-stress.yml"
        ;;
    all)
        echo "Running all tests sequentially..."
        run_test "quick" "$SCRIPT_DIR/quick-test.yml"
        sleep 5
        run_test "standard" "$SCRIPT_DIR/artillery.config.yml"
        sleep 5
        run_test "auth" "$SCRIPT_DIR/auth-stress.yml"
        sleep 5
        run_test "stress" "$SCRIPT_DIR/stress-test.yml"
        ;;
    *)
        echo "Usage: $0 [quick|standard|stress|auth|all]"
        echo ""
        echo "Test types:"
        echo "  quick    - 30 second smoke test (default)"
        echo "  standard - 3 minute progressive load test"
        echo "  stress   - 5 minute stress test up to 200 req/sec"
        echo "  auth     - 1 minute auth endpoint rate limit test"
        echo "  all      - Run all tests sequentially"
        exit 1
        ;;
esac

echo "=========================================="
echo "Test completed! Results saved to:"
echo "$RESULTS_DIR"
echo "=========================================="
