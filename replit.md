# HumanMetrix - AI Assessment Platform

## Overview
HumanMetrix is an AI assessment platform for recruitment and career development, offering enterprise-grade assessments to measure behavioral skills and AI literacy. It provides comprehensive insights into a candidate's fit for roles in the AI-driven economy, aiming to streamline hiring processes and support career growth through objective AI-powered skill evaluation. Key assessment types include FIT, AI Readiness, Prompt Architecture, and Algorithmic Integrity Quotient (AIQ).

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `attached_assets/`.
Do not make changes to the file `replit.nix`.

## System Architecture

### UI/UX Decisions
The frontend uses React + TypeScript, Shadcn UI, and Tailwind CSS for a professional aesthetic. Wouter handles navigation, and TanStack Query manages data fetching. UI components include a responsive landing page, assessment selection, results pages, and an admin dashboard. Branding features a new HM monogram logo with a cyan/blue gradient. PDF reports are designed for professional readability with consistent branding and support overlapping radar charts for multi-candidate comparison. Hero section animations are scroll-triggered and accessibility-supported. Product roadmap timeline visualization displays upcoming assessment releases with status badges and timeline connector.

**Background Design System**: Network tech background image (50% opacity) with gradient overlays creates a cohesive visual identity across key pages:
- **Dashboard & MyResults**: Dark navy overlay (rgba(13,29,51,0.85-0.75-0.85)) with white text for premium, sophisticated feel
- **About & ForEmployers**: Light grey overlay (rgba(241,245,249,0.92-0.88-0.92)) with black text for professional readability
- All backgrounds use fixed positioning for smooth scrolling and consistent brand presence

### Technical Implementations
- **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS.
- **Backend**: Express, TypeScript.
- **Database**: PostgreSQL (Neon) with Drizzle ORM.
- **Authentication**: Email/Password using bcryptjs for hashing and session-based authentication.
- **Payment**: Stripe integration for guest checkout.
- **AI Integration**: OpenAI API (GPT-5) for advanced assessment evaluations and AI-powered role alignment analysis.
- **Email Services**: Nodemailer with Gmail for transactional emails.
- **PDF Generation**: `jsPDF` and `html2canvas` for dynamic, comprehensive PDF reports.

### Feature Specifications
- **Assessment Types**: FIT (behavioral), AI Readiness, Prompt Architecture (GPT-5 evaluated), AIQ (AI ethics with graded scoring).
- **Enhanced Score Differentiation**: FIT and AI Readiness use a curved scoring formula to create meaningful differentiation while maintaining a 50% floor. Formula: `50 + (raw * 0.4) + (raw^2 * 0.05)` results in: Average performers (~50% raw) → ~71%, Strong performers (~80% raw) → ~85%, Exceptional performers (100% raw) → 95%. Creates ~25pt spread in top half vs old ~10pt spread.
- **AIQ Graded Scoring System**: Uses weighted option scores (Best Answer 100%, Acceptable 65-75%, Suboptimal 30-50%, Poor 0-25%) to capture nuanced ethical reasoning. Results display 20% band interpretations: Exemplary (80-100%), Strong (60-79%), Developing (40-59%), Significant Gaps (20-39%), Critical Concerns (0-19%). Colors are consistent across all surfaces (green/blue/amber/orange/red). Centralized via `getAIQBandInterpretation` helper in aiq-questions.ts.
- **Payment Flow**: Payment-deferred model where candidates take assessments for free and pay only to unlock results. A "FREE" discount code (100% off) is supported.
- **User Flows**: Self-service for candidates and admin-invited users, both following the pay-after-completion model.
- **Admin Dashboard**: Features candidate management, multi-candidate comparison (radar charts), AI-powered role fit analysis, and Scoring QA (Golden Set monitoring).
- **Enhanced PDF Export System**: Generates multi-page, visually organized PDF reports with dynamic content, including individual and comparison reports.
- **Results Access Gating**: Requires completion of all four distinct assessments before results can be viewed or unlocked.
- **Product Roadmap**: Visual timeline showing December 2025 platform launch (current assessments), February 2026 Perfect Role Finder, March 2026 AI Output Translator, May 2026 Team Analysis & Building Tool, TBC 2026 Social Influence Assessment, Q3 2026 Human-AI Collaboration Style & AI Tool Fluency, Q4 2026 AI-Assisted Problem Solving & AI Risk Awareness, and 2027 Adaptability Quotient (AQ).
- **Marketing Email Opt-in**: Subscribe page (/news) with popup-style centered card for capturing job seeker emails from job ad links. Data stored in marketing_optins table for targeting campaigns. Redirects to landing page after submission.
- **Golden Set Benchmark System**: GPT-5 scoring consistency verification using 10 benchmark prompts across all 7 difficulty levels. Runs daily at midnight UTC. Features **smoothed evaluation** (5 runs per prompt, averaged) to eliminate LLM variance and provide stable drift measurements. Uses 2% drift threshold to detect true model changes. Admin UI shows pass/fail status, expected vs actual scores, and drift percentage. "Reset & Recalibrate" button runs smoothed calibration to establish new baseline.
- **Multi-Currency Pricing System**: Automatic location detection displays prices in users' local currencies (50+ currencies including THB, PHP, INR, JPY, USD, EUR, etc.). Uses ipapi.co (HTTPS, free tier) for secure IP geolocation with 5-minute server-side caching. CurrencyContext provides global state with localStorage persistence for both currency and country preferences. Manual currency selector dropdown allows override. All prices stored in GBP pence, converted using exchange rates in `shared/currencies.ts`.
- **PPP (Purchasing Power Parity) Pricing**: 3-tier regional pricing system - Tier 1 (Western markets, 1.0x), Tier 2 (Middle markets, 0.7x), Tier 3 (Emerging markets, 0.5x). Stripe checkout sessions charge users in their local currency using `convertToStripeCurrencyAmount()` helper which handles zero-decimal currencies (JPY, KRW, VND, IDR, etc.) correctly. Metadata includes countryCode, pricingTier, and localCurrency for analytics.
- **SEA Launch Pricing (Dec 2025)**: Strategic flat-rate pricing for Southeast Asia market entry. SEA launch countries bypass PPP multipliers and pay fixed USD amounts for the complete assessment suite:
  - **Philippines**: $1.00 USD (~79p GBP) - Pilot market
  - **Vietnam**: $1.20 USD (~95p GBP) - Tech & software hub expansion
  - **Indonesia**: $1.10 USD (~87p GBP) - E-commerce & retail expansion
  - **Malaysia**: $1.80 USD (~142p GBP) - Shared services & finance expansion
  - Implementation in `shared/currencies.ts` with `SEA_LAUNCH_COUNTRIES` config, `hasSEALaunchPricing()` and `getSEALaunchPriceInPence()` helpers. CurrencyContext exposes `isSEALaunchCountry` and `seaLaunchPricing` for frontend display. All Stripe checkout endpoints detect SEA countries and charge flat suite price instead of base fee + per-assessment pricing.
- **B2B Partner Integration System**: Complete enterprise integration enabling clients to embed assessments on their platforms. Features:
  - **Partner Accounts**: Managed via admin dashboard (super_admin only) with company details, pricing tiers, and Stripe billing configuration.
  - **API Key Authentication**: Secure key pairs (hm_live_*/hm_test_*) with bcrypt hashing, prefix-based lookup, rate limiting (100 req/min default), and configurable permissions.
  - **Assessment Sessions**: Partners create sessions via REST API, candidates complete via embedded widget or redirect, results returned via API or webhook.
  - **Embeddable Widget** (`/embed/widget.js`): Drop-in JavaScript widget using Shadow DOM for style isolation. Supports all assessment types with customisable theming.
  - **JavaScript SDK** (`/embed/sdk.js`): UMD module supporting npm and CDN usage. HumanMetrixClient class with session creation, widget launching, and results retrieval.
  - **Usage-Based Billing**: Events tracked in usage_events table with billable flag. Stripe metered billing integration for subscription-based invoicing. Admin endpoints for billing info, Stripe customer creation, and subscription management.
  - **Developer Documentation** (`/developers`): Comprehensive docs with Quick Start, Widget integration, SDK reference, and REST API documentation.

### System Design Choices
- **Modular Architecture**: Clear separation of frontend and backend.
- **Scalable Database Schema**: Supports users, assessments, results, invitations, and AI evaluation data.
- **Secure Authentication**: Robust session-based authentication with explicit session persistence.
- **API-driven**: Comprehensive API endpoints for all functionalities.
- **Content-Aware PDF Rendering**: Dynamic layout ensures readability and visual consistency.
- **Cache Refresh Pattern**: All data-changing flows use cache invalidation + refetch + refresh URL parameter.

### Scalability Optimizations (Dec 2025)
- **Database Indexes**: Comprehensive indexes on frequently queried columns (users.email/role, purchases.userId/status, assessment_results.userId/type/status, invitations.token/email).
- **Connection Pool Tuning**: 20 connections dev / 50 production with extended timeouts.
- **API Rate Limiting**: Memory-based per-IP rate limiting (100 req/min general, 10/15min auth, 20/min Stripe).
- **Request Deduplication**: Prevents duplicate POST/PUT/DELETE within 500ms window.
- **Lazy Module Loading**: OpenAI, Stripe, jsPDF loaded on-demand with production preloading.
- **Static Asset Caching**: Immutable assets cached 1 year (hashed), static 1 day.
- **HTTP Keep-Alive**: 65s timeout reduces TCP handshake overhead.
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy.
- **Trust Proxy**: Enabled in production for correct IP detection behind load balancers.

### Bug Fixes Applied (Nov 2025)
- **Session Race Condition**: Added explicit `await req.session.save()` in login/signup to ensure session is persisted to PostgreSQL before responding.
- **Dashboard Refresh**: Implemented refresh URL parameter pattern (`?refresh=timestamp`) for data-changing flows (Purchase, Assessment, PurchaseSuccess, CheckoutModal).
- **Assessment Status Display**: Fixed API to return actual result status (`in_progress`, `ready`) instead of purchase item status; Dashboard now shows "In Progress" with yellow badge and "Continue Assessment" button.
- **Cache Invalidation**: Added proper refetch after invalidation in all mutation handlers to ensure fresh data.
- **Multiple Testing Series**: Fixed `/api/available-assessments` to use purchase-item-specific tracking (`purchase::${item.id}`) instead of assessment type tracking, allowing users to have multiple testing series with the same assessment types.

## External Dependencies
- **PostgreSQL (Neon)**: Database hosting.
- **Stripe**: Payment gateway.
- **OpenAI API**: For GPT-5 based assessment evaluations and AI role alignment.
- **Gmail (via Nodemailer)**: For transactional emails.
- **Replit Auth**: User management.