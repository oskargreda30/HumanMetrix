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
- Base computation fee: £15 (one-time)
- Assessment fees: £3.50 - £5.00 per test
- Example: All 4 assessments = £32 total

## Tech Stack
- **Frontend**: React + TypeScript, Wouter (routing), TanStack Query, Shadcn UI, Tailwind CSS
- **Backend**: Express + TypeScript
- **Database**: PostgreSQL (Neon) via Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)
- **Payments**: Stripe
- **AI**: OpenAI API (GPT-5 for Prompt Architecture evaluation)
- **Email**: Nodemailer with Gmail

## Current Implementation Status

### ✅ Completed
1. **Frontend Pages & Components**
   - Landing page with navigation, hero, how it works, employer section, pricing, CTA, footer
   - About page
   - Assessments selection page
   - For Employers page
   - Login page (placeholder)
   - All reusable components (Navigation, HeroSection, AssessmentCard, etc.)

2. **Database Schema**
   - `users` table (Replit Auth compatible)
   - `sessions` table (for auth)
   - `purchased_assessments` table (tracks purchases)
   - `assessment_results` table (stores completed assessments)
   - `invitations` table (employer invitations)
   - `prompt_architecture_evaluations` table (GPT-5 evaluations)
   - `aiq_rationales` table (follow-up rationale responses)

3. **Authentication System**
   - Replit Auth integration (OpenID Connect)
   - Server-side auth middleware (`replitAuth.ts`)
   - Frontend `useAuth` hook
   - Protected routes ready
   - Database storage layer with all CRUD operations

### 🚧 In Progress
- Stripe payment integration

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
- `STRIPE_SECRET_KEY` - Stripe secret key
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key (frontend)
- `REPLIT_DOMAINS` - Auto-configured by Replit
- `REPL_ID` - Auto-configured by Replit

## User Journey

### For Individual Users
1. Browse landing page and assessments
2. Select assessments to take
3. Checkout with Stripe (£15 base + assessment fees)
4. Complete assessments
5. View results with detailed breakdowns
6. Download PDF report

### For Employers
1. Admin logs in
2. Sends invitation to candidate via email
3. Candidate receives link to take specific assessments
4. Candidate completes assessments
5. Admin views results in dashboard
6. Results can be exported as PDF

## Next Steps
1. Complete Stripe checkout integration
2. Build assessment-taking UI for each type
3. Implement scoring engines
4. Add OpenAI GPT-5 evaluation for Prompt Architecture
5. Create results dashboard
6. Add PDF export
7. Implement admin features (invitations, dashboard)
8. Add email notifications
