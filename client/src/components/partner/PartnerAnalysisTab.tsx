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

interface AIRecommendations {
  roleSuitability: string;
  optimalEnvironment: string;
  keyStrengths: string[];
  developmentFocus: string[];
}

export default function PartnerAnalysisTab() {
  const [subTab, setSubTab] = useState("individual");
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendations | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
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

  const getAIQBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-600';
    if (score >= 60) return 'bg-blue-600';
    if (score >= 40) return 'bg-amber-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
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

  // Fetch AI recommendations when candidate data is available
  const fetchAIRecommendations = async () => {
    if (!selectedCandidate || isLoadingRecommendations) return;
    
    setIsLoadingRecommendations(true);
    try {
      const response = await apiRequest('POST', `/api/partner/me/candidates/${encodeURIComponent(selectedCandidate)}/recommendations`, {
        fitScore: fitOverallScore,
        aiReadinessScore: aiOverallScore,
        promptArchScore,
        aiqScore,
        fitSkills: fitRadarData.map(s => ({ name: s.fullName, score: s.score })),
        aiSkills: aiRadarData.map(s => ({ name: s.fullName, score: s.score })),
      });
      const data = await response.json();
      setAIRecommendations(data);
    } catch (error) {
      console.error('Failed to fetch AI recommendations:', error);
      toast({
        title: "Recommendations",
        description: "Could not generate AI recommendations",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

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
          <Card className="mb-6" data-testid="section-how-to-read">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold" data-testid="heading-how-to-read">How to Read This Report</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3" data-testid="text-guide-intro">
                A step-by-step guide to understanding candidate assessment results for informed hiring decisions
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">1</div>
                  <div>
                    <span className="font-medium text-xs">Score Interpretation</span>
                    <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1 mt-1">
                      <Badge className="bg-green-500 text-white text-[9px] px-1 py-0">75%+</Badge> <span>Strong,</span>
                      <Badge className="bg-amber-500 text-white text-[9px] px-1 py-0">50-74%</Badge> <span>Developing,</span>
                      <Badge className="bg-red-500 text-white text-[9px] px-1 py-0">&lt;50%</Badge> <span>Growth</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">2</div>
                  <div>
                    <p className="font-medium text-xs">Four Assessment Areas</p>
                    <div className="text-[11px] text-muted-foreground space-y-0.5 mt-1">
                      <div><span className="font-medium">1. FIT:</span> Behavioral traits for workplace success</div>
                      <div><span className="font-medium">2. AI Readiness:</span> Capabilities for AI-augmented work</div>
                      <div><span className="font-medium">3. Prompt Architecture:</span> Prompt engineering skills</div>
                      <div><span className="font-medium">4. AIQ:</span> Ethical reasoning in AI scenarios</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">3</div>
                  <div>
                    <p className="font-medium text-xs">Strengths & Development Areas</p>
                    <p className="text-[11px] text-muted-foreground">
                      Highlights strengths to leverage and areas to probe during hiring.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">4</div>
                  <div>
                    <p className="font-medium text-xs">Using the Results</p>
                    <p className="text-[11px] text-muted-foreground">
                      Guide interview questions and make informed hiring decisions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {selectedCandidate && isLoadingReport && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {selectedCandidate && candidateReport && (
            <>
              {/* Candidate Summary Box */}
              <Card className="mb-6 border-primary/20" data-testid="card-candidate-summary">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground" data-testid="text-candidate-name">
                          {selectedCandidateData?.user.firstName && selectedCandidateData?.user.lastName 
                            ? `${selectedCandidateData.user.firstName} ${selectedCandidateData.user.lastName}`
                            : selectedCandidateData?.user.email}
                        </h3>
                        <p className="text-xs text-muted-foreground" data-testid="text-candidate-email">
                          {selectedCandidateData?.user.email}
                        </p>
                      </div>
                    </div>
                    {(() => {
                      // Find top skill across all assessments
                      const allSkills: Array<{name: string, score: number, type: string}> = [];
                      fitRadarData.forEach(s => allSkills.push({name: s.fullName, score: s.score, type: 'FIT'}));
                      aiRadarData.forEach(s => allSkills.push({name: s.fullName, score: s.score, type: 'AI Readiness'}));
                      const topSkill = allSkills.sort((a, b) => b.score - a.score)[0];
                      return topSkill && topSkill.score > 0 ? (
                        <div className="flex-shrink-0 p-3 bg-primary/5 rounded-lg border border-primary/20" data-testid="box-top-skill">
                          <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Top Skill</p>
                          <p className="text-sm font-semibold text-primary" data-testid="text-top-skill">
                            {topSkill.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{topSkill.score}%</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  
                  {/* Assessment Scores Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                    <div className="text-center p-2 bg-primary/5 rounded-lg">
                      <div className="text-lg font-bold text-primary" data-testid="score-fit-summary">
                        {fitOverallScore ?? 'N/A'}
                        {fitOverallScore !== null && <span className="text-[10px]">%</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">FIT</div>
                    </div>
                    <div className="text-center p-2 bg-cyan-500/10 rounded-lg">
                      <div className="text-lg font-bold text-cyan-500" data-testid="score-ai-summary">
                        {aiOverallScore ?? 'N/A'}
                        {aiOverallScore !== null && <span className="text-[10px]">%</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">AI Ready</div>
                    </div>
                    <div className="text-center p-2 bg-purple-500/10 rounded-lg">
                      <div className="text-lg font-bold text-purple-500" data-testid="score-prompt-summary">
                        {promptArchScore ?? 'N/A'}
                        {promptArchScore !== null && <span className="text-[10px]">%</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Prompt</div>
                    </div>
                    <div className="text-center p-2 bg-emerald-500/10 rounded-lg">
                      <div className="text-lg font-bold text-emerald-500" data-testid="score-aiq-summary">
                        {aiqScore ?? 'N/A'}
                        {aiqScore !== null && <span className="text-[10px]">%</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">AIQ</div>
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

              {/* FIT Assessment Section */}
              {fitData && (
                <section className="mb-8" data-testid="section-fit-assessment">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white" data-testid="heading-fit-assessment">FIT Assessment</h2>
                      <p className="text-white/70 text-xs" data-testid="text-fit-subtitle">Behavioral competencies for workplace success</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <Card className="p-4">
                      <h3 className="text-sm font-semibold mb-3 text-center" data-testid="heading-fit-radar">Skills Radar</h3>
                      <div ref={fitChartRef} className="bg-white dark:bg-gray-900 rounded-lg" data-testid="chart-fit-radar">
                        <ResponsiveContainer width="100%" height={220}>
                          <RadarChart data={fitRadarData}>
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis 
                              dataKey="skill" 
                              tick={{ fill: 'hsl(var(--foreground))', fontSize: 9 }}
                            />
                            <PolarRadiusAxis 
                              angle={90} 
                              domain={[0, 100]}
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }}
                            />
                            <Radar
                              name="Score"
                              dataKey="score"
                              stroke="hsl(var(--primary))"
                              fill="hsl(var(--primary))"
                              fillOpacity={0.5}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h3 className="text-sm font-semibold mb-3 text-center" data-testid="heading-fit-breakdown">Skills Breakdown</h3>
                      <div className="space-y-2" data-testid="container-fit-skills">
                        {fitRadarData.map((item) => (
                          <div key={item.fullName} className="space-y-1" data-testid={`fit-skill-${item.fullName.toLowerCase().replace(/\s+/g, '-')}`}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium" data-testid={`text-fit-skill-name`}>{item.fullName}</span>
                              <Badge variant={item.score >= 80 ? "default" : item.score >= 60 ? "secondary" : "outline"} className="text-[10px]" data-testid={`badge-fit-score`}>
                                {item.score}%
                              </Badge>
                            </div>
                            <Progress value={item.score} className="h-1.5" data-testid={`progress-fit`} />
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  {fitAnalysis && (
                    <Card className="p-4">
                      <h3 className="text-sm font-semibold mb-3" data-testid="heading-fit-analysis">Analysis</h3>
                      <div className="mb-3 p-3 bg-muted/50 rounded-lg" data-testid="text-fit-overview">
                        <p className="text-xs text-foreground leading-relaxed">{fitAnalysis.overall}</p>
                      </div>
                      
                      {fitAnalysis.strengths.length > 0 && (
                        <div className="mb-3" data-testid="container-fit-strengths">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-3 w-3 text-primary" />
                            <h4 className="font-semibold text-xs" data-testid="heading-fit-strengths">Key Strengths</h4>
                          </div>
                          <div className="space-y-1">
                            {fitAnalysis.strengths.map((strength, index) => (
                              <div key={index} className="p-2 bg-primary/5 rounded-lg border-l-4 border-primary" data-testid={`fit-strength-${index}`}>
                                <p className="text-xs text-foreground leading-relaxed"
                                   dangerouslySetInnerHTML={{ __html: strength.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {fitAnalysis.improvements.length > 0 && (
                        <div data-testid="container-fit-improvements">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <h4 className="font-semibold text-xs" data-testid="heading-fit-improvements">Areas for Development</h4>
                          </div>
                          <div className="space-y-1">
                            {fitAnalysis.improvements.map((improvement, index) => (
                              <div key={index} className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-500" data-testid={`fit-improvement-${index}`}>
                                <p className="text-xs text-foreground leading-relaxed"
                                   dangerouslySetInnerHTML={{ __html: improvement.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  )}
                </section>
              )}

              {/* AI Readiness Assessment Section */}
              {aiData && (
                <section className="mb-8" data-testid="section-ai-assessment">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-cyan-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white" data-testid="heading-ai-assessment">AI Readiness Assessment</h2>
                      <p className="text-white/70 text-xs" data-testid="text-ai-subtitle">Capabilities for AI-augmented work</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <Card className="p-4">
                      <h3 className="text-sm font-semibold mb-3 text-center" data-testid="heading-ai-radar">Skills Radar</h3>
                      <div ref={aiChartRef} className="bg-white dark:bg-gray-900 rounded-lg" data-testid="chart-ai-radar">
                        <ResponsiveContainer width="100%" height={220}>
                          <RadarChart data={aiRadarData}>
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis 
                              dataKey="skill" 
                              tick={{ fill: 'hsl(var(--foreground))', fontSize: 9 }}
                            />
                            <PolarRadiusAxis 
                              angle={90} 
                              domain={[0, 100]}
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }}
                            />
                            <Radar
                              name="Score"
                              dataKey="score"
                              stroke="#06b6d4"
                              fill="#06b6d4"
                              fillOpacity={0.5}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h3 className="text-sm font-semibold mb-3 text-center" data-testid="heading-ai-breakdown">Skills Breakdown</h3>
                      <div className="space-y-2" data-testid="container-ai-skills">
                        {aiRadarData.map((item) => (
                          <div key={item.fullName} className="space-y-1" data-testid={`ai-skill-${item.fullName.toLowerCase().replace(/\s+/g, '-')}`}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium">{item.fullName}</span>
                              <Badge variant={item.score >= 80 ? "default" : item.score >= 60 ? "secondary" : "outline"} className="text-[10px]">
                                {item.score}%
                              </Badge>
                            </div>
                            <Progress value={item.score} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  {aiAnalysis && (
                    <Card className="p-4">
                      <h3 className="text-sm font-semibold mb-3" data-testid="heading-ai-analysis">Analysis</h3>
                      <div className="mb-3 p-3 bg-muted/50 rounded-lg" data-testid="text-ai-overview">
                        <p className="text-xs text-foreground leading-relaxed">{aiAnalysis.overall}</p>
                      </div>
                      
                      {aiAnalysis.strengths.length > 0 && (
                        <div className="mb-3" data-testid="container-ai-strengths">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-3 w-3 text-cyan-500" />
                            <h4 className="font-semibold text-xs" data-testid="heading-ai-strengths">Key Strengths</h4>
                          </div>
                          <div className="grid md:grid-cols-2 gap-1">
                            {aiAnalysis.strengths.map((strength, index) => (
                              <div key={index} className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border-l-4 border-cyan-500">
                                <p className="text-xs text-foreground leading-relaxed"
                                   dangerouslySetInnerHTML={{ __html: strength.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {aiAnalysis.improvements.length > 0 && (
                        <div data-testid="container-ai-improvements">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <h4 className="font-semibold text-xs" data-testid="heading-ai-improvements">Areas for Development</h4>
                          </div>
                          <div className="space-y-1">
                            {aiAnalysis.improvements.map((improvement, index) => (
                              <div key={index} className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-500">
                                <p className="text-xs text-foreground leading-relaxed"
                                   dangerouslySetInnerHTML={{ __html: improvement.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  )}
                </section>
              )}

              {/* Prompt Architecture Section */}
              {promptArchData && (
                <section className="mb-8" data-testid="section-prompt-assessment">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Target className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white" data-testid="heading-prompt-assessment">Prompt Architecture</h2>
                      <p className="text-white/70 text-xs" data-testid="text-prompt-subtitle">Real-world prompt engineering skills</p>
                    </div>
                    <Badge className={`ml-auto text-xs ${promptArchScore !== null && promptArchScore >= 75 ? 'bg-green-500' : promptArchScore !== null && promptArchScore >= 50 ? 'bg-amber-500' : 'bg-red-500'} text-white`}>
                      {promptArchScore}% Overall
                    </Badge>
                  </div>

                  <Card className="p-4 mb-4">
                    <div className="text-center mb-4">
                      <h3 className="text-sm font-medium text-muted-foreground mb-1" data-testid="label-prompt-score">Overall Score</h3>
                      <div className="text-3xl font-bold text-purple-500 mb-1" data-testid="text-prompt-score">{promptArchScore}%</div>
                    </div>
                    
                    {/* Level-by-Level Scores */}
                    {promptArchData.levels && promptArchData.levels.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-semibold text-foreground mb-4">Performance by Level</h4>
                        <div className="space-y-3">
                          {promptArchData.levels.map((level: any, index: number) => {
                            const levelScore = level.totalScore || Math.round(
                              ((level.scores?.clarity || 0) + 
                               (level.scores?.structure || 0) + 
                               (level.scores?.contextRelevance || 0) + 
                               (level.scores?.creativity || 0) + 
                               (level.scores?.iterativeImprovement || 0)) / 5
                            );
                            return (
                              <div key={index} className="space-y-1" data-testid={`prompt-level-${index + 1}`}>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium text-foreground">Level {index + 1}</span>
                                  <Badge variant={levelScore >= 75 ? "default" : levelScore >= 50 ? "secondary" : "outline"}>
                                    {levelScore}%
                                  </Badge>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all ${
                                      levelScore >= 75 ? 'bg-green-500' : 
                                      levelScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${levelScore}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </Card>

                  {promptAnalysis && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4" data-testid="heading-prompt-analysis">Analysis</h3>
                      <div className="mb-4 p-4 bg-muted/50 rounded-lg" data-testid="text-prompt-overview">
                        <p className="text-foreground leading-relaxed"
                           dangerouslySetInnerHTML={{ __html: promptAnalysis.overall.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div data-testid="container-prompt-strengths">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-4 w-4 text-purple-500" />
                            <h4 className="font-semibold">Strengths</h4>
                          </div>
                          <div className="space-y-2">
                            {promptAnalysis.strengths.map((strength, index) => (
                              <div key={index} className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-500">
                                <p className="text-sm text-foreground leading-relaxed"
                                   dangerouslySetInnerHTML={{ __html: strength.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div data-testid="container-prompt-improvements">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <h4 className="font-semibold">Development Areas</h4>
                          </div>
                          <div className="space-y-2">
                            {promptAnalysis.improvements.map((improvement, index) => (
                              <div key={index} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-500">
                                <p className="text-sm text-foreground leading-relaxed"
                                   dangerouslySetInnerHTML={{ __html: improvement.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </section>
              )}

              {/* AIQ Section */}
              {aiqData && (
                <section className="mb-8" data-testid="section-aiq">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white" data-testid="heading-aiq-assessment">Algorithmic Integrity Quotient (AIQ)</h2>
                      <p className="text-white/70 text-xs" data-testid="text-aiq-subtitle">Ethical reasoning in AI scenarios</p>
                    </div>
                  </div>

                  <Card className="p-4 mb-4">
                    <div className="text-center mb-4">
                      <h3 className="text-sm font-medium text-muted-foreground mb-1" data-testid="label-aiq-score">Overall Score</h3>
                      <div className="text-3xl font-bold text-emerald-500 mb-1" data-testid="text-aiq-score">{aiqScore}%</div>
                    </div>

                    <div className="space-y-6" data-testid="container-aiq-progress">
                      <div className="flex justify-between text-xs text-muted-foreground" data-testid="container-aiq-scale">
                        <span>0</span>
                        <span>20</span>
                        <span>40</span>
                        <span>60</span>
                        <span>80</span>
                        <span>100</span>
                      </div>
                      
                      <div className="relative">
                        <Progress 
                          value={aiqScore || 0} 
                          className="h-8"
                          indicatorClassName={getAIQBarColor(aiqScore || 0)}
                          data-testid="progress-aiq-score"
                        />
                        
                        {[20, 40, 60, 80].map((mark) => (
                          <div 
                            key={mark}
                            className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/30 pointer-events-none" 
                            style={{ left: `${mark}%` }}
                          />
                        ))}
                        
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-1 rounded text-sm font-bold whitespace-nowrap pointer-events-none"
                          style={{ left: `${Math.min(Math.max(aiqScore || 0, 8), 92)}%` }}
                          data-testid="badge-aiq-score-indicator"
                        >
                          {aiqScore}%
                        </div>
                      </div>
                      
                      {aiqScore !== null && (
                        <div className="text-center space-y-2">
                          <Badge className="text-sm px-4 py-1 bg-emerald-600" data-testid="badge-aiq-band">
                            {getAIQBandInterpretation(aiqScore).title}
                          </Badge>
                          <p className="text-muted-foreground text-sm max-w-2xl mx-auto" data-testid="text-aiq-band-description">
                            {getAIQBandInterpretation(aiqScore).description}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>

                  {aiqAnalysis && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4" data-testid="heading-aiq-analysis">Analysis</h3>
                      <div className="mb-4 p-4 bg-muted/50 rounded-lg" data-testid="text-aiq-overview">
                        <p className="text-foreground leading-relaxed"
                           dangerouslySetInnerHTML={{ __html: aiqAnalysis.overall.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div data-testid="container-aiq-strengths">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            <h4 className="font-semibold">Strengths</h4>
                          </div>
                          <div className="space-y-2">
                            {aiqAnalysis.strengths.map((strength, index) => (
                              <div key={index} className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-l-4 border-emerald-500">
                                <p className="text-sm text-foreground leading-relaxed"
                                   dangerouslySetInnerHTML={{ __html: strength.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div data-testid="container-aiq-improvements">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <h4 className="font-semibold">Development Areas</h4>
                          </div>
                          <div className="space-y-2">
                            {aiqAnalysis.improvements.map((improvement, index) => (
                              <div key={index} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-500">
                                <p className="text-sm text-foreground leading-relaxed"
                                   dangerouslySetInnerHTML={{ __html: improvement.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </section>
              )}

              {/* Final Candidate Recommendations */}
              <Card className="mb-6" data-testid="section-final-recommendations">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-foreground text-base">
                        <Award className="h-4 w-4 text-primary" />
                        Final Candidate Recommendations
                      </CardTitle>
                      <CardDescription className="text-xs">AI-powered strategic insights based on assessment data</CardDescription>
                    </div>
                    {!aiRecommendations && !isLoadingRecommendations && (
                      <Button 
                        size="sm" 
                        onClick={fetchAIRecommendations}
                        disabled={isLoadingRecommendations}
                        data-testid="button-generate-recommendations"
                      >
                        <Brain className="h-3 w-3 mr-1" />
                        Generate AI Insights
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {isLoadingRecommendations ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                      <span className="text-sm text-muted-foreground">Generating AI recommendations...</span>
                    </div>
                  ) : aiRecommendations ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="p-3 bg-primary/5 rounded-lg border-l-4 border-primary">
                          <h4 className="font-semibold text-foreground mb-1 text-sm" data-testid="heading-role-suitability">Role Suitability</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-role-suitability">
                            {aiRecommendations.roleSuitability}
                          </p>
                        </div>
                        <div className="p-3 bg-cyan-500/10 rounded-lg border-l-4 border-cyan-500">
                          <h4 className="font-semibold text-foreground mb-1 text-sm" data-testid="heading-optimal-environment">Optimal Environment</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-optimal-environment">
                            {aiRecommendations.optimalEnvironment}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="p-3 bg-purple-500/10 rounded-lg border-l-4 border-purple-500">
                          <h4 className="font-semibold text-foreground mb-1 text-sm" data-testid="heading-key-strengths">Key Strengths</h4>
                          <ul className="text-xs text-muted-foreground space-y-1" data-testid="text-key-strengths">
                            {aiRecommendations.keyStrengths.map((strength, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <CheckCircle2 className="h-3 w-3 text-purple-500 mt-0.5 flex-shrink-0" />
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-lg border-l-4 border-emerald-500">
                          <h4 className="font-semibold text-foreground mb-1 text-sm" data-testid="heading-development-focus">Development Focus</h4>
                          <ul className="text-xs text-muted-foreground space-y-1" data-testid="text-development-focus">
                            {aiRecommendations.developmentFocus.map((focus, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <TrendingUp className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span>{focus}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Click "Generate AI Insights" to create personalized recommendations</p>
                    </div>
                  )}
                </CardContent>
              </Card>

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

              {/* Recommended Next Steps - Dynamic */}
              <Card className="mb-6 border-primary/20" data-testid="section-next-steps">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-foreground text-base">
                    <Target className="h-4 w-4 text-primary" />
                    Recommended Next Steps
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Based on assessment results for {getCandidateName(selectedCandidateData)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
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
                      
                      // Cap to 3 steps for consistent UX
                      return steps.slice(0, 3).map((step, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">{i + 1}</div>
                          <p className="text-xs text-muted-foreground">{step}</p>
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
