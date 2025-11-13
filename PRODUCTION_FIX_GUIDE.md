# URGENT: Production Fix Guide

## Issues Identified in Production

1. ✅ **Incorrect Scores**: oskar.greda@hotmail.co.uk and oskar@mlabs.city have very low scores
2. ✅ **Job Role Selection Not Working**: Admin dashboard dropdown empty
3. ✅ **Prompt Architecture Incomplete**: Scores not being calculated

## Root Causes

1. **Old Code in Production**: Scoring functions are outdated
2. **Job Roles Not Seeded**: bootstrapRoles.ts never run in production
3. **Missing OpenAI API Key**: OPENAI_API_KEY not set in production environment

## IMMEDIATE FIX STEPS (Run These in Production)

### Step 1: Deploy Latest Code

Make sure your production environment has the latest version of the code deployed. The scoring logic is in `server/routes.ts` lines 2068-2330.

### Step 2: Seed Job Roles (Fixes Admin Dashboard)

```bash
# Run in PRODUCTION
tsx server/scripts/bootstrapRoles.ts
```

**Expected output**: Should create 25 job roles.

**Verify**:
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM job_roles;"
# Should return: 25
```

### Step 3: Set OpenAI API Key (Fixes Prompt Architecture)

Add to your production environment variables:
```bash
OPENAI_API_KEY=sk-your-actual-key-here
```

Then restart your production application.

### Step 4: Recalculate Incorrect Scores

```bash
# Run in PRODUCTION
tsx server/scripts/recalculateScores.ts
```

This will:
- Find oskar.greda@hotmail.co.uk and oskar@mlabs.city
- Recalculate their FIT and AI Readiness scores using the CORRECT logic
- Update the database with new scores

**For other users**:
```bash
tsx server/scripts/recalculateScores.ts --user another.user@example.com
```

## Verification Steps

### 1. Check Job Roles

```sql
SELECT COUNT(*) FROM job_roles;
-- Should return: 25

SELECT name FROM job_roles LIMIT 5;
-- Should show: AI/ML Engineer, Product Manager, etc.
```

### 2. Check Recalculated Scores

```sql
SELECT 
  u.email, 
  ar.assessment_type, 
  ar.total_score, 
  ar.scores 
FROM assessment_results ar 
JOIN users u ON ar.user_id = u.id 
WHERE u.email IN ('oskar.greda@hotmail.co.uk', 'oskar@mlabs.city')
  AND ar.status = 'completed'
ORDER BY u.email, ar.assessment_type;
```

**Expected**: FIT and AI Readiness scores should now be in the 40-80 range (normalized 0-100).

### 3. Test Admin Dashboard

1. Log in to admin dashboard
2. Go to "Intelligence Hub" → "Compare"
3. Check that job role dropdown works
4. Select candidates and compare

### 4. Check OpenAI API

```bash
# Simple test in Node REPL
node
> const OpenAI = require('openai');
> const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
> openai.chat.completions.create({ model: 'gpt-4o', messages: [{role: 'user', content: 'Hi'}], max_tokens: 5 }).then(console.log);
```

Should return a response without errors.

## Dev/Prod Parity - Prevent Future Issues

### Environment Variables Checklist

Ensure these match between dev and prod (values can differ, but both must be set):

```bash
✅ OPENAI_API_KEY
✅ STRIPE_SECRET_KEY  
✅ VITE_STRIPE_PUBLIC_KEY
✅ GMAIL_USER
✅ GMAIL_APP_PASSWORD
✅ DATABASE_URL
✅ SESSION_SECRET
```

### Database Schema Parity

```bash
# Run in BOTH dev and prod:
npm run db:push
```

### Seeded Data Parity

Run these scripts in BOTH dev and prod:

```bash
# 1. Job roles (25 predefined roles)
tsx server/scripts/bootstrapRoles.ts

# 2. Admin accounts
ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=password tsx server/scripts/bootstrapAdmin.ts

# 3. FREE promo code (optional)
tsx server/scripts/setupFreePromoCode.ts
```

### Code Deployment Parity

These files MUST be identical in dev and prod:
- `server/routes.ts` (scoring functions)
- `shared/schema.ts` (pricing constants)
- `client/src/data/fit-questions.ts` (scoring matrix)
- `client/src/data/ai-readiness-questions.ts` (scoring matrix)

## Expected Results After Fixes

### FIT Assessment Scores
- Each skill scored 0-100
- Total score is average of all skills
- Typical range: 40-80

### AI Readiness Assessment Scores
- 9 skills scored 0-100
- Total score is average of all skills
- Typical range: 40-75

### Prompt Architecture Assessment
- 7 levels, each scored 0-100
- Total is average across all levels
- Should see evaluations for each level

## If Issues Persist

### Check Logs

```bash
# In production, check recent logs for errors
tail -f /path/to/logs

# Look for:
# - OpenAI API errors
# - Database connection errors
# - Missing environment variables
```

### Manual Database Check

```sql
-- Check specific user's results
SELECT 
  ar.id,
  ar.assessment_type,
  ar.status,
  ar.total_score,
  jsonb_pretty(ar.scores::jsonb) as skill_scores,
  ar.completed_at
FROM assessment_results ar
JOIN users u ON ar.user_id = u.id
WHERE u.email = 'oskar.greda@hotmail.co.uk'
ORDER BY ar.completed_at DESC;
```

### Recompute Prompt Architecture

If Prompt Architecture still incomplete after setting OPENAI_API_KEY:

```sql
-- Check evaluations exist
SELECT 
  ar.id as result_id,
  ar.assessment_type,
  COUNT(pae.id) as evaluation_count
FROM assessment_results ar
LEFT JOIN prompt_architecture_evaluations pae ON pae.result_id = ar.id
WHERE ar.assessment_type = 'prompt_architecture'
  AND ar.user_id IN (
    SELECT id FROM users WHERE email IN ('oskar.greda@hotmail.co.uk', 'oskar@mlabs.city')
  )
GROUP BY ar.id, ar.assessment_type;
```

Expected: Should have 7 evaluations per result (one per level).

## Support

If issues continue after following this guide:

1. Check all environment variables are set correctly
2. Verify latest code is deployed
3. Check database connection and schema
4. Review application logs for specific errors

All scoring logic is centralized in `server/routes.ts` - if scores are still wrong, the code may not be fully deployed to production.
