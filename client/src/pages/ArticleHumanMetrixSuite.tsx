import { Link } from "wouter";
import { ArrowLeft, Calendar, Clock, Brain, Target, Lightbulb, Shield } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEO } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function ArticleHumanMetrixSuite() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEO 
        title="HumanMetrix AI Assessment Suite | Complete Platform Overview"
        description="Discover HumanMetrix's four core assessments—FIT, AI Readiness, Prompt Architecture, and AIQ—providing comprehensive insights into AI-era workplace readiness."
        canonical="/articles/humanmetrix-ai-assessment-suite"
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
              <Badge variant="secondary">Product</Badge>
              <Badge className="bg-cyan-500 hover:bg-cyan-600">Featured</Badge>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
              Introducing HumanMetrix: The Complete AI-Era Assessment Platform
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                December 2025
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                6 min read
              </span>
            </div>
          </header>

          <div className="prose prose-slate prose-base max-w-none">
            <p className="lead text-base md:text-lg text-slate-600 mb-6">
              As artificial intelligence transforms every industry, the skills that define workplace success are evolving rapidly. HumanMetrix has developed a comprehensive assessment platform designed specifically for this new era—measuring not just traditional competencies, but the critical capabilities needed to thrive alongside AI.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              The Four Pillars of AI-Era Assessment
            </h2>
            
            <p className="text-slate-700 mb-6">
              Our platform comprises four distinct assessments, each targeting a crucial dimension of modern workplace readiness. Together, they provide a complete picture of a candidate's potential to succeed in an AI-augmented environment.
            </p>

            <Card className="mb-6 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-cyan-100 rounded-lg shrink-0">
                    <Target className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">FIT Assessment</h3>
                    <p className="text-slate-600 mb-3">
                      The Foundation for Individual Talent assessment measures six core professional skills that remain essential regardless of technological change: Adaptability, Collaboration, Problem Solving, Communication, Initiative, and Resilience.
                    </p>
                    <p className="text-slate-600">
                      These foundational competencies form the bedrock upon which AI collaboration skills are built. Candidates who score highly on FIT demonstrate the human qualities that complement AI capabilities rather than competing with them.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg shrink-0">
                    <Brain className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">AI Readiness Assessment</h3>
                    <p className="text-slate-600 mb-3">
                      This assessment evaluates nine critical skills that position individuals for success in an AI-driven professional landscape: AI Tool Proficiency, Data Literacy, Algorithmic Thinking, Critical AI Evaluation, Continuous Learning, and more.
                    </p>
                    <p className="text-slate-600">
                      As AI tools become ubiquitous across industries, understanding how to effectively leverage these technologies becomes a baseline expectation for many roles.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg shrink-0">
                    <Lightbulb className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Prompt Architecture Assessment</h3>
                    <p className="text-slate-600 mb-3">
                      The ability to communicate effectively with AI systems has emerged as a critical workplace skill. This assessment measures six key competencies: Clarity of Communication, Contextual Awareness, Task Decomposition, Iterative Refinement, Output Specification, and Constraint Setting.
                    </p>
                    <p className="text-slate-600">
                      Strong prompt engineers can extract significantly more value from AI tools, making this skill increasingly valuable across all industries.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-8 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-100 rounded-lg shrink-0">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">AIQ (AI Ethics Quotient) Assessment</h3>
                    <p className="text-slate-600 mb-3">
                      As organisations navigate the ethical implications of AI adoption, they need team members who can identify and address potential issues. AIQ measures six dimensions: Bias Recognition, Privacy Awareness, Transparency Advocacy, Accountability Understanding, Fairness Assessment, and Human Oversight.
                    </p>
                    <p className="text-slate-600">
                      High AIQ scores indicate candidates who will help organisations deploy AI responsibly and maintain stakeholder trust.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Why a Comprehensive Approach Matters
            </h2>
            
            <p className="text-slate-700 mb-6">
              Traditional assessments focus on individual competencies in isolation. HumanMetrix recognises that success in the AI era requires a balanced combination of foundational human skills, technical AI literacy, practical AI communication abilities, and ethical awareness.
            </p>

            <p className="text-slate-700 mb-6">
              By assessing all four dimensions, employers gain insights into:
            </p>

            <ul className="space-y-3 text-slate-600 mb-8">
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Immediate readiness:</strong> Can this candidate effectively use AI tools from day one?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Growth potential:</strong> Does this candidate have the foundational skills to adapt as AI evolves?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Risk awareness:</strong> Will this candidate help the organisation use AI responsibly?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Team fit:</strong> How will this candidate's AI capabilities complement existing team members?</span>
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Getting Started with HumanMetrix
            </h2>
            
            <p className="text-slate-700 mb-6">
              Whether you're a candidate looking to demonstrate your AI-era readiness or an employer seeking to build an AI-capable workforce, HumanMetrix provides the insights you need. Our assessments are designed to be completed in under two hours total, with results delivered immediately.
            </p>

            <Card className="mb-8 bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Ready to Assess Your AI-Era Potential?</h3>
                <p className="text-slate-600 mb-4">
                  Take all four assessments and receive a comprehensive report on your workplace readiness.
                </p>
                <Link href="/assessments?view=candidate">
                  <Button className="bg-cyan-500 hover:bg-cyan-600">
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
