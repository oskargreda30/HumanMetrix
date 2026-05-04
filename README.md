# HumanMetrix — AI Assessment Platform

**Enterprise-grade psychometric assessments for an AI-driven workforce.**

HumanMetrix objectively measures behavioural skills and AI literacy to help organisations identify candidates who can thrive alongside artificial intelligence. The platform serves both B2C candidates seeking personal insight and B2B partners running assessments at scale.

---

## Table of Contents

- [Overview](#overview)
- [Assessment Types](#assessment-types)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

Traditional psychometric tools were not designed for the AI era. HumanMetrix bridges that gap by evaluating both timeless behavioural competencies and emerging AI literacy in a single, unified platform.

**Candidate journey** — take an assessment, receive a scored report, optionally share results with employers.

**Partner journey** — embed assessments in hiring pipelines, invite candidates, compare results, run AI-powered role-fit analysis, and manage billing through a self-serve dashboard.

**Admin journey** — monitor platform health, manage partners, audit billing, configure golden-set benchmarks, and publish social content.

---

## Assessment Types

| Assessment | Measures |
|---|---|
| **FIT** | Behavioural traits: Resilience, High Agency, Growth Mindset, Empathy & Ethics, Interpersonal Agility, Intellectual Curiosity |
| **AI Readiness** | Nine dimensions of workplace AI literacy including Data Fluency, Critical Thinking, and Responsible AI awareness |
| **Prompt Architecture** | Practical prompt-engineering ability across seven complexity levels |
| **AIQ** | Algorithmic Integrity Quotient — ethical AI decision-making and bias awareness |

---

## Key Features

- **B2C & B2B flows** — self-serve candidate assessments and embeddable partner widgets
- **Role Fit Analysis** — AI-powered candidate-to-role alignment with gap analysis and interview questions
- **Ecosystem Index** — team capability diagnostics with mission-statement analysis and ideal candidate profiling
- **PDF Reports** — server-side Puppeteer rendering for pixel-perfect B2B and B2C exports; large files delivered via email
- **Timer persistence** — assessment timers pause on tab close and resume on return, with server-side validation
- **Multi-currency billing** — Stripe + Airwallex, PPP pricing, discount codes, PAYG / subscription / enterprise tiers
- **Dual email** — Gmail primary with SendGrid failover; bounce tracking via SendGrid webhooks
- **Sales funnel** — Kanban board for partner pipeline management (Lead → Closed Won/Lost)
- **Super Admin dashboards** — revenue analytics, profit vs. AI cost, audit logs, active session management, social poster

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI, Wouter, TanStack Query |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Neon), Drizzle ORM |
| AI | OpenAI GPT-5 |
| Payments | Stripe, Airwallex |
| Email | Gmail (Nodemailer), SendGrid |
| PDF | Puppeteer (server-side headless rendering) |
| Storage | Replit Object Storage |
| Auth | Session-based (bcryptjs), CSRF protection |

---

## Project Structure

```
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── components/      # Shared UI components
│       │   ├── admin/       # Super admin dashboard tabs
│       │   └── partner/     # Partner dashboard tabs
│       ├── pages/           # Route-level page components
│       ├── contexts/        # React context providers
│       └── lib/             # Utilities, query client, PDF helpers
├── server/                  # Express backend
│   ├── routes.ts            # Core API routes
│   ├── payment-routes.ts    # Stripe / Airwallex payment endpoints
│   ├── assessment-routes.ts # Assessment lifecycle endpoints
│   ├── webhook-routes.ts    # Stripe & SendGrid webhook handlers
│   ├── partner-routes.ts    # Partner-specific endpoints
│   ├── storage.ts           # Database access layer (Drizzle)
│   ├── email.ts             # Gmail transactional email
│   ├── email-sendgrid.ts    # SendGrid transactional email
│   └── middleware/          # Auth, CSRF, rate limiting
├── shared/
│   └── schema.ts            # Drizzle schema + Zod types (shared source of truth)
└── docs/                    # Technical documentation
    ├── ARCHITECTURE.md
    ├── API.md
    └── DEPLOYMENT.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (connection string in `DATABASE_URL`)
- OpenAI API key
- Stripe account (test and live keys)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

This starts both the Express server and the Vite dev server on **port 5000**.

### Database migrations

```bash
npm run db:push
```

Pushes the Drizzle schema to the connected database without generating migration files.

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
| `SENDGRID_WEBHOOK_VERIFICATION_KEY` | SendGrid webhook signature key |

See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the full list and setup instructions.

---

## Documentation

| Document | Contents |
|---|---|
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System overview, module map, data flow, design decisions |
| [`docs/API.md`](./docs/API.md) | Every public API endpoint with request/response shapes |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | Environment setup, production build, migration steps, onboarding checklist |
| [`docs/LICENSES.md`](./docs/LICENSES.md) | Full open-source license inventory |

---

## License

Copyright © 2026 PT Human Metrix Assessments. Released under the [MIT License](./LICENSE).

Third-party attribution notices are listed in [`NOTICE`](./NOTICE).
