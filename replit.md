# HumanMetrix - AI Assessment Platform

## Overview
HumanMetrix is a professional AI assessment platform for recruitment and career development. It offers enterprise-grade assessments to measure behavioral skills and AI literacy. The platform aims to provide comprehensive insights into a candidate's fit for roles in the AI-driven economy through various assessment types, including FIT, AI Readiness, Prompt Architecture, and Algorithmic Integrity Quotient (AIQ). Its business vision is to streamline hiring processes and support career growth by leveraging AI for objective skill evaluation.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `attached_assets/`.
Do not make changes to the file `replit.nix`.

## System Architecture

### UI/UX Decisions
The frontend is built with React + TypeScript, utilizing Shadcn UI and Tailwind CSS for a professional tech aesthetic. Navigation is handled by Wouter, and data fetching with TanStack Query. Key UI components include a responsive landing page, assessment selection, detailed results pages, and a comprehensive admin dashboard. Branding features a new HM monogram logo with a cyan/blue gradient.

### Technical Implementations
- **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS.
- **Backend**: Express, TypeScript.
- **Database**: PostgreSQL (Neon) managed with Drizzle ORM.
- **Authentication**: Email/Password with bcryptjs for hashing and session-based authentication stored in PostgreSQL. Features include password reset and secure route protection.
- **Payment**: Stripe integration for guest checkout and secure payment processing.
- **AI Integration**: OpenAI API (GPT-5) is used for advanced assessment evaluations, particularly for Prompt Architecture and AI-powered role alignment analysis.
- **Email Services**: Nodemailer with Gmail for password resets, invitations, and welcome emails.
- **PDF Generation**: Uses `jsPDF` and `html2canvas` for generating comprehensive, employer-ready PDF reports with dynamic content and optimized layouts.

### Feature Specifications
- **Assessment Types**:
    - **FIT Assessment**: Measures 6 core behavioral skills.
    - **AI Readiness Assessment**: Evaluates 9 AI-related skills.
    - **Prompt Architecture Assessment**: Progressive difficulty levels testing prompt design skills, evaluated by GPT-5.
    - **Algorithmic Integrity Quotient (AIQ)**: Tests understanding of AI ethics and responsible deployment.
- **User Flows**: Supports new user purchases, existing user access, and employer-driven candidate invitations.
- **Admin Dashboard**: Provides tools for candidate management (search, filter, tags, notes), multi-candidate comparison with radar charts, and AI-powered role fit analysis with cached results.
- **Enhanced PDF Export System**: Generates multi-page, visually organized PDF reports with dynamic content, including skill visualizations, assessment summaries, and candidate recommendations. Optimized for hiring managers.
- **Sample PDF Generation System**: An admin utility to generate sample reports using the exact same export logic, ensuring consistency.

### System Design Choices
- **Modular Architecture**: Clear separation of frontend and backend concerns.
- **Scalable Database Schema**: Designed to support users, purchased assessments, detailed results, invitations, and AI evaluation data. Includes specific tables for role alignment caching and PDF export tracking.
- **Secure Authentication**: Robust session-based authentication with bcryptjs and secure token handling for password resets.
- **API-driven**: Comprehensive set of API endpoints for all functionalities, especially for admin operations and AI integrations.
- **Content-Aware PDF Rendering**: Dynamic layout engine ensures content fits within pages and sections are logically ordered for readability.

## External Dependencies
- **PostgreSQL (Neon)**: Database hosting.
- **Stripe**: Payment gateway for processing transactions.
- **OpenAI API**: For GPT-5 based assessment evaluations and AI role alignment analysis.
- **Gmail (via Nodemailer)**: For sending transactional emails.
- **Replit Auth**: User management.