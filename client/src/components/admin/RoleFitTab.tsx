import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Target, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Download, Award, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
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

  const { data: alignment, isLoading: isLoadingAlignment } = useQuery({
    queryKey: selectedCandidate && selectedRole
      ? ['/api/admin/role-alignment', { userId: selectedCandidate, jobRoleId: selectedRole }]
      : undefined as any,
    enabled: !!selectedCandidate && !!selectedRole,
  });

  const analyzeRoleFitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/role-alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedCandidate,
          jobRoleId: selectedRole,
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to analyze role fit' }));
        throw new Error(error.message || 'Failed to analyze role fit');
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Directly set the query data for immediate display
      queryClient.setQueryData(['/api/admin/role-alignment', { userId: selectedCandidate, jobRoleId: selectedRole }], data);
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

          {selectedCandidate && selectedRole && !alignment && (
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
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{skill.skillName}</span>
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
                      <div className="grid grid-cols-3 gap-4 text-sm">
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
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{skill.skillName}</span>
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
                      <div className="grid grid-cols-3 gap-4 text-sm">
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
                      </div>
                      <Progress value={(skill.candidateScore / skill.requiredScore) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Overall Skill Alignments (fallback if specific ones not available) */}
          {(!alignment.fitSkillAlignments && !alignment.aiReadinessSkillAlignments && alignment.skillAlignments) && (
            <Card>
              <CardHeader>
                <CardTitle>Skill-by-Skill Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alignment.skillAlignments.map((skill: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{skill.skillName}</span>
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
                      <div className="grid grid-cols-3 gap-4 text-sm">
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

          {/* AI Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>AI Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{alignment.recommendations}</p>
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
