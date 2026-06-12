---
name: Partner credit consumption & AI-narrative render safety
description: Two recurring traps in partner AI-report endpoints/components — charge order and HTML injection from AI text.
---

# Partner credit consumption ordering
Consume partner credits (`storage.consumePartnerTest`) ONLY after ALL deterministic
validation passes — including that the target/team candidates actually have completed
assessment data in the computed score map. Ownership checks alone are insufficient
because owned identities (invitation email / externalUserId) can have zero completed
sessions.

**Why:** Ownership is verified against invitation/session identities, but a partner can
own a candidate who never completed an assessment. If you charge before building the
score map and asserting data exists, the request still returns 4xx ("no completed
assessments") AFTER the credit was already deducted.

**How to apply:** In partner AI-report endpoints (cohort benchmark, multi-candidate role
fit, etc.), structure as: ownership check → cache lookup → build score map → assert
target+team have data → THEN consume credit → call OpenAI → save report.

# AI-narrative rendering must not use dangerouslySetInnerHTML
Markdown renderers for OpenAI-generated narratives must render bold/headings as React
nodes (tokenize on `**...**` and emit `<strong>`), never via `dangerouslySetInnerHTML`.

**Why:** AI output is influenced by user-controlled candidate/team fields (names, emails),
so HTML/script payloads can flow through the narrative into a partner's session = stored XSS.

**How to apply:** Use a split-based tokenizer returning `React.ReactNode[]`; keep
`stripEmoji`/heading/bullet parsing but inject text only as JSX children.
