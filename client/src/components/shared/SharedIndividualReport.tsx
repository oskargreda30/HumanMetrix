import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, User, Award, Brain, Target, TrendingUp, TrendingDown, FileText, BookOpen, Sparkles, Download, MessageSquare, Users, Clock, ShieldAlert, DollarSign, Lightbulb, RefreshCw, Rocket, BarChart3, Mail, ChevronUp, AlertCircle } from "lucide-react";
import { AnalysisLoadingScreen } from "./AnalysisLoadingScreen";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { FIT_SKILLS, AI_READINESS_SKILLS, getSkillAcronym, getAIReadinessScore, normalizeAIReadinessScores, transformToRadarData, isSkillBasedAssessment, formatAssessmentType } from "@/lib/assessmentSkills";
import SkillsLegend from "@/components/SkillsLegend";
import { getAIQBandInterpretation } from "@/data/aiq-questions";
import { apiRequest, queryClient } from "@/lib/queryClient";
import html2canvas from "html2canvas";
import { EnquiryModal } from "@/components/EnquiryModal";

const CHART_COLOR = "#5B8DB8";

export interface SharedIndividualReportConfig {
  candidatesEndpoint: string;
  reportEndpoint: string;
  profileInsightsEndpoint: string | ((candidateId: string) => string);
  contextType: 'admin' | 'partner';
}

interface CandidateData {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
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

interface SharedIndividualReportProps {
  config: SharedIndividualReportConfig;
}

export function SharedIndividualReport({ config }: SharedIndividualReportProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [reportTriggered, setReportTriggered] = useState(false);
  const [loadingTransitionComplete, setLoadingTransitionComplete] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const { toast } = useToast();
  
  const fitChartRef = useRef<HTMLDivElement>(null);
  const aiChartRef = useRef<HTMLDivElement>(null);
  const forceRefreshRef = useRef(false);

  const { data: candidates, isLoading } = useQuery<CandidateData[]>({
    queryKey: [config.candidatesEndpoint],
  });

  const { data: candidateReport, isLoading: isLoadingReport } = useQuery<any>({
    queryKey: ['individual-report', selectedCandidate, config.contextType],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('userIds', selectedCandidate);
      if (forceRefreshRef.current) {
        params.append('forceRefresh', 'true');
        forceRefreshRef.current = false;
      }
      const response = await fetch(`${config.reportEndpoint}?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch candidate report');
      return response.json();
    },
    enabled: !!selectedCandidate && reportTriggered,
  });

  const handleCandidateChange = (value: string) => {
    setSelectedCandidate(value);
    setReportTriggered(false);
    setLoadingTransitionComplete(false);
  };

  const handleRunAnalysis = () => {
    if (selectedCandidate) {
      setReportTriggered(true);
    }
  };

  // Insights are now generated server-side during the report call (kept for backwards compatibility)

  const selectedCandidateData = candidates?.find(c => c.user.id === selectedCandidate);

  // AI insights are now generated server-side during the report call
  // candidateReport.aiInsights contains the pre-loaded insights


  const getCandidateName = (candidate: CandidateData | undefined) => {
    if (!candidate) return 'Unknown';
    const { firstName, lastName, email } = candidate.user;
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim();
    }
    return email?.split('@')[0] || 'Unknown';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const getPromptArchBandInterpretation = (score: number): { title: string; description: string } => {
    if (score >= 80) {
      return {
        title: "Expert Prompt Engineer",
        description: "Demonstrates mastery of prompt engineering across all difficulty levels. Crafts highly effective prompts with exceptional clarity, structure, and creative problem-solving."
      };
    }
    if (score >= 70) {
      return {
        title: "Advanced Prompt Skills",
        description: "Shows strong prompt engineering capabilities with consistent performance across complexity levels. Effectively structures prompts for optimal AI responses."
      };
    }
    if (score >= 50) {
      return {
        title: "Competent Practitioner",
        description: "Demonstrates solid foundational skills in prompt construction. Handles standard scenarios well with room for growth in complex or nuanced prompting situations."
      };
    }
    if (score >= 30) {
      return {
        title: "Developing Skills",
        description: "Shows basic understanding of prompt engineering principles. Would benefit from training on advanced techniques, context setting, and iterative refinement."
      };
    }
    return {
      title: "Foundational Level",
      description: "Early stage in prompt engineering development. Requires structured learning on clarity, context relevance, and effective AI communication strategies."
    };
  };

  const fitData = candidateReport?.fitAssessments?.[0];
  const aiData = candidateReport?.aiReadinessAssessments?.[0];
  const promptData = candidateReport?.promptArchitectureAssessments?.[0];
  const aiqData = candidateReport?.aiqAssessments?.[0];

  const fitRadarData = fitData ? FIT_SKILLS.map(skill => ({
    skill: getSkillAcronym(skill.displayName),
    fullName: skill.displayName,
    score: fitData.scores[skill.key] || 0,
  })) : [];

  const normalizedAIScores = aiData ? normalizeAIReadinessScores(aiData.scores) : {};
  
  const aiRadarData = aiData ? AI_READINESS_SKILLS.map(skill => ({
    skill: getSkillAcronym(skill.displayName),
    fullName: skill.displayName,
    score: getAIReadinessScore(aiData.scores, skill.displayName),
  })) : [];

  const getAllSkills = () => {
    const skills: Array<{ name: string; score: number; category: string }> = [];
    
    if (fitData) {
      Object.entries(fitData.scores).forEach(([name, score]) => {
        skills.push({ name, score: score as number, category: 'FIT' });
      });
    }
    
    if (aiData) {
      Object.entries(normalizedAIScores).forEach(([name, score]) => {
        skills.push({ name, score: score as number, category: 'AI Readiness' });
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

  const handleExportPDF = async () => {
    if (!selectedCandidateData || !candidateReport || !candidateReport?.aiInsights) return;
    
    setIsExporting(true);
    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we prepare your comprehensive report...",
      });
      
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
      
      // Use enhanced PDF export (same as B2C) for comprehensive reports
      const { exportEnhancedCandidatePDF } = await import('@/lib/enhancedPdfExport');
      
      // Prepare candidate data in the format expected by enhanced PDF
      // Include user.id and all completed results with proper structure
      const candidateForPDF = {
        user: {
          id: selectedCandidateData.user.id,
          firstName: selectedCandidateData.user.firstName,
          lastName: selectedCandidateData.user.lastName,
          email: selectedCandidateData.user.email,
        },
        results: selectedCandidateData.results?.filter(r => r.status === 'completed') || [],
      };
      
      // Transform scores into skills array using the same method as B2C
      // This ensures consistent skill naming and normalization
      const allSkills: Array<{name: string, score: number, assessment: string}> = [];
      
      // Use transformToRadarData for proper skill transformation (same as B2C)
      const completedResults = selectedCandidateData.results?.filter(
        (r: any) => r.status === 'completed' && isSkillBasedAssessment(r.assessmentType) && r.scores
      ) || [];
      
      completedResults.forEach((result: any) => {
        const radarData = transformToRadarData(result.scores, result.assessmentType);
        radarData.forEach((skill: any) => {
          allSkills.push({
            name: skill.skill,
            score: skill.score,
            assessment: formatAssessmentType(result.assessmentType),
          });
        });
      });
      
      // Fetch platform averages - try admin endpoint, fall back to defaults if not accessible
      // This matches B2C behavior which also fetches from /api/admin/platform-averages
      let platformAverages = {
        totalCandidates: 1,
        avgScoreAcrossCandidates: 0,
        skillAverages: {},
      };
      try {
        const averagesRes = await fetch('/api/admin/platform-averages', {
          credentials: 'include',
        });
        if (averagesRes.ok) {
          platformAverages = await averagesRes.json();
        }
      } catch (e) {
        // Silently use defaults if fetch fails (partner may not have access)
      }
      
      // Prepare radar chart images
      const radarChartImages: { fit?: string; aiReadiness?: string } = {};
      if (fitChartImage) radarChartImages.fit = fitChartImage;
      if (aiChartImage) radarChartImages.aiReadiness = aiChartImage;
      
      // Fetch Prompt Architecture evaluation data if applicable
      let promptArchitectureData: any[] = [];
      const promptArchResult = selectedCandidateData.results?.find(
        r => r.assessmentType === 'prompt_architecture' && r.status === 'completed'
      );
      if (promptArchResult?.id) {
        try {
          const promptEvalRes = await fetch(`/api/prompt-evaluations/${promptArchResult.id}`, {
            credentials: 'include',
          });
          if (promptEvalRes.ok) {
            promptArchitectureData = await promptEvalRes.json();
          }
        } catch (e) {
          console.error('Failed to fetch prompt evaluations:', e);
        }
      }
      
      await exportEnhancedCandidatePDF(
        candidateForPDF,
        allSkills,
        platformAverages,
        radarChartImages,
        undefined,
        promptArchitectureData
      );
      
      toast({
        title: "PDF Generated",
        description: "Your comprehensive report has been downloaded.",
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

  return (
    <div className="space-y-4 md:space-y-6">
      {config.contextType === 'partner' && (
        <div className="p-3 md:p-4 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2 md:gap-3">
            <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-900 dark:text-gray-100">
                Credit Usage for Analysis
              </p>
              <p className="text-[11px] md:text-xs text-gray-600 dark:text-gray-300 mt-0.5 md:mt-1">
                Credits are only consumed when generating new analysis – saved results are always free. Profile insights: 1 credit.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <User className="h-4 w-4 md:h-5 md:w-5" />
            Individual Candidate Report
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Select a candidate to view their detailed assessment report
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          <Select value={selectedCandidate} onValueChange={handleCandidateChange}>
            <SelectTrigger className="w-full max-w-md text-xs md:text-sm" data-testid="select-individual-candidate">
              <SelectValue placeholder="Select a candidate..." />
            </SelectTrigger>
            <SelectContent>
              {candidates?.map((candidate) => (
                <SelectItem key={candidate.user.id} value={candidate.user.id}>
                  {getCandidateName(candidate)} ({candidate.user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCandidate && !reportTriggered && (
            <div className="mt-3 md:mt-4 flex flex-col items-start gap-2">
              <Button 
                onClick={handleRunAnalysis}
                data-testid="button-run-analysis"
                className="text-xs md:text-sm"
                size="sm"
              >
                <BarChart3 className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                Run Analysis
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      )}

      {selectedCandidate && reportTriggered && !loadingTransitionComplete && (
        <AnalysisLoadingScreen 
          isComplete={!isLoadingReport && !!candidateReport}
          averageTimeSeconds={20}
          message="Generating AI-powered profile insights..."
          onTransitionComplete={() => setLoadingTransitionComplete(true)}
        />
      )}

      {selectedCandidate && reportTriggered && loadingTransitionComplete && candidateReport && selectedCandidateData && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 md:mb-4">
            <h2 className="text-base md:text-2xl font-bold text-white flex items-center gap-1.5 md:gap-2">
              <FileText className="h-4 w-4 md:h-6 md:w-6 text-blue-300" />
              Individual Candidate Report
            </h2>
            <Button 
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
              data-testid="button-export-pdf-top"
              className="text-xs md:text-sm"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  Export as PDF
                </>
              )}
            </Button>
          </div>

          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20" data-testid="card-candidate-summary">
            <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
              <div className="grid gap-3 md:gap-4 md:grid-cols-5">
                <div className="md:col-span-1">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-5 w-5 md:h-7 md:w-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base md:text-xl font-bold text-foreground">{getCandidateName(selectedCandidateData)}</h2>
                      <p className="text-xs md:text-sm text-muted-foreground truncate max-w-[180px] md:max-w-none">{selectedCandidateData.user.email}</p>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                    {(() => {
                      const topFitSkill = fitData 
                        ? Object.entries(fitData.scores).sort((a, b) => (b[1] as number) - (a[1] as number))[0] 
                        : null;
                      return (
                        <div className="text-center p-2 md:p-4 rounded-lg border bg-card">
                          <div className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">FIT Top Skill</div>
                          <div className="text-xs md:text-base font-medium text-foreground mb-0.5 md:mb-1">{topFitSkill ? topFitSkill[0] : '-'}</div>
                          <div className={`text-lg md:text-2xl font-bold ${topFitSkill ? getScoreColor(topFitSkill[1] as number) : 'text-muted-foreground'}`}>
                            {topFitSkill ? `${topFitSkill[1]}%` : '-'}
                          </div>
                        </div>
                      );
                    })()}
                    {(() => {
                      const topAISkill = aiData && Object.keys(normalizedAIScores).length > 0
                        ? Object.entries(normalizedAIScores).sort((a, b) => (b[1] as number) - (a[1] as number))[0]
                        : null;
                      return (
                        <div className="text-center p-2 md:p-4 rounded-lg border bg-card">
                          <div className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">AI Readiness Top</div>
                          <div className="text-xs md:text-base font-medium text-foreground mb-0.5 md:mb-1">{topAISkill ? topAISkill[0] : '-'}</div>
                          <div className={`text-lg md:text-2xl font-bold ${topAISkill ? getScoreColor(topAISkill[1] as number) : 'text-muted-foreground'}`}>
                            {topAISkill ? `${topAISkill[1]}%` : '-'}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="text-center p-2 md:p-4 rounded-lg border bg-card">
                      <div className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">Prompt Architecture</div>
                      <div className="text-xs md:text-base font-medium text-foreground mb-0.5 md:mb-1">&nbsp;</div>
                      <div className={`text-lg md:text-2xl font-bold ${promptData ? getScoreColor(promptData.totalScore) : 'text-muted-foreground'}`}>
                        {promptData ? `${promptData.totalScore}%` : '-'}
                      </div>
                    </div>
                    <div className="text-center p-2 md:p-4 rounded-lg border bg-card">
                      <div className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">AIQ (Ethics)</div>
                      <div className="text-xs md:text-base font-medium text-foreground mb-0.5 md:mb-1">&nbsp;</div>
                      <div className={`text-lg md:text-2xl font-bold ${aiqData ? getScoreColor(aiqData.totalScore) : 'text-muted-foreground'}`}>
                        {aiqData ? `${aiqData.totalScore}%` : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
              <CardTitle className="flex items-center gap-2 text-sm md:text-lg text-foreground">
                <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                How to Read This Report
              </CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground">
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
                    <p className="text-xs text-muted-foreground">Evaluates AI prompt engineering skills across 7 difficulty levels. Each level tests clarity, structure, and creativity in prompt design.</p>
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

          {(fitData || aiData) && (
            <Card data-testid="card-strengths-weaknesses">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Trait Profile Summary
                </CardTitle>
                <CardDescription>
                  Highest and lowest scoring traits. Whether these align with role requirements determines fit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="flex items-center gap-2 mb-4 font-semibold text-blue-600">
                      <TrendingUp className="h-4 w-4" />
                      Highest Scoring Traits
                    </h4>
                    <div className="space-y-3">
                      {getStrengthsAndWeaknesses().strengths.map((skill, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                          <div>
                            <span className="font-medium">{skill.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">{skill.category}</Badge>
                          </div>
                          <span className="font-bold text-blue-600">{skill.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="flex items-center gap-2 mb-4 font-semibold text-slate-600 dark:text-slate-400">
                      <TrendingDown className="h-4 w-4" />
                      Lowest Scoring Traits
                    </h4>
                    <div className="space-y-3">
                      {getStrengthsAndWeaknesses().weaknesses.map((skill, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-950/20">
                          <div>
                            <span className="font-medium">{skill.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">{skill.category}</Badge>
                          </div>
                          <span className="font-bold text-slate-600 dark:text-slate-400">{skill.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                  <div ref={fitChartRef} className="h-72 bg-white dark:bg-gray-900 rounded-lg p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fitRadarData} layout="vertical" barCategoryGap="28%" margin={{ top: 5, right: 55, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis type="category" dataKey="skill" width={120} tick={{ fontSize: 11 }} />
                        <Bar
                          dataKey="score"
                          fill="#5B8DB8"
                          radius={[0, 4, 4, 0]}
                          barSize={18}
                          label={{ position: 'right', fontSize: 12, fontWeight: 600 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-3">
                    {Object.entries(fitData.scores).map(([skill, score]) => (
                      <div key={skill} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{skill}</span>
                          <span className={`font-medium ${getScoreColor(score as number)}`}>{score as number}%</span>
                        </div>
                        <Progress value={score as number} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                  <div ref={aiChartRef} className="h-96 bg-white dark:bg-gray-900 rounded-lg p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={aiRadarData} layout="vertical" barCategoryGap="28%" margin={{ top: 5, right: 55, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis type="category" dataKey="skill" width={120} tick={{ fontSize: 11 }} />
                        <Bar
                          dataKey="score"
                          fill="#6E8FA8"
                          radius={[0, 4, 4, 0]}
                          barSize={18}
                          label={{ position: 'right', fontSize: 12, fontWeight: 600 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-3">
                    {Object.entries(normalizedAIScores).map(([skill, score]) => (
                      <div key={skill} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="truncate max-w-[200px]">{skill}</span>
                          <span className={`font-medium ${getScoreColor(score as number)}`}>{score as number}%</span>
                        </div>
                        <Progress value={score as number} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {promptData && (
            <Card data-testid="card-prompt-details">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <FileText className="h-5 w-5 text-green-500" />
                  Prompt Architecture Assessment
                </CardTitle>
                <CardDescription>
                  AI prompt engineering capabilities across 7 difficulty levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <Badge 
                      variant={promptData.totalScore >= 70 ? "default" : promptData.totalScore >= 50 ? "secondary" : "outline"}
                      className="mb-3"
                    >
                      {getPromptArchBandInterpretation(promptData.totalScore).title}
                    </Badge>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {getPromptArchBandInterpretation(promptData.totalScore).description}
                    </p>
                  </div>
                  <div className="text-center p-6 rounded-lg bg-muted flex flex-col items-center justify-center">
                    <div className={`text-5xl font-bold ${getScoreColor(promptData.totalScore)}`}>
                      {promptData.totalScore}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">Overall Prompt Architecture Score</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Level Breakdown (7 Levels)</h4>
                  {promptData.levels && promptData.levels.length > 0 ? (
                    <div className="space-y-3">
                      {(() => {
                        // Check if this is imported data (level 0 entry indicates summary/imported data)
                        const importedEntry = promptData.levels.find((l: any) => l.level === 0 || l.isImported);
                        
                        // If imported, show a banner with summary scores above the 7-level breakdown
                        let importedBanner = null;
                        if (importedEntry) {
                          const importedScores = importedEntry.scores || {};
                          const getImportedScore = (key: string): number => {
                            if (importedScores[key] !== undefined) return importedScores[key];
                            if (importedScores[key.charAt(0).toUpperCase() + key.slice(1)] !== undefined) {
                              return importedScores[key.charAt(0).toUpperCase() + key.slice(1)];
                            }
                            return 0;
                          };
                          
                          importedBanner = (
                            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 mb-4" data-testid="imported-assessment-banner">
                              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                                This assessment was imported from external source. Summary scores shown below.
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <div className="text-center p-2 bg-white/50 dark:bg-slate-800/50 rounded" data-testid="imported-score-clarity">
                                  <div className="text-lg font-bold text-foreground">{getImportedScore('clarity')}/20</div>
                                  <div className="text-xs text-muted-foreground">Clarity</div>
                                </div>
                                <div className="text-center p-2 bg-white/50 dark:bg-slate-800/50 rounded" data-testid="imported-score-structure">
                                  <div className="text-lg font-bold text-foreground">{getImportedScore('structure')}/20</div>
                                  <div className="text-xs text-muted-foreground">Structure</div>
                                </div>
                                <div className="text-center p-2 bg-white/50 dark:bg-slate-800/50 rounded" data-testid="imported-score-context">
                                  <div className="text-lg font-bold text-foreground">{getImportedScore('contextRelevance')}/20</div>
                                  <div className="text-xs text-muted-foreground">Context</div>
                                </div>
                                <div className="text-center p-2 bg-white/50 dark:bg-slate-800/50 rounded" data-testid="imported-score-creativity">
                                  <div className="text-lg font-bold text-foreground">{getImportedScore('creativity')}/20</div>
                                  <div className="text-xs text-muted-foreground">Creativity</div>
                                </div>
                                <div className="text-center p-2 bg-white/50 dark:bg-slate-800/50 rounded" data-testid="imported-score-iterative">
                                  <div className="text-lg font-bold text-foreground">{getImportedScore('iterativeImprovement')}/20</div>
                                  <div className="text-xs text-muted-foreground">Iterative</div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        // Ensure all 7 levels are shown, filling missing ones with placeholders
                        const levelMap = new Map(promptData.levels.filter((l: any) => l.level !== 0).map((l: any) => [l.level, l]));
                        const allLevels = [1, 2, 3, 4, 5, 6, 7].map(levelNum => {
                          const existingLevel = levelMap.get(levelNum);
                          if (existingLevel) return existingLevel;
                          // Placeholder for missing levels
                          return {
                            level: levelNum,
                            scores: { clarity: 0, structure: 0, contextRelevance: 0, creativity: 0, iterativeImprovement: 0 },
                            totalScore: 0,
                            feedback: 'Not completed',
                            isMissing: true,
                          };
                        });
                        
                        const levelsContent = allLevels.map((level: any, idx: number) => {
                          const scores = level.scores || {};
                          
                          const getScore = (key: string): number => {
                            if (scores[key] !== undefined) return scores[key];
                            if (scores[key.charAt(0).toUpperCase() + key.slice(1)] !== undefined) {
                              return scores[key.charAt(0).toUpperCase() + key.slice(1)];
                            }
                            return 0;
                          };
                          
                          return (
                            <div key={level.level || idx} className={`space-y-2 ${level.isMissing ? 'opacity-50' : ''}`} data-testid={`pa-level-${level.level}`}>
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm text-foreground">
                                  Level {level.level}
                                </span>
                                <Badge variant={level.isMissing ? "outline" : getScoreBadgeVariant(level.totalScore)}>
                                  {level.isMissing ? 'N/A' : `${level.totalScore}%`}
                                </Badge>
                              </div>
                              <div className="h-4 bg-blue-100 dark:bg-blue-950 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all bg-blue-500"
                                  style={{ 
                                    width: `${level.totalScore}%`,
                                    opacity: 0.4 + (level.totalScore / 100) * 0.6
                                  }}
                                />
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span>Clarity: {getScore('clarity')}/20</span>
                                <span>Structure: {getScore('structure')}/20</span>
                                <span>Context: {getScore('contextRelevance')}/20</span>
                                <span>Creativity: {getScore('creativity')}/20</span>
                                <span>Iterative: {getScore('iterativeImprovement')}/20</span>
                              </div>
                            </div>
                          );
                        });
                        
                        // Return both the imported banner (if exists) and the 7 levels
                        return (
                          <>
                            {importedBanner}
                            {levelsContent}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-muted/50 text-center text-muted-foreground">
                      <p className="text-sm">Per-level evaluation data not available for this assessment.</p>
                      <p className="text-xs mt-1">This assessment was completed before detailed level tracking was implemented.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {aiqData && (() => {
            const aiqBandInfo = getAIQBandInterpretation(aiqData.totalScore);
            return (
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
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <Badge 
                        variant={aiqData.totalScore >= 80 ? "default" : aiqData.totalScore >= 60 ? "secondary" : "outline"}
                        className="mb-3"
                      >
                        {aiqBandInfo.title}
                      </Badge>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {aiqBandInfo.description}
                      </p>
                    </div>
                    <div className="text-center p-6 rounded-lg bg-muted flex flex-col items-center justify-center">
                      <div className={`text-5xl font-bold ${getScoreColor(aiqData.totalScore)}`}>
                        {aiqData.totalScore}%
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">Overall AIQ Score</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          <Card data-testid="card-profile-insights">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  Profile Insights and Recommendations
                </CardTitle>
                {candidateReport?.cached && config.contextType === 'partner' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      forceRefreshRef.current = true;
                      queryClient.invalidateQueries({ queryKey: ['individual-report', selectedCandidate, config.contextType] });
                    }}
                    disabled={isLoadingReport}
                    data-testid="button-rerun-individual-analysis"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Re-run Analysis (1 credit)
                  </Button>
                )}
              </div>
              <CardDescription>
                Analysis of {getCandidateName(selectedCandidateData)}'s profile with role fit recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(!candidateReport?.fitAssessments?.[0] && !candidateReport?.aiReadinessAssessments?.[0] && !candidateReport?.promptArchitectureAssessments?.[0] && !candidateReport?.aiqAssessments?.[0]) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500/50" />
                  <p className="text-sm font-medium">No Assessment Data Available</p>
                  <p className="text-xs mt-2">This candidate has not completed any assessments yet.</p>
                </div>
              ) : isLoadingReport ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                  <p className="text-sm">Generating profile insights...</p>
                  <p className="text-xs mt-2">Analyzing assessment data across all dimensions.</p>
                </div>
              ) : candidateReport?.aiInsights ? (
                <div className="space-y-6" data-testid="text-profile-insights">
                  {(() => {
                    const sections = [
                      { key: 'ROLE SUITABILITY', color: 'text-blue-600 dark:text-blue-400', icon: Target },
                      { key: 'OPTIMAL ENVIRONMENT', color: 'text-teal-600 dark:text-teal-400', icon: Users },
                      { key: 'KEY STRENGTHS', color: 'text-green-600 dark:text-green-400', icon: TrendingUp },
                      { key: 'DEVELOPMENT FOCUS', color: 'text-amber-600 dark:text-amber-400', icon: Target },
                      { key: 'OVERALL ASSESSMENT AND RECOMMENDATION', color: 'text-purple-600 dark:text-purple-400', icon: Award },
                    ];
                    
                    const parsedSections = sections.map((section) => {
                      const regex = new RegExp(`\\*\\*${section.key}\\*\\*\\s*([\\s\\S]*?)(?=\\*\\*[A-Z]|$)`, 'i');
                      const match = candidateReport?.aiInsights?.match(regex);
                      const content = match?.[1]?.trim();
                      return { ...section, content };
                    }).filter(s => s.content);
                    
                    if (parsedSections.length === 0) {
                      return candidateReport?.aiInsights?.split('\n').map((paragraph: string, i: number) => (
                        paragraph.trim() && <p key={i} className="text-sm text-muted-foreground mb-3">{paragraph}</p>
                      ));
                    }
                    
                    return parsedSections.map((section) => {
                      const IconComponent = section.icon;
                      return (
                        <div key={section.key}>
                          <h4 className={`text-sm font-bold ${section.color} uppercase tracking-wide mb-2 flex items-center gap-2`}>
                            <IconComponent className="h-4 w-4" />
                            {section.key}
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">AI insights will be generated automatically when data is available.</p>
                </div>
              )}
            </CardContent>
          </Card>

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
                  const fitScoresArr = fitData ? Object.values(fitData.scores) : [];
                  const aiScoresArr = aiData ? Object.values(aiData.scores) : [];
                  const allScoresArr = [
                    ...fitScoresArr,
                    ...aiScoresArr,
                    ...(promptData ? [promptData.totalScore] : []),
                    ...(aiqData ? [aiqData.totalScore] : [])
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
                  
                  if (promptData && promptData.totalScore >= 75) {
                    steps.push('Leverage strong prompt engineering skills for AI integration initiatives.');
                  }
                  if (aiqData && aiqData.totalScore >= 80) {
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

          <Card className="border-primary/20 bg-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-white" />
                Enterprise Services
              </CardTitle>
              <p className="text-sm text-white/80">
                Enhance your hiring decisions with premium services
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                    <Rocket className="h-4 w-4 text-white" />
                    Onboarding Service
                  </h4>
                  <p className="text-sm text-white/70">
                    Time to Productivity Estimate and Hiring Risk Analysis to optimize your onboarding process
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                    <MessageSquare className="h-4 w-4 text-white" />
                    Suggested Interview Questions
                  </h4>
                  <p className="text-sm text-white/70">
                    AI-generated questions to dig deeper into assessment results and explore trait gaps
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                    <Users className="h-4 w-4 text-white" />
                    Team Composition Fit
                  </h4>
                  <p className="text-sm text-white/70">
                    Analysis of how this candidate would complement your existing team dynamics
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                    <Clock className="h-4 w-4 text-white" />
                    Time to Productivity Estimate
                  </h4>
                  <p className="text-sm text-white/70">
                    Projected onboarding timeline based on skill readiness and learning agility
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                    <BarChart3 className="h-4 w-4 text-white" />
                    Candidate Comparison Tool
                  </h4>
                  <p className="text-sm text-white/70">
                    Compare multiple candidates side-by-side across all assessment dimensions with visual analytics
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white flex-wrap">
                    <TrendingUp className="h-4 w-4 text-white" />
                    Cohort Benchmarking
                    <Badge className="bg-amber-500 text-white border-amber-600 text-xs ml-auto">Coming Soon</Badge>
                  </h4>
                  <p className="text-sm text-white/70">
                    Compare candidate performance against industry benchmarks and peer organizations
                  </p>
                </div>
              </div>
              <div className="mt-4 text-center">
                <Button 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/20"
                  onClick={() => setShowEnquiryModal(true)}
                  data-testid="button-contact-team-individual"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Speak to the Team
                </Button>
              </div>
            </CardContent>
          </Card>

          {(fitData || aiData) && (
            <SkillsLegend className="mt-4" />
          )}

          <div className="flex justify-end gap-2">
            <Button 
              onClick={handleExportPDF}
              disabled={isExporting || !candidateReport?.aiInsights || false /* no secondary loading */}
              data-testid="button-export-individual-report"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (!candidateReport?.fitAssessments?.[0] && !candidateReport?.aiReadinessAssessments?.[0] && !candidateReport?.promptArchitectureAssessments?.[0] && !candidateReport?.aiqAssessments?.[0]) ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  No Data
                </>
              ) : isLoadingReport ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : !candidateReport?.aiInsights ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export as PDF
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-white border-white/50 hover:bg-white/10"
              data-testid="button-back-to-top-individual"
            >
              <ChevronUp className="h-4 w-4 mr-2" />
              Back to Top
            </Button>
          </div>
        </>
      )}

      {!selectedCandidate && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Select a candidate above to view their individual report
            </p>
          </CardContent>
        </Card>
      )}

      <EnquiryModal 
        open={showEnquiryModal} 
        onOpenChange={setShowEnquiryModal}
        context="Individual Report - Enterprise Services"
      />
    </div>
  );
}
