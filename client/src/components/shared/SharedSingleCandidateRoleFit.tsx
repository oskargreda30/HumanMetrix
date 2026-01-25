import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Target, CheckCircle2, AlertCircle, AlertTriangle, TrendingUp, TrendingDown, Download, Award, Brain, Sparkles, MessageSquare, Users, Clock, ShieldAlert, DollarSign, FileText, User } from "lucide-react";
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

// Configuration interface for shared component
export interface SharedRoleFitConfig {
  // API endpoints
  candidatesEndpoint: string;
  rolesEndpoint: string;
  roleAlignmentEndpoint: string;
  generateScoresEndpoint: (roleId: string) => string;
  analyzeRoleFitEndpoint: string;
  
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
  strengths: string[];
  gaps: string[];
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
};

interface SharedSingleCandidateRoleFitProps {
  config: SharedRoleFitConfig;
}

export function SharedSingleCandidateRoleFit({ config }: SharedSingleCandidateRoleFitProps) {
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const { toast } = useToast();

  const { data: candidates } = useQuery<any[]>({
    queryKey: [config.candidatesEndpoint],
  });

  const { data: roles } = useQuery<any[]>({
    queryKey: [config.rolesEndpoint],
  });

  const getPercentileBadge = (percentile: number) => {
    if (percentile >= 90) return { label: `Top ${100 - percentile}%`, variant: 'default' as const, color: 'text-green-600' };
    if (percentile >= 75) return { label: `Top ${100 - percentile}%`, variant: 'secondary' as const, color: 'text-blue-600' };
    if (percentile >= 50) return { label: `Top ${100 - percentile}%`, variant: 'outline' as const, color: 'text-muted-foreground' };
    return { label: `Bottom ${percentile}%`, variant: 'outline' as const, color: 'text-amber-600' };
  };

  const getCriticalityBadge = (criticality: string | undefined) => {
    const level = criticality || 'important';
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

  const { data: alignment, isLoading: isLoadingAlignment } = useQuery<RoleAlignment>({
    queryKey: alignmentQueryKey as any,
    enabled: !!selectedCandidate && !!selectedRole,
  });

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

  const analyzeRoleFitMutation = useMutation({
    mutationFn: async () => {
      const payload = config.candidateIdParam === 'userId' 
        ? { userId: selectedCandidate, jobRoleId: selectedRole }
        : { candidateId: selectedCandidate, jobRoleId: selectedRole };
      const res = await apiRequest('POST', config.analyzeRoleFitEndpoint, payload, { timeoutMs: 120000 });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([`${config.roleAlignmentEndpoint}?${config.candidateIdParam}=${selectedCandidate}&jobRoleId=${selectedRole}`], data);
      toast({ title: "Role fit analysis completed" });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze role fit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const selectedCandidateData = candidates?.find((c) => c.user.id === selectedCandidate);
  const selectedRoleData = roles?.find((r) => r.id === selectedRole);

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
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getAlignmentColor = (alignment: string) => {
    if (alignment === 'exceeds' || alignment === 'meets') return 'text-green-600';
    if (alignment === 'close') return 'text-amber-600';
    return 'text-red-600';
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
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Role Alignment Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select a candidate and job role to see how well they match using AI analysis
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Candidate</label>
              <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
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
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role: any) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
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
                    'Generate Required Scores'
                  )}
                </Button>
              </div>
            </div>
          )}

          {selectedCandidate && selectedRole && !alignment && selectedRoleData?.requiredSkillScores && (
            <Button
              onClick={() => analyzeRoleFitMutation.mutate()}
              disabled={analyzeRoleFitMutation.isPending}
              className="w-full"
              data-testid="button-analyze-fit"
            >
              {analyzeRoleFitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing with AI... (this may take up to 2 minutes)
                </>
              ) : (
                <>
                  <Target className="mr-2 h-4 w-4" />
                  Analyze Role Fit
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {isLoadingAlignment && (
        <Card>
          <CardContent className="flex justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading AI analysis...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {alignment && !isLoadingAlignment && (
        <div className="space-y-6">
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
                    <p className="text-xs text-muted-foreground">Compare candidate scores vs. role requirements. Look for <Badge className="text-[10px] px-1 py-0 h-4 bg-blue-600">C</Badge> marked skills - these are <span className="font-medium">critical</span> for success.</p>
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
                    <p className="font-medium text-sm">Interview Questions</p>
                    <p className="text-xs text-muted-foreground">AI-generated questions targeting skill gaps. Use these to probe deeper into areas where candidate scores were below requirements.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">6</div>
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
                <div className="flex items-center gap-2">
                  {getFitTierBadge(getOverallFitTier(alignment.overallFit))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPDF}
                    data-testid="button-export-pdf"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
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
                <ul className="space-y-2">
                  {alignment.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{strength}</span>
                    </li>
                  ))}
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
                <ul className="space-y-2">
                  {alignment.gaps.map((gap, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{gap}</span>
                    </li>
                  ))}
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
                  {alignment.fitSkillAlignments.map((skill, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getAlignmentIcon(skill.alignment)}
                          <span className="font-medium">{skill.skillName}</span>
                          {getCriticalityBadge(skill.criticality)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${getAlignmentColor(skill.alignment)}`}>
                            {skill.dataAvailable !== false && skill.candidateScore !== null 
                              ? `${skill.candidateScore}%` 
                              : 'No data'}
                          </span>
                          <span className="text-muted-foreground">/ {skill.requiredScore}% required</span>
                        </div>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                            skill.alignment === 'exceeds' || skill.alignment === 'meets' 
                              ? 'bg-green-500' 
                              : skill.alignment === 'close' 
                                ? 'bg-amber-500' 
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${skill.dataAvailable !== false ? (skill.candidateScore || 0) : 0}%` }}
                        />
                        <div 
                          className="absolute top-0 h-full w-0.5 bg-blue-600"
                          style={{ left: `${skill.requiredScore}%` }}
                          title={`Required: ${skill.requiredScore}%`}
                        />
                      </div>
                    </div>
                  ))}
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
                  {alignment.aiReadinessSkillAlignments.map((skill, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getAlignmentIcon(skill.alignment)}
                          <span className="font-medium">{skill.skillName}</span>
                          {getCriticalityBadge(skill.criticality)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${getAlignmentColor(skill.alignment)}`}>
                            {skill.dataAvailable !== false && skill.candidateScore !== null 
                              ? `${skill.candidateScore}%` 
                              : 'No data'}
                          </span>
                          <span className="text-muted-foreground">/ {skill.requiredScore}% required</span>
                        </div>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                            skill.alignment === 'exceeds' || skill.alignment === 'meets' 
                              ? 'bg-green-500' 
                              : skill.alignment === 'close' 
                                ? 'bg-amber-500' 
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${skill.dataAvailable !== false ? (skill.candidateScore || 0) : 0}%` }}
                        />
                        <div 
                          className="absolute top-0 h-full w-0.5 bg-blue-600"
                          style={{ left: `${skill.requiredScore}%` }}
                          title={`Required: ${skill.requiredScore}%`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <CriticalityLegend />
              </CardContent>
            </Card>
          )}

          {/* Interview Questions */}
          {alignment.interviewQuestions && alignment.interviewQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Suggested Interview Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alignment.interviewQuestions.map((q, index) => (
                    <div key={index} className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium text-sm mb-2">{q.question}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Target: {q.targetSkill}
                        </span>
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {q.purpose}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alternative Roles */}
          {alignment.roleFlexibility && alignment.roleFlexibility.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Alternative Role Matches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {alignment.roleFlexibility.map((role, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{role.roleName}</span>
                        <Badge variant={role.fitScore >= 80 ? 'default' : role.fitScore >= 60 ? 'secondary' : 'outline'}>
                          {role.fitScore}%
                        </Badge>
                      </div>
                      {role.coverageLabel && (
                        <p className="text-xs text-muted-foreground">
                          Coverage: {role.coverageLabel}
                        </p>
                      )}
                      {role.missingCriticalSkills && role.missingCriticalSkills.length > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          Missing: {role.missingCriticalSkills.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Final Recommendation */}
          {alignment.finalRecommendation && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Final Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{alignment.finalRecommendation}</p>
                {alignment.nextSteps && alignment.nextSteps.length > 0 && (
                  <div>
                    <p className="font-medium text-sm mb-2">Next Steps:</p>
                    <ul className="space-y-1">
                      {alignment.nextSteps.map((step, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-primary font-bold">{index + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <SkillsLegend />
        </div>
      )}
    </div>
  );
}
