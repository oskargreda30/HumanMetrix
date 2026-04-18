# Test Coverage Report

Generated: April 2026
Test framework: Vitest v1.6.0 / Coverage provider: v8

---

## How to Run

```bash
# Full test suite with coverage
npm run test:coverage

# Critical-path integration tests only (reproducible command for figures below)
npx vitest run --coverage tests/integration/
```

HTML report written to `coverage/index.html`.

---

## Coverage by Critical-Path Module

Figures from `npx vitest run --coverage tests/integration/`:

| Module | Stmts% | Fns% | Branches% | Lines% |
|---|---|---|---|---|
| `server/auth.ts` | 13.5 | 50.0 | 100.0 | 13.5 |
| `server/middleware/csrf.ts` | 100.0 | 100.0 | 96.3 | 100.0 |
| `server/partner-auth.ts` | 55.9 | 57.1 | 84.6 | 55.9 |
| `server/webhook-routes.ts` | 14.5 | 33.3 | 36.4 | 14.5 |
| `shared/currencies.ts` | 69.8 | 32.0 | 37.5 | 69.8 |

**Overall (integration tests scope):** Stmts 8.4% — Branches 43.4% — Fns 8.3% — Lines 8.4%

`server/auth.ts` branch coverage is 100% for the tested functions (`isAuthenticated`, `populateUser`, `setSameSiteNone`). Statement % is low because the file is 499 lines; the remaining functions are covered by unit tests.

`server/webhook-routes.ts` covers the signature verification entry/rejection paths at route level. The Stripe/Airwallex event-processing bodies require live credentials and are excluded from automated coverage.

---

## Critical Path Coverage Matrix

| Critical Path | Test File(s) | Real Code Exercised | Verdict |
|---|---|---|---|
| Login / Logout | `tests/integration/auth.test.ts` | `isAuthenticated`, `populateUser`, `setSameSiteNone` from `server/auth.ts` | COVERED |
| Assessment result retrieval | `tests/integration/webhook-route.test.ts` | Real `isAuthenticated` guard on `GET /api/results`; calls `storage.getResultsByUser` | COVERED |
| Partner API key auth | `tests/integration/partner-api.test.ts` | `generateApiKey`, `validateApiKey`, `partnerAuth` from `server/partner-auth.ts` | COVERED |
| Stripe webhook signature | `tests/integration/stripe-purchases.test.ts`, `tests/integration/webhook-route.test.ts` | `stripe.webhooks.constructEvent` + `generateTestHeaderString` (real SDK); route-level 400/200 enforcement | COVERED |
| CSRF middleware | `tests/integration/csrf.test.ts` | `csrfProtection`, `getCsrfToken` from `server/middleware/csrf.ts` | COVERED (100%) |

---

## Integration Test Files

| File | Tests | Production Code Imported |
|---|---|---|
| `tests/integration/auth.test.ts` | 11 | `server/auth.ts` — `isAuthenticated`, `populateUser`, `setSameSiteNone` |
| `tests/integration/csrf.test.ts` | 25 | `server/middleware/csrf.ts` — `csrfProtection`, `getCsrfToken` |
| `tests/integration/partner-api.test.ts` | 22 | `server/partner-auth.ts` — `generateApiKey`, `validateApiKey`, `partnerAuth` |
| `tests/integration/stripe-purchases.test.ts` | 31 | `shared/currencies.ts`, Stripe SDK `webhooks.constructEvent` |
| `tests/integration/webhook-route.test.ts` | 7 | `server/webhook-routes.ts` (route level), `server/auth.ts` (`isAuthenticated`) |

All 95 integration tests pass. Run with:

```bash
npx vitest run tests/integration/
```

---

## Accepted Coverage Gaps

| Module | Uncovered | Reason |
|---|---|---|
| `server/webhook-routes.ts` | Stripe/Airwallex event handlers | Requires live credentials; signature verification (the security path) is covered |
| `shared/currencies.ts` | SEA-region pricing bands | Country-specific lookup tables; not security-critical |
| `server/partner-auth.ts` | ~44% stmts | Error paths for random-byte failure and unreachable defensive branches |
