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
- **Assessment Types**: FIT (behavioral), AI Readiness, Prompt Architecture (GPT-5 evaluated), AIQ (AI ethics).
- **Payment Flow**: Payment-deferred model where candidates take assessments for free and pay only to unlock results. A "FREE" discount code (100% off) is supported.
- **User Flows**: Self-service for candidates and admin-invited users, both following the pay-after-completion model.
- **Admin Dashboard**: Features candidate management, multi-candidate comparison (radar charts), and AI-powered role fit analysis.
- **Enhanced PDF Export System**: Generates multi-page, visually organized PDF reports with dynamic content, including individual and comparison reports.
- **Results Access Gating**: Requires completion of all four distinct assessments before results can be viewed or unlocked.
- **Product Roadmap**: Visual timeline showing December 2025 platform launch (current assessments), February 2026 Perfect Role Finder, March 2026 AI Output Translator, May 2026 Team Analysis & Building Tool, and TBC 2026 Social Influence Assessment.

### System Design Choices
- **Modular Architecture**: Clear separation of frontend and backend.
- **Scalable Database Schema**: Supports users, assessments, results, invitations, and AI evaluation data.
- **Secure Authentication**: Robust session-based authentication.
- **API-driven**: Comprehensive API endpoints for all functionalities.
- **Content-Aware PDF Rendering**: Dynamic layout ensures readability and visual consistency.

## External Dependencies
- **PostgreSQL (Neon)**: Database hosting.
- **Stripe**: Payment gateway.
- **OpenAI API**: For GPT-4o based assessment evaluations and AI role alignment.
- **Gmail (via Nodemailer)**: For transactional emails.
- **Replit Auth**: User management.