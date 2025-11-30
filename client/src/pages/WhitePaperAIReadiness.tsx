import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEO } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function WhitePaperAIReadiness() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEO 
        title="AI Readiness Test White Paper - Psychometric Assessment Design"
        description="Discover the scientific foundation of our AI Readiness psychometric assessment, measuring nine critical skills for success in an AI-driven professional landscape."
        canonical="/articles/white-paper-ai-readiness-test"
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
              AI Readiness Test – White Paper
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
                  The rapid integration of Artificial Intelligence (AI) across diverse industries necessitates a fundamental re-evaluation of essential workforce competencies. This foundational white paper introduces a novel psychometric assessment designed to measure nine critical skills, positioning individuals for success in an AI-driven professional landscape. The assessment is meticulously crafted, constructing its 21 questions, scoring system, and skills legend to elucidate the underlying psychological and methodological foundations.
                </p>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Purpose and Scope in the Modern Workforce
            </h2>
            
            <p className="text-slate-700 mb-6">
              The pervasive impact of Artificial Intelligence (AI) on the workplace fundamentally shifts the focus of workforce assessment from purely technical AI proficiency to the human capabilities that effectively integrate with and leverage AI. The rapid integration of AI across industries necessitates a fundamental re-evaluation of essential workforce competencies.
            </p>

            <p className="text-slate-700 mb-6">
              The World Economic Forum's Future of Jobs Report 2025 highlights that while AI will perform human-like work at machine speed, human interaction and "durable skills" remain critical. By 2030, approximately 66% of all tasks will still require human input or human-technology collaboration.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Overview of the 9 Assessed Skills
            </h2>
            
            <p className="text-slate-700 mb-6">
              The assessment evaluates nine interconnected skills deemed vital for navigating and excelling in the contemporary AI-integrated workplace:
            </p>

            <div className="grid gap-3 mb-8">
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-slate-900 mb-1">1. AI Literacy & Prompt Engineering</h4>
                  <p className="text-slate-600 text-sm mb-0">Understanding AI systems, interacting effectively, and evaluating outputs critically using the CLEAR principles.</p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-slate-900 mb-1">2. Technical Fundamentals</h4>
                  <p className="text-slate-600 text-sm mb-0">Core technical knowledge required to work alongside AI systems effectively.</p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-slate-900 mb-1">3. Data Fluency</h4>
                  <p className="text-slate-600 text-sm mb-0">Ability to interpret, analyse, and draw insights from data.</p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-slate-900 mb-1">4. Critical Thinking & Problem-Solving</h4>
                  <p className="text-slate-600 text-sm mb-0">Analytical reasoning and structured approach to complex challenges.</p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-slate-900 mb-1">5. Adaptability & Continuous Learning</h4>
                  <p className="text-slate-600 text-sm mb-0">Flexibility and commitment to ongoing skill development.</p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-slate-900 mb-1">6. Collaboration & Communication</h4>
                  <p className="text-slate-600 text-sm mb-0">Working effectively with others and conveying ideas clearly.</p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-slate-900 mb-1">7. Responsible AI & Ethical Awareness</h4>
                  <p className="text-slate-600 text-sm mb-0">Understanding ethical implications and responsible use of AI technology.</p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-slate-900 mb-1">8. Creativity & Innovation</h4>
                  <p className="text-slate-600 text-sm mb-0">Generating novel ideas and approaches in an AI-augmented environment.</p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-slate-900 mb-1">9. Domain Expertise</h4>
                  <p className="text-slate-600 text-sm mb-0">Deep knowledge in specific professional areas that AI enhances rather than replaces.</p>
                </CardContent>
              </Card>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Foundational Psychometric Principles
            </h2>
            
            <p className="text-slate-700 mb-6">
              Psychometrics is the scientific discipline concerned with measuring psychological attributes such as abilities, traits, behaviours, and decision-making patterns. Four core principles—Reliability, Validity, Standardization, and Fairness—form the backbone of all high-quality assessments.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">
              Reliability: Consistent and Stable Measurement
            </h3>
            
            <p className="text-slate-700 mb-4">
              Reliability refers to the degree to which a test produces consistent, stable, and repeatable measurements. In this assessment:
            </p>

            <ul className="space-y-3 text-slate-600 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Internal consistency:</strong> Items belonging to the same sub-skill were designed to reflect a single underlying construct.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Temporal stability:</strong> Scenarios were written to measure enduring behavioural tendencies rather than moment-specific reactions.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>AI-assisted scoring stability:</strong> AI scoring consistently recognises patterns of decision style across a wide range of response types.</span>
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">
              Validity: Measuring What We Intend
            </h3>
            
            <p className="text-slate-700 mb-4">
              Validity determines whether a test actually measures the constructs it claims to measure:
            </p>

            <ul className="space-y-3 text-slate-600 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Content validity:</strong> Each skill was mapped to behavioural indicators, workplace use cases, and contemporary frameworks of AI-age capability.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Construct validity:</strong> Answer options were designed to reflect increasing levels of proficiency aligned with theoretical expectations.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Criterion validity:</strong> Because items simulate practical decision-making, the test captures what individuals are likely to do in analogous situations at work.</span>
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">
              Standardization and Fairness
            </h3>
            
            <p className="text-slate-700 mb-6">
              Standardization ensures that all test-takers experience the assessment under equivalent conditions. In an AI-supported assessment, this includes ensuring that every candidate receives scenarios of comparable difficulty and that AI-assisted components apply identical scoring logic.
            </p>

            <p className="text-slate-700 mb-8">
              Fairness ensures that the test does not disadvantage any individual or group. Items were designed to avoid cultural, linguistic, or situational assumptions that might influence interpretation. Answer options represent differences in reasoning rather than differences in lived experience.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              AI Literacy & Prompt Engineering: Deep Dive
            </h2>
            
            <p className="text-slate-700 mb-6">
              AI literacy and prompt engineering were defined as the ability to understand AI systems, interact with them effectively, and evaluate their outputs critically. The CLEAR principles—Concise, Logical, Explicit, Adaptive, and Reflective—were used to establish what effective prompting behaviour looks like within realistic workplace contexts.
            </p>

            <Card className="mb-8 border-slate-200">
              <CardContent className="p-6">
                <h4 className="font-semibold text-slate-900 mb-3">Measurement Approach</h4>
                <p className="text-slate-600 text-sm">
                  To measure this skill, the test uses situational judgement multiple-choice items that reflect realistic interactions with AI systems. Scenarios present ambiguous or flawed AI outputs, unclear prompts, or decision points about how to structure a query. Each set of options reflects behaviours ranging from ineffective prompting to highly strategic, CLEAR-aligned approaches.
                </p>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              The Role of AI in Assessment
            </h2>
            
            <p className="text-slate-700 mb-6">
              With the rise of AI-supported assessments, psychometric foundations take on even greater importance. AI introduces opportunities for efficiency, richer behavioural data, and more dynamic forms of measurement. However, it also introduces risks: opacity in AI decision-making, algorithmic bias, data protections, and the need for ongoing calibration.
            </p>

            <p className="text-slate-700 mb-8">
              Throughout the test's design, the guiding philosophy was that psychometrics should not simply tolerate AI integration but actively shape how AI is used. The aim was to ensure that every AI-supported feature strengthens rather than undermines the trustworthiness of the test.
            </p>

            <Card className="bg-gradient-to-r from-cyan-500 to-blue-600 border-0">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-semibold text-white mb-2">Assess Your AI Readiness</h3>
                <p className="text-cyan-100 mb-4">
                  Take our comprehensive assessment and discover your strengths across all nine critical skills.
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
