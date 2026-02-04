import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, TrendingUp, AlertTriangle, Download, FileText, Target, MessageSquare, Users, Rocket, Star, Mail } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { exportResultsPDF } from "@/lib/pdfScreenCapture";
import { useToast } from "@/hooks/use-toast";
import { getAIQBandInterpretation } from "@/data/aiq-questions";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { PromptArchitectureResults } from "@/components/PromptArchitectureResults";
import { formatAssessmentName } from "@/lib/assessmentHelpers";
import { ResultsPaymentGate } from "@/components/ResultsPaymentGate";
import SkillsLegend from "@/components/SkillsLegend";

// Helper function to generate comprehensive analysis
function generateAnalysis(assessmentType: string, scores: Record<string, number>, totalScore?: number) {
  const sortedSkills = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));
  const strengths = sortedSkills.filter(([_, score]) => (score as number) >= 70);
  const improvements = sortedSkills.filter(([_, score]) => (score as number) < 70);
  
  const analysis = {
    strengths: [] as string[],
    improvements: [] as string[],
    overall: "",
  };

  switch (assessmentType) {
    case "fit":
      analysis.overall = "This FIT assessment evaluates core behavioral competencies essential for workplace success and team collaboration.";
      
      if (strengths.length > 0) {
        strengths.forEach(([skill, score]) => {
          if (skill === "High Agency") {
            analysis.strengths.push(`Demonstrates strong **High Agency** (${score}/100): Takes initiative, drives outcomes independently, and shows proactive problem-solving abilities.`);
          } else if (skill === "Intellectual Curiosity") {
            analysis.strengths.push(`Exhibits excellent **Intellectual Curiosity** (${score}/100): Shows eagerness to learn, asks thoughtful questions, and seeks to understand complex concepts.`);
          } else if (skill === "Resilience") {
            analysis.strengths.push(`Shows robust **Resilience** (${score}/100): Bounces back from setbacks, maintains composure under pressure, and adapts to changing circumstances.`);
          } else if (skill === "Empathy & Ethics") {
            analysis.strengths.push(`Displays strong **Empathy & Ethics** (${score}/100): Considers others' perspectives, makes ethical decisions, and demonstrates social awareness.`);
          } else if (skill === "Growth Mindset") {
            analysis.strengths.push(`Possesses a strong **Growth Mindset** (${score}/100): Views challenges as opportunities, embraces feedback, and believes in continuous improvement.`);
          } else if (skill === "Interpersonal Agility") {
            analysis.strengths.push(`Excels in **Interpersonal Agility** (${score}/100): Builds relationships effectively, adapts communication style, and collaborates seamlessly across diverse teams.`);
          }
        });
      }
      
      if (improvements.length > 0) {
        improvements.forEach(([skill, score]) => {
          if (skill === "High Agency") {
            analysis.improvements.push(`**High Agency** (${score}/100): Would benefit from developing greater ownership, taking more initiative without prompting, and driving projects to completion independently.`);
          } else if (skill === "Intellectual Curiosity") {
            analysis.improvements.push(`**Intellectual Curiosity** (${score}/100): Encourage deeper questioning, broader exploration of topics, and proactive learning beyond immediate requirements.`);
          } else if (skill === "Resilience") {
            analysis.improvements.push(`**Resilience** (${score}/100): Focus on stress management techniques, reframing setbacks as learning opportunities, and maintaining motivation through challenges.`);
          } else if (skill === "Empathy & Ethics") {
            analysis.improvements.push(`**Empathy & Ethics** (${score}/100): Develop stronger perspective-taking abilities, practice active listening, and strengthen ethical decision-making frameworks.`);
          } else if (skill === "Growth Mindset") {
            analysis.improvements.push(`**Growth Mindset** (${score}/100): Work on viewing challenges positively, seeking feedback actively, and embracing learning from failures.`);
          } else if (skill === "Interpersonal Agility") {
            analysis.improvements.push(`**Interpersonal Agility** (${score}/100): Practice adapting communication styles, building rapport with diverse personalities, and navigating complex team dynamics.`);
          }
        });
      }
      break;

    case "ai_readiness":
      analysis.overall = "This AI Readiness assessment measures capabilities critical for effective collaboration with AI systems and thriving in AI-augmented environments.";
      
      if (strengths.length > 0) {
        strengths.forEach(([skill, score]) => {
          const skillLower = skill.toLowerCase();
          if (skillLower.includes("literacy") || skillLower.includes("prompting")) {
            analysis.strengths.push(`Strong **AI Literacy & Prompt Engineering** (${score}/100): Demonstrates understanding of AI capabilities and can craft effective prompts to achieve desired outcomes.`);
          } else if (skillLower.includes("technical")) {
            analysis.strengths.push(`Excellent **Technical Fundamentals** (${score}/100): Comfortable with technical concepts and can navigate AI tools and platforms effectively.`);
          } else if (skillLower.includes("critical")) {
            analysis.strengths.push(`Outstanding **Critical Thinking & Problem-Solving** (${score}/100): Evaluates AI outputs critically, identifies limitations, and makes sound judgments about AI reliability.`);
          } else if (skillLower.includes("adaptive") || skillLower.includes("continuous")) {
            analysis.strengths.push(`Proficient in **Adaptability & Continuous Learning** (${score}/100): Quickly adapts to new AI tools and learns continuously in AI-enhanced environments.`);
          } else if (skillLower.includes("responsible")) {
            analysis.strengths.push(`Strong **Responsible AI & Ethical Awareness** (${score}/100): Uses AI ethically, understands implications, and implements safeguards appropriately.`);
          } else if (skillLower.includes("creative") || skillLower.includes("innovation")) {
            analysis.strengths.push(`Impressive **Creativity & Innovation** (${score}/100): Leverages AI for creative problem-solving and generates innovative solutions.`);
          } else if (skillLower.includes("collaboration") || skillLower.includes("communication")) {
            analysis.strengths.push(`Excellent **Collaboration & Communication** (${score}/100): Effectively collaborates across disciplines in AI-driven projects.`);
          } else {
            analysis.strengths.push(`Strong **${skill}** (${score}/100): Shows proficiency in this important AI readiness dimension.`);
          }
        });
      }
      
      if (improvements.length > 0) {
        improvements.forEach(([skill, score]) => {
          const skillLower = skill.toLowerCase();
          if (skillLower.includes("literacy") || skillLower.includes("prompting")) {
            analysis.improvements.push(`**AI Literacy & Prompt Engineering** (${score}/100): Recommend focused training on prompt engineering, AI fundamentals, and practical experience with various AI models.`);
          } else if (skillLower.includes("technical")) {
            analysis.improvements.push(`**Technical Fundamentals** (${score}/100): Suggest building technical foundation through hands-on practice with AI APIs, understanding model architectures, and technical documentation.`);
          } else if (skillLower.includes("critical")) {
            analysis.improvements.push(`**Critical Thinking & Problem-Solving** (${score}/100): Develop skills in evaluating AI outputs, recognizing biases and limitations, and validating AI-generated information.`);
          } else if (skillLower.includes("responsible")) {
            analysis.improvements.push(`**Responsible AI & Ethical Awareness** (${score}/100): Focus on AI ethics training, understanding regulatory requirements, and implementing responsible AI practices.`);
          } else {
            analysis.improvements.push(`**${skill}** (${score}/100): This area would benefit from targeted development and practical experience.`);
          }
        });
      }
      break;

    case "prompt_architecture":
      analysis.overall = `This Prompt Architecture assessment evaluates prompt design skills across progressive difficulty levels. Overall score: **${totalScore}/100**. Prompts are evaluated on five equal dimensions (20% each): Clarity, Structure, Context Relevance, Creativity, and Iterative Improvement.`;
      
      if (totalScore !== undefined) {
        if (totalScore >= 80) {
          analysis.strengths.push(`**Exceptional prompt design skills**: Demonstrates mastery in crafting clear, well-structured prompts with strong context awareness and creative problem-solving approaches.`);
          analysis.strengths.push(`**Advanced understanding**: Shows ability to handle complex scenarios and create prompts that effectively guide AI systems to desired outcomes.`);
        } else if (totalScore >= 65) {
          analysis.strengths.push(`**Solid prompt engineering foundation**: Can create effective prompts with good structure and clarity for most use cases.`);
          analysis.strengths.push(`**Good contextual awareness**: Demonstrates understanding of how to provide relevant context to AI systems.`);
        } else if (totalScore >= 50) {
          analysis.strengths.push(`**Basic prompt design capabilities**: Shows fundamental understanding of how to communicate with AI systems.`);
        }
        
        if (totalScore < 80) {
          if (totalScore < 50) {
            analysis.improvements.push(`**Prompt structure and clarity**: Focus on writing more specific, clear prompts with explicit instructions and constraints.`);
            analysis.improvements.push(`**Context provision**: Practice including relevant background information and examples to guide AI responses.`);
          } else if (totalScore < 65) {
            analysis.improvements.push(`**Advanced techniques**: Explore iterative refinement strategies and more sophisticated prompt patterns.`);
            analysis.improvements.push(`**Creativity**: Experiment with creative problem-solving approaches and unconventional prompt structures.`);
          } else {
            analysis.improvements.push(`**Fine-tuning**: Continue refining techniques in iterative improvement and handling edge cases in complex scenarios.`);
          }
        }
      }
      
      // Add note about evaluation criteria
      analysis.improvements.push(`**Evaluation Note**: Prompts are scored by an AI model across five equal dimensions (20 points each): Clarity, Structure, Context Relevance, Creativity, and Iterative Improvement. Each dimension carries equal weight (20%) in the overall assessment of prompt effectiveness.`);
      break;

    case "aiq":
      const aiqScore = Object.values(scores)[0] as number || 0;
      const bandInterpretation = getAIQBandInterpretation(aiqScore);
      
      analysis.overall = `This Algorithmic Integrity Quotient (AIQ) assessment evaluates ethical reasoning in AI scenarios using graded scoring. Score: **${aiqScore}/100** - **${bandInterpretation.title}** (${bandInterpretation.range}). ${bandInterpretation.description}`;
      
      if (aiqScore >= 80) {
        analysis.strengths.push(`**Exceptional ethical alignment**: Consistently prioritizes optimal ethical outcomes with sophisticated reasoning about complex trade-offs.`);
        analysis.strengths.push(`**Strategic ethical leadership**: Demonstrates ability to navigate gray areas while maintaining strong ethical principles.`);
        analysis.strengths.push(`**AI governance ready**: Well-prepared for roles requiring ethical oversight of AI systems.`);
      } else if (aiqScore >= 60) {
        analysis.strengths.push(`**Strong ethical foundation**: Shows sound judgment balancing ethical imperatives with operational realities.`);
        analysis.strengths.push(`**Practical ethics awareness**: Understands core principles of responsible AI deployment.`);
        if (aiqScore < 80) {
          analysis.improvements.push(`**Advanced ethical reasoning**: Consider exploring more complex ethical frameworks and edge cases in AI decision-making.`);
        }
      } else if (aiqScore >= 40) {
        analysis.strengths.push(`**Basic ethical awareness**: Shows foundational understanding of AI ethics concepts.`);
        analysis.improvements.push(`**Ethical prioritization**: Practice weighing ethical considerations more heavily against efficiency or convenience.`);
        analysis.improvements.push(`**Bias recognition**: Develop stronger skills in identifying and mitigating algorithmic bias.`);
      } else {
        analysis.improvements.push(`**AI ethics fundamentals**: Recommend comprehensive training on fairness, transparency, accountability, and safety principles.`);
        analysis.improvements.push(`**Consent and privacy**: Study best practices for handling sensitive data and obtaining proper consent.`);
        analysis.improvements.push(`**Responsible deployment**: Learn risk assessment and safeguard implementation for AI systems.`);
        analysis.improvements.push(`**Regulatory awareness**: Familiarize with AI governance frameworks and ethical decision-making.`);
      }
      break;
  }
  
  return analysis;
}

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Check if user has paid for results access
  const { data: purchases } = useQuery<any[]>({
    queryKey: ["/api/purchases"],
    enabled: isAuthenticated,
  });

  const hasPaidForResults = Array.isArray(purchases) ? purchases.some((p: any) => p.resultsAccessPaid === true) : undefined;

  const { data: result, isLoading } = useQuery({
    queryKey: ["/api/results", id],
    enabled: isAuthenticated && !!id && hasPaidForResults !== false,
  });

  // Fetch all user results for PDF generation
  const { data: allResults } = useQuery<any[]>({
    queryKey: ["/api/results"],
    enabled: isAuthenticated,
  });

  const handleDownloadPDF = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we prepare your report...",
      });

      const candidateName = user.firstName && user.lastName 
        ? `${user.firstName}_${user.lastName}` 
        : user.email.split('@')[0];
      const filename = `${candidateName}_assessment_results.pdf`;

      await exportResultsPDF({
        elementId: 'b2c-results-content',
        filename,
      });

      toast({
        title: "Success",
        description: "Your report has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Show payment gate if user hasn't paid for results access
  if (hasPaidForResults === false) {
    return <ResultsPaymentGate />;
  }

  if (isLoading || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const scores = (result as any).scores || {};
  const totalScore = (result as any).totalScore;
  const hasTotalScore = totalScore !== null && totalScore !== undefined;
  const assessmentType = (result as any).assessmentType;
  const evaluations = (result as any).evaluations || [];
  
  // Generate comprehensive analysis
  const analysis = generateAnalysis(assessmentType, scores, totalScore);

  // For Prompt Architecture, show dedicated component
  if (assessmentType === "prompt_architecture" && evaluations.length > 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow py-16">
          <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
            {/* Back Button */}
            <div className="mb-6">
              <Link href="/dashboard">
                <Button variant="ghost" data-testid="button-back-to-dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>

            <div className="mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold">
                  Prompt Architecture Assessment Results
                </h1>
                <Button 
                  onClick={handleDownloadPDF}
                  variant="outline"
                  size="default"
                  data-testid="button-download-pdf-prompt"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
              <p className="text-muted-foreground">
                Completed on {new Date((result as any).completedAt).toLocaleDateString()}
              </p>
            </div>

            <PromptArchitectureResults 
              scores={scores}
              totalScore={totalScore}
              evaluations={evaluations}
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Transform scores for radar chart
  const radarData = Object.entries(scores).map(([skill, score]) => ({
    skill: skill.replace(/([A-Z])/g, ' $1').trim(), // Add spaces before capital letters
    score: score as number,
    fullMark: 100,
  }));

  // Transform scores for bar chart
  const barData = Object.entries(scores).map(([skill, score]) => ({
    skill: skill.length > 20 ? skill.substring(0, 17) + '...' : skill,
    score: score as number,
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow py-16" id="b2c-results-content">
        <div className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/dashboard">
              <Button variant="ghost" data-testid="button-back-to-dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {formatAssessmentName((result as any).assessmentType)} Results
                </h1>
                <p className="text-muted-foreground mt-1">
                  Completed on {new Date((result as any).completedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  Status: {(result as any).status}
                </Badge>
                <Button 
                  onClick={handleDownloadPDF}
                  variant="outline"
                  size="default"
                  data-testid="button-download-pdf"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Summary Section - Page 1 of PDF */}
          <div data-pdf-section className="space-y-6 bg-background">
            {/* How to Read This Report */}
            <Card data-testid="section-how-to-read">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold" data-testid="heading-how-to-read">How to Read This Report</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4" data-testid="text-guide-intro">
                  A step-by-step guide to understanding your assessment results and how to use them for career growth
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                    <div>
                      <span className="font-medium text-sm">Score Interpretation</span>
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-1">
                        <Badge className="bg-green-500 text-white text-[10px] px-1 py-0">75%+</Badge> <span>Strong capability,</span>
                        <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0">50-74%</Badge> <span>Developing,</span>
                        <Badge className="bg-red-500 text-white text-[10px] px-1 py-0">&lt;50%</Badge> <span>Growth opportunity</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                    <div>
                      <p className="font-medium text-sm">Four Assessment Areas</p>
                      <p className="text-xs text-muted-foreground">
                        Your report covers FIT (behavioral traits), AI Readiness, Prompt Architecture, and AI Ethics (AIQ) - together providing a complete picture of your capabilities.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                    <div>
                      <p className="font-medium text-sm">Strengths & Development Areas</p>
                      <p className="text-xs text-muted-foreground">
                        Each section highlights your strengths to leverage in interviews and development areas to focus on for career growth.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                    <div>
                      <p className="font-medium text-sm">Using Your Results</p>
                      <p className="text-xs text-muted-foreground">
                        Share your report with potential employers to demonstrate your capabilities, or use insights to guide your professional development plan.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
                    <div>
                      <p className="font-medium text-sm">Radar Chart Visualization</p>
                      <p className="text-xs text-muted-foreground">
                        The radar chart provides a visual overview of your skills profile, making it easy to identify patterns across dimensions.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">6</div>
                    <div>
                      <p className="font-medium text-sm">Individual Skill Scores</p>
                      <p className="text-xs text-muted-foreground">
                        Review detailed scores for each skill to understand your specific competencies and target areas for improvement.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Overall Score - only show for assessments with total scores */}
            {hasTotalScore && (
              <Card className="p-8">
                <div className="text-center">
                  <h2 className="text-lg font-medium text-muted-foreground mb-2">
                    Overall Score
                  </h2>
                  <div className="text-4xl md:text-6xl font-bold text-primary mb-2">
                    {totalScore}
                  </div>
                  <p className="text-muted-foreground">out of 100</p>
                </div>
              </Card>
            )}
          </div>

          {/* AIQ Graded Score Visualization */}
          {assessmentType === 'aiq' && hasTotalScore && (() => {
            const band = getAIQBandInterpretation(totalScore);
            const getBarColor = (score: number) => {
              if (score >= 80) return 'bg-green-600';
              if (score >= 60) return 'bg-blue-600';
              if (score >= 40) return 'bg-amber-500';
              if (score >= 20) return 'bg-orange-500';
              return 'bg-red-500';
            };
            return (
              <Card className="p-8 mb-8">
                <h2 className="text-xl md:text-2xl font-semibold mb-6 text-center">Algorithmic Integrity Score</h2>
                <div className="space-y-6">
                  {/* Band labels */}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span data-testid="text-aiq-min">0</span>
                    <span>20</span>
                    <span>40</span>
                    <span>60</span>
                    <span>80</span>
                    <span data-testid="text-aiq-max">100</span>
                  </div>
                  
                  {/* Progress bar with band markers */}
                  <div className="relative" data-testid="container-aiq-progress">
                    <Progress 
                      value={Math.min(totalScore, 100)} 
                      className="h-8 relative"
                      data-testid="progress-aiq-bar"
                      indicatorClassName={getBarColor(totalScore)}
                    />
                    
                    {/* Band marker lines */}
                    {[20, 40, 60, 80].map((mark) => (
                      <div 
                        key={mark}
                        className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/30 pointer-events-none" 
                        style={{ left: `${mark}%` }}
                      />
                    ))}
                    
                    {/* Score value label */}
                    {totalScore > 0 && (
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-bold whitespace-nowrap pointer-events-none"
                        style={{ left: `${Math.min(Math.max(totalScore, 8), 92)}%` }}
                        data-testid="label-aiq-score-position"
                      >
                        {totalScore}%
                      </div>
                    )}
                  </div>
                  
                  {/* Band interpretation */}
                  <div className="text-center space-y-2" data-testid="container-aiq-band">
                    <Badge 
                      className={`text-sm px-4 py-1 ${
                        totalScore >= 80 ? 'bg-green-600' :
                        totalScore >= 60 ? 'bg-blue-600' :
                        totalScore >= 40 ? 'bg-amber-500' :
                        totalScore >= 20 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      data-testid="badge-aiq-band"
                    >
                      {band.title}
                    </Badge>
                    <p className="text-muted-foreground text-sm max-w-2xl mx-auto" data-testid="text-aiq-description">
                      {band.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* Visualizations - For FIT and AI Readiness */}
          {Object.keys(scores).length > 0 && assessmentType !== 'aiq' && (
            <div className="grid md:grid-cols-2 gap-8 mb-8" data-pdf-section>
              {/* Radar Chart */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6 text-center">Skills Radar</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis 
                      dataKey="skill" 
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 100]}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>

              {/* Bar Chart */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6 text-center">Skills Comparison</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="skill" 
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar 
                      dataKey="score" 
                      fill="hsl(var(--primary))"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}


          {/* Comprehensive Analysis for Employers */}
          <Card className="p-8 mb-8" data-pdf-section>
            <h2 className="text-xl md:text-2xl font-semibold mb-6">Comprehensive Analysis</h2>
            
            {/* Overall Summary */}
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-foreground leading-relaxed">{analysis.overall}</p>
            </div>
            
            {/* Strengths */}
            {analysis.strengths.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Key Strengths</h3>
                </div>
                <div className="space-y-3">
                  {analysis.strengths.map((strength, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border-l-4 border-primary">
                      <div className="flex-1">
                        <p className="text-sm text-foreground leading-relaxed"
                           dangerouslySetInnerHTML={{ __html: strength.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Areas for Improvement */}
            {analysis.improvements.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h3 className="text-xl font-semibold">Development Opportunities</h3>
                </div>
                <div className="space-y-3">
                  {analysis.improvements.map((improvement, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-amber-500/5 rounded-lg border-l-4 border-amber-500">
                      <div className="flex-1">
                        <p className="text-sm text-foreground leading-relaxed"
                           dangerouslySetInnerHTML={{ __html: improvement.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Skills Legend */}
          <SkillsLegend className="mb-8" compact data-testid="section-skills-legend" />

          {/* Additional Services Section */}
          <Card className="mb-8" data-testid="section-additional-services">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-bold" data-testid="heading-career-services">Career Development Services</h3>
              </div>
              <p className="text-muted-foreground mb-6" data-testid="text-services-intro">
                HumanMetrix offers additional analysis services to support your career journey:
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-career-fit">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-career-fit">Career Fit Analysis</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-career-fit">
                    Discover which roles and industries best match your skills, traits, and working style
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-interview-prep">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-interview-prep">Interview Preparation Guide</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-interview-prep">
                    Customized questions you're likely to face based on your profile, with strategies to highlight your strengths
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-work-style">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-work-style">Work Style Compatibility</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-work-style">
                    Understand how you collaborate and what team environments help you thrive
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-career-roadmap">
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-career-roadmap">Career Acceleration Roadmap</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-career-roadmap">
                    Personalized development plan with skills to prioritize for faster career progression
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-strengths-growth">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-strengths-growth">Strengths & Growth Areas</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-strengths-growth">
                    Comprehensive self-awareness report highlighting your competitive advantages and areas for development
                  </p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-primary/5 rounded-lg flex items-center gap-3" data-testid="container-contact-email">
                <Mail className="h-5 w-5 text-primary" />
                <p className="text-sm" data-testid="text-contact-email">
                  Contact us at <a href="mailto:hello@humanmetrix.co.uk" className="font-semibold text-primary underline" data-testid="link-contact-email">hello@humanmetrix.co.uk</a> for more information about these services.
                </p>
              </div>
            </div>
          </Card>

        </div>
      </main>
      <Footer />
    </div>
  );
}
