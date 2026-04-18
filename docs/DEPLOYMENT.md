# HumanMetrix — Deployment Guide

> Cross-links: [Architecture](./ARCHITECTURE.md) · [API Reference](./API.md)

---

## 1. Environment Variables

All secrets are managed as Replit environment variables (Settings → Secrets in the Replit workspace). For local development, add them to a `.env` file at the project root (**never commit this file**).

### Required — Core

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:pass@host/db?sslmode=require`) |
| `SESSION_SECRET` | Long random string used to sign session cookies (min 32 chars) |
| `NODE_ENV` | `development` or `production` |

### Required — AI

| Variable | Description |
|---|---|
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key (primary, used for all AI features) |

### Required — Payments

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_…` or `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_…`) |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key for the frontend (`pk_live_…` or `pk_test_…`) |

### Required — Email

| Variable | Description |
|---|---|
| `GMAIL_USER` | Gmail address used for sending transactional emails |
| `GMAIL_APP_PASSWORD` | Gmail App Password (not the account password) |

### Required — Replit

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `5000` |
| `REPLIT_DOMAINS` | Comma-separated Replit domains | Set automatically by Replit |
| `REPLIT_DEV_DOMAIN` | Dev domain for URL construction | Set automatically by Replit |
| `REPL_IDENTITY` | Replit identity token (for email connectors) | Set automatically |

### Optional — Airwallex

| Variable | Description |
|---|---|
| `AIRWALLEX_ENVIRONMENT` | `prod` or `demo` |
| `AIRWALLEX_CLIENT_ID` | Airwallex OAuth client ID |
| `AIRWALLEX_API_KEY` | Airwallex API key |
| `AIRWALLEX_WEBHOOK_SECRET` | Airwallex webhook signing secret |

### Optional — Object Storage

| Variable | Description |
|---|---|
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Replit Object Storage bucket ID |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Public asset search paths (set by Replit integration) |
| `PRIVATE_OBJECT_DIR` | Private upload directory (set by Replit integration) |

### Optional — Social Posting

| Variable | Description |
|---|---|
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn OAuth token for posting |
| `LINKEDIN_AUTHOR_ID` | LinkedIn author/organization ID |
| `INSTAGRAM_ACCESS_TOKEN` | Instagram Graph API token |
| `INSTAGRAM_USER_ID` | Instagram user/business account ID |

### Optional — SendGrid

| Variable | Description |
|---|---|
| `SENDGRID_WEBHOOK_VERIFICATION_KEY` | SendGrid inbound webhook signing key |
| `SENDGRID_ALLOW_UNSIGNED_WEBHOOKS` | `true` to skip signature check (dev only) |

### Optional — Xero Accounting

| Variable | Description |
|---|---|
| `XERO_CLIENT_ID` | Xero OAuth2 app client ID |
| `XERO_CLIENT_SECRET` | Xero OAuth2 app client secret |

### Optional — Misc

| Variable | Description |
|---|---|
| `PRODUCTION_URL` | Canonical production URL (e.g. `https://www.humanmetrix.co.uk`) |
| `OPENAI_API_KEY` | Fallback OpenAI key (some modules) |
| `PUPPETEER_EXECUTABLE_PATH` | Path to Chromium for PDF generation (if not using system default) |
| `CRON_SECRET` | Secret for authorizing scheduled cron endpoints |
| `SUPER_ADMIN_EMAILS` | Comma-separated emails granted super admin access |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | Override OpenAI base URL (proxy/alternative provider) |

---

## 2. Local Development Setup

### Prerequisites

- Node.js 20+ (managed by Replit's Nix environment)
- PostgreSQL database (Neon serverless or local)
- All required environment variables set

### Steps

```bash
# 1. Clone the repository (or open in Replit)
git clone <repo-url>
cd humanmetrix

# 2. Install dependencies
npm install

# 3. Set environment variables
# In Replit: use Secrets panel
# Locally: create .env file with the required vars listed above

# 4. Push the database schema (first-time or after schema changes)
npm run db:push

# 5. Start the development server
npm run dev
```

The server starts on `http://localhost:5000` (or `$PORT` if set). Both the Express API and Vite dev server run on the same port via the unified entry point.

### Accessing the Dev Server

- **Frontend**: `http://localhost:5000/`
- **API**: `http://localhost:5000/api/…`
- **Partner widget test**: `http://localhost:5000/embed-test.html`

---

## 3. Production Build

```bash
# Build the React frontend (output: dist/public/)
npm run build

# Start the production server
npm run start
```

The production server serves static assets from `dist/public/` and the Express API from the same process on port `$PORT`.

**Important**: Set `NODE_ENV=production` before running `npm run start` in production.

---

## 4. Replit Deployment

HumanMetrix is deployed on Replit using the built-in **Deployments** feature (Autoscale deployment).

### Deploy Steps

1. Open the Replit workspace.
2. Click the **Deploy** button in the top-right of the workspace.
3. Select **Autoscale** deployment type.
4. Confirm the run command is `npm run start`.
5. Click **Deploy**.

Replit automatically builds the project and publishes it to the configured domain (`www.humanmetrix.co.uk`).

### Domain Configuration

The primary domain is `www.humanmetrix.co.uk`. The server performs 301 redirects from the following aliases to the primary domain:

- `humanmetrix.co.uk`
- `www.humanmetrix-ai.com`
- `humanmetrix-ai.com`
- `www.humanmetrixai.com`
- `humanmetrixai.com`

These redirects are configured in `server/index.ts` and require no DNS changes — they are enforced at the application layer.

### Webhook Configuration After Deployment

After deploying (or if the domain changes), update the following external webhook URLs:

| Provider | Webhook URL |
|---|---|
| Stripe | `https://www.humanmetrix.co.uk/api/webhooks/stripe` |
| Airwallex | `https://www.humanmetrix.co.uk/api/webhooks/airwallex` |
| SendGrid | `https://www.humanmetrix.co.uk/api/webhooks/sendgrid` |

These are configured in each provider's dashboard.

---

## 5. Database Migrations

HumanMetrix uses **Drizzle ORM** with Drizzle Kit for schema management.

### Schema File

All table definitions live in `shared/schema.ts`. This is the single source of truth for both the database schema and TypeScript types.

### Applying Schema Changes

```bash
# Push schema changes directly to the database (no migration file generated)
npm run db:push
```

`db:push` is the recommended workflow for this project. It introspects the current database state and applies the diff directly.

> **Note**: `db:push` is non-destructive for additive changes (new tables, new columns). For destructive changes (dropping columns, renaming tables), review the diff carefully before applying.

### Generating Migration Files (alternative)

If you need SQL migration files for auditing or manual review:

```bash
npx drizzle-kit generate
```

This outputs SQL files to the `migrations/` directory. To apply them:

```bash
npx drizzle-kit migrate
```

### Viewing the Schema

```bash
npx drizzle-kit studio
```

Opens a local browser UI to browse the database schema and data.

---

## 6. New Developer Onboarding Checklist

Use this checklist when onboarding a new engineer to the project.

### Access & Credentials

- [ ] Add to Replit workspace (owner or collaborator)
- [ ] Share Neon database credentials (or provision a dev branch)
- [ ] Share Stripe test keys (`sk_test_…`, `pk_test_…`)
- [ ] Share OpenAI API key or create a new one under the org account
- [ ] Provide Gmail + App Password for a dev email account
- [ ] Grant access to Airwallex demo environment (if working on payments)

### Local Setup

- [ ] Install Node.js 20+ (or use Replit's environment directly)
- [ ] Run `npm install`
- [ ] Copy all required secrets into `.env` or Replit Secrets panel
- [ ] Run `npm run db:push` to initialize the database schema
- [ ] Run `npm run dev` and confirm the server starts on port 5000

### Verification

- [ ] Navigate to `http://localhost:5000` — landing page loads
- [ ] Create a test account via `/api/signup` or the UI
- [ ] Complete a free FIT assessment using discount code `FREE`
- [ ] Check the admin dashboard at `/admin` (requires `super_admin` role)
- [ ] Send a test email via the contact form to verify email delivery

### Architecture Orientation

- [ ] Read [ARCHITECTURE.md](./ARCHITECTURE.md) — system overview
- [ ] Read [API.md](./API.md) — endpoint reference
- [ ] Review `shared/schema.ts` — data model
- [ ] Review `server/routes.ts` — route registration hub
- [ ] Review `server/storage.ts` — data access layer (`IStorage` interface)

---

## 7. Rollback Procedure

### Replit Checkpoint Rollback (Recommended)

Replit automatically creates checkpoints of the codebase, chat session, and database at regular intervals.

1. Open the Replit workspace.
2. Click the **History** icon in the left sidebar.
3. Browse checkpoints and select the one to restore.
4. Click **Restore** to roll back code, or **Restore DB** to roll back the database.

> **Warning**: Rolling back the database is destructive and will lose all data written after the checkpoint. Confirm the checkpoint timestamp before restoring.

### Code-Only Rollback

If only the code needs to be reverted (not the database):

1. Use Replit's checkpoint history to restore just the codebase.
2. Or use Git: `git revert <commit>` and redeploy.

### Database-Only Rollback

If a schema migration caused issues:

1. Identify the last-known-good schema state from `shared/schema.ts` in version history.
2. Manually drop or alter affected columns using the Neon console or `psql`.
3. Re-run `npm run db:push` to re-sync Drizzle's state.

> There is currently no automated migration rollback (Drizzle `db:push` is not reversible). For production rollbacks, always restore from a Neon database snapshot.

### Emergency Contacts

- **Replit Support**: support.replit.com
- **Neon Support**: neon.tech/docs
- **Stripe Support**: stripe.com/support
- **Airwallex Support**: airwallex.com/support

---

## 8. Health Checks

### API Health

```
GET /api/version
GET /api/partner/health
```

Both return `200` with a JSON body when the server is running correctly.

### Database Connection

The server logs `serving on port <PORT>` on successful startup. If the database is unreachable, the process will throw at startup. Check the Replit workflow logs for `[DB]` prefixed messages.

### Queue Health

```
GET /api/admin/queue-stats
```

Returns queue depth, processing rate, and failure counts (requires super admin session).

---

## 9. Performance Notes

- **Gzip compression**: Enabled for all responses above 1 KB (threshold configurable in `server/index.ts`).
- **HTTP Keep-Alive**: Tuned in `server/middleware/keepAlive.ts`.
- **Static assets**: Served with long-term `Cache-Control` headers in production.
- **Lazy module loading**: Heavy modules (Puppeteer, pdf-parse) are lazily imported and pre-warmed on startup in production via `server/lazyModules.ts`.
- **Route-based code splitting**: React frontend uses `React.lazy()` for all page components, minimizing the initial bundle.
- **Database connection pooling**: Configured in `server/db.ts`. Pool size is tuned for Neon serverless.
