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
- **Assessment Types**: FIT (behavioral), AI Readiness, Prompt Architecture, AIQ (AI ethics) with enhanced scoring formulas.
- **Payment Flow**: Pay-deferred model, allowing candidates to complete assessments before paying to unlock results. Supports discount codes.
- **User Flows**: Self-service for candidates and admin-invited users.
- **Admin Dashboard**: Candidate management, multi-candidate comparison, AI-powered role fit analysis, and Scoring QA.
- **Enhanced PDF Export System**: Generates multi-page, dynamic PDF reports.
- **Results Access Gating & Retention**: Requires completion of all four distinct assessments to view results, with explicit user consent for sharing results.
- **Product Roadmap**: Visual timeline of future assessment releases.
- **Marketing Email Opt-in**: Subscribe page for job seeker emails.
- **Golden Set Benchmark System**: Verifies GPT-5 scoring consistency using benchmark prompts and daily runs.
- **Multi-Currency & PPP Pricing**: Automatic location detection with `ipapi.co` for local currency display and 3-tier regional pricing (PPP) via Stripe.
- **B2B Partner Integration**: Enterprise solution for embedding assessments, including partner accounts, 3-tier billing (Prepaid, Auto-Bill, Invoice), a billing scheduler, flexible deal configuration, API key authentication, and an embeddable JavaScript widget/SDK.
- **Partner Self-Service Dashboard**: Allows partners to manage usage, billing, API keys, and quota alerts.
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