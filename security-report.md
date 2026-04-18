# Security Report

**Generated:** 2026-04-18  
**Scope:** Automated multi-tool scan + targeted manual hardening  
**Project:** HumanMetrix (Assessment Platform)

---

## Executive Summary

Three automated tools were run across the codebase: dependency vulnerability audit (OSV Scanner), SAST static analysis (Semgrep), and secrets/dataflow analysis (HoundDog). Additionally, three concrete vulnerabilities identified during M&A due diligence were investigated and resolved. The overall security posture is good for a single-process deployment; the key architectural limitation is in-memory rate limiting (documented and mitigated below).

---

## Scan Results

### 1. Dependency Audit (OSV Scanner)

| Severity | Count |
|----------|-------|
| Critical | 7     |
| High     | 52    |
| Moderate | 36    |
| Low      | 12    |
| **Total**| **107**|

**Note:** The high count is largely due to transitive dependencies (minimatch, tar, jspdf, fast-xml-parser) appearing multiple times across different installed versions. Many are dev-only or tool dependencies with no direct exploit path in production. Direct-dependency vulnerabilities of real concern are listed below.

#### Critical Findings

| Package | Version | CVE/Advisory | Summary | Fix Available |
|---------|---------|-------------|---------|---------------|
| `jspdf` | 3.0.3 | GHSA-... | Local File Inclusion / Path Traversal | Upgrade to 4.0.0 (major) |
| `jspdf` | 3.0.3 | GHSA-... | HTML Injection in New Window paths | Upgrade to 4.2.1 (major) |
| `protobufjs` | 7.5.4 | GHSA-... | Arbitrary code execution via prototype pollution | Upgrade to 7.5.5 (minor) |
| `vitest` | 1.6.0 | GHSA-... | Remote Code Execution via malicious website in dev mode | Upgrade to 1.6.1 (minor) |
| `basic-ftp` | 5.1.0 | GHSA-... | Path Traversal in `downloadToDir()` | Upgrade to 5.2.0 (minor) |
| `fast-xml-parser` | 4.5.3 / 5.2.5 | GHSA-... | Entity encoding bypass via regex injection in DOCTYPE | Upgrade to 4.5.4 / 5.3.5 (minor) |

#### High Findings — Direct Production Dependencies

| Package | CVE/Advisory | Summary | Fix |
|---------|-------------|---------|-----|
| `drizzle-orm` 0.39.1 | GHSA-... | SQL injection via improperly escaped SQL identifiers | Upgrade to 0.45.2 |
| `axios` 1.13.2 | GHSA-... | DoS via `__proto__` key in mergeConfig | Upgrade to 1.13.5 |
| `multer` 2.0.2 | Multiple | DoS via uncontrolled recursion, resource exhaustion, incomplete cleanup | Upgrade to 2.1.1 |
| `undici` 7.22.0 | Multiple | WebSocket overflow, memory exhaustion, unhandled exception | Upgrade to 7.24.0 |
| `nodemailer` 7.0.10 | GHSA-... | DoS via recursive calls in addressparser | Upgrade to 7.0.11 |
| `path-to-regexp` 0.1.12 | GHSA-... | ReDoS via multiple repeated groups | Upgrade to 0.1.13 |
| `socket.io-parser` 4.2.4 | GHSA-... | Unbounded binary attachments | Upgrade to 4.2.6 |

#### Mitigation Plan for Critical/High CVEs

**Immediate (within 1 sprint):**
- `protobufjs` 7.5.4 → 7.5.5: Minor patch, no breaking changes. Run `npm update protobufjs`.
- `vitest` 1.6.0 → 1.6.1: Dev-only. Run `npm update vitest`. Not exposed in production.
- `nodemailer` 7.0.10 → 7.0.11: Minor patch. Run `npm update nodemailer`.
- `drizzle-orm` 0.39.1 → 0.45.2: The SQL injection affects raw identifier escaping. Upgrade and audit any `sql.identifier()` usage.
- `axios` 1.13.2 → 1.13.5: Minor patch. Run `npm update axios`.
- `multer` 2.0.2 → 2.1.1: Minor patch. Run `npm update multer`.
- `undici` 7.22.0 → 7.24.0: Minor patch. Run `npm update undici`.
- `fast-xml-parser` → latest 4.x/5.x: Run `npm update fast-xml-parser`.
- `path-to-regexp` 0.1.12 → 0.1.13: Run `npm update path-to-regexp`.
- `socket.io-parser` → 4.2.6: Update via socket.io parent package.

**Planned (before major feature release or scaling):**
- `jspdf` 3.0.3 → 4.x: Major version bump with breaking API changes. Audit all jsPDF usage in the codebase and update to the new API. This affects PDF report generation.
- `tar` 6.2.1 → 7.x: Major version bump. Used transitively; check if a direct dependency can be updated to pull in a safe version.
- `basic-ftp` 5.1.0 → 5.2.0+: Update and test FTP connectivity if that feature is in use.

**Accepted/Deferred (low real-world risk):**
- `esbuild`: Dev dependency only. Not in the production bundle. No immediate action.
- `vite`: Dev server path traversal only affects local development. Not exploitable in production deployments.
- `aws-sdk` v2: Informational advisory. No security patch available; informational only. Migrate to v3 as a planned refactor.
- `dompurify`: Used client-side. Upgrade to 3.4.0 to fix mutation-XSS and prototype pollution issues. Medium priority.
- `lodash`: Prototype pollution via `_.unset`/`_.omit`. Patch available (4.18.0 / 4.17.23). Low risk in practice as these code paths are not attacker-controlled.

---

### 2. SAST Analysis (Semgrep)

**Total findings:** 172  
**High/Critical:** 5  
**Medium/Low:** 167

#### High Findings

| ID | File | Summary | Action |
|----|------|---------|--------|
| `insecure-document-method` | `coverage/prettify.js` | XSS via `innerHTML` in test coverage artifact | **Accepted** — development artifact only, not shipped to production users |
| `insecure-document-method` | `coverage/sorter.js` | XSS via `innerHTML` in test coverage artifact | **Accepted** — development artifact only, not shipped to production users |
| `hashicorp-tf-password` | `load-tests/artillery.yml` | Possible credential pattern in load test config | **Investigate** — confirm no real credentials in load-test YAML files |
| `hashicorp-tf-password` | `load-tests/auth-stress.yml` | Possible credential pattern in load test config | **Investigate** — confirm no real credentials in load-test YAML files |
| `remote-property-injection` | `server/leads-generation-routes.ts` | Bracket object notation with user input | **Investigate** — audit bracket notation access to ensure keys are validated |

**Action required:** Review `load-tests/artillery.yml` and `load-tests/auth-stress.yml` to confirm the flagged credential patterns are test placeholders only. If real credentials are present, rotate them immediately and use `process.env` references instead. Audit `server/leads-generation-routes.ts` for any `obj[userInput]` patterns and add an allowlist of permitted keys.

---

### 3. Secrets / Dataflow Analysis (HoundDog)

**Total findings:** 197  
**High/Critical:** 0

No critical or high-severity secrets or privacy-violation dataflow issues were detected. All 197 findings were informational or low-severity (e.g., PII field logging). No plaintext secrets were detected in source code.

---

## Targeted Vulnerability Fixes

### Fix 1: Session Fixation — `server/auth.ts`

**Status: RESOLVED**

**Risk:** An attacker could pre-plant a session ID (e.g., via a shared link or network position) before the victim authenticates. Without session ID rotation on login, the attacker's pre-planted session becomes authenticated post-login, giving full account access (OWASP A07:2021 — Identification and Authentication Failures).

**Root Cause:** The `POST /api/login` handler had a comment: `// Set userId on current session (skip regenerate to avoid cookie issues)`. The `req.session.regenerate()` call was omitted because it caused intermittent cookie-loss problems in earlier development. The signup endpoint already called `regenerate()` correctly.

**Fix Applied:**
- `POST /api/login`: Added `req.session.regenerate()` call before writing `userId` to the session. The new session ID is issued, the old one is invalidated, and then `req.session.save()` persists the fresh session.
- `POST /api/auth/auto-login`: Same fix applied for consistency.
- `POST /api/signup`: Was already correct — no change needed.

**Root cause of the original "cookie issues":** The session cookie was set to `sameSite: 'none'` globally. With `secure: true` and `sameSite: 'none'`, the cookie requires `Secure` context. The `regenerate()` call would succeed but the Set-Cookie header from the new session would be silently dropped by some clients if HTTPS was not confirmed end-to-end. This masked the bug. Now that `sameSite` defaults to `'lax'` (Fix 2), `regenerate()` works reliably.

---

### Fix 2: SameSite Cookie Policy Hardening — `server/auth.ts`, `server/middleware/csrf.ts`

**Status: RESOLVED**

**Risk:** `sameSite: 'none'` is the most permissive cross-site policy. It allows the session cookie to be sent in all cross-site requests, including cross-site POSTs from third-party pages — partially undermining CSRF protections. It should only be used when the application genuinely needs to be embedded in a cross-site iframe.

**Fix Applied:**
- **Session cookie** (`server/auth.ts` → `getSession()`): Changed `sameSite` from `'none'` to `'lax'`. This is the secure default: the cookie is sent on same-site requests and on top-level cross-site navigations (GET), but not on cross-site sub-resource requests.
- **CSRF cookie** (`server/middleware/csrf.ts`): Changed from always `'none'` to conditional: `'none'` only when the request path starts with `/api/embed/` or `/embed/`. All other paths use `'lax'`.
- **Embed routes** (`server/auth.ts` → `setSameSiteNone()`): A `setSameSiteNone` middleware helper is exported. It overrides `req.session.cookie.sameSite` to `'none'` for that request. Embed routes that need cross-site iframe support should apply this middleware.

**Embed route compatibility:** The `/api/embed/session/:sessionId` endpoints use URL-based session tokens (`sessionId` path parameter), not the server-side session cookie, for their primary authentication. The `sameSite: 'lax'` change does not break embed functionality. Partner-hosted iframes can continue to interact with embed API endpoints without relying on the session cookie.

---

### Fix 3: In-Memory Rate Limiting — Documentation

**Status: DOCUMENTED (implementation deferred as infrastructure task)**

**Risk:** All rate-limit state (auth attempts, API call counts, failed login tracking) lives in process-local `Map` objects in:
- `server/middleware/rateLimit.ts` — `rateLimitStore`
- `server/auth.ts` — `authAttempts`
- `server/partner-auth.ts` — `rateLimitMap`
- `server/security-monitor.ts` — `failedLoginAttempts`, `apiCallTracker`

**Known limitations (now explicitly documented in code):**
1. **Server restart resets all counters.** A targeted restart (or deployment) immediately clears all rate-limit windows, allowing a fresh burst of requests.
2. **Not shared across processes or replicas.** In a multi-instance deployment, each instance enforces its own limits independently. An attacker can multiply their allowed request rate by the number of running instances.

**Current mitigation:** The application currently runs as a single process in a single Replit Deployment. The in-memory approach is therefore functionally equivalent to a shared store for this topology. Risk is low but increases with scale.

**Recommended upgrade path (Redis migration):**
1. Add `REDIS_URL` to environment secrets pointing at a Redis instance (e.g., Upstash Redis, Redis Cloud free tier).
2. Install `rate-limiter-flexible` and `ioredis` (`npm install rate-limiter-flexible ioredis`).
3. Replace each `Map`-based implementation with a `RateLimiterRedis` instance from `rate-limiter-flexible`. The API is compatible with the current pattern.
4. All four files must be migrated together: `rateLimit.ts`, `auth.ts`, `partner-auth.ts`, `security-monitor.ts`.

**Architecture notes added to:** `server/middleware/rateLimit.ts`, `server/auth.ts`, `server/partner-auth.ts`, `server/security-monitor.ts`.

---

## Open Items and Residual Risks

| Item | Severity | Status | Notes |
|------|----------|--------|-------|
| `drizzle-orm` SQL injection | High | Open — upgrade required | Run `npm update drizzle-orm` and audit raw SQL usage |
| `protobufjs` arbitrary code exec | Critical | Open — minor upgrade | Run `npm update protobufjs`; no breaking changes |
| `jspdf` LFI / HTML injection | Critical | Open — major upgrade | Requires breaking API migration; plan for next release |
| Load-test YAML credential patterns | High | Investigate | Confirm test placeholders, not real credentials |
| `leads-generation-routes.ts` bracket injection | High | Investigate | Audit `obj[userInput]` patterns, add key allowlist |
| `nodemailer` DoS | High | Open — minor upgrade | Run `npm update nodemailer` |
| `multer` DoS | High | Open — minor upgrade | Run `npm update multer` |
| `undici` WebSocket issues | High | Open — minor upgrade | Run `npm update undici` |
| In-memory rate limiting | Medium | Documented | Upgrade to Redis before horizontal scaling |
| `dompurify` XSS / prototype pollution | Moderate | Open | Upgrade to 3.4.0+ |
| `axios` DoS via `__proto__` | High | Open | Run `npm update axios` |
| Session fixation (login) | High | **RESOLVED** | Session regenerate now called on login |
| `sameSite: none` cookie policy | Medium | **RESOLVED** | Defaults to `lax`; `none` only for embed routes |

---

## Summary of Code Changes Made

| File | Change |
|------|--------|
| `server/auth.ts` | Session cookie `sameSite` changed from `'none'` to `'lax'`; `req.session.regenerate()` added to `/api/login` and `/api/auth/auto-login`; `setSameSiteNone` middleware helper exported; in-memory rate limiting documentation added |
| `server/middleware/csrf.ts` | CSRF cookie `sameSite` now conditional: `'none'` for embed routes, `'lax'` otherwise |
| `server/middleware/rateLimit.ts` | Full architecture note added documenting in-memory limitation and Redis upgrade path |
| `server/partner-auth.ts` | Architecture note added to `rateLimitMap` |
| `server/security-monitor.ts` | Architecture note added to `failedLoginAttempts` and `apiCallTracker` |
