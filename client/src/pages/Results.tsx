import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, TrendingUp, AlertTriangle, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { exportEnhancedCandidatePDF, captureRadarChart } from "@/lib/enhancedPdfExport";
import { useToast } from "@/hooks/use-toast";
import { isSkillBasedAssessment, transformToRadarData, getSkillAcronym } from "@/lib/assessmentSkills";
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
import { formatAssessmentType } from "@/lib/assessmentSkills";
import { ResultsPaymentGate } from "@/components/ResultsPaymentGate";

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
            analysis.strengths.push(`Strong **AI Literacy & Prompting** (${score}/100): Demonstrates understanding of AI capabilities and can craft effective prompts to achieve desired outcomes.`);
          } else if (skillLower.includes("technical fluency")) {
            analysis.strengths.push(`Excellent **Technical Fluency** (${score}/100): Comfortable with technical concepts and can navigate AI tools and platforms effectively.`);
          } else if (skillLower.includes("critical thinking")) {
            analysis.strengths.push(`Outstanding **Critical Thinking** (${score}/100): Evaluates AI outputs critically, identifies limitations, and makes sound judgments about AI reliability.`);
          } else if (skillLower.includes("adaptive") || skillLower.includes("collaborative")) {
            analysis.strengths.push(`Proficient in **Adaptive & Collaborative Learning** (${score}/100): Quickly adapts to new AI tools and learns collaboratively in AI-enhanced environments.`);
          } else if (skillLower.includes("responsible")) {
            analysis.strengths.push(`Strong **Responsible AI Integration** (${score}/100): Uses AI ethically, understands implications, and implements safeguards appropriately.`);
          } else if (skillLower.includes("creative")) {
            analysis.strengths.push(`Impressive **Creative Innovation** (${score}/100): Leverages AI for creative problem-solving and generates innovative solutions.`);
          } else if (skillLower.includes("cross-functional")) {
            analysis.strengths.push(`Excellent **Cross-functional Collaboration** (${score}/100): Effectively collaborates across disciplines in AI-driven projects.`);
          } else {
            analysis.strengths.push(`Strong **${skill}** (${score}/100): Shows proficiency in this important AI readiness dimension.`);
          }
        });
      }
      
      if (improvements.length > 0) {
        improvements.forEach(([skill, score]) => {
          const skillLower = skill.toLowerCase();
          if (skillLower.includes("literacy") || skillLower.includes("prompting")) {
            analysis.improvements.push(`**AI Literacy & Prompting** (${score}/100): Recommend focused training on prompt engineering, AI fundamentals, and practical experience with various AI models.`);
          } else if (skillLower.includes("technical fluency")) {
            analysis.improvements.push(`**Technical Fluency** (${score}/100): Suggest building technical foundation through hands-on practice with AI APIs, understanding model architectures, and technical documentation.`);
          } else if (skillLower.includes("critical thinking")) {
            analysis.improvements.push(`**Critical Thinking** (${score}/100): Develop skills in evaluating AI outputs, recognizing biases and limitations, and validating AI-generated information.`);
          } else if (skillLower.includes("responsible")) {
            analysis.improvements.push(`**Responsible AI Integration** (${score}/100): Focus on AI ethics training, understanding regulatory requirements, and implementing responsible AI practices.`);
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
      const isPassed = aiqScore >= 70;
      
      analysis.overall = `This Algorithmic Integrity Quotient (AIQ) assessment evaluates understanding of AI ethics, bias, fairness, transparency, and responsible deployment. Score: **${aiqScore}/100** - **${isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT'}** (70% threshold).`;
      
      if (isPassed) {
        analysis.strengths.push(`**Strong ethical foundation**: Demonstrates solid understanding of AI ethics principles and responsible deployment practices.`);
        analysis.strengths.push(`**Good judgment**: Shows ability to identify and address ethical concerns in AI systems, including bias, transparency, and safety issues.`);
        analysis.strengths.push(`**Ready for AI governance**: Can make ethically sound decisions regarding AI system design, deployment, and oversight.`);
      } else {
        analysis.improvements.push(`**AI ethics fundamentals**: Recommend training on core AI ethics principles, including fairness, transparency, accountability, and safety.`);
        analysis.improvements.push(`**Bias recognition**: Develop skills in identifying various forms of algorithmic bias and understanding their real-world implications.`);
        analysis.improvements.push(`**Responsible deployment**: Study best practices for responsible AI deployment, including risk assessment and safeguard implementation.`);
        analysis.improvements.push(`**Regulatory awareness**: Familiarize with AI governance frameworks and ethical decision-making in AI contexts.`);
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
    if (!user || !allResults) {
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

      // Filter completed results only
      const completedResults = allResults.filter((r: any) => r.status === 'completed');

      // Prepare candidate data
      const candidateData = {
        user: {
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          email: user.email,
        },
        results: completedResults,
      };

      // Collect all skills from completed assessments
      const skillData: any[] = [];
      completedResults.forEach((r: any) => {
        if (isSkillBasedAssessment(r.assessmentType) && r.scores) {
          console.log(`[PDF Debug] Processing ${r.assessmentType}:`, {
            assessmentType: r.assessmentType,
            hasScores: !!r.scores,
            scoreKeys: r.scores ? Object.keys(r.scores) : [],
            formattedAssessment: formatAssessmentType(r.assessmentType)
          });
          const radarData = transformToRadarData(r.scores, r.assessmentType);
          console.log(`[PDF Debug] Radar data for ${r.assessmentType}:`, radarData);
          radarData.forEach((skill: any) => {
            const skillEntry = {
              name: skill.skill,
              score: skill.score,
              assessment: formatAssessmentType(r.assessmentType),
            };
            console.log(`[PDF Debug] Adding skill:`, skillEntry);
            skillData.push(skillEntry);
          });
        }
      });
      console.log(`[PDF Debug] Total skills collected:`, skillData.length, skillData);

      // Fetch platform averages
      const averagesRes = await fetch('/api/admin/platform-averages', {
        credentials: 'include',
      });
      const platformAverages = averagesRes.ok ? await averagesRes.json() : {
        totalCandidates: 1,
        avgScoreAcrossCandidates: 0,
        skillAverages: {},
      };

      // Capture radar charts for FIT and AI Readiness
      let radarChartImages: { fit?: string; aiReadiness?: string } = {};
      
      const fitResult = completedResults.find((r: any) => 
        r.assessmentType === 'fit' && r.status === 'completed'
      );
      const aiReadinessResult = completedResults.find((r: any) => 
        r.assessmentType === 'ai_readiness' && r.status === 'completed'
      );

      // Wait for charts to fully render
      await new Promise(resolve => setTimeout(resolve, 300));

      if (fitResult) {
        const fitChart = await captureRadarChart('user-pdf-fit-chart');
        if (fitChart) radarChartImages.fit = fitChart;
      }

      if (aiReadinessResult) {
        const aiChart = await captureRadarChart('user-pdf-ai-readiness-chart');
        if (aiChart) radarChartImages.aiReadiness = aiChart;
      }

      // Fetch Prompt Architecture evaluation data
      const promptArchitectureResult = completedResults.find((r: any) => 
        r.assessmentType === 'prompt_architecture' && r.status === 'completed'
      );
      let promptArchitectureData: any[] = [];
      if (promptArchitectureResult) {
        try {
          const promptEvalRes = await fetch(`/api/prompt-evaluations/${promptArchitectureResult.id}`, {
            credentials: 'include',
          });
          if (promptEvalRes.ok) {
            promptArchitectureData = await promptEvalRes.json();
          }
        } catch (error) {
          console.error('Error fetching prompt architecture data:', error);
        }
      }

      await exportEnhancedCandidatePDF(
        candidateData,
        skillData,
        platformAverages,
        radarChartImages,
        undefined,
        promptArchitectureData
      );

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
                <h1 className="text-3xl font-bold">
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

  // Get FIT and AI Readiness results for hidden PDF charts
  const fitResult = allResults?.find((r: any) => 
    r.assessmentType === 'fit' && r.status === 'completed'
  );
  const aiReadinessResult = allResults?.find((r: any) => 
    r.assessmentType === 'ai_readiness' && r.status === 'completed'
  );

  // Prepare data for hidden PDF charts (use acronyms to prevent text cutoff)
  const fitRadarData = fitResult?.scores ? Object.entries(fitResult.scores).map(([skill, score]) => ({
    skill: getSkillAcronym(skill),
    score: score as number,
    fullMark: 100,
  })) : [];

  const aiRadarData = aiReadinessResult?.scores ? Object.entries(aiReadinessResult.scores).map(([skill, score]) => ({
    skill: getSkillAcronym(skill),
    score: score as number,
    fullMark: 100,
  })) : [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      {/* Hidden charts for PDF export - positioned off-screen */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {fitResult && fitRadarData.length > 0 && (
          <div id="user-pdf-fit-chart" style={{ width: '600px', height: '400px', backgroundColor: '#ffffff' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={fitRadarData}>
                <PolarGrid stroke="#e5e7eb" strokeWidth={1} />
                <PolarAngleAxis 
                  dataKey="skill" 
                  tick={{ fill: '#374151', fontSize: 12, fontWeight: 'bold' }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tick={{ fill: '#9ca3af', fontSize: 7 }}
                  tickCount={5}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#2563eb"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#2563eb' }}
                  activeDot={{ r: 4, fill: '#2563eb' }}
                  label={{ 
                    position: 'outside',
                    fill: '#374151',
                    fontSize: 10,
                    fontWeight: 'bold'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
        {aiReadinessResult && aiRadarData.length > 0 && (
          <div id="user-pdf-ai-readiness-chart" style={{ width: '600px', height: '400px', backgroundColor: '#ffffff' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={aiRadarData}>
                <PolarGrid stroke="#e5e7eb" strokeWidth={1} />
                <PolarAngleAxis 
                  dataKey="skill" 
                  tick={{ fill: '#374151', fontSize: 12, fontWeight: 'bold' }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tick={{ fill: '#9ca3af', fontSize: 7 }}
                  tickCount={5}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#2563eb"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#2563eb' }}
                  activeDot={{ r: 4, fill: '#2563eb' }}
                  label={{ 
                    position: 'outside',
                    fill: '#374151',
                    fontSize: 10,
                    fontWeight: 'bold'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      
      <main className="flex-grow py-16">
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
                <h1 className="text-3xl font-bold">
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

          {/* Overall Score - only show for assessments with total scores */}
          {hasTotalScore && (
            <Card className="p-8 mb-8">
              <div className="text-center">
                <h2 className="text-lg font-medium text-muted-foreground mb-2">
                  Overall Score
                </h2>
                <div className="text-6xl font-bold text-primary mb-2">
                  {totalScore}
                </div>
                <p className="text-muted-foreground">out of 100</p>
              </div>
            </Card>
          )}

          {/* AIQ Horizontal Bar Visualization */}
          {assessmentType === 'aiq' && hasTotalScore && (
            <Card className="p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-6 text-center">Algorithmic Integrity Score</h2>
              <div className="space-y-4">
                {/* Score labels */}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span data-testid="text-aiq-min">0</span>
                  <span className="text-amber-600 font-medium" data-testid="text-aiq-pass-threshold">70 (Pass Rate)</span>
                  <span data-testid="text-aiq-max">100</span>
                </div>
                
                {/* Progress bar with pass marker */}
                <div className="relative" data-testid="container-aiq-progress">
                  <Progress 
                    value={Math.min(totalScore, 100)} 
                    className="h-8 relative"
                    data-testid="progress-aiq-bar"
                    indicatorClassName={
                      totalScore >= 70 
                        ? 'bg-green-600' 
                        : 'bg-amber-600'
                    }
                  />
                  
                  {/* Pass rate marker line */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-600 pointer-events-none" 
                    style={{ left: '70%' }}
                    data-testid="marker-aiq-pass-line"
                  />
                  
                  {/* Score value label - positioned safely within bounds */}
                  {totalScore > 0 && totalScore < 100 && (
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-bold whitespace-nowrap pointer-events-none"
                      style={{ left: `${Math.min(Math.max(totalScore, 10), 90)}%` }}
                      data-testid="label-aiq-score-position"
                    >
                      {totalScore}
                    </div>
                  )}
                </div>
                
                <p className="text-center mt-4 text-muted-foreground" data-testid="text-aiq-status">
                  {totalScore >= 70 
                    ? '✓ Passed - Strong understanding of AI ethics and responsible deployment' 
                    : 'Below pass rate - Additional training in AI ethics recommended'}
                </p>
              </div>
            </Card>
          )}

          {/* Visualizations - For FIT and AI Readiness */}
          {Object.keys(scores).length > 0 && assessmentType !== 'aiq' && (
            <div className="grid md:grid-cols-2 gap-8 mb-8">
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
          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6">Comprehensive Analysis</h2>
            
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

        </div>
      </main>
      <Footer />
    </div>
  );
}
