# HumanMetrix — Architecture Overview

> Cross-links: [API Reference](./API.md) · [Deployment Guide](./DEPLOYMENT.md)

---

## 1. System Overview

HumanMetrix is a multi-tenant AI-powered talent assessment platform. It serves two primary audiences:

- **Candidates (B2C)**: Individuals who purchase and sit psychometric / AI-literacy assessments and receive a detailed results report.
- **Partners (B2B)**: Employers and recruitment agencies that embed assessments in their own hiring flows via a JavaScript widget, REST API, or the Partner Dashboard.

A third privileged actor — the **Super Admin** — manages the full platform, billing, content, and system health through a dedicated admin interface.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, TanStack Query v5, Wouter (routing) |
| UI Components | Shadcn UI (Radix UI primitives), Tailwind CSS |
| Backend | Node.js, Express (TypeScript, ESM) |
| ORM | Drizzle ORM |
| Database | PostgreSQL (hosted on Neon) |
| Auth | Session-based (express-session + connect-pg-simple), bcryptjs |
| Payment | Stripe (primary, B2C & B2B), Airwallex (secondary, B2B subscriptions & international) |
| AI | OpenAI GPT-4o / GPT-5 via `AI_INTEGRATIONS_OPENAI_API_KEY` |
| Email | Gmail via Nodemailer (primary), SendGrid (failover) |
| PDF Generation | jsPDF + html2canvas (client-side), Puppeteer (server-side for B2B) |
| File Storage | Replit Object Storage (presigned-URL uploads, proxied downloads) |
| Job Queues | In-process async queues (`server/queues/`) |
| Accounting | Xero (via xero-node) |
| Social Posting | LinkedIn API, Instagram Graph API |

---

## 3. Repository Layout

```
/
├── client/                  # React SPA (Vite)
│   └── src/
│       ├── pages/           # One file per route
│       ├── components/      # Shared UI components
│       │   ├── ui/          # Shadcn primitives
│       │   └── admin/       # Super-admin specific panels
│       └── lib/             # Utilities, API client, query helpers
├── server/                  # Express backend (all TypeScript, ESM)
│   ├── index.ts             # App bootstrap, global middleware
│   ├── routes.ts            # Core route registration hub
│   ├── auth.ts              # Session auth, signup/login/logout
│   ├── assessment-routes.ts # Assessment lifecycle (heartbeat, pause, resume)
│   ├── payment-routes.ts    # B2C checkout, discount validation, FX rates
│   ├── webhook-routes.ts    # Stripe, Airwallex, SendGrid webhook handlers
│   ├── partner-routes.ts    # B2B API + Partner Portal endpoints
│   ├── ecosystem-routes.ts  # Ecosystem Index (team diagnostic) endpoints
│   ├── bug-report-routes.ts # Internal bug reporting
│   ├── sales-funnel-routes.ts # Admin CRM / Kanban
│   ├── leads-generation-routes.ts
│   ├── social-poster-routes.ts
│   ├── cv-routes.ts         # Careers page CV submissions
│   ├── storage.ts           # IStorage interface + PostgresStorage implementation
│   ├── db.ts                # Drizzle client + connection pool
│   ├── email.ts             # Dual-provider email system
│   ├── airwallex.ts         # Airwallex SDK wrapper
│   ├── scoring.ts           # FIT / AI Readiness score calculation
│   ├── generateReceipt.ts   # PDF receipt generation
│   ├── generateB2BPDF.ts    # B2B report PDF via Puppeteer
│   ├── partner-auth.ts      # API key authentication middleware
│   ├── partner-billing.ts   # Subscription billing scheduler
│   ├── payment-routing.ts   # Stripe/Airwallex checkout fallback logic
│   ├── exchange-rates.ts    # Currency FX rate caching
│   ├── ai-cost-tracker.ts   # OpenAI usage logging per operation
│   ├── evaluation-progress.ts # In-memory SSE progress tracker
│   ├── security-monitor.ts  # Suspicious activity alerts
│   ├── xero.ts              # Xero accounting integration
│   ├── queues/              # Background job queues
│   ├── middleware/
│   │   ├── rateLimit.ts     # express-rate-limit (API + Stripe)
│   │   ├── requestDedup.ts  # Idempotency for POST/PUT/DELETE
│   │   ├── csrf.ts          # CSRF double-submit cookie
│   │   ├── staticCache.ts   # Cache-Control headers for assets
│   │   └── keepAlive.ts     # HTTP Keep-Alive tuning
│   ├── services/
│   │   ├── promptArchitecture.ts # GPT scoring for PA assessment
│   │   └── webhookService.ts     # Outbound partner webhook delivery
│   └── replit_integrations/
│       └── object_storage/  # Presigned URL + proxy for Replit Object Storage
├── shared/
│   ├── schema.ts            # Drizzle table definitions + Zod insert schemas
│   ├── currencies.ts        # PPP pricing, currency conversion helpers
│   └── validation.ts        # Shared email/name validation
├── migrations/              # Drizzle-generated SQL migration files
└── drizzle.config.ts        # Drizzle Kit configuration
```

---

## 4. Module Map

### 4.1 Authentication (`server/auth.ts`)

Email/password authentication with session cookies. Key design points:

- Passwords hashed with **bcryptjs** (cost factor 10).
- Sessions persisted in PostgreSQL via **connect-pg-simple** (`sessions` table). TTL = 7 days.
- In-process failed-login rate limiter (15 attempts / 15 min per email+IP). **Note**: resets on restart — not safe for multi-process deployment.
- Two cookie modes: `sameSite: 'lax'` for the main app; `sameSite: 'none'; Secure` for embed iframes on partner domains.
- Auto-login tokens (one-time, expiring) allow partners to deep-link candidates directly into their results.

### 4.2 Assessment Engine

Four assessment types are supported:

| ID | Name | Scoring |
|---|---|---|
| `fit` | FIT (behavioral traits) | Deterministic formula in `scoring.ts` |
| `ai_readiness` | AI Readiness | Deterministic formula in `scoring.ts` |
| `prompt_architecture` | Prompt Architecture | GPT-4o rubric evaluation (`services/promptArchitecture.ts`) |
| `aiq` | Algorithmic IQ | Mixed deterministic + rationale scoring |

Timer persistence uses a "pause on close" model:
- Periodic heartbeats (every 30 s) save remaining time.
- `beforeunload` `sendBeacon` sends a final save.
- On resume, the server validates the new time ≤ stored value (prevents inflation).
- 30-minute grace period is enforced for paused assessments.

### 4.3 Payment Architecture

B2C candidates follow a **pay-deferred** model: they take assessments first, then pay to unlock results. Two payment providers are supported with automatic fallback:

```
Checkout request
       │
       ▼
  payment-routing.ts
       │
       ├─── Airwallex configured? ──Yes──► Airwallex checkout
       │                                       │
       │                          Failed? ──►  │
       │                                       │
       └─── (default / fallback) ──────────► Stripe checkout
```

B2B partners pay for test credits up-front. Auto top-up charges the partner's stored card when credits run low.

### 4.4 Email System (`server/email.ts`)

Dual-provider with automatic failover:

```
sendEmail()
     │
     ├── Try Gmail (Nodemailer)
     │       OK? ──► return
     │
     └── Fallback to SendGrid
```

SendGrid webhook (`POST /api/webhooks/sendgrid`) tracks bounce / drop events and marks `invitations.emailBounced = true`.

### 4.5 Partner API (`server/partner-routes.ts` + `server/partner-auth.ts`)

B2B partners authenticate using **API keys** (Bearer token, `Authorization: Bearer <key>`). Keys are scoped to permissions (`assessments:read`, `assessments:write`, `results:read`) and environments (`live` / `test`).

Partners receive a JavaScript embed widget (`/embed/widget.js`) or SDK (`/embed/sdk.js`). The widget creates an iframe pointing to `/embed/assessment?session=<sessionId>`.

### 4.6 Ecosystem Index (`server/ecosystem-routes.ts`)

AI-powered team diagnostic tool. Flow:

1. Create project → auto-linked to partner account.
2. Enter mission statement + org context.
3. GPT-4o analyses mission → returns capability priorities (HA / IC / RA / EE / GM / IA).
4. Add team members (upload FIT PDF, link existing results, or manual entry).
5. GPT-4o generates strategic advisor report + ideal hire profile.
6. Charged 20 credits per analysis against partner account.

### 4.7 Background Jobs (`server/queues/`)

In-process async queues handle:

- Outbound partner webhook delivery with retry.
- Delayed Prompt Architecture evaluations.
- Auto top-up retry (exponential backoff, max 3 attempts).

### 4.8 Scheduled Tasks

| Scheduler | Frequency | Purpose |
|---|---|---|
| Golden Set | Daily | GPT scoring consistency checks |
| Billing | Configurable | Auto-bill enterprise partner invoices |
| DB Size Monitor | Periodic | Alert when DB approaches limits |
| Stuck PA Recovery | On startup (30 s delay) | Re-evaluate stuck Prompt Architecture assessments |

---

## 5. Data Flow Diagrams

### 5.1 Candidate Assessment Flow (B2C)

```
Browser                  Express                   DB / External
  │                         │                           │
  │── POST /api/login ──────►│                           │
  │◄─ session cookie ────────│                           │
  │                         │                           │
  │── GET /api/available-assessments ──────────────────►│
  │◄─ unlocked assessment list ──────────────────────────│
  │                         │                           │
  │── POST /api/assessments/start ─────────────────────►│
  │◄─ { resultId } ─────────│                           │
  │                         │                           │
  │  [candidate answers questions, timer ticks]          │
  │── POST /api/assessments/:id/heartbeat (periodic) ──►│
  │                         │                           │
  │── POST /api/assessments/:id/submit ────────────────►│
  │                         │── score + GPT eval ───────►OpenAI
  │                         │◄─ scores ─────────────────│
  │◄─ { scores } ───────────│                           │
  │                         │                           │
  │── POST /api/create-checkout-session ───────────────►│
  │◄─ Stripe/Airwallex URL ─│                           │
  │                         │                           │
  │  [payment at Stripe/Airwallex]                       │
  │                         │                           │
  │        Stripe ── POST /api/webhooks/stripe ─────────►│
  │                         │── mark purchase complete ─►│
  │                         │── send receipt email ─────►Gmail/SendGrid
  │                         │                           │
  │── GET /api/results/:id ─────────────────────────────►│
  │◄─ full results ─────────│                           │
```

### 5.2 B2B Partner Assessment Flow

```
Partner Server          HumanMetrix API          Candidate Browser
      │                       │                         │
      │── POST /api/partner/sessions ──────────────────►│
      │        (Bearer token auth)                       │
      │◄── { sessionId, widgetUrl } ────────────────────│
      │                       │                         │
      │── embed widgetUrl in page ──────────────────────►│
      │                       │◄─ candidate takes assessment
      │                       │                         │
      │                       │── POST webhook ─────────►Partner Callback URL
      │                       │   { status: completed,  │
      │                       │     sessionId, scores } │
      │                       │                         │
      │── GET /api/partner/sessions/:id/results ────────►│
      │◄── { scores, evaluations } ─────────────────────│
```

### 5.3 Ecosystem Index (Team Diagnostic) Flow

```
Partner Portal          Express                OpenAI         Stripe/Airwallex
      │                    │                     │                  │
      │── POST /api/ecosystem/projects ─────────►│                  │
      │◄── { projectId } ──│                     │                  │
      │                    │                     │                  │
      │── POST .../analyze-mission ─────────────►│                  │
      │                    │── GPT-4o prompt ────►│                  │
      │                    │◄─ priorities ────────│                  │
      │◄── capability priorities ──────────────── │                  │
      │                    │                     │                  │
      │  [add team members, upload FIT PDFs]      │                  │
      │                    │                     │                  │
      │── POST .../create-checkout ─────────────►│                  │
      │                    │── create PI/session ─────────────────►│
      │◄── checkout URL ──────────────────────────────────────────── │
      │                    │                     │                  │
      │  [pay 20 credits / card]                  │                  │
      │                    │◄─ webhook confirmed ─────────────────── │
      │                    │                     │                  │
      │── POST .../generate-analysis ───────────►│                  │
      │                    │── GPT-4o prompt ────►│                  │
      │                    │◄─ strategic report ──│                  │
      │◄── { executiveSummary, insights, hireProfiles } ────────────│
```

---

## 6. Key Architectural Decisions

### 6.1 Session Auth (not JWT)

Sessions are stored in PostgreSQL, giving instant revocation capability without a token blacklist. The trade-off is stickiness — all processes share the same `sessions` table, so horizontal scaling is safe but the session store becomes a potential bottleneck under high load.

### 6.2 Dual Email Provider

Gmail is preferred for deliverability and lower cost; SendGrid is the fallback. Both are wrapped behind a single `sendEmail()` interface so the routing is transparent to callers. Admin dashboard exposes an email preference toggle.

### 6.3 Airwallex + Stripe Dual Payment

Airwallex handles international payments with lower FX fees and is preferred for B2B subscription top-ups and markets where Stripe's coverage is weaker (e.g. Southeast Asia). `payment-routing.ts` abstracts the fallback so routes never call Stripe or Airwallex directly.

### 6.4 Server-Side PDF via Puppeteer

B2B report PDFs are generated by spinning up a headless Chromium instance that navigates to the actual results page. This guarantees pixel-perfect fidelity to the web UI. Files exceeding 20 MB are uploaded to Object Storage and the download link is emailed rather than attached.

### 6.5 In-Memory Rate Limiting

Both auth and contact-form rate limiting use process-local `Map` objects. This is intentional for the current single-process Replit deployment. **Migrate to Redis before horizontal scaling.** See `server/auth.ts` and `server/middleware/rateLimit.ts` for the documented upgrade path.

### 6.6 CSRF Protection

CSRF double-submit cookie pattern enforced by `server/middleware/csrf.ts`. Cross-origin embed routes override `sameSite` to `none` (required for third-party iframes) but CSRF is still validated on all state-changing endpoints.

### 6.7 Request Deduplication

`server/middleware/requestDedup.ts` uses an in-process Map keyed on `(method, path, body hash)` with a short TTL. Prevents double-submits from slow networks or front-end retries on POST/PUT/DELETE.

---

## 7. Third-Party Integrations Summary

| Service | Purpose | Auth Method |
|---|---|---|
| **Neon (PostgreSQL)** | Primary data store | `DATABASE_URL` connection string |
| **Stripe** | B2C payments, B2B card billing, webhooks | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Airwallex** | International payments, B2B subscription billing | `AIRWALLEX_CLIENT_ID`, `AIRWALLEX_API_KEY` |
| **OpenAI** | Prompt Architecture scoring, role-fit analysis, ecosystem AI | `AI_INTEGRATIONS_OPENAI_API_KEY` |
| **Gmail (Nodemailer)** | Transactional email (primary) | `GMAIL_USER`, `GMAIL_APP_PASSWORD` |
| **SendGrid** | Transactional email (failover), bounce tracking | Replit Connector |
| **Replit Object Storage** | Report screenshots, uploaded PDFs | `DEFAULT_OBJECT_STORAGE_BUCKET_ID` |
| **Xero** | Expense tracking, revenue sync | `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET` |
| **LinkedIn API** | Automated social content posting | `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AUTHOR_ID` |
| **Instagram Graph API** | Automated social content posting | `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID` |

---

## 8. Security Model

- **Authentication**: Session cookie (`HttpOnly`, `Secure`, `SameSite: lax`).
- **API keys (B2B)**: SHA-256 hashed in DB; bearer token verified on every request.
- **CSRF**: Double-submit cookie on all mutating endpoints.
- **Rate limiting**: Per-IP/email limits on auth (15 req/15 min) and API (configurable via `express-rate-limit`).
- **Input validation**: All request bodies validated with Zod schemas before reaching business logic.
- **Logging**: Sensitive fields (`email`, `passwordHash`, tokens) redacted from access logs.
- **Webhook verification**: Stripe and Airwallex webhook signatures validated; SendGrid signature optional (flag: `SENDGRID_ALLOW_UNSIGNED_WEBHOOKS`).
