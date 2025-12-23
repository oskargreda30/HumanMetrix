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
- **Product Roadmap**: Visual timeline of future assessment releases (e.g., Perfect Role Finder, AI Output Translator).
- **Marketing Email Opt-in**: Subscribe page for capturing job seeker emails.
- **Golden Set Benchmark System**: GPT-5 scoring consistency verification using benchmark prompts, daily runs with smoothed evaluation to detect drift. Admin UI for monitoring.
- **Multi-Currency Pricing**: Automatic location detection displays prices in local currencies using `ipapi.co` with server-side caching and `CurrencyContext` for state.
- **PPP Pricing**: 3-tier regional pricing (Tier 1: 1.0x, Tier 2: 0.7x, Tier 3: 0.5x). Stripe checkout handles local currency conversion.
- **SEA Launch Pricing**: Strategic flat-rate local currency pricing for specific Southeast Asian countries (Philippines, Vietnam, Indonesia, Malaysia).
- **Active Discount Codes**: `FREE` (100% off) and `20OFFPRICE` (20% off).
- **B2B Partner Integration**: Enterprise integration for clients to embed assessments.
    - **Partner Accounts**: Managed via admin dashboard.
    - **API Key Authentication**: Secure key pairs with rate limiting and permissions.
    - **Assessment Sessions**: Partners create sessions via REST API; results returned via API or webhook.
    - **Embeddable Widget**: JavaScript widget using Shadow DOM for style isolation.
    - **JavaScript SDK**: UMD module for session creation, widget launching, and results retrieval.
    - **Usage-Based Billing**: Stripe metered billing for subscription-based invoicing.
    - **Developer Documentation**: Comprehensive `/developers` docs, including OpenAPI/Swagger.
    - **OpenAPI/Swagger Documentation**: Full OpenAPI 3.0 specification at `/api/partner/openapi.json` with Swagger UI.
    - **Prepaid Test Package Quota System**: Partners purchase tiered test packages. Features quota tracking, automatic API suspension, email notifications, and admin UI management.
    - **Usage Dashboard Tab**: Admin dashboard tab for platform-wide and organization-specific B2B partner usage statistics.

### System Design Choices
- **Modular Architecture**: Clear separation of frontend and backend.
- **Scalable Database Schema**: Supports users, assessments, results, and AI data.
- **Secure Authentication**: Robust session-based authentication.
- **API-driven**: Comprehensive API endpoints.
- **Content-Aware PDF Rendering**: Dynamic layout for readability.
- **Cache Refresh Pattern**: Cache invalidation + refetch + refresh URL parameter for data changes.
- **Scalability Optimizations**: Database indexes, connection pool tuning, API rate limiting, request deduplication, lazy module loading, static asset caching, HTTP Keep-Alive, security headers, and trust proxy.

## External Dependencies
- **PostgreSQL (Neon)**: Database hosting.
- **Stripe**: Payment gateway.
- **OpenAI API**: AI-powered assessment and role alignment.
- **Gmail (via Nodemailer)**: Transactional email service.
- **Replit Auth**: User management.