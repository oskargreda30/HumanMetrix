import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, User, Award, Brain, Target, TrendingUp, TrendingDown, FileText, BookOpen, Sparkles, Download, MessageSquare, Users, Clock, ShieldAlert, DollarSign, Lightbulb, RefreshCw, Rocket, BarChart3, Mail, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
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
  
  // Track which candidate we've triggered insights for to avoid double-firing
  const insightsTriggeredForRef = useRef<string | null>(null);

  // Auto-trigger profile insights when candidate report loads
  useEffect(() => {
    // Only trigger once per candidate selection
    if (selectedCandidate && candidateReport && selectedCandidateData && insightsTriggeredForRef.current !== selectedCandidate) {
      // Build assessment data for insights
      const fitDataLocal = candidateReport?.fitAssessments?.[0];
      const aiDataLocal = candidateReport?.aiReadinessAssessments?.[0];
      const promptDataLocal = candidateReport?.promptArchitectureAssessments?.[0];
      const aiqDataLocal = candidateReport?.aiqAssessments?.[0];
      
      if (fitDataLocal || aiDataLocal || promptDataLocal || aiqDataLocal) {
        insightsTriggeredForRef.current = selectedCandidate;
        
        const candidateName = (() => {
          const { firstName, lastName, email } = selectedCandidateData.user;
          if (firstName || lastName) {
            return `${firstName || ''} ${lastName || ''}`.trim();
          }
          return email?.split('@')[0] || 'Unknown';
        })();
        
        // Gather all skills for strengths/weaknesses
        const skills: Array<{ name: string; score: number; category: string }> = [];
        if (fitDataLocal) {
          Object.entries(fitDataLocal.scores).forEach(([name, score]) => {
            skills.push({ name, score: score as number, category: 'FIT' });
          });
        }
        if (aiDataLocal) {
          const normalizedScores = normalizeAIReadinessScores(aiDataLocal.scores);
          Object.entries(normalizedScores).forEach(([name, score]) => {
            skills.push({ name, score: score as number, category: 'AI Readiness' });
          });
        }
        skills.sort((a, b) => b.score - a.score);
        const strengths = skills.slice(0, 3);
        const weaknesses = skills.slice(-3).reverse();
        
        const assessmentData = {
          candidateName,
          fit: fitDataLocal ? {
            average: Math.round(Object.values(fitDataLocal.scores).reduce((a: number, b: any) => a + b, 0) / Object.keys(fitDataLocal.scores).length),
            scores: fitDataLocal.scores,
          } : null,
          aiReadiness: aiDataLocal ? {
            average: Math.round(Object.values(aiDataLocal.scores).reduce((a: number, b: any) => a + b, 0) / Object.keys(aiDataLocal.scores).length),
            scores: aiDataLocal.scores,
          } : null,
          promptArchitecture: promptDataLocal ? { totalScore: promptDataLocal.totalScore } : null,
          aiq: aiqDataLocal ? { totalScore: aiqDataLocal.totalScore } : null,
          strengths,
          lowestScoring: weaknesses,
        };
        
        generateInsightsMutation.mutate({ userId: selectedCandidate, assessmentData });
      }
    }
  }, [selectedCandidate, candidateReport, selectedCandidateData, generateInsightsMutation]);

  // Reset insights when candidate changes
  useEffect(() => {
    setProfileInsights(null);
    insightsTriggeredForRef.current = null;
  }, [selectedCandidate]);

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
        promptData: promptData ? { totalScore: promptData.totalScore, levels: promptData.levels } : null,
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

  return (
    <div className="space-y-6">
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
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-300" />
              Individual Candidate Report
            </h2>
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
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-4 gap-4">
                    {(() => {
                      const topFitSkill = fitData 
                        ? Object.entries(fitData.scores).sort((a, b) => (b[1] as number) - (a[1] as number))[0] 
                        : null;
                      return (
                        <div className="text-center p-4 rounded-lg border bg-card">
                          <div className="text-xs text-muted-foreground mb-1">FIT Top Skill</div>
                          <div className="text-sm font-medium text-foreground mb-1">{topFitSkill ? topFitSkill[0] : '-'}</div>
                          <div className={`text-xl font-bold ${topFitSkill ? getScoreColor(topFitSkill[1] as number) : 'text-muted-foreground'}`}>
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
                        <div className="text-center p-4 rounded-lg border bg-card">
                          <div className="text-xs text-muted-foreground mb-1">AI Readiness Top</div>
                          <div className="text-sm font-medium text-foreground mb-1">{topAISkill ? topAISkill[0] : '-'}</div>
                          <div className={`text-xl font-bold ${topAISkill ? getScoreColor(topAISkill[1] as number) : 'text-muted-foreground'}`}>
                            {topAISkill ? `${topAISkill[1]}%` : '-'}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="text-center p-4 rounded-lg border bg-card">
                      <div className="text-xs text-muted-foreground mb-1">Prompt Architecture</div>
                      <div className="text-sm font-medium text-foreground mb-1">&nbsp;</div>
                      <div className={`text-xl font-bold ${promptData ? getScoreColor(promptData.totalScore) : 'text-muted-foreground'}`}>
                        {promptData ? `${promptData.totalScore}%` : '-'}
                      </div>
                    </div>
                    <div className="text-center p-4 rounded-lg border bg-card">
                      <div className="text-xs text-muted-foreground mb-1">AIQ (Ethics)</div>
                      <div className="text-sm font-medium text-foreground mb-1">&nbsp;</div>
                      <div className={`text-xl font-bold ${aiqData ? getScoreColor(aiqData.totalScore) : 'text-muted-foreground'}`}>
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

          {/* Profile Insights and Recommendations */}
          <Card data-testid="card-profile-insights">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Profile Insights and Recommendations
              </CardTitle>
              <CardDescription>
                AI-powered analysis of {getCandidateName(selectedCandidateData)}'s profile with role fit recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generateInsightsMutation.isPending ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                  <p className="text-sm">Generating AI-powered profile insights...</p>
                  <p className="text-xs mt-2">Analyzing assessment data across all dimensions.</p>
                </div>
              ) : profileInsights ? (
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
                      const match = profileInsights.match(regex);
                      const content = match?.[1]?.trim();
                      return { ...section, content };
                    }).filter(s => s.content);
                    
                    // Fallback to raw text if parsing fails
                    if (parsedSections.length === 0) {
                      return profileInsights.split('\n').map((paragraph, i) => (
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
            <Button 
              variant="outline"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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
