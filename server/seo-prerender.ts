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
