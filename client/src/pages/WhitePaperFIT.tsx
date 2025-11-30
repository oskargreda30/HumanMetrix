import { Link } from "wouter";
import { ArrowLeft, Download, FileText } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEO } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function WhitePaperFIT() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEO 
        title="FIT Test Design White Paper - Scientific Rationale"
        description="Explore the scientific rationale behind the FIT psychometric assessment - a 15-question instrument measuring six high-impact professional skills essential for modern AI work performance."
        canonical="/articles/white-paper-fit-test"
      />
      <Navigation />
      
      <main className="flex-grow py-8 md:py-16 px-4">
        <article className="max-w-3xl mx-auto">
          <Link href="/articles">
            <Button variant="ghost" className="mb-6 text-slate-600 hover:text-slate-900" data-testid="link-back-articles">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Articles
            </Button>
          </Link>

          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant="secondary">White Paper</Badge>
              <Badge className="bg-blue-500 hover:bg-blue-600">Research</Badge>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
              FIT Test Design – White Paper
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Technical Documentation
              </span>
            </div>
          </header>

          <div className="prose prose-slate prose-lg max-w-none">
            <Card className="mb-8 bg-gradient-to-r from-slate-100 to-slate-50 border-slate-200">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-3 mt-0">Executive Summary</h2>
                <p className="text-slate-700 mb-0">
                  This report outlines the design and scientific rationale behind the FIT psychometric assessment — a 15-question instrument built to evaluate six high-impact professional skills essential for modern AI work performance. The goal during development was to translate established psychological science into a practical, reliable, and scalable tool that identifies behavioural tendencies with real relevance to today's AI work environment.
                </p>
              </CardContent>
            </Card>

            <p className="text-slate-700 mb-6">
              Every component of FIT — from the definition of each skill to the behavioural indicators, to the construction of scenarios — was shaped by psychometric evidence and contemporary workforce research. The test was engineered to measure how individuals think, decide, and act in realistic professional situations.
            </p>

            <p className="text-slate-700 mb-8">
              Each of the six competencies was operationalised into specific behavioural patterns, and guided the creation of the 15 situational multiple-choice questions. The resulting assessment is practical enough for use in hiring and development, yet scientifically rigorous in its structure and logic. It gives organisations a clear, behaviour-based view of how individuals are likely to perform in dynamic, cognitively demanding environments.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Foundations of Psychometric Assessment
            </h2>
            
            <p className="text-slate-700 mb-6">
              The development of FIT was grounded in psychometric principles to ensure that all 15 questions measure the intended skills consistently and meaningfully. Rather than referencing reliability and validity as abstract standards, these principles were applied directly throughout the design process.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">
              Reliability in the FIT Test Design
            </h3>
            
            <p className="text-slate-700 mb-4">
              Reliability refers to a test's ability to produce stable, consistent results. In FIT, this was approached through:
            </p>

            <ul className="space-y-3 text-slate-600 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Internal consistency:</strong> Items linked to the same competency were written to target the same underlying behavioural pattern. During development, any question that did not align cleanly with the competency's behavioural indicators was rewritten or removed.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Consistency of reasoning demands:</strong> Scenarios were designed so that the reasoning required to choose the most effective option remains stable across administrations.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Clear response logic:</strong> Each item's answer options were structured to consistently reflect a progression from ineffective to highly effective behaviour, ensuring uniform scoring across all test-takers.</span>
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">
              Validity Applied in Test Construction
            </h3>
            
            <p className="text-slate-700 mb-4">
              Validity ensures that the test measures exactly what it intends to measure. FIT incorporated the key forms of validity during item development:
            </p>

            <ul className="space-y-3 text-slate-600 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Content validity:</strong> Every competency in the model was first broken into behavioural components. These components directly informed the scenarios and response options.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Construct validity:</strong> Item logic was designed to reflect the cognitive or behavioural mechanism behind the skill, not mere knowledge recall.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Criterion relevance:</strong> Because the questions simulate real workplace situations, the behaviours they measure map closely onto what predicts performance in professional environments.</span>
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Conceptual Framework and Behavioural Manifestations
            </h2>
            
            <p className="text-slate-700 mb-6">
              The FIT assessment measures six core competencies that research identifies as central to navigating complex, modern AI work environments. During development, each competency was translated into a clear definition, a behavioural framework, and practical indicators that informed the design of the 15 situational questions.
            </p>

            <div className="grid gap-4 mb-8">
              <Card className="border-slate-200">
                <CardContent className="p-5">
                  <h4 className="font-semibold text-slate-900 mb-2">1. High Agency & Proactiveness</h4>
                  <p className="text-slate-600 text-sm">Reflects an individual's ability to take ownership, act decisively, and initiate progress without relying on excessive guidance.</p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-5">
                  <h4 className="font-semibold text-slate-900 mb-2">2. Intellectual Curiosity & Unlearning Ability</h4>
                  <p className="text-slate-600 text-sm">Captures a person's willingness to seek information, question assumptions, and revise their understanding when presented with new evidence.</p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-5">
                  <h4 className="font-semibold text-slate-900 mb-2">3. Resilience & Ambiguity Tolerance</h4>
                  <p className="text-slate-600 text-sm">Represents the ability to remain stable, effective, and constructive when situations become uncertain, stressful, or unclear.</p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-5">
                  <h4 className="font-semibold text-slate-900 mb-2">4. Empathy & Ethical Compass</h4>
                  <p className="text-slate-600 text-sm">Combines emotional understanding with fair, principled decision-making that considers the impact on others.</p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-5">
                  <h4 className="font-semibold text-slate-900 mb-2">5. Growth Mindset</h4>
                  <p className="text-slate-600 text-sm">Reflects how an individual approaches learning, challenge, and feedback, as well as their belief in the potential for improvement.</p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-5">
                  <h4 className="font-semibold text-slate-900 mb-2">6. Interpersonal Agility</h4>
                  <p className="text-slate-600 text-sm">Refers to the ability to adapt communication and behaviour across diverse individuals and social contexts.</p>
                </CardContent>
              </Card>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Test Design and Question Construction Methodology
            </h2>
            
            <p className="text-slate-700 mb-6">
              The 15 questions in the FIT assessment were created through a structured, research-driven design process. The goal was to transform the six competencies into realistic decision-making scenarios that reliably reveal how individuals behave in challenging or ambiguous professional situations.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">
              Situational Judgement Question Design
            </h3>
            
            <p className="text-slate-700 mb-4">
              All questions in the FIT assessment use a situational judgement format. Throughout development, we applied established SJT design practices:
            </p>

            <ul className="space-y-3 text-slate-600 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>Each item presents a realistic workplace situation involving conflict, uncertainty, competing priorities, or team dynamics.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>Response options represent distinct behavioural strategies, intentionally ranging from ineffective to highly effective.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>The options differentiate reasoning styles, not personality labels or knowledge facts.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>Scenarios are written to be universally relatable, avoiding domain-specific expertise or demographic bias.</span>
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Standardisation and Fairness
            </h2>
            
            <p className="text-slate-700 mb-6">
              To uphold standardisation, all test-takers receive the same questions, with identical instructions and fixed scoring logic. Fairness was built into the wording of each scenario: items avoid culturally specific assumptions, unnecessarily technical language, or references that would advantage certain groups.
            </p>

            <p className="text-slate-700 mb-8">
              Because FIT uses fixed-response questions (not AI-interpreted inputs), scoring remains transparent and free of algorithmic bias. Through these applied psychometric choices, FIT functions as a precise and trustworthy assessment of six skills that are increasingly vital for effective performance.
            </p>

            <Card className="bg-gradient-to-r from-cyan-500 to-blue-600 border-0">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-semibold text-white mb-2">Take the FIT Assessment</h3>
                <p className="text-cyan-100 mb-4">
                  Experience our scientifically-designed assessment and discover your professional strengths.
                </p>
                <Link href="/assessments">
                  <Button className="bg-white text-cyan-600 hover:bg-cyan-50" data-testid="button-view-assessments">
                    View Assessments
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
