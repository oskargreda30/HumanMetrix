import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, User, Award, Brain, Target, TrendingUp, TrendingDown, FileText, Sparkles, Download, MessageSquare, Users, Clock, ShieldAlert, DollarSign, Lightbulb, RefreshCw, Rocket, BarChart3, Mail, ChevronUp, AlertCircle } from "lucide-react";
import { AnalysisLoadingScreen } from "./AnalysisLoadingScreen";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { calculateAverageScore, FIT_SKILLS, AI_READINESS_SKILLS, getSkillAcronym, getAIReadinessScore, normalizeAIReadinessScores, transformToRadarData, isSkillBasedAssessment, formatAssessmentType } from "@/lib/assessmentSkills";
import SkillsLegend from "@/components/SkillsLegend";
import { getAIQBandInterpretation } from "@/data/aiq-questions";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EnquiryModal } from "@/components/EnquiryModal";
import { HowToReadReport } from "@/components/shared/HowToReadReport";

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

const formatReportDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} at ${timePart}`;
};

export function SharedIndividualReport({ config }: SharedIndividualReportProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [reportTriggered, setReportTriggered] = useState(false);
  const [loadingTransitionComplete, setLoadingTransitionComplete] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const { toast } = useToast();
  
  const fitChartRef = useRef<HTMLDivElement>(null);
  const aiChartRef = useRef<HTMLDivElement>(null);
  const forceRefreshRef = useRef(false);

  const { data: candidates, isLoading } = useQuery<CandidateData[]>({
    queryKey: [config.candidatesEndpoint],
  });

  const { data: candidateReport, isLoading: isLoadingReport, isFetching: isFetchingReport, error: reportError } = useQuery<any>({
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

  useEffect(() => {
    if (reportError && isRerunning) {
      setIsRerunning(false);
      setLoadingTransitionComplete(true);
      toast({ title: "Re-run failed", description: "Failed to regenerate analysis. Please try again.", variant: "destructive" });
    }
  }, [reportError, isRerunning]);

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
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getPromptArchBandInterpretation = (score: number): { title: string; description: string } => {
    if (score >= 80) return { title: "Expert Prompt Engineer", description: "Demonstrates mastery of prompt engineering across all difficulty levels." };
    if (score >= 70) return { title: "Advanced Prompt Skills", description: "Shows strong prompt engineering capabilities with consistent performance." };
    if (score >= 50) return { title: "Competent Practitioner", description: "Demonstrates solid foundational skills in prompt construction." };
    if (score >= 30) return { title: "Developing Skills", description: "Shows basic understanding of prompt engineering principles." };
    return { title: "Foundational Level", description: "Early stage in prompt engineering development." };
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
        description: "Please wait while we prepare your report...",
      });

      await new Promise(resolve => setTimeout(resolve, 300));
      await document.fonts.ready;

      let fitChartImage: string | null = null;
      let aiChartImage: string | null = null;

      try {
        if (fitChartRef.current && fitData) {
          const h2c = (await import('html2canvas')).default;
          const canvas = await h2c(fitChartRef.current, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false,
          });
          fitChartImage = canvas.toDataURL('image/jpeg', 0.7);
        }
      } catch (err) {
        console.warn('Could not capture FIT chart:', err);
      }

      try {
        if (aiChartRef.current && aiData) {
          const h2c = (await import('html2canvas')).default;
          const canvas = await h2c(aiChartRef.current, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false,
          });
          aiChartImage = canvas.toDataURL('image/jpeg', 0.7);
        }
      } catch (err) {
        console.warn('Could not capture AI chart:', err);
      }

      const { exportIndividualReportPDF } = await import('@/lib/pdfExport');

      await exportIndividualReportPDF({
        candidate: {
          firstName: selectedCandidateData.user.firstName,
          lastName: selectedCandidateData.user.lastName,
          email: selectedCandidateData.user.email,
        },
        fitAssessment: fitData ? { scores: fitData.scores, completedAt: fitData.completedAt } : null,
        aiReadinessAssessment: aiData ? { scores: aiData.scores, completedAt: aiData.completedAt } : null,
        promptArchitectureAssessment: promptData ? {
          levels: promptData.levels || [],
          totalScore: promptData.totalScore,
          percentile: promptData.percentile,
          completedAt: promptData.completedAt,
        } : null,
        aiqAssessment: aiqData ? {
          totalScore: aiqData.totalScore,
          scores: aiqData.scores,
          completedAt: aiqData.completedAt,
        } : null,
        aiInsights: candidateReport.aiInsights,
        fitChartImage,
        aiChartImage,
      });
      
      toast({
        title: "PDF Generated",
        description: "Your comprehensive report has been downloaded.",
      });
    } catch (error: any) {
      console.error("Error generating PDF:", error?.message || error, error?.stack || '');
      toast({
        title: "Export failed",
        description: `Failed to generate PDF: ${error?.message || 'Unknown error'}. Please try again.`,
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

      {selectedCandidate && reportTriggered && (!loadingTransitionComplete || isRerunning) && (
        <AnalysisLoadingScreen 
          isComplete={!isFetchingReport && !!candidateReport}
          averageTimeSeconds={20}
          message={isRerunning ? "Re-generating AI analysis with fresh insights..." : "Generating AI-powered profile insights..."}
          onTransitionComplete={() => {
            setLoadingTransitionComplete(true);
            if (isRerunning) {
              setIsRerunning(false);
              toast({ title: "Analysis regenerated", description: "Fresh AI analysis has been generated successfully." });
            }
          }}
        />
      )}

      {selectedCandidate && reportTriggered && loadingTransitionComplete && !isRerunning && candidateReport && selectedCandidateData && (
        <div id="individual-report-content" className="space-y-8 md:space-y-10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 md:mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-2xl font-bold text-white flex items-center gap-1.5 md:gap-2">
                <FileText className="h-4 w-4 md:h-6 md:w-6 text-blue-300" />
                Individual Candidate Report
              </h2>
              {config.contextType === 'partner' && candidateReport?.generatedAt && (
                <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-blue-100" data-testid="text-individual-report-date-top">
                  {candidateReport?.cached ? (
                    <>
                      <Clock className="h-3 w-3" />
                      <span>Cached — {formatReportDate(candidateReport.generatedAt)}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      <span>Generated {formatReportDate(candidateReport.generatedAt)}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {config.contextType === 'partner' && (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    forceRefreshRef.current = true;
                    setIsRerunning(true);
                    setLoadingTransitionComplete(false);
                    queryClient.invalidateQueries({ queryKey: ['individual-report', selectedCandidate, config.contextType] });
                  }}
                  disabled={isFetchingReport}
                  data-testid="button-rerun-individual-analysis"
                  className="text-xs md:text-sm border-blue-300/50 text-blue-100"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Re-run Analysis (1 credit)
                </Button>
              )}
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
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
            <h3 className="text-lg font-semibold text-white" data-testid="text-candidate-name-0">{getCandidateName(selectedCandidateData)}</h3>
          </div>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" data-testid="card-candidate-summary">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Assessment Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-4 rounded-lg border bg-card" data-testid="card-fit-score-0">
                  <div className="text-sm text-muted-foreground mb-1">FIT Score</div>
                  <div className={`text-2xl font-bold ${fitData ? getScoreColor(calculateAverageScore(fitData.scores)) : 'text-muted-foreground'}`}>
                    {fitData ? `${calculateAverageScore(fitData.scores)}%` : '-'}
                  </div>
                </div>
                <div className="text-center p-4 rounded-lg border bg-card" data-testid="card-ai-readiness-score-0">
                  <div className="text-sm text-muted-foreground mb-1">AI Readiness</div>
                  <div className={`text-2xl font-bold ${aiData ? getScoreColor(calculateAverageScore(aiData.scores)) : 'text-muted-foreground'}`}>
                    {aiData ? `${calculateAverageScore(aiData.scores)}%` : '-'}
                  </div>
                </div>
                <div className="text-center p-4 rounded-lg border bg-card" data-testid="card-prompt-score-0">
                  <div className="text-sm text-muted-foreground mb-1">Prompt Architecture</div>
                  <div className={`text-2xl font-bold ${promptData ? getScoreColor(promptData.totalScore) : 'text-muted-foreground'}`}>
                    {promptData ? `${promptData.totalScore}%` : '-'}
                  </div>
                </div>
                <div className="text-center p-4 rounded-lg border bg-card" data-testid="card-aiq-score-0">
                  <div className="text-sm text-muted-foreground mb-1">AIQ (Ethics)</div>
                  <div className={`text-2xl font-bold ${aiqData ? getScoreColor(aiqData.totalScore) : 'text-muted-foreground'}`}>
                    {aiqData ? `${aiqData.totalScore}%` : '-'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <HowToReadReport reportType="individual" />

          {(fitData || aiData) && (
            <Card data-testid="card-strengths-weaknesses">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Trait Profile Summary
                </CardTitle>
                <CardDescription>Highest and lowest scoring traits across assessments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="flex items-center gap-2 mb-4 font-semibold text-blue-600">
                      <TrendingUp className="h-4 w-4" />
                      Highest Scoring Traits
                    </h4>
                    <div className="space-y-3" data-testid="list-strengths-0">
                      {getStrengthsAndWeaknesses().strengths.map((skill, i) => (
                        <div key={i} className="flex items-center justify-between gap-1 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20" data-testid={`row-strength-0-${i}`}>
                          <div>
                            <span className="font-medium" data-testid={`text-strength-name-0-${i}`}>{skill.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">{skill.category}</Badge>
                          </div>
                          <span className="font-bold text-blue-600" data-testid={`text-strength-score-0-${i}`}>{skill.score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="flex items-center gap-2 mb-4 font-semibold text-slate-600 dark:text-slate-400">
                      <TrendingDown className="h-4 w-4" />
                      Lowest Scoring Traits
                    </h4>
                    <div className="space-y-3" data-testid="list-weaknesses-0">
                      {getStrengthsAndWeaknesses().weaknesses.map((skill, i) => (
                        <div key={i} className="flex items-center justify-between gap-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/20" data-testid={`row-weakness-0-${i}`}>
                          <div>
                            <span className="font-medium" data-testid={`text-weakness-name-0-${i}`}>{skill.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">{skill.category}</Badge>
                          </div>
                          <span className="font-bold text-slate-600 dark:text-slate-400" data-testid={`text-weakness-score-0-${i}`}>{skill.score}%</span>
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
                <CardDescription>Behavioral trait scores - higher values indicate stronger trait presence</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div ref={fitChartRef} className="h-72 bg-white dark:bg-gray-900 rounded-lg p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={fitRadarData} cx="50%" cy="50%" outerRadius="70%">
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#64748b' }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                        <Radar dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3" data-testid="list-fit-skills-0">
                    {Object.entries(fitData.scores || {}).map(([skill, score]) => (
                      <div key={skill} className="space-y-1" data-testid={`row-fit-skill-0-${skill}`}>
                        <div className="flex justify-between gap-1 text-sm">
                          <span data-testid={`text-fit-skill-name-0-${skill}`}>{skill}</span>
                          <span className={`font-medium ${getScoreColor(score as number)}`} data-testid={`text-fit-skill-score-0-${skill}`}>{score as number}%</span>
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
                <CardDescription>AI-related capabilities and technical readiness scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div ref={aiChartRef} className="h-96 bg-white dark:bg-gray-900 rounded-lg p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={aiRadarData} cx="50%" cy="50%" outerRadius="65%">
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: '#64748b' }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                        <Radar dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3 max-h-72 overflow-y-auto" data-testid="list-ai-skills-0">
                    {Object.entries(normalizedAIScores).map(([skill, score]) => (
                      <div key={skill} className="space-y-1" data-testid={`row-ai-skill-0-${skill}`}>
                        <div className="flex justify-between gap-1 text-sm">
                          <span className="truncate" data-testid={`text-ai-skill-name-0-${skill}`}>{skill}</span>
                          <span className={`font-medium ${getScoreColor(score as number)}`} data-testid={`text-ai-skill-score-0-${skill}`}>{score as number}%</span>
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
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-500" />
                  Prompt Architecture Assessment
                </CardTitle>
                <CardDescription>Prompt engineering skills across difficulty levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`text-4xl font-bold ${getScoreColor(promptData.totalScore)}`}>
                    {promptData.totalScore}%
                  </div>
                  <div>
                    <div className="font-semibold">{getPromptArchBandInterpretation(promptData.totalScore).title}</div>
                    <div className="text-sm text-muted-foreground">{getPromptArchBandInterpretation(promptData.totalScore).description}</div>
                  </div>
                </div>
                {promptData.levels && Array.isArray(promptData.levels) && promptData.levels.length > 0 && (
                  <div className="overflow-x-auto" data-testid="grid-prompt-levels-0">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">Level</th>
                          <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">Dimension</th>
                          <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5, 6, 7].map((level) => {
                          const dimensions = ['clarity', 'structure', 'contextRelevance', 'creativity', 'iterativeImprovement'];
                          const dimensionLabels: Record<string, string> = {
                            clarity: 'Clarity',
                            structure: 'Structure',
                            contextRelevance: 'Context Relevance',
                            creativity: 'Creativity',
                            iterativeImprovement: 'Iterative Improvement',
                          };
                          const levelData = promptData.levels.find((l: any) => l.level === level);

                          return dimensions.map((dimension, dimIndex) => {
                            const score = levelData?.scores?.[dimension] ?? levelData?.evaluationScores?.[dimension];
                            return (
                              <tr key={`${level}-${dimension}`} className={dimIndex === 0 ? 'border-t-2' : 'border-t'}>
                                {dimIndex === 0 && (
                                  <td className="p-2 md:p-3 font-semibold align-top text-xs md:text-sm" rowSpan={5}>
                                    Level {level}
                                  </td>
                                )}
                                <td className="p-2 md:p-3 text-xs md:text-sm">{dimensionLabels[dimension]}</td>
                                <td className="p-2 md:p-3">
                                  {score !== undefined && score !== null ? (
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-xs md:text-sm">{score}/20</span>
                                      <div className="h-2 rounded-full bg-primary/20" style={{ width: '60px' }}>
                                        <div className="h-full rounded-full bg-primary" style={{ width: `${(score / 20) * 100}%` }} />
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs md:text-sm">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                        })}
                        <tr className="border-t-2 font-semibold bg-muted/30">
                          <td className="p-2 md:p-3 text-xs md:text-sm" colSpan={2}>Total Score</td>
                          <td className="p-2 md:p-3">
                            <span className={`text-lg font-bold ${getScoreColor(promptData.totalScore)}`}>
                              {promptData.totalScore}%
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {aiqData && (
            <Card data-testid="card-aiq-details">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-500" />
                  AIQ Assessment (AI Ethics)
                </CardTitle>
                <CardDescription>Algorithmic Integrity Quotient - understanding of AI ethics and responsible AI</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`text-4xl font-bold ${getScoreColor(aiqData.totalScore)}`}>
                    {aiqData.totalScore}%
                  </div>
                  <div>
                    <div className="font-semibold">{getAIQBandInterpretation(aiqData.totalScore).title}</div>
                    <div className="text-sm text-muted-foreground">{getAIQBandInterpretation(aiqData.totalScore).description}</div>
                  </div>
                </div>
                {aiqData.scores && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="grid-aiq-categories-0">
                    {Object.entries(aiqData.scores).map(([key, score]) => (
                      <div key={key} className="text-center p-3 rounded-lg border bg-card" data-testid={`card-aiq-category-0-${key}`}>
                        <div className="text-xs text-muted-foreground mb-1">{key.replace(/_/g, ' ')}</div>
                        <div className={`text-xl font-bold ${getScoreColor(score as number)}`}>{score as number}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-profile-insights">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Profile Insights and Recommendations
              </CardTitle>
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
                      const regex = new RegExp(`\\*\\*${section.key}\\*\\*[:\\s]*([\\s\\S]*?)(?=\\n\\s*\\*\\*[A-Z]|$)`, 'i');
                      const match = candidateReport?.aiInsights?.match(regex);
                      let content = match?.[1]?.trim();
                      if (content) {
                        content = content
                          .replace(/\*\*(.*?)\*\*/g, '$1')
                          .replace(/__(.*?)__/g, '$1')
                          .replace(/\*(.*?)\*/g, '$1')
                          .replace(/^\s*[-•]\s*/gm, '')
                          .replace(/^\s*\d+\.\s+/gm, '')
                          .replace(/\n{2,}/g, '\n');
                      }
                      return { ...section, content };
                    }).filter(s => s.content);
                    
                    if (parsedSections.length === 0) {
                      return candidateReport?.aiInsights?.split('\n').map((paragraph: string, i: number) => (
                        paragraph.trim() && <p key={i} className="text-sm text-muted-foreground mb-3">{paragraph}</p>
                      ));
                    }
                    
                    return parsedSections.map((section) => {
                      const IconComponent = section.icon;
                      const lines = section.content?.split('\n').filter((l: string) => l.trim()) || [];
                      return (
                        <div key={section.key} className="p-4 rounded-lg bg-muted/30 border">
                          <h4 className={`text-sm font-bold ${section.color} uppercase tracking-wide mb-3 flex items-center gap-2`}>
                            <IconComponent className="h-4 w-4" />
                            {section.key}
                          </h4>
                          {lines.length > 1 ? (
                            <ul className="space-y-1.5">
                              {lines.map((line: string, i: number) => (
                                <li key={i} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                                  <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${section.color.split(' ').map((c: string) => c.replace('text-', 'bg-')).join(' ')}`} />
                                  {line}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                          )}
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
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium flex items-center gap-2 text-white">
                      <TrendingUp className="h-4 w-4 text-white shrink-0" />
                      Cohort Benchmarking
                    </h4>
                    <Badge className="bg-amber-500 text-white border-amber-600 text-xs shrink-0">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-white/70">
                    Compare candidate performance against industry benchmarks and peer organizations
                  </p>
                </div>
              </div>
              <div className="mt-4 text-center">
                <Button 
                  variant="outline" 
                  className="border-white text-white"
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
              className="text-white border-white/50"
              data-testid="button-back-to-top-individual"
            >
              <ChevronUp className="h-4 w-4 mr-2" />
              Back to Top
            </Button>
          </div>
        </div>
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
