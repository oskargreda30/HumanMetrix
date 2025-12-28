# HumanMetrix - AI Assessment Platform

## Overview
HumanMetrix is an AI assessment platform for recruitment and career development. It offers enterprise-grade assessments to measure behavioral skills and AI literacy, providing insights into candidate fit for AI-driven roles. The platform aims to streamline hiring and support career growth through objective AI-powered skill evaluation, focusing on assessment types like FIT, AI Readiness, Prompt Architecture, and Algorithmic Integrity Quotient (AIQ).

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `attached_assets/`.
Do not make changes to the file `replit.nix`.

## System Architecture

### UI/UX Decisions
The frontend uses React + TypeScript, Shadcn UI, and Tailwind CSS. Navigation is handled by Wouter, and data fetching by TanStack Query. UI components include a responsive landing page, assessment selection, results pages, and an admin dashboard. Branding features a new HM monogram logo with a cyan/blue gradient. PDF reports are designed for professional readability with consistent branding, supporting overlapping radar charts. Hero section animations are scroll-triggered, and accessibility-supported. A product roadmap visualizes upcoming assessment releases. A network tech background image with gradient overlays creates a cohesive visual identity across key pages (Dashboard, MyResults, About, ForEmployers).

### Technical Implementations
- **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS.
- **Backend**: Express, TypeScript.
- **Database**: PostgreSQL (Neon) with Drizzle ORM.
- **Authentication**: Email/Password with bcryptjs and session-based authentication.
- **Payment**: Stripe integration for guest checkout.
- **AI Integration**: OpenAI API (GPT-5) for assessment evaluations and role alignment.
- **Email Services**: Nodemailer with Gmail.
- **PDF Generation**: `jsPDF` and `html2canvas`.

### Feature Specifications
- **Assessment Types**: FIT (behavioral), AI Readiness, Prompt Architecture, AIQ (AI ethics).
- **Enhanced Scoring**: FIT and AI Readiness use a curved scoring formula for better differentiation; AIQ uses a weighted graded scoring system with 20% band interpretations.
- **Payment Flow**: Pay-deferred model; candidates complete assessments for free and pay to unlock results. Supports 100% off discount codes.
- **User Flows**: Self-service for candidates and admin-invited users.
- **Admin Dashboard**: Candidate management, multi-candidate comparison, AI-powered role fit analysis, and Scoring QA (Golden Set monitoring).
- **Enhanced PDF Export System**: Generates multi-page, dynamic PDF reports.
- **Results Access Gating**: Requires completion of all four distinct assessments to view results.
- **Results Retention Consent**: Popup after completing all assessments asking users to share results with employers or keep private. Explicit button choice required; consent stored with timestamp.
- **Product Roadmap**: Visual timeline of future assessment releases (e.g., Perfect Role Finder, AI Output Translator).
- **Marketing Email Opt-in**: Subscribe page for capturing job seeker emails.
- **Golden Set Benchmark System**: GPT-5 scoring consistency verification using benchmark prompts, daily runs with smoothed evaluation to detect drift. Admin UI for monitoring.
- **Multi-Currency Pricing**: Automatic location detection displays prices in local currencies using `ipapi.co` with server-side caching and `CurrencyContext` for state.
- **PPP Pricing**: 3-tier regional pricing (Tier 1: 1.0x, Tier 2: 0.7x, Tier 3: 0.5x). Stripe checkout handles local currency conversion. All countries including SEA markets now use PPP-adjusted pricing with live exchange rates.
- **Active Discount Codes**: `FREE` (100% off) and `20OFFPRICE` (20% off).
- **B2B Partner Integration**: Enterprise integration for clients to embed assessments.
    - **Partner Accounts**: Managed via admin dashboard with automatic admin user creation.
        - **Automatic Admin Account Creation**: When a new partner is created, the system automatically creates an organisation (if needed), generates an admin user with cryptographically secure temporary password (128-bit entropy, format: HMx-[22 chars]), and sends a professional welcome email with login credentials.
        - **Rollback on Failure**: If partner creation fails after creating organisation/user, the system automatically cleans up orphaned records.
    - **3-Tier Billing System**:
        - **Prepaid (Top-up)**: Partners purchase test packages upfront; balance deducted per test.
        - **Auto-Bill (Card on File)**: Monthly usage tracked; card charged automatically on billing cycle anchor day.
        - **Invoice (Enterprise)**: Monthly usage tracked; manual invoicing with configurable payment terms.
    - **Billing Scheduler**: Daily job at 1am UTC processes auto-bill charges and archives monthly usage.
    - **Monthly Usage Tracking**: `partnerMonthlyUsage` table tracks tests used, amounts, and billing status per month.
    - **Flexible Deal Configuration**: Customisable partner deals with:
        - Free test allocation (0-500 complimentary tests) auto-credited on registration.
        - Billing cycle anchor (day 1-28 of month for auto-bill/invoice).
        - Payment terms for invoiced clients (Net 15/30/45/60/90).
        - Invoice contact and notes for enterprise clients.
    - **API Key Authentication**: Secure key pairs with rate limiting and permissions.
    - **Assessment Sessions**: Partners create sessions via REST API; results returned via API or webhook.
    - **Embeddable Widget**: JavaScript widget using Shadow DOM for style isolation.
    - **JavaScript SDK**: UMD module for session creation, widget launching, and results retrieval.
    - **Usage-Based Billing**: Stripe metered billing for subscription-based invoicing.
    - **Developer Documentation**: Comprehensive `/developers` docs, including OpenAPI/Swagger.
    - **OpenAPI/Swagger Documentation**: Full OpenAPI 3.0 specification at `/api/partner/openapi.json` with Swagger UI.
    - **Prepaid Test Package Quota System**: Partners purchase tiered test packages. Features quota tracking, automatic API suspension, email notifications, and admin UI management.
    - **Usage Dashboard Tab**: Admin dashboard tab for platform-wide and organization-specific B2B partner usage statistics.
    - **Partner Invoice System**: Admins can send professional invoices to invoice-billed partners directly from the dashboard. Features include:
        - Invoice generation with automatic invoice number sequencing (INV-YYYY-NNNN format).
        - Period selection for billing cycles.
        - VAT calculation (0% or 20% UK standard).
        - Professional HTML email template with HumanMetrix branding.
        - Invoice history tracking with status management (sent, paid, overdue, cancelled).
        - Due date calculation based on partner payment terms.
    - **Multi-Organisation Hierarchy**: Recruitment agencies (partners) can manage multiple client organisations, each with their own API keys for usage tracking while maintaining centralised billing through the parent partner account.
- **Health Monitoring System**: Comprehensive system health and error monitoring for super admins.
    - **Health Tab Sub-sections**: Overview (aggregate stats), Health Checks (system components), Latency (API performance), Errors (application errors).
    - **Severity Categorisation**: All metrics categorised as critical, error, warning, or info with colour-coded visual indicators.
    - **Health Checks Monitored**: Database connectivity/latency, OpenAI API status, Stripe API status, Email service status, Memory usage, Process uptime.
    - **Latency Monitoring**: API endpoint response times with 95th percentile tracking.
    - **Error Tracking**: Database-backed error storage with message, stack trace, severity, status, source, URL, method, status code, and associated user/partner/API key.
    - **Error Fingerprinting**: Similar errors grouped by fingerprint hash to reduce noise and track occurrence counts.
    - **Status Workflow**: new, investigating, resolved, ignored - with notes and resolution tracking.
    - **API Endpoints**: GET /api/admin/health/checks, GET /api/admin/health/latency, GET /api/admin/errors/stats, GET /api/admin/errors, GET /api/admin/errors/:id, PATCH /api/admin/errors/:id, GET /api/admin/errors/group/:fingerprint.
- **Payment & Billing Oversight**: Super admin dashboard for monitoring revenue and managing payments.
    - **Billing Statistics**: Total revenue, completed/pending transactions, average order value, and 12-month revenue trend chart.
    - **Transaction Management**: Filterable transaction list with customer details, assessment items, discount codes, and payment status.
    - **Refund Capability**: Issue full or partial refunds directly from the dashboard via Stripe API integration.
    - **Promo Code Management**: Create, view, and deactivate Stripe promotion codes with usage tracking.
    - **API Endpoints**: GET /api/admin/billing/stats, GET /api/admin/billing/transactions, GET/POST/PATCH /api/admin/billing/promo-codes, POST /api/admin/billing/refund.
- **Results Retention Consent Dashboard**: Super admin tab for viewing user consent preferences.
    - **Consent Tracking**: View users who opted in, opted out, or have pending consent status.
    - **User Details**: Email, name, consent status, consent date, and account creation date.
    - **Filterable View**: Filter by opted_in, opted_out, or pending status.
    - **API Endpoint**: GET /api/admin/consent?filter={opted_in|opted_out|pending}.

### System Design Choices
- **Modular Architecture**: Clear separation of frontend and backend.
- **Scalable Database Schema**: Supports users, assessments, results, and AI data.
- **Secure Authentication**: Robust session-based authentication with CSRF protection.
- **CSRF Protection**: Double-submit cookie pattern protects all state-changing endpoints. Exempt routes: login, signup, create-free-invitation, process-results-payment, Stripe webhooks, partner API (uses API key auth). Frontend automatically includes `x-csrf-token` header on POST/PUT/PATCH/DELETE requests.
- **API-driven**: Comprehensive API endpoints.
- **Content-Aware PDF Rendering**: Dynamic layout for readability.
- **Cache Refresh Pattern**: Cache invalidation + refetch + refresh URL parameter for data changes.
- **Scalability Optimizations**: Database indexes, connection pool tuning, API rate limiting, request deduplication, lazy module loading, static asset caching, HTTP Keep-Alive, security headers, and trust proxy.
- **Rate Limiting**: In-memory rate limiting using express-rate-limit. Note: In-memory storage is acceptable for single-instance deployments but would require Redis or similar for horizontal scaling across multiple instances.
- **Logging Security**: API response logging sanitises sensitive fields (password, email, names, tokens, etc.) and is disabled in production to prevent PII exposure.

## Testing
- **Framework**: Vitest (v1.6.0) with Supertest for API testing.
- **Configuration**: `vitest.config.ts` at project root.
- **Run Tests**: `npx vitest run` (all tests) or `npx vitest` (watch mode).
- **Test Coverage**:
    - **Unit Tests**:
        - **Scoring Algorithms** (`tests/unit/scoring.test.ts`): Tests FIT and AI Readiness scoring matrices, hybrid scoring formula, score bounds validation, and regression guards. (23 tests)
        - **Billing Logic** (`tests/unit/billing.test.ts`): Tests prepaid deductions, auto-bill usage tracking, invoice calculations, and month-key generation. (23 tests)
        - **Email Templates** (`tests/unit/email.test.ts`): Tests standardised sender address (hello@humanmetrix.co.uk), template rendering, PII sanitisation, and date/currency formatting. (34 tests)
        - **Assessment Evaluation** (`tests/unit/assessment-evaluation.test.ts`): Tests time limits, question counts, answer validation, score normalisation, OpenAI retry patterns, and band interpretations. (58 tests)
        - **Storage Layer** (`tests/unit/storage.test.ts`): Tests CRUD operations, data validation patterns, query transformations, referential integrity, and soft-fail patterns. (39 tests)
    - **Integration Tests**:
        - **CSRF Middleware** (`tests/integration/csrf.test.ts`): Tests token generation, double-submit validation, exempt paths, and API key bypass. (24 tests)
        - **Authentication** (`tests/integration/auth.test.ts`): Tests signup, login, password reset, session management, and user response sanitisation. (32 tests)
        - **Partner API** (`tests/integration/partner-api.test.ts`): Tests API key authentication, permissions, rate limiting, session management, and quota system. (40 tests)
        - **Stripe/Purchases** (`tests/integration/stripe-purchases.test.ts`): Tests PPP pricing tiers, SEA launch pricing, discount codes, currency conversion, webhook validation, and idempotency. (49 tests)
- **Total Tests**: 322 passing tests across 9 test files.

## External Dependencies
- **PostgreSQL (Neon)**: Database hosting.
- **Stripe**: Payment gateway.
- **OpenAI API**: AI-powered assessment and role alignment.
- **Gmail (via Nodemailer)**: Transactional email service.
- **Replit Auth**: User management.