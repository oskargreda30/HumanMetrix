# Sample PDF Reports Generation

This document describes the sample PDF generation system for HumanMetrix assessment reports.

## Overview

Three professional PDF reports have been generated with realistic assessment data:
1. **Individual Report** - Sarah Chen's comprehensive assessment results
2. **Comparison Report** - Sarah Chen vs Marcus Johnson side-by-side comparison
3. **Role Fit Report** - Sarah Chen's fit analysis for Software Engineer role

## Generated Files

All PDFs are located in `client/public/sample-reports/`:
- `individual-sample.pdf` (80KB) - Sarah Chen's complete assessment
- `comparison-sample.pdf` (54KB) - Sarah vs Marcus comparison
- `rolefit-sample.pdf` (53KB) - Sarah's Software Engineer role fit analysis

## Sample Data

### Sarah Chen Assessment Scores

**FIT Assessment (Behavioral Skills):**
- High Agency: 88
- Intellectual Curiosity: 92
- Resilience: 85
- Empathy & Ethics: 90
- Growth Mindset: 87
- Interpersonal Agility: 91
- **Average: 88.8**

**AI Readiness Assessment:**
- AI Literacy/Prompting: 85
- Technical Fluency: 78
- Domain Fluency: 82
- Critical Thinking: 90
- Adaptive Learning: 88
- Responsible AI: 92
- Domain Expertise: 80
- Creative Innovation: 86
- Cross-functional Collaboration: 84
- **Average: 85**

**Additional Assessments:**
- Prompt Architecture Score: 82/100
- AIQ (Algorithmic Integrity Quotient): 85/100
- **Overall Average: ~86**

### Marcus Johnson Assessment Scores

**FIT Assessment:**
- High Agency: 82
- Intellectual Curiosity: 75
- Resilience: 88
- Empathy & Ethics: 80
- Growth Mindset: 78
- Interpersonal Agility: 85
- **Average: 81.3**

**AI Readiness Assessment:**
- AI Literacy/Prompting: 72
- Technical Fluency: 88
- Domain Fluency: 70
- Critical Thinking: 82
- Adaptive Learning: 75
- Responsible AI: 78
- Domain Expertise: 85
- Creative Innovation: 73
- Cross-functional Collaboration: 80
- **Average: 78.1**

**Additional Assessments:**
- Prompt Architecture Score: 75/100
- AIQ: 78/100
- **Overall Average: ~78**

## Privacy & Redaction

Personal details have been redacted for sample reports:
- Sarah Chen → Sarah C***
- Email: s***@example.com
- Marcus Johnson → Marcus J***
- Email: m***@example.com

## Regenerating PDFs

To regenerate the sample PDFs with updated data:

```bash
tsx server/generateSamplePDFs.ts
```

This will overwrite the existing PDF files in `client/public/sample-reports/`.

## PDF Features

Each PDF includes:
- Professional HumanMetrix branding header
- Comprehensive assessment breakdowns
- Color-coded performance indicators
- Progress bars and visual data representations
- Multi-page layouts with consistent formatting
- Page numbers and generation dates
- Footer with copyright information

## Accessing PDFs

The PDFs are accessible via:
- Direct URL: `http://localhost:5000/sample-reports/{filename}.pdf`
- Website component: `SampleReportsSection` component on the homepage
- Download links are available at `#sample-reports` section

## Technical Implementation

The generation script (`server/generateSamplePDFs.ts`) uses:
- jsPDF library for PDF creation
- Custom helper functions for consistent styling
- Node.js file system for saving PDFs
- TypeScript for type safety

The script is completely self-contained and can run independently of the main application.
