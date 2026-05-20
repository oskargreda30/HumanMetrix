import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ArrowRight, Check, Circle, Download } from "lucide-react";
import { generateAndDownloadPitchPptx } from "@/lib/generatePitchPptx";

const TOTAL_SLIDES = 10;

function SlideCounter({ current, total }: { current: number; total: number }) {
  return (
    <div className="fixed top-6 right-8 z-50 flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current - 1
              ? "w-6 h-1.5 bg-cyan-400"
              : "w-1.5 h-1.5 bg-white/25"
          }`}
        />
      ))}
      <span className="ml-2 text-white/40 text-xs font-mono tabular-nums">
        {current}/{total}
      </span>
    </div>
  );
}

function NavButtons({
  current,
  total,
  onPrev,
  onNext,
}: {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3">
      <button
        onClick={onPrev}
        disabled={current === 1}
        className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
        data-testid="button-slide-prev"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={onNext}
        disabled={current === total}
        className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
        data-testid="button-slide-next"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Slide 1: Cover ──────────────────────────────────────────────────────────
function Slide1() {
  return (
    <div className="relative flex flex-col items-center justify-center h-full text-center px-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#0f1e3a] to-[#0a1628]" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-blue-600/8 blur-3xl" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-4xl">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-2xl shadow-cyan-500/30">
          <span className="text-3xl font-black text-white tracking-tighter">HM</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-none">
            Human
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Metrix</span>
          </h1>
          <p className="text-2xl md:text-3xl font-light text-white/80 tracking-wide">
            The Operating System for Human Performance
          </p>
        </div>
        <p className="text-base md:text-lg text-white/50 max-w-xl leading-relaxed">
          AI-powered assessment for the people behind the AI
        </p>
        <div className="mt-4 flex items-center gap-2 text-white/30 text-sm animate-pulse">
          <span>Press</span>
          <kbd className="px-2 py-0.5 rounded border border-white/20 text-xs font-mono">→</kbd>
          <span>to advance</span>
        </div>
      </div>
    </div>
  );
}

// ── Slide 2: The Problem ─────────────────────────────────────────────────────
function Slide2() {
  const problems = [
    {
      icon: "⚠",
      label: "Hiring is broken",
      stat: "82%",
      statLabel: "of bad hires pass traditional screening",
      desc: "CVs and interviews can't measure AI literacy, behavioural resilience, or ethical judgment. Companies are hiring blind.",
      color: "from-red-500/20 to-red-600/5",
      border: "border-red-500/30",
      statColor: "text-red-400",
    },
    {
      icon: "📊",
      label: "Performance is guesswork",
      stat: "77%",
      statLabel: "of employees say annual reviews are useless",
      desc: "Annual reviews are lagging indicators with no objective baseline. You can't improve what you can't measure.",
      color: "from-amber-500/20 to-amber-600/5",
      border: "border-amber-500/30",
      statColor: "text-amber-400",
    },
    {
      icon: "🔗",
      label: "People data is fragmented",
      stat: "74%",
      statLabel: "of HR leaders can't assess AI readiness",
      desc: "Health, psychology, and performance live in separate silos with no unified view. The whole person is invisible.",
      color: "from-purple-500/20 to-purple-600/5",
      border: "border-purple-500/30",
      statColor: "text-purple-400",
    },
  ];

  return (
    <div className="relative flex flex-col h-full px-8 md:px-20 py-16 overflow-hidden">
      <div className="absolute inset-0 bg-[#0f172a]" />
      <div className="relative z-10 flex flex-col h-full gap-8">
        <div>
          <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-2">The Problem</p>
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
            Companies are hiring for an AI era<br />
            <span className="text-white/50">with industrial-era tools.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-1 items-stretch">
          {problems.map((p) => (
            <div
              key={p.label}
              className={`relative rounded-2xl border ${p.border} bg-gradient-to-b ${p.color} p-6 flex flex-col gap-4`}
            >
              <span className="text-2xl">{p.icon}</span>
              <div>
                <div className={`text-4xl font-black ${p.statColor} leading-none`}>{p.stat}</div>
                <div className="text-white/40 text-xs mt-1 leading-snug">{p.statLabel}</div>
              </div>
              <div>
                <div className="text-white font-bold text-base mb-1">{p.label}</div>
                <p className="text-white/60 text-sm leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Slide 3: The Vision ──────────────────────────────────────────────────────
function Slide3() {
  const stages = [
    {
      step: "01",
      label: "Hire Right",
      sub: "Today",
      desc: "Scientifically-grounded psychometric and AI literacy assessments at the point of hire.",
      color: "from-cyan-400 to-blue-500",
    },
    {
      step: "02",
      label: "Develop Continuously",
      sub: "Phase 2",
      desc: "Pulse check-ins, 360 feedback, and growth tracking mapped against each person's hiring baseline.",
      color: "from-blue-500 to-indigo-600",
    },
    {
      step: "03",
      label: "Sustain Whole-Human Performance",
      sub: "Phase 3+",
      desc: "Biometric and health data closes the loop — linking how a person thinks, behaves, and physically performs.",
      color: "from-indigo-600 to-purple-600",
    },
  ];

  return (
    <div className="relative flex flex-col h-full px-8 md:px-20 py-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#0d1b35] to-[#0f172a]" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-indigo-600/10 blur-3xl" />
      </div>
      <div className="relative z-10 flex flex-col h-full gap-8">
        <div className="text-center">
          <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-4">The Vision</p>
          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight max-w-4xl mx-auto">
            A complete psychological and physical<br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              performance profile for every person
            </span>
            <br />in your business.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 items-stretch mt-2">
          {stages.map((s, i) => (
            <div key={s.step} className="flex gap-4 items-stretch">
              <div className="relative flex flex-col bg-white/5 border border-white/10 rounded-2xl p-6 gap-4 flex-1">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} text-white font-black text-sm`}>
                  {s.step}
                </div>
                <div>
                  <div className="text-xs text-white/40 font-semibold tracking-widest uppercase mb-1">{s.sub}</div>
                  <div className="text-white font-bold text-lg leading-tight">{s.label}</div>
                </div>
                <p className="text-white/55 text-sm leading-relaxed">{s.desc}</p>
              </div>
              {i < stages.length - 1 && (
                <div className="hidden md:flex items-center text-white/20 self-center">
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-6 py-4 text-center">
            <p className="text-cyan-300 text-sm md:text-base italic">
              "The first platform to objectively link how a person thinks, behaves, and physically performs — over their entire career."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Slide 4: Platform Today ──────────────────────────────────────────────────
function Slide4() {
  const features = [
    { label: "FIT Assessment", desc: "Behavioural traits — resilience, agency, curiosity, empathy", live: true },
    { label: "AI Readiness", desc: "Practical AI literacy and domain application scoring", live: true },
    { label: "Prompt Architecture", desc: "How effectively a person engineers AI outputs", live: true },
    { label: "AIQ — Algorithmic Integrity", desc: "Ethical reasoning and responsible AI judgment", live: true },
    { label: "Ecosystem Index", desc: "Team diagnostic — aggregated FIT + contextual gap analysis", live: true },
    { label: "Role Fit Analysis", desc: "AI-generated candidate-to-role alignment across 100+ roles", live: true },
  ];

  const infra = [
    "B2B partner model — embeddable widget + REST API",
    "PDF report generation (server-side, Puppeteer)",
    "Multi-currency + PPP pricing (Stripe & Airwallex)",
    "SEA-localised content, 100+ predefined roles",
  ];

  return (
    <div className="relative flex flex-col h-full px-8 md:px-20 py-16 overflow-hidden">
      <div className="absolute inset-0 bg-[#0f172a]" />
      <div className="relative z-10 flex flex-col h-full gap-6">
        <div>
          <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-2">Platform Today</p>
          <h2 className="text-4xl md:text-5xl font-black text-white">Live &amp; working.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          <div className="space-y-3">
            <p className="text-white/40 text-xs font-semibold tracking-widest uppercase">Assessment Types</p>
            <div className="grid grid-cols-1 gap-2">
              {features.map((f) => (
                <div key={f.label} className="flex items-start gap-3 bg-white/4 border border-white/8 rounded-xl px-4 py-3">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold">{f.label}</div>
                    <div className="text-white/45 text-xs leading-snug mt-0.5">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-white/40 text-xs font-semibold tracking-widest uppercase">Infrastructure</p>
              {infra.map((item) => (
                <div key={item} className="flex items-start gap-3 text-white/65 text-sm">
                  <Circle className="w-1.5 h-1.5 text-cyan-400 flex-shrink-0 mt-1.5 fill-cyan-400" />
                  {item}
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 space-y-4">
              <p className="text-white/40 text-xs font-semibold tracking-widest uppercase">Already deployed</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { val: "4", label: "Live assessments" },
                  { val: "100+", label: "Predefined roles" },
                  { val: "3-tier", label: "B2B billing model" },
                  { val: "SEA", label: "Launch market" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl font-black text-cyan-400">{s.val}</div>
                    <div className="text-white/45 text-xs mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Slide 5: Business Model ──────────────────────────────────────────────────
function Slide5() {
  const streams = [
    {
      n: "01",
      label: "B2B SaaS",
      sub: "Primary revenue",
      color: "from-cyan-500/20 to-cyan-600/5",
      border: "border-cyan-500/30",
      accent: "text-cyan-400",
      points: [
        "Credit-based subscriptions, 3 tiers",
        "White-label embeddable widget",
        "REST API + webhook notifications",
        "Team & enterprise pricing",
      ],
    },
    {
      n: "02",
      label: "B2C",
      sub: "Individual assessments",
      color: "from-blue-500/20 to-blue-600/5",
      border: "border-blue-500/30",
      accent: "text-blue-400",
      points: [
        "Individuals purchase own reports",
        "Career development positioning",
        "PPP pricing for global access",
        "PDF report delivery",
      ],
    },
    {
      n: "03",
      label: "Team Diagnostics",
      sub: "Ecosystem Index",
      color: "from-indigo-500/20 to-indigo-600/5",
      border: "border-indigo-500/30",
      accent: "text-indigo-400",
      points: [
        "Per-analysis credit consumption",
        "Mission + team FIT aggregation",
        "Ideal candidate profile generation",
        "Contextual gap analysis",
      ],
    },
  ];

  return (
    <div className="relative flex flex-col h-full px-8 md:px-20 py-16 overflow-hidden">
      <div className="absolute inset-0 bg-[#0f172a]" />
      <div className="relative z-10 flex flex-col h-full gap-6">
        <div>
          <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-2">Business Model</p>
          <h2 className="text-4xl md:text-5xl font-black text-white">
            Three revenue streams.<br />
            <span className="text-white/50">All compounding.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-1 items-stretch">
          {streams.map((s) => (
            <div key={s.n} className={`rounded-2xl border ${s.border} bg-gradient-to-b ${s.color} p-6 flex flex-col gap-5`}>
              <div>
                <span className={`text-xs font-black tracking-widest ${s.accent}`}>{s.n}</span>
                <h3 className="text-white text-xl font-black mt-1">{s.label}</h3>
                <p className="text-white/40 text-xs mt-0.5">{s.sub}</p>
              </div>
              <ul className="space-y-2 flex-1">
                {s.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-white/65 text-sm">
                    <Check className={`w-3.5 h-3.5 ${s.accent} flex-shrink-0 mt-0.5`} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          {["Stripe", "Airwallex", "Xero", "PPP Pricing", "Multi-currency"].map((tag) => (
            <span key={tag} className="px-3 py-1 rounded-full border border-white/15 text-white/45 text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Slide 6: Roadmap ─────────────────────────────────────────────────────────
function Slide6() {
  const phases = [
    {
      phase: "Foundation",
      when: "Live now",
      color: "bg-cyan-400",
      textColor: "text-cyan-400",
      borderColor: "border-cyan-400/40",
      items: [
        "Core 4 assessments (FIT, AI Readiness, Prompt Architecture, AIQ)",
        "B2B partner model, embeddable widget + API",
        "Ecosystem Index — team diagnostics",
        "SEA launch market",
      ],
    },
    {
      phase: "Continuous Performance",
      when: "6–18 months",
      color: "bg-blue-500",
      textColor: "text-blue-400",
      borderColor: "border-blue-500/40",
      items: [
        "Pulse check-ins & 360 feedback loops",
        "Growth tracking vs. hiring baseline scores",
        "HRIS integrations (BambooHR, Workday, SAP)",
        "Manager dashboards + coaching prompts",
      ],
    },
    {
      phase: "Health Integration",
      when: "12–24 months",
      color: "bg-indigo-500",
      textColor: "text-indigo-400",
      borderColor: "border-indigo-500/40",
      items: [
        "Wearable / biometric data ingestion",
        "Apple Health, Garmin, Whoop connectors",
        "Physical wellness score alongside psychological profile",
        "Early burnout detection & intervention triggers",
      ],
    },
    {
      phase: "Whole Human Profile",
      when: "24–36 months",
      color: "bg-purple-500",
      textColor: "text-purple-400",
      borderColor: "border-purple-500/40",
      items: [
        "Unified profile: hiring baseline + appraisal trajectory + health index",
        "Anonymised industry benchmarking database",
        "Enterprise white-label offering",
        "UK & US market expansion",
      ],
    },
  ];

  return (
    <div className="relative flex flex-col h-full px-8 md:px-20 py-16 overflow-hidden">
      <div className="absolute inset-0 bg-[#0f172a]" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-purple-600/8 blur-3xl" />
      </div>
      <div className="relative z-10 flex flex-col h-full gap-6">
        <div>
          <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-2">Roadmap</p>
          <h2 className="text-4xl md:text-5xl font-black text-white">
            The full stack of<br />
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              human performance.
            </span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 items-stretch">
          {phases.map((p, i) => (
            <div key={p.phase} className={`relative rounded-2xl border ${p.borderColor} bg-white/3 p-5 flex flex-col gap-3`}>
              <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/8 w-fit`}>
                <div className={`w-1.5 h-1.5 rounded-full ${p.color}`} />
                <span className={`text-xs font-semibold ${p.textColor}`}>{p.when}</span>
              </div>
              <h3 className="text-white font-bold text-sm leading-snug">{p.phase}</h3>
              <ul className="space-y-1.5 flex-1">
                {p.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-white/50 text-xs leading-snug">
                    <div className={`w-1 h-1 rounded-full ${p.color} flex-shrink-0 mt-1.5`} />
                    {item}
                  </li>
                ))}
              </ul>
              {i < phases.length - 1 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="w-4 h-4 text-white/20" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Slide 7: Market Opportunity ──────────────────────────────────────────────
function Slide7() {
  return (
    <div className="relative flex flex-col h-full px-8 md:px-20 py-16 overflow-hidden">
      <div className="absolute inset-0 bg-[#0f172a]" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-blue-600/5 blur-3xl" />
      </div>
      <div className="relative z-10 flex flex-col h-full gap-8">
        <div>
          <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-2">Market Opportunity</p>
          <h2 className="text-4xl md:text-5xl font-black text-white">
            A massive market.<br />
            <span className="text-white/50">With almost no credible AI-native player.</span>
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* TAM */}
            <div className="absolute w-80 h-80 md:w-96 md:h-96 rounded-full border-2 border-white/10 bg-white/2 flex items-end justify-center pb-4">
              <div className="text-center">
                <div className="text-white/25 text-xs font-semibold tracking-widest uppercase">TAM</div>
                <div className="text-white font-black text-xl">$28B</div>
                <div className="text-white/35 text-xs">Global HR Tech</div>
              </div>
            </div>
            {/* SAM */}
            <div className="absolute w-56 h-56 md:w-64 md:h-64 rounded-full border-2 border-blue-500/30 bg-blue-600/8 flex items-end justify-center pb-4">
              <div className="text-center">
                <div className="text-blue-400/60 text-xs font-semibold tracking-widest uppercase">SAM</div>
                <div className="text-blue-300 font-black text-xl">$3B</div>
                <div className="text-white/35 text-xs">AI Assessment</div>
                <div className="text-blue-400/60 text-xs">14% CAGR</div>
              </div>
            </div>
            {/* SOM */}
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full border-2 border-cyan-400/50 bg-cyan-500/15 flex items-center justify-center">
              <div className="text-center px-2">
                <div className="text-cyan-400/70 text-xs font-semibold tracking-widest uppercase">SOM</div>
                <div className="text-cyan-300 font-black text-lg">SEA</div>
                <div className="text-white/45 text-xs leading-snug">+ ANZ<br />Year 1–2</div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { val: "$28B", label: "Total Addressable Market", sub: "Global HR tech & talent assessment", color: "text-white/70" },
            { val: "$3B", label: "Serviceable Addressable Market", sub: "AI-readiness & psychometric assessment, 14% CAGR", color: "text-blue-400" },
            { val: "SEA+", label: "Initial Target Market", sub: "SEA & ANZ early mover, UK/US expansion Year 3", color: "text-cyan-400" },
          ].map((m) => (
            <div key={m.label} className="bg-white/4 border border-white/8 rounded-xl px-5 py-4">
              <div className={`text-2xl font-black ${m.color}`}>{m.val}</div>
              <div className="text-white text-sm font-semibold mt-0.5">{m.label}</div>
              <div className="text-white/40 text-xs mt-1">{m.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Slide 8: Why We Win ──────────────────────────────────────────────────────
function Slide8() {
  const rows = [
    {
      competitor: "SHL / Korn Ferry",
      aiNative: false,
      continuous: false,
      health: false,
      affordable: false,
      note: "Slow, expensive, no AI layer",
    },
    {
      competitor: "HireVue",
      aiNative: false,
      continuous: false,
      health: false,
      affordable: false,
      note: "Video-only, no behavioural depth",
    },
    {
      competitor: "Culture Amp",
      aiNative: false,
      continuous: true,
      health: false,
      affordable: true,
      note: "Engagement only, no hiring or health",
    },
    {
      competitor: "Pymetrics",
      aiNative: true,
      continuous: false,
      health: false,
      affordable: false,
      note: "Games-based, limited depth",
    },
    {
      competitor: "HumanMetrix",
      aiNative: true,
      continuous: true,
      health: true,
      affordable: true,
      note: "Full stack — only player with this vision",
      highlight: true,
    },
  ];

  const cols = ["AI-Native", "Continuous", "Health Layer", "Accessible Pricing"];

  return (
    <div className="relative flex flex-col h-full px-8 md:px-20 py-16 overflow-hidden">
      <div className="absolute inset-0 bg-[#0f172a]" />
      <div className="relative z-10 flex flex-col h-full gap-6">
        <div>
          <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-2">Competitive Advantage</p>
          <h2 className="text-4xl md:text-5xl font-black text-white">
            Why HumanMetrix wins.
          </h2>
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-5 py-3 text-white/40 font-semibold text-xs tracking-widest uppercase w-1/3">Platform</th>
                  {cols.map((c) => (
                    <th key={c} className="text-center px-3 py-3 text-white/40 font-semibold text-xs tracking-widest uppercase">{c}</th>
                  ))}
                  <th className="text-left px-5 py-3 text-white/40 font-semibold text-xs tracking-widest uppercase">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.competitor}
                    className={`border-b border-white/5 last:border-0 ${
                      r.highlight ? "bg-cyan-500/10" : ""
                    }`}
                  >
                    <td className={`px-5 py-3.5 font-bold ${r.highlight ? "text-cyan-300" : "text-white/70"}`}>
                      {r.competitor}
                    </td>
                    {[r.aiNative, r.continuous, r.health, r.affordable].map((val, i) => (
                      <td key={i} className="text-center px-3 py-3.5">
                        {val ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400">
                            <Check className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/5 text-white/20">
                            <span className="text-xs">–</span>
                          </span>
                        )}
                      </td>
                    ))}
                    <td className={`px-5 py-3.5 text-xs ${r.highlight ? "text-cyan-300/80 font-medium" : "text-white/35"}`}>
                      {r.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Slide 9: Team ────────────────────────────────────────────────────────────
function Slide9() {
  const placeholders = [
    { role: "Co-Founder & CEO", focus: "AI strategy, psychometrics, product vision", initials: "YN" },
    { role: "Co-Founder & CTO", focus: "Platform architecture, ML systems, scalability", initials: "YN" },
    { role: "Head of Science", focus: "Assessment design, validity research, normative data", initials: "YN" },
    { role: "Head of Growth", focus: "B2B sales, partner acquisition, SEA market", initials: "YN" },
  ];

  return (
    <div className="relative flex flex-col h-full px-8 md:px-20 py-16 overflow-hidden">
      <div className="absolute inset-0 bg-[#0f172a]" />
      <div className="relative z-10 flex flex-col h-full gap-8">
        <div>
          <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-2">Team</p>
          <h2 className="text-4xl md:text-5xl font-black text-white">
            Built by people who understand<br />
            <span className="text-white/50">both AI and human behaviour.</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 flex-1 items-start">
          {placeholders.map((p) => (
            <div key={p.role} className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-white/10 flex items-center justify-center">
                <span className="text-xl font-black text-white/30 tracking-tighter">?</span>
              </div>
              <div>
                <div className="text-white/30 text-xs font-semibold tracking-widest uppercase leading-snug">[Your Name]</div>
                <div className="text-cyan-400 text-xs font-bold mt-1">{p.role}</div>
                <div className="text-white/35 text-xs mt-1 leading-snug">{p.focus}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/4 px-5 py-4">
            <div className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-2">Domain Expertise</div>
            <div className="flex flex-wrap gap-2">
              {["Psychometrics", "AI / LLMs", "HR Technology", "Behavioural Science", "SaaS Scaling", "SEA Markets"].map((tag) => (
                <span key={tag} className="px-2.5 py-0.5 rounded-full bg-white/8 text-white/55 text-xs border border-white/10">{tag}</span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/4 px-5 py-4">
            <div className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-2">Advisors</div>
            <div className="space-y-1.5">
              {["[Advisor — Industry / Academia]", "[Advisor — Enterprise HR]", "[Advisor — AI Research]"].map((a) => (
                <div key={a} className="text-white/30 text-xs">{a}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Slide 10: The Ask ────────────────────────────────────────────────────────
function Slide10() {
  const useOfFunds = [
    { label: "Product & Engineering", pct: 40, color: "bg-cyan-400" },
    { label: "Sales & Go-to-Market", pct: 40, color: "bg-blue-500" },
    { label: "Team & Operations", pct: 20, color: "bg-indigo-500" },
  ];

  const milestones = [
    "X enterprise partners signed",
    "£Y ARR achieved",
    "Z assessments completed",
    "UK / ANZ market entered",
  ];

  return (
    <div className="relative flex flex-col h-full px-8 md:px-20 py-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#0d1b35] to-[#0f172a]" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-cyan-600/5 blur-3xl" />
      </div>
      <div className="relative z-10 flex flex-col h-full gap-6">
        <div>
          <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-2">The Ask</p>
          <h2 className="text-4xl md:text-5xl font-black text-white">
            Join us in building<br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              the future of work.
            </span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 items-start">
          <div className="space-y-5">
            <div className="rounded-2xl border border-cyan-500/40 bg-cyan-500/8 p-6 text-center">
              <div className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-2">Raising</div>
              <div className="text-5xl font-black text-cyan-300">[AMOUNT]</div>
              <div className="text-white/40 text-sm mt-1">Seed / Pre-Series A</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/4 p-5 space-y-4">
              <div className="text-white/40 text-xs font-semibold tracking-widest uppercase">Use of Funds</div>
              {useOfFunds.map((f) => (
                <div key={f.label} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">{f.label}</span>
                    <span className="text-white font-bold text-sm">{f.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div className={`h-full rounded-full ${f.color}`} style={{ width: `${f.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-white/4 p-5 space-y-3">
              <div className="text-white/40 text-xs font-semibold tracking-widest uppercase">This round gets us to</div>
              {milestones.map((m) => (
                <div key={m} className="flex items-start gap-3 text-white/65 text-sm">
                  <div className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ArrowRight className="w-2.5 h-2.5 text-cyan-400" />
                  </div>
                  {m}
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/4 p-5 space-y-3">
              <div className="text-white/40 text-xs font-semibold tracking-widest uppercase">Get in touch</div>
              <div className="space-y-2">
                <div className="text-white font-bold text-lg">hello@humanmetrix.com</div>
                <div className="text-white/45 text-sm">humanmetrix.com</div>
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-bold shadow-lg shadow-cyan-500/20">
                  Book a demo
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main PitchDeck component ─────────────────────────────────────────────────
const slides = [Slide1, Slide2, Slide3, Slide4, Slide5, Slide6, Slide7, Slide8, Slide9, Slide10];

export default function PitchDeck() {
  const [current, setCurrent] = useState(1);
  const [downloading, setDownloading] = useState(false);

  const goNext = useCallback(() => setCurrent((c) => Math.min(c + 1, TOTAL_SLIDES)), []);
  const goPrev = useCallback(() => setCurrent((c) => Math.max(c - 1, 1)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await generateAndDownloadPitchPptx();
    } finally {
      setDownloading(false);
    }
  }, []);

  const CurrentSlide = slides[current - 1];

  return (
    <div className="fixed inset-0 bg-[#0f172a] text-white overflow-hidden select-none">
      <div className="w-full h-full relative">
        <CurrentSlide />
      </div>
      <SlideCounter current={current} total={TOTAL_SLIDES} />
      <NavButtons current={current} total={TOTAL_SLIDES} onPrev={goPrev} onNext={goNext} />

      {/* Download PPTX button — fixed bottom-left */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        data-testid="button-download-pptx"
        className="fixed bottom-8 left-8 z-50 flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm text-white/70 text-sm font-medium hover:bg-white/10 hover:text-white hover:border-white/35 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <Download className="w-3.5 h-3.5" />
        {downloading ? "Generating…" : "Download PPTX"}
      </button>
    </div>
  );
}
