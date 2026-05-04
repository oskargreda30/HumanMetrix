<p align="center">
  <img src="client/public/assets/humanmetrix-logo.png" alt="HumanMetrix Logo" width="180" />
</p>

<h1 align="center">HumanMetrix</h1>

<p align="center">
  <strong>AI-Powered Psychometric Assessments for the Modern Workforce</strong><br/>
  Enterprise-grade assessments that objectively measure behavioural skills and AI literacy — helping organisations hire with confidence in an AI-driven world.
</p>

<p align="center">
  <a href="#overview">Overview</a>&nbsp;&bull;
  <a href="#assessment-types">Assessments</a>&nbsp;&bull;
  <a href="#features">Features</a>&nbsp;&bull;
  <a href="#tech-stack">Tech Stack</a>&nbsp;&bull;
  <a href="#architecture">Architecture</a>&nbsp;&bull;
  <a href="#getting-started">Getting Started</a>&nbsp;&bull;
  <a href="#environment-variables">Environment Variables</a>&nbsp;&bull;
  <a href="#documentation">Documentation</a>&nbsp;&bull;
  <a href="#license">License</a>
</p>

---

## Overview

Traditional psychometric tools were not built for the AI era. HumanMetrix bridges that gap by evaluating both timeless behavioural competencies and emerging AI literacy in a single, unified platform.

**Candidate journey** — take an assessment, receive a detailed scored report, and optionally share results with employers.

**Partner journey** — embed assessments into hiring pipelines, invite candidates in bulk, compare results side-by-side, run AI-powered role-fit analysis, and manage billing through a self-serve dashboard.

**Admin journey** — monitor platform health, manage partners, configure golden-set benchmarks, audit billing, and publish social content.

All platform fees and base currency default to **GBP (£)** with full multi-currency and Purchasing Power Parity (PPP) support.

---

## Assessment Types

| Assessment | Measures |
|---|---|
| **FIT** | Six behavioural traits: Resilience, High Agency, Growth Mindset, Empathy & Ethics, Interpersonal Agility, Intellectual Curiosity |
| **AI Readiness** | Nine dimensions of workplace AI literacy — Data Fluency, Critical Thinking, Domain Expertise, Responsible AI, and more |
| **Prompt Architecture** | Practical prompt-engineering ability scored across seven complexity levels |
| **AIQ** | Algorithmic Integrity Quotient — ethical AI decision-making and bias awareness |

---

## Features

### B2C — Individual Candidates
- Self-serve assessment flow with real-time progress and timer persistence
- Comprehensive PDF report with skill radar, competency breakdowns, and development insights
- Consent-gated result sharing with partner organisations
- Pay-deferred model with discount codes and PPP pricing

### B2B — Partner Organisations
- Embeddable assessment widget (JavaScript SDK) with API key authentication
- Bulk candidate invitations and hiring pipeline management
- Side-by-side multi-candidate comparison
- AI-powered role-fit analysis with gap scoring and tailored interview questions
- Candidate archiving with show/hide toggle (no data deletion)
- Webhook notifications for assessment lifecycle events
- Three billing tiers: PAYG, Subscription, and Enterprise (invoice)

### Ecosystem Index — Team Diagnostics
- AI-powered team capability assessment with mission-statement analysis
- FIT score aggregation across team members
- Contextual gap analysis and ideal candidate profile generation
- Credit-based billing (20 credits per analysis)

### Platform & Admin
- Golden-set benchmark system for GPT-5 scoring consistency
- Super admin dashboards: revenue, AI cost analytics, SLA monitoring, audit logs
- Sales funnel Kanban board (Lead → Contacted → Demo → Trial → Closed)
- Automated social poster (LinkedIn & Instagram) with AI-generated content
- Active session management with force-logout capability
- Real-time app log streaming (CloudWatch-style) with level/source filtering

### Payments & Billing
- Stripe and Airwallex payment processing
- Stripe webhook idempotency via event deduplication table
- 3DS/SCA retry flow with 24-hour delay and email notification
- Auto top-up with exponential backoff (max 3 retries)
- Xero integration for expense tracking and revenue synchronisation

### Email & Notifications
- Gmail primary / SendGrid fallback with automatic failover
- SendGrid webhook bounce tracking (bounced, dropped, blocked, deferred)
- Escalating invoice payment notifications
- Security event monitoring and critical error alerts

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI, Wouter, TanStack Query |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL (Neon), Drizzle ORM |
| **AI** | OpenAI GPT-5 |
| **Payments** | Stripe, Airwallex |
| **PDF Generation** | Puppeteer (server-side headless rendering) |
| **Storage** | Replit Object Storage |
| **Email** | Gmail via Nodemailer (primary), SendGrid (fallback) |
| **Auth** | Session-based (bcryptjs), CSRF protection, session fixation hardening |
| **Accounting** | Xero (xero-node) |

---

## Architecture

```
client/                       React SPA (Vite)
  src/
    pages/                    Route-level page components
    components/
      admin/                  Super admin dashboard tabs
      partner/                Partner dashboard tabs
    contexts/                 React context providers (currency, basket)
    lib/                      Utilities, query client, PDF helpers, SEO

server/                       Express API server
  routes.ts                   Core API routes
  payment-routes.ts           Stripe / Airwallex payment endpoints
  assessment-routes.ts        Assessment lifecycle endpoints
  webhook-routes.ts           Stripe & SendGrid webhook handlers
  partner-routes.ts           Partner-specific endpoints
  storage.ts                  Data access layer (Drizzle + PostgreSQL)
  email.ts                    Gmail transactional email
  email-sendgrid.ts           SendGrid transactional email
  middleware/                 Auth, CSRF, rate limiting, request deduplication

shared/
  schema.ts                   Drizzle schema + Zod types (single source of truth)

docs/
  ARCHITECTURE.md             System overview and design decisions
  API.md                      Full API endpoint reference
  DEPLOYMENT.md               Environment setup and onboarding checklist
```

The application runs as a **single process** — Express serves the API and the Vite-built frontend from the same port (5000). Background schedulers (golden-set evaluation, billing checks, database size monitoring) run as in-process timers.

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- OpenAI API key
- Stripe account (test and live keys)

### Installation

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server (frontend + backend on port 5000)
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for signing session cookies |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key (Replit-managed) |
| `STRIPE_SECRET_KEY` | Stripe live secret key |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe live publishable key |
| `GMAIL_USER` | Gmail address for transactional email |
| `GMAIL_APP_PASSWORD` | Gmail app password |
| `SENDGRID_WEBHOOK_VERIFICATION_KEY` | SendGrid webhook signature verification key |

See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the full variable list and setup instructions.

---

## Documentation

| Document | Contents |
|---|---|
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System overview, module map, data flow diagrams, design decisions |
| [`docs/API.md`](./docs/API.md) | Every public API endpoint with request/response shapes |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | Environment setup, production build, migration steps, onboarding checklist |
| [`docs/LICENSES.md`](./docs/LICENSES.md) | Full open-source license inventory grouped by license type |

---

## License

Copyright © 2026 PT Human Metrix Assessments. Released under the [MIT License](./LICENSE).

Third-party attribution notices are listed in [`NOTICE`](./NOTICE).
