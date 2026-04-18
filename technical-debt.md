# Technical Debt Register — HumanMetrix

_Last updated: 2026-04-18_

---

## Recent Fixes (this session)

### Bug-Fix 1 & 2 — AI cost logging in `/api/partner/me/compare` (individual & bulk)
- **Problem**: `logAiCost` was called with `operationType: PROFILE_INSIGHTS` (wrong) and `completion.usage` was accessed without a null-guard, risking a crash if the OpenAI response omitted usage data.
- **Fix**: Changed to `operationType: PROFILE_INSIGHTS_PARTNER`, wrapped access in `if (completion.usage)`, and used the `extractUsage()` helper for consistent field extraction.
- **Files**: `server/routes.ts` lines ~15246, ~15338.

### Bug-Fix 3 & 4 — FK violation in AI cost logging for partner compare endpoint
- **Problem**: `userId: candidateId as string` was passed to `logAiCost` in the PROMPT_ROLE_FIT and AIQ_ROLE_FIT call sites. `candidateId` may be a candidate e-mail address, not a valid `users.id`, causing a foreign-key constraint violation on `ai_usage_log.user_id`.
- **Fix**: Changed to `userId: req.user.id` (the authenticated partner user), which is always a valid FK.
- **Files**: `server/routes.ts` lines ~15980, ~16026.

### Extraction 1 — Payment/billing routes → `server/payment-routes.ts`
- Moved: `POST /api/validate-discount`, `GET /api/exchange-rates`, `POST /api/checkout-free`, `POST /api/create-free-purchase`, `POST /api/create-checkout-session-guest`, `POST /api/create-checkout-session`.
- All request parameters are typed (`req: Request`, no `req: any`); typed `AuthenticatedRequest` interface used for guarded handlers.
- **TypeScript `any` count in file**: 0.

### Extraction 2 — Assessment lifecycle routes → `server/assessment-routes.ts`
- Moved: `POST /api/assessments/:id/heartbeat`, `/pause`, `/resume`, `/abandon`, `/status`.
- All handlers use typed `AuthenticatedRequest`; `catch (error: unknown)` with `instanceof Error` narrowing.
- **TypeScript `any` count in file**: 0.
- **Scope note**: Only the lifecycle/session-control endpoints were extracted. The assessment *submit* and *results* endpoints (`/api/assessments/:id/submit`, `/api/assessments/:id/result`) remain in `routes.ts`. They depend on large inline closures (`calculatePromptArchitectureScores`, scoring lambdas) defined inside `registerRoutes` that close over local context. Safely extracting them requires first promoting those helpers to standalone exports in `server/scoring.ts` — that is tracked separately as a blocked item (see Remaining Debt §4).

### Extraction 3 — Webhook handlers → `server/webhook-routes.ts`
- Moved: `POST /api/webhooks/airwallex` (×2 variants), `POST /api/webhooks/stripe`, `POST /api/webhooks/sendgrid`.
- Typed `Request`/`Response` imports; `catch (error: unknown)` throughout; payload objects cast via typed interfaces (`Stripe.Event`, `AirwallexWebhookEvent`); no `req: any`.
- **TypeScript `any` count in file**: 0.

### TypeScript compiler check (as of 2026-04-18)
Running `npx tsc --noEmit` against the full project returns **0 "error TS" diagnostics**.

### Remaining `any` usages by file
Counted with `grep -c ": any\|as any\| any "` on 2026-04-18.

| File | `any` count |
|---|---|
| `server/payment-routes.ts` | 0 |
| `server/assessment-routes.ts` | 0 |
| `server/webhook-routes.ts` | 0 |
| `server/evaluation-progress.ts` | 0 |
| `server/routes.ts` (legacy monolith) | **583** (`: any` annotations only) |

---

## Remaining Debt

### 1. Monolith — `server/routes.ts`
- **Current size**: ~24,487 lines after this session's extractions (~1,200+ lines removed across all 3 extractions).
- **Impact**: Merge conflicts, long build times, cognitive overhead, inability to unit-test individual route handlers.
- **Patterns to fix**: Large inline helper functions (`calculatePromptArchitectureScores`, `getEvaluationProgress`, scoring lambdas) defined inside `registerRoutes`; these prevent safe extraction of the submit/status endpoints.

### 2. TypeScript strictness — `noImplicitAny` violations in `routes.ts`
- **Concrete count**: `routes.ts` contains **583** `: any` usages (measured 2026-04-18).
- `tsconfig.json` does not enable `strict` or `noImplicitAny`.
- All request handlers in the legacy monolith use `req: any` rather than typed Express generics.
- **Impact**: Entire class of type-safety bugs go undetected at compile time.
- **Contrast**: All 4 extracted modules (payment, assessment, webhook, evaluation-progress) have 0 `any` usages.

### 3. `B2C_DISCOUNT_CODES` duplication
- The constant is defined in both `routes.ts` (for the Stripe checkout flow and process-payment-success) and `payment-routes.ts` (for the validation endpoint and new checkout session routes).
- **Fix**: Extract to `shared/config/discounts.ts` and import from both.

### 4. Inline helpers inside `registerRoutes`
- `calculatePromptArchitectureScores`, `getEvaluationProgress`, and similar large closures are defined inside the top-level async function.
- They close over nothing that requires them to be inline — they should be standalone exported functions in `server/scoring.ts` or similar.
- **Blocked by**: The submit endpoint (which calls these helpers) is too complex to safely move without test coverage.

### 5. No unit or integration test coverage for routes
- Zero tests exist for `routes.ts` route handlers.
- The new `payment-routes.ts`, `assessment-routes.ts`, and `webhook-routes.ts` are also untested.
- **Impact**: Regressions in payment flows or assessment lifecycle go undetected until production.

### 6. Rate limiting is memory-only
- `express-rate-limit` stores counters in-process RAM; restarting the server resets all counters.
- In multi-instance deployments this is ineffective.
- **Fix**: Switch to Redis store (e.g., `rate-limit-redis`) aligned with any future Redis adoption.

### 7. CSRF token delivery via cookie
- CSRF is currently implemented with a double-submit cookie pattern; SPA-safe alternatives (synchronised token pattern) may be warranted.

### 8. Error handling is inconsistent
- Some routes return `{ message }`, others return `{ error }`, others a bare string.
- No centralised error class hierarchy; HTTP status codes are sometimes implicit.

---

## Remediation Roadmap

### Phase 1 — Low-risk, high-return (1–2 sprints)
1. Extract `B2C_DISCOUNT_CODES` to a shared config file — eliminates the current duplication.
2. Move inline helper functions (`calculatePromptArchitectureScores`, `getEvaluationProgress`) to `server/scoring.ts` — prerequisite for extracting the submit/status endpoints.
3. Extract remaining self-contained route groups from `routes.ts` (profile-insights, admin, scheduled-exports) following the pattern established in this session.
4. Standardise error response shape (`{ message: string, code?: string }`) across all routes.

### Phase 2 — Quality gates (2–4 sprints)
1. Enable `noImplicitAny` in `tsconfig.json`; fix the remaining **583** `any` usages in `routes.ts` file-by-file.
2. Add integration tests for the payment, assessment lifecycle, and webhook routes using `supertest`.
3. Remove the `B2C_DISCOUNT_CODES` duplication by extracting it to a shared config.

### Phase 3 — Infrastructure (4–6 sprints)
1. Add Redis store for rate-limit counters (required for horizontal scaling).
2. Introduce OpenAPI/Swagger auto-generation from route schemas to keep documentation in sync.
