import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Target, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Download, Award, Brain, Sparkles, MessageSquare, Calendar, Users } from "lucide-react";
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

export default function RoleFitTab() {
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const { toast } = useToast();

  const { data: candidates } = useQuery<any[]>({
    queryKey: ['/api/admin/candidates'],
  });

  const { data: roles } = useQuery<any[]>({
    queryKey: ['/api/admin/roles'],
  });

  type RoleAlignment = {
    overallFit: number;
    fitSkillAlignments?: Array<{
      skillName: string;
      candidateScore: number;
      requiredScore: number;
      gap: number;
      alignment: string;
      criticality?: 'critical' | 'important' | 'nice-to-have';
    }> | null;
    aiReadinessSkillAlignments?: Array<{
      skillName: string;
      candidateScore: number;
      requiredScore: number;
      gap: number;
      alignment: string;
      criticality?: 'critical' | 'important' | 'nice-to-have';
    }> | null;
    strengths: string[];
    gaps: string[];
    cohortBenchmarks?: Record<string, { percentile: number; totalCandidates: number }> | null;
    dataRiskIndicators?: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
    }> | null;
    interviewQuestions?: Array<{
      question: string;
      purpose: string;
      targetSkill: string;
    }> | null;
    roleFlexibility?: Array<{
      roleId: string;
      roleName: string;
      fitScore: number;
      description?: string;
    }> | null;
  };

  const getPercentileBadge = (percentile: number) => {
    // percentile = 90 means candidate is better than 90% of candidates, so they're in Top 10%
    if (percentile >= 90) return { label: `Top ${100 - percentile}%`, variant: 'default' as const, color: 'text-green-600' };
    if (percentile >= 75) return { label: `Top ${100 - percentile}%`, variant: 'secondary' as const, color: 'text-blue-600' };
    if (percentile >= 50) return { label: `Top ${100 - percentile}%`, variant: 'outline' as const, color: 'text-muted-foreground' };
    // For below median: percentile=40 means they're in the bottom 40%, so we show "Bottom 40%"
    return { label: `Bottom ${percentile}%`, variant: 'outline' as const, color: 'text-amber-600' };
  };

  const getCriticalityBadge = (criticality: string | undefined, hasGap: boolean) => {
    const level = criticality || 'important';
    if (level === 'critical') {
      return (
        <Badge variant={hasGap ? 'destructive' : 'outline'} className="text-xs ml-2">
          Critical
        </Badge>
      );
    } else if (level === 'important') {
      return (
        <Badge variant="secondary" className="text-xs ml-2">
          Important
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-xs ml-2 opacity-60">
          Nice-to-have
        </Badge>
      );
    }
  };

  const { data: alignment, isLoading: isLoadingAlignment } = useQuery<RoleAlignment>({
    queryKey: selectedCandidate && selectedRole
      ? [`/api/admin/role-alignment?userId=${selectedCandidate}&jobRoleId=${selectedRole}`]
      : undefined as any,
    enabled: !!selectedCandidate && !!selectedRole,
  });

  const generateRequiredScoresMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const res = await apiRequest('POST', `/api/admin/roles/${roleId}/generate-required-scores`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
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
      // Use 120 second timeout for AI analysis which includes OpenAI API calls
      const res = await apiRequest('POST', '/api/admin/role-alignment', {
        userId: selectedCandidate,
        jobRoleId: selectedRole,
      }, { timeoutMs: 120000 });
      return res.json();
    },
    onSuccess: (data) => {
      // Directly set the query data for immediate display
      queryClient.setQueryData([`/api/admin/role-alignment?userId=${selectedCandidate}&jobRoleId=${selectedRole}`], data);
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
                  Analyzing with AI...
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
          {/* Overall Fit Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Overall Role Fit</span>
                <Badge
                  variant={
                    alignment.overallFit >= 80
                      ? 'default'
                      : alignment.overallFit >= 60
                      ? 'secondary'
                      : 'outline'
                  }
                  className="text-lg px-3 py-1"
                >
                  {alignment.overallFit}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={alignment.overallFit} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                {alignment.overallFit >= 80
                  ? 'Excellent match for this role'
                  : alignment.overallFit >= 60
                  ? 'Good potential for this role'
                  : 'May need additional training for this role'}
              </p>
            </CardContent>
          </Card>

          {/* Data Quality Risk Indicators */}
          {alignment.dataRiskIndicators && alignment.dataRiskIndicators.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-5 w-5" />
                  Data Quality Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {alignment.dataRiskIndicators.map((indicator: any, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <Badge
                        variant={indicator.severity === 'high' ? 'destructive' : 'secondary'}
                        className="mt-0.5 shrink-0"
                      >
                        {indicator.severity}
                      </Badge>
                      <span className="text-sm">{indicator.message}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* FIT Skill Alignments */}
          {alignment.fitSkillAlignments && alignment.fitSkillAlignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-600" />
                  FIT Assessment Skills (Behavioral)
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Behavioral competencies and workplace adaptability
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alignment.fitSkillAlignments.map((skill: any, index: number) => (
                    <div key={index} className={`space-y-2 p-3 rounded-lg ${skill.criticality === 'critical' && skill.gap > 0 ? 'bg-destructive/5 border border-destructive/20' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{skill.skillName}</span>
                          {getCriticalityBadge(skill.criticality, skill.gap > 0)}
                          {skill.gap > 0 ? (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <Badge
                          variant={
                            skill.alignment === 'excellent'
                              ? 'default'
                              : skill.alignment === 'good'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {skill.alignment}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Candidate Score</p>
                          <p className="font-semibold">{skill.candidateScore}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Required Score</p>
                          <p className="font-semibold">{skill.requiredScore}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Gap</p>
                          <p className={skill.gap > 0 ? 'font-semibold text-destructive' : 'font-semibold text-green-600'}>
                            {skill.gap > 0 ? '-' : '+'}{Math.abs(skill.gap)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">vs. All Candidates</p>
                          {alignment.cohortBenchmarks?.[skill.skillName] ? (
                            <p className={`font-semibold ${getPercentileBadge(alignment.cohortBenchmarks[skill.skillName].percentile).color}`}>
                              {getPercentileBadge(alignment.cohortBenchmarks[skill.skillName].percentile).label}
                            </p>
                          ) : (
                            <p className="text-muted-foreground text-xs">Insufficient data</p>
                          )}
                        </div>
                      </div>
                      <Progress value={(skill.candidateScore / skill.requiredScore) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Readiness Skill Alignments */}
          {alignment.aiReadinessSkillAlignments && alignment.aiReadinessSkillAlignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  AI Readiness Skills (Technical)
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  AI collaboration capabilities and technical fluency
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alignment.aiReadinessSkillAlignments.map((skill: any, index: number) => (
                    <div key={index} className={`space-y-2 p-3 rounded-lg ${skill.criticality === 'critical' && skill.gap > 0 ? 'bg-destructive/5 border border-destructive/20' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{skill.skillName}</span>
                          {getCriticalityBadge(skill.criticality, skill.gap > 0)}
                          {skill.gap > 0 ? (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <Badge
                          variant={
                            skill.alignment === 'excellent'
                              ? 'default'
                              : skill.alignment === 'good'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {skill.alignment}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Candidate Score</p>
                          <p className="font-semibold">{skill.candidateScore}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Required Score</p>
                          <p className="font-semibold">{skill.requiredScore}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Gap</p>
                          <p className={skill.gap > 0 ? 'font-semibold text-destructive' : 'font-semibold text-green-600'}>
                            {skill.gap > 0 ? '-' : '+'}{Math.abs(skill.gap)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">vs. All Candidates</p>
                          {alignment.cohortBenchmarks?.[skill.skillName] ? (
                            <p className={`font-semibold ${getPercentileBadge(alignment.cohortBenchmarks[skill.skillName].percentile).color}`}>
                              {getPercentileBadge(alignment.cohortBenchmarks[skill.skillName].percentile).label}
                            </p>
                          ) : (
                            <p className="text-muted-foreground text-xs">Insufficient data</p>
                          )}
                        </div>
                      </div>
                      <Progress value={(skill.candidateScore / skill.requiredScore) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}


          {/* Strengths and Gaps */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Key Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {alignment.strengths?.map((strength: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Development Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {alignment.gaps?.map((gap: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{gap}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Role Flexibility Analysis */}
          {alignment.roleFlexibility && alignment.roleFlexibility.length > 0 && (
            <Card data-testid="card-role-flexibility">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Role Flexibility Analysis
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Alternative roles this candidate might be suitable for
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alignment.roleFlexibility.map((role, index) => (
                    <div 
                      key={role.roleId} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                      data-testid={`row-alternative-role-${role.roleId}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm" data-testid={`text-role-name-${role.roleId}`}>{role.roleName}</p>
                        {role.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-md">{role.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={role.fitScore} className="w-24 h-2" />
                        <Badge 
                          variant={role.fitScore >= 80 ? 'default' : role.fitScore >= 60 ? 'secondary' : 'outline'}
                          className="min-w-[60px] justify-center"
                          data-testid={`badge-role-fit-score-${role.roleId}`}
                        >
                          {role.fitScore}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Optional Premium Services */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Optional Premium Services
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Additional insights available when employer provides company-specific information
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-background border">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Interview Questions
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    AI-generated competency-based questions tailored to this candidate's skill gaps
                  </p>
                  <Badge variant="outline" className="text-xs">Requires: Role context</Badge>
                </div>
                <div className="p-4 rounded-lg bg-background border">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    30/60/90 Day Onboarding Plan
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Customized development milestones based on candidate's strengths and gaps
                  </p>
                  <Badge variant="outline" className="text-xs">Requires: Team structure</Badge>
                </div>
                <div className="p-4 rounded-lg bg-background border">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    Culture Fit Analysis
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Assessment of alignment with company values and team dynamics
                  </p>
                  <Badge variant="outline" className="text-xs">Requires: Company values</Badge>
                </div>
              </div>
              <div className="mt-4 text-center">
                <Button variant="outline" disabled className="opacity-50">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Contact Sales to Enable
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => analyzeRoleFitMutation.mutate()}>
              Refresh Analysis
            </Button>
            <Button 
              onClick={handleExportPDF}
              data-testid="button-export-role-fit"
            >
              <Download className="h-4 w-4 mr-2" />
              Export as PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
