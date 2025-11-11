# HumanMetrix - AI Assessment Platform

## Overview
HumanMetrix is a professional AI assessment platform for recruitment and career development. It offers enterprise-grade assessments to measure behavioral skills and AI literacy. The platform aims to provide comprehensive insights into a candidate's fit for roles in the AI-driven economy through various assessment types, including FIT, AI Readiness, Prompt Architecture, and Algorithmic Integrity Quotient (AIQ). Its business vision is to streamline hiring processes and support career growth by leveraging AI for objective skill evaluation.

## Recent Changes
- **November 11, 2025**:
  - **Role Fit PDF Color Consistency & Logo Enhancement**: Unified color scheme and improved branding
    - **Color Unification**: Changed AI READINESS SKILLS section from purple to blue to match FIT ASSESSMENT SKILLS for consistent visual language
    - **Logo Enhancement**: Logo sized to exactly match blue separator line height (12mm x 12mm); positioned at same vertical alignment as blue line for perfect visual balance
  - **Comparison PDF Layout Improvements**: Enhanced readability and visual clarity of multi-candidate comparison reports
    - **Radar Chart Sizing**: Increased to 80x80mm to ensure all skill labels are fully visible without clipping; reduced left margin to 15mm; added 10mm spacing between charts; skill labels displayed in bold
    - **Multi-line Labels**: Implemented automatic line-breaking for multi-word skill labels on radar charts to prevent text clipping (e.g., "Growth Mindset" displays as two lines)
    - **Table Spacing**: Reduced spacing before FIT Skills Comparison table to ensure content fits properly on page
    - **Logo Sizing**: Adjusted logo to 16mm to account for transparent padding, ensuring visible logo shape matches 12mm blue separator line height
    - **Completion Status Indicators**: Replaced small checkmarks with 3.5mm green filled squares for better visibility; gray dashes remain for incomplete assessments
    - **Prompt Architecture Section**: Increased description font to 7pt bold (from 6pt regular), added 3mm extra spacing between description and table header for better visual hierarchy
    - **Improved Layout**: Charts now positioned with better spacing (20mm margins) preventing label clipping at edges
  - **Role Fit PDF Visual Refinements**: Professional polish to skill alignment charts and branding
    - **Simplified Chart Markers**: Replaced diamond shapes with filled circles for candidate scores; hollow circles for required scores; reduced size from 2mm to 1.5mm for cleaner appearance
    - **Removed Score Labels**: Eliminated numeric labels from skill alignment charts for less clutter and more professional presentation
    - **Enhanced Logo Visibility**: Increased logo height from 13mm to 12mm to match blue separator line height for better visual balance across all PDF exports
    - **Improved Typography**: Increased font size for KEY STRENGTHS and DEVELOPMENT AREAS from 7pt to 8pt for better readability
    - **Updated Legend**: Chart legend now shows circles only (hollow for required, filled for candidate) matching the simplified markers

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `attached_assets/`.
Do not make changes to the file `replit.nix`.

## System Architecture

### UI/UX Decisions
The frontend is built with React + TypeScript, utilizing Shadcn UI and Tailwind CSS for a professional tech aesthetic. Navigation is handled by Wouter, and data fetching with TanStack Query. Key UI components include a responsive landing page, assessment selection, detailed results pages, and a comprehensive admin dashboard. Branding features a new HM monogram logo with a cyan/blue gradient. The platform features scroll-triggered animations with comprehensive accessibility support, including reduced-motion preferences. PDF reports feature refined typography, consistent spacing, and professional, clean backgrounds.

### Technical Implementations
- **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS.
- **Backend**: Express, TypeScript.
- **Database**: PostgreSQL (Neon) managed with Drizzle ORM.
- **Authentication**: Email/Password with bcryptjs for hashing and session-based authentication stored in PostgreSQL.
- **Payment**: Stripe integration for guest checkout and secure payment processing. Dynamic pricing is implemented for results unlocking.
- **AI Integration**: OpenAI API (GPT-5) is used for advanced assessment evaluations, particularly for Prompt Architecture and AI-powered role alignment analysis.
- **Email Services**: Nodemailer with Gmail for password resets, invitations, and welcome emails.
- **PDF Generation**: Uses `jsPDF` and `html2canvas` for generating comprehensive, employer-ready PDF reports with dynamic content, optimized layouts, and features like overlapping radar charts and side-by-side bar charts for candidate comparison.

### Feature Specifications
- **Assessment Types**:
    - **FIT Assessment**: Measures 6 core behavioral skills.
    - **AI Readiness Assessment**: Evaluates 9 AI-related skills with a granular scoring matrix.
    - **Prompt Architecture Assessment**: Progressive difficulty levels testing prompt design skills, evaluated by GPT-5.
    - **Algorithmic Integrity Quotient (AIQ)**: Tests understanding of AI ethics and responsible deployment.
- **User Flows**: Supports both paid users (direct purchase) and invited users (free access, then payment or code unlock for results). Access to results is gated, requiring completion of all four unique assessment types.
- **Admin Dashboard**: Provides tools for candidate management (search, filter, tags, notes), multi-candidate comparison with overlapping radar charts, and AI-powered role fit analysis.
- **Enhanced PDF Export System**: Generates multi-page, visually organized PDF reports with dynamic content, including skill visualizations, assessment summaries, and candidate recommendations, optimized for hiring managers. This includes individual and comparison PDFs with distinct visual elements.
- **Sample PDF Generation System**: An admin utility to generate sample reports using the exact same export logic.

### System Design Choices
- **Modular Architecture**: Clear separation of frontend and backend concerns.
- **Scalable Database Schema**: Designed to support users, purchased assessments, detailed results, invitations, and AI evaluation data, including tables for role alignment caching and PDF export tracking.
- **Secure Authentication**: Robust session-based authentication with bcryptjs and secure token handling for password resets.
- **API-driven**: Comprehensive set of API endpoints for all functionalities, especially for admin operations and AI integrations. Server-side validation ensures data integrity.
- **Content-Aware PDF Rendering**: Dynamic layout engine ensures content fits within pages and sections are logically ordered for readability, preventing content overflow and ensuring consistent spacing.

## External Dependencies
- **PostgreSQL (Neon)**: Database hosting.
- **Stripe**: Payment gateway for processing transactions.
- **OpenAI API**: For GPT-5 based assessment evaluations and AI role alignment analysis.
- **Gmail (via Nodemailer)**: For sending transactional emails.
- **Replit Auth**: User management.