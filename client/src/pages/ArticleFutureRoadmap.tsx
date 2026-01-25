import { Link } from "wouter";
import { ArrowLeft, Calendar, Clock, Sparkles, Users, Zap, TrendingUp, Brain, Target } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEO } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function ArticleFutureRoadmap() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEO 
        title="Future of AI Talent Assessment 2026-2027 | HumanMetrix Roadmap"
        description="Explore HumanMetrix's upcoming assessments: Human-AI Collaboration Style, Adaptability Quotient, and more. See our 2026-2027 product roadmap."
        canonical="/articles/future-of-ai-assessments-2026-roadmap"
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
              <Badge variant="secondary">Product Roadmap</Badge>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
              The Future of AI Talent Assessment: Our 2026-2027 Product Roadmap
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                January 2026
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                5 min read
              </span>
            </div>
          </header>

          <div className="prose prose-slate prose-lg max-w-none">
            <p className="lead text-xl text-slate-600 mb-8">
              As AI continues to reshape the workplace at an unprecedented pace, the competencies required for success evolve alongside it. At HumanMetrix, we're continuously developing new assessments to help organisations identify talent ready to thrive in tomorrow's AI-augmented world. Here's a preview of what's coming.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Q2 2026: Human-AI Collaboration Style
            </h2>

            <Card className="mb-6 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg shrink-0">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Understanding How Humans and AI Work Best Together</h3>
                    <p className="text-slate-600 mb-3">
                      Different individuals approach AI collaboration in fundamentally different ways. Some prefer AI as an assistant, others as a creative partner, and still others as a verification tool. This assessment identifies an individual's natural collaboration style with AI systems.
                    </p>
                    <p className="text-slate-600">
                      Understanding these preferences helps organisations match people to roles where their collaboration style will be most effective, and helps individuals leverage AI in ways that feel natural and productive.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Q3 2026: Adaptability Quotient (AQ)
            </h2>

            <Card className="mb-6 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-cyan-100 rounded-lg shrink-0">
                    <Zap className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Measuring the Capacity to Thrive Amid Constant Change</h3>
                    <p className="text-slate-600 mb-3">
                      In an era where the tools, processes, and even job descriptions change quarterly, adaptability has become perhaps the most valuable human trait. The Adaptability Quotient assessment measures multiple dimensions of adaptive capacity.
                    </p>
                    <ul className="space-y-2 text-slate-600">
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-500 font-bold">•</span>
                        <span><strong>Learning Agility:</strong> How quickly can someone master new tools and concepts?</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-500 font-bold">•</span>
                        <span><strong>Cognitive Flexibility:</strong> How easily can they shift between different types of thinking?</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-500 font-bold">•</span>
                        <span><strong>Emotional Resilience:</strong> How well do they handle uncertainty and ambiguity?</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-500 font-bold">•</span>
                        <span><strong>Proactive Adaptation:</strong> Do they wait for change or anticipate and prepare for it?</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Q4 2026: AI Creativity Catalyst
            </h2>

            <Card className="mb-6 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-pink-100 rounded-lg shrink-0">
                    <Sparkles className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Harnessing AI for Creative Innovation</h3>
                    <p className="text-slate-600 mb-3">
                      Creative use of AI extends far beyond generating images or writing copy. This assessment measures an individual's ability to use AI tools as catalysts for novel problem-solving and innovation across any domain.
                    </p>
                    <p className="text-slate-600">
                      Key dimensions include divergent thinking with AI, constraint redefinition, cross-domain synthesis, and the ability to evaluate and refine AI-generated ideas into practical innovations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Q1 2027: Strategic AI Leadership
            </h2>

            <Card className="mb-6 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg shrink-0">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Leading Teams and Organisations Through AI Transformation</h3>
                    <p className="text-slate-600 mb-3">
                      As AI adoption accelerates, organisations need leaders who can guide teams through transformation while maintaining morale, productivity, and ethical standards. This assessment targets senior and emerging leaders.
                    </p>
                    <p className="text-slate-600">
                      Dimensions include AI vision setting, change management in AI contexts, building AI-ready cultures, managing human-AI team dynamics, and strategic AI resource allocation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Q2 2027: AI Safety Specialist
            </h2>

            <Card className="mb-8 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-100 rounded-lg shrink-0">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Ensuring Safe and Responsible AI Deployment</h3>
                    <p className="text-slate-600 mb-3">
                      As AI systems become more powerful and pervasive, the need for professionals who can identify and mitigate risks grows critical. This advanced assessment evaluates deep expertise in AI safety practices.
                    </p>
                    <p className="text-slate-600">
                      This assessment targets roles specifically focused on AI governance, risk management, and safety assurance, measuring both technical understanding and practical application skills.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Building for the Future
            </h2>
            
            <p className="text-slate-700 mb-6">
              Our roadmap reflects our commitment to staying ahead of workplace evolution. Each new assessment is developed in partnership with industry leaders, AI researchers, and organisational psychologists to ensure validity and practical relevance.
            </p>

            <p className="text-slate-700 mb-6">
              Want early access to upcoming assessments or interested in helping shape their development? We're always looking for forward-thinking organisations to participate in our beta programmes.
            </p>

            <Card className="mb-8 bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Stay Updated on Our Progress</h3>
                <p className="text-slate-600 mb-4">
                  Join our mailing list to be notified when new assessments launch.
                </p>
                <Link href="/subscribe">
                  <Button className="bg-cyan-500 hover:bg-cyan-600">
                    Subscribe for Updates
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
