import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO, BreadcrumbSchema, FAQSchema } from "@/lib/seo";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Target,
  ShieldCheck,
  Globe,
  Layers,
  Briefcase,
  Scale,
  CheckCircle,
  Video,
} from "lucide-react";
import explainerVideoOne from "@assets/VIDEO-2026-06-25-20-57-58_1782396782413.mp4";
import explainerVideoTwo from "@assets/VIDEO-2026-06-25-20-58-26_1782396789055.mp4";

const faqs = [
  {
    question: "How does HumanMetrix score assessments?",
    answer:
      "Responses are evaluated by GPT-5 against a benchmarked golden set of reference answers. The golden set anchors the model's judgement so that the same answer receives a consistent score every time, regardless of when or where the assessment is taken.",
  },
  {
    question: "Why are HumanMetrix assessments shorter than traditional psychometric tests?",
    answer:
      "We use a situational-judgement framework that targets the behaviours and reasoning most predictive of on-the-job performance, rather than long inventories of repetitive items. This keeps completion times low while focusing measurement on the signals that matter for hiring decisions.",
  },
  {
    question: "Can HumanMetrix assess roles that are not in the standard library?",
    answer:
      "Yes. Roles are defined by their competencies and an accompanying job description, and our AI generates the required skill-score profile used for matching. This lets us tailor assessments to specialist, non-technical and safety-critical roles, including ones not yet in the default library.",
  },
  {
    question: "Does the assessment content adapt by region?",
    answer:
      "Assessment content can be localised by region, and benchmarking, currency and Purchasing Power Parity pricing adapt by country, so candidates are compared fairly against relevant peers rather than a single Euro-centric default.",
  },
];

export default function Methodology() {
  const CALENDLY_URL = "https://calendly.com/hello-humanmetrix/30min";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Assessment Methodology - How HumanMetrix Scoring Works"
        description="How HumanMetrix measures behavioural fit and AI literacy: attribution-based scoring with GPT-5 against a benchmarked golden set, situational-judgement design for predictive validity, role customisation and regional relevance."
        canonical="/methodology"
        keywords="assessment methodology, psychometric scoring, situational judgement test, predictive validity, golden set benchmark, AI scoring, role customisation, regional benchmarking"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Methodology", url: "/methodology" },
        ]}
      />
      <FAQSchema faqs={faqs} />
      <Navigation />

      <main className="flex-grow py-8 md:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/">
            <Button variant="ghost" className="mb-4 md:mb-6" data-testid="button-back-home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <div className="mb-8 md:mb-12">
            <Badge variant="outline" className="mb-3 md:mb-4">
              <Brain className="mr-1.5 h-3 w-3 md:h-4 md:w-4 inline" />
              Methodology
            </Badge>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4" data-testid="text-page-title">
              How HumanMetrix Measures What Matters
            </h1>
            <p className="text-base md:text-xl text-muted-foreground">
              HumanMetrix combines validated psychometric design with AI-powered scoring to measure behavioural fit
              and practical AI literacy. This page explains how our assessments are built, scored and kept
              consistent, fair and relevant to the role and region you are hiring for.
            </p>
          </div>

          <div className="space-y-6 md:space-y-8">
            <Card className="p-5 md:p-8">
              <h2 className="text-lg md:text-2xl font-semibold mb-4 md:mb-6 flex items-center gap-2">
                <Video className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                Watch the explainers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <video
                    controls
                    preload="metadata"
                    aria-label="HumanMetrix methodology explainer video 1"
                    className="w-full rounded-md border bg-black"
                    data-testid="video-explainer-one"
                  >
                    <source src={explainerVideoOne} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div>
                  <video
                    controls
                    preload="metadata"
                    aria-label="HumanMetrix methodology explainer video 2"
                    className="w-full rounded-md border bg-black"
                    data-testid="video-explainer-two"
                  >
                    <source src={explainerVideoTwo} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-8">
              <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Target className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold mb-2">The scoring model</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Each response is evaluated using an attribution-based model: we map what a candidate says and
                    does to the underlying competency it demonstrates. Scoring is performed by GPT-5 against a
                    benchmarked golden set of reference answers. The golden set anchors the model's judgement so
                    that an equivalent answer receives an equivalent score every time — removing the drift and
                    rater subjectivity that affect manual scoring.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-8">
              <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold mb-2">Short by design, built for prediction</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Traditional psychometric instruments rely on long inventories of repetitive items. HumanMetrix
                    uses a situational-judgement framework that concentrates measurement on the behaviours and
                    reasoning most predictive of on-the-job performance. The result is a far shorter experience for
                    the candidate that still produces a rich, defensible signal for the hiring team — improving
                    completion rates without sacrificing rigour.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-8">
              <h2 className="text-lg md:text-2xl font-semibold mb-4 md:mb-6 flex items-center gap-2">
                <Layers className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                The four assessments
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <h3 className="font-semibold text-sm md:text-base mb-1">FIT</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Core behavioural competencies — agency, curiosity, resilience, empathy and growth mindset —
                    measured with validated psychometric techniques.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm md:text-base mb-1">AI Readiness</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Practical AI fluency, from foundational prompting to multi-step reasoning, identifying who is
                    ready to thrive in AI-augmented work.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm md:text-base mb-1">Prompt Architecture</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Advanced prompt-engineering skill, iterative refinement and structured reasoning — the core
                    technical AI skill for knowledge workers.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm md:text-base mb-1">Algorithmic Integrity Quotient (AIQ)</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Ethical AI understanding, bias awareness, fairness and responsible deployment — essential for
                    any role making decisions with AI.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-8">
              <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold mb-2">Built for every role, not just tech</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Behavioural fit and responsible AI judgement matter well beyond software roles. The same
                    methodology extends to non-technical and safety-critical fields — engineering, construction,
                    healthcare, operations and frontline services — where decision quality, ethics and adaptability
                    carry real consequences. Competencies and thresholds are calibrated to the demands of the role
                    rather than a one-size-fits-all template.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-8">
              <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Target className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold mb-2">Tailored to your roles</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Assessments are not limited to a fixed catalogue. A role is defined by its competencies — each
                    with an importance weighting and a minimum score — together with a job description. Our AI uses
                    that definition to generate the required skill-score profile a strong candidate should meet, and
                    to drive role-fit matching and analysis. This means we can tailor assessments to specialist
                    positions and to roles that are not yet in the standard library, informed directly by the job
                    description you provide.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-8">
              <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold mb-2">Regional relevance</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Talent markets are not interchangeable. HumanMetrix supports regionally localised assessment
                    content, and benchmarking, currency and Purchasing Power Parity pricing adapt by country. That
                    means candidates are compared against relevant peer cohorts and priced fairly for their market,
                    rather than measured against a single Euro-centric default.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-8">
              <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Scale className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold mb-2">Fairness and consistency</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Consistency is a fairness issue. By scoring against a fixed golden set, every candidate is
                    held to the same standard, and results are reproducible rather than dependent on who is marking.
                    Results are gated behind explicit candidate consent for sharing, and the AIQ assessment keeps
                    bias awareness and responsible AI use central to how we evaluate — and how we build.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-8 bg-primary/5 border-primary/20">
              <h2 className="text-lg md:text-2xl font-semibold mb-2">See the methodology in practice</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                Explore our assessments, review a sample report, or talk to us about tailoring an assessment to a
                specific role.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/assessments">
                  <Button className="w-full sm:w-auto" data-testid="button-view-assessments">
                    View Assessments
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full sm:w-auto" data-testid="button-book-consultation">
                    Book a Consultation
                  </Button>
                </a>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
