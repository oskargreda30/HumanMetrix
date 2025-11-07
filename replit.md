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

3. **Authentication System**
   - Email/password authentication with bcryptjs
   - Session-based authentication (PostgreSQL storage)
   - Server-side auth middleware in `auth.ts`
   - Frontend `useAuth` hook
   - Protected routes
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

7. **Enhanced PDF Export System**
   - **Assessment Explanations Page**: Optimized page explaining all 4 assessment types for non-technical hiring managers (all fit on one page with reduced text size)
     - FIT Assessment: Behavioral skills and workplace adaptability impact (blue theme)
     - AI Readiness: AI competencies and productivity multiplication potential (purple theme)
     - Prompt Architecture: Prompt engineering expertise and AI output quality correlation (amber theme)
     - AIQ: AI ethics understanding and risk reduction capability (blue theme - changed from green)
   - **Radar Charts Optimization**: Both FIT and AI Readiness radar charts with individual scores fit on one page (maxHeight reduced from 90 to 55)
   - **Comprehensive Conclusion Section**: Moved from page 1 to final page with detailed breakdown
     - Overall performance summary across all 4 assessments
     - Assessment-by-assessment analysis (FIT, AI Readiness, Prompt Architecture, AIQ)
     - Recommendations for the candidate (leverage strengths, focus development areas, mentoring/training paths)
     - Recommendations for the employer (hiring decision guidance, ethics assessment, training needs, cultural fit)
     - Conditional recommendations based on score thresholds (70, 75, 85)
   - **Dynamic Layout Engine**: Automatic pagination with content-aware page breaks
   - **Visual Organization**: Color-coded sections matching assessment branding
   - **Dedicated AIQ Section**: Compact score display (32pt font, 35px height) with blue theme, performance level interpretation and hiring guidance
   - **Complete Coverage**: Radar charts (FIT, AI Readiness), skill comparisons (separated by assessment type), Prompt Architecture evaluations, AIQ score display, platform benchmarks, comprehensive conclusion, role fit analysis (optional)
   - **Hiring Manager Focus**: Business-focused language explaining what each score means for workplace performance
   - **Fixes Applied**:
     - Assessment name filters correctly match formatAssessmentType outputs
     - AI Readiness radar chart rendering fixed (correct assessment type parameter)
     - AIQ score consistency between dedicated box and benchmarking table (direct score assignment)
     - Development opportunities filter excludes 0-score skills
     - Text sizing optimized to fit all explanation boxes on one page
     - Both radar charts optimized to fit on one page with reduced chart height
     - Executive summary moved from cover page to comprehensive conclusion at end

8. **Admin API Endpoints**
   - GET `/api/admin/candidates` - Full candidate list with results, tags, notes
   - POST `/api/admin/candidates/tags` - Add tags to candidates
   - POST `/api/admin/candidates/notes` - Add notes to candidates
   - GET `/api/admin/compare` - Multi-candidate comparison analytics
   - GET `/api/admin/roles` - Job role definitions
   - POST `/api/admin/roles` - Create custom job roles
   - POST `/api/admin/role-alignment` - Trigger AI role fit analysis
   - GET `/api/admin/role-alignment` - Retrieve cached alignment results

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
