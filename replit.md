# HumanMetrix - AI Assessment Platform

## Overview
HumanMetrix is a professional AI assessment platform for recruitment and career development. It offers enterprise-grade assessments to measure behavioral skills and AI literacy. The platform aims to provide comprehensive insights into a candidate's fit for roles in the AI-driven economy through various assessment types, including FIT, AI Readiness, Prompt Architecture, and Algorithmic Integrity Quotient (AIQ). Its business vision is to streamline hiring processes and support career growth by leveraging AI for objective skill evaluation.

## Recent Changes
- **November 10, 2025**:
  - **Comparison PDF Redesign**: Comprehensive restructuring of multi-candidate comparison PDF export for cleaner visuals and better data presentation
    - **Unified Section Headers**: All sections (COMPLETION STATUS, FIT ASSESSMENT, AI READINESS, PROMPT ARCHITECTURE, TOP 5 SKILLS) now use consistent addSectionHeader styling with gradient backgrounds
    - **Enhanced Completion Status Table**: Shows candidate names (truncated to 10 chars) instead of "C1/C2", drawn checkbox shapes (3mm squares with green fill) replace Unicode characters to avoid missing glyph issues
    - **Compact Layout**: AI Readiness Skills table stays on same page as radar charts (no page break), 3-4mm spacing between sections, 5-8pt fonts throughout
    - **Prompt Architecture Visualization**: Replaced text table with side-by-side horizontal bar charts for all 7 levels, color-coded candidate bars with legends
    - **Skills Score Tables**: FIT and AI Readiness tables show ALL skills with black text (17,24,39) for scores instead of performance-based colors, compact 4mm row spacing
    - **Top 5 Skills Comparison**: Replaced KEY SKILLS OVERVIEW table with grouped horizontal bar chart showing top 5 skills by average score, candidate bars stacked per skill
    - **Layout Optimization**: All content fits on 3 pages with bounded bar chart widths (100-110mm) and dynamic column calculations
  - **Overlapping Radar Charts for Candidate Comparison**: Implemented multi-candidate overlapping radar charts in Intelligence Hub Compare tab
    - **FIT & AI Readiness Sections**: Added "Combined Comparison" view showing 2-3 candidates overlaid on single radar chart with different colored polygons (30% transparency, 2px stroke)
    - **Visual Hierarchy**: Overlapping chart shown first for instant at-a-glance comparison, individual charts below for detailed analysis
    - **Key Collision Fix**: Uses unique user.id as dataKey instead of candidate names to prevent data overwrites when multiple candidates share identical names
    - **PDF Export Integration**: Charts capturable via IDs `pdf-comparison-fit-overlapping` and `pdf-comparison-ai-overlapping` for professional comparison reports
    - **Legend System**: Color-coded legend maps each polygon to candidate name for clear identification
    - **UX Benefits**: Enables immediate visual skill gap identification across candidates, clearer hiring decisions
  - **PDF Export Refinements**: Final polish to PDF visual design based on user feedback
    - **Thinner Line Charts**: Reduced SKILL ALIGNMENT ANALYSIS line thickness from 2.5mm to 0.8mm for cleaner, less chunky appearance in role fit PDFs
    - **Enhanced Typography**: Increased KEY STRENGTHS and DEVELOPMENT AREAS font sizes to 9pt (from 7pt headers, 8pt body) for improved readability
    - **Clean Backgrounds**: Removed neural network watermark patterns from all PDFs for professional white backgrounds with subtle borders only
  - **Compare Tab Scrolling Fix**: Added overflow-auto to CompareTab root container, enabling proper scrolling when candidates are selected and comparison content expands
  - **PDF Export Enhancements**: Comprehensive visual and structural improvements to all PDF exports
    - **Individual PDFs**: Unified font sizing (8px for Skills Assessed/Average Score/Top Skill), thinner Prompt Architecture progress bars (4mm), removed AIQ performance level feedback, added horizontal bar visualization for AIQ results page
    - **Comparison PDFs**: Color-coded section headers (blue for FIT, violet for AI Readiness), score comparison tables showing all candidates side-by-side
    - **Role Fit PDFs**: Replaced tabular skill comparisons with horizontal line charts showing candidate vs required score gaps (green lines for exceeds, red for shortfalls)
    - **Visual Design**: White backgrounds with page borders, HM monogram logo in header, gradient header backgrounds
  - **Hero Section Animation Redesign**: Implemented scroll-triggered animations with comprehensive accessibility support
    - **IntersectionObserver-Based Triggers**: Animations activate when hero section enters viewport (threshold: 0.1, rootMargin: '0px 0px -100px 0px')
    - **Staggered Animation Timeline**: Badge (0ms) → Headline (150ms) → Subheadline (300ms) → "Why use" section (500ms) → Bullet points (500-700ms) → CTA buttons (700ms) → Feature cards (700-1000ms)
    - **Parallax Background Effects**: Subtle parallax on network visualization background and gradient overlay for depth
    - **CTA Microinteractions**: Primary CTA features pulse animation, hover glow effects, and animated arrow icon
    - **Complete Reduced-Motion Support**: 
      - State initializes with media query value to prevent flash of animated content
      - All animations disabled when `prefers-reduced-motion: reduce` detected
      - Parallax effects, transitions, hover animations, and smooth scrolling all respect user preference
      - Content renders statically for users preferring reduced motion
    - **Mobile-First Design**: Enhanced vertical spacing, responsive typography, and improved touch targets for better mobile engagement
- **November 9, 2025**: 
  - **Results Access Gating**: Enforced requirement for ALL 4 DISTINCT assessments completed before viewing results
  - **Unique Assessment Type Validation**: Implemented Set-based deduplication across Dashboard, MyResults, ResultsPaymentGate, and backend API to prevent duplicate assessment completions from bypassing 4-assessment requirement
  - **Security Fix**: Moved completion check BEFORE payment gate in MyResults.tsx to prevent users from paying before completing all assessments
  - **Server-Side Validation**: Added `/api/unlock-results` endpoint validation requiring exactly 4 unique assessment types before processing payment
  - **Dynamic Pricing**: Results unlock price calculated based on unique completed assessments (£0.30 base + £0.01 per unique assessment)
  - **UX Improvements**: Added back button to results payment gate; Dashboard and MyResults now show "X of 4 unique assessments" progress messaging
- **November 8, 2025**: 
  - **AI Readiness Scoring Update**: Implemented new scoring matrix with 4 points per skill per mapping; each question option now maps to 1-3 specific skills (AL/PE, DF, TF, DE, RAI, CT/PS, ACL, CC, CI) for more granular skill assessment
- **November 8, 2025**: 
  - **Comprehensive MyResults Page**: Created `/my-results` page showing ALL completed assessments in unified view with summary statistics, individual assessment cards with scores/top skills, and "Download Full Report" button for comprehensive PDF export
  - **Fixed PDF Export**: All 4 assessments (FIT, AI Readiness, Prompt Architecture, AIQ) now correctly appear in ASSESSMENT SUMMARY section of PDF; added radar chart visualization for FIT and AI Readiness in SKILLS VISUALIZATION section
  - **Radar Charts in PDF**: Implemented offscreen radar chart rendering and deterministic capture system with retry mechanism to ensure FIT and AI Readiness skill visualizations reliably appear in exported PDFs
  - **Prompt Architecture Data**: Fixed PDF export to fetch evaluations from dedicated `/api/prompt-evaluations` endpoint ensuring Prompt Architecture section populates correctly
  - **PDF Formatting Fixes**: Reduced "Top Skill" font size from 14pt to 10pt and truncation from 15 to 10 characters to prevent text overflow in metrics boxes
  - **Assessment Completion Dialog**: Implemented completion popup that appears when users finish all 4 assessments, with differentiated messaging for paid vs invited users; redirects to `/my-results` page
  - **Results Payment Gate**: Added payment barrier for invited users who haven't paid yet, with support for "FREE" discount code (employer-sponsored)
  - **Purchase Payment Tracking**: Added `resultsAccessPaid` boolean field to purchases table to track whether users can view results (true for paid users, false for invited users)
  - **Results Payment API**: Created `/api/unlock-results` endpoint that validates "FREE" discount code or creates Stripe checkout session for £0.31 results access (matching actual test costs: £0.30 computation + £0.01 tests)
  - **Payment Flow Completion**: Added `/api/process-results-payment` endpoint to mark results as accessible after successful Stripe payment; fixed `updatePurchase()` to accept string IDs matching schema
  - **Consolidated Dashboard UX**: Replaced individual "View Results" buttons with single "View My Results" button showing all completed assessments as badges
  - **Removed Score Interpretation**: Cleaned up Results page by removing score interpretation guide boxes for cleaner UI
  - Fixed submit button messaging: Now shows "Your answers are being evaluated, please wait..." during assessment submission (especially for Prompt Architecture with GPT evaluation)
  - Improved mobile UX for AIQ assessment: Balanced font sizes with `text-base` for questions and `text-sm` for answers
  - Created `formatAssessmentName()` helper function to display clean assessment names (e.g., "AI Readiness" instead of "AI_READINESS")
  - Updated all assessment displays across Dashboard, Assessment, and Results pages to use formatted names
  - Fixed LSP type error in Results.tsx (null → undefined for function parameters)

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
- **User Flows**: 
    - **Paid Users**: Purchase assessments directly → Complete assessments → View results immediately → Download PDF
    - **Invited Users**: Receive free assessment access → Complete assessments → Unlock results with "FREE" code or £0.31 payment → View results and download PDF
    - Employer-driven candidate invitations with optional payment coverage
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