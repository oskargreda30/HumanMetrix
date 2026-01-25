import { Link } from "wouter";
import { ArrowLeft, Calendar, Clock, MessageSquare, CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEO } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function ArticlePromptEngineering() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEO 
        title="Prompt Engineering Skills for the Workplace | HumanMetrix"
        description="Explore why prompt engineering has become a critical workplace skill and what makes an effective AI communicator in today's professional environment."
        canonical="/articles/prompt-engineering-skills-workplace"
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
              <Badge variant="secondary">Skills</Badge>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
              Prompt Engineering: The Skill That Separates AI-Ready Workers from the Rest
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

          <div className="prose prose-slate prose-lg max-w-none">
            <p className="lead text-xl text-slate-600 mb-8">
              You've probably noticed it: some colleagues seem to get remarkable results from AI tools while others struggle to get anything useful. The difference often comes down to a single skill—prompt engineering. And it's rapidly becoming one of the most valuable competencies in the modern workplace.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              What Is Prompt Engineering?
            </h2>
            
            <p className="text-slate-700 mb-6">
              At its core, prompt engineering is the art and science of communicating effectively with AI systems. It's about crafting inputs that guide AI tools to produce the outputs you actually need. Think of it as learning to speak a new language—one that allows you to unlock the full potential of artificial intelligence.
            </p>

            <p className="text-slate-700 mb-6">
              But prompt engineering goes beyond simply asking questions. It involves understanding how AI systems interpret language, what context they need, and how to structure requests to get consistent, high-quality results.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              The Six Pillars of Effective Prompting
            </h2>
            
            <p className="text-slate-700 mb-4">
              Through our research and assessment development, we've identified six key competencies that define effective prompt engineers:
            </p>

            <Card className="mb-4 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-cyan-100 rounded-lg shrink-0">
                    <MessageSquare className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">1. Clarity of Communication</h3>
                    <p className="text-slate-600">
                      The ability to express requests in unambiguous terms. This means avoiding vague language, being specific about what you want, and anticipating how an AI might misinterpret your request.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-4 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">2. Contextual Awareness</h3>
                    <p className="text-slate-600">
                      Understanding what background information an AI needs to provide useful outputs. This includes knowing when to provide examples, explaining the purpose behind a request, and setting the appropriate frame of reference.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-4 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">3. Task Decomposition</h3>
                    <p className="text-slate-600">
                      Breaking complex requests into manageable steps. AI tools often perform better when given focused, sequential tasks rather than sprawling, multi-part requests.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-4 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-100 rounded-lg shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">4. Iterative Refinement</h3>
                    <p className="text-slate-600">
                      The skill of improving prompts based on AI outputs. Rarely does the first prompt produce perfect results; effective prompt engineers know how to analyse outputs and adjust their approach accordingly.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-4 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-orange-100 rounded-lg shrink-0">
                    <MessageSquare className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">5. Output Specification</h3>
                    <p className="text-slate-600">
                      Defining the format, structure, and characteristics of desired outputs. This includes specifying length, tone, format, and level of detail—reducing the need for extensive editing afterwards.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-8 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-red-100 rounded-lg shrink-0">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">6. Constraint Setting</h3>
                    <p className="text-slate-600">
                      Establishing boundaries for AI responses. This means telling the AI what NOT to include, what assumptions NOT to make, and what approaches NOT to take—often as important as specifying what you do want.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Good vs. Poor Prompts: Examples
            </h2>
            
            <p className="text-slate-700 mb-4">
              The difference between effective and ineffective prompting can be stark. Consider these examples:
            </p>

            <Card className="mb-4 border-red-200 bg-red-50">
              <CardContent className="p-6">
                <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Poor Prompt
                </h4>
                <p className="text-red-800 italic">"Write me an email about the meeting."</p>
                <p className="text-red-700 text-sm mt-2">Vague, lacks context, format, or purpose. The AI has to guess almost everything.</p>
              </CardContent>
            </Card>

            <Card className="mb-8 border-green-200 bg-green-50">
              <CardContent className="p-6">
                <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Effective Prompt
                </h4>
                <p className="text-green-800 italic">"Write a professional email to the marketing team (5 people) summarising yesterday's product launch meeting. Include the three key decisions made, the two action items with owners, and the next meeting date (15 January). Keep it under 200 words and use a warm but business-appropriate tone."</p>
                <p className="text-green-700 text-sm mt-2">Specific context, clear requirements, format guidance, and constraints.</p>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Why This Matters for Your Career
            </h2>
            
            <p className="text-slate-700 mb-6">
              As AI tools become standard in more workplaces, the ability to use them effectively becomes a differentiating factor. Employees who can leverage AI well accomplish more in less time, produce higher-quality work, and free themselves for higher-value tasks that require uniquely human skills.
            </p>

            <p className="text-slate-700 mb-6">
              Conversely, those who struggle with AI tools may find themselves at a significant productivity disadvantage. The good news is that prompt engineering is a learnable skill—one that improves with practice and awareness.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
              Assessing Prompt Engineering Ability
            </h2>
            
            <p className="text-slate-700 mb-6">
              Unlike many technical skills, prompt engineering ability isn't easily demonstrated through credentials or experience on a CV. This is why assessment-based evaluation has become valuable—it allows individuals to demonstrate their actual capability and allows employers to identify candidates who will excel in AI-augmented roles.
            </p>

            <Card className="mb-8 bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Measure Your Prompt Engineering Skills</h3>
                <p className="text-slate-600 mb-4">
                  Our Prompt Architecture assessment evaluates all six pillars of effective prompting through practical, scenario-based questions.
                </p>
                <Link href="/assessments?view=candidate">
                  <Button className="bg-cyan-500 hover:bg-cyan-600">
                    Take the Assessment
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
