# HumanMetrix Load Testing

Load testing configuration using Artillery.io to test application performance under load.

## Prerequisites

Install Artillery globally:
```bash
npm install -g artillery@latest
npm install -g artillery-plugin-expect
```

## Running Tests

### Quick test (5 concurrent users for 30 seconds)
```bash
artillery quick --count 5 -n 30 https://humanmetrix.replit.app
```

### Full load test
```bash
artillery run load-tests/artillery.yml
```

### Generate HTML report
```bash
artillery run load-tests/artillery.yml --output load-tests/results.json
artillery report load-tests/results.json --output load-tests/report.html
```

## Test Scenarios

| Scenario | Weight | Description |
|----------|--------|-------------|
| Landing page browsing | 40% | Simulates visitors browsing public pages |
| Login flow | 30% | Attempts login with random credentials |
| API health checks | 20% | Tests API endpoint responses |
| Static assets | 10% | Loads additional static pages |

## Load Phases

1. **Warm up** (1 min): 5 users/sec
2. **Ramp up** (2 min): 15 users/sec
3. **Sustained** (3 min): 30 users/sec
4. **Peak** (1 min): 50 users/sec

## Key Metrics to Watch

- **Response time p95**: Should stay under 500ms
- **Error rate**: Should stay under 1%
- **Requests/sec**: Target 25-30 sustained

## Current Capacity Estimate

Based on architecture analysis:
- ~40 concurrent active users
- ~25-30 requests/second
- Single Node.js process (no clustering)

## Scaling Recommendations Implemented

1. Response compression (gzip) - reduces bandwidth
2. Email queue - prevents SMTP blocking
3. OpenAI scoring queue - async processing
4. Database pool (20 connections) - higher concurrency
5. Graceful shutdown - clean queue draining
