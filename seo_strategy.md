# SEO Strategy

## In scope
- Public marketing pages
- Public sample report pages
- Articles and white papers
- Public legal and company-information pages

## Out of scope
- Authenticated dashboard routes (`/admin/**`, `/partner/**`, `/candidate/**`, `/app/**`)
- Assessment-taking and payment flows that are primarily transactional unless they are publicly linked marketing content

## Target audience
- Employers evaluating AI-era assessment tools for hiring and team diagnostics
- Candidates researching psychometric testing, AI literacy, and career readiness

## Primary keywords
- AI assessment platform
- psychometric testing
- pre-employment assessment
- AI literacy assessment
- recruitment assessment platform

## Technical SEO posture
- Public marketing SEO depends on the Express bot-prerender layer serving crawler-readable HTML for selected public routes.
- Public URLs intended to rank should stay aligned across the React router, internal links, sitemap, and bot-prerender allowlist.
- Editorial content should expose article-specific metadata and schema to both browser users and crawler-facing prerender output.

## Dismissed categories
- (None yet)
