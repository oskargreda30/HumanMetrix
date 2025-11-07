# Sample PDF Generation Guide

This document explains how to generate and update the sample PDFs that appear on the home page download section.

## Overview

The home page (SampleReportsSection component) provides three sample PDF downloads:
- `/sample-reports/individual-sample.pdf` - Comprehensive individual assessment report
- `/sample-reports/comparison-sample.pdf` - Multi-candidate comparison report  
- `/sample-reports/rolefit-sample.pdf` - AI-powered role fit analysis report

**IMPORTANT**: These PDFs MUST be generated using the EXACT same `exportEnhancedCandidatePDF` function that the admin dashboard uses to ensure accuracy and consistency.

## How to Generate Sample PDFs

### Step 1: Login as Admin
1. Go to `/login`
2. Login with admin credentials

### Step 2: Visit Generator Page
1. Navigate to `/admin/generate-samples`
2. You'll see the Sample PDF Generator utility

### Step 3: Generate PDFs
1. Click **"Generate Individual Report"**
   - PDF will download as `humanmetrix-report-sarah-c-YYYY-MM-DD.pdf`
   - Rename it to `individual-sample.pdf`

2. Click **"Generate Role Fit Report"**
   - PDF will download as `humanmetrix-report-sarah-c-software-engineer-YYYY-MM-DD.pdf`
   - Rename it to `rolefit-sample.pdf`

### Step 4: Save to Public Folder
1. Move the renamed PDFs to `client/public/sample-reports/`
2. Replace the existing files

### Step 5: Test
1. Visit the home page
2. Scroll to "View Sample Reports" section
3. Click each download button to verify PDFs are correct

## Sample Data

The PDFs use Sarah Chen's data:
- **Personal Info**: "Sarah C***", "s***@example.com" (redacted for privacy)
- **FIT Assessment**: 88.8 average (scores: 88, 92, 85, 90, 87, 91)
- **AI Readiness**: 85 average (9 skills ranging from 78-92)
- **Prompt Architecture**: 82% overall
- **AIQ**: 85 score

## When to Regenerate

Regenerate sample PDFs when:
- The `exportEnhancedCandidatePDF` function changes (new layout, sections, formatting)
- You want to update sample data or scores
- The PDF design is updated
- You add new assessment types

## Technical Details

- **Generator**: `/admin/generate-samples` page
- **Export Function**: `client/src/lib/enhancedPdfExport.ts:exportEnhancedCandidatePDF`
- **Data Source**: `client/src/pages/GenerateSamplePDFs.tsx` (mock Sarah Chen data)
- **Storage**: `client/public/sample-reports/` (static files served by Vite)
- **Home Page Component**: `client/src/components/SampleReportsSection.tsx`

## Future Automation (Optional)

If you need to automate PDF generation (e.g., in CI/CD), consider:
1. Playwright/Puppeteer script to visit `/admin/generate-samples`
2. Programmatically click buttons and capture downloads
3. Move files to correct locations automatically

For now, manual generation is recommended for simplicity.
