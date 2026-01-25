import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, User, BarChart3, Target, Award, Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, FileText, Star, Building2, MessageSquare, Mail, Trophy, AlertCircle, Lightbulb, RefreshCw, Sparkles, Download, BookOpen } from "lucide-react";
import html2canvas from "html2canvas";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { FIT_SKILLS, AI_READINESS_SKILLS, getSkillAcronym, getAIReadinessScore, normalizeAIReadinessScores } from "@/lib/assessmentSkills";
import SkillsLegend from "@/components/SkillsLegend";
import { getAIQBandInterpretation } from "@/data/aiq-questions";
import { apiRequest } from "@/lib/queryClient";
import { CriticalSkillsAnalysis, CriticalSkillData } from "@/components/shared/CriticalSkillsAnalysis";
import { CohortBenchmarking, AssessmentBenchmark } from "@/components/shared/CohortBenchmarking";
import PartnerCompareTab from "@/components/partner/PartnerCompareTab";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))",
];

const CHART_COLOR = "#3b82f6";

const renderInsideLabel = (props: any) => {
  const { cx, cy, x, y, value } = props;
  const insideX = cx + (x - cx) * 0.8;
  const insideY = cy + (y - cy) * 0.8;
  
  return (
    <text
      x={insideX}
      y={insideY}
      fill="#374151"
      fontSize={10}
      fontWeight="bold"
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {value}
    </text>
  );
};

interface CandidateData {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    externalUserId?: string | null;
  };
  results: Array<{
    id: string;
    assessmentType: string;
    totalScore: number;
    scores: Record<string, number>;
    completedAt: string;
    status: string;
  }>;
}

interface ComparisonData {
  radarData: Array<any>;
  skillComparison: Array<{ skillName: string; scores: Array<number | null> }>;
  averageScores: Array<number>;
  hasSkillData: boolean;
  fitAssessments: Array<{ scores: Record<string, number>; completedAt: Date } | null>;
  aiReadinessAssessments: Array<{ scores: Record<string, number>; completedAt: Date } | null>;
  promptArchitectureAssessments: Array<any | null>;
  aiqAssessments: Array<{ totalScore: number; scores: Record<string, number>; completedAt: Date } | null>;
}

interface RoleAlignment {
  overallFit: number | null;
  fitSkillAlignments?: Array<{
    skillName: string;
    candidateScore: number | null;
    requiredScore: number;
    gap: number | null;
    alignment: string;
    criticality?: 'critical' | 'important' | 'nice-to-have';
    dataAvailable?: boolean;
  }> | null;
  aiReadinessSkillAlignments?: Array<{
    skillName: string;
    candidateScore: number | null;
    requiredScore: number;
    gap: number | null;
    alignment: string;
    criticality?: 'critical' | 'important' | 'nice-to-have';
    dataAvailable?: boolean;
  }> | null;
  promptArchitectureScore?: number | null;
  aiqScore?: number | null;
  strengths: string[];
  gaps: string[];
  dataCoverage?: {
    percentage: number;
    assessedSkillCount: number;
    totalRequiredSkills: number;
    missingAssessments: string[];
    hasSufficientData: boolean;
  };
}

function generateAnalysis(assessmentType: string, scores: Record<string, number>, totalScore?: number) {
  const sortedSkills = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));
  const strengths = sortedSkills.filter(([_, score]) => (score as number) >= 75);
  const improvements = sortedSkills.filter(([_, score]) => (score as number) < 75);
  
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
          if (skill === "High Agency" || skill === "highAgency") {
            analysis.strengths.push(`Demonstrates strong **High Agency** (${score}%): Takes initiative, drives outcomes independently, and shows proactive problem-solving abilities.`);
          } else if (skill === "Intellectual Curiosity" || skill === "intellectualCuriosity") {
            analysis.strengths.push(`Exhibits excellent **Intellectual Curiosity** (${score}%): Shows eagerness to learn, asks thoughtful questions, and seeks to understand complex concepts.`);
          } else if (skill === "Resilience" || skill === "resilience") {
            analysis.strengths.push(`Shows robust **Resilience** (${score}%): Bounces back from setbacks, maintains composure under pressure, and adapts to changing circumstances.`);
          } else if (skill === "Empathy & Ethics" || skill === "empathyEthics") {
            analysis.strengths.push(`Displays strong **Empathy & Ethics** (${score}%): Considers others' perspectives, makes ethical decisions, and demonstrates social awareness.`);
          } else if (skill === "Growth Mindset" || skill === "growthMindset") {
            analysis.strengths.push(`Possesses a strong **Growth Mindset** (${score}%): Views challenges as opportunities, embraces feedback, and believes in continuous improvement.`);
          } else if (skill === "Interpersonal Agility" || skill === "interpersonalAgility") {
            analysis.strengths.push(`Excels in **Interpersonal Agility** (${score}%): Builds relationships effectively, adapts communication style, and collaborates seamlessly across diverse teams.`);
          }
        });
      }
      
      if (improvements.length > 0) {
        improvements.forEach(([skill, score]) => {
          if (skill === "Resilience" || skill === "resilience") {
            analysis.improvements.push(`**Resilience** (${score}%): Focus on stress management techniques, reframing setbacks as learning opportunities, and maintaining motivation through challenges.`);
          } else if (skill === "High Agency" || skill === "highAgency") {
            analysis.improvements.push(`**High Agency** (${score}%): Develop greater initiative-taking behaviors, practice leading projects independently, and strengthen decision-making confidence.`);
          } else if (skill === "Intellectual Curiosity" || skill === "intellectualCuriosity") {
            analysis.improvements.push(`**Intellectual Curiosity** (${score}%): Cultivate deeper questioning habits, explore cross-disciplinary knowledge, and engage more actively with complex problems.`);
          } else if (skill === "Empathy & Ethics" || skill === "empathyEthics") {
            analysis.improvements.push(`**Empathy & Ethics** (${score}%): Practice active listening, consider multiple perspectives in decision-making, and strengthen ethical reasoning in ambiguous situations.`);
          } else if (skill === "Growth Mindset" || skill === "growthMindset") {
            analysis.improvements.push(`**Growth Mindset** (${score}%): Embrace challenges as learning opportunities, seek constructive feedback, and develop persistence through difficulties.`);
          } else if (skill === "Interpersonal Agility" || skill === "interpersonalAgility") {
            analysis.improvements.push(`**Interpersonal Agility** (${score}%): Expand comfort with diverse communication styles, practice adaptability in team dynamics, and build broader relationship networks.`);
          }
        });
      }
      break;

    case "ai_readiness":
      analysis.overall = "This AI Readiness assessment measures capabilities critical for effective collaboration with AI systems and thriving in AI-augmented environments.";
      
      strengths.forEach(([skill, score]) => {
        analysis.strengths.push(`Strong **${skill}** (${score}%): Shows proficiency in this important AI readiness dimension.`);
      });
      
      improvements.forEach(([skill, score]) => {
        analysis.improvements.push(`**${skill}** (${score}%): This area would benefit from targeted development and practical experience.`);
      });
      break;

    case "prompt_architecture":
      analysis.overall = `This Prompt Architecture assessment evaluates prompt design skills across progressive difficulty levels. Overall score: **${totalScore}%**. Prompts are evaluated on five equal dimensions (20% each): Clarity, Structure, Context Relevance, Creativity, and Iterative Improvement.`;
      analysis.strengths.push(`**Solid prompt engineering foundation**: Can create effective prompts with good structure and clarity for most use cases.`);
      analysis.strengths.push(`**Good contextual awareness**: Demonstrates understanding of how to provide relevant context to AI systems.`);
      analysis.improvements.push(`**Advanced techniques**: Explore iterative refinement strategies and more sophisticated prompt patterns.`);
      break;

    case "aiq":
      const aiqScore = totalScore || 0;
      const bandInterpretation = getAIQBandInterpretation(aiqScore);
      
      analysis.overall = `This Algorithmic Integrity Quotient (AIQ) assessment evaluates ethical reasoning in AI scenarios using graded scoring. Score: **${aiqScore}%** - **${bandInterpretation.title}** (${bandInterpretation.range}). ${bandInterpretation.description}`;
      analysis.strengths.push(`**Strong ethical foundation**: Shows sound judgment balancing ethical imperatives with operational realities.`);
      analysis.strengths.push(`**Practical ethics awareness**: Understands core principles of responsible AI deployment.`);
      analysis.improvements.push(`**Advanced ethical reasoning**: Consider exploring more complex ethical frameworks and edge cases in AI decision-making.`);
      break;
  }
  
  return analysis;
}

function generateInterviewQuestions(gaps: string[], fitScores: Record<string, number> | null, aiScores: Record<string, number> | null) {
  const questions: Array<{question: string; targetSkill: string; purpose: string}> = [];
  
  const gapQuestionMap: Record<string, {question: string; purpose: string}> = {
    "High Agency": {
      question: "Describe a time when you identified a problem and took action without being asked. What was the outcome?",
      purpose: "Validates initiative-taking and independent problem-solving"
    },
    "Resilience": {
      question: "Tell me about a significant setback you faced at work. How did you handle it and what did you learn?",
      purpose: "Assesses ability to recover from challenges and maintain performance"
    },
    "Interpersonal Agility": {
      question: "Describe a situation where you had to adapt your communication style to work effectively with a difficult stakeholder.",
      purpose: "Tests stakeholder management and communication adaptability"
    },
    "Intellectual Curiosity": {
      question: "Tell me about a time when you dove deep into a topic outside your expertise. What drove you and what did you learn?",
      purpose: "Validates self-directed learning and curiosity"
    },
    "Empathy & Ethics": {
      question: "Describe a situation where you had to make a decision that affected others. How did you balance different perspectives?",
      purpose: "Assesses ethical reasoning and stakeholder consideration"
    },
    "Growth Mindset": {
      question: "Tell me about a skill you struggled with initially. How did you approach improving it?",
      purpose: "Tests response to challenges and learning approach"
    },
    "Technical Fluency": {
      question: "Walk me through how you would evaluate whether to implement an AI solution for a business process.",
      purpose: "Assesses practical AI implementation knowledge"
    },
    "Critical Thinking": {
      question: "How would you validate whether an AI system's output is reliable for a high-stakes decision?",
      purpose: "Tests analytical approach to AI outputs"
    },
    "AI Literacy & Prompting": {
      question: "Describe your experience working with AI tools. How do you craft effective prompts?",
      purpose: "Assesses hands-on AI experience and prompt engineering"
    },
    "Adaptive Learning": {
      question: "How do you stay current with emerging technologies in your field?",
      purpose: "Assesses continuous learning mindset"
    }
  };
  
  gaps.forEach(gap => {
    const skillMatch = Object.keys(gapQuestionMap).find(skill => 
      gap.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(gap.toLowerCase().split(' ')[0])
    );
    if (skillMatch && gapQuestionMap[skillMatch]) {
      questions.push({
        question: gapQuestionMap[skillMatch].question,
        targetSkill: skillMatch,
        purpose: gapQuestionMap[skillMatch].purpose
      });
    }
  });
  
  if (questions.length < 2 && fitScores) {
    const sortedFit = Object.entries(fitScores).sort((a, b) => a[1] - b[1]);
    const lowestFit = sortedFit.slice(0, 2);
    
    lowestFit.forEach(([skill]) => {
      const normalizedSkill = skill.replace(/([A-Z])/g, ' $1').trim();
      const match = Object.keys(gapQuestionMap).find(s => 
        normalizedSkill.toLowerCase().includes(s.toLowerCase().split(' ')[0])
      );
      if (match && gapQuestionMap[match] && !questions.some(q => q.targetSkill === match)) {
        questions.push({
          question: gapQuestionMap[match].question,
          targetSkill: match,
          purpose: gapQuestionMap[match].purpose
        });
      }
    });
  }
  
  if (questions.length < 2 && aiScores) {
    const sortedAI = Object.entries(aiScores).sort((a, b) => a[1] - b[1]);
    const lowestAI = sortedAI.slice(0, 1);
    
    lowestAI.forEach(([skill]) => {
      const match = Object.keys(gapQuestionMap).find(s => 
        skill.toLowerCase().includes(s.toLowerCase().split(' ')[0])
      );
      if (match && gapQuestionMap[match] && !questions.some(q => q.targetSkill === match)) {
        questions.push({
          question: gapQuestionMap[match].question,
          targetSkill: match,
          purpose: gapQuestionMap[match].purpose
        });
      }
    });
  }
  
  if (questions.length === 0) {
    questions.push({
      question: "Tell me about a time when you used AI tools to solve a complex problem. What was your approach?",
      targetSkill: "AI Application",
      purpose: "General assessment of AI literacy and practical application"
    });
    questions.push({
      question: "How do you stay current with emerging technologies in your field?",
      targetSkill: "Adaptive Learning",
      purpose: "Assesses continuous learning mindset"
    });
  }
  
  return questions.slice(0, 4);
}

function generateAlternativeRoles(fitScores: Record<string, number> | null, aiScores: Record<string, number> | null) {
  const roles: Array<{roleName: string; fitScore: number; coverageLabel: string}> = [];
  
  const avgFit = fitScores ? Math.round(Object.values(fitScores).reduce((a, b) => a + b, 0) / Object.keys(fitScores).length) : 0;
  const avgAI = aiScores ? Math.round(Object.values(aiScores).reduce((a, b) => a + b, 0) / Object.keys(aiScores).length) : 0;
  
  if (avgFit >= 70) {
    roles.push({ roleName: "Team Lead / People Manager", fitScore: avgFit, coverageLabel: "Strong behavioral match" });
  }
  if (avgAI >= 75) {
    roles.push({ roleName: "AI Product Manager", fitScore: avgAI, coverageLabel: "High AI readiness" });
    roles.push({ roleName: "AI Implementation Specialist", fitScore: Math.round(avgAI * 0.95), coverageLabel: "Strong technical fit" });
  }
  if (avgFit >= 75 && avgAI >= 70) {
    roles.push({ roleName: "Digital Transformation Lead", fitScore: Math.round((avgFit + avgAI) / 2), coverageLabel: "Balanced profile" });
  }
  if (avgFit >= 65) {
    roles.push({ roleName: "Project Coordinator", fitScore: Math.round(avgFit * 0.9), coverageLabel: "Good interpersonal skills" });
  }
  
  return roles.sort((a, b) => b.fitScore - a.fitScore).slice(0, 4);
}


export default function PartnerAnalysisTab() {
  const [subTab, setSubTab] = useState("individual");
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [profileInsights, setProfileInsights] = useState<string | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  
  const fitChartRef = useRef<HTMLDivElement>(null);
  const aiChartRef = useRef<HTMLDivElement>(null);

  const { data: candidates, isLoading: isLoadingCandidates } = useQuery<CandidateData[]>({
    queryKey: ['/api/partner/me/candidates'],
  });

  const { data: candidateReport, isLoading: isLoadingReport } = useQuery<ComparisonData>({
    queryKey: ['partner-individual-report', selectedCandidate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('candidateIds', selectedCandidate);
      const response = await fetch(`/api/partner/me/compare?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch candidate report');
      return response.json();
    },
    enabled: !!selectedCandidate,
  });

  const getCandidateName = (candidate: CandidateData | undefined) => {
    if (!candidate) return 'Unknown';
    const { firstName, lastName, email } = candidate.user;
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim();
    }
    return email?.split('@')[0] || 'Unknown';
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 75) return 'default';
    if (score >= 50) return 'secondary';
    return 'destructive';
  };

  const selectedCandidateData = candidates?.find(c => c.user.id === selectedCandidate);

  const fitData = candidateReport?.fitAssessments?.[0];
  const aiData = candidateReport?.aiReadinessAssessments?.[0];
  const promptArchData = candidateReport?.promptArchitectureAssessments?.[0];
  const aiqData = candidateReport?.aiqAssessments?.[0];

  const fitRadarData = fitData ? FIT_SKILLS.map(skill => ({
    skill: getSkillAcronym(skill.displayName),
    fullName: skill.displayName,
    score: fitData.scores[skill.key] || fitData.scores[skill.displayName] || 0,
  })) : [];

  // Normalize AI Readiness scores to handle legacy key mappings
  const normalizedAIScores = aiData ? normalizeAIReadinessScores(aiData.scores) : {};
  const aiRadarData = aiData ? AI_READINESS_SKILLS.map(skill => ({
    skill: getSkillAcronym(skill.displayName),
    fullName: skill.displayName,
    score: getAIReadinessScore(aiData.scores, skill.displayName),
  })) : [];

  const fitOverallScore = fitRadarData.length > 0 
    ? Math.round(fitRadarData.reduce((sum, d) => sum + d.score, 0) / fitRadarData.length) 
    : null;
  const aiOverallScore = aiRadarData.length > 0 
    ? Math.round(aiRadarData.reduce((sum, d) => sum + d.score, 0) / aiRadarData.length) 
    : null;
  const promptArchScore = promptArchData?.totalScore ?? null;
  const aiqScore = aiqData?.totalScore ?? null;

  const fitAnalysis = fitData ? generateAnalysis("fit", fitData.scores) : null;
  const aiAnalysis = aiData ? generateAnalysis("ai_readiness", aiData.scores) : null;
  const promptAnalysis = promptArchData ? generateAnalysis("prompt_architecture", {}, promptArchScore || 0) : null;
  const aiqAnalysis = aiqData ? generateAnalysis("aiq", {}, aiqScore || 0) : null;

  // Get all skills from FIT and AI Readiness for trait analysis
  const getAllSkills = () => {
    const skills: Array<{ name: string; score: number; category: string }> = [];
    
    if (fitData) {
      fitRadarData.forEach(s => {
        skills.push({ name: s.fullName, score: s.score, category: 'FIT' });
      });
    }
    
    if (aiData) {
      aiRadarData.forEach(s => {
        skills.push({ name: s.fullName, score: s.score, category: 'AI Readiness' });
      });
    }
    
    return skills.sort((a, b) => b.score - a.score);
  };

  const getStrengthsAndWeaknesses = () => {
    const skills = getAllSkills();
    return {
      strengths: skills.slice(0, 3),
      weaknesses: skills.slice(-3).reverse(),
    };
  };

  // Generate AI profile insights
  const handleGenerateInsights = async () => {
    if (!selectedCandidate || !candidateReport || isGeneratingInsights) return;
    
    setIsGeneratingInsights(true);
    try {
      const assessmentData = {
        candidateName: getCandidateName(selectedCandidateData),
        fit: fitData ? {
          average: fitOverallScore,
          scores: fitData.scores,
        } : null,
        aiReadiness: aiData ? {
          average: aiOverallScore,
          scores: aiData.scores,
        } : null,
        promptArchitecture: promptArchData ? { totalScore: promptArchScore } : null,
        aiq: aiqData ? { totalScore: aiqScore } : null,
        strengths: getStrengthsAndWeaknesses().strengths,
        lowestScoring: getStrengthsAndWeaknesses().weaknesses,
      };
      
      const response = await apiRequest('POST', `/api/partner/me/candidates/${encodeURIComponent(selectedCandidate)}/profile-insights`, {
        assessmentData
      });
      const data = await response.json();
      setProfileInsights(data.insights);
    } catch (error) {
      console.error('Failed to generate profile insights:', error);
      toast({
        title: "Error",
        description: "Could not generate profile insights",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    if (!selectedCandidateData || !candidateReport) return;
    
    setIsExporting(true);
    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we prepare your report...",
      });
      
      // Capture radar charts as images
      let fitChartImage: string | null = null;
      let aiChartImage: string | null = null;
      
      if (fitChartRef.current) {
        try {
          const canvas = await html2canvas(fitChartRef.current, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false,
          });
          fitChartImage = canvas.toDataURL('image/png');
        } catch (e) {
          console.error('Failed to capture FIT chart:', e);
        }
      }
      
      if (aiChartRef.current) {
        try {
          const canvas = await html2canvas(aiChartRef.current, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false,
          });
          aiChartImage = canvas.toDataURL('image/png');
        } catch (e) {
          console.error('Failed to capture AI chart:', e);
        }
      }
      
      // Dynamic import for PDF generation
      const { generateIndividualReportPDF } = await import('@/lib/pdfExport');
      await generateIndividualReportPDF({
        candidate: selectedCandidateData,
        candidateName: getCandidateName(selectedCandidateData),
        fitData: fitData ? { scores: fitData.scores } : null,
        aiData: aiData ? { scores: aiData.scores } : null,
        promptData: promptArchData ? { totalScore: promptArchData.totalScore } : null,
        aiqData: aiqData ? { totalScore: aiqData.totalScore } : null,
        profileInsights,
        fitChartImage,
        aiChartImage,
      });
      
      toast({
        title: "PDF Generated",
        description: "Your individual report has been downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoadingCandidates) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-analysis" />
      </div>
    );
  }

  if (!candidates || candidates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Candidates Yet</h3>
          <p className="text-muted-foreground">
            Once your candidates complete assessments, you'll be able to view their analysis here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Candidate Analysis</h2>
        <p className="text-sm text-white/70">
          View individual reports, compare candidates, and analyze role fit
        </p>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="bg-white/10 border border-white/20">
          <TabsTrigger value="individual" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
            <User className="h-4 w-4 mr-2" />
            Individual Report
          </TabsTrigger>
          <TabsTrigger value="compare" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
            <Users className="h-4 w-4 mr-2" />
            Compare Candidates
          </TabsTrigger>
        </TabsList>

        {/* Individual Report Tab */}
        <TabsContent value="individual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Candidate</CardTitle>
              <CardDescription>Choose a candidate to view their detailed assessment report</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedCandidate} onValueChange={(value) => {
                setSelectedCandidate(value);
                setAIRecommendations(null);
                setProfileInsights(null);
              }}>
                <SelectTrigger data-testid="select-individual-candidate">
                  <SelectValue placeholder="Select a candidate..." />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((candidate) => (
                    <SelectItem key={candidate.user.id} value={candidate.user.id}>
                      {getCandidateName(candidate)} ({candidate.user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* How to Read This Report */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" data-testid="section-how-to-read">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <BookOpen className="h-5 w-5 text-primary" />
                How to Read This Report
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                A guide to understanding {getCandidateName(selectedCandidateData)}'s assessment results
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">Understanding Trait-Based Scores</p>
                    <p className="text-xs text-muted-foreground">FIT and AI Readiness are <span className="font-medium">trait-based assessments</span>. A high score means the trait is strongly present - whether this is beneficial depends on what the specific role requires.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">FIT Assessment (Behavioral)</p>
                    <p className="text-xs text-muted-foreground">Measures 6 behavioral traits (e.g., High Agency, Resilience). Higher scores = stronger trait presence. Match against role requirements to assess fit.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">AI Readiness (Technical)</p>
                    <p className="text-xs text-muted-foreground">Measures 9 AI-related capabilities. Higher scores indicate stronger aptitude in each area. Compare to role requirements for relevance.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">Prompt Architecture</p>
                    <p className="text-xs text-muted-foreground">Evaluates AI prompt engineering skills across 4 difficulty levels. Each level tests clarity, structure, and creativity in prompt design.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">AIQ (Ethics)</p>
                    <p className="text-xs text-muted-foreground">Algorithmic Integrity Quotient - measures understanding of AI ethics, bias, fairness, and responsible AI practices. Single overall score.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">6</div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">Trait Profile Summary</p>
                    <p className="text-xs text-muted-foreground">Top 3 highest and lowest scoring traits across FIT and AI Readiness. Use Role Fit analysis to determine which traits matter for specific positions.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedCandidate && isLoadingReport && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {selectedCandidate && candidateReport && (
            <>
              {/* Candidate Info Summary Box - First */}
              <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20" data-testid="card-candidate-summary">
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-foreground" data-testid="text-candidate-name">{getCandidateName(selectedCandidateData)}</h2>
                          <p className="text-sm text-muted-foreground" data-testid="text-candidate-email">{selectedCandidateData?.user.email}</p>
                        </div>
                      </div>
                      {(() => {
                        const topSkill = getStrengthsAndWeaknesses().strengths[0];
                        return topSkill ? (
                          <div className="mt-3 p-2 bg-background/50 rounded-lg inline-flex items-center gap-2" data-testid="box-top-skill">
                            <Award className="h-4 w-4 text-primary" />
                            <span className="text-sm">Top Skill: <span className="font-semibold text-foreground">{topSkill.name}</span> ({topSkill.score}%)</span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <div className="md:col-span-2">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className="text-xs text-muted-foreground mb-1">FIT</div>
                          <div className={`text-lg font-bold ${fitOverallScore !== null ? getScoreColor(fitOverallScore) : 'text-muted-foreground'}`}>
                            {fitOverallScore !== null ? `${fitOverallScore}%` : '-'}
                          </div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className="text-xs text-muted-foreground mb-1">AI Ready</div>
                          <div className={`text-lg font-bold ${aiOverallScore !== null ? getScoreColor(aiOverallScore) : 'text-muted-foreground'}`}>
                            {aiOverallScore !== null ? `${aiOverallScore}%` : '-'}
                          </div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className="text-xs text-muted-foreground mb-1">Prompt</div>
                          <div className={`text-lg font-bold ${promptArchScore !== null ? getScoreColor(promptArchScore) : 'text-muted-foreground'}`}>
                            {promptArchScore !== null ? `${promptArchScore}%` : '-'}
                          </div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className="text-xs text-muted-foreground mb-1">AIQ</div>
                          <div className={`text-lg font-bold ${aiqScore !== null ? getScoreColor(aiqScore) : 'text-muted-foreground'}`}>
                            {aiqScore !== null ? `${aiqScore}%` : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Candidate Overview - After Summary */}
              <Card data-testid="card-candidate-overview">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-xl">{getCandidateName(selectedCandidateData)}</CardTitle>
                      <CardDescription>{selectedCandidateData?.user.email}</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {(() => {
                        let count = 0;
                        if (fitData) count++;
                        if (aiData) count++;
                        if (promptArchData) count++;
                        if (aiqData) count++;
                        return count;
                      })()} Assessments Completed
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">FIT</span>
                      </div>
                      {fitData ? (
                        <span className="text-2xl font-bold">
                          {fitOverallScore}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not taken</span>
                      )}
                    </div>
                    
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">AI Readiness</span>
                      </div>
                      {aiData ? (
                        <span className="text-2xl font-bold">
                          {aiOverallScore}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not taken</span>
                      )}
                    </div>
                    
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Prompt Arch</span>
                      </div>
                      {promptArchData ? (
                        <span className={`text-2xl font-bold ${getScoreColor(promptArchScore || 0)}`}>
                          {promptArchScore}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not taken</span>
                      )}
                    </div>
                    
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium">AIQ</span>
                      </div>
                      {aiqData ? (
                        <span className={`text-2xl font-bold ${getScoreColor(aiqScore || 0)}`}>
                          {aiqScore}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not taken</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trait Profile Summary */}
              {(fitData || aiData) && (
                <Card className="mb-6" data-testid="card-strengths-weaknesses">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Award className="h-4 w-4 text-primary" />
                      Trait Profile Summary
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Highest and lowest scoring traits across FIT and AI Readiness assessments
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="flex items-center gap-2 mb-3 font-semibold text-sm text-blue-600 dark:text-blue-400">
                          <TrendingUp className="h-4 w-4" />
                          Highest Scoring Traits
                        </h4>
                        <div className="space-y-2">
                          {getStrengthsAndWeaknesses().strengths.map((skill, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20" data-testid={`item-strength-${i}`}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{skill.name}</span>
                                <Badge variant="outline" className="text-[10px]">{skill.category}</Badge>
                              </div>
                              <span className="font-bold text-blue-600 dark:text-blue-400">{skill.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="flex items-center gap-2 mb-3 font-semibold text-sm text-slate-600 dark:text-slate-400">
                          <TrendingDown className="h-4 w-4" />
                          Lowest Scoring Traits
                        </h4>
                        <div className="space-y-2">
                          {getStrengthsAndWeaknesses().weaknesses.map((skill, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/20" data-testid={`item-weakness-${i}`}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{skill.name}</span>
                                <Badge variant="outline" className="text-[10px]">{skill.category}</Badge>
                              </div>
                              <span className="font-bold text-slate-600 dark:text-slate-400">{skill.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* FIT Assessment Details */}
              {fitData && (
                <Card data-testid="card-fit-details">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-500" />
                      FIT Assessment Details
                    </CardTitle>
                    <CardDescription>
                      Behavioral trait scores - higher values indicate stronger trait presence
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div ref={fitChartRef} className="h-80 bg-white dark:bg-gray-900 rounded-lg p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={fitRadarData} cx="50%" cy="50%" outerRadius="70%">
                            <PolarGrid strokeDasharray="3 3" />
                            <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                            <Radar
                              dataKey="score"
                              stroke={CHART_COLOR}
                              fill={CHART_COLOR}
                              fillOpacity={0.5}
                              label={renderInsideLabel}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="space-y-3">
                        {fitRadarData.map((item) => (
                          <div key={item.fullName} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{item.fullName}</span>
                              <span className={`font-medium ${getScoreColor(item.score)}`}>{item.score}%</span>
                            </div>
                            <Progress value={item.score} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Readiness Assessment Details */}
              {aiData && (
                <Card data-testid="card-ai-details">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      AI Readiness Assessment Details
                    </CardTitle>
                    <CardDescription>
                      Technical capability scores - higher values indicate stronger aptitude in each area
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div ref={aiChartRef} className="h-80 bg-white dark:bg-gray-900 rounded-lg p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={aiRadarData} cx="50%" cy="50%" outerRadius="70%">
                            <PolarGrid strokeDasharray="3 3" />
                            <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                            <Radar
                              dataKey="score"
                              stroke={CHART_COLOR}
                              fill={CHART_COLOR}
                              fillOpacity={0.5}
                              label={renderInsideLabel}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="space-y-3">
                        {aiRadarData.map((item) => (
                          <div key={item.fullName} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="truncate max-w-[200px]">{item.fullName}</span>
                              <span className={`font-medium ${getScoreColor(item.score)}`}>{item.score}%</span>
                            </div>
                            <Progress value={item.score} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Prompt Architecture Assessment */}
              {promptArchData && (
                <Card data-testid="card-prompt-details">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <FileText className="h-5 w-5 text-green-500" />
                      Prompt Architecture Assessment
                    </CardTitle>
                    <CardDescription>
                      AI prompt engineering capabilities across 4 difficulty levels
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="text-center p-4 rounded-lg bg-muted">
                        <div className={`text-3xl font-bold ${getScoreColor(promptArchScore || 0)}`}>
                          {promptArchScore}%
                        </div>
                        <div className="text-sm text-muted-foreground">Total Score</div>
                      </div>
                      {promptArchData.percentile && (
                        <div className="text-center p-4 rounded-lg bg-muted">
                          <div className="text-3xl font-bold text-blue-600">
                            {promptArchData.percentile}th
                          </div>
                          <div className="text-sm text-muted-foreground">Percentile</div>
                        </div>
                      )}
                    </div>
                    
                    {promptArchData.levels && (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground">Level Breakdown</h4>
                        <div className="space-y-3">
                          {promptArchData.levels.map((level: any) => (
                            <div key={level.level} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm text-foreground">Level {level.level}</span>
                                <Badge variant={getScoreBadgeVariant(level.totalScore)}>
                                  {level.totalScore}%
                                </Badge>
                              </div>
                              <div className="h-4 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    level.totalScore >= 80 ? 'bg-green-500' : 
                                    level.totalScore >= 60 ? 'bg-primary' : 
                                    level.totalScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${level.totalScore}%` }}
                                />
                              </div>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>Clarity: {level.scores?.clarity || 0}%</span>
                                <span>Structure: {level.scores?.structure || 0}%</span>
                                <span>Creativity: {level.scores?.creativity || 0}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* AIQ Assessment */}
              {aiqData && (
                <Card data-testid="card-aiq-details">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-amber-500" />
                      AIQ Assessment
                    </CardTitle>
                    <CardDescription>
                      Algorithmic Integrity Quotient - AI ethics and responsibility
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center p-6 rounded-lg bg-muted inline-block">
                      <div className={`text-4xl font-bold ${getScoreColor(aiqScore || 0)}`}>
                        {aiqScore}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Overall AIQ Score</div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Final Candidate Recommendations */}
              {(fitData || aiData || promptArchData || aiqData) && (
                <Card data-testid="card-final-recommendations" className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 border-2">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold text-foreground uppercase tracking-wide">
                      Final Candidate Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Role Suitability */}
                    <div>
                      <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">Role Suitability</h4>
                      <p className="text-sm text-foreground leading-relaxed">
                        {(() => {
                          const avgScore = (() => {
                            const scores = [
                              ...(fitOverallScore !== null ? [fitOverallScore] : []),
                              ...(aiOverallScore !== null ? [aiOverallScore] : []),
                              ...(promptArchScore !== null ? [promptArchScore] : []),
                              ...(aiqScore !== null ? [aiqScore] : [])
                            ];
                            return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                          })();
                          
                          if (avgScore >= 75) {
                            return `${getCandidateName(selectedCandidateData)} demonstrates exceptional capabilities that would translate well into leadership and specialist positions. Roles such as Senior AI Strategist, Team Lead, or Technical Director would leverage their comprehensive skill set effectively. Their balanced profile across multiple assessment areas opens opportunities in cross-functional and client-facing roles.`;
                          } else if (avgScore >= 60) {
                            return `${getCandidateName(selectedCandidateData)} demonstrates solid interpersonal strengths that would translate well into people-focused positions. Roles such as Team Coordinator or Client Success Manager would leverage their natural empathy and relationship-building capabilities effectively. Their assessment profile also suggests potential in specialized AI roles such as Prompt Engineer or AI Content Strategist.`;
                          } else {
                            return `${getCandidateName(selectedCandidateData)} shows foundational capabilities with room for growth. Entry-level positions with structured mentorship would allow them to develop their skills while contributing immediate value. Consider roles that play to their identified strengths while providing development opportunities.`;
                          }
                        })()}
                      </p>
                    </div>

                    {/* Optimal Environment */}
                    <div>
                      <h4 className="text-sm font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-2">Optimal Environment</h4>
                      <p className="text-sm text-foreground leading-relaxed">
                        {(() => {
                          const aiqVal = aiqScore || 0;
                          const promptVal = promptArchScore || 0;
                          
                          if (aiqVal >= 70 && promptVal >= 70) {
                            return `This candidate would thrive in organizations with strong ethical frameworks and AI-forward companies embracing emerging technologies. Their assessment profile suggests they perform best when given clear objectives while having the autonomy to determine how to achieve them. A collaborative environment that values both innovation and responsibility would be ideal.`;
                          } else if (aiqVal >= 70) {
                            return `This candidate would thrive in organizations that prioritize ethical practices and responsible innovation. Their strong ethical awareness suggests they would excel in governance-focused roles or companies with established compliance frameworks. They perform best in structured environments with clear guidelines.`;
                          } else if (promptVal >= 70) {
                            return `This candidate would thrive in dynamic, fast-paced environments that embrace AI and automation. Their technical capabilities suggest they would excel in innovative companies at the forefront of AI adoption. They perform best when given creative freedom and challenging problems to solve.`;
                          } else {
                            return `This candidate would benefit from a supportive, growth-oriented environment with clear structure and mentorship. Organizations that invest in employee development and provide clear career progression paths would be ideal. They perform best when given guidance while building their capabilities.`;
                          }
                        })()}
                      </p>
                    </div>

                    {/* Key Strengths */}
                    <div>
                      <h4 className="text-sm font-bold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">Key Strengths</h4>
                      <p className="text-sm text-foreground leading-relaxed">
                        {(() => {
                          const strengths = getStrengthsAndWeaknesses().strengths;
                          const strengthNames = strengths.map(s => s.name.toLowerCase()).join(', ');
                          
                          return `${getCandidateName(selectedCandidateData)}'s key strengths include strong ${strengthNames}. These capabilities position them to add immediate value in roles that require clear communication and thoughtful problem-solving. Their balanced skill profile across both behavioral and technical dimensions makes them adaptable to various team contexts.`;
                        })()}
                      </p>
                    </div>

                    {/* Development Focus */}
                    <div>
                      <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2">Development Focus</h4>
                      <p className="text-sm text-foreground leading-relaxed">
                        {(() => {
                          const weaknesses = getStrengthsAndWeaknesses().weaknesses;
                          const weaknessNames = weaknesses.slice(0, 2).map(w => w.name).join(' and ');
                          
                          return `To maximize ${getCandidateName(selectedCandidateData)}'s potential, we recommend focusing development efforts on ${weaknessNames} through targeted training and practical exercises. Structured learning combined with real-world application will accelerate their growth in these areas. Consider pairing with experienced mentors who excel in these dimensions.`;
                        })()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI-Powered Profile Insights */}
              <Card className="mb-6" data-testid="card-profile-insights">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base text-foreground">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        AI-Powered Profile Insights
                      </CardTitle>
                      <CardDescription className="text-xs">
                        AI-generated analysis of {getCandidateName(selectedCandidateData)}'s trait profile
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateInsights}
                      disabled={isGeneratingInsights || !candidateReport}
                      data-testid="button-generate-insights"
                    >
                      {isGeneratingInsights ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Generating...
                        </>
                      ) : profileInsights ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Regenerate
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Generate Insights
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {profileInsights ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert" data-testid="text-profile-insights">
                      {profileInsights.split('\n').map((paragraph, i) => (
                        paragraph.trim() && <p key={i} className="text-xs text-muted-foreground mb-2">{paragraph}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Click "Generate Insights" to create an AI-powered analysis of this candidate's trait profile.</p>
                      <p className="text-[10px] mt-1">The analysis considers all completed assessments and provides hiring-relevant observations.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recommended Next Steps */}
              <Card data-testid="card-recommended-next-steps">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    Recommended Next Steps
                  </CardTitle>
                  <CardDescription>
                    Based on assessment results, consider these next steps for {getCandidateName(selectedCandidateData)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const allScoresArr = [
                        ...(fitOverallScore !== null ? [fitOverallScore] : []),
                        ...(aiOverallScore !== null ? [aiOverallScore] : []),
                        ...(promptArchScore !== null ? [promptArchScore] : []),
                        ...(aiqScore !== null ? [aiqScore] : [])
                      ];
                      const avgScoreVal = allScoresArr.length > 0 
                        ? Math.round(allScoresArr.reduce((a, b) => a + b, 0) / allScoresArr.length) 
                        : 0;
                      
                      const steps: string[] = [];
                      
                      if (avgScoreVal >= 80) {
                        steps.push('Schedule a final interview to validate exceptional assessment results with practical scenarios.');
                        steps.push('Consider for accelerated onboarding or leadership development programs.');
                        steps.push('Evaluate for cross-functional project opportunities that leverage diverse strengths.');
                      } else if (avgScoreVal >= 60) {
                        steps.push('Conduct a structured interview focusing on identified development areas.');
                        steps.push('Discuss tailored training and mentorship opportunities during onboarding.');
                        steps.push('Consider pairing with experienced team members for knowledge transfer.');
                      } else {
                        steps.push('Assess alignment with entry-level or developmental role requirements.');
                        steps.push('Explore structured upskilling programs to address skill gaps.');
                        steps.push('Consider role modifications that play to existing strengths while building capabilities.');
                      }
                      
                      if (promptArchScore !== null && promptArchScore >= 75) {
                        steps.push('Leverage strong prompt engineering skills for AI integration initiatives.');
                      }
                      if (aiqScore !== null && aiqScore >= 80) {
                        steps.push('Consider for roles involving AI governance or ethical AI implementation.');
                      }
                      
                      return steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{i + 1}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{step}</p>
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Skills Legend */}
              <section className="mb-6">
                <SkillsLegend compact data-testid="section-skills-legend" />
              </section>

              {/* Export Options */}
              <div className="flex justify-end gap-2 mb-6">
                <Button 
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  data-testid="button-export-individual-report"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export as PDF
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Enterprise Services Section */}
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
                    <Trophy className="h-4 w-4 text-primary" />
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
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-cohort">
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
                <p className="text-sm" data-testid="text-contact-email">
                  Contact us at <a href="mailto:hello@humanmetrix.co.uk" className="font-semibold text-primary underline" data-testid="link-contact-email">hello@humanmetrix.co.uk</a> to discuss your enterprise requirements.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Compare Candidates Tab */}
        <TabsContent value="compare" className="space-y-6">
          <PartnerCompareTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
