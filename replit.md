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

3. **Authentication System**
   - Email/password authentication with bcryptjs
   - Session-based authentication (PostgreSQL storage)
   - Server-side auth middleware in `auth.ts`
   - Frontend `useAuth` hook
   - Protected routes
   - Password reset functionality (tokens expire in 24 hours)
   - Welcome emails with temporary passwords for invited users
   - All assessments are 100% free with automatic access on signup

4. **Assessment Experience**
   - Instruction dialogs for all assessments that gate start
   - Timer only starts after user clicks "Begin Assessment"
   - Server-side timer validation
   - All 4 assessment types fully functional (FIT, AI Readiness, Prompt Architecture, AIQ)
   - Results page with comprehensive score analysis and employer-ready insights

### 🚧 In Progress
- Testing Stripe payment integration (integrated, pending testing)

### ⏳ Pending
- Assessment-taking interface for all 4 assessments
- OpenAI GPT-5 integration for Prompt Architecture evaluation
- Scoring engines for each assessment type
- Results dashboard with visualizations
- PDF export functionality
- Admin invitation system (Gmail/Nodemailer)
- Admin dashboard for viewing all results
- Email notifications for completion

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

### For Individual Users
1. Browse landing page and assessments
2. Sign up with email/password (all assessments are 100% free!)
3. Complete assessments
4. View results with detailed breakdowns
5. Download PDF report

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
