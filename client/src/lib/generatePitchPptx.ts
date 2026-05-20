import pptxgen from "pptxgenjs";

// ── Brand palette ──────────────────────────────────────────────────────────
const BG      = "0F172A";
const CYAN    = "22D3EE";
const BLUE    = "60A5FA";
const INDIGO  = "818CF8";
const PURPLE  = "C084FC";
const WHITE   = "FFFFFF";
const GRAY    = "94A3B8";
const LIGHT   = "CBD5E1";
const RED     = "F87171";
const AMBER   = "FBBF24";
const LAVENDER = "A78BFA";

const W = 13.33;
const H = 7.5;

// ── Types ──────────────────────────────────────────────────────────────────
export interface TeamPhotos {
  oskar?: string;
  quin?: string;
  daena?: string;
  reynalyn?: string;
  mariana?: string;
}

// ── Image helper ───────────────────────────────────────────────────────────
async function urlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

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
    fontSize: 8.5, bold: true, color: CYAN, charSpacing: 3,
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
  x: number, y: number, w: number, h: number,
  borderColor = "FFFFFF", fillColor = "FFFFFF", fillAlpha = 95,
) {
  slide.addShape(prs.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.12,
    fill: { color: fillColor, transparency: fillAlpha },
    line: { color: borderColor, width: 0.75, transparency: 60 },
  });
}

function bullet(
  slide: pptxgen.Slide,
  items: string[],
  x: number, y: number, w: number,
  color = GRAY, size = 10,
) {
  slide.addText(
    items.map((t) => ({
      text: t,
      options: {
        bullet: { type: "bullet", characterCode: "25CF", color: CYAN, fontSize: 6 },
        color, fontSize: size,
      },
    })),
    { x, y, w, h: items.length * 0.32 + 0.1, lineSpacingMultiple: 1.35, paraSpaceAfter: 2 },
  );
}

function checkList(
  slide: pptxgen.Slide,
  items: { label: string; desc: string }[],
  x: number, y: number, w: number,
) {
  const rows: pptxgen.TableRow[] = items.map((item) => [
    { text: "✓", options: { color: CYAN, fontSize: 9, bold: true, align: "center", valign: "top" } },
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

function progressBar(
  slide: pptxgen.Slide, prs: pptxgen,
  x: number, y: number, w: number, pct: number, color: string,
) {
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
  slide.addText([
    { text: "Human", options: { color: WHITE } },
    { text: "Metrix", options: { color: CYAN } },
  ], { x: 2, y: 2.9, w: 9.33, h: 1.2, fontSize: 60, bold: true, align: "center" });
  slide.addText("The Operating System for Human Performance", {
    x: 2, y: 4.15, w: 9.33, h: 0.55, fontSize: 20, color: LIGHT, align: "center",
  });
  slide.addText("AI-powered assessment for the people behind the AI", {
    x: 2, y: 4.75, w: 9.33, h: 0.4, fontSize: 13, color: GRAY, align: "center",
  });
  slide.addText("humanmetrix.com", {
    x: 2, y: 6.6, w: 9.33, h: 0.3, fontSize: 10, color: GRAY, align: "center",
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
    { stat: "82%", statLabel: "of bad hires pass traditional screening", title: "Hiring is broken", desc: "CVs and interviews can't measure AI literacy, behavioural resilience, or ethical judgment. Companies are hiring blind.", statColor: RED, borderColor: "F87171" },
    { stat: "77%", statLabel: "of employees say annual reviews are useless", title: "Performance is guesswork", desc: "Annual reviews are lagging indicators with no objective baseline. You can't improve what you can't measure.", statColor: AMBER, borderColor: "FBBF24" },
    { stat: "74%", statLabel: "of HR leaders can't assess AI readiness", title: "People data is fragmented", desc: "Health, psychology, and performance live in separate silos with no unified view. The whole person is invisible.", statColor: LAVENDER, borderColor: "A78BFA" },
  ];

  const cX = [0.75, 4.74, 8.73];
  problems.forEach((p, i) => {
    card(slide, prs, cX[i], 2.35, 3.85, 4.55, p.borderColor, p.borderColor, 88);
    slide.addText(p.stat, { x: cX[i] + 0.25, y: 2.65, w: 3.35, h: 0.8, fontSize: 44, bold: true, color: p.statColor });
    slide.addText(p.statLabel, { x: cX[i] + 0.25, y: 3.45, w: 3.35, h: 0.35, fontSize: 9, color: GRAY });
    slide.addText(p.title, { x: cX[i] + 0.25, y: 3.9, w: 3.35, h: 0.35, fontSize: 12, bold: true, color: WHITE });
    slide.addText(p.desc, { x: cX[i] + 0.25, y: 4.3, w: 3.35, h: 1.6, fontSize: 9.5, color: GRAY, lineSpacingMultiple: 1.35 });
  });
}

function buildSlide3(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);
  sectionLabel(slide, "The Vision");
  slide.addText(
    "A complete psychological and physical performance\nprofile for every person in your business.",
    { x: 0.75, y: 0.85, w: 11.8, h: 1.5, fontSize: 27, bold: true, color: WHITE, align: "center", lineSpacingMultiple: 1.2 },
  );

  const stages = [
    { n: "01", label: "Hire Right", sub: "TODAY", desc: "Scientifically-grounded psychometric and AI literacy assessments at the point of hire.", color: CYAN },
    { n: "02", label: "Develop Continuously", sub: "PHASE 2", desc: "Pulse check-ins, 360 feedback, and growth tracking mapped against each person's hiring baseline.", color: BLUE },
    { n: "03", label: "Sustain Whole-Human Performance", sub: "PHASE 3+", desc: "Biometric and health data closes the loop — linking how a person thinks, behaves, and physically performs.", color: PURPLE },
  ];

  const cX = [0.75, 4.82, 8.88];
  stages.forEach((s, i) => {
    card(slide, prs, cX[i], 2.55, 3.7, 3.65, "FFFFFF", "FFFFFF", 95);
    slide.addShape(prs.ShapeType.roundRect, { x: cX[i] + 0.25, y: 2.85, w: 0.55, h: 0.45, rectRadius: 0.08, fill: { color: s.color }, line: { type: "none" } });
    slide.addText(s.n, { x: cX[i] + 0.25, y: 2.85, w: 0.55, h: 0.45, fontSize: 11, bold: true, color: WHITE, align: "center", valign: "middle" });
    slide.addText(s.sub, { x: cX[i] + 0.25, y: 3.45, w: 3.2, h: 0.25, fontSize: 7.5, bold: true, color: s.color, charSpacing: 2 });
    slide.addText(s.label, { x: cX[i] + 0.25, y: 3.75, w: 3.2, h: 0.5, fontSize: 13, bold: true, color: WHITE, lineSpacingMultiple: 1.15 });
    slide.addText(s.desc, { x: cX[i] + 0.25, y: 4.3, w: 3.2, h: 1.6, fontSize: 9.5, color: GRAY, lineSpacingMultiple: 1.35 });
    if (i < 2) slide.addText("→", { x: cX[i] + 3.7 + 0.08, y: 2.55 + 1.7, w: 0.3, h: 0.4, fontSize: 14, color: GRAY, align: "center" });
  });

  slide.addShape(prs.ShapeType.roundRect, { x: 1.5, y: 6.45, w: 10.33, h: 0.75, rectRadius: 0.1, fill: { color: CYAN, transparency: 92 }, line: { color: CYAN, width: 0.75, transparency: 60 } });
  slide.addText('"The first platform to objectively link how a person thinks, behaves, and physically performs — over their entire career."',
    { x: 1.6, y: 6.5, w: 10.13, h: 0.65, fontSize: 10, color: CYAN, align: "center", italic: true, valign: "middle" });
}

function buildSlide4(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);
  sectionLabel(slide, "Platform Today");
  heading(slide, [{ text: "Live & working." }], 0.85, 0.9, 34);

  const assessments = [
    { label: "FIT Assessment", desc: "Behavioural traits — resilience, agency, curiosity, empathy" },
    { label: "AI Readiness", desc: "Practical AI literacy and domain application scoring" },
    { label: "Prompt Architecture", desc: "How effectively a person engineers AI outputs" },
    { label: "AIQ — Algorithmic Integrity", desc: "Ethical reasoning and responsible AI judgment" },
    { label: "Ecosystem Index", desc: "Team diagnostic — aggregated FIT + contextual gap analysis" },
    { label: "Role Fit Analysis", desc: "AI-generated candidate-to-role alignment across 100+ roles" },
  ];

  slide.addText("ASSESSMENT TYPES", { x: 0.75, y: 1.95, w: 5.8, h: 0.25, fontSize: 7.5, bold: true, color: GRAY, charSpacing: 2 });
  checkList(slide, assessments, 0.75, 2.25, 5.9);

  slide.addText("INFRASTRUCTURE", { x: 7.1, y: 1.95, w: 5.9, h: 0.25, fontSize: 7.5, bold: true, color: GRAY, charSpacing: 2 });
  bullet(slide, [
    "B2B partner model — embeddable widget + REST API",
    "PDF report generation (server-side, Puppeteer)",
    "Multi-currency + PPP pricing (Stripe & Airwallex)",
    "UK/South Africa localised content, 100+ predefined roles",
  ], 7.1, 2.3, 5.9);

  card(slide, prs, 7.1, 3.75, 5.9, 2.85, "FFFFFF", "FFFFFF", 95);
  slide.addText("ALREADY DEPLOYED", { x: 7.35, y: 3.95, w: 5.4, h: 0.25, fontSize: 7.5, bold: true, color: GRAY, charSpacing: 2 });
  [
    { val: "4", label: "Live assessments" },
    { val: "100+", label: "Predefined roles" },
    { val: "3-tier", label: "B2B billing model" },
    { val: "UK/SA", label: "Launch markets" },
  ].forEach((s, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const sx = 7.35 + col * 2.85, sy = 4.35 + row * 1.1;
    slide.addText(s.val, { x: sx, y: sy, w: 2.6, h: 0.55, fontSize: 26, bold: true, color: CYAN });
    slide.addText(s.label, { x: sx, y: sy + 0.52, w: 2.6, h: 0.3, fontSize: 9, color: GRAY });
  });
}

function buildSlide5(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);
  sectionLabel(slide, "Business Model");
  heading(slide, [{ text: "Three revenue streams.\n" }, { text: "All compounding.", color: GRAY }], 0.85, 1.3, 30);

  const streams = [
    { n: "01", label: "B2B SaaS", sub: "Primary revenue", color: CYAN, borderColor: CYAN, points: ["Credit-based subscriptions, 3 tiers", "White-label embeddable widget", "REST API + webhook notifications", "Team & enterprise pricing"] },
    { n: "02", label: "B2C", sub: "Individual assessments", color: BLUE, borderColor: BLUE, points: ["Individuals purchase own reports", "Career development positioning", "PPP pricing for global access", "PDF report delivery"] },
    { n: "03", label: "Team Diagnostics", sub: "Ecosystem Index", color: INDIGO, borderColor: INDIGO, points: ["Per-analysis credit consumption", "Mission + team FIT aggregation", "Ideal candidate profile generation", "Contextual gap analysis"] },
  ];

  const cX = [0.75, 4.74, 8.73];
  streams.forEach((s, i) => {
    card(slide, prs, cX[i], 2.3, 3.85, 4.5, s.borderColor, s.color, 90);
    slide.addText(s.n, { x: cX[i] + 0.25, y: 2.55, w: 1, h: 0.3, fontSize: 9, bold: true, color: s.color, charSpacing: 1 });
    slide.addText(s.label, { x: cX[i] + 0.25, y: 2.85, w: 3.35, h: 0.5, fontSize: 18, bold: true, color: WHITE });
    slide.addText(s.sub, { x: cX[i] + 0.25, y: 3.35, w: 3.35, h: 0.3, fontSize: 9, color: GRAY });
    bullet(slide, s.points, cX[i] + 0.25, 3.75, 3.35, LIGHT, 9.5);
  });

  const tags = ["Stripe", "Airwallex", "Xero", "PPP Pricing", "Multi-currency"];
  tags.forEach((tag, i) => {
    const tx = 0.75 + i * 1.9;
    slide.addShape(prs.ShapeType.roundRect, { x: tx, y: 7.0, w: 1.75, h: 0.3, rectRadius: 0.15, fill: { color: "FFFFFF", transparency: 92 }, line: { color: "FFFFFF", width: 0.5, transparency: 75 } });
    slide.addText(tag, { x: tx, y: 7.0, w: 1.75, h: 0.3, fontSize: 8, color: GRAY, align: "center", valign: "middle" });
  });
}

function buildSlide6(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);
  sectionLabel(slide, "Roadmap");
  heading(slide, [{ text: "The full stack of " }, { text: "human performance.", color: CYAN }], 0.85, 0.9, 30);

  const phases = [
    { phase: "Foundation", when: "Live now", color: CYAN, items: ["Core 4 assessments (FIT, AI Readiness, Prompt Architecture, AIQ)", "B2B partner model, embeddable widget + API", "Ecosystem Index — team diagnostics", "UK & South Africa launch markets"] },
    { phase: "Continuous Performance", when: "6–18 months", color: BLUE, items: ["Pulse check-ins & 360 feedback loops", "Growth tracking vs. hiring baseline scores", "HRIS integrations (BambooHR, Workday, SAP)", "Manager dashboards + coaching prompts"] },
    { phase: "Health Integration", when: "12–24 months", color: INDIGO, items: ["Wearable / biometric data ingestion", "Apple Health, Garmin, Whoop connectors", "Physical wellness score alongside psychological profile", "Early burnout detection & intervention triggers"] },
    { phase: "Whole Human Profile", when: "24–36 months", color: PURPLE, items: ["Unified profile: hiring baseline + appraisal trajectory + health index", "Anonymised industry benchmarking database", "Enterprise white-label offering", "Aus & US market expansion"] },
  ];

  const cX = [0.75, 3.84, 6.93, 10.02];
  phases.forEach((p, i) => {
    card(slide, prs, cX[i], 2.0, 2.95, 5.2, p.color, p.color, 92);
    slide.addShape(prs.ShapeType.roundRect, { x: cX[i] + 0.2, y: 2.2, w: 1.4, h: 0.3, rectRadius: 0.15, fill: { color: "FFFFFF", transparency: 88 }, line: { type: "none" } });
    slide.addText(p.when, { x: cX[i] + 0.2, y: 2.2, w: 1.4, h: 0.3, fontSize: 8, bold: true, color: p.color, align: "center", valign: "middle" });
    slide.addText(p.phase, { x: cX[i] + 0.2, y: 2.65, w: 2.55, h: 0.55, fontSize: 12, bold: true, color: WHITE, lineSpacingMultiple: 1.15 });
    bullet(slide, p.items, cX[i] + 0.2, 3.3, 2.55, GRAY, 8.5);
    if (i < 3) slide.addText("→", { x: cX[i] + 2.95 + 0.03, y: 2.0 + 2.5, w: 0.3, h: 0.4, fontSize: 11, color: GRAY, align: "center" });
  });
}

function buildSlide7(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);
  sectionLabel(slide, "Market Opportunity");
  heading(slide, [{ text: "A massive market.\n" }, { text: "With almost no credible AI-native player.", color: GRAY }], 0.85, 1.2, 28);

  // Concentric circle visual (left)
  const cx = 2.8, cy = 3.5;
  // TAM outer
  slide.addShape(prs.ShapeType.ellipse, { x: cx - 1.5, y: cy - 1.5, w: 3.0, h: 3.0, fill: { color: WHITE, transparency: 96 }, line: { color: WHITE, width: 1.2, transparency: 75 } });
  // SAM middle
  slide.addShape(prs.ShapeType.ellipse, { x: cx - 1.05, y: cy - 1.05, w: 2.1, h: 2.1, fill: { color: BLUE, transparency: 90 }, line: { color: BLUE, width: 1.2, transparency: 55 } });
  // SOM inner
  slide.addShape(prs.ShapeType.ellipse, { x: cx - 0.55, y: cy - 0.55, w: 1.1, h: 1.1, fill: { color: CYAN, transparency: 80 }, line: { color: CYAN, width: 1.5, transparency: 45 } });

  // Label stack (right side)
  const labels = [
    { ring: "TAM", val: "£28B", label: "Total Addressable Market", sub: "Global HR tech & talent assessment", dot: WHITE, valColor: LIGHT },
    { ring: "SAM", val: "£3B", label: "Serviceable Addressable Market", sub: "AI-readiness & psychometric assessment · 14% CAGR", dot: BLUE, valColor: BLUE },
    { ring: "SOM", val: "UK / South Africa", label: "Initial Target Market", sub: "UK & South Africa Year 1–2 · Aus/US expansion Year 3", dot: CYAN, valColor: CYAN },
  ];
  labels.forEach((m, i) => {
    const ly = 2.35 + i * 1.1;
    slide.addShape(prs.ShapeType.ellipse, { x: 5.8, y: ly + 0.12, w: 0.18, h: 0.18, fill: { color: m.dot }, line: { type: "none" } });
    slide.addText(m.val, { x: 6.1, y: ly, w: 5, h: 0.45, fontSize: 24, bold: true, color: m.valColor });
    slide.addText(`${m.ring}  ·  ${m.label}`, { x: 6.1, y: ly + 0.43, w: 6.8, h: 0.28, fontSize: 10, bold: true, color: WHITE });
    slide.addText(m.sub, { x: 6.1, y: ly + 0.7, w: 6.8, h: 0.28, fontSize: 9, color: GRAY });
  });

  // Stat cards
  const sX = [0.75, 4.74, 8.73];
  [
    { val: "£28B", label: "Total Addressable Market", sub: "Global HR tech & talent assessment", color: LIGHT },
    { val: "£3B", label: "Serviceable Addressable Market", sub: "AI-readiness & psychometric assessment, 14% CAGR", color: BLUE },
    { val: "UK/SA", label: "Initial Target Market", sub: "UK & South Africa early mover, Aus/US expansion Year 3", color: CYAN },
  ].forEach((s, i) => {
    card(slide, prs, sX[i], 5.0, 3.85, 2.2, "FFFFFF", "FFFFFF", 96);
    slide.addText(s.val, { x: sX[i] + 0.25, y: 5.15, w: 3.35, h: 0.65, fontSize: 26, bold: true, color: s.color });
    slide.addText(s.label, { x: sX[i] + 0.25, y: 5.8, w: 3.35, h: 0.35, fontSize: 10, bold: true, color: WHITE });
    slide.addText(s.sub, { x: sX[i] + 0.25, y: 6.15, w: 3.35, h: 0.7, fontSize: 8.5, color: GRAY, lineSpacingMultiple: 1.3 });
  });
}

function buildSlide8(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);
  sectionLabel(slide, "Competitive Advantage");
  heading(slide, [{ text: "Why HumanMetrix wins." }], 0.85, 0.85, 32);

  const headers: pptxgen.TableRow = [
    { text: "Platform",           options: { color: GRAY, bold: true, fontSize: 8.5, charSpacing: 1, align: "left" } },
    { text: "AI-Native",          options: { color: GRAY, bold: true, fontSize: 8.5, charSpacing: 1, align: "center" } },
    { text: "Continuous",         options: { color: GRAY, bold: true, fontSize: 8.5, charSpacing: 1, align: "center" } },
    { text: "Health Layer",       options: { color: GRAY, bold: true, fontSize: 8.5, charSpacing: 1, align: "center" } },
    { text: "Accessible Pricing", options: { color: GRAY, bold: true, fontSize: 8.5, charSpacing: 1, align: "center" } },
    { text: "Note",               options: { color: GRAY, bold: true, fontSize: 8.5, charSpacing: 1, align: "left" } },
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
      { text: r.competitor, options: { color: r.hi ? CYAN : LIGHT, bold: r.hi, fontSize: 11, fill: r.hi ? { color: CYAN, transparency: 88 } : { type: "none" } } },
      ...r.cols.map((v): pptxgen.TableCell => ({
        text: v ? "✓" : "–",
        options: { color: v ? CYAN : GRAY, bold: v, fontSize: 13, align: "center", fill: r.hi ? { color: CYAN, transparency: 88 } : { type: "none" } },
      })),
      { text: r.note, options: { color: r.hi ? CYAN : GRAY, fontSize: 9, italic: !r.hi, fill: r.hi ? { color: CYAN, transparency: 88 } : { type: "none" } } },
    ]),
  ];

  slide.addTable(tableRows, {
    x: 0.75, y: 2.0, w: 11.83,
    colW: [2.4, 1.4, 1.4, 1.4, 1.9, 3.33],
    border: { color: "FFFFFF", transparency: 90, type: "solid", pt: 0.5 },
    fill: { type: "none" },
    rowH: 0.7,
  });
}

async function buildSlide9(prs: pptxgen, photos: TeamPhotos) {
  const slide = prs.addSlide();
  bg(slide, prs);
  sectionLabel(slide, "Team");
  heading(slide, [{ text: "Built by people who understand\n" }, { text: "both AI and human behaviour.", color: GRAY }], 0.85, 1.2, 28);

  const team = [
    { name: "Oskar Greda",       role: "Founder & CEO",                   focus: "HR strategy, organisational growth, psychometrics",      photo: photos.oskar },
    { name: "Quin van Kerken",   role: "Co-Founder & Head of BD",         focus: "Enterprise sales, business scaling, UK/SA markets",      photo: photos.quin },
    { name: "Daena McClintock",  role: "Co-Founder & Head of Technology", focus: "Full-stack, AI/ML, blockchain, financial systems",       photo: photos.daena },
    { name: "Reynalyn Rodriguez",role: "Content & Socials Manager",       focus: "Brand communications, content strategy, social media",   photo: photos.reynalyn },
  ];

  const tW = 2.8, tX = [0.75, 3.75, 6.75, 9.75];

  for (let i = 0; i < team.length; i++) {
    const t = team[i];
    const x = tX[i];

    if (t.photo) {
      const b64 = await urlToBase64(t.photo);
      if (b64) {
        slide.addImage({ data: b64, x: x + 0.9, y: 2.45, w: 1.0, h: 1.0, rounding: true, sizing: { type: "cover", w: 1.0, h: 1.0 } });
      } else {
        slide.addShape(prs.ShapeType.ellipse, { x: x + 0.9, y: 2.45, w: 1.0, h: 1.0, fill: { color: CYAN, transparency: 80 }, line: { type: "none" } });
      }
    }

    slide.addText(t.name, { x, y: 3.6, w: tW, h: 0.3, fontSize: 10, bold: true, color: WHITE, align: "center" });
    slide.addText(t.role, { x, y: 3.92, w: tW, h: 0.35, fontSize: 9.5, bold: true, color: CYAN, align: "center" });
    slide.addText(t.focus, { x, y: 4.28, w: tW, h: 0.65, fontSize: 8.5, color: GRAY, align: "center", lineSpacingMultiple: 1.3 });
  }

  // Advisor card
  card(slide, prs, 0.75, 5.2, 6.0, 1.9, "FFFFFF", "FFFFFF", 96);
  slide.addText("PSYCHOMETRICS ADVISOR", { x: 1.0, y: 5.35, w: 5.5, h: 0.25, fontSize: 7.5, bold: true, color: GRAY, charSpacing: 2 });

  if (photos.mariana) {
    const mb64 = await urlToBase64(photos.mariana);
    if (mb64) {
      slide.addImage({ data: mb64, x: 1.0, y: 5.68, w: 0.85, h: 0.85, rounding: true, sizing: { type: "cover", w: 0.85, h: 0.85 } });
    }
  }
  slide.addText("Dr Mariana Costa e Silva-Pickett", { x: 2.0, y: 5.72, w: 4.5, h: 0.35, fontSize: 11, bold: true, color: WHITE });
  slide.addText("Assessment design, construct validation & behavioural science · City, St George's, University of London", { x: 2.0, y: 6.08, w: 4.5, h: 0.55, fontSize: 8.5, color: GRAY, lineSpacingMultiple: 1.3 });

  // Domain expertise card
  card(slide, prs, 7.08, 5.2, 5.5, 1.9, "FFFFFF", "FFFFFF", 96);
  slide.addText("DOMAIN EXPERTISE", { x: 7.33, y: 5.35, w: 5.0, h: 0.25, fontSize: 7.5, bold: true, color: GRAY, charSpacing: 2 });
  const tags = ["Psychometrics", "AI / LLMs", "HR Technology", "Behavioural Science", "SaaS Scaling", "UK & SA Markets"];
  tags.forEach((tag, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    slide.addShape(prs.ShapeType.roundRect, { x: 7.33 + col * 1.6, y: 5.7 + row * 0.52, w: 1.5, h: 0.35, rectRadius: 0.18, fill: { color: "FFFFFF", transparency: 90 }, line: { color: "FFFFFF", width: 0.5, transparency: 78 } });
    slide.addText(tag, { x: 7.33 + col * 1.6, y: 5.7 + row * 0.52, w: 1.5, h: 0.35, fontSize: 8, color: LIGHT, align: "center", valign: "middle" });
  });
}

function buildSlide10(prs: pptxgen) {
  const slide = prs.addSlide();
  bg(slide, prs);
  sectionLabel(slide, "The Ask");
  heading(slide, [{ text: "Join us in building\n" }, { text: "the future of work.", color: CYAN }], 0.85, 1.2, 32);

  // Raise box
  slide.addShape(prs.ShapeType.roundRect, { x: 0.75, y: 2.25, w: 5.7, h: 1.45, rectRadius: 0.12, fill: { color: CYAN, transparency: 88 }, line: { color: CYAN, width: 1, transparency: 55 } });
  slide.addText("RAISING", { x: 0.75, y: 2.38, w: 5.7, h: 0.25, fontSize: 8, bold: true, color: GRAY, align: "center", charSpacing: 2 });
  slide.addText("£450K", { x: 0.75, y: 2.62, w: 5.7, h: 0.75, fontSize: 42, bold: true, color: CYAN, align: "center" });
  slide.addText("Seed Round", { x: 0.75, y: 3.38, w: 5.7, h: 0.28, fontSize: 9.5, color: GRAY, align: "center" });

  // Use of funds (2 items)
  card(slide, prs, 0.75, 3.9, 5.7, 2.85, "FFFFFF", "FFFFFF", 96);
  slide.addText("USE OF FUNDS", { x: 1.0, y: 4.05, w: 5.2, h: 0.25, fontSize: 7.5, bold: true, color: GRAY, charSpacing: 2 });
  const funds = [
    { label: "Sales & Go-to-Market", pct: 65, color: CYAN },
    { label: "Team & Operations", pct: 35, color: INDIGO },
  ];
  funds.forEach((f, i) => {
    const fy = 4.5 + i * 1.0;
    slide.addText(f.label, { x: 1.0, y: fy, w: 4.0, h: 0.28, fontSize: 10, color: LIGHT });
    slide.addText(`${f.pct}%`, { x: 5.3, y: fy, w: 0.8, h: 0.28, fontSize: 10, bold: true, color: WHITE, align: "right" });
    progressBar(slide, prs, 1.0, fy + 0.3, 5.0, f.pct, f.color);
  });

  // Milestones
  card(slide, prs, 7.13, 2.25, 5.7, 2.85, "FFFFFF", "FFFFFF", 96);
  slide.addText("THIS ROUND GETS US TO", { x: 7.38, y: 2.4, w: 5.2, h: 0.25, fontSize: 7.5, bold: true, color: GRAY, charSpacing: 2 });
  bullet(slide, [
    "10 enterprise partners signed",
    "£10,000 ARR achieved",
    "1,000+ assessments completed",
    "Aus & US markets entered",
  ], 7.38, 2.78, 5.2, LIGHT, 10);

  // Contact
  card(slide, prs, 7.13, 5.38, 5.7, 1.85, "FFFFFF", "FFFFFF", 96);
  slide.addText("GET IN TOUCH", { x: 7.38, y: 5.53, w: 5.2, h: 0.25, fontSize: 7.5, bold: true, color: GRAY, charSpacing: 2 });
  slide.addText("hello@humanmetrix.com", { x: 7.38, y: 5.85, w: 5.2, h: 0.4, fontSize: 15, bold: true, color: WHITE });
  slide.addText("humanmetrix.com", { x: 7.38, y: 6.25, w: 5.2, h: 0.28, fontSize: 10, color: GRAY });
  slide.addShape(prs.ShapeType.roundRect, { x: 7.38, y: 6.6, w: 1.85, h: 0.42, rectRadius: 0.1, fill: { color: CYAN }, line: { type: "none" } });
  slide.addText("Book a demo →", { x: 7.38, y: 6.6, w: 1.85, h: 0.42, fontSize: 9.5, bold: true, color: WHITE, align: "center", valign: "middle" });
}

// ── Public entry point ─────────────────────────────────────────────────────

export async function generateAndDownloadPitchPptx(options?: { teamPhotos?: TeamPhotos }) {
  const photos: TeamPhotos = options?.teamPhotos ?? {};

  const prs = new pptxgen();
  prs.layout = "LAYOUT_WIDE";
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
  await buildSlide9(prs, photos);
  buildSlide10(prs);

  await prs.writeFile({ fileName: "HumanMetrix-Pitch-Deck.pptx" });
}
