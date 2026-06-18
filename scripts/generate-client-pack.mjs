import puppeteer from 'puppeteer';
import { statSync, mkdirSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const DOC_DATE = '18 June 2026';
const DOC_VERSION = '1.1';
const ENTITY = 'HUMAN METRIX CONSULTING LTD';

function findChromiumPath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidates = [
    '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
  ];
  for (const c of candidates) {
    try { statSync(c); return c; } catch {}
  }
  try {
    const r = execSync('which chromium 2>/dev/null || find /nix/store -name chromium -path "*/bin/chromium" 2>/dev/null | head -1', { encoding: 'utf-8' }).trim();
    if (r) return r;
  } catch {}
  return 'chromium';
}

const LOGO_SVG = `
<svg width="46" height="46" viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="HumanMetrix">
  <defs>
    <linearGradient id="hmgrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="44" height="44" rx="10" fill="url(#hmgrad)"/>
  <text x="23" y="31" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="800" fill="#ffffff" letter-spacing="-1">HM</text>
</svg>`;

const BASE_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: #1e293b;
    font-size: 10.5pt;
    line-height: 1.55;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .cover {
    height: 247mm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 6mm;
    page-break-after: always;
    background:
      radial-gradient(120% 80% at 100% 0%, rgba(34,211,238,0.10), rgba(255,255,255,0) 60%),
      radial-gradient(120% 80% at 0% 100%, rgba(37,99,235,0.10), rgba(255,255,255,0) 60%);
  }
  .cover-badge {
    display: inline-flex; align-items: center; gap: 10px;
    margin-bottom: 26px;
  }
  .cover-badge .name { font-size: 15pt; font-weight: 800; letter-spacing: -0.3px; color: #0f172a; }
  .cover-badge .name span { color: #2563eb; }
  .cover-kicker {
    text-transform: uppercase; letter-spacing: 2.5px; font-size: 9pt; font-weight: 700;
    color: #2563eb; margin-bottom: 14px;
  }
  .cover-title {
    font-size: 30pt; font-weight: 800; line-height: 1.1; color: #0f172a; margin: 0 0 18px;
    letter-spacing: -0.6px; max-width: 150mm;
  }
  .cover-sub { font-size: 12pt; color: #475569; max-width: 150mm; margin-bottom: 40px; }
  .cover-rule { height: 4px; width: 70px; border-radius: 4px; background: linear-gradient(90deg,#22d3ee,#2563eb); margin-bottom: 26px; }
  .cover-meta { font-size: 9.5pt; color: #64748b; }
  .cover-meta b { color: #334155; font-weight: 700; }
  .cover-meta .row { margin-bottom: 4px; }

  h1.section {
    font-size: 16pt; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;
    margin: 26px 0 4px; padding-top: 6px;
    page-break-after: avoid;
  }
  h1.section .num {
    display: inline-block; min-width: 26px; color: #2563eb;
  }
  h1.section + .lead { color: #475569; margin: 0 0 12px; }
  .sec-rule { height: 3px; width: 54px; border-radius: 3px; background: linear-gradient(90deg,#22d3ee,#2563eb); margin: 6px 0 14px; }
  h2.sub { font-size: 12pt; font-weight: 700; color: #1e293b; margin: 18px 0 6px; page-break-after: avoid; }
  p { margin: 0 0 10px; }
  ul, ol { margin: 0 0 12px; padding-left: 18px; }
  li { margin-bottom: 6px; }
  strong { color: #0f172a; }
  a { color: #2563eb; text-decoration: none; }

  .callout {
    border: 1px solid #bae6fd; background: #f0f9ff; border-radius: 8px;
    padding: 12px 14px; margin: 14px 0; page-break-inside: avoid;
  }
  .callout.warn { border-color: #fed7aa; background: #fff7ed; }
  .callout .t { font-weight: 700; color: #0f172a; margin-bottom: 4px; font-size: 10pt; }

  table { width: 100%; border-collapse: collapse; margin: 12px 0 16px; font-size: 9.5pt; page-break-inside: avoid; }
  th { background: #0f172a; color: #fff; text-align: left; padding: 8px 10px; font-weight: 700; font-size: 9pt; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  table.compact td, table.compact th { padding: 6px 9px; }

  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; page-break-inside: avoid; }
  .card h3 { margin: 0 0 4px; font-size: 10.5pt; color: #0f172a; }
  .card p { margin: 0; font-size: 9.5pt; color: #475569; }

  .toc { margin: 8px 0 0; }
  .toc-item { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px dashed #e2e8f0; font-size: 10.5pt; }
  .toc-item .n { color: #2563eb; font-weight: 700; margin-right: 10px; }
  .pill { display:inline-block; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius: 999px; padding: 2px 9px; font-size: 8.5pt; font-weight:700; }
  .muted { color: #64748b; }
  .nobreak { page-break-inside: avoid; }
`;

function footerTemplate(docName) {
  return `
  <div style="width:100%; font-family: Arial, sans-serif; font-size:7pt; color:#94a3b8; padding:0 14mm;">
    <div style="border-top:1px solid #e2e8f0; padding-top:4px; display:flex; justify-content:space-between;">
      <span>${ENTITY} &nbsp;•&nbsp; ${docName} &nbsp;•&nbsp; v${DOC_VERSION} — ${DOC_DATE}</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>
  </div>`;
}

function page(bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>${bodyHtml}</body></html>`;
}

function cover(kicker, title, sub) {
  return `
  <section class="cover">
    <div class="cover-badge">${LOGO_SVG}<span class="name">Human<span>Metrix</span></span></div>
    <div class="cover-rule"></div>
    <div class="cover-kicker">${kicker}</div>
    <h1 class="cover-title">${title}</h1>
    <p class="cover-sub">${sub}</p>
    <div class="cover-meta">
      <div class="row"><b>Prepared by:</b> ${ENTITY}</div>
      <div class="row"><b>Document version:</b> ${DOC_VERSION} &nbsp;|&nbsp; <b>Date:</b> ${DOC_DATE}</div>
      <div class="row"><b>Classification:</b> Confidential — for the named recipient's due-diligence use</div>
    </div>
  </section>`;
}

/* ============================ DOCUMENT 1 ============================ */
const doc1 = page(`
${cover(
  'Scientific Validation & Evidence Report',
  'The Science Behind HumanMetrix Assessments',
  'How our assessments are designed, scored, kept consistent, and checked for fairness — with an honest account of the evidence we hold today and the independent-validation work that lies ahead.'
)}

<h1 class="section"><span class="num">1.</span> Executive summary</h1>
<div class="sec-rule"></div>
<p>HumanMetrix provides four online assessments for hiring and development in AI-augmented roles: the <strong>FIT</strong> behavioural assessment, the <strong>AI Readiness</strong> assessment, the <strong>Prompt Architecture</strong> assessment, and the <strong>AIQ (Algorithmic Integrity Quotient)</strong> ethics assessment. This report explains the scientific and methodological basis for those instruments: what they measure, how responses are converted into scores, how we keep scoring consistent, and how we approach fairness and bias.</p>
<p>Our design philosophy is <strong>behavioural measurement over self-report</strong>: candidates respond to realistic scenarios and decision points rather than rating their own abilities. Every candidate sits a standardised instrument under equivalent conditions, producing directly comparable outputs.</p>
<p>We are deliberately candid about the maturity of our evidence base. HumanMetrix assessments are built on established psychometric design principles and an expert-authored item and scoring framework, and they are supported by an early field deployment. They have <strong>not yet undergone formal independent academic validation or large-scale normative studies</strong>. Section 9 sets out that limitation in full, together with our roadmap to address it. Nothing in this document should be read as a claim of peer-reviewed or independently certified predictive validity.</p>

<h1 class="section"><span class="num">2.</span> What the assessments measure</h1>
<div class="sec-rule"></div>
<p class="lead">Each instrument targets a distinct, named construct set. Constructs are defined in advance, mapped to behavioural indicators, and surfaced transparently to the candidate in their report.</p>

<h2 class="sub">2.1 FIT — behavioural competencies (six dimensions)</h2>
<p>A scenario-based assessment measuring six behavioural traits associated with sustained performance, adaptability, and collaboration:</p>
<table class="compact">
  <tr><th>Dimension</th><th>What it reflects</th></tr>
  <tr><td><strong>High Agency</strong></td><td>Initiative, ownership, and self-directed action without requiring direction.</td></tr>
  <tr><td><strong>Intellectual Curiosity</strong></td><td>Drive to explore, question, and learn continuously as tools and methods evolve.</td></tr>
  <tr><td><strong>Resilience</strong></td><td>Recovery from setbacks and maintenance of performance under pressure and uncertainty.</td></tr>
  <tr><td><strong>Empathy &amp; Ethics</strong></td><td>Sensitivity to the impact of decisions on others, with a strong ethical orientation.</td></tr>
  <tr><td><strong>Growth Mindset</strong></td><td>Belief that capability is developed through effort; openness to feedback and iteration.</td></tr>
  <tr><td><strong>Interpersonal Agility</strong></td><td>Adapting communication style and collaborating across differences.</td></tr>
</table>

<h2 class="sub">2.2 AI Readiness — working effectively alongside AI (nine skills)</h2>
<p>A 21-item assessment of how prepared a candidate is to work productively and critically with AI tools — not whether they can build AI. It evaluates nine interconnected skills: AI Literacy &amp; Prompt Engineering, Technical Fundamentals, Data Fluency, Critical Thinking &amp; Problem-Solving, Adaptability &amp; Continuous Learning, Responsible AI &amp; Ethics, Collaboration &amp; Communication, Creativity &amp; Innovation, and Domain Expertise.</p>

<h2 class="sub">2.3 Prompt Architecture — directing AI systems (seven levels)</h2>
<p>A practical, task-based assessment in which candidates author prompts across seven progressively harder levels (from basic retrieval to complex system design). Each response is evaluated on five criteria — <strong>Clarity, Structure, Context Relevance, Creativity,</strong> and <strong>Iterative Improvement</strong> — against a fixed weighted rubric.</p>

<h2 class="sub">2.4 AIQ — Algorithmic Integrity Quotient (ethical reasoning)</h2>
<p>A scenario-based ethics assessment. Candidates evaluate AI-assisted decision scenarios (re-identification risk, screening bias, black-box explainability, consent, safety trade-offs). It surfaces bias recognition, uncertainty calibration, responsible-deployment judgment, transparency, and failure-mode awareness, reported against five interpretive bands from "Critical Concerns" to "Exemplary Ethical Alignment".</p>

<h1 class="section"><span class="num">3.</span> Item &amp; instrument design</h1>
<div class="sec-rule"></div>
<p>Items are <strong>expert-authored</strong> and built on a situational-judgement and attribution-based model. Rather than asking candidates what they know, scenarios present competing courses of action where each option reflects an underlying disposition or reasoning style. The <em>reasoning embedded in an option</em> — not its surface content — is what carries the measurement signal.</p>
<ul>
  <li><strong>Construct-first authoring:</strong> each dimension is defined and mapped to behavioural indicators and workplace use-cases before items are written.</li>
  <li><strong>Balanced scoring keys:</strong> for the structured assessments, options are mapped to constructs using a balanced matrix so that no single dimension is over- or under-represented across the instrument.</li>
  <li><strong>Regional localisation:</strong> selected content is localised (e.g. a South-East-Asia variant) so scenarios remain culturally legible without changing the construct being measured.</li>
  <li><strong>Difficulty progression:</strong> the Prompt Architecture assessment escalates task complexity in a fixed sequence so that every candidate experiences equivalent demand.</li>
</ul>

<h1 class="section"><span class="num">4.</span> Scoring methodology</h1>
<div class="sec-rule"></div>
<p class="lead">HumanMetrix uses two complementary scoring engines. Understanding the split is central to understanding our consistency and fairness story.</p>

<h2 class="sub">4.1 Deterministic, key-based scoring (FIT, AI Readiness, AIQ)</h2>
<p>The three structured assessments are scored by <strong>fixed, expert-defined scoring keys</strong> — not by a language model. Each answer maps to predetermined construct points (FIT and AI Readiness) or to a predetermined 0–100 ethical-alignment value per option (AIQ). Scores are computed arithmetically from these keys.</p>
<div class="callout">
  <div class="t">Reproducible by construction</div>
  <p style="margin:0;">Because these scores are produced by a fixed key rather than a probabilistic model, the same set of answers always yields exactly the same score. There is no run-to-run variability and no model drift in this scoring path.</p>
</div>

<h2 class="sub">4.2 AI-assisted scoring of open-ended work (Prompt Architecture &amp; interpretive narrative)</h2>
<p>The Prompt Architecture assessment requires free-text prompts that cannot be scored by a fixed key. These are evaluated by a large language model (OpenAI <strong>GPT-5</strong>) against the fixed five-criterion rubric described in §2.3. The same model is used to generate interpretive narrative and role-fit commentary that accompanies the numeric scores across the platform.</p>
<p>Rubric anchoring constrains the model: it is asked to score defined criteria with defined weights and point ceilings, rather than to form a free judgement. The numeric construct scores a candidate receives on the structured assessments are <em>never</em> overwritten by the model — the model adds explanation, not the underlying behavioural score.</p>

<h1 class="section"><span class="num">5.</span> Reliability &amp; consistency controls</h1>
<div class="sec-rule"></div>
<p>Reliability is the degree to which the instrument produces consistent, stable, repeatable measurements. We address it differently for the two scoring engines.</p>
<ul>
  <li><strong>Structured assessments:</strong> reliability of scoring is guaranteed by the deterministic key (see §4.1). Internal consistency is supported at design time by mapping multiple items to the same underlying construct.</li>
  <li><strong>AI-assisted scoring — Golden Set benchmarking:</strong> to keep the model-scored components stable, the platform maintains a <strong>Golden Set</strong> of reference prompts with known reference scores. Administrators can re-run the Golden Set to confirm that GPT-5 reproduces the expected scores, providing a "same answer → same score" check and an early-warning signal for model drift after any provider-side model change.</li>
  <li><strong>Temporal stability:</strong> scenarios are written to capture enduring behavioural tendencies rather than moment-specific reactions.</li>
</ul>
<div class="callout warn">
  <div class="t">Honest scope of our reliability evidence</div>
  <p style="margin:0;">We have strong <em>scoring-consistency</em> controls. We have not yet published formal coefficients (e.g. Cronbach's alpha for internal consistency, or test–retest correlations over time) from a large sample. Establishing these is part of the roadmap in §9.</p>
</div>

<h1 class="section"><span class="num">6.</span> Validity evidence</h1>
<div class="sec-rule"></div>
<p>Validity asks whether the instrument measures what it claims to measure. We can evidence content and construct validity by design; criterion/predictive validity is framed honestly as future work.</p>
<table>
  <tr><th>Validity type</th><th>What we can evidence today</th></tr>
  <tr><td><strong>Content validity</strong></td><td>Each construct is mapped to behavioural indicators, workplace use-cases, and contemporary AI-age capability frameworks by expert authors.</td></tr>
  <tr><td><strong>Construct validity</strong></td><td>Answer options are designed to reflect increasing levels of the intended disposition; the measurement signal is the reasoning behind a choice, aligned with theoretical expectation.</td></tr>
  <tr><td><strong>Face / ecological validity</strong></td><td>Items simulate realistic decisions, so responses reflect what a person is likely to do in analogous workplace situations.</td></tr>
  <tr><td><strong>Criterion / predictive validity</strong></td><td><span class="pill">Roadmap</span> Not yet measured. We do not claim a validated correlation between scores and on-the-job performance. See §9.</td></tr>
</table>

<h1 class="section"><span class="num">7.</span> Fairness, bias &amp; responsible AI</h1>
<div class="sec-rule"></div>
<p>Fairness ensures the instrument does not disadvantage any individual or group. Several design choices reduce the surface area for demographic bias:</p>
<ul>
  <li><strong>Behaviour, not background:</strong> candidates are evaluated on responses to scenarios, not on credentials, CVs, names, or self-presentation — removing common channels for demographic bias.</li>
  <li><strong>Identical conditions:</strong> every candidate receives an equivalent, standardised instrument and is scored against identical criteria.</li>
  <li><strong>Culturally-neutral item authoring:</strong> options are written to differ in reasoning, not in lived experience; localisation preserves the construct.</li>
  <li><strong>Bias mitigation in AI scoring:</strong> the model scores against a fixed rubric on anonymised response text, and Golden-Set monitoring guards against scoring drift.</li>
  <li><strong>Human oversight (no solely-automated decisions):</strong> results are surfaced to employers for review and are gated behind candidate consent. HumanMetrix does not make a solely-automated hiring decision with legal or similarly significant effect on a candidate (see also the GDPR pack, Article 22).</li>
  <li><strong>The AIQ ethos:</strong> bias recognition and responsible AI use are not only built into our process — they are an assessment construct we measure in candidates.</li>
</ul>
<div class="callout warn">
  <div class="t">What we have not yet done</div>
  <p style="margin:0;">We have not yet completed a formal adverse-impact / differential-item-functioning (DIF) study across protected groups at scale. We treat this as a priority; our approach and intended methodology are described in §9.</p>
</div>

<h1 class="section"><span class="num">8.</span> Field deployment to date</h1>
<div class="sec-rule"></div>
<p>The platform has been used in live hiring contexts. The figures below are presented as <strong>supporting evidence of real-world operation</strong> — an early field pilot — not as a normative or validation study.</p>
<table class="compact">
  <tr><th>Measure</th><th>Value (Feb–Jun 2026)</th></tr>
  <tr><td>Completed assessments</td><td>~233 (≈148 via partner/employer channel; ≈85 direct-to-candidate)</td></tr>
  <tr><td>Assessment types exercised</td><td>All four (FIT, AI Readiness, Prompt Architecture, AIQ)</td></tr>
  <tr><td>External recruitment agencies trialling the platform</td><td>Recruit My Mom (two linked accounts) and RAG Talent, with further agencies onboarding</td></tr>
</table>
<p class="muted">These volumes demonstrate that the assessments run reliably end-to-end with real candidates and real employer workflows. They are not yet large enough to constitute a normative sample for percentile norms or for statistical validity claims.</p>

<h1 class="section"><span class="num">9.</span> Limitations &amp; independent-validation roadmap</h1>
<div class="sec-rule"></div>
<p>In the interest of a defensible, honest position for due diligence, we state our current limitations plainly:</p>
<ul>
  <li>No formal third-party or academic validation study has been completed.</li>
  <li>No peer-reviewed publication of the instruments or their psychometric properties exists.</li>
  <li>Published reliability coefficients and criterion/predictive-validity coefficients have not yet been established on a large sample.</li>
  <li>Percentile norms are derived from an early and growing population, not a finalised normative sample.</li>
  <li>A formal large-scale adverse-impact / DIF fairness study is outstanding.</li>
</ul>
<p>Our planned programme to strengthen the evidence base:</p>
<table class="compact">
  <tr><th>Workstream</th><th>Intended outcome</th></tr>
  <tr><td>Reliability study</td><td>Internal-consistency (e.g. Cronbach's alpha) and test–retest coefficients on a larger sample.</td></tr>
  <tr><td>Criterion-validity study</td><td>Correlate assessment scores against employer-supplied performance outcomes for consenting cohorts.</td></tr>
  <tr><td>Normative sample</td><td>Build defensible percentile norms, segmented where appropriate.</td></tr>
  <tr><td>Fairness / adverse-impact audit</td><td>DIF and adverse-impact analysis across protected characteristics, with documented mitigations.</td></tr>
  <tr><td>Independent expert review</td><td>External occupational-psychology / psychometrics review of design, scoring, and fairness.</td></tr>
</table>

<h1 class="section"><span class="num">10.</span> Standards alignment &amp; references</h1>
<div class="sec-rule"></div>
<p>Our design intent is alignment with recognised test-quality standards. We aspire to, and design towards, the following frameworks; this is a statement of alignment intent, not of formal accreditation:</p>
<ul>
  <li><strong>British Psychological Society (BPS)</strong> standards for the design and use of psychometric tests.</li>
  <li><strong>EFPA</strong> (European Federation of Psychologists' Associations) test-review criteria.</li>
  <li><strong>ISO 10667</strong> — Assessment service delivery in work and organizational settings.</li>
  <li><strong>UK GDPR Article 22</strong> — safeguards on automated decision-making and profiling (see the accompanying GDPR &amp; Data Protection Compliance Pack).</li>
  <li><strong>World Economic Forum, Future of Jobs Report 2025</strong> — the durable-skills and human–AI-collaboration framing underpinning the competency model.</li>
</ul>
<div class="callout">
  <div class="t">Document control</div>
  <p style="margin:0;">${ENTITY} — Scientific Validation &amp; Evidence Report, version ${DOC_VERSION}, ${DOC_DATE}. This document does not disclose proprietary item content or scoring keys. Figures reflect platform data available at the date of issue.</p>
</div>
`);

/* ============================ DOCUMENT 2 ============================ */
const doc2 = page(`
${cover(
  'UK GDPR & Data Protection Compliance Pack',
  'Data Protection at HumanMetrix',
  'How HumanMetrix processes personal data in line with the UK GDPR and the Data Protection Act 2018 — controller details, lawful bases, automated-decision safeguards, sub-processors, security, and data-subject rights.'
)}

<h1 class="section"><span class="num">1.</span> Controller details &amp; contact</h1>
<div class="sec-rule"></div>
<table class="compact">
  <tr><th>Field</th><th>Detail</th></tr>
  <tr><td><strong>Data controller</strong></td><td>${ENTITY}</td></tr>
  <tr><td><strong>Company number</strong></td><td>17016654</td></tr>
  <tr><td><strong>Trading name</strong></td><td>HumanMetrix (humanmetrix.co.uk)</td></tr>
  <tr><td><strong>Registered address</strong></td><td>8 Yarningale Close, Redditch, England, B98 7XQ</td></tr>
  <tr><td><strong>Data Protection Officer</strong></td><td>Oskar Greda, Chief Executive Officer</td></tr>
  <tr><td><strong>Contact email</strong></td><td>assessments@humanmetrix.co.uk</td></tr>
</table>

<h1 class="section"><span class="num">2.</span> Data-protection principles &amp; lawful bases</h1>
<div class="sec-rule"></div>
<p>HumanMetrix processes personal data in accordance with the UK GDPR principles: lawfulness, fairness and transparency; purpose limitation; data minimisation; accuracy; storage limitation; integrity and confidentiality; and accountability.</p>
<table class="compact">
  <tr><th>Processing activity</th><th>Lawful basis (UK GDPR Art. 6)</th></tr>
  <tr><td>Delivering an assessment a candidate has chosen to take and returning their results</td><td>Contract (Art. 6(1)(b))</td></tr>
  <tr><td>Administering employer-/partner-invited assessments and operating the platform</td><td>Legitimate interests (Art. 6(1)(f)) — balanced against candidate rights</td></tr>
  <tr><td>Sharing a candidate's results with the inviting employer</td><td>Consent (Art. 6(1)(a)) — results are gated behind explicit candidate consent</td></tr>
  <tr><td>Marketing communications (where applicable)</td><td>Consent (Art. 6(1)(a)), via recorded opt-in</td></tr>
  <tr><td>Payment processing, tax and accounting records</td><td>Contract (Art. 6(1)(b)) and legal obligation (Art. 6(1)(c))</td></tr>
  <tr><td>Security, fraud prevention, audit logging</td><td>Legitimate interests (Art. 6(1)(f))</td></tr>
</table>

<h1 class="section"><span class="num">3.</span> Categories of personal data &amp; sources</h1>
<div class="sec-rule"></div>
<p>The categories below are derived from the platform's data model.</p>
<table class="compact">
  <tr><th>Category</th><th>Examples</th><th>Source</th></tr>
  <tr><td>Candidate identity &amp; account</td><td>Name, email, hashed password, profile image (optional), role</td><td>Candidate, or employer/partner at invitation</td></tr>
  <tr><td>Assessment data</td><td>Answers/responses, computed scores, percentile, AI-generated narrative</td><td>Generated during the assessment</td></tr>
  <tr><td>Invitation data</td><td>Candidate name/email, assessment types, invitation status</td><td>Inviting employer/partner</td></tr>
  <tr><td>Consent records</td><td>Results-retention &amp; results-sharing consent and timestamps, marketing opt-ins</td><td>Candidate</td></tr>
  <tr><td>Partner/employer account &amp; billing</td><td>Contact details, account configuration, billing/usage, API keys</td><td>Partner organisation</td></tr>
  <tr><td>Technical &amp; security data</td><td>Session records, audit logs, application/error logs, email delivery logs</td><td>Generated by the platform</td></tr>
</table>

<h1 class="section"><span class="num">4.</span> Special-category data</h1>
<div class="sec-rule"></div>
<p>HumanMetrix does <strong>not set out to collect special-category data</strong> (Art. 9) such as health, racial or ethnic origin, religion, or sexual orientation. Behavioural assessment responses and competency scores are not, in themselves, special-category data. Free-text inputs (e.g. Prompt Architecture answers) are not designed to elicit special-category information, and candidates are not asked to provide it. Where an employer might infer sensitive characteristics from results, our position is that assessments measure behaviour and reasoning, not protected characteristics, and that results must be used for their stated purpose only.</p>

<h1 class="section"><span class="num">5.</span> Automated decision-making &amp; profiling (Article 22)</h1>
<div class="sec-rule"></div>
<p class="lead">This is the section enterprise clients scrutinise most closely for an AI assessment vendor. Our position is designed to keep a human meaningfully in the loop.</p>
<ul>
  <li><strong>No solely-automated significant decisions.</strong> HumanMetrix does not make hiring decisions. The platform produces scores and commentary that inform a human employer's decision; the employer retains decision authority.</li>
  <li><strong>Human-in-the-loop scoring.</strong> Structured assessments are scored by fixed, transparent keys (not by an AI model). Where an AI model is used (open-ended prompt evaluation and interpretive narrative), it scores against a fixed rubric and its output is reviewed by the employer rather than acted on automatically.</li>
  <li><strong>Consent gating.</strong> Results are released to an employer only with the candidate's explicit consent.</li>
  <li><strong>Transparency / right to explanation.</strong> Every assessed dimension is named, defined, and explained in the candidate's report; there are no hidden scores.</li>
  <li><strong>Candidate rights.</strong> Candidates may request human review, raise objections, and exercise the data-subject rights in §10.</li>
</ul>
<div class="callout">
  <div class="t">Client responsibility</div>
  <p style="margin:0;">Employers using HumanMetrix outputs must ensure their own decision process keeps a human decision-maker in control and does not turn an assessment score into a solely-automated decision with legal or similarly significant effect.</p>
</div>

<h1 class="section"><span class="num">6.</span> Records of Processing Activities (Article 30)</h1>
<div class="sec-rule"></div>
<table class="compact">
  <tr><th>Purpose</th><th>Data subjects</th><th>Data categories</th><th>Recipients</th><th>Retention</th></tr>
  <tr><td>Assessment delivery &amp; results</td><td>Candidates</td><td>Identity, responses, scores</td><td>Candidate; inviting employer (on consent)</td><td>Per §11</td></tr>
  <tr><td>Account &amp; authentication</td><td>Candidates, partner users</td><td>Identity, hashed credentials, sessions</td><td>Internal</td><td>Life of account + §11</td></tr>
  <tr><td>Invitations</td><td>Candidates</td><td>Name, email, assessment types</td><td>Email sub-processors</td><td>Per §11</td></tr>
  <tr><td>Billing &amp; accounting</td><td>Partner users</td><td>Billing &amp; transaction data</td><td>Payment &amp; accounting sub-processors</td><td>Legal retention period</td></tr>
  <tr><td>Security &amp; audit</td><td>All users</td><td>Logs, audit trail</td><td>Internal</td><td>Operational retention</td></tr>
</table>

<h1 class="section"><span class="num">7.</span> Data Protection Impact Assessment (summary)</h1>
<div class="sec-rule"></div>
<table class="compact">
  <tr><th>Risk</th><th>Mitigation</th></tr>
  <tr><td>Profiling perceived as automated decision-making</td><td>Human-in-the-loop, consent gating, transparent dimensions, no solely-automated significant decisions (§5)</td></tr>
  <tr><td>Bias / unfair outcomes</td><td>Behaviour-based scoring, fixed keys, rubric-anchored AI scoring, Golden-Set drift monitoring, fairness roadmap</td></tr>
  <tr><td>Unauthorised access / disclosure</td><td>Encryption in transit, hashed passwords, session &amp; CSRF protection, access controls, audit logging (§8)</td></tr>
  <tr><td>International transfers</td><td>Transfer safeguards with sub-processors; reliance on IDTA / SCCs where required (§9)</td></tr>
  <tr><td>Excessive retention</td><td>Storage-limitation practices and consent-based retention controls (§11)</td></tr>
</table>

<h1 class="section"><span class="num">8.</span> Technical &amp; organisational measures (TOMs)</h1>
<div class="sec-rule"></div>
<div class="grid2">
  <div class="card"><h3>Encryption in transit</h3><p>All traffic served over HTTPS/TLS.</p></div>
  <div class="card"><h3>Credential protection</h3><p>Passwords stored as bcrypt hashes — never in plaintext.</p></div>
  <div class="card"><h3>Session security</h3><p>Server-side sessions; session ID rotation on login to prevent fixation; secure, <code>SameSite</code>-scoped cookies.</p></div>
  <div class="card"><h3>CSRF protection</h3><p>Token-based CSRF defence with <code>SameSite</code> cookie policy.</p></div>
  <div class="card"><h3>Access controls</h3><p>Role-based access (candidate, partner, admin); results gated by consent.</p></div>
  <div class="card"><h3>Audit logging</h3><p>Audit, application and error logs support traceability and incident response.</p></div>
  <div class="card"><h3>Rate limiting &amp; monitoring</h3><p>Request rate limiting and security monitoring on authentication paths.</p></div>
  <div class="card"><h3>Hosting &amp; backups</h3><p>Managed PostgreSQL (Neon) with provider-managed backups; deployed on managed cloud infrastructure.</p></div>
  <div class="card"><h3>Secrets handling</h3><p>Credentials and API keys held as managed environment secrets, not in source code.</p></div>
  <div class="card"><h3>Data minimisation</h3><p>Only data needed to deliver and explain an assessment is collected.</p></div>
</div>

<h1 class="section"><span class="num">9.</span> Sub-processors &amp; international transfers</h1>
<div class="sec-rule"></div>
<p>HumanMetrix relies on the sub-processors below. Several are based in, or process data in, the United States or other countries outside the UK; for such transfers HumanMetrix relies on appropriate safeguards (the UK International Data Transfer Agreement / Addendum to the EU SCCs, and providers' own transfer frameworks).</p>
<table class="compact">
  <tr><th>Sub-processor</th><th>Purpose</th><th>Transfer note</th></tr>
  <tr><td>Replit</td><td>Application hosting, deployment &amp; managed PostgreSQL database</td><td>US transfer — IDTA/SCCs</td></tr>
  <tr><td>OpenAI</td><td>AI scoring of open-ended responses &amp; narrative</td><td>US transfer — IDTA/SCCs</td></tr>
  <tr><td>Stripe</td><td>Payment processing</td><td>US transfer — IDTA/SCCs</td></tr>
  <tr><td>Airwallex</td><td>Subscription / merchant-initiated billing</td><td>Global infrastructure — UK IDTA / SCCs</td></tr>
  <tr><td>SendGrid (Twilio)</td><td>Transactional email (secondary)</td><td>US transfer — IDTA/SCCs</td></tr>
  <tr><td>Google / Gmail</td><td>Transactional email (primary)</td><td>US transfer — IDTA/SCCs</td></tr>
  <tr><td>Xero</td><td>Accounting / revenue records</td><td>US (AWS) &amp; New Zealand (adequacy) — SCCs</td></tr>
</table>
<p>For each restricted transfer above, HumanMetrix relies on the relevant provider's standard Data Processing Agreement, which incorporates the UK International Data Transfer Agreement (IDTA) and/or the EU Standard Contractual Clauses (SCCs), together with the providers' own technical and organisational safeguards. A current sub-processor list is maintained and is available to clients on request.</p>

<h1 class="section"><span class="num">10.</span> Data-subject rights</h1>
<div class="sec-rule"></div>
<p>Subject to the conditions in the UK GDPR, individuals have the right to: be informed; access their data; rectification; erasure; restriction of processing; data portability; to object; and rights related to automated decision-making (§5).</p>
<p><strong>How to exercise these rights:</strong> requests can be made to <a href="mailto:assessments@humanmetrix.co.uk">assessments@humanmetrix.co.uk</a>, addressed to Oskar Greda. HumanMetrix will respond within one month, extendable as permitted for complex requests. Candidates additionally control whether their results are shared with an employer through the in-product consent mechanism.</p>

<h1 class="section"><span class="num">11.</span> Data retention &amp; deletion</h1>
<div class="sec-rule"></div>
<ul>
  <li><strong>Storage limitation:</strong> personal data is retained in line with the UK GDPR storage-limitation principle — kept only as long as needed for the purpose it was collected for, or as required by law.</li>
  <li><strong>Consent-based results retention:</strong> assessment results are retained in line with the candidate's recorded results-retention consent and the date it was given, which governs how long results are kept on their behalf; consent can be withdrawn at any time.</li>
  <li><strong>Financial records:</strong> billing and accounting records are retained for the period required by UK law for tax and accounting purposes.</li>
  <li><strong>Unpaid/incomplete sessions:</strong> the platform applies time-bounded handling to unpaid assessment sessions (a 30-day window governs free-unlock eligibility), after which associated processing is wound down.</li>
  <li><strong>Erasure on request:</strong> candidates may request deletion of their personal data (§10), subject to legal-retention exceptions.</li>
</ul>

<h1 class="section"><span class="num">12.</span> Personal-data-breach procedure</h1>
<div class="sec-rule"></div>
<p>On becoming aware of a personal-data breach, HumanMetrix will: (1) contain and assess the breach; (2) record it in an internal breach log; (3) where the breach is likely to result in a risk to individuals' rights and freedoms, notify the ICO <strong>without undue delay and within 72 hours</strong>; and (4) where there is a high risk, notify affected data subjects without undue delay. Security, audit and error logging supports detection and investigation.</p>

<h1 class="section"><span class="num">13.</span> Cookies &amp; tracking</h1>
<div class="sec-rule"></div>
<p>HumanMetrix uses cookies that are strictly necessary for the service to function — principally the authentication session cookie and a CSRF-protection cookie. These are essential cookies required to operate the platform securely. Any non-essential analytics or marketing cookies, if introduced, would be governed by a cookie notice and consent.</p>

<h1 class="section"><span class="num">14.</span> Client Data Processing Agreement (DPA)</h1>
<div class="sec-rule"></div>
<p>Where HumanMetrix acts as a processor on behalf of an employer/partner controller (for example, processing candidate data the employer has invited), HumanMetrix can enter into a <strong>Data Processing Agreement</strong> setting out the subject-matter, duration, nature and purpose of processing, the types of personal data and categories of data subjects, the parties' obligations, the sub-processor list, international-transfer safeguards, and security measures. A DPA is available to enterprise clients on request to <a href="mailto:assessments@humanmetrix.co.uk">assessments@humanmetrix.co.uk</a>.</p>
<div class="callout">
  <div class="t">Document control</div>
  <p style="margin:0;">${ENTITY} — UK GDPR &amp; Data Protection Compliance Pack, version ${DOC_VERSION}, ${DOC_DATE}. This pack is provided for due-diligence information and does not itself constitute legal advice or a signed DPA.</p>
</div>
`);

async function render(browser, html, footerName, outPath) {
  const p = await browser.newPage();
  await p.setContent(html, { waitUntil: 'networkidle0' });
  await p.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: footerTemplate(footerName),
    margin: { top: '14mm', bottom: '16mm', left: '14mm', right: '14mm' },
  });
  await p.close();
  console.log(`Wrote ${outPath}`);
}

(async () => {
  mkdirSync('exports', { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: findChromiumPath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process', '--no-zygote'],
  });
  try {
    await render(browser, doc1, 'Scientific Validation & Evidence Report', 'exports/HumanMetrix_Scientific_Validation_Report.pdf');
    await render(browser, doc2, 'UK GDPR & Data Protection Compliance Pack', 'exports/HumanMetrix_UK_GDPR_Compliance_Pack.pdf');
  } finally {
    await browser.close();
  }
  console.log('Done.');
})();
