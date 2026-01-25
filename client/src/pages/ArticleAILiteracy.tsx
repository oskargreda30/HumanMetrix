import { Link } from "wouter";
import { ArrowLeft, Calendar, Clock, Brain, Briefcase, GraduationCap, TrendingUp } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEO } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function ArticleAILiteracy() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEO 
        title="Why AI Literacy Matters in Recruitment | Essential Skills 2026"
        description="Learn why AI literacy has become essential for every role. Discover how AI literacy assessments are transforming modern hiring practices."
        canonical="/articles/why-ai-literacy-matters-recruitment"
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
              <Badge variant="secondary">Industry Insights</Badge>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
              Why AI Literacy Is the New Must-Have Skill for Every Role
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                January 2026
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                7 min read
              </span>
            </div>
          </header>

          <div className="prose prose-slate prose-lg max-w-none">
            <p className="lead text-xl text-slate-600 mb-8">
              A year ago, AI literacy might have seemed like a nice-to-have skill, relevant mainly for tech roles. Today, it's rapidly becoming a baseline expectation across virtually every industry and job function. As AI tools become ubiquitous, employers are prioritising candidates who can effectively collaborate with artificial intelligence—regardless of their job title.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              The Ubiquity of AI in the Modern Workplace
            </h2>
            
            <p className="text-slate-700 mb-6">
              AI is no longer confined to specialised technical roles. Consider how pervasive AI has become in everyday work:
            </p>

            <Card className="mb-6 border-slate-200">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-cyan-100 rounded-lg shrink-0">
                      <Briefcase className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Marketing</h4>
                      <p className="text-sm text-slate-600">AI-powered content generation, campaign optimisation, and customer segmentation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Finance</h4>
                      <p className="text-sm text-slate-600">Automated reporting, fraud detection, and predictive analytics</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                      <GraduationCap className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">HR</h4>
                      <p className="text-sm text-slate-600">CV screening, employee engagement analysis, and performance insights</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-lg shrink-0">
                      <Brain className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Operations</h4>
                      <p className="text-sm text-slate-600">Supply chain optimisation, quality control, and process automation</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="text-slate-700 mb-6">
              In each of these domains, employees who understand how to effectively leverage AI tools can accomplish significantly more than those who cannot. This creates a compelling case for employers to assess AI literacy during the hiring process.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              What AI Literacy Actually Means
            </h2>
            
            <p className="text-slate-700 mb-4">
              AI literacy isn't about coding or understanding neural network architectures. For most roles, it encompasses a practical set of competencies:
            </p>

            <ul className="space-y-3 text-slate-600 mb-8">
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Understanding AI Capabilities and Limitations:</strong> Knowing what AI can and cannot do reliably, and when to trust or verify its outputs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Effective Prompting:</strong> The ability to communicate clearly with AI systems to get useful, accurate results.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Critical Evaluation:</strong> Assessing AI outputs for accuracy, bias, and appropriateness before using them.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Ethical Awareness:</strong> Understanding the privacy, fairness, and transparency implications of AI use.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span><strong>Continuous Learning:</strong> Willingness and ability to keep pace as AI tools rapidly evolve.</span>
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              The Business Case for AI Literacy Assessment
            </h2>

            <Card className="mb-6 border-slate-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Productivity Differential</h3>
                <p className="text-slate-600">
                  Early research suggests that employees with strong AI literacy can be 20-40% more productive than their peers in roles that heavily use AI tools. This productivity gap is only expected to widen as AI capabilities expand.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6 border-slate-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Reduced Risk</h3>
                <p className="text-slate-600">
                  Employees who understand AI limitations are less likely to over-rely on AI outputs, reducing errors that can result from treating AI suggestions as infallible. They're also more likely to identify potential bias or ethical issues before they become problems.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-8 border-slate-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Future-Proofing</h3>
                <p className="text-slate-600">
                  Hiring for AI literacy today means building a workforce that can adapt as AI continues to evolve. These employees are more likely to embrace new tools and help drive AI adoption across the organisation.
                </p>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Integrating AI Literacy into Hiring
            </h2>
            
            <p className="text-slate-700 mb-6">
              Progressive organisations are already incorporating AI literacy assessments into their hiring processes. This doesn't mean adding AI-specific tests for every role, but rather recognising AI literacy as a cross-cutting competency similar to communication or problem-solving skills.
            </p>

            <p className="text-slate-700 mb-4">
              Effective AI literacy assessment should:
            </p>

            <ul className="space-y-3 text-slate-600 mb-8">
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>Be practical and scenario-based, not theoretical</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>Measure thinking skills, not just tool familiarity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>Account for the fact that AI tools change rapidly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>Be appropriate to the role's level of AI interaction</span>
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Getting Ahead of the Curve
            </h2>
            
            <p className="text-slate-700 mb-6">
              Whether you're a job seeker or an employer, now is the time to take AI literacy seriously. For candidates, demonstrating AI literacy can set you apart in a competitive job market. For employers, assessing this competency helps ensure you're building a workforce ready for the AI-augmented future.
            </p>

            <Card className="mb-8 bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Assess Your AI Readiness</h3>
                <p className="text-slate-600 mb-4">
                  Take our AI Readiness assessment to understand where you stand and identify areas for development.
                </p>
                <Link href="/assessments?view=candidate">
                  <Button className="bg-cyan-500 hover:bg-cyan-600">
                    Start Assessment
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
