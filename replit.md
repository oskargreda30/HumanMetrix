# HumanMetrix - AI Assessment Platform

## Overview
HumanMetrix is an AI assessment platform designed for recruitment and career development. It provides enterprise-grade assessments to measure behavioral skills and AI literacy, offering comprehensive insights into a candidate's fit for roles in the AI-driven economy. The platform includes assessment types such as FIT, AI Readiness, Prompt Architecture, and Algorithmic Integrity Quotient (AIQ), aiming to streamline hiring processes and support career growth through objective AI-powered skill evaluation.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `attached_assets/`.
Do not make changes to the file `replit.nix`.

## System Architecture

### UI/UX Decisions
The frontend is built with React + TypeScript, utilizing Shadcn UI and Tailwind CSS for a professional tech aesthetic. Wouter handles navigation, and TanStack Query manages data fetching. Key UI components include a responsive landing page, assessment selection, detailed results pages, and an admin dashboard. Branding incorporates a new HM monogram logo with a cyan/blue gradient. PDF reports are designed for professional readability, with consistent branding, typography, and visual elements. Overlapping radar charts are used for multi-candidate comparison, enhancing visual identification of skill gaps.

### Technical Implementations
- **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS.
- **Backend**: Express, TypeScript.
- **Database**: PostgreSQL (Neon) with Drizzle ORM.
- **Authentication**: Email/Password using bcryptjs for hashing and session-based authentication stored in PostgreSQL, including password reset and secure route protection.
- **Payment**: Stripe integration for guest checkout and secure payment processing.
- **AI Integration**: OpenAI API (GPT-5) for advanced assessment evaluations (e.g., Prompt Architecture) and AI-powered role alignment analysis.
- **Email Services**: Nodemailer with Gmail for transactional emails.
- **PDF Generation**: `jsPDF` and `html2canvas` are used to generate comprehensive, employer-ready PDF reports with dynamic content, optimized layouts, and visual consistency.

### Feature Specifications
- **Assessment Types**: FIT Assessment (behavioral skills), AI Readiness Assessment (AI-related skills), Prompt Architecture Assessment (prompt design, evaluated by GPT-5), and Algorithmic Integrity Quotient (AIQ - AI ethics).
- **User Flows**: Differentiated flows for paid users (direct access to results) and invited users (free access, then payment or code to unlock results).
- **Admin Dashboard**: Features candidate management, multi-candidate comparison using radar charts, and AI-powered role fit analysis.
- **Enhanced PDF Export System**: Generates multi-page, visually organized PDF reports with dynamic content, including skill visualizations, assessment summaries, and candidate recommendations, optimized for hiring managers. This includes individual and comparison reports with consistent styling.
- **Results Access Gating**: Requires all four distinct assessments to be completed before results can be viewed or unlocked via payment.
- **Hero Section Animations**: Scroll-triggered animations with comprehensive accessibility support, respecting `prefers-reduced-motion`.

### System Design Choices
- **Modular Architecture**: Clear separation between frontend and backend concerns.
- **Scalable Database Schema**: Designed to support users, assessments, results, invitations, and AI evaluation data, including role alignment caching and PDF export tracking.
- **Secure Authentication**: Robust session-based authentication with bcryptjs and secure token handling.
- **API-driven**: Comprehensive API endpoints for all functionalities, especially admin operations and AI integrations.
- **Content-Aware PDF Rendering**: Dynamic layout engine ensures content fits within pages and sections are logically ordered for readability and visual consistency across all PDF exports.

## Production Deployment

### First-Time Admin Account Setup

When deploying to production for the first time, you need to create an initial admin account using the bootstrap script:

1. **Set Environment Variables**:
   ```bash
   ADMIN_EMAIL=your-email@example.com
   ADMIN_PASSWORD=your-secure-password
   ```

2. **Run the Bootstrap Script**:
   ```bash
   ADMIN_EMAIL=your-email@example.com ADMIN_PASSWORD=your-secure-password tsx server/scripts/bootstrapAdmin.ts
   ```

3. **Verify Admin Account**:
   - The script will create an admin user with `isAdmin=true`
   - The script is idempotent - it won't create duplicates if run again
   - You can now log in with the credentials you provided

**Important**: The bootstrap script only creates the admin account if it doesn't already exist. It will skip creation if a user with that email already exists.

## External Dependencies
- **PostgreSQL (Neon)**: Database hosting.
- **Stripe**: Payment gateway.
- **OpenAI API**: For GPT-5 based assessment evaluations and AI role alignment analysis.
- **Gmail (via Nodemailer)**: For sending transactional emails.
- **Replit Auth**: User management.