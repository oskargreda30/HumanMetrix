# HumanMetrix - AI Assessment Platform

## Project Overview
HumanMetrix is a professional AI assessment platform for recruitment and career development. It offers enterprise-grade assessments that measure behavioral skills and AI literacy.

## Assessment Types
1. **FIT Assessment (15Q)** - £3.50
   - Measures 6 core behavioral skills: High Agency, Intellectual Curiosity, Resilience, Empathy & Ethics, Growth Mindset, Interpersonal Agility
   - 100 points maximum per skill

2. **AI Readiness Assessment (21Q)** - £4.50
   - Evaluates 9 skills: AI Literacy/Prompting Effectiveness, Technical Fluency, Domain Fluency, Critical Thinking, Adaptive & Collaborative Learning, Responsible AI Integration, Domain Expertise, Creative Innovation, Cross-functional Collaboration
   - 100 points maximum per skill

3. **Prompt Architecture Assessment (7 levels)** - £5.00
   - Progressive difficulty levels testing prompt design skills
   - Evaluated by GPT-5 on: Clarity (25%), Structure (20%), Context Relevance (20%), Creativity (20%), Iterative Improvement (15%)

4. **Algorithmic Integrity Quotient (AIQ) (4Q + rationales)** - £4.00
   - Tests understanding of AI ethics, bias, fairness, transparency, and responsible deployment
   - Includes follow-up rationale questions for each answer

## Pricing
- Base computation fee: £0.02 (one-time)
- Assessment fees: £0.01 per test
- Example: All 4 assessments = £0.06 total (£0.02 base + 4 × £0.01)

## Tech Stack
- **Frontend**: React + TypeScript, Wouter (routing), TanStack Query, Shadcn UI, Tailwind CSS
- **Backend**: Express + TypeScript
- **Database**: PostgreSQL (Neon) via Drizzle ORM
- **Authentication**: Email/Password (bcryptjs) with session-based auth
- **Payments**: Stripe (optional - all assessments are free)
- **AI**: OpenAI API (GPT-5 for Prompt Architecture evaluation)
- **Email**: Nodemailer with Gmail (for password reset and invitations)

## Current Implementation Status

### ✅ Completed
1. **Frontend Pages & Components**
   - Landing page with navigation, hero, how it works, employer section, pricing, CTA, footer
   - About page
   - Assessments selection page
   - For Employers page
   - Purchase page at /purchase (checkbox selection, automatic total calculation)
   - Terms & Conditions page at /terms (comprehensive legal coverage)
   - Login page with email/password authentication and forgot password link
   - Forgot Password page at /forgot-password
   - Reset Password page at /reset-password/:token
   - All reusable components (Navigation, HeroSection, AssessmentCard, etc.)
   - Navigation component fixed (removed nested anchor tags, resolved React warnings)

2. **Database Schema**
   - `users` table with passwordHash, resetToken, resetTokenExpiry fields
   - `sessions` table (PostgreSQL session storage)
   - `purchased_assessments` table (tracks purchases)
   - `assessment_results` table (stores completed assessments)
   - `invitations` table (employer invitations)
   - `prompt_architecture_evaluations` table (GPT-5 evaluations)
   - `aiq_rationales` table (follow-up rationale responses)
   - `job_roles` table (predefined and custom role definitions with competencies)
   - `candidate_tags` table (admin tags for candidate organization)
   - `candidate_notes` table (admin notes for candidates)
   - `cached_role_alignments` table (AI-powered role fit analysis cache)
   - `report_exports` table (PDF export tracking)

3. **Authentication System** (Updated November 2025)
   - Email/password authentication with bcryptjs
   - Session-based authentication (PostgreSQL storage)
   - Server-side auth middleware in `auth.ts`
   - Frontend `useAuth` hook
   - **Route-level protection** via ProtectedRoute component
   - Protected routes: /dashboard, /assessment/:id, /results/:id, /admin/*
   - Redirects to /login (not /api/login) when unauthenticated
   - Admin routes require `requireAdmin` check
   - Password reset functionality (tokens expire in 24 hours)
   - Welcome emails with temporary passwords for invited users
   - Auto-account creation after Stripe payment

4. **Stripe Payment Integration**
   - Guest checkout flow (no login required to purchase)
   - Checkout modal on /assessments page
   - Real-time price calculation
   - Secure payment processing via Stripe
   - Post-payment account creation with email credentials
   - Success page at /purchase/success with account creation confirmation

5. **Assessment Experience**
   - Instruction dialogs for all assessments that gate start
   - Timer only starts after user clicks "Begin Assessment"
   - Server-side timer validation
   - All 4 assessment types fully functional (FIT, AI Readiness, Prompt Architecture, AIQ)
   - Results page with comprehensive score analysis and employer-ready insights

6. **Comprehensive Admin Dashboard** (/admin)
   - **Overview Tab**: Real-time stats (total candidates, assessments, completion rates), recent assessment results feed
   - **Candidates Tab**: 
     - Searchable/filterable candidate list with assessment summaries
     - Tag management system for candidate organization
     - Notes system for admin annotations
     - Detailed candidate modal with full assessment history
     - Professional PDF export with comprehensive assessment explanations
   - **Compare Tab**:
     - Multi-select comparison (2-3 candidates)
     - Radar chart visualization of skills across candidates
     - Side-by-side assessment score comparison table
     - Average score calculations
   - **Role Fit Tab**:
     - AI-powered role alignment analysis using OpenAI GPT-4o
     - 5 predefined job roles (Software Engineer, Product Manager, Data Analyst, Customer Success Manager, AI/ML Engineer)
     - Overall fit score (0-100%)
     - Skill-by-skill alignment analysis
     - Strengths and development areas identification
     - Practical hiring recommendations
     - 7-day result caching to minimize API costs

7. **Enhanced PDF Export System** (Redesigned November 2025 - Condensed to 3 Pages)
   - **Maximum 3 Pages**: Completely redesigned for concise, client-ready format
   - **Professional Design**: Subtle backgrounds, gradients, modern color scheme, compact spacing
   - **Font Sizes**: Reduced throughout (8-9pt headers, 7pt body, 6pt labels) for space efficiency
   
   - **Page 1: Cover & Overview**
     - Compact cover with candidate profile
     - Overall performance score prominently displayed
     - Key metrics grid (skills assessed, top skill, top score)
     - Assessment summary with all 4 assessments and mini progress bars
     - Key insights: top 3 strengths and 2 development areas
   
   - **Page 2: Detailed Assessment Results**
     - FIT Assessment: Compact radar chart (42mm height) + 2-column skill scores
     - AI Readiness: Compact radar chart (42mm height) + 2-column skill scores
     - **Prompt Architecture SIMPLIFIED**: Overall score + legend + compact grid showing L1-L7 scores only (NO dimension breakdown per level)
     - AIQ: Simple score display with performance level
     - Platform benchmark (if data available): Single line showing vs platform average
   
   - **Page 3: Summary & Recommendations**
     - Role fit analysis (if provided): Overall alignment % + top 2 strengths/gaps in ultra-compact format
     - Overall assessment interpretation with performance level
     - Performance by assessment with brief text interpretations
     - Recommendations: Strengths to leverage, development focus, next steps
     - Footer disclaimer about assessment usage
   
   - **Key Improvements**:
     - Reduced from 9 pages to 3 pages maximum
     - Prompt Architecture shows only essential data (level scores + legend, not full dimension details)
     - All content retained but dramatically condensed
     - Professional, client-ready appearance
     - Suitable for candidate self-download or admin export

8. **Admin API Endpoints**
   - GET `/api/admin/candidates` - Full candidate list with results, tags, notes
   - POST `/api/admin/candidates/tags` - Add tags to candidates
   - POST `/api/admin/candidates/notes` - Add notes to candidates
   - GET `/api/admin/compare` - Multi-candidate comparison analytics
   - GET `/api/admin/roles` - Job role definitions
   - POST `/api/admin/roles` - Create custom job roles
   - POST `/api/admin/role-alignment` - Trigger AI role fit analysis
   - GET `/api/admin/role-alignment` - Retrieve cached alignment results

9. **Sample PDF Generation System** (November 2025)
   - Admin utility page at `/admin/generate-samples`
   - Uses EXACT same `exportEnhancedCandidatePDF` function as admin dashboard
   - Zero code duplication - shares PDF export logic
   - Generates Sarah Chen sample reports with realistic assessment data
   - Downloads PDFs directly to browser (client-side jsPDF)
   - Admin can regenerate samples anytime if export function changes

10. **Branding Updates** (November 2025)
   - New HM monogram logo with transparent background
   - No text - just cyan/blue gradient HM symbol
   - Professional tech aesthetic matching platform design
   - Integrated across all pages via Navigation component

### 🚧 In Progress
- None

### ⏳ Pending
- PDF export functionality for individual candidate reports
- Email notifications for assessment completion
- Advanced analytics and trends reporting
- Bulk candidate actions

## Database Schema Details

### Users
- Managed by Replit Auth
- Fields: id, email, firstName, lastName, profileImageUrl, isAdmin, createdAt, updatedAt

### Purchased Assessments
- Tracks what assessments a user has purchased
- Links to Stripe session/payment intent
- Status tracking (pending, completed, failed)

### Assessment Results
- Stores answers, scores, percentile rankings
- Links to user and purchase
- Different scoring logic per assessment type

### Invitations
- Allows admins to send assessment invitations via email
- Tracks completion status
- Links to sender (admin user)

## Assessment Content Files
Located in `attached_assets/`:
- FIT Assessment questions and scoring
- AI Readiness questions and scoring matrix
- Prompt Architecture rubric
- AIQ questions and answers

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `OPENAI_API_KEY` - For GPT-5 evaluations
- `GMAIL_USER` - Gmail address for sending emails
- `GMAIL_APP_PASSWORD` - Gmail app password for SMTP
- `STRIPE_SECRET_KEY` - Stripe secret key (optional)
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key (optional, frontend)
- `REPLIT_DOMAINS` - Auto-configured by Replit (used for email links)
- `REPL_ID` - Auto-configured by Replit

## User Journey

### New Purchase-First Flow (Primary)
1. Browse /assessments page and view available assessments (£0.01 each)
2. Click "Purchase" button on any assessment
3. Checkout modal opens with:
   - All 4 assessments available for selection
   - Real-time total calculation (£0.02 base + £0.01 per assessment)
   - Form fields for name and email
4. Fill in details and click "Proceed to Payment"
5. Redirected to Stripe checkout page
6. Complete payment with credit/debit card
7. After successful payment:
   - Account automatically created
   - Temporary password generated and emailed
   - Welcome email sent with login credentials
8. Check email for credentials
9. Log in at /login with received credentials
10. Access dashboard and take purchased assessments

### For Existing Users
1. Log in at /login
2. Go to dashboard
3. Take available assessments
4. View results

### For Employers
1. Admin logs in with email/password
2. Sends invitation to candidate via email
3. Candidate receives email with account credentials (temporary password)
4. Candidate logs in and takes assessments (all free)
5. Admin views results in dashboard
6. Results can be exported as PDF

### Password Reset Flow
1. User clicks "Forgot password?" on login page
2. Enters email and receives reset link (valid for 1 hour)
3. Clicks link in email to set new password
4. Redirected to login page

## Next Steps
1. Complete Stripe checkout integration
2. Build assessment-taking UI for each type
3. Implement scoring engines
4. Add OpenAI GPT-5 evaluation for Prompt Architecture
5. Create results dashboard
6. Add PDF export
7. Implement admin features (invitations, dashboard)
8. Add email notifications
