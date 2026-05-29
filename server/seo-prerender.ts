import type { Express, Request, Response, NextFunction } from "express";

const BOT_UA_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /yandexbot/i,
  /baiduspider/i,
  /duckduckbot/i,
  /\bslurp\b/i,
  /facebookexternalhit/i,
  /\bfacebot\b/i,
  /twitterbot/i,
  /linkedinbot/i,
  /telegrambot/i,
  /discordbot/i,
  /slackbot/i,
  /applebot/i,
  /gptbot/i,
  /chatgpt-user/i,
  /oai-searchbot/i,
  /claudebot/i,
  /claude-web/i,
  /anthropic-ai/i,
  /perplexitybot/i,
  /\byou\.com\b/i,
  /bytespider/i,
  /amazonbot/i,
  /\bccbot\b/i,
  /cohere-ai/i,
  /diffbot/i,
  /ahrefsbot/i,
  /semrushbot/i,
  /mj12bot/i,
  /screaming frog/i,
];

function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return BOT_UA_PATTERNS.some((re) => re.test(userAgent));
}

interface RouteContent {
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: { heading: string; body: string }[];
  keywords?: string;
}

const SITE_URL = "https://www.humanmetrix.co.uk";
const SITE_NAME = "HumanMetrix";

const HOME: RouteContent = {
  title:
    "HumanMetrix - AI Psychometric Testing Platform | Human Metrix UK",
  description:
    "HumanMetrix is the UK's leading AI-powered psychometric testing and candidate assessment platform. Measure behavioural fit and AI literacy with FIT, AI Readiness, Prompt Architecture and AIQ tests. Trusted by recruiters and partners across the UK and South Africa.",
  h1: "HumanMetrix - AI Psychometric Testing for Recruitment and Career Development",
  intro:
    "HumanMetrix is an enterprise-grade AI assessment platform built for recruiters, employers and individuals. We help organisations objectively measure behavioural skills and AI literacy so they can identify the right candidates for AI-driven roles - quickly, fairly and at scale.",
  sections: [
    {
      heading: "What we do",
      body: "HumanMetrix delivers four flagship assessments: FIT (behavioural competencies), AI Readiness (practical AI fluency), Prompt Architecture (advanced prompting and reasoning) and the Algorithmic Integrity Quotient (AIQ) covering ethics, bias awareness and responsible AI use. Each assessment is scored using GPT-5 against a benchmarked golden set to ensure consistency, fairness and scientific rigour.",
    },
    {
      heading: "Who we serve",
      body: "Our platform is used by recruitment agencies, in-house talent teams and enterprise partners to screen candidates, benchmark teams and accelerate hiring decisions. Partners can embed assessments directly into their own hiring flows via our JavaScript widget, API and webhook integrations. Individuals can take assessments to certify their AI literacy and improve their career prospects.",
    },
    {
      heading: "Why HumanMetrix",
      body: "Traditional psychometric tests measure who someone was; HumanMetrix measures how well they work alongside AI today. Our reports give recruiters clear scores, comparisons, role-fit analysis and next-step recommendations - saving hours per hire and reducing bias. The platform supports multi-currency pricing, Purchasing Power Parity discounts, partner billing tiers and full PDF reports delivered automatically after completion.",
    },
    {
      heading: "Ecosystem Index - Team Capability Diagnostic",
      body: "Beyond individual assessment, our Ecosystem Index analyses an entire team against a mission statement, surfaces capability gaps and generates ideal-candidate profiles for the next hire. It is a credit-based, AI-powered team diagnostic used by leadership teams planning AI adoption and workforce transformation.",
    },
    {
      heading: "Get in touch",
      body: "Recruiters and hiring leaders can request a demo, partner onboarding or pricing details via the contact options on the site. Candidates can take an assessment directly. HumanMetrix is operated by PT Human Metrix Assessments with UK partner operations.",
    },
  ],
  keywords:
    "HumanMetrix, Human Metrix, psychometric testing UK, AI assessment, pre-employment testing, AI readiness, prompt engineering test, recruitment software, candidate assessment, behavioural assessment",
};

const ROUTE_CONTENT: Record<string, RouteContent> = {
  "/": HOME,

  "/about": {
    title: "About HumanMetrix - AI Psychometric Testing Company",
    description:
      "HumanMetrix is building the future of professional assessment for an AI-driven world. Learn about our mission, values and approach to measuring behavioural and AI literacy skills.",
    h1: "About HumanMetrix",
    intro:
      "We're building the future of professional assessment for an AI-driven world. HumanMetrix helps organisations and individuals measure what truly matters: the ability to work effectively with AI while maintaining essential human skills.",
    sections: [
      {
        heading: "Our Mission",
        body: "In an era where AI is transforming every industry, traditional assessments no longer capture the full picture of a candidate's potential. HumanMetrix was created to bridge this gap by evaluating both timeless behavioural competencies and emerging AI literacy skills.",
      },
      {
        heading: "Why HumanMetrix",
        body: "Success in 2025 and beyond requires adaptability, ethical judgement and the ability to leverage AI tools effectively. We measure behavioural competencies (agency, curiosity, resilience, empathy, growth mindset), AI readiness from basic prompting to complex reasoning, technical prompt architecture skills and ethical AI understanding including bias, fairness and responsible deployment.",
      },
      {
        heading: "Our Values",
        body: "Precision and accuracy through rigorous scientific methodology. Human-centric AI that augments rather than replaces. Enterprise-grade professional standards. Continuous innovation that tracks the evolution of AI capabilities and workplace requirements.",
      },
    ],
  },

  "/team": {
    title: "Our Team - Meet the HumanMetrix Leadership",
    description:
      "Meet the team behind HumanMetrix - experts in AI, HR, technology, business development and psychometrics building the future of talent assessment.",
    h1: "Meet Our Team",
    intro:
      "The people behind HumanMetrix bring together expertise in HR, technology, business development and psychometrics.",
    sections: [
      {
        heading: "Oskar Greda - Founder & CEO",
        body: "Oskar leads HumanMetrix as Founder and CEO. He began his career in people operations and organisational leadership, holding senior HR and COO roles across AI and blockchain consultancy before founding HumanMetrix. He studied Human Resource Management at Leeds Business School.",
      },
      {
        heading: "Quin van Kerken - Co-Founder & Head of Business Development",
        body: "Quin leads partnerships and growth. His career spans heavily regulated industries including medicine manufacturing and large-scale retail franchises, bringing operational rigour and seasoned commercial maturity to the team.",
      },
      {
        heading: "Daena McClintock - Co-Founder & Head of Technology",
        body: "Daena leads the platform's engineering. He began on Wall Street in trading and equity research before moving into software engineering at startups across the US and Europe, specialising in high-performance web/mobile, blockchain and AI/ML. Graduated Cum Laude from UMass Amherst.",
      },
      {
        heading: "Reynalyn Rodriguez - Content & Socials Manager",
        body: "Reynalyn leads brand communications and social media. She specialises in social media management and audience engagement for professional service brands. Mass Communication degree from the University of Muntinlupa.",
      },
      {
        heading: "Dr Mariana Costa e Silva-Pickett - Psychometrics Advisor",
        body: "Dr Costa e Silva-Pickett advises on test construction, construct validation, reliability and measurement quality. Doctoral and postdoctoral work at City, St George's, University of London, focused on behavioural and self-efficacy measures and digital mental health research.",
      },
    ],
  },

  "/assessments": {
    title: "AI Assessments - FIT, AI Readiness, Prompt Architecture, AIQ | HumanMetrix",
    description:
      "Explore HumanMetrix's four flagship assessments: FIT (behavioural), AI Readiness, Prompt Architecture and Algorithmic Integrity Quotient (AIQ). Enterprise-grade psychometric tests scored by GPT-5.",
    h1: "Our Assessments",
    intro:
      "HumanMetrix offers four scientifically validated AI-powered assessments designed for modern recruitment and career development.",
    sections: [
      {
        heading: "FIT Assessment",
        body: "Measures core behavioural competencies including agency, curiosity, resilience, empathy and growth mindset. Identifies cultural and role fit using validated psychometric techniques.",
      },
      {
        heading: "AI Readiness",
        body: "Evaluates practical AI fluency from foundational prompting to complex multi-step reasoning. Identifies candidates ready to thrive in AI-augmented roles.",
      },
      {
        heading: "Prompt Architecture",
        body: "Advanced assessment of prompt engineering skill, iterative refinement and structured reasoning - the core technical AI skill for knowledge workers.",
      },
      {
        heading: "Algorithmic Integrity Quotient (AIQ)",
        body: "Tests ethical AI understanding, bias awareness, fairness and responsible deployment - essential for any role making decisions with AI.",
      },
    ],
  },

  "/for-candidates": {
    title: "For Candidates - Certify Your AI Literacy | HumanMetrix",
    description:
      "Take HumanMetrix assessments to certify your AI literacy, prove your behavioural fit and stand out to recruiters. Get a professional PDF report you can share.",
    h1: "For Candidates",
    intro:
      "Stand out in an AI-driven job market. HumanMetrix assessments give you a professional, recruiter-grade report that proves you can work effectively with AI.",
    sections: [
      {
        heading: "How it works",
        body: "Choose an assessment, complete it online (typically 20-45 minutes), pay securely and receive a comprehensive PDF report by email. Share the report with employers or upload it to your applications.",
      },
      {
        heading: "What you get",
        body: "A detailed report with skill-level scores, personalised feedback and development recommendations. Multi-currency pricing and Purchasing Power Parity discounts are available based on your country.",
      },
    ],
  },

  "/pricing": {
    title: "Pricing - Individual and Partner Plans | HumanMetrix",
    description:
      "Transparent pricing for HumanMetrix assessments. Individual purchases, partner billing tiers, multi-currency pricing and Purchasing Power Parity discounts.",
    h1: "Pricing",
    intro:
      "Simple, transparent pricing for individuals and enterprise partners. Choose the plan that fits your hiring volume or career stage.",
    sections: [
      {
        heading: "Individual",
        body: "Pay per assessment with secure Stripe checkout. Multi-currency support and Purchasing Power Parity discounts ensure fair pricing globally.",
      },
      {
        heading: "Partners and Enterprise",
        body: "Three billing tiers built for recruitment agencies and in-house talent teams. Includes embeddable assessments, API access, webhook notifications, candidate pipeline management and partner dashboards. Auto top-up and subscription billing available.",
      },
    ],
  },

  "/ecosystem-index": {
    title: "Ecosystem Index - AI Team Capability Diagnostic | HumanMetrix",
    description:
      "The HumanMetrix Ecosystem Index is an AI-powered team capability diagnostic. Analyse your team against your mission, surface capability gaps and generate ideal-candidate profiles for your next hire.",
    h1: "Ecosystem Index - Team Capability Diagnostic",
    intro:
      "Beyond individual assessment, the Ecosystem Index analyses an entire team against a mission statement and generates actionable insights for leadership.",
    sections: [
      {
        heading: "What it does",
        body: "Aggregates team FIT scores, runs mission-alignment analysis, asks contextual deep-dive questions, identifies capability gaps and generates ideal-candidate profiles for the next hire.",
      },
      {
        heading: "How it works",
        body: "Credit-based billing (20 credits per analysis). Each partner gets an auto-created Team Diagnostic project - no manual project management required. Designed for leadership teams planning AI adoption and workforce transformation.",
      },
    ],
  },

  "/articles": {
    title: "Articles & Insights - HumanMetrix",
    description:
      "Articles and insights on psychometric testing, AI literacy, prompt engineering and the future of recruitment from the HumanMetrix team.",
    h1: "Articles & Insights",
    intro:
      "Practical guides and research-backed insights on AI assessment, psychometric testing and modern recruitment.",
    sections: [
      {
        heading: "Featured topics",
        body: "How to pass psychometric tests in job interviews. The role of psychometric testing in modern recruitment. The HumanMetrix AI assessment suite explained. The future of AI assessments and our 2026 roadmap. Why AI literacy matters in recruitment. Prompt engineering skills for the workplace.",
      },
    ],
  },

  "/purchase": {
    title: "Buy Assessments - Individual & Bundle Pricing | HumanMetrix",
    description:
      "Purchase HumanMetrix assessments securely. Choose individual tests or bundles with multi-currency pricing and Purchasing Power Parity discounts. Pay only for what you need.",
    h1: "Purchase Assessments",
    intro:
      "Buy the assessments that matter to you. Secure Stripe checkout, multi-currency support and Purchasing Power Parity discounts make HumanMetrix accessible wherever you are.",
    sections: [
      {
        heading: "What you can buy",
        body: "Purchase any of our four assessments - FIT, AI Readiness, Prompt Architecture and AIQ - individually or as a discounted bundle. Each purchase includes a comprehensive PDF report delivered automatically on completion.",
      },
    ],
  },

  "/cohort-benchmarking": {
    title: "Cohort Benchmarking - Compare Talent Pools | HumanMetrix",
    description:
      "Benchmark cohorts and talent pools with HumanMetrix. Compare groups of candidates against each other and against role requirements to make data-driven hiring and development decisions.",
    h1: "Cohort Benchmarking",
    intro:
      "Understand how a whole group measures up. Cohort Benchmarking lets you compare candidates, teams or graduate intakes against each other and against role requirements.",
    sections: [
      {
        heading: "What it does",
        body: "Aggregate assessment results across a cohort to surface strengths, gaps and outliers. Ideal for graduate programmes, bulk hiring rounds and workforce development planning.",
      },
    ],
  },

  "/methodology": {
    title: "Assessment Methodology - How HumanMetrix Scoring Works",
    description:
      "How HumanMetrix measures behavioural fit and AI literacy: attribution-based scoring with GPT-5 against a benchmarked golden set, situational-judgement design for predictive validity, role customisation and regional relevance.",
    h1: "How HumanMetrix Measures What Matters",
    intro:
      "HumanMetrix combines validated psychometric design with AI-powered scoring to measure behavioural fit and practical AI literacy. This page explains how our assessments are built, scored and kept consistent, fair and relevant to the role and region you are hiring for.",
    keywords:
      "assessment methodology, psychometric scoring, situational judgement test, predictive validity, golden set benchmark, AI scoring, role customisation, regional benchmarking",
    sections: [
      {
        heading: "The scoring model",
        body: "Each response is evaluated using an attribution-based model that maps what a candidate says and does to the underlying competency it demonstrates. Scoring is performed by GPT-5 against a benchmarked golden set of reference answers, so an equivalent answer receives an equivalent score every time, removing the drift and rater subjectivity that affect manual scoring.",
      },
      {
        heading: "Short by design, built for prediction",
        body: "Rather than long inventories of repetitive items, HumanMetrix uses a situational-judgement framework that concentrates measurement on the behaviours and reasoning most predictive of on-the-job performance. The result is a far shorter experience for the candidate that still produces a rich, defensible signal for the hiring team.",
      },
      {
        heading: "The four assessments",
        body: "FIT measures core behavioural competencies such as agency, curiosity, resilience and growth mindset. AI Readiness measures practical AI fluency. Prompt Architecture measures advanced prompt-engineering and structured reasoning. The Algorithmic Integrity Quotient (AIQ) measures ethical AI understanding, bias awareness and responsible deployment.",
      },
      {
        heading: "Built for every role, not just tech",
        body: "The same methodology extends to non-technical and safety-critical fields including engineering, construction, healthcare, operations and frontline services. Competencies and thresholds are calibrated to the demands of the role rather than a one-size-fits-all template.",
      },
      {
        heading: "Tailored to your roles",
        body: "A role is defined by its competencies, each with an importance weighting and a minimum score, together with a job description. Our AI uses that definition to generate the required skill-score profile and to drive role-fit matching, so assessments can be tailored to specialist positions and to roles not yet in the standard library, informed directly by the job description you provide.",
      },
      {
        heading: "Regional relevance and fairness",
        body: "HumanMetrix supports regionally localised assessment content, and benchmarking, currency and Purchasing Power Parity pricing adapt by country, so candidates are compared against relevant peer cohorts. Scoring against a fixed golden set means every candidate is held to the same standard, and results are reproducible rather than dependent on who is marking.",
      },
    ],
  },

  "/security": {
    title: "Trust Center - Security, Privacy & Compliance | HumanMetrix",
    description:
      "HumanMetrix Trust Center: data protection aligned with GDPR and POPIA, encryption in transit and at rest, access controls, data residency and responsible AI. How we keep candidate and partner data secure.",
    h1: "Security, Privacy & Compliance",
    intro:
      "Assessment data is sensitive. HumanMetrix is built to protect candidate and partner information at every stage, with encryption, strong access controls, data-protection-by-design and a responsible approach to AI.",
    keywords:
      "security, data protection, GDPR, POPIA, encryption, data residency, privacy, compliance, trust center, responsible AI",
    sections: [
      {
        heading: "Data protection and privacy",
        body: "HumanMetrix is built to support GDPR compliance and is designed to align with POPIA for South African operations. We practise data minimisation, collecting only what is needed to deliver and score assessments, and candidate results are gated behind explicit consent before they can be shared.",
      },
      {
        heading: "Encryption",
        body: "All traffic is encrypted in transit using TLS/HTTPS, and data is stored on managed cloud infrastructure that encrypts data at rest. Sensitive fields are never exposed in client code, and application logging is sanitised to keep credentials and personal data out of logs.",
      },
      {
        heading: "Access and authentication",
        body: "Accounts are protected with session-based authentication and CSRF protection, with role-based access separating candidate, partner and administrator capabilities. Partner API access is authenticated with scoped API keys that can be managed and revoked from the partner dashboard.",
      },
      {
        heading: "Infrastructure and data residency",
        body: "HumanMetrix runs on managed, elastic cloud infrastructure with a managed PostgreSQL database and object storage for report assets. For enterprise customers with specific data-residency or regional-hosting requirements, we can discuss appropriate arrangements during onboarding.",
      },
      {
        heading: "Responsible AI",
        body: "AI scoring is anchored to a benchmarked golden set for consistency, and our Algorithmic Integrity Quotient keeps bias awareness, fairness and responsible deployment central to the product. We treat the same standards we assess candidates against as standards for how we build.",
      },
    ],
  },

  "/partnerships": {
    title: "Partnerships & White-Label - Channel Partner Programme | HumanMetrix",
    description:
      "Partner with HumanMetrix: white-label assessments, revenue-share and reseller arrangements, tiered partner billing and full API access for recruitment agencies, consultancies and HR-tech platforms.",
    h1: "Partner With HumanMetrix",
    intro:
      "Build AI-powered assessment into your own offering. Whether you are a recruitment agency, a consultancy or an HR-tech platform, our partner programme lets you deliver HumanMetrix assessments under your brand, on your terms.",
    keywords:
      "partnerships, white-label assessments, channel partner, revenue share, reseller, recruitment agency, HR tech integration, partner API",
    sections: [
      {
        heading: "White-label delivery",
        body: "Offer assessments under your own brand and embed them into your existing candidate experience, so the flow feels native to your product or service.",
      },
      {
        heading: "Revenue share and reselling",
        body: "Our channel programme supports revenue-share and reseller arrangements with tiered partner billing, so you can build assessment into your own commercial model.",
      },
      {
        heading: "API and widget integration",
        body: "Partners can embed assessments with the JavaScript widget and SDK, automate flows through the REST API with scoped API-key authentication, and receive webhook notifications when candidates complete assessments.",
      },
      {
        heading: "Fits your tech stack",
        body: "HumanMetrix is designed to slot into the tools agencies already use. The REST API and webhooks let you bridge sourcing and assessment data into your wider hiring workflow, so candidate results flow to where your team already works.",
      },
    ],
  },

  "/enterprise": {
    title: "Enterprise & High-Volume Assessment | HumanMetrix",
    description:
      "Enterprise assessment from HumanMetrix: flat-rate subscriptions, high-volume candidate handling, elastic-scale infrastructure, API automation and dedicated onboarding for large employers and BPOs.",
    h1: "Assessment at Enterprise Scale",
    intro:
      "For organisations hiring at volume, HumanMetrix offers predictable enterprise pricing, infrastructure that scales with demand and the automation to assess thousands of candidates without adding manual overhead.",
    keywords:
      "enterprise assessment, high volume hiring, flat rate subscription, bulk candidate testing, scalable assessment, BPO recruitment, enterprise pricing, SLA",
    sections: [
      {
        heading: "Flat-rate subscriptions",
        body: "Move from per-assessment pricing to a flat-rate enterprise subscription, so budgeting stays predictable however many candidates you assess.",
      },
      {
        heading: "High-volume handling",
        body: "Assess large candidate pools, ideal for high-growth employers and BPOs running continuous, large-scale hiring campaigns.",
      },
      {
        heading: "Elastic infrastructure",
        body: "Built on elastic cloud infrastructure that scales with demand, with API rate limiting, caching and performance optimisations that keep the experience fast under load.",
      },
      {
        heading: "Dedicated onboarding and support",
        body: "Enterprise customers receive hands-on onboarding and a direct line to our team, with service-level expectations agreed up front, while keeping the same consistent scoring, regionally normalised benchmarking and data-protection posture as every other customer.",
      },
    ],
  },

  "/developers": {
    title: "Developers - API, Widget & Webhooks | HumanMetrix",
    description:
      "HumanMetrix developer resources. Embed assessments with our JavaScript widget, integrate via REST API, authenticate with API keys and receive webhook notifications. Connect HumanMetrix to your ATS and HR tech stack.",
    h1: "Developer Resources",
    intro:
      "Integrate HumanMetrix assessments into your own product or hiring flow. Our developer tools make embedding, automating and extending assessments straightforward.",
    sections: [
      {
        heading: "Integration options",
        body: "Embed assessments with the JavaScript widget and SDK, call the REST API with API-key authentication, and receive real-time webhook notifications when candidates complete assessments. Full documentation and code examples are provided.",
      },
      {
        heading: "Integrations and ATS",
        body: "Use webhooks and the REST API to connect HumanMetrix to your applicant tracking system and wider HR tech stack. Trigger assessments when a candidate reaches a stage, sync completion and results back into your pipeline, and download an OpenAPI specification to generate client SDKs or import into tools such as Postman.",
      },
    ],
  },

  "/news": {
    title: "News & Updates - Subscribe | HumanMetrix",
    description:
      "Stay up to date with HumanMetrix. Subscribe for product updates, new assessment releases, research insights and news on AI in recruitment.",
    h1: "News & Updates",
    intro:
      "Keep up with the latest from HumanMetrix - new assessment releases, product updates and research on AI literacy and recruitment.",
    sections: [
      {
        heading: "Subscribe",
        body: "Join our mailing list to receive product announcements, roadmap updates and insights on the future of AI-powered assessment.",
      },
    ],
  },

  "/login": {
    title: "Log In | HumanMetrix",
    description:
      "Log in to your HumanMetrix account to access your assessments, results and dashboard.",
    h1: "Log In to HumanMetrix",
    intro:
      "Access your HumanMetrix account to take assessments, view your results and manage your dashboard.",
    sections: [
      {
        heading: "Account access",
        body: "Candidates and partners can sign in to view results, manage assessments and access dashboards. New here? Create an account to get started.",
      },
    ],
  },

  "/articles/how-to-pass-psychometric-tests-job-interviews": {
    title: "How to Pass Psychometric Tests in Job Interviews | HumanMetrix",
    description:
      "A practical guide to psychometric tests in job interviews - what they measure, the main test types and how to prepare and perform at your best.",
    h1: "How to Pass Psychometric Tests in Job Interviews",
    intro:
      "Psychometric tests are now a standard part of many hiring processes. This guide explains what they measure and how to approach them with confidence.",
    sections: [
      {
        heading: "What psychometric tests measure",
        body: "Psychometric assessments evaluate behavioural traits, aptitude and - increasingly - AI literacy. Understanding what each test is looking for helps you prepare effectively and present an authentic picture of your strengths.",
      },
      {
        heading: "How to prepare",
        body: "Practise sample questions, read instructions carefully, manage your time and answer honestly. For modern AI-readiness assessments, demonstrate how you think and work alongside AI tools rather than memorising answers.",
      },
    ],
  },

  "/articles/role-of-psychometric-testing-in-recruitment": {
    title: "The Role of Psychometric Testing in Modern Recruitment | HumanMetrix",
    description:
      "How psychometric testing improves modern recruitment - reducing bias, predicting performance and supporting fairer, faster hiring decisions.",
    h1: "The Role of Psychometric Testing in Modern Recruitment",
    intro:
      "Psychometric testing has become central to evidence-based hiring. This article explores how it improves recruitment outcomes.",
    sections: [
      {
        heading: "Why it matters",
        body: "Well-designed psychometric assessments reduce unconscious bias, add objective data to hiring decisions and help predict on-the-job performance and cultural fit - making recruitment fairer and more reliable.",
      },
    ],
  },

  "/articles/humanmetrix-ai-assessment-suite": {
    title: "The HumanMetrix AI Assessment Suite Explained | HumanMetrix",
    description:
      "An overview of the HumanMetrix assessment suite - FIT, AI Readiness, Prompt Architecture and AIQ - and what each one measures.",
    h1: "The HumanMetrix AI Assessment Suite Explained",
    intro:
      "HumanMetrix offers four complementary assessments. This article explains what each measures and when to use it.",
    sections: [
      {
        heading: "The four assessments",
        body: "FIT measures behavioural competencies; AI Readiness measures practical AI fluency; Prompt Architecture measures advanced prompting and structured reasoning; and AIQ measures ethical, responsible AI use. Together they give a complete picture of how someone works in an AI-driven world.",
      },
    ],
  },

  "/articles/future-of-ai-assessments-2026-roadmap": {
    title: "The Future of AI Assessments: Our 2026 Roadmap | HumanMetrix",
    description:
      "Where AI assessment is heading and what HumanMetrix is building next - our 2026 roadmap for AI-powered talent measurement.",
    h1: "The Future of AI Assessments: Our 2026 Roadmap",
    intro:
      "AI is reshaping how we measure talent. This article shares our view of the future and the HumanMetrix 2026 roadmap.",
    sections: [
      {
        heading: "What's ahead",
        body: "We explore emerging assessment types, deeper team diagnostics and tighter integration with hiring workflows as AI literacy becomes a core workplace requirement.",
      },
    ],
  },

  "/articles/why-ai-literacy-matters-recruitment": {
    title: "Why AI Literacy Matters in Recruitment | HumanMetrix",
    description:
      "Why AI literacy is now a critical hiring criterion and how to assess it - helping recruiters identify candidates ready for AI-augmented roles.",
    h1: "Why AI Literacy Matters in Recruitment",
    intro:
      "AI literacy is fast becoming as important as traditional skills. This article explains why it belongs in your hiring criteria.",
    sections: [
      {
        heading: "The new essential skill",
        body: "As AI tools become embedded in everyday work, the ability to use them effectively and responsibly is a key differentiator. Assessing AI literacy helps recruiters identify candidates who will thrive in AI-augmented roles.",
      },
    ],
  },

  "/articles/prompt-engineering-skills-workplace": {
    title: "Prompt Engineering Skills for the Workplace | HumanMetrix",
    description:
      "Why prompt engineering is a core workplace skill and how to develop and assess it for AI-augmented roles.",
    h1: "Prompt Engineering Skills for the Workplace",
    intro:
      "Prompt engineering is becoming a core professional skill. This article explains what it involves and how to build it.",
    sections: [
      {
        heading: "A core AI skill",
        body: "Effective prompting - framing tasks, iterating and structuring reasoning - determines how much value people get from AI tools. We explore how to develop these skills and how HumanMetrix measures them through the Prompt Architecture assessment.",
      },
    ],
  },

  "/articles/white-paper-fit-test": {
    title: "White Paper: The FIT Assessment | HumanMetrix",
    description:
      "A white paper on the HumanMetrix FIT assessment - the science, construct validity and methodology behind our behavioural competency measure.",
    h1: "White Paper: The FIT Assessment",
    intro:
      "An in-depth look at the science behind the HumanMetrix FIT assessment and how it measures behavioural competencies for the modern workplace.",
    sections: [
      {
        heading: "Methodology",
        body: "The FIT white paper describes the constructs measured - including agency, curiosity, resilience, empathy and growth mindset - and the psychometric approach to reliability, validity and fair scoring with GPT-5 against a benchmarked golden set.",
      },
    ],
  },

  "/articles/white-paper-ai-readiness-test": {
    title: "White Paper: The AI Readiness Assessment | HumanMetrix",
    description:
      "A white paper on the HumanMetrix AI Readiness assessment - how we measure practical AI fluency from foundational prompting to complex reasoning.",
    h1: "White Paper: The AI Readiness Assessment",
    intro:
      "An in-depth look at how the HumanMetrix AI Readiness assessment measures practical AI fluency and why it matters for modern roles.",
    sections: [
      {
        heading: "Methodology",
        body: "The AI Readiness white paper explains the capability levels assessed - from foundational prompting to multi-step reasoning - and the scoring methodology used to evaluate how effectively a person works with AI tools.",
      },
    ],
  },

  "/ecosystem/sample-report": {
    title: "Sample Ecosystem Index Report | HumanMetrix",
    description:
      "See an example HumanMetrix Ecosystem Index report - team capability diagnostics, mission alignment, capability gaps and ideal-candidate profiles.",
    h1: "Sample Ecosystem Index Report",
    intro:
      "Preview the HumanMetrix Ecosystem Index - an AI-powered team capability diagnostic that analyses your team against your mission.",
    sections: [
      {
        heading: "What's inside",
        body: "The Ecosystem Index report aggregates team FIT scores, runs mission-alignment analysis, surfaces capability gaps and generates ideal-candidate profiles for your next hire.",
      },
    ],
  },

  "/sample-report/individual": {
    title: "Sample Individual Report | HumanMetrix",
    description:
      "See an example HumanMetrix individual assessment report - skill-level scores, personalised feedback and development recommendations.",
    h1: "Sample Individual Report",
    intro:
      "Preview what a HumanMetrix individual report looks like, including skill scores, narrative feedback and next-step recommendations.",
    sections: [
      {
        heading: "What's inside",
        body: "Each individual report includes scored competencies, personalised insight into strengths and development areas, and practical recommendations - the same format candidates receive after completing an assessment.",
      },
    ],
  },

  "/sample-report/comparison": {
    title: "Sample Comparison Report | HumanMetrix",
    description:
      "See an example HumanMetrix multi-candidate comparison report for shortlisting and side-by-side candidate evaluation.",
    h1: "Sample Comparison Report",
    intro:
      "Preview how HumanMetrix compares multiple candidates side by side to support objective shortlisting decisions.",
    sections: [
      {
        heading: "What's inside",
        body: "The comparison report ranks and contrasts candidates across the same competencies, making it easy to see relative strengths and identify the best fit for a role.",
      },
    ],
  },

  "/sample-report/role-fit": {
    title: "Sample Role-Fit Report | HumanMetrix",
    description:
      "See an example HumanMetrix role-fit report - how a candidate's profile maps against the requirements of a specific role.",
    h1: "Sample Role-Fit Report",
    intro:
      "Preview how HumanMetrix maps a candidate's assessment profile against the requirements of a specific role.",
    sections: [
      {
        heading: "What's inside",
        body: "The role-fit report scores how well a candidate matches a defined role profile, highlighting alignment, gaps and data-driven next steps for hiring decisions.",
      },
    ],
  },

  "/terms": {
    title: "Terms of Service | HumanMetrix",
    description:
      "The terms of service governing use of the HumanMetrix AI assessment platform.",
    h1: "Terms of Service",
    intro:
      "These terms govern your use of the HumanMetrix platform and assessments. Please read them carefully before using our services.",
    sections: [
      {
        heading: "Using HumanMetrix",
        body: "By accessing HumanMetrix you agree to our terms covering account use, assessment purchases, acceptable use, intellectual property and liability. Contact us if you have questions about these terms.",
      },
    ],
  },

  "/privacy": {
    title: "Privacy Policy | HumanMetrix",
    description:
      "How HumanMetrix collects, uses and protects your personal data, in line with UK GDPR and data-protection law.",
    h1: "Privacy Policy",
    intro:
      "Your privacy matters. This policy explains what data HumanMetrix collects, how we use it and the rights you have over your information.",
    sections: [
      {
        heading: "Data we handle",
        body: "We process account details, assessment responses and results to deliver our services, in line with UK GDPR. We never sell your data. You can request access, correction or deletion of your personal information at any time.",
      },
    ],
  },

  "/eula": {
    title: "End User Licence Agreement | HumanMetrix",
    description:
      "The end user licence agreement for the HumanMetrix assessment platform and its software.",
    h1: "End User Licence Agreement",
    intro:
      "This End User Licence Agreement sets out the terms under which you may use the HumanMetrix software and platform.",
    sections: [
      {
        heading: "Licence terms",
        body: "HumanMetrix grants you a limited, non-exclusive licence to use the platform for its intended assessment purposes, subject to the restrictions and obligations described in this agreement.",
      },
    ],
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(path: string, content: RouteContent): string {
  const canonical = `${SITE_URL}${path === "/" ? "/" : path}`;
  const ogImage = `${SITE_URL}/og-image.png`;
  const sectionsHtml = content.sections
    .map(
      (s) =>
        `<section><h2>${escapeHtml(s.heading)}</h2><p>${escapeHtml(s.body)}</p></section>`,
    )
    .join("\n      ");

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: HOME.description,
    sameAs: [
      "https://www.linkedin.com/company/humanmetrix",
    ],
  };

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: content.title,
    description: content.description,
    url: canonical,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(content.title)}</title>
  <meta name="description" content="${escapeHtml(content.description)}" />
  ${content.keywords ? `<meta name="keywords" content="${escapeHtml(content.keywords)}" />` : ""}
  <link rel="canonical" href="${canonical}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />

  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:title" content="${escapeHtml(content.title)}" />
  <meta property="og:description" content="${escapeHtml(content.description)}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:locale" content="en_GB" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(content.title)}" />
  <meta name="twitter:description" content="${escapeHtml(content.description)}" />
  <meta name="twitter:image" content="${ogImage}" />

  <script type="application/ld+json">${JSON.stringify(orgJsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(webPageJsonLd)}</script>
</head>
<body>
  <header>
    <nav aria-label="Primary">
      <a href="${SITE_URL}/">Home</a>
      <a href="${SITE_URL}/about">About</a>
      <a href="${SITE_URL}/team">Team</a>
      <a href="${SITE_URL}/assessments">Assessments</a>
      <a href="${SITE_URL}/for-candidates">For Candidates</a>
      <a href="${SITE_URL}/pricing">Pricing</a>
      <a href="${SITE_URL}/methodology">Methodology</a>
      <a href="${SITE_URL}/enterprise">Enterprise</a>
      <a href="${SITE_URL}/partnerships">Partnerships</a>
      <a href="${SITE_URL}/security">Trust Center</a>
      <a href="${SITE_URL}/ecosystem-index">Ecosystem Index</a>
      <a href="${SITE_URL}/articles">Articles</a>
    </nav>
  </header>
  <main>
    <article>
      <h1>${escapeHtml(content.h1)}</h1>
      <p>${escapeHtml(content.intro)}</p>
      ${sectionsHtml}
    </article>
  </main>
  <footer>
    <p>${SITE_NAME} - AI psychometric testing platform. Operated by PT Human Metrix Assessments.</p>
    <p>
      <a href="${SITE_URL}/terms">Terms</a> ·
      <a href="${SITE_URL}/privacy">Privacy</a>
    </p>
  </footer>
</body>
</html>`;
}

const SKIP_PREFIXES = [
  "/api/",
  "/assets/",
  "/static/",
  "/uploads/",
  "/objects/",
  "/public-objects/",
  "/embed/",
  "/@",
  "/src/",
  "/node_modules/",
  "/og-image",
  "/logo",
  "/favicon",
  "/robots.txt",
  "/sitemap",
  "/manifest",
];

export function registerSeoPrerender(app: Express): void {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    const ua = req.get("user-agent");
    if (!isBot(ua)) return next();

    const accept = req.get("accept") || "";
    if (accept && accept.indexOf("text/html") === -1 && accept !== "*/*") {
      return next();
    }

    const urlPath = req.path;
    if (SKIP_PREFIXES.some((p) => urlPath.startsWith(p))) return next();
    if (/\.[a-zA-Z0-9]{1,6}$/.test(urlPath)) return next();

    // Only prerender for explicitly allowlisted public marketing routes.
    // For anything else (auth, dashboard, partner, etc.) fall through so
    // bots see the real SPA shell instead of generic homepage content.
    const content = ROUTE_CONTENT[urlPath];
    if (!content) return next();

    const html = renderHtml(urlPath, content);

    res
      .status(200)
      .set({
        "Content-Type": "text/html; charset=utf-8",
        // Vary on User-Agent so shared caches/CDNs do not serve this
        // bot HTML to real browsers requesting the same URL.
        Vary: "User-Agent, Accept",
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "X-Prerendered": "humanmetrix-seo-prerender",
      })
      .end(html);
  });
}
