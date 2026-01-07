# HumanMetrix - AI Assessment Platform

## Overview
HumanMetrix is an AI assessment platform for recruitment and career development. It provides enterprise-grade assessments to measure behavioral skills and AI literacy, offering insights into candidate fit for AI-driven roles. The platform aims to streamline hiring and support career growth through objective AI-powered skill evaluation, focusing on assessment types like FIT, AI Readiness, Prompt Architecture, and Algorithmic Integrity Quotient (AIQ).

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `attached_assets/`.
Do not make changes to the file `replit.nix`.

## System Architecture

### UI/UX Decisions
The frontend uses React + TypeScript, Shadcn UI, and Tailwind CSS, with Wouter for navigation and TanStack Query for data fetching. Key UI components include a responsive landing page, assessment selection, results pages, and an admin dashboard. Branding features a new HM monogram logo with a cyan/blue gradient and professional PDF reports with consistent branding. Hero section animations are scroll-triggered, and a network tech background image with gradient overlays maintains a cohesive visual identity across key pages. A product roadmap visualizes upcoming assessment releases.

### Technical Implementations
- **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS.
- **Backend**: Express, TypeScript.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Email/Password with bcryptjs and session-based authentication.
- **Payment**: Stripe integration.
- **AI Integration**: OpenAI API (GPT-5).
- **Email Services**: Nodemailer.
- **PDF Generation**: `jsPDF` and `html2canvas`.

### Feature Specifications
- **Assessment Types**: FIT (behavioral), AI Readiness, Prompt Architecture, AIQ (AI ethics) with enhanced scoring formulas. Includes SEA-localized question wording for Tier 3 emerging markets (same scoring, culturally adjusted vocabulary).
- **Payment Flow**: Pay-deferred model, allowing candidates to complete assessments before paying to unlock results. Supports discount codes.
- **User Flows**: Self-service for candidates and admin-invited users.
- **Admin Dashboard**: Candidate management, multi-candidate comparison, AI-powered role fit analysis, and Scoring QA.
- **Enhanced Role Fit Analysis**: AI-generated skill requirements with criticality levels (critical/important/nice-to-have), anonymous cohort benchmarking with percentile rankings (requires minimum 5 candidates per assessment type), data quality risk indicators (missing assessments, high variance, stale results), and optional premium services preview (interview questions, onboarding plans, culture fit analysis).
  - **Cohort Benchmarking Structure**: Assessment-type level benchmarks for FIT, AI Readiness, Prompt Architecture, and AIQ (not per-skill). Shows overall position with proper ordinal formatting (1st, 2nd, 3rd, etc.), percentile = (belowCount / (total - 1)) * 100. Both POST and GET role-alignment endpoints use identical calculation logic.
- **Enhanced PDF Export System**: Generates multi-page, dynamic PDF reports.
- **Results Access Gating & Retention**: Requires completion of all four distinct assessments to view results, with explicit user consent for sharing results.
- **Product Roadmap**: Visual timeline of future assessment releases.
- **Marketing Email Opt-in**: Subscribe page for job seeker emails.
- **Golden Set Benchmark System**: Verifies GPT-5 scoring consistency using benchmark prompts and daily runs.
- **Multi-Currency & PPP Pricing**: Automatic location detection with `ipapi.co` for local currency display and 3-tier regional pricing (PPP) via Stripe.
- **B2B Partner Integration**: Enterprise solution for embedding assessments, including partner accounts, 3-tier billing, a billing scheduler, flexible deal configuration, API key authentication, and an embeddable JavaScript widget/SDK.
- **B2B Test-Taker Results Monetization**: Test-takers can view results immediately for 75% of location-based B2C pricing or wait 30 days for free access. Email workflow: collect email at test start → congratulatory email after completion with payment link → results email with PDF attachment after payment.
  - **Volume-Based Pricing Model** ($1.00 = 1 Credit, 6-month expiration policy):
    | Tier | Monthly Volume | Price Per Test | Comparisons (Base-30%) | Role Fit (Base-20%) | Trial Quota |
    |------|---------------|----------------|------------------------|---------------------|-------------|
    | Boutique | 1-100 | $20.00 | $14.00 | $16.00 | 5 tests |
    | Growth | 101-500 | $10.00 | $7.00 | $8.00 | 10 tests |
    | Small Enterprise | 501-2,500 | $5.00 | $3.50 | $4.00 | 20 tests |
    | Enterprise | 2,501-9,999 | $2.50 | $1.75 | $2.00 | 50 tests |
    | Pro | 10,000+ | $1.00 | $0.70 | $0.80 | 50 tests |
  - **Billing Tiers**:
    - **PAYG (Pay As You Go)**: No card on file required. Partners purchase bulk credits upfront with volume discounts. API/dashboard suspended at zero credits.
    - **Subscription**: Card on file required. Minimum monthly charge plus auto-bill for additional usage at base rates. Continuous API access.
    - **Enterprise**: For high-volume BPOs. Pro-forma invoicing for bulk credit blocks. No credit extended until payment received.
  - **Unbundled Report Pricing**: Comparison Reports at 30% discount from base rate, Role Fit Reports at 20% discount from base rate.
- **Partner Self-Service Dashboard**: Allows partners to manage usage, billing, API keys, and quota alerts. Features include:
  - **Assessment Analytics**: Configurable time periods (daily/weekly/monthly) with bar charts for tests over time, breakdown by assessment type with average scores, and breakdown by organization.
  - **CSV Data Exports**: Direct download buttons for results, usage reports, and billing history.
  - **In-App Notifications**: Read/unread tracking with badge counter, color-coded notifications (amber for warnings, green for success), and mark-all-read functionality.
  - **Team Member Management**: Email invitations with 7-day expiry, role-based access (viewer/member/admin), and member removal.
  - **Bulk Candidate Invitations**: Partners can import candidates via CSV upload, drag-and-drop, or manual entry. Features include multi-assessment selection, client & server-side validation (duplicates, email formats), token usage preview for PAYG partners, branded email invitations, and downloadable error reports.
- **Partner Integration Features**: 
  - **Webhook Notifications**: Event-based webhooks for assessment.started, assessment.completed, session.created, session.expired, results.ready with HMAC-SHA256 signature verification, exponential backoff retry logic, and delivery logging.
  - **ATS Integrations**: Connect with Greenhouse, Lever, Workday, SAP SuccessFactors, Oracle HCM, or custom APIs with configurable sync modes (push/pull/bidirectional).
  - **Scheduled Exports**: Automated CSV exports (daily/weekly/monthly) delivered via email, SFTP, S3, or webhook.
- **CI/CD Testing Pipeline**: Pre-deployment test runner with admin-controlled toggle (production environment only). Tests can be enabled/disabled via System Settings tab in the production admin dashboard. The test runner (`scripts/run-tests-before-deploy.sh`) reads the setting from the production database and runs unit and integration tests using Vitest. The toggle is hidden in development with an explanatory message.
- **Health Monitoring System**: Comprehensive super admin dashboard for system health, error tracking with fingerprinting, and status workflow.
- **Payment & Billing Oversight**: Super admin dashboard for monitoring revenue, managing transactions (including refunds), and promo codes.
- **Results Retention Consent Dashboard**: Super admin tab for viewing and filtering user consent preferences.

### System Design Choices
- **Modular Architecture**: Clear separation of frontend and backend.
- **Scalable Database Schema**: Designed for users, assessments, results, and AI data.
- **Secure Authentication**: Robust session-based authentication with CSRF protection using double-submit cookie pattern.
- **API-driven**: Comprehensive API endpoints.
- **Content-Aware PDF Rendering**: Dynamic layout for readability.
- **Cache Refresh Pattern**: For data changes.
- **Scalability Optimizations**: Database indexes, connection pool tuning, API rate limiting, request deduplication, lazy module loading, static asset caching, HTTP Keep-Alive, security headers, and trust proxy.
- **Logging Security**: API response logging sanitises sensitive fields and is disabled in production.

## External Dependencies
- **PostgreSQL (Neon)**: Database hosting.
- **Stripe**: Payment gateway.
- **OpenAI API**: AI-powered assessment and role alignment.
- **Gmail (via Nodemailer)**: Transactional email service.
- **Replit Auth**: User management.