# HumanMetrix - AI Assessment Platform

## Overview
HumanMetrix is an AI assessment platform for recruitment and career development. It provides enterprise-grade assessments to measure behavioral skills and AI literacy, offering insights into candidate fit for AI-driven roles. The platform aims to streamline hiring and support career growth through objective AI-powered skill evaluation. Key assessment types include FIT, AI Readiness, Prompt Architecture, and Algorithmic Integrity Quotient (AIQ).

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `attached_assets/`.
Do not make changes to the file `replit.nix`.

## System Architecture

### UI/UX Decisions
The frontend utilizes React + TypeScript, Shadcn UI, and Tailwind CSS for a responsive design, with Wouter for navigation and TanStack Query for data fetching. Branding includes a new HM monogram logo with a cyan/blue gradient and professional PDF reports. Visual elements feature scroll-triggered hero section animations and a network tech background. A product roadmap visualizes upcoming assessment releases, and a dedicated marketing page (`/ecosystem-index`) showcases team capability diagnostics with a 4-step workflow and sample reports.

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
- **Assessment Types**: FIT (behavioral), AI Readiness, Prompt Architecture, and AIQ (AI ethics), including SEA-localized question wording.
- **Payment Flow**: Pay-deferred model, allowing assessment completion before payment to unlock results, with discount code support. Multi-currency and Purchasing Power Parity (PPP) pricing via Stripe is implemented using `ipapi.co` for location detection.
- **User Flows**: Self-service for candidates and admin-invited users, with B2C email confirmation during checkout for new users.
- **Admin Dashboard**: Features candidate management, multi-candidate comparison, AI-powered role fit analysis with criticality levels and cohort benchmarking (percentile rankings), and Scoring QA.
- **Enhanced PDF Export System**: Generates multi-page, dynamic PDF reports.
- **Results Access**: Gated access requiring completion of all four distinct assessments, with explicit user consent for sharing results.
- **Product Roadmap**: Visual timeline of future assessment releases.
- **Golden Set Benchmark System**: Verifies GPT-5 scoring consistency using benchmark prompts.
- **B2B Partner Integration**: Enterprise solution for embedding assessments with partner accounts, 3-tier billing (Prepaid, Auto-Bill, Invoice), a billing scheduler, flexible deal configuration, API key authentication, and an embeddable JavaScript widget/SDK. Includes a "Test API Key Mode" for development and "Card-on-File Overage Billing" for prepaid partners. Enterprise partners complete billing information as the first onboarding step.
- **Partner Self-Service Dashboard**: Allows partners to manage usage, billing, API keys, and quota alerts. Includes assessment analytics, CSV data exports, PDF receipts, in-app notifications (role-based with smart routing), team member management (invitations, role-based access), and bulk candidate invitations (CSV upload, drag-and-drop).
- **Partner Integration Features**: Webhook notifications for key assessment events (HMAC-SHA256 verification, retry logic), ATS integrations (Greenhouse, Lever, Workday, SAP SuccessFactors, Oracle HCM, custom APIs), and scheduled automated CSV exports.
- **CI/CD Testing Pipeline**: Pre-deployment test runner with an admin-controlled toggle for production environments.
- **Health Monitoring System**: Super admin dashboard for system health, error tracking, and status workflow.
- **Payment & Billing Oversight**: Super admin dashboard for monitoring revenue, managing transactions, and promo codes.
- **Results Retention Consent Dashboard**: Super admin tab for viewing and filtering user consent.
- **Accounting & Xero Integration**: Super admin accounting dashboard for expense tracking and revenue synchronization with Xero via OAuth2, supporting expense management and revenue sync with bulk sync functionality.

### System Design Choices
- **Modular Architecture**: Clear separation of frontend and backend.
- **Scalable Database Schema**: Designed for users, assessments, results, and AI data.
- **Secure Authentication**: Robust session-based authentication with CSRF protection.
- **API-driven**: Comprehensive API endpoints.
- **Content-Aware PDF Rendering**: Dynamic layout for readability.
- **Cache Refresh Pattern**: For data changes.
- **Scalability Optimizations**: Database indexes, connection pool tuning, API rate limiting, request deduplication, lazy module loading, static asset caching, HTTP Keep-Alive, security headers, and trust proxy.
- **Logging Security**: API response logging sanitises sensitive fields and is disabled in production.
- **Input Validation System**: Centralized validation utilities with RFC 5322-compliant email regex, international name support, and phone number validation. Emails are normalized (trim + lowercase) and names trimmed on user creation.
- **Custom Accessible Dropdowns**: Implemented for partner creation modal with full keyboard navigation and ARIA combobox semantics.
- **SEO Implementation**: Centralized SEO component (`client/src/lib/seo.tsx`), comprehensive meta tags, structured data schemas (Organization, Product, FAQ, WebSite, Service, SoftwareApplication, Article, LocalBusiness, HowTo), sitemap (`client/public/sitemap.xml`), and `robots.txt` with crawl directives for major search engines and AI bots. Page-level SEO includes unique titles, descriptions, canonical URLs, and keywords.

## External Dependencies
- **PostgreSQL (Neon)**: Database hosting.
- **Stripe**: Payment gateway.
- **OpenAI API**: AI-powered assessment and role alignment.
- **Gmail (via Nodemailer)**: Transactional email service.
- **Replit Auth**: User management.
- **Xero (via xero-node)**: Accounting software integration.