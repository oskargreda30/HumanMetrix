import pptxgen from "pptxgenjs";

// ── Brand palette ──────────────────────────────────────────────────────────
const BG      = "0F172A";
const CYAN    = "22D3EE";
const BLUE    = "60A5FA";
const INDIGO  = "818CF8";
const PURPLE  = "C084FC";
const WHITE   = "FFFFFF";
const GRAY    = "94A3B8"; // muted body text
const LIGHT   = "CBD5E1"; // secondary text
const RED     = "F87171";
const AMBER   = "FBBF24";
const LAVENDER = "A78BFA";

// Slide canvas (16:9 wide)
const W = 13.33;
const H = 7.5;

// ── Helpers ────────────────────────────────────────────────────────────────

function bg(slide: pptxgen.Slide, prs: pptxgen) {
  slide.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: BG },
    line: { type: "none" },
  });
}

function sectionLabel(slide: pptxgen.Slide, text: string, y = 0.55) {
  slide.addText(text.toUpperCase(), {
    x: 0.75, y, w: 11.8, h: 0.25,
    fontSize: 8.5,
    bold: true,
    color: CYAN,
    charSpacing: 3,
  });
}

function heading(
  slide: pptxgen.Slide,
  runs: { text: string; color?: string }[],
  y = 0.9,
  h = 1.4,
  fontSize = 34,
) {
  slide.addText(
    runs.map((r) => ({ text: r.text, options: { color: r.color ?? WHITE, bold: true } })),
    { x: 0.75, y, w: 11.8, h, fontSize, lineSpacingMultiple: 1.1, breakLine: true },
  );
}

function card(
  slide: pptxgen.Slide,
  prs: pptxgen,
  x: number,
  y: number,
  w: number,
  h: number,
  borderColor = "FFFFFF",
  fillColor = "FFFFFF",
  fillAlpha = 95,
) {
  slide.addShape(prs.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.12,
    fill: { color: fillColor, transparency: fillAlpha },
    line: { color: borderColor, width: 0.75, transparency: 60 },
  });
}

function bullet(slide: pptxgen.Slide, items: string[], x: number, y: number, w: number, color = GRAY, size = 10) {
  slide.addText(
    items.map((t) => ({ text: t, options: { bullet: { type: "bullet", characterCode: "25CF", color: CYAN, fontSize: 6 }, color, fontSize: size } })),
    { x, y, w, h: items.length * 0.32 + 0.1, lineSpacingMultiple: 1.35, paraSpaceAfter: 2 },
  );
}

function checkList(slide: pptxgen.Slide, items: { label: string; desc: string }[], x: number, y: number, w: number) {
  const rows: pptxgen.TableRow[] = items.map((item) => [
    {
      text: "✓",
      options: { color: CYAN, fontSize: 9, bold: true, align: "center", valign: "top" },
    },
    {
      text: [
        { text: item.label + "\n", options: { color: WHITE, bold: true, fontSize: 9.5 } },
        { text: item.desc, options: { color: GRAY, fontSize: 8.5 } },
      ],
      options: { valign: "top" },
    },
  ]);
  slide.addTable(rows, {
    x, y, w, colW: [0.35, w - 0.35],
    border: { type: "none" },
    fill: { type: "none" },
    rowH: 0.52,
  });
}

function progressBar(slide: pptxgen.Slide, prs: pptxgen, x: number, y: number, w: number, pct: number, color: string) {
  slide.addShape(prs.ShapeType.rect, {
    x, y, w, h: 0.14,
    fill: { color: "FFFFFF", transparency: 88 },
    line: { type: "none" },
  });
  if (pct > 0) {
    slide.addShape(prs.ShapeType.rect, {
      x, y, w: w * (pct / 100), h: 0.14,
      fill: { color },
      line: { type: "none" },
    });
  }
}

// ── Slide builders ─────────────────────────────────────────────────────────

function buildSlide1(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);

  // HM logo box
  slide.addShape(prs.ShapeType.roundRect, {
    x: 5.92, y: 1.1, w: 1.5, h: 1.5,
    rectRadius: 0.18,
    fill: { color: CYAN, transparency: 0 },
    line: { type: "none" },
  });
  slide.addText("HM", {
    x: 5.92, y: 1.3, w: 1.5, h: 1.1,
    fontSize: 36, bold: true, color: WHITE, align: "center", valign: "middle",
  });

  // Title
  slide.addText([
    { text: "Human", options: { color: WHITE } },
    { text: "Metrix", options: { color: CYAN } },
  ], {
    x: 2, y: 2.9, w: 9.33, h: 1.2, fontSize: 60, bold: true, align: "center",
  });

  // Tagline
  slide.addText("The Operating System for Human Performance", {
    x: 2, y: 4.15, w: 9.33, h: 0.55, fontSize: 20,
    color: LIGHT, align: "center", bold: false,
  });

  // Sub
  slide.addText("AI-powered assessment for the people behind the AI", {
    x: 2, y: 4.75, w: 9.33, h: 0.4, fontSize: 13,
    color: GRAY, align: "center",
  });

  // Website
  slide.addText("humanmetrix.com", {
    x: 2, y: 6.6, w: 9.33, h: 0.3, fontSize: 10,
    color: GRAY, align: "center",
  });
}

function buildSlide2(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);

  sectionLabel(slide, "The Problem");
  heading(slide, [
    { text: "Companies are hiring for an AI era\n" },
    { text: "with industrial-era tools.", color: GRAY },
  ], 0.85, 1.4, 30);

  const problems = [
    {
      stat: "82%",
      statLabel: "of bad hires pass traditional screening",
      title: "Hiring is broken",
      desc: "CVs and interviews can't measure AI literacy, behavioural resilience, or ethical judgment. Companies are hiring blind.",
      statColor: RED,
      borderColor: "F87171",
    },
    {
      stat: "77%",
      statLabel: "of employees say annual reviews are useless",
      title: "Performance is guesswork",
      desc: "Annual reviews are lagging indicators with no objective baseline. You can't improve what you can't measure.",
      statColor: AMBER,
      borderColor: "FBBF24",
    },
    {
      stat: "74%",
      statLabel: "of HR leaders can't assess AI readiness",
      title: "People data is fragmented",
      desc: "Health, psychology, and performance live in separate silos with no unified view. The whole person is invisible.",
      statColor: LAVENDER,
      borderColor: "A78BFA",
    },
  ];

  const cardW = 3.85;
  const cardX = [0.75, 4.74, 8.73];
  const cardY = 2.35;
  const cardH = 4.55;

  problems.forEach((p, i) => {
    card(slide, prs, cardX[i], cardY, cardW, cardH, p.borderColor, p.borderColor, 88);
    slide.addText(p.stat, {
      x: cardX[i] + 0.25, y: cardY + 0.3, w: cardW - 0.5, h: 0.8,
      fontSize: 44, bold: true, color: p.statColor,
    });
    slide.addText(p.statLabel, {
      x: cardX[i] + 0.25, y: cardY + 1.1, w: cardW - 0.5, h: 0.35,
      fontSize: 9, color: GRAY,
    });
    slide.addText(p.title, {
      x: cardX[i] + 0.25, y: cardY + 1.55, w: cardW - 0.5, h: 0.35,
      fontSize: 12, bold: true, color: WHITE,
    });
    slide.addText(p.desc, {
      x: cardX[i] + 0.25, y: cardY + 1.95, w: cardW - 0.5, h: 1.6,
      fontSize: 9.5, color: GRAY, lineSpacingMultiple: 1.35,
    });
  });
}

function buildSlide3(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);

  sectionLabel(slide, "The Vision");

  // Main headline (centred)
  slide.addText(
    "A complete psychological and physical performance\nprofile for every person in your business.",
    {
      x: 0.75, y: 0.85, w: 11.8, h: 1.5,
      fontSize: 27, bold: true, color: WHITE, align: "center", lineSpacingMultiple: 1.2,
    },
  );

  const stages = [
    {
      n: "01", label: "Hire Right", sub: "TODAY",
      desc: "Scientifically-grounded psychometric and AI literacy assessments at the point of hire.",
      color: CYAN,
    },
    {
      n: "02", label: "Develop Continuously", sub: "PHASE 2",
      desc: "Pulse check-ins, 360 feedback, and growth tracking mapped against each person's hiring baseline.",
      color: BLUE,
    },
    {
      n: "03", label: "Sustain Whole-Human Performance", sub: "PHASE 3+",
      desc: "Biometric and health data closes the loop — linking how a person thinks, behaves, and physically performs.",
      color: PURPLE,
    },
  ];

  const cW = 3.7;
  const cX = [0.75, 4.82, 8.88];
  const cY = 2.55;
  const cH = 3.65;

  stages.forEach((s, i) => {
    card(slide, prs, cX[i], cY, cW, cH, "FFFFFF", "FFFFFF", 95);
    // step badge
    slide.addShape(prs.ShapeType.roundRect, {
      x: cX[i] + 0.25, y: cY + 0.3, w: 0.55, h: 0.45,
      rectRadius: 0.08,
      fill: { color: s.color, transparency: 0 },
      line: { type: "none" },
    });
    slide.addText(s.n, {
      x: cX[i] + 0.25, y: cY + 0.3, w: 0.55, h: 0.45,
      fontSize: 11, bold: true, color: WHITE, align: "center", valign: "middle",
    });
    slide.addText(s.sub, {
      x: cX[i] + 0.25, y: cY + 0.9, w: cW - 0.5, h: 0.25,
      fontSize: 7.5, bold: true, color: s.color, charSpacing: 2,
    });
    slide.addText(s.label, {
      x: cX[i] + 0.25, y: cY + 1.2, w: cW - 0.5, h: 0.5,
      fontSize: 13, bold: true, color: WHITE, lineSpacingMultiple: 1.15,
    });
    slide.addText(s.desc, {
      x: cX[i] + 0.25, y: cY + 1.75, w: cW - 0.5, h: 1.6,
      fontSize: 9.5, color: GRAY, lineSpacingMultiple: 1.35,
    });
    // arrow between cards
    if (i < 2) {
      slide.addText("→", {
        x: cX[i] + cW + 0.08, y: cY + cH / 2 - 0.2, w: 0.35, h: 0.4,
        fontSize: 14, color: GRAY, align: "center",
      });
    }
  });

  // Quote box
  slide.addShape(prs.ShapeType.roundRect, {
    x: 1.5, y: 6.45, w: 10.33, h: 0.75,
    rectRadius: 0.1,
    fill: { color: CYAN, transparency: 92 },
    line: { color: CYAN, width: 0.75, transparency: 60 },
  });
  slide.addText(
    '"The first platform to objectively link how a person thinks, behaves, and physically performs — over their entire career."',
    {
      x: 1.6, y: 6.5, w: 10.13, h: 0.65,
      fontSize: 10, color: CYAN, align: "center", italic: true, valign: "middle",
    },
  );
}

function buildSlide4(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);

  sectionLabel(slide, "Platform Today");
  heading(slide, [{ text: "Live & working." }], 0.85, 0.9, 34);

  // Left col: assessment checklist
  const assessments = [
    { label: "FIT Assessment", desc: "Behavioural traits — resilience, agency, curiosity, empathy" },
    { label: "AI Readiness", desc: "Practical AI literacy and domain application scoring" },
    { label: "Prompt Architecture", desc: "How effectively a person engineers AI outputs" },
    { label: "AIQ — Algorithmic Integrity", desc: "Ethical reasoning and responsible AI judgment" },
    { label: "Ecosystem Index", desc: "Team diagnostic — aggregated FIT + contextual gap analysis" },
    { label: "Role Fit Analysis", desc: "AI-generated candidate-to-role alignment across 100+ roles" },
  ];

  slide.addText("ASSESSMENT TYPES", {
    x: 0.75, y: 1.95, w: 5.8, h: 0.25, fontSize: 7.5, bold: true, color: GRAY, charSpacing: 2,
  });
  checkList(slide, assessments, 0.75, 2.25, 5.9);

  // Right col: infra
  const infraY = 1.95;
  slide.addText("INFRASTRUCTURE", {
    x: 7.1, y: infraY, w: 5.9, h: 0.25, fontSize: 7.5, bold: true, color: GRAY, charSpacing: 2,
  });
  bullet(slide, [
    "B2B partner model — embeddable widget + REST API",
    "PDF report generation (server-side, Puppeteer)",
    "Multi-currency + PPP pricing (Stripe & Airwallex)",
    "SEA-localised content, 100+ predefined roles",
  ], 7.1, 2.3, 5.9);

  // Stats card
  card(slide, prs, 7.1, 3.75, 5.9, 2.85, "FFFFFF", "FFFFFF", 95);
  slide.addText("ALREADY DEPLOYED", {
    x: 7.35, y: 3.95, w: 5.4, h: 0.25, fontSize: 7.5, bold: true, color: GRAY, charSpacing: 2,
  });

  const stats = [
    { val: "4", label: "Live assessments" },
    { val: "100+", label: "Predefined roles" },
    { val: "3-tier", label: "B2B billing model" },
    { val: "SEA", label: "Launch market" },
  ];
  stats.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = 7.35 + col * 2.85;
    const sy = 4.35 + row * 1.1;
    slide.addText(s.val, { x: sx, y: sy, w: 2.6, h: 0.55, fontSize: 26, bold: true, color: CYAN });
    slide.addText(s.label, { x: sx, y: sy + 0.52, w: 2.6, h: 0.3, fontSize: 9, color: GRAY });
  });
}

function buildSlide5(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);

  sectionLabel(slide, "Business Model");
  heading(slide, [
    { text: "Three revenue streams.\n" },
    { text: "All compounding.", color: GRAY },
  ], 0.85, 1.3, 30);

  const streams = [
    {
      n: "01", label: "B2B SaaS", sub: "Primary revenue",
      color: CYAN, borderColor: CYAN,
      points: [
        "Credit-based subscriptions, 3 tiers",
        "White-label embeddable widget",
        "REST API + webhook notifications",
        "Team & enterprise pricing",
      ],
    },
    {
      n: "02", label: "B2C", sub: "Individual assessments",
      color: BLUE, borderColor: BLUE,
      points: [
        "Individuals purchase own reports",
        "Career development positioning",
        "PPP pricing for global access",
        "PDF report delivery",
      ],
    },
    {
      n: "03", label: "Team Diagnostics", sub: "Ecosystem Index",
      color: INDIGO, borderColor: INDIGO,
      points: [
        "Per-analysis credit consumption",
        "Mission + team FIT aggregation",
        "Ideal candidate profile generation",
        "Contextual gap analysis",
      ],
    },
  ];

  const cW = 3.85;
  const cX = [0.75, 4.74, 8.73];
  const cY = 2.3;
  const cH = 4.5;

  streams.forEach((s, i) => {
    card(slide, prs, cX[i], cY, cW, cH, s.borderColor, s.color, 90);
    slide.addText(s.n, {
      x: cX[i] + 0.25, y: cY + 0.25, w: 1, h: 0.3,
      fontSize: 9, bold: true, color: s.color, charSpacing: 1,
    });
    slide.addText(s.label, {
      x: cX[i] + 0.25, y: cY + 0.6, w: cW - 0.5, h: 0.5,
      fontSize: 18, bold: true, color: WHITE,
    });
    slide.addText(s.sub, {
      x: cX[i] + 0.25, y: cY + 1.1, w: cW - 0.5, h: 0.3,
      fontSize: 9, color: GRAY,
    });
    bullet(slide, s.points, cX[i] + 0.25, cY + 1.5, cW - 0.5, LIGHT, 9.5);
  });

  // Tag row
  const tags = ["Stripe", "Airwallex", "Xero", "PPP Pricing", "Multi-currency"];
  tags.forEach((tag, i) => {
    const tw = 1.6;
    const tx = 0.75 + i * (tw + 0.3);
    slide.addShape(prs.ShapeType.roundRect, {
      x: tx, y: 7.0, w: tw, h: 0.3,
      rectRadius: 0.15,
      fill: { color: "FFFFFF", transparency: 92 },
      line: { color: "FFFFFF", width: 0.5, transparency: 75 },
    });
    slide.addText(tag, {
      x: tx, y: 7.0, w: tw, h: 0.3,
      fontSize: 8, color: GRAY, align: "center", valign: "middle",
    });
  });
}

function buildSlide6(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);

  sectionLabel(slide, "Roadmap");
  heading(slide, [
    { text: "The full stack of " },
    { text: "human performance.", color: CYAN },
  ], 0.85, 0.9, 30);

  const phases = [
    {
      phase: "Foundation", when: "Live now", color: CYAN,
      items: [
        "Core 4 assessments (FIT, AI Readiness, Prompt Architecture, AIQ)",
        "B2B partner model, embeddable widget + API",
        "Ecosystem Index — team diagnostics",
        "SEA launch market",
      ],
    },
    {
      phase: "Continuous Performance", when: "6–18 months", color: BLUE,
      items: [
        "Pulse check-ins & 360 feedback loops",
        "Growth tracking vs. hiring baseline scores",
        "HRIS integrations (BambooHR, Workday, SAP)",
        "Manager dashboards + coaching prompts",
      ],
    },
    {
      phase: "Health Integration", when: "12–24 months", color: INDIGO,
      items: [
        "Wearable / biometric data ingestion",
        "Apple Health, Garmin, Whoop connectors",
        "Physical wellness score alongside psychological profile",
        "Early burnout detection & intervention triggers",
      ],
    },
    {
      phase: "Whole Human Profile", when: "24–36 months", color: PURPLE,
      items: [
        "Unified profile: hiring baseline + appraisal trajectory + health index",
        "Anonymised industry benchmarking database",
        "Enterprise white-label offering",
        "UK & US market expansion",
      ],
    },
  ];

  const cW = 2.95;
  const cX = [0.75, 3.84, 6.93, 10.02];
  const cY = 2.0;
  const cH = 5.2;

  phases.forEach((p, i) => {
    card(slide, prs, cX[i], cY, cW, cH, p.color, p.color, 92);

    // Badge
    slide.addShape(prs.ShapeType.roundRect, {
      x: cX[i] + 0.2, y: cY + 0.2, w: 1.4, h: 0.3,
      rectRadius: 0.15,
      fill: { color: "FFFFFF", transparency: 88 },
      line: { type: "none" },
    });
    slide.addText(p.when, {
      x: cX[i] + 0.2, y: cY + 0.2, w: 1.4, h: 0.3,
      fontSize: 8, bold: true, color: p.color, align: "center", valign: "middle",
    });

    slide.addText(p.phase, {
      x: cX[i] + 0.2, y: cY + 0.65, w: cW - 0.4, h: 0.55,
      fontSize: 12, bold: true, color: WHITE, lineSpacingMultiple: 1.15,
    });

    bullet(slide, p.items, cX[i] + 0.2, cY + 1.3, cW - 0.4, GRAY, 8.5);

    if (i < 3) {
      slide.addText("→", {
        x: cX[i] + cW + 0.03, y: cY + cH / 2 - 0.2, w: 0.3, h: 0.4,
        fontSize: 11, color: GRAY, align: "center",
      });
    }
  });
}

function buildSlide7(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);

  sectionLabel(slide, "Market Opportunity");
  heading(slide, [
    { text: "A massive market.\n" },
    { text: "With almost no credible AI-native player.", color: GRAY },
  ], 0.85, 1.2, 28);

  // TAM / SAM / SOM concentric description
  const circles = [
    {
      label: "TAM", val: "$28B", sub: "Global HR Tech & Talent Assessment",
      x: 3.5, y: 2.25, w: 6.33, h: 2.1,
      borderColor: "FFFFFF", fillColor: "FFFFFF", fillAlpha: 96, textColor: LIGHT,
    },
    {
      label: "SAM", val: "$3B", sub: "AI-readiness & psychometric assessment (14% CAGR)",
      x: 4.25, y: 2.65, w: 4.83, h: 1.6,
      borderColor: BLUE, fillColor: BLUE, fillAlpha: 90, textColor: BLUE,
    },
    {
      label: "SOM", val: "SEA+", sub: "Early mover, UK/US expansion Year 3",
      x: 5.25, y: 2.95, w: 2.83, h: 1.15,
      borderColor: CYAN, fillColor: CYAN, fillAlpha: 85, textColor: CYAN,
    },
  ];

  circles.forEach((c) => {
    slide.addShape(prs.ShapeType.ellipse, {
      x: c.x, y: c.y, w: c.w, h: c.h,
      fill: { color: c.fillColor, transparency: c.fillAlpha },
      line: { color: c.borderColor, width: 1, transparency: 50 },
    });
  });

  // Labels inside circles (from largest to smallest)
  slide.addText("TAM  ·  $28B\nGlobal HR Tech", {
    x: 3.55, y: 2.27, w: 6.2, h: 0.6, fontSize: 10, color: LIGHT, align: "center", valign: "top",
  });
  slide.addText("SAM  ·  $3B\nAI Assessment · 14% CAGR", {
    x: 4.3, y: 2.95, w: 4.7, h: 0.55, fontSize: 9, color: BLUE, align: "center", valign: "top",
  });
  slide.addText("SOM · SEA+\nYear 1–3", {
    x: 5.3, y: 3.25, w: 2.7, h: 0.5, fontSize: 8.5, color: CYAN, align: "center", valign: "middle",
  });

  // Stat cards row
  const stats = [
    { val: "$28B", label: "Total Addressable Market", sub: "Global HR tech & talent assessment", color: LIGHT },
    { val: "$3B", label: "Serviceable Addressable Market", sub: "AI-readiness & psychometric assessment, 14% CAGR", color: BLUE },
    { val: "SEA+", label: "Initial Target Market", sub: "SEA & ANZ early mover, UK/US expansion Year 3", color: CYAN },
  ];

  const sW = 3.85;
  const sX = [0.75, 4.74, 8.73];

  stats.forEach((s, i) => {
    card(slide, prs, sX[i], 5.0, sW, 2.2, "FFFFFF", "FFFFFF", 96);
    slide.addText(s.val, {
      x: sX[i] + 0.25, y: 5.15, w: sW - 0.5, h: 0.65, fontSize: 26, bold: true, color: s.color,
    });
    slide.addText(s.label, {
      x: sX[i] + 0.25, y: 5.8, w: sW - 0.5, h: 0.35, fontSize: 10, bold: true, color: WHITE,
    });
    slide.addText(s.sub, {
      x: sX[i] + 0.25, y: 6.15, w: sW - 0.5, h: 0.7, fontSize: 8.5, color: GRAY, lineSpacingMultiple: 1.3,
    });
  });
}

function buildSlide8(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);

  sectionLabel(slide, "Competitive Advantage");
  heading(slide, [{ text: "Why HumanMetrix wins." }], 0.85, 0.85, 32);

  const headers: pptxgen.TableRow = [
    { text: "Platform", options: { color: GRAY, bold: true, fontSize: 8.5, charSpacing: 1, align: "left" } },
    { text: "AI-Native", options: { color: GRAY, bold: true, fontSize: 8.5, charSpacing: 1, align: "center" } },
    { text: "Continuous", options: { color: GRAY, bold: true, fontSize: 8.5, charSpacing: 1, align: "center" } },
    { text: "Health Layer", options: { color: GRAY, bold: true, fontSize: 8.5, charSpacing: 1, align: "center" } },
    { text: "Accessible Pricing", options: { color: GRAY, bold: true, fontSize: 8.5, charSpacing: 1, align: "center" } },
    { text: "Note", options: { color: GRAY, bold: true, fontSize: 8.5, charSpacing: 1, align: "left" } },
  ];

  const rows = [
    { competitor: "SHL / Korn Ferry", cols: [false, false, false, false], note: "Slow, expensive, no AI layer", hi: false },
    { competitor: "HireVue",          cols: [false, false, false, false], note: "Video-only, no behavioural depth", hi: false },
    { competitor: "Culture Amp",      cols: [false, true,  false, true],  note: "Engagement only, no hiring or health", hi: false },
    { competitor: "Pymetrics",        cols: [true,  false, false, false], note: "Games-based, limited depth", hi: false },
    { competitor: "HumanMetrix",      cols: [true,  true,  true,  true],  note: "Full stack — only player with this vision", hi: true },
  ];

  const tableRows: pptxgen.TableRow[] = [
    headers,
    ...rows.map((r): pptxgen.TableRow => [
      {
        text: r.competitor,
        options: {
          color: r.hi ? CYAN : LIGHT,
          bold: r.hi,
          fontSize: 11,
          fill: r.hi ? { color: CYAN, transparency: 88 } : { type: "none" },
        },
      },
      ...r.cols.map((v): pptxgen.TableCell => ({
        text: v ? "✓" : "–",
        options: {
          color: v ? CYAN : GRAY,
          bold: v,
          fontSize: 13,
          align: "center",
          fill: r.hi ? { color: CYAN, transparency: 88 } : { type: "none" },
        },
      })),
      {
        text: r.note,
        options: {
          color: r.hi ? CYAN : GRAY,
          fontSize: 9,
          italic: !r.hi,
          fill: r.hi ? { color: CYAN, transparency: 88 } : { type: "none" },
        },
      },
    ]),
  ];

  slide.addTable(tableRows, {
    x: 0.75,
    y: 2.0,
    w: 11.83,
    colW: [2.4, 1.4, 1.4, 1.4, 1.9, 3.33],
    border: { color: "FFFFFF", transparency: 90, type: "solid", pt: 0.5 },
    fill: { type: "none" },
    rowH: 0.7,
  });
}

function buildSlide9(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);

  sectionLabel(slide, "Team");
  heading(slide, [
    { text: "Built by people who understand\n" },
    { text: "both AI and human behaviour.", color: GRAY },
  ], 0.85, 1.2, 28);

  const team = [
    { role: "Co-Founder & CEO", focus: "AI strategy, psychometrics, product vision" },
    { role: "Co-Founder & CTO", focus: "Platform architecture, ML systems, scalability" },
    { role: "Head of Science", focus: "Assessment design, validity research, normative data" },
    { role: "Head of Growth", focus: "B2B sales, partner acquisition, SEA market" },
  ];

  const tW = 2.8;
  const tX = [0.75, 3.75, 6.75, 9.75];

  team.forEach((t, i) => {
    // Avatar box
    slide.addShape(prs.ShapeType.roundRect, {
      x: tX[i] + 0.9, y: 2.45, w: 1.0, h: 1.0,
      rectRadius: 0.12,
      fill: { color: CYAN, transparency: 82 },
      line: { color: CYAN, width: 0.75, transparency: 65 },
    });
    slide.addText("?", {
      x: tX[i] + 0.9, y: 2.45, w: 1.0, h: 1.0,
      fontSize: 24, bold: true, color: GRAY, align: "center", valign: "middle",
    });
    slide.addText("[Your Name]", {
      x: tX[i], y: 3.6, w: tW, h: 0.3,
      fontSize: 9, bold: true, color: GRAY, align: "center", charSpacing: 1,
    });
    slide.addText(t.role, {
      x: tX[i], y: 3.92, w: tW, h: 0.35,
      fontSize: 10, bold: true, color: CYAN, align: "center",
    });
    slide.addText(t.focus, {
      x: tX[i], y: 4.28, w: tW, h: 0.65,
      fontSize: 8.5, color: GRAY, align: "center", lineSpacingMultiple: 1.3,
    });
  });

  // Domain expertise
  card(slide, prs, 0.75, 5.2, 5.75, 1.9, "FFFFFF", "FFFFFF", 96);
  slide.addText("DOMAIN EXPERTISE", {
    x: 1.0, y: 5.35, w: 5.25, h: 0.25,
    fontSize: 7.5, bold: true, color: GRAY, charSpacing: 2,
  });
  const tags = ["Psychometrics", "AI / LLMs", "HR Technology", "Behavioural Science", "SaaS Scaling", "SEA Markets"];
  tags.forEach((tag, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    slide.addShape(prs.ShapeType.roundRect, {
      x: 1.0 + col * 1.7, y: 5.7 + row * 0.52, w: 1.55, h: 0.35,
      rectRadius: 0.18,
      fill: { color: "FFFFFF", transparency: 90 },
      line: { color: "FFFFFF", width: 0.5, transparency: 78 },
    });
    slide.addText(tag, {
      x: 1.0 + col * 1.7, y: 5.7 + row * 0.52, w: 1.55, h: 0.35,
      fontSize: 8, color: LIGHT, align: "center", valign: "middle",
    });
  });

  // Advisors
  card(slide, prs, 6.8, 5.2, 5.78, 1.9, "FFFFFF", "FFFFFF", 96);
  slide.addText("ADVISORS", {
    x: 7.05, y: 5.35, w: 5.28, h: 0.25,
    fontSize: 7.5, bold: true, color: GRAY, charSpacing: 2,
  });
  [
    "[Advisor — Industry / Academia]",
    "[Advisor — Enterprise HR]",
    "[Advisor — AI Research]",
  ].forEach((a, i) => {
    slide.addText(a, {
      x: 7.05, y: 5.72 + i * 0.38, w: 5.28, h: 0.3,
      fontSize: 9.5, color: GRAY,
    });
  });
}

function buildSlide10(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);

  sectionLabel(slide, "The Ask");
  heading(slide, [
    { text: "Join us in building\n" },
    { text: "the future of work.", color: CYAN },
  ], 0.85, 1.2, 32);

  // Left col ──────────────────────────────────────────────────────────────

  // Raise box
  slide.addShape(prs.ShapeType.roundRect, {
    x: 0.75, y: 2.25, w: 5.7, h: 1.45,
    rectRadius: 0.12,
    fill: { color: CYAN, transparency: 88 },
    line: { color: CYAN, width: 1, transparency: 55 },
  });
  slide.addText("RAISING", {
    x: 0.75, y: 2.38, w: 5.7, h: 0.25,
    fontSize: 8, bold: true, color: GRAY, align: "center", charSpacing: 2,
  });
  slide.addText("[AMOUNT]", {
    x: 0.75, y: 2.62, w: 5.7, h: 0.75,
    fontSize: 38, bold: true, color: CYAN, align: "center",
  });
  slide.addText("Seed / Pre-Series A", {
    x: 0.75, y: 3.38, w: 5.7, h: 0.28,
    fontSize: 9.5, color: GRAY, align: "center",
  });

  // Use of funds
  card(slide, prs, 0.75, 3.9, 5.7, 2.85, "FFFFFF", "FFFFFF", 96);
  slide.addText("USE OF FUNDS", {
    x: 1.0, y: 4.05, w: 5.2, h: 0.25, fontSize: 7.5, bold: true, color: GRAY, charSpacing: 2,
  });

  const funds = [
    { label: "Product & Engineering", pct: 40, color: CYAN },
    { label: "Sales & Go-to-Market", pct: 40, color: BLUE },
    { label: "Team & Operations", pct: 20, color: INDIGO },
  ];

  funds.forEach((f, i) => {
    const fy = 4.45 + i * 0.77;
    slide.addText(f.label, { x: 1.0, y: fy, w: 4.0, h: 0.28, fontSize: 10, color: LIGHT });
    slide.addText(`${f.pct}%`, { x: 5.3, y: fy, w: 0.8, h: 0.28, fontSize: 10, bold: true, color: WHITE, align: "right" });
    progressBar(slide, prs, 1.0, fy + 0.3, 5.0, f.pct, f.color);
  });

  // Right col ─────────────────────────────────────────────────────────────

  // Milestones
  card(slide, prs, 7.13, 2.25, 5.7, 2.85, "FFFFFF", "FFFFFF", 96);
  slide.addText("THIS ROUND GETS US TO", {
    x: 7.38, y: 2.4, w: 5.2, h: 0.25, fontSize: 7.5, bold: true, color: GRAY, charSpacing: 2,
  });
  const milestones = [
    "X enterprise partners signed",
    "£Y ARR achieved",
    "Z assessments completed",
    "UK / ANZ market entered",
  ];
  bullet(slide, milestones, 7.38, 2.78, 5.2, LIGHT, 10);

  // Contact
  card(slide, prs, 7.13, 5.38, 5.7, 1.85, "FFFFFF", "FFFFFF", 96);
  slide.addText("GET IN TOUCH", {
    x: 7.38, y: 5.53, w: 5.2, h: 0.25, fontSize: 7.5, bold: true, color: GRAY, charSpacing: 2,
  });
  slide.addText("hello@humanmetrix.com", {
    x: 7.38, y: 5.85, w: 5.2, h: 0.4, fontSize: 15, bold: true, color: WHITE,
  });
  slide.addText("humanmetrix.com", {
    x: 7.38, y: 6.25, w: 5.2, h: 0.28, fontSize: 10, color: GRAY,
  });

  // Book a demo button
  slide.addShape(prs.ShapeType.roundRect, {
    x: 7.38, y: 6.6, w: 1.85, h: 0.42,
    rectRadius: 0.1,
    fill: { color: CYAN, transparency: 0 },
    line: { type: "none" },
  });
  slide.addText("Book a demo →", {
    x: 7.38, y: 6.6, w: 1.85, h: 0.42,
    fontSize: 9.5, bold: true, color: WHITE, align: "center", valign: "middle",
  });
}

// ── Public entry point ─────────────────────────────────────────────────────

export async function generateAndDownloadPitchPptx() {
  const prs = new pptxgen();

  prs.layout = "LAYOUT_WIDE"; // 13.33" × 7.5" (16:9)
  prs.author = "HumanMetrix";
  prs.company = "HumanMetrix";
  prs.subject = "Investor Pitch Deck";
  prs.title = "HumanMetrix — The Operating System for Human Performance";

  buildSlide1(prs);
  buildSlide2(prs);
  buildSlide3(prs);
  buildSlide4(prs);
  buildSlide5(prs);
  buildSlide6(prs);
  buildSlide7(prs);
  buildSlide8(prs);
  buildSlide9(prs);
  buildSlide10(prs);

  await prs.writeFile({ fileName: "HumanMetrix-Pitch-Deck.pptx" });
}
