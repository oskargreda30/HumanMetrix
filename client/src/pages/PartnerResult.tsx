import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowLeft, User, Calendar, Building2, TrendingUp, Target, FileText, Star, Users, MessageSquare, BarChart3, Mail, Rocket, Clock, ShieldAlert, AlertTriangle, Download } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import SkillsLegend from "@/components/SkillsLegend";
import { normalizeAIReadinessScores, isSkillBasedAssessment, transformToRadarData, formatAssessmentType, getSkillAcronym } from "@/lib/assessmentSkills";
import { exportEnhancedCandidatePDF, captureRadarChart } from "@/lib/enhancedPdfExport";
import { getAIQBandInterpretation } from "@/data/aiq-questions";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface PartnerResultData {
  sessionId: string;
  assessmentType: string;
  externalUserId: string | null;
  externalEmail: string | null;
  completedAt: string;
  createdAt: string;
  organization: { id: string; name: string } | null;
  scores: Record<string, number>;
  overallScore: number;
  percentile: number | null;
  partnerName: string;
}

function getAssessmentLabel(type: string): string {
  const labels: Record<string, string> = {
    'fit': 'FIT Assessment',
    'fit_assessment': 'FIT Assessment',
    'ai_readiness': 'AI Readiness',
    'ai-readiness': 'AI Readiness',
    'aiq': 'Algorithmic Integrity Quotient',
    'algorithmic_integrity_quotient': 'Algorithmic Integrity Quotient',
    'prompt_architecture': 'Prompt Architecture',
    'prompt-architecture': 'Prompt Architecture',
  };
  return labels[type.toLowerCase()] || type;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-primary';
  if (score >= 40) return 'text-yellow-500';
  return 'text-red-500';
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 80) return 'default';
  if (score >= 60) return 'secondary';
  return 'outline';
}

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

export default function PartnerResult() {
  const [, params] = useRoute("/partner/results/:sessionId");
  const sessionId = params?.sessionId;
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<PartnerResultData>({
    queryKey: ['/api/partner/me/results', sessionId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/partner/me/results/${sessionId}`);
      return res.json();
    },
    enabled: !!sessionId,
  });

  const handleDownloadPDF = async () => {
    if (!data) {
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
        description: "Please wait while we prepare the report...",
      });

      const candidateData = {
        user: {
          firstName: data.externalUserId || undefined,
          lastName: undefined,
          email: data.externalEmail || 'Unknown',
        },
        results: [{
          assessmentType: data.assessmentType,
          scores: data.scores,
          totalScore: data.overallScore,
          completedAt: data.completedAt,
          status: 'completed',
        }],
      };

      const skillData: any[] = [];
      if (isSkillBasedAssessment(data.assessmentType) && data.scores) {
        const radarDataForPdf = transformToRadarData(data.scores, data.assessmentType);
        radarDataForPdf.forEach((skill: any) => {
          skillData.push({
            name: skill.skill,
            score: skill.score,
            assessment: formatAssessmentType(data.assessmentType),
          });
        });
      }

      // Wait for chart to render with retry mechanism (matching MyResults logic)
      const waitForElement = async (id: string, maxRetries = 10): Promise<boolean> => {
        for (let i = 0; i < maxRetries; i++) {
          const element = document.getElementById(id);
          if (element && element.querySelector('svg')) {
            return true;
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        return false;
      };

      let radarChartImages: { fit?: string; aiReadiness?: string } = {};

      if (data.assessmentType === 'fit') {
        const fitReady = await waitForElement('partner-pdf-fit-chart');
        if (fitReady) {
          for (let i = 0; i < 3; i++) {
            const fitChart = await captureRadarChart('partner-pdf-fit-chart');
            if (fitChart) {
              radarChartImages.fit = fitChart;
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }

      if (data.assessmentType === 'ai_readiness') {
        const aiReady = await waitForElement('partner-pdf-ai-readiness-chart');
        if (aiReady) {
          for (let i = 0; i < 3; i++) {
            const aiChart = await captureRadarChart('partner-pdf-ai-readiness-chart');
            if (aiChart) {
              radarChartImages.aiReadiness = aiChart;
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }

      const platformAverages = {
        totalCandidates: 1,
        avgScoreAcrossCandidates: 0,
        skillAverages: {},
      };

      await exportEnhancedCandidatePDF(
        candidateData,
        skillData,
        platformAverages,
        radarChartImages,
        undefined,
        []
      );

      toast({
        title: "Success",
        description: "Report has been downloaded successfully.",
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="text-destructive mb-4">
              <Target className="h-12 w-12 mx-auto opacity-50" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Unable to Load Results</h1>
            <p className="text-muted-foreground mb-4">
              {(error as Error)?.message || "This result could not be found or you don't have access to view it."}
            </p>
            <Link href="/partner">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasDetailedScores = data.scores && Object.keys(data.scores).length > 0;
  const normalizedScores = data.assessmentType === 'ai_readiness' 
    ? normalizeAIReadinessScores(data.scores) 
    : data.scores;
  
  const radarData = hasDetailedScores 
    ? Object.entries(normalizedScores)
        .filter(([_, score]) => typeof score === 'number')
        .map(([skill, score]) => ({
          skill,
          score,
          fullMark: 100,
        }))
    : [];

  const barData = hasDetailedScores
    ? Object.entries(normalizedScores)
        .filter(([_, score]) => typeof score === 'number')
        .map(([skill, score]) => ({
          skill: skill.length > 20 ? skill.substring(0, 17) + '...' : skill,
          score,
        }))
    : [];

  const pdfRadarData = hasDetailedScores
    ? Object.entries(normalizedScores)
        .filter(([_, score]) => typeof score === 'number')
        .map(([skill, score]) => ({
          skill: getSkillAcronym(skill),
          score,
          fullMark: 100,
        }))
    : [];

  const analysis = generateAnalysis(data.assessmentType, normalizedScores, data.overallScore);
  const isAIQ = data.assessmentType === 'aiq';
  const aiqBand = isAIQ ? getAIQBandInterpretation(data.overallScore || 0) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <Link href="/partner">
            <Button variant="ghost" className="gap-2 mb-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {getAssessmentLabel(data.assessmentType)} Results
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  <span>{data.externalEmail || data.externalUserId || 'Anonymous'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{data.completedAt ? format(new Date(data.completedAt), 'PPP') : 'N/A'}</span>
                </div>
                {data.organization && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    <span>{data.organization.name}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className={`text-2xl md:text-4xl font-bold ${getScoreColor(data.overallScore || 0)}`}>
                  {data.overallScore || 0}%
                </div>
                <div className="text-sm text-muted-foreground">Overall Score</div>
                {data.percentile && (
                  <Badge variant="outline" className="mt-1">
                    Top {100 - data.percentile}%
                  </Badge>
                )}
              </div>
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

        {/* Hidden charts for PDF export */}
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          {data.assessmentType === 'fit' && pdfRadarData.length > 0 && (
            <div id="partner-pdf-fit-chart" style={{ width: '600px', height: '400px', backgroundColor: '#ffffff' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={pdfRadarData}>
                  <PolarGrid stroke="#e5e7eb" strokeWidth={1} />
                  <PolarAngleAxis 
                    dataKey="skill" 
                    tick={{ fill: '#374151', fontSize: 12, fontWeight: 'bold' }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]}
                    tick={false}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#2563eb"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
          {data.assessmentType === 'ai_readiness' && pdfRadarData.length > 0 && (
            <div id="partner-pdf-ai-readiness-chart" style={{ width: '600px', height: '400px', backgroundColor: '#ffffff' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={pdfRadarData}>
                  <PolarGrid stroke="#e5e7eb" strokeWidth={1} />
                  <PolarAngleAxis 
                    dataKey="skill" 
                    tick={{ fill: '#374151', fontSize: 12, fontWeight: 'bold' }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]}
                    tick={false}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#2563eb"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* How to Read This Report */}
        <Card className="mb-8" data-testid="section-how-to-read">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold" data-testid="heading-how-to-read">How to Read This Report</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4" data-testid="text-guide-intro">
              A guide to interpreting candidate assessment data for informed hiring decisions
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <span className="font-medium text-sm">Score Interpretation</span>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-1">
                    <Badge className="bg-green-500 text-white text-[10px] px-1 py-0">75%+</Badge> <span>Strong performer,</span>
                    <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0">50-74%</Badge> <span>Developing,</span>
                    <Badge className="bg-red-500 text-white text-[10px] px-1 py-0">&lt;50%</Badge> <span>Needs attention</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <p className="font-medium text-sm">Radar Charts</p>
                  <p className="text-xs text-muted-foreground">
                    Visual overlays show how candidates compare across each capability dimension at a glance.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <p className="font-medium text-sm">Rankings & Percentiles</p>
                  <p className="text-xs text-muted-foreground">
                    See how each candidate ranks relative to others in the cohort and against broader benchmarks.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                <div>
                  <p className="font-medium text-sm">Strengths & Development Areas</p>
                  <p className="text-xs text-muted-foreground">
                    Each candidate's key strengths and growth areas help you understand their unique value proposition.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* AIQ Graded Score Visualization */}
        {isAIQ && data.overallScore !== undefined && aiqBand && (() => {
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
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span data-testid="text-aiq-min">0</span>
                  <span>20</span>
                  <span>40</span>
                  <span>60</span>
                  <span>80</span>
                  <span data-testid="text-aiq-max">100</span>
                </div>
                
                <div className="relative" data-testid="container-aiq-progress">
                  <Progress 
                    value={Math.min(data.overallScore, 100)} 
                    className="h-8 relative"
                    data-testid="progress-aiq-bar"
                    indicatorClassName={getBarColor(data.overallScore)}
                  />
                  
                  {[20, 40, 60, 80].map((mark) => (
                    <div 
                      key={mark}
                      className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/30 pointer-events-none" 
                      style={{ left: `${mark}%` }}
                    />
                  ))}
                  
                  {data.overallScore > 0 && (
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-bold whitespace-nowrap pointer-events-none"
                      style={{ left: `${Math.min(Math.max(data.overallScore, 8), 92)}%` }}
                      data-testid="label-aiq-score-position"
                    >
                      {data.overallScore}%
                    </div>
                  )}
                </div>
                
                <div className="text-center space-y-2" data-testid="container-aiq-band">
                  <Badge 
                    className={`text-sm px-4 py-1 ${
                      data.overallScore >= 80 ? 'bg-green-600' :
                      data.overallScore >= 60 ? 'bg-blue-600' :
                      data.overallScore >= 40 ? 'bg-amber-500' :
                      data.overallScore >= 20 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    data-testid="badge-aiq-band"
                  >
                    {aiqBand.title}
                  </Badge>
                  <p className="text-muted-foreground text-sm max-w-2xl mx-auto" data-testid="text-aiq-description">
                    {aiqBand.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })()}

        {/* Visualizations - For FIT and AI Readiness */}
        {hasDetailedScores && !isAIQ && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Skill Breakdown
                </CardTitle>
                <CardDescription>Detailed scores for each assessed skill</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(normalizedScores)
                    .filter(([_, score]) => typeof score === 'number')
                    .map(([skill, score]) => (
                    <div key={skill} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{skill}</span>
                        <Badge variant={getScoreBadgeVariant(score)}>{score}%</Badge>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            score >= 80 ? 'bg-green-500' : 
                            score >= 60 ? 'bg-primary' : 
                            score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {radarData.length >= 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Competency Profile
                  </CardTitle>
                  <CardDescription>Visual representation of skill distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--muted))" />
                        <PolarAngleAxis 
                          dataKey="skill" 
                          tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                        />
                        <Radar
                          name="Score"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Bar Chart */}
        {hasDetailedScores && !isAIQ && barData.length > 0 && (
          <Card className="p-6 mb-8">
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
        )}

        {/* Comprehensive Analysis */}
        <Card className="p-8 mb-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-6">Comprehensive Analysis</h2>
          
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-foreground leading-relaxed"
               dangerouslySetInnerHTML={{ __html: analysis.overall.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
            />
          </div>
          
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

        {/* Session Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Session ID</div>
                <div className="font-mono text-xs mt-1">{data.sessionId}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Assessment Type</div>
                <div className="mt-1">{getAssessmentLabel(data.assessmentType)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Completed</div>
                <div className="mt-1">
                  {data.completedAt ? format(new Date(data.completedAt), 'PPpp') : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Partner</div>
                <div className="mt-1">{data.partnerName}</div>
              </div>
              {data.organization && (
                <div>
                  <div className="text-muted-foreground">Organization</div>
                  <div className="mt-1">{data.organization.name}</div>
                </div>
              )}
              {data.externalUserId && (
                <div>
                  <div className="text-muted-foreground">External User ID</div>
                  <div className="font-mono text-xs mt-1">{data.externalUserId}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skills Legend */}
        <SkillsLegend className="mb-8" compact data-testid="section-skills-legend" />

        {/* Additional Services Section */}
        <Card className="mb-8" data-testid="section-additional-services">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold text-foreground" data-testid="heading-enterprise-services">Enterprise Services</h3>
            </div>
            <p className="text-muted-foreground mb-6" data-testid="text-services-intro">
              Enhance your hiring process with our advanced enterprise solutions:
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-onboarding">
                <div className="flex items-center gap-2 mb-2">
                  <Rocket className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-foreground" data-testid="heading-service-onboarding">Onboarding Service</h4>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-service-onboarding">
                  Time to Productivity Estimate and Hiring Risk Analysis to optimize your onboarding process
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-interview">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-foreground" data-testid="heading-service-interview">Suggested Interview Questions</h4>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-service-interview">
                  AI-generated questions to dig deeper into assessment results and explore trait gaps
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-ecosystem">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-foreground" data-testid="heading-service-ecosystem">The Ecosystem Index</h4>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-service-ecosystem">
                  Comprehensive team capability diagnostic that maps skills distribution and identifies gaps
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg relative" data-testid="card-service-cohort">
                <Badge className="absolute top-2 right-2 bg-amber-500 text-white border-amber-600 text-xs">Coming Soon</Badge>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-foreground" data-testid="heading-service-cohort">Cohort Benchmarking</h4>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-service-cohort">
                  Compare your team's performance against industry benchmarks and peer organizations
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-multi-role">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-foreground" data-testid="heading-service-multi-role">Multi-Candidate Role Fit</h4>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-service-multi-role">
                  Compare multiple candidates against a specific role with ranked recommendations
                </p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-primary/5 rounded-lg flex items-center gap-3" data-testid="container-contact-email">
              <Mail className="h-5 w-5 text-primary" />
              <p className="text-sm text-foreground" data-testid="text-contact-email">
                Contact us at <a href="mailto:hello@humanmetrix.co.uk" className="font-semibold text-primary underline" data-testid="link-contact-email">hello@humanmetrix.co.uk</a> to discuss your enterprise requirements.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
