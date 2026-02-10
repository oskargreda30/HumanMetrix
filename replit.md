# HumanMetrix - AI Assessment Platform

## Overview
HumanMetrix is an AI assessment platform designed for recruitment and career development. It offers enterprise-grade assessments to objectively measure behavioral skills and AI literacy, providing crucial insights into candidate fit for AI-driven roles. The platform aims to streamline hiring processes and support career growth through AI-powered skill evaluation. Key assessment types include FIT, AI Readiness, Prompt Architecture, and Algorithmic Integrity Quotient (AIQ). The project's vision is to become a leading solution in AI-powered talent assessment, fostering a more skilled and adaptable workforce.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `attached_assets/`.
Do not make changes to the file `replit.nix`.

## System Architecture

### UI/UX Decisions
The frontend leverages React + TypeScript, Shadcn UI, and Tailwind CSS for a responsive and modern user experience, utilizing Wouter for routing and TanStack Query for data management. Design elements include a new HM monogram logo with a cyan/blue gradient, professional PDF report generation, scroll-triggered hero animations, and a network tech background. A product roadmap visualizes future assessment releases, and a dedicated marketing page (`/ecosystem-index`) highlights team capability diagnostics.

**Mobile Responsiveness**: The Partner Dashboard is fully optimized for mobile devices using Tailwind responsive classes. Key patterns applied:
- Font sizes: `text-xs md:text-base` or `text-sm md:text-lg` for smaller mobile text
- Padding: `p-3 md:p-6` for tighter mobile spacing
- Icons: `h-3 w-3 md:h-4 md:w-4` for smaller mobile icons
- Gaps: `gap-2 md:gap-4` for reduced mobile spacing
- Layouts: `flex-col md:flex-row` for stacked mobile layouts
All tabs (Overview, Analysis, Results, Invitations, Billing, Team, Settings, Ecosystem Index) use these consistent responsive patterns.

**Standalone Pages (without Navigation component)**: Pages that don't use the Navigation component (StartAssessment, EmbedAssessment, B2BResults, PartnerResult) use `pt-16 md:pt-8` or `pt-16 md:pt-12` to provide adequate top spacing on mobile devices for status bar clearance. Centered layouts (like GuestInvite loading/error states) don't need this adjustment.

### Technical Implementations
The platform uses a React, TypeScript, and Express stack with PostgreSQL and Drizzle ORM for data persistence. Authentication is handled via email/password with bcryptjs and session-based mechanisms. Payment processing is integrated with Stripe, supporting multi-currency and PPP pricing. AI capabilities are powered by the OpenAI API (GPT-5). A dual-provider email system (Gmail via Nodemailer and SendGrid) offers automatic failover and admin-configurable preferences. PDF generation uses `jsPDF` and `html2canvas`.

Key features include:
- **Assessment Types**: FIT, AI Readiness, Prompt Architecture, and AIQ, with SEA-localized content.
- **Assessment Timer Persistence**: Implements "pause on close" semantics - timer pauses when tab is closed and resumes from saved value when user returns. Uses periodic saves (30s), beforeunload sendBeacon saves, and a resume handshake (POST /start) to maintain data consistency. Server validates timer updates can only decrease (prevents time inflation).
- **Payment Flow**: Pay-deferred model, discount codes, multi-currency, and Purchasing Power Parity (PPP) pricing.
- **User Management**: Self-service and admin-invited user flows, B2C email confirmation, and partner invitation system.
- **Admin & Partner Dashboards**: Comprehensive tools for candidate management, multi-candidate comparison, AI-powered role fit analysis, scoring QA, billing oversight, subscription management, API key management, and detailed analytics.
- **Enhanced PDF Export System**: Dynamic, multi-page report generation with unified styling between B2B and B2C flows. Both use consistent blue color scheme (59, 130, 246) for all labels, skill bars instead of radar charts, and matching description text. B2B renders single assessment results while B2C renders comprehensive reports with all completed assessments. **Server-Side PDF Generation**: Uses Puppeteer headless browser to render the actual results page as PDF, ensuring exact styling match. For large PDFs (>20MB), files are stored in object storage and download links are sent via email instead of attachments. **Automatic PDF Delivery**: After B2B payment success, server-side PDF generation is triggered asynchronously and emailed to the candidate automatically.
- **Results Access**: Gated access requiring assessment completion and explicit consent for sharing.
- **Ecosystem Index (Team Diagnostic Tool)**: AI-powered team capability assessment with simplified workflow. Auto-creates a default "Team Diagnostic" project per partner (no manual project management required). Features include mission statement analysis, team FIT aggregation, deep dive questions, contextual gap analysis, and ideal candidate profile generation. Uses credit-based billing (20 credits per analysis).
- **Golden Set Benchmark System**: Ensures GPT-5 scoring consistency.
- **B2B Partner Integration**: Enterprise solution with embeddable assessments, 3-tier billing, API key authentication, JavaScript widget/SDK, and webhook notifications.
- **Billing & Notifications**: Robust subscription billing edge case handling, invoice payment enforcement with escalating notifications, critical error notifications, security monitoring, and comprehensive partner notification system.
- **Payment Edge Case Handling**: Stripe webhook idempotency via `stripeWebhookEvents` table prevents duplicate event processing. 3DS/SCA authentication creates retry entries in `autoTopUpRetries` table with 24-hour delay and email notification. Auto top-up failures use exponential backoff (max 3 retries).
- **Email Bounce Tracking**: SendGrid webhook integration tracks bounced, dropped, blocked, and deferred emails with secure signature verification. UI displays "Bounced" status with tooltip instead of "Sent" for undeliverable emails.
- **Super Admin Dashboards**: Advanced analytics covering user activity, assessment funnels, partner health scoring, revenue, geographic data, SLA monitoring, audit logging, profit analytics (revenue vs. OpenAI costs), and results retention consent. Includes Monitoring tab with Email Logs, Logs tab with App Logs (CloudWatch-like real-time log streaming with filtering by level/source/time) and Audit Logs subtabs, (tracks all sent emails with filtering by recipient type/status), Active Sessions management (view/force-logout), and Health subtabs.
- **Accounting Integration**: Xero integration for expense tracking and revenue synchronization.

### Shared Report Components (staticData Pattern)
Report rendering uses shared components (SharedIndividualReport, SharedCompareTab, SharedSingleCandidateRoleFit, PartnerMultiCandidateRoleFitTab) with a `staticData` prop for dual-mode rendering:
- **Interactive mode** (Analysis tab): Components fetch data via API queries, show candidate/role selectors, credit info, re-run buttons
- **Static mode** (Results tab / PartnerReportView): Components accept pre-loaded data via `staticData`, disable all queries (`enabled: !isStaticMode`), hide interactive UI elements
This ensures saved reports render identically to freshly generated ones, using the Analysis tab rendering as the master template.

### System Design Choices
The architecture emphasizes modularity with clear separation of frontend and backend. It employs a scalable database schema, secure session-based authentication with CSRF protection, and a comprehensive API-driven approach. Content-aware PDF rendering ensures readability. Scalability is achieved through database optimizations, API rate limiting, request deduplication, lazy module loading, static asset caching, and HTTP Keep-Alive. Route-based code splitting using `React.lazy()` optimizes initial load times. Logging sanitizes sensitive data and input validation is centralized. Custom accessible dropdowns enhance usability. Comprehensive SEO is implemented with a centralized component, rich meta tags, structured data, sitemap, and `robots.txt`.

## External Dependencies
- **PostgreSQL (Neon)**: Database hosting.
- **Stripe**: Payment gateway for processing transactions.
- **OpenAI API**: Powers AI-driven assessments and role alignment features.
- **Gmail (via Nodemailer)**: Primary transactional email provider.
- **SendGrid**: Secondary transactional email provider, used for failover.
- **Replit Auth**: User authentication and management.
- **Xero (via xero-node)**: Accounting software integration.