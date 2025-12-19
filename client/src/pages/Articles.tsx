import { Link } from "wouter";
import { Calendar, Clock, ArrowRight, FileText } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEO } from "@/lib/seo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const articles = [
  {
    id: "how-to-pass-psychometric-tests-job-interviews",
    title: "How to Approach Psychometric Tests for Job Interviews: Your Ultimate UK Guide",
    description: "Struggling with job application psychometric tests? Learn exactly how to prepare, what to expect, and the best strategies to approach psychometric tests for job interviews in the UK.",
    category: "Career Advice",
    readTime: "8 min read",
    date: "November 28, 2025",
    featured: true,
  },
  {
    id: "role-of-psychometric-testing-in-recruitment",
    title: "The Essential Role of Psychometric Testing in Recruitment: A UK Perspective",
    description: "Explore the pivotal role of psychometric testing in modern recruitment. Learn why UK employers use these assessments, the types of tests involved, and how they shape the future of hiring.",
    category: "Industry Insights",
    readTime: "7 min read",
    date: "November 28, 2025",
    featured: true,
  },
  {
    id: "humanmetrix-ai-assessment-suite",
    title: "Introducing HumanMetrix: The Complete AI-Era Assessment Platform",
    description: "Discover how HumanMetrix's four core assessments—FIT, AI Readiness, Prompt Architecture, and AIQ—provide comprehensive insights into candidates' readiness for the AI-driven workplace.",
    category: "Product",
    readTime: "6 min read",
    date: "December 2025",
    featured: true,
  },
  {
    id: "future-of-ai-assessments-2026-roadmap",
    title: "The Future of AI Talent Assessment: Our 2026-2027 Product Roadmap",
    description: "From Human-AI Collaboration Style to Adaptability Quotient—explore the upcoming assessments that will help organisations identify talent ready to thrive as AI transforms the workplace.",
    category: "Product Roadmap",
    readTime: "5 min read",
    date: "December 2025",
    featured: false,
  },
  {
    id: "why-ai-literacy-matters-recruitment",
    title: "Why AI Literacy Is the New Must-Have Skill for Every Role",
    description: "As AI tools become ubiquitous across industries, employers are prioritising candidates who can effectively collaborate with AI. Learn why AI literacy assessments are becoming essential in modern hiring.",
    category: "Industry Insights",
    readTime: "7 min read",
    date: "December 2025",
    featured: false,
  },
  {
    id: "prompt-engineering-skills-workplace",
    title: "Prompt Engineering: The Skill That Separates AI-Ready Workers from the Rest",
    description: "Explore why prompt engineering has become a critical workplace skill, how it's assessed, and what makes an effective AI communicator in today's professional environment.",
    category: "Skills",
    readTime: "6 min read",
    date: "December 2025",
    featured: false,
  },
];

const whitePapers = [
  {
    id: "white-paper-fit-test",
    title: "FIT Test Design – White Paper",
    description: "Explore the scientific rationale behind the FIT psychometric assessment — a 15-question instrument measuring six high-impact professional skills essential for modern AI work performance.",
    category: "Research",
  },
  {
    id: "white-paper-ai-readiness-test",
    title: "AI Readiness Test – White Paper",
    description: "Discover the scientific foundation of our AI Readiness assessment, designed to measure nine critical skills positioning individuals for success in an AI-driven professional landscape.",
    category: "Research",
  },
];

export default function Articles() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEO 
        title="Psychometric Testing Articles & Career Insights UK | HumanMetrix"
        description="HumanMetrix articles on psychometric tests UK, pre-employment testing & career development. Learn how to pass assessments."
        canonical="/articles"
      />
      <Navigation />
      
      <main className="flex-grow py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-cyan-600 border-cyan-300">
              Knowledge Hub
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Articles & Insights
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Expert guidance on psychometric testing, career development, and recruitment best practices
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {articles.map((article) => (
              <Link key={article.id} href={`/articles/${article.id}`} className="block">
                <Card 
                  className="group cursor-pointer border-slate-200 hover-elevate transition-all duration-300"
                  data-testid={`card-article-${article.id}`}
                >
                  <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge variant="secondary" className="text-xs">
                            {article.category}
                          </Badge>
                          {article.featured && (
                            <Badge className="text-xs bg-cyan-500 hover:bg-cyan-600">
                              Featured
                            </Badge>
                          )}
                        </div>
                        
                        <h2 className="text-xl md:text-2xl font-semibold text-slate-900 mb-3 group-hover:text-cyan-600 transition-colors">
                          {article.title}
                        </h2>
                        
                        <p className="text-slate-600 mb-4 line-clamp-2">
                          {article.description}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {article.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {article.readTime}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-cyan-600 group-hover:translate-x-1 transition-transform">
                        <span className="text-sm font-medium mr-1 hidden md:inline">Read More</span>
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-16 pt-12 border-t border-slate-200">
            <div className="text-center mb-8">
              <Badge variant="outline" className="mb-4 text-blue-600 border-blue-300">
                Technical Documentation
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
                White Papers
              </h2>
              <p className="text-slate-600 max-w-xl mx-auto">
                In-depth scientific documentation on our assessment methodologies and psychometric foundations
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {whitePapers.map((paper) => (
                <Link key={paper.id} href={`/articles/${paper.id}`} className="block">
                  <Card 
                    className="group cursor-pointer border-slate-200 hover-elevate transition-all duration-300 h-full"
                    data-testid={`card-whitepaper-${paper.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg shrink-0">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {paper.category}
                            </Badge>
                          </div>
                          
                          <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                            {paper.title}
                          </h3>
                          
                          <p className="text-slate-600 text-sm line-clamp-3">
                            {paper.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
