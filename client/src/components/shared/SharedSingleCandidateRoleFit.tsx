import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Target, CheckCircle2, AlertCircle, AlertTriangle, TrendingUp, TrendingDown, Download, Award, Brain, Sparkles, MessageSquare, Users, Clock, ShieldAlert, DollarSign, FileText, User, ChevronUp, BarChart3, RefreshCw } from "lucide-react";
import { AnalysisLoadingScreen } from "./AnalysisLoadingScreen";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { exportRoleFitPDF } from "@/lib/pdfExport";
import SkillsLegend from "@/components/SkillsLegend";
import { CriticalSkillsAnalysis } from "@/components/shared/CriticalSkillsAnalysis";
import { EnquiryModal } from "@/components/EnquiryModal";

// Configuration interface for shared component
export interface SharedRoleFitConfig {
  // API endpoints
  candidatesEndpoint: string;
  rolesEndpoint: string;
  roleAlignmentEndpoint: string;
  generateScoresEndpoint: (roleId: string) => string;
  analyzeRoleFitEndpoint: string;
  analyzePromptRoleFitEndpoint?: string;
  analyzeAiqRoleFitEndpoint?: string;
  
  // Query parameter name for candidate ID
  candidateIdParam: 'userId' | 'candidateId';
  
  // Context type
  contextType: 'admin' | 'partner';
}

type RoleAlignment = {
  overallFit: number | null;
  fitSkillAlignments?: Array<{
    skillName: string;
    candidateScore: number | null;
    requiredScore: number;
    gap: number | null;
    alignment: string;
    criticality?: 'critical' | 'standard';
    dataAvailable?: boolean;
  }> | null;
  aiReadinessSkillAlignments?: Array<{
    skillName: string;
    candidateScore: number | null;
    requiredScore: number;
    gap: number | null;
    alignment: string;
    criticality?: 'critical' | 'standard';
    dataAvailable?: boolean;
  }> | null;
  strengths: (string | { skill: string; summary: string; description: string })[];
  gaps: (string | { skill: string; summary: string; description: string })[];
  cohortBenchmarks?: {
    overall?: { percentile: number; totalCandidates: number; position: string };
    fit?: { percentile: number; totalCandidates: number; skillCount: number; avgScore: number };
    ai_readiness?: { percentile: number; totalCandidates: number; skillCount: number; avgScore: number };
    prompt_architecture?: { percentile: number; totalCandidates: number; avgScore: number };
    aiq?: { percentile: number; totalCandidates: number; avgScore: number };
  } | null;
  interviewQuestions?: Array<{
    question: string;
    purpose: string;
    targetSkill: string;
  }> | null;
  roleFlexibility?: Array<{
    roleId: string;
    roleName: string;
    fitScore: number;
    rawFitScore?: number;
    roleSimilarity?: number;
    coveragePercent?: number;
    coverageLabel?: 'High' | 'Medium' | 'Limited';
    missingCriticalSkills?: string[];
    description?: string;
  }> | null;
  finalRecommendation?: string;
  nextSteps?: string[];
  dataCoverage?: {
    percentage: number;
    assessedSkillCount: number;
    totalRequiredSkills: number;
    missingAssessments: string[];
    hasSufficientData: boolean;
  };
  promptRoleFitAnalysis?: string | null;
  aiqRoleFitAnalysis?: string | null;
};

interface SharedSingleCandidateRoleFitProps {
  config: SharedRoleFitConfig;
}

const formatReportDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} at ${timePart}`;
};

export function SharedSingleCandidateRoleFit({ config }: SharedSingleCandidateRoleFitProps) {
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [analysisTriggered, setAnalysisTriggered] = useState(false);
  const [loadingTransitionComplete, setLoadingTransitionComplete] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const forceRefreshRef = useRef(false);
  const { toast } = useToast();

  const { data: candidates, isLoading: isLoadingCandidates } = useQuery<any[]>({
    queryKey: [config.candidatesEndpoint],
  });

  const { data: roles, isLoading: isLoadingRoles, error: rolesError } = useQuery<any[]>({
    queryKey: [config.rolesEndpoint],
  });

  const getPercentileBadge = (percentile: number) => {
    if (percentile >= 90) return { label: `Top ${100 - percentile}%`, variant: 'default' as const, color: 'text-green-600' };
    if (percentile >= 75) return { label: `Top ${100 - percentile}%`, variant: 'secondary' as const, color: 'text-blue-600' };
    if (percentile >= 50) return { label: `Top ${100 - percentile}%`, variant: 'outline' as const, color: 'text-muted-foreground' };
    return { label: `Bottom ${percentile}%`, variant: 'outline' as const, color: 'text-amber-600' };
  };

  const getCriticalityBadge = (criticality: string | undefined) => {
    const level = criticality || 'standard';
    if (level === 'critical') {
      return (
        <Badge className="text-xs ml-1 px-1.5 min-w-[20px] justify-center bg-blue-600 text-white hover:bg-blue-700">
          C
        </Badge>
      );
    }
    return null;
  };
  
  const CriticalityLegend = () => (
    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4 pt-3 border-t">
      <span className="font-medium">Legend:</span>
      <span className="flex items-center gap-1">
        <Badge className="text-xs px-1.5 min-w-[20px] justify-center bg-blue-600 text-white">C</Badge>
        = Critical (Essential for role success)
      </span>
    </div>
  );

  // Build the alignment query key based on config
  const alignmentQueryKey = selectedCandidate && selectedRole
    ? [`${config.roleAlignmentEndpoint}?${config.candidateIdParam}=${selectedCandidate}&jobRoleId=${selectedRole}`]
    : undefined;

  const { data: alignment, isLoading: isLoadingAlignment, isFetching: isFetchingAlignment, error: alignmentError } = useQuery<RoleAlignment>({
    queryKey: alignmentQueryKey as any,
    queryFn: async () => {
      let url = `${config.roleAlignmentEndpoint}?${config.candidateIdParam}=${selectedCandidate}&jobRoleId=${selectedRole}`;
      if (forceRefreshRef.current) {
        url += '&forceRefresh=true';
        forceRefreshRef.current = false;
      }
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch role alignment');
      return response.json();
    },
    enabled: !!selectedCandidate && !!selectedRole && analysisTriggered,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (alignmentError && isRerunning) {
      setIsRerunning(false);
      setLoadingTransitionComplete(true);
      toast({ title: "Re-run failed", description: "Failed to regenerate analysis. Please try again.", variant: "destructive" });
    }
  }, [alignmentError, isRerunning]);

  // Reset analysis state when selection changes
  const handleCandidateChange = (value: string) => {
    setSelectedCandidate(value);
    setAnalysisTriggered(false);
    setLoadingTransitionComplete(false);
  };

  const handleRoleChange = (value: string) => {
    setSelectedRole(value);
    setAnalysisTriggered(false);
    setLoadingTransitionComplete(false);
  };

  const handleAnalyzeRoleFit = () => {
    // Single-loading UX: just enable the GET query which handles all analysis server-side
    if (selectedCandidate && selectedRole) {
      setAnalysisTriggered(true);
      // analyzeRoleFitMutation removed - GET role-alignment endpoint handles everything
    }
  };

  const generateRequiredScoresMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const res = await apiRequest('POST', config.generateScoresEndpoint(roleId), undefined, { timeoutMs: 90000 });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.rolesEndpoint] });
      toast({ title: "Required scores generated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate required scores. Please try again.",
        variant: "destructive",
      });
    },
  });

  // analyzeRoleFitMutation removed - now handled server-side in GET role-alignment

  // analyzePromptRoleFitMutation removed - now handled server-side in GET role-alignment

  // analyzeAiqRoleFitMutation removed - now handled server-side in GET role-alignment

  const selectedCandidateData = candidates?.find((c) => c.user.id === selectedCandidate);
  const selectedRoleData = roles?.find((r) => r.id === selectedRole);

  // Track last triggered selection to avoid re-triggering

  // AI analyses are now pre-loaded from the role-alignment endpoint (single-loading UX) // Only trigger when alignment changes meaningfully



  const handleExportPDF = async () => {
    if (!alignment || !selectedCandidateData || !selectedRoleData) return;
    
    try {
      await exportRoleFitPDF({
        candidate: selectedCandidateData,
        role: selectedRoleData,
        alignment: alignment,
      });
      toast({
        title: "PDF exported successfully",
        description: "Your role fit analysis has been downloaded.",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper function to get fit tier styling
  const getFitTierBadge = (tier: string) => {
    switch (tier) {
      case 'strong':
        return <Badge className="bg-green-600 text-white">Strong Fit</Badge>;
      case 'moderate':
        return <Badge className="bg-amber-500 text-white">Moderate Fit</Badge>;
      case 'insufficient-data':
        return <Badge className="bg-gray-400 text-white">Insufficient Data</Badge>;
      default:
        return <Badge variant="destructive">Development Needed</Badge>;
    }
  };

  const getAlignmentIcon = (alignment: string) => {
    if (alignment === 'exceeds' || alignment === 'meets') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    } else if (alignment === 'close') {
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlignmentColor = (alignment: string) => {
    if (alignment === 'exceeds' || alignment === 'meets') return 'text-green-600';
    if (alignment === 'close') return 'text-amber-600';
    return 'text-blue-500'; // Changed from red to light blue - neutral appearance
  };

  // Calculate overall fit tier
  const getOverallFitTier = (score: number | null) => {
    if (score === null) return 'insufficient-data';
    if (score >= 80) return 'strong';
    if (score >= 60) return 'moderate';
    return 'development-needed';
  };

  return (
    <div className="space-y-6">
      {config.contextType === 'partner' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Credit Usage for Analysis
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Credits are only consumed when generating new analysis – saved results are always free. Role fit analysis: 1 credit per action.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Role Alignment Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select a candidate and job role to see how well they match using AI analysis
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Candidate</label>
              <Select value={selectedCandidate} onValueChange={handleCandidateChange}>
                <SelectTrigger data-testid="select-candidate">
                  <SelectValue placeholder="Select a candidate" />
                </SelectTrigger>
                <SelectContent>
                  {candidates?.map((candidate: any) => (
                    <SelectItem key={candidate.user.id} value={candidate.user.id}>
                      {candidate.user.firstName || candidate.user.lastName
                        ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
                        : candidate.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Job Role</label>
              <Select value={selectedRole} onValueChange={handleRoleChange} disabled={isLoadingRoles}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder={isLoadingRoles ? "Loading roles..." : rolesError ? "Error loading roles" : "Select a role"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingRoles ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading roles...</div>
                  ) : rolesError ? (
                    <div className="p-2 text-sm text-red-500">Failed to load roles</div>
                  ) : roles && roles.length > 0 ? (
                    roles.map((role: any) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">No roles available</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedRole && selectedRoleData && !selectedRoleData.requiredSkillScores && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    Required Skill Scores Not Generated
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    This role needs required skill scores before you can analyze candidates. Click the button to generate them using AI.
                  </p>
                </div>
                <Button
                  onClick={() => generateRequiredScoresMutation.mutate(selectedRole)}
                  disabled={generateRequiredScoresMutation.isPending}
                  size="sm"
                  data-testid="button-generate-required-scores"
                >
                  {generateRequiredScoresMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Required Scores
                      {config.contextType === 'partner' && (
                        <Badge variant="secondary" className="ml-2 text-[10px] font-normal">1 credit</Badge>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {selectedCandidate && selectedRole && !analysisTriggered && selectedRoleData?.requiredSkillScores && (
            <Button
              onClick={handleAnalyzeRoleFit}
              className="w-full"
              data-testid="button-analyze-fit"
            >
              <Target className="mr-2 h-4 w-4" />
              Analyze Role Fit
            </Button>
          )}
        </CardContent>
      </Card>

      {analysisTriggered && (!loadingTransitionComplete || isRerunning) && (
        <AnalysisLoadingScreen 
          isComplete={!isFetchingAlignment && !!alignment}
          averageTimeSeconds={25}
          message={isRerunning ? "Re-generating AI analysis with fresh insights..." : "Analyzing role fit and generating insights..."}
          onTransitionComplete={() => {
            setLoadingTransitionComplete(true);
            if (isRerunning) {
              setIsRerunning(false);
              toast({ title: "Analysis regenerated", description: "Fresh AI analysis has been generated successfully." });
            }
          }}
        />
      )}

      {alignment && loadingTransitionComplete && !isRerunning && (
        <div className="space-y-6">
          {/* Report Header with Date, Re-run, and Export PDF */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 p-3">
            <div className="flex items-center gap-2">
              {config.contextType === 'partner' && (alignment as any)?.generatedAt && (
                <div className="flex items-center gap-1.5 text-xs text-white/80" data-testid="text-rolefit-report-date">
                  {(alignment as any)?.cached ? (
                    <>
                      <Clock className="h-3 w-3" />
                      <span>Cached — {formatReportDate((alignment as any).generatedAt)}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      <span>Generated {formatReportDate((alignment as any).generatedAt)}</span>
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
                    queryClient.invalidateQueries({ queryKey: alignmentQueryKey as any });
                  }}
                  disabled={isFetchingAlignment}
                  data-testid="button-rerun-rolefit-analysis"
                  className="border-white/30 text-white/90"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Re-run Analysis (1 credit)
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleExportPDF}
                disabled={isLoadingAlignment}
                data-testid="button-export-pdf-top"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>

          {/* Executive Summary - Guide for Hiring Managers */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                How to Read This Report
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                A step-by-step guide to understanding this candidate's fit for the {selectedRoleData?.name} role
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <p className="font-medium text-sm">Overall Role Fit Score</p>
                    <p className="text-xs text-muted-foreground">The weighted average of all skill scores against role requirements. <span className="font-medium">80%+ = Strong fit</span>, 60-79% = Good potential, Below 60% = Development needed.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="font-medium text-sm">Skill Alignments (FIT & AI Readiness)</p>
                    <span className="text-xs text-muted-foreground">Compare candidate scores vs. role requirements. Look for <Badge className="text-[10px] px-1 py-0 h-4 bg-blue-600">C</Badge> marked skills - these are <span className="font-medium">critical</span> for success.</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="font-medium text-sm">Critical Skills Analysis</p>
                    <p className="text-xs text-muted-foreground">Summary of skills marked as critical for this role. Shows how many critical requirements are met vs. gaps needing development.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <p className="font-medium text-sm">Cohort Benchmarking</p>
                    <p className="text-xs text-muted-foreground">How this candidate ranks vs. all other candidates who've taken assessments. Percentile shows relative standing.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
                  <div>
                    <p className="font-medium text-sm">Alternative Roles</p>
                    <p className="text-xs text-muted-foreground">If candidate isn't ideal for this role, see which other roles in your organization might be a better match.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overall Fit Score */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Overall Role Fit Score
                </CardTitle>
                {getFitTierBadge(getOverallFitTier(alignment.overallFit))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold">
                  {alignment.overallFit !== null ? `${alignment.overallFit}%` : 'N/A'}
                </div>
                <div className="flex-1">
                  <Progress 
                    value={alignment.overallFit || 0} 
                    className="h-3"
                  />
                </div>
              </div>
              
              {alignment.dataCoverage && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Data Coverage:</span>
                    <span>{alignment.dataCoverage.percentage}% ({alignment.dataCoverage.assessedSkillCount}/{alignment.dataCoverage.totalRequiredSkills} skills assessed)</span>
                  </div>
                  {alignment.dataCoverage.missingAssessments.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Missing: {alignment.dataCoverage.missingAssessments.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Strengths and Gaps */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-5 w-5" />
                  Key Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {alignment.strengths.map((strength, index) => {
                    const isObject = typeof strength === 'object' && strength !== null;
                    const summary = isObject ? strength.summary : strength;
                    const description = isObject ? strength.description : null;
                    return (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-medium">{summary}</span>
                          {description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {alignment.strengths.length === 0 && (
                    <li className="text-sm text-muted-foreground">No significant strengths identified</li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <TrendingDown className="h-5 w-5" />
                  Development Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {alignment.gaps.map((gap, index) => {
                    const isObject = typeof gap === 'object' && gap !== null;
                    const summary = isObject ? gap.summary : gap;
                    const description = isObject ? gap.description : null;
                    return (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-medium">{summary}</span>
                          {description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {alignment.gaps.length === 0 && (
                    <li className="text-sm text-muted-foreground">No significant gaps identified</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* FIT Skill Alignments */}
          {alignment.fitSkillAlignments && alignment.fitSkillAlignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-500" />
                  FIT Assessment Alignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alignment.fitSkillAlignments.map((skill, index) => {
                    const hasData = skill.dataAvailable !== false && skill.candidateScore !== null;
                    const meetsThreshold = hasData && (skill.candidateScore ?? 0) >= skill.requiredScore;
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getAlignmentIcon(skill.alignment)}
                            <span className="font-medium">{skill.skillName}</span>
                            {getCriticalityBadge(skill.criticality)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${!hasData ? 'text-muted-foreground' : meetsThreshold ? 'text-green-600' : 'text-amber-500'}`}>
                              {hasData ? `${skill.candidateScore}%` : 'No data'}
                            </span>
                            <span className="text-muted-foreground">/ {skill.requiredScore}% required</span>
                          </div>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`absolute left-0 top-0 h-full rounded-full transition-all ${!hasData ? 'bg-gray-300' : meetsThreshold ? 'bg-green-500' : 'bg-amber-400'}`}
                            style={{ width: `${hasData ? (skill.candidateScore || 0) : 0}%` }}
                          />
                          <div 
                            className={`absolute top-0 h-full w-0.5 ${!hasData ? 'bg-gray-400' : meetsThreshold ? 'bg-green-700' : 'bg-amber-600'}`}
                            style={{ left: `${skill.requiredScore}%` }}
                            title={`Required: ${skill.requiredScore}%`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <CriticalityLegend />
              </CardContent>
            </Card>
          )}

          {/* AI Readiness Skill Alignments */}
          {alignment.aiReadinessSkillAlignments && alignment.aiReadinessSkillAlignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  AI Readiness Alignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alignment.aiReadinessSkillAlignments.map((skill, index) => {
                    const hasData = skill.dataAvailable !== false && skill.candidateScore !== null;
                    const meetsThreshold = hasData && (skill.candidateScore ?? 0) >= skill.requiredScore;
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getAlignmentIcon(skill.alignment)}
                            <span className="font-medium">{skill.skillName}</span>
                            {getCriticalityBadge(skill.criticality)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${!hasData ? 'text-muted-foreground' : meetsThreshold ? 'text-green-600' : 'text-amber-500'}`}>
                              {hasData ? `${skill.candidateScore}%` : 'No data'}
                            </span>
                            <span className="text-muted-foreground">/ {skill.requiredScore}% required</span>
                          </div>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`absolute left-0 top-0 h-full rounded-full transition-all ${!hasData ? 'bg-gray-300' : meetsThreshold ? 'bg-green-500' : 'bg-amber-400'}`}
                            style={{ width: `${hasData ? (skill.candidateScore || 0) : 0}%` }}
                          />
                          <div 
                            className={`absolute top-0 h-full w-0.5 ${!hasData ? 'bg-gray-400' : meetsThreshold ? 'bg-green-700' : 'bg-amber-600'}`}
                            style={{ left: `${skill.requiredScore}%` }}
                            title={`Required: ${skill.requiredScore}%`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <CriticalityLegend />
              </CardContent>
            </Card>
          )}

          {/* Critical Skills Analysis */}
          {(() => {
            const allSkills = [
              ...(alignment.fitSkillAlignments || []),
              ...(alignment.aiReadinessSkillAlignments || [])
            ];
            const criticalSkills = allSkills.filter((s: any) => s.criticality === 'critical');
            const hasData = (s: any) => s.dataAvailable !== false && s.candidateScore != null;
            const assessedCritical = criticalSkills.filter(hasData);
            const noDataCritical = criticalSkills.filter((s: any) => !hasData(s));
            const criticalMet = assessedCritical.filter((s: any) => s.candidateScore >= s.requiredScore);
            const criticalGaps = assessedCritical.filter((s: any) => s.candidateScore < s.requiredScore);
            
            // "Why it matters" explanations for critical skills
            const whyItMatters: Record<string, string> = {
              'Responsible AI': 'This skill directly impacts performance quality and team effectiveness in AI-integrated workflows.',
              'Domain Expertise': 'Enables effective application of AI solutions to specific business contexts and industry requirements.',
              'High Agency': 'Enables proactive problem-solving and ownership of outcomes, reducing dependency on constant supervision in fast-moving AI environments.',
              'Empathy & Ethics': 'Ensures AI solutions consider human impact and ethical implications, vital for responsible AI deployment.',
              'Resilience': 'Critical for navigating the rapid iteration cycles and frequent setbacks inherent in AI implementation projects.',
              'Adaptability': 'Essential for thriving in rapidly evolving AI landscapes where tools and best practices change frequently.',
              'Problem-Solving': 'Core competency for debugging AI systems and developing creative solutions to complex technical challenges.',
              'Communication': 'Crucial for translating technical AI concepts to stakeholders and ensuring cross-functional collaboration.',
              'Critical Thinking': 'Necessary for evaluating AI outputs, identifying biases, and making informed decisions about model applications.',
              'Technical Proficiency': 'Foundational skill for implementing, maintaining, and optimizing AI systems effectively.',
              'Collaboration': 'AI projects require cross-functional teamwork; strong collaboration ensures seamless integration across teams.',
              'Innovation': 'Drives creative application of AI technologies to solve novel problems and improve existing processes.',
              'Leadership': 'Important for guiding teams through AI transformation and making strategic decisions about AI adoption.',
              'Learning Agility': 'The AI field evolves rapidly; quick learning ensures staying current with emerging technologies and methods.',
              'Attention to Detail': 'Critical for data quality, model accuracy, and preventing costly errors in AI implementations.',
            };
            
            const getWhyItMatters = (skillName: string) => {
              return whyItMatters[skillName] || `This skill is essential for success in the ${selectedRoleData?.name || 'selected'} role.`;
            };

            const getGapText = (candidateScore: number | null, requiredScore: number) => {
              if (candidateScore === null) return 'Assessment not completed';
              const gap = candidateScore - requiredScore;
              if (gap >= 0) return <span className="text-green-600">+{gap} above requirement</span>;
              return <span className="text-amber-600">{Math.abs(gap)} below requirement</span>;
            };
            
            if (criticalSkills.length === 0) return null;
            
            return (
              <Card data-testid="card-critical-skills-analysis">
                <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-white">
                    CRITICAL SKILLS ANALYSIS
                  </CardTitle>
                  <p className="text-sm text-white/80">
                    Deep analysis of the most critical skills required for this role
                  </p>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Individual critical skill cards */}
                    {criticalSkills.map((skill: any, index: number) => {
                      const hasSkillData = hasData(skill);
                      const meetsRequirement = hasSkillData && skill.candidateScore >= skill.requiredScore;
                      
                      return (
                        <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-orange-500 text-white text-xs font-semibold">
                              CRITICAL
                            </Badge>
                            <span className="font-semibold text-lg">{skill.skillName}</span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground italic mb-3">
                            Why it matters: {getWhyItMatters(skill.skillName)}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Candidate Score:</span>
                              <span className={`font-semibold ${
                                !hasSkillData ? 'text-amber-500' :
                                meetsRequirement ? 'text-green-600' : 'text-amber-500'
                              }`}>
                                {hasSkillData ? `${skill.candidateScore}/100` : 'No data'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">(Recommended: {skill.requiredScore})</span>
                            </div>
                            <div className="font-medium">
                              {getGapText(hasSkillData ? skill.candidateScore : null, skill.requiredScore)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Critical Skills Summary */}
                    <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border">
                      <h4 className="font-bold text-lg mb-2">Critical Skills Summary</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedCandidateData?.user?.firstName || selectedCandidateData?.user?.email || 'This candidate'} requires development in {criticalGaps.length} of {criticalSkills.length} critical skills.
                        {criticalGaps.length > 0 && ' These gaps should be addressed through structured training before full role responsibilities are assumed.'}
                        {criticalGaps.length === 0 && noDataCritical.length === 0 && ' All critical skill requirements have been met.'}
                        {noDataCritical.length > 0 && ` ${noDataCritical.length} critical skill${noDataCritical.length > 1 ? 's are' : ' is'} awaiting assessment data.`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Cohort Benchmarking */}
          {alignment.cohortBenchmarks && (alignment.cohortBenchmarks.fit || alignment.cohortBenchmarks.ai_readiness || alignment.cohortBenchmarks.prompt_architecture || alignment.cohortBenchmarks.aiq) && (
            <Card data-testid="card-cohort-benchmarking">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-600" />
                  Cohort Benchmarking
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  How this candidate compares to other assessed candidates across each assessment type
                </p>
              </CardHeader>
              <CardContent>
                {alignment.cohortBenchmarks.overall && (
                  <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold">Overall Cohort Position</p>
                        <p className="text-sm text-muted-foreground">
                          Ranking based on comparison with other assessed candidates in the cohort
                        </p>
                      </div>
                      <Badge 
                        variant={alignment.cohortBenchmarks.overall.percentile >= 75 ? 'default' : alignment.cohortBenchmarks.overall.percentile >= 50 ? 'secondary' : 'outline'}
                        className="text-lg px-4 py-2"
                      >
                        {alignment.cohortBenchmarks.overall.position}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto -mx-2 md:mx-0">
                  <table className="w-full text-xs md:text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 md:px-3 font-medium min-w-[100px]">Assessment</th>
                        <th className="text-center py-2 px-1 md:px-3 font-medium">Skills</th>
                        <th className="text-center py-2 px-1 md:px-3 font-medium">%ile</th>
                        <th className="text-center py-2 px-1 md:px-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alignment.cohortBenchmarks.fit && (
                        <tr className="border-b">
                          <td className="py-2 md:py-3 px-2 md:px-3">
                            <span className="hidden md:inline">FIT Assessment (Behavioral)</span>
                            <span className="md:hidden">FIT</span>
                          </td>
                          <td className="text-center px-1 md:px-3">{alignment.cohortBenchmarks.fit.skillCount}</td>
                          <td className="text-center px-1 md:px-3">{alignment.cohortBenchmarks.fit.percentile}th</td>
                          <td className="text-center px-1 md:px-3">
                            <Badge variant={alignment.cohortBenchmarks.fit.percentile >= 50 ? 'default' : 'outline'} className="text-[10px] md:text-xs px-1 md:px-2">
                              {alignment.cohortBenchmarks.fit.percentile >= 50 ? 'Above' : 'Below'}
                            </Badge>
                          </td>
                        </tr>
                      )}
                      {alignment.cohortBenchmarks.ai_readiness && (
                        <tr className="border-b">
                          <td className="py-2 md:py-3 px-2 md:px-3">
                            <span className="hidden md:inline">AI Readiness Assessment</span>
                            <span className="md:hidden">AI Ready</span>
                          </td>
                          <td className="text-center px-1 md:px-3">{alignment.cohortBenchmarks.ai_readiness.skillCount}</td>
                          <td className="text-center px-1 md:px-3">{alignment.cohortBenchmarks.ai_readiness.percentile}th</td>
                          <td className="text-center px-1 md:px-3">
                            <Badge variant={alignment.cohortBenchmarks.ai_readiness.percentile >= 50 ? 'default' : 'outline'} className="text-[10px] md:text-xs px-1 md:px-2">
                              {alignment.cohortBenchmarks.ai_readiness.percentile >= 50 ? 'Above' : 'Below'}
                            </Badge>
                          </td>
                        </tr>
                      )}
                      {alignment.cohortBenchmarks.prompt_architecture && (
                        <tr className="border-b">
                          <td className="py-2 md:py-3 px-2 md:px-3">
                            <span className="hidden md:inline">Prompt Architecture</span>
                            <span className="md:hidden">Prompt</span>
                          </td>
                          <td className="text-center px-1 md:px-3">1</td>
                          <td className="text-center px-1 md:px-3">{alignment.cohortBenchmarks.prompt_architecture.percentile}th</td>
                          <td className="text-center px-1 md:px-3">
                            <Badge variant={alignment.cohortBenchmarks.prompt_architecture.percentile >= 50 ? 'default' : 'outline'} className="text-[10px] md:text-xs px-1 md:px-2">
                              {alignment.cohortBenchmarks.prompt_architecture.percentile >= 50 ? 'Above' : 'Below'}
                            </Badge>
                          </td>
                        </tr>
                      )}
                      {alignment.cohortBenchmarks.aiq && (
                        <tr>
                          <td className="py-2 md:py-3 px-2 md:px-3">
                            <span className="hidden md:inline">Artificial Intelligence Quotient (AIQ)</span>
                            <span className="md:hidden">AIQ</span>
                          </td>
                          <td className="text-center px-1 md:px-3">1</td>
                          <td className="text-center px-1 md:px-3">{alignment.cohortBenchmarks.aiq.percentile}th</td>
                          <td className="text-center px-1 md:px-3">
                            <Badge variant={alignment.cohortBenchmarks.aiq.percentile >= 50 ? 'default' : 'outline'} className="text-[10px] md:text-xs px-1 md:px-2">
                              {alignment.cohortBenchmarks.aiq.percentile >= 50 ? 'Above' : 'Below'}
                            </Badge>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!alignment.cohortBenchmarks.prompt_architecture && !alignment.cohortBenchmarks.aiq && (
                  <p className="text-xs text-muted-foreground mt-4">
                    Note: Some assessment type benchmarks may not be available if there are insufficient completed assessments
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Prompt Engineering Role Fit Analysis */}
          <Card data-testid="card-prompt-role-fit">
            <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5" />
                Prompt Engineering Role Fit Analysis
              </CardTitle>
              <p className="text-sm text-white/80">
                AI-powered analysis of how the candidate's prompt engineering skills align with role requirements
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              {false /* pre-loaded */ ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Analyzing prompt engineering fit...</p>
                </div>
              ) : alignment?.promptRoleFitAnalysis ? (
                <div className="space-y-4" data-testid="text-prompt-role-fit-analysis">
                  {alignment?.promptRoleFitAnalysis?.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No Prompt Architecture assessment data available for this candidate.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AIQ Role Fit Analysis */}
          <Card data-testid="card-aiq-role-fit">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-white">
                <ShieldAlert className="h-5 w-5" />
                AIQ (Ethical AI) Role Fit Analysis
              </CardTitle>
              <p className="text-sm text-white/80">
                AI-powered analysis of how the candidate's ethical AI stance aligns with role governance requirements
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              {false /* pre-loaded */ ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Analyzing AIQ role fit...</p>
                </div>
              ) : alignment?.aiqRoleFitAnalysis ? (
                <div className="space-y-4" data-testid="text-aiq-role-fit-analysis">
                  {alignment?.aiqRoleFitAnalysis?.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No AIQ assessment data available for this candidate.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Role Flexibility Analysis */}
          {alignment.roleFlexibility && alignment.roleFlexibility.length > 0 && (
            <Card data-testid="card-role-flexibility">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Role Flexibility Analysis
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Alternative roles based on skill profile similarity and candidate fit (40%+ role similarity required)
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alignment.roleFlexibility.map((role) => (
                    <div 
                      key={role.roleId} 
                      className="p-3 rounded-lg bg-muted/50 border"
                      data-testid={`row-alternative-role-${role.roleId}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm" data-testid={`text-role-name-${role.roleId}`}>{role.roleName}</p>
                            {role.roleSimilarity !== undefined && (
                              <Badge 
                                variant={role.roleSimilarity >= 70 ? 'default' : role.roleSimilarity >= 55 ? 'secondary' : 'outline'}
                                className="text-xs"
                                data-testid={`badge-similarity-${role.roleId}`}
                              >
                                {role.roleSimilarity}% Similar Role
                              </Badge>
                            )}
                            {role.coverageLabel && (
                              <Badge 
                                variant="outline"
                                className="text-xs"
                                data-testid={`badge-coverage-${role.roleId}`}
                              >
                                {role.coveragePercent}% Coverage
                              </Badge>
                            )}
                          </div>
                          {role.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-md mt-1">{role.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <Progress value={role.fitScore} className="w-24 h-2" />
                            {role.rawFitScore !== undefined && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Candidate Fit: {role.rawFitScore}%
                              </p>
                            )}
                          </div>
                          <Badge 
                            variant={role.fitScore >= 60 ? 'default' : role.fitScore >= 40 ? 'secondary' : 'outline'}
                            className="min-w-[60px] justify-center"
                            data-testid={`badge-role-fit-score-${role.roleId}`}
                          >
                            {role.fitScore}%
                          </Badge>
                        </div>
                      </div>
                      {role.missingCriticalSkills && role.missingCriticalSkills.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-dashed">
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Missing critical skills: {role.missingCriticalSkills.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Final Recommendation */}
          {alignment.finalRecommendation && (() => {
            let cleanedText = alignment.finalRecommendation
              .replace(/OVERALL ASSESSMENT:.*?\n/gi, '')
              .replace(/KEY STRENGTHS:[\s\S]*?(?=\n\n[A-Z]|DEVELOPMENT AREAS:|COHORT CONTEXT:|HIRING RECOMMENDATION:|ALTERNATIVE ROLE|$)/gi, '')
              .replace(/DEVELOPMENT AREAS:[\s\S]*?(?=\n\n[A-Z]|COHORT CONTEXT:|HIRING RECOMMENDATION:|ALTERNATIVE ROLE|$)/gi, '')
              .replace(/\n{3,}/g, '\n\n')
              .replace(/CRITICAL SKILLS ANALYSIS:/g, 'Critical Skills Analysis:')
              .replace(/COHORT CONTEXT:/g, 'Cohort Context:')
              .replace(/HIRING RECOMMENDATION:/g, 'Hiring Recommendation:')
              .replace(/ALTERNATIVE ROLE INSIGHT:/g, 'Alternative Role Insight:')
              .trim();
            
            const sections = cleanedText.split(/\n\n+/).filter(s => s.trim());
            
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Final Recommendation
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Overall hiring recommendation based on comprehensive assessment analysis and role alignment
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4" data-testid="text-final-recommendation">
                    {sections.map((section, index) => (
                      <p key={index} className="text-sm text-muted-foreground leading-relaxed">
                        {section.trim()}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Recommended Next Steps */}
          {alignment.nextSteps && alignment.nextSteps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Recommended Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {alignment.nextSteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3" data-testid={`list-item-next-step-${index}`}>
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Additional Services on Request */}
          <Card className="border-primary/20 bg-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-white" />
                Additional Services on Request
              </CardTitle>
              <p className="text-sm text-white/80">
                Contact our team to unlock these premium insights for your hiring decisions
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                    <MessageSquare className="h-4 w-4 text-white" />
                    Suggested Interview Questions
                  </h4>
                  <p className="text-sm text-white/70">
                    AI-generated questions based on candidate's assessment results and skill gaps
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                    <Users className="h-4 w-4 text-white" />
                    Team Composition Fit
                  </h4>
                  <p className="text-sm text-white/70">
                    Analysis of how the candidate would complement your existing team dynamics
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
                    <ShieldAlert className="h-4 w-4 text-white" />
                    Hiring Risk Analysis
                  </h4>
                  <p className="text-sm text-white/70">
                    Comprehensive risk assessment highlighting potential challenges and mitigations
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                    <DollarSign className="h-4 w-4 text-white" />
                    Development Investment Cost
                  </h4>
                  <p className="text-sm text-white/70">
                    Estimated training and development investment to close identified skill gaps
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <div className="mb-2">
                    <Badge className="bg-amber-500 text-white border-amber-600 text-xs">Coming Soon</Badge>
                  </div>
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                    <BarChart3 className="h-4 w-4 text-white" />
                    Cohort Benchmarking
                  </h4>
                  <p className="text-sm text-white/70">
                    Compare candidate performance against industry benchmarks and similar cohorts
                  </p>
                </div>
              </div>
              <div className="mt-4 text-center">
                <Button 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/20"
                  onClick={() => setShowEnquiryModal(true)}
                  data-testid="button-contact-team-services"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Speak to the Team
                </Button>
              </div>
            </CardContent>
          </Card>

          <SkillsLegend />

          {/* Bottom PDF Export Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="default"
              size="lg"
              onClick={handleExportPDF}
              disabled={isLoadingAlignment || false /* pre-loaded */ || false /* pre-loaded */}
              className="gap-2"
              data-testid="button-export-pdf-bottom"
            >
              {isLoadingAlignment || false /* pre-loaded */ || false /* pre-loaded */ ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Please Wait...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Export as PDF
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="gap-2 text-white border-white/50 hover:bg-white/10"
              data-testid="button-back-to-top-single"
            >
              <ChevronUp className="h-5 w-5" />
              Back to Top
            </Button>
          </div>
        </div>
      )}

      <EnquiryModal 
        open={showEnquiryModal} 
        onOpenChange={setShowEnquiryModal}
        context="Role Fit Analysis - Enterprise Services"
      />
    </div>
  );
}
