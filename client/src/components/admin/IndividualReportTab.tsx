import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, User, Award, Brain, Target, TrendingUp, TrendingDown, FileText, BookOpen, Sparkles, Download, MessageSquare, Users, Clock, ShieldAlert, DollarSign, Lightbulb, RefreshCw, Rocket, BarChart3, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { FIT_SKILLS, AI_READINESS_SKILLS, getSkillAcronym, getAIReadinessScore, normalizeAIReadinessScores } from "@/lib/assessmentSkills";
import SkillsLegend from "@/components/SkillsLegend";
import { getAIQBandInterpretation } from "@/data/aiq-questions";
import { apiRequest } from "@/lib/queryClient";
import html2canvas from "html2canvas";
import CompareTab from "@/components/admin/CompareTab";
import { EnquiryModal } from "@/components/EnquiryModal";

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

export default function IndividualReportTab() {
  const [subTab, setSubTab] = useState("individual");
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [profileInsights, setProfileInsights] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const { toast } = useToast();
  
  const fitChartRef = useRef<HTMLDivElement>(null);
  const aiChartRef = useRef<HTMLDivElement>(null);

  const { data: candidates, isLoading } = useQuery<CandidateData[]>({
    queryKey: ['/api/admin/candidates'],
  });

  const { data: candidateReport, isLoading: isLoadingReport } = useQuery<any>({
    queryKey: ['individual-report', selectedCandidate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('userIds', selectedCandidate);
      const response = await fetch(`/api/admin/compare?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch candidate report');
      return response.json();
    },
    enabled: !!selectedCandidate,
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async (data: { userId: string; assessmentData: any }) => {
      const response = await apiRequest('POST', '/api/admin/profile-insights', data);
      return response.json();
    },
    onSuccess: (data) => {
      setProfileInsights(data.insights);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate profile insights",
        variant: "destructive",
      });
    },
  });

  const selectedCandidateData = candidates?.find(c => c.user.id === selectedCandidate);

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

  const getPromptArchInterpretation = (score: number): string => {
    if (score >= 70) return 'Excellent';
    if (score >= 50) return 'Competent';
    return 'Developing';
  };

  const getCompletedAssessments = () => {
    if (!selectedCandidateData) return [];
    return selectedCandidateData.results.filter(r => r.status === 'completed');
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

  // Normalize AI Readiness scores to handle legacy key names
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
      // Use normalized scores to display canonical skill names
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

  const handleGenerateInsights = () => {
    if (!selectedCandidate || !candidateReport) return;
    
    const assessmentData = {
      candidateName: getCandidateName(selectedCandidateData),
      fit: fitData ? {
        average: Math.round(Object.values(fitData.scores).reduce((a: number, b: any) => a + b, 0) / Object.keys(fitData.scores).length),
        scores: fitData.scores,
      } : null,
      aiReadiness: aiData ? {
        average: Math.round(Object.values(aiData.scores).reduce((a: number, b: any) => a + b, 0) / Object.keys(aiData.scores).length),
        scores: aiData.scores,
      } : null,
      promptArchitecture: promptData ? { totalScore: promptData.totalScore } : null,
      aiq: aiqData ? { totalScore: aiqData.totalScore } : null,
      strengths: getStrengthsAndWeaknesses().strengths,
      lowestScoring: getStrengthsAndWeaknesses().weaknesses,
    };
    
    generateInsightsMutation.mutate({ userId: selectedCandidate, assessmentData });
  };

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
        fitData,
        aiData,
        promptData,
        aiqData,
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

  return (
    <div className="space-y-6">
      <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="individual" data-testid="tab-individual">
            <User className="h-4 w-4 mr-2" />
            Individual Report
          </TabsTrigger>
          <TabsTrigger value="compare" data-testid="tab-compare">
            <Users className="h-4 w-4 mr-2" />
            Compare Candidates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Individual Candidate Report
              </CardTitle>
              <CardDescription>
                Select a candidate to view their detailed assessment report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                <SelectTrigger className="w-full max-w-md" data-testid="select-individual-candidate">
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
            </CardContent>
          </Card>

      {isLoading && (
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      )}

      {selectedCandidate && isLoadingReport && (
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      )}

      {selectedCandidate && candidateReport && selectedCandidateData && (
        <>
          {/* Individual Candidate Report Section Heading */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Individual Candidate Report
            </h2>
          </div>

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
                      <h2 className="text-xl font-bold text-foreground">{getCandidateName(selectedCandidateData)}</h2>
                      <p className="text-sm text-muted-foreground">{selectedCandidateData.user.email}</p>
                    </div>
                  </div>
                  {(() => {
                    const topSkill = getStrengthsAndWeaknesses().strengths[0];
                    return topSkill ? (
                      <div className="mt-3 p-2 bg-background/50 rounded-lg inline-flex items-center gap-2">
                        <Award className="h-4 w-4 text-primary" />
                        <span className="text-sm">Top Skill: <span className="font-semibold text-foreground">{topSkill.name}</span> ({topSkill.score}%)</span>
                      </div>
                    ) : null;
                  })()}
                </div>
                <div className="md:col-span-2">
                  <div className="flex justify-end mb-2">
                    <Button 
                      size="sm"
                      onClick={handleExportPDF}
                      disabled={isExporting}
                      data-testid="button-export-pdf-top"
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
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 rounded-lg bg-background/50">
                      <div className="text-xs text-muted-foreground mb-1">FIT</div>
                      <div className={`text-lg font-bold ${fitData ? getScoreColor(Math.round(Object.values(fitData.scores).reduce((a: number, b: any) => a + b, 0) / Object.keys(fitData.scores).length)) : 'text-muted-foreground'}`}>
                        {fitData ? `${Math.round(Object.values(fitData.scores).reduce((a: number, b: any) => a + b, 0) / Object.keys(fitData.scores).length)}%` : '-'}
                      </div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-background/50">
                      <div className="text-xs text-muted-foreground mb-1">AI Ready</div>
                      <div className={`text-lg font-bold ${aiData ? getScoreColor(Math.round(Object.values(normalizedAIScores).reduce((a: number, b: any) => a + b, 0) / Object.keys(normalizedAIScores).length)) : 'text-muted-foreground'}`}>
                        {aiData ? `${Math.round(Object.values(normalizedAIScores).reduce((a: number, b: any) => a + b, 0) / Object.keys(normalizedAIScores).length)}%` : '-'}
                      </div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-background/50">
                      <div className="text-xs text-muted-foreground mb-1">Prompt</div>
                      <div className={`text-lg font-bold ${promptData ? getScoreColor(promptData.totalScore) : 'text-muted-foreground'}`}>
                        {promptData ? `${promptData.totalScore}%` : '-'}
                      </div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-background/50">
                      <div className="text-xs text-muted-foreground mb-1">AIQ</div>
                      <div className={`text-lg font-bold ${aiqData ? getScoreColor(aiqData.totalScore) : 'text-muted-foreground'}`}>
                        {aiqData ? `${aiqData.totalScore}%` : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How to Read This Report */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
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

          {/* Candidate Overview - After How to Read */}
          <Card data-testid="card-candidate-overview">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-xl">{getCandidateName(selectedCandidateData)}</CardTitle>
                  <CardDescription>{selectedCandidateData.user.email}</CardDescription>
                </div>
                <Badge variant="outline" className="text-sm">
                  {getCompletedAssessments().length} Assessments Completed
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
                      {Math.round(Object.values(fitData.scores).reduce((a: number, b: any) => a + b, 0) / Object.keys(fitData.scores).length)}%
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
                      {Math.round(Object.values(aiData.scores).reduce((a: number, b: any) => a + b, 0) / Object.keys(aiData.scores).length)}%
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
                  {promptData ? (
                    <span className={`text-2xl font-bold ${getScoreColor(promptData.totalScore)}`}>
                      {promptData.totalScore}%
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
                    <span className={`text-2xl font-bold ${getScoreColor(aiqData.totalScore)}`}>
                      {aiqData.totalScore}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not taken</span>
                  )}
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
                  AI prompt engineering capabilities across 4 difficulty levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className={`text-3xl font-bold ${getScoreColor(promptData.totalScore)}`}>
                      {promptData.totalScore}%
                    </div>
                    <div className="text-sm text-muted-foreground">Total Score</div>
                    <Badge 
                      variant={promptData.totalScore >= 70 ? "default" : promptData.totalScore >= 50 ? "secondary" : "outline"}
                      className="mt-2"
                    >
                      {getPromptArchInterpretation(promptData.totalScore)}
                    </Badge>
                  </div>
                  {promptData.percentile && (
                    <div className="text-center p-4 rounded-lg bg-muted">
                      <div className="text-3xl font-bold text-blue-600">
                        {promptData.percentile}th
                      </div>
                      <div className="text-sm text-muted-foreground">Percentile</div>
                    </div>
                  )}
                </div>
                
                {promptData.levels && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground">Level Breakdown</h4>
                    <div className="space-y-3">
                      {promptData.levels.map((level: any) => (
                        <div key={level.level} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-foreground">Level {level.level}</span>
                            <Badge variant={getScoreBadgeVariant(level.totalScore)}>
                              {level.totalScore}%
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
                            <span>Clarity: {level.scores?.clarity || 0}%</span>
                            <span>Structure: {level.scores?.structure || 0}%</span>
                            <span>Context: {level.scores?.contextRelevance || 0}%</span>
                            <span>Creativity: {level.scores?.creativity || 0}%</span>
                            <span>Iterative: {level.scores?.iterativeImprovement || 0}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

          {/* Final Candidate Recommendations */}
          {(fitData || aiData || promptData || aiqData) && (
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
                          ...(fitData ? Object.values(fitData.scores) : []),
                          ...(aiData ? Object.values(normalizedAIScores) : []),
                          ...(promptData ? [promptData.totalScore] : []),
                          ...(aiqData ? [aiqData.totalScore] : [])
                        ];
                        return scores.length ? Math.round(scores.reduce((a: any, b: any) => a + b, 0) / scores.length) : 0;
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
                      const aiqScore = aiqData?.totalScore || 0;
                      const promptScore = promptData?.totalScore || 0;
                      
                      if (aiqScore >= 70 && promptScore >= 70) {
                        return `This candidate would thrive in organizations with strong ethical frameworks and AI-forward companies embracing emerging technologies. Their assessment profile suggests they perform best when given clear objectives while having the autonomy to determine how to achieve them. A collaborative environment that values both innovation and responsibility would be ideal.`;
                      } else if (aiqScore >= 70) {
                        return `This candidate would thrive in organizations that prioritize ethical practices and responsible innovation. Their strong ethical awareness suggests they would excel in governance-focused roles or companies with established compliance frameworks. They perform best in structured environments with clear guidelines.`;
                      } else if (promptScore >= 70) {
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
          <Card data-testid="card-profile-insights">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    AI-Powered Profile Insights
                  </CardTitle>
                  <CardDescription>
                    AI-generated analysis of {getCandidateName(selectedCandidateData)}'s trait profile
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateInsights}
                  disabled={generateInsightsMutation.isPending || !candidateReport}
                  data-testid="button-generate-insights"
                >
                  {generateInsightsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : profileInsights ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Insights
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {profileInsights ? (
                <div className="prose prose-sm max-w-none dark:prose-invert" data-testid="text-profile-insights">
                  {profileInsights.split('\n').map((paragraph, i) => (
                    paragraph.trim() && <p key={i} className="text-sm text-muted-foreground mb-3">{paragraph}</p>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Click "Generate Insights" to create an AI-powered analysis of this candidate's trait profile.</p>
                  <p className="text-xs mt-2">The analysis considers all completed assessments and provides hiring-relevant observations.</p>
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

          {/* Additional Services On Request */}
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
                <div className="p-4 rounded-lg bg-white/10 border border-white/20 relative">
                  <Badge className="absolute top-2 right-2 bg-amber-500 text-white border-amber-600 text-xs">Coming Soon</Badge>
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                    <TrendingUp className="h-4 w-4 text-white" />
                    Cohort Benchmarking
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

          {/* Skills Legend */}
          {(fitData || aiData) && (
            <SkillsLegend className="mt-4" />
          )}

          {/* Export Options */}
          <div className="flex justify-end gap-2">
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

        </TabsContent>

        {/* Compare Candidates Tab */}
        <TabsContent value="compare" className="space-y-6">
          <CompareTab />
        </TabsContent>
      </Tabs>

      <EnquiryModal 
        open={showEnquiryModal} 
        onOpenChange={setShowEnquiryModal}
        context="Individual Report - Enterprise Services"
      />
    </div>
  );
}
