import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";
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
        title="FIT Test White Paper - Behavioural Assessment Design | HumanMetrix"
        description="HumanMetrix FIT psychometric test white paper: scientific rationale behind our behavioural assessment measuring six skills."
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

          <div className="prose prose-slate prose-base max-w-none">
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
                  <p className="text-slate-600 text-sm mb-3">Reflects an individual's ability to take ownership, act decisively, and initiate progress without relying on excessive guidance.</p>
                  <div className="bg-slate-50 border-l-4 border-cyan-500 p-3">
                    <p className="text-slate-700 text-sm mb-2"><strong>Behavioural manifestations used in item design:</strong></p>
                    <ul className="text-slate-600 space-y-1 text-sm list-disc list-inside">
                      <li>Taking initiative instead of waiting for direction</li>
                      <li>Moving tasks forward proactively, even when information is incomplete</li>
                      <li>Addressing obstacles independently rather than deferring action</li>
                      <li>Choosing decisive and constructive steps rather than passive approaches</li>
                      <li>Demonstrating personal responsibility for outcomes</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-5">
                  <h4 className="font-semibold text-slate-900 mb-2">2. Intellectual Curiosity & Unlearning Ability</h4>
                  <p className="text-slate-600 text-sm mb-3">Captures a person's willingness to seek information, question assumptions, and revise their understanding when presented with new evidence.</p>
                  <div className="bg-slate-50 border-l-4 border-cyan-500 p-3">
                    <p className="text-slate-700 text-sm mb-2"><strong>Behavioural manifestations:</strong></p>
                    <ul className="text-slate-600 space-y-1 text-sm list-disc list-inside">
                      <li>Asking questions to understand context more fully</li>
                      <li>Actively seeking new or alternative perspectives</li>
                      <li>Challenging outdated assumptions or habitual thinking</li>
                      <li>Demonstrating openness to replacing old approaches with better ones</li>
                      <li>Showing interest in learning, exploration, and deeper understanding</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-5">
                  <h4 className="font-semibold text-slate-900 mb-2">3. Resilience & Ambiguity Tolerance</h4>
                  <p className="text-slate-600 text-sm mb-3">Represents the ability to remain stable, effective, and constructive when situations become uncertain, stressful, or unclear.</p>
                  <div className="bg-slate-50 border-l-4 border-cyan-500 p-3">
                    <p className="text-slate-700 text-sm mb-2"><strong>Behavioural manifestations:</strong></p>
                    <ul className="text-slate-600 space-y-1 text-sm list-disc list-inside">
                      <li>Staying composed when priorities shift or instructions are vague</li>
                      <li>Responding constructively to stress, setbacks, or time pressure</li>
                      <li>Continuing progress despite unclear conditions</li>
                      <li>Maintaining emotional regulation during unexpected challenges</li>
                      <li>Choosing stabilising, problem-solving actions rather than reactive ones</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-5">
                  <h4 className="font-semibold text-slate-900 mb-2">4. Empathy & Ethical Compass</h4>
                  <p className="text-slate-600 text-sm mb-3">Combines emotional understanding with fair, principled decision-making that considers the impact on others.</p>
                  <div className="bg-slate-50 border-l-4 border-cyan-500 p-3">
                    <p className="text-slate-700 text-sm mb-2"><strong>Behavioural manifestations:</strong></p>
                    <ul className="text-slate-600 space-y-1 text-sm list-disc list-inside">
                      <li>Recognising and respecting the needs, feelings, or perspectives of others</li>
                      <li>Weighing human consequences when making decisions</li>
                      <li>Acting with fairness, consistency, and integrity</li>
                      <li>Choosing compassionate behaviour that does not compromise standards</li>
                      <li>Avoiding actions that disadvantage or disregard others</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-5">
                  <h4 className="font-semibold text-slate-900 mb-2">5. Growth Mindset</h4>
                  <p className="text-slate-600 text-sm mb-3">Reflects how an individual approaches learning, challenge, and feedback, as well as their belief in the potential for improvement.</p>
                  <div className="bg-slate-50 border-l-4 border-cyan-500 p-3">
                    <p className="text-slate-700 text-sm mb-2"><strong>Behavioural manifestations:</strong></p>
                    <ul className="text-slate-600 space-y-1 text-sm list-disc list-inside">
                      <li>Viewing difficult tasks as opportunities for growth</li>
                      <li>Responding positively to constructive feedback</li>
                      <li>Persisting through challenge instead of giving up</li>
                      <li>Demonstrating willingness to adjust approach based on new input</li>
                      <li>Showing belief in development rather than fixed limitations</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-5">
                  <h4 className="font-semibold text-slate-900 mb-2">6. Interpersonal Agility</h4>
                  <p className="text-slate-600 text-sm mb-3">Refers to the ability to adapt communication and behaviour across diverse individuals and social contexts.</p>
                  <div className="bg-slate-50 border-l-4 border-cyan-500 p-3">
                    <p className="text-slate-700 text-sm mb-2"><strong>Behavioural manifestations:</strong></p>
                    <ul className="text-slate-600 space-y-1 text-sm list-disc list-inside">
                      <li>Adjusting communication style to suit different people</li>
                      <li>Navigating interpersonal friction professionally and calmly</li>
                      <li>Collaborating constructively with varied personalities</li>
                      <li>Maintaining respectful, appropriate conduct even under pressure</li>
                      <li>Demonstrating flexibility in how relationships are managed</li>
                    </ul>
                  </div>
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
              Translating Competencies into Behavioural Decision Points
            </h3>
            
            <p className="text-slate-700 mb-4">
              The design process began by breaking each FIT competency into the specific behaviours that indicate strong or weak performance. These behavioural indicators served as the blueprint for constructing the scenarios. Instead of asking candidates to self-report tendencies, the assessment measures how they act when placed inside professionally relevant situations.
            </p>
            
            <p className="text-slate-700 mb-4">For each competency, we identified:</p>
            <ul className="space-y-2 text-slate-600 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>Situations where the behaviour naturally appears</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>Common workplace challenges that differentiate high performers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>Decision points that reveal underlying thought processes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>Typical ineffective and effective behavioural patterns</span>
              </li>
            </ul>

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

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">
              Constructing Response Options: Behavioural Gradients
            </h3>
            
            <p className="text-slate-700 mb-4">
              Every response option in FIT was created using a behavioural gradient model—an approach that ensures each option represents a meaningful position along a continuum of effectiveness.
            </p>
            
            <p className="text-slate-700 mb-4">For each question, the design team defined:</p>
            <ul className="space-y-2 text-slate-600 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>The least constructive behavioural response</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>The moderately effective behaviours that show partial skill use</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>The most effective response aligned with the competency definition</span>
              </li>
            </ul>
            
            <p className="text-slate-700 mb-8">
              This structure ensures that the scoring reflects the quality of reasoning and decision-making rather than preference or stylistic differences. All 15 questions were reviewed repeatedly to ensure that the reasoning behind each option clearly reflects the skill being measured.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Test Structure and Question Allocation
            </h2>
            
            <p className="text-slate-700 mb-6">
              The FIT assessment was designed as a concise, 15-question instrument that measures six core behavioural competencies through scenario-based decision-making. Instead of assigning fixed numbers of questions to each skill, FIT uses an attribution-based scoring model where each question may contribute to one or more competencies depending on the answer selected.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">
              Overall Test Structure
            </h3>
            
            <p className="text-slate-700 mb-8">
              The assessment exclusively uses situational judgement multiple-choice items, each presenting a realistic workplace scenario followed by several behavioural response options. This structure was chosen because it captures behavioural tendencies rather than self-perception and increases ecological validity by reflecting real-world decision-making. Each question was crafted to reveal how a person thinks and behaves in situations involving ambiguity, conflict, change, or interpersonal dynamics.
            </p>

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
