import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, User, BarChart3, Target, Award, Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
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
import { FIT_SKILLS, AI_READINESS_SKILLS, getSkillAcronym } from "@/lib/assessmentSkills";
import SkillsLegend from "@/components/SkillsLegend";
import { apiRequest } from "@/lib/queryClient";

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

export default function PartnerAnalysisTab() {
  const [subTab, setSubTab] = useState("individual");
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const { toast } = useToast();

  const { data: candidates, isLoading: isLoadingCandidates } = useQuery<CandidateData[]>({
    queryKey: ['/api/partner/me/candidates'],
  });

  const { data: roles } = useQuery<any[]>({
    queryKey: ['/api/partner/me/roles'],
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

  const { data: comparison, isLoading: isComparing } = useQuery<ComparisonData>({
    queryKey: ['partner-compare', selectedCandidates],
    queryFn: async () => {
      const params = new URLSearchParams();
      selectedCandidates.forEach(id => params.append('candidateIds', id));
      const response = await fetch(`/api/partner/me/compare?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch comparison');
      return response.json();
    },
    enabled: selectedCandidates.length >= 2,
  });

  const { data: alignment, isLoading: isLoadingAlignment } = useQuery<RoleAlignment>({
    queryKey: selectedCandidate && selectedRole
      ? [`/api/partner/me/role-alignment?candidateId=${selectedCandidate}&jobRoleId=${selectedRole}`]
      : undefined as any,
    enabled: !!selectedCandidate && !!selectedRole && subTab === 'rolefit',
  });

  const toggleCandidate = (candidateId: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : prev.length < 3
        ? [...prev, candidateId]
        : prev
    );
  };

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

  const selectedCandidateData = candidates?.find(c => c.user.id === selectedCandidate);
  const selectedCandidateDataList = selectedCandidates
    .map(id => candidates?.find((c) => c.user.id === id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  const fitData = candidateReport?.fitAssessments?.[0];
  const aiData = candidateReport?.aiReadinessAssessments?.[0];

  const fitRadarData = fitData ? FIT_SKILLS.map(skill => ({
    skill: getSkillAcronym(skill.displayName),
    fullName: skill.displayName,
    score: fitData.scores[skill.key] || fitData.scores[skill.displayName] || 0,
  })) : [];

  const aiRadarData = aiData ? AI_READINESS_SKILLS.map(skill => ({
    skill: getSkillAcronym(skill.displayName),
    fullName: skill.displayName,
    score: aiData.scores[skill.displayName] || aiData.scores[skill.key] || 0,
  })) : [];

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
          <TabsTrigger value="rolefit" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
            <Target className="h-4 w-4 mr-2" />
            Role Fit
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
              <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
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

          {selectedCandidate && isLoadingReport && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {selectedCandidate && candidateReport && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* FIT Assessment Radar */}
              {fitRadarData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      FIT Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={fitRadarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="skill" />
                          <PolarRadiusAxis domain={[0, 100]} />
                          <Radar
                            name="Score"
                            dataKey="score"
                            stroke={CHART_COLORS[0]}
                            fill={CHART_COLORS[0]}
                            fillOpacity={0.3}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <SkillsLegend skills={FIT_SKILLS} />
                  </CardContent>
                </Card>
              )}

              {/* AI Readiness Radar */}
              {aiRadarData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI Readiness Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={aiRadarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="skill" />
                          <PolarRadiusAxis domain={[0, 100]} />
                          <Radar
                            name="Score"
                            dataKey="score"
                            stroke={CHART_COLORS[1]}
                            fill={CHART_COLORS[1]}
                            fillOpacity={0.3}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <SkillsLegend skills={AI_READINESS_SKILLS} />
                  </CardContent>
                </Card>
              )}

              {/* Skills Breakdown */}
              {candidateReport.skillComparison.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Skills Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {candidateReport.skillComparison.map((skill, idx) => {
                        const score = skill.scores[0] ?? 0;
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{skill.skillName}</span>
                              <span className={`text-sm font-bold ${getScoreColor(score)}`}>
                                {score}%
                              </span>
                            </div>
                            <Progress value={score} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Compare Candidates Tab */}
        <TabsContent value="compare" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Candidates to Compare</CardTitle>
              <CardDescription>Select 2-3 candidates to compare their assessment results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.user.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCandidates.includes(candidate.user.id)
                        ? 'border-primary bg-primary/10'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleCandidate(candidate.user.id)}
                    data-testid={`compare-candidate-${candidate.user.id}`}
                  >
                    <Checkbox
                      checked={selectedCandidates.includes(candidate.user.id)}
                      onCheckedChange={() => toggleCandidate(candidate.user.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{getCandidateName(candidate)}</p>
                      <p className="text-sm text-muted-foreground truncate">{candidate.user.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {candidate.results.filter(r => r.status === 'completed').length} tests
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedCandidates.length >= 2 && isComparing && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {selectedCandidates.length >= 2 && comparison && comparison.hasSkillData && (
            <div className="space-y-6">
              {/* Comparison Radar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Skills Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={comparison.radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="skill" />
                        <PolarRadiusAxis domain={[0, 100]} />
                        {selectedCandidateDataList.map((_, idx) => (
                          <Radar
                            key={idx}
                            name={getCandidateName(selectedCandidateDataList[idx])}
                            dataKey={`candidate${idx}`}
                            stroke={CHART_COLORS[idx]}
                            fill={CHART_COLORS[idx]}
                            fillOpacity={0.2}
                          />
                        ))}
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Average Scores */}
              <Card>
                <CardHeader>
                  <CardTitle>Overall Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {selectedCandidateDataList.map((candidate, idx) => (
                      <div key={idx} className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">{getCandidateName(candidate)}</p>
                        <p className={`text-3xl font-bold ${getScoreColor(comparison.averageScores[idx])}`}>
                          {comparison.averageScores[idx]}%
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedCandidates.length < 2 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select at least 2 candidates to compare their assessment results
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Role Fit Tab */}
        <TabsContent value="rolefit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Fit Analysis</CardTitle>
              <CardDescription>Select a candidate and a role to see how well they match</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">Candidate</label>
                  <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                    <SelectTrigger data-testid="select-rolefit-candidate">
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
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Role</label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger data-testid="select-rolefit-role">
                      <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roles?.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedCandidate && selectedRole && isLoadingAlignment && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {selectedCandidate && selectedRole && alignment && (
            <div className="space-y-6">
              {/* Overall Fit Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Overall Fit Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className={`text-5xl font-bold ${getScoreColor(alignment.overallFit || 0)}`}>
                        {alignment.overallFit || 'N/A'}
                        {alignment.overallFit !== null && '%'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {alignment.overallFit !== null && alignment.overallFit >= 80 
                          ? 'Excellent Match' 
                          : alignment.overallFit !== null && alignment.overallFit >= 60 
                            ? 'Good Match' 
                            : 'Needs Development'}
                      </p>
                    </div>
                    {alignment.dataCoverage && (
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium">Data Coverage</span>
                          <Badge variant={alignment.dataCoverage.hasSufficientData ? 'default' : 'secondary'}>
                            {alignment.dataCoverage.percentage}%
                          </Badge>
                        </div>
                        <Progress value={alignment.dataCoverage.percentage} className="h-2" />
                        {alignment.dataCoverage.missingAssessments.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Missing: {alignment.dataCoverage.missingAssessments.join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Strengths and Gaps */}
              <div className="grid gap-6 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <TrendingUp className="h-5 w-5" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {alignment.strengths.length > 0 ? (
                      <ul className="space-y-2">
                        {alignment.strengths.map((strength, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-sm">No notable strengths identified</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-amber-600">
                      <TrendingDown className="h-5 w-5" />
                      Development Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {alignment.gaps.length > 0 ? (
                      <ul className="space-y-2">
                        {alignment.gaps.map((gap, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <span>{gap}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-sm">No significant gaps identified</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Skill Alignments */}
              {alignment.fitSkillAlignments && alignment.fitSkillAlignments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      FIT Skills Alignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {alignment.fitSkillAlignments.map((skill, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          <div className="w-1/3">
                            <span className="text-sm font-medium">{skill.skillName}</span>
                            {skill.criticality === 'critical' && (
                              <Badge className="ml-2 text-xs bg-blue-600 text-white">C</Badge>
                            )}
                          </div>
                          <div className="flex-1">
                            <Progress value={skill.candidateScore || 0} className="h-2" />
                          </div>
                          <div className="w-20 text-right">
                            <span className={`text-sm font-bold ${
                              skill.alignment === 'Meets' ? 'text-green-600' :
                              skill.alignment === 'Gap' ? 'text-amber-600' : 'text-muted-foreground'
                            }`}>
                              {skill.candidateScore !== null ? `${skill.candidateScore}%` : 'N/A'}
                            </span>
                          </div>
                          <Badge variant={
                            skill.alignment === 'Meets' ? 'default' :
                            skill.alignment === 'Gap' ? 'secondary' : 'outline'
                          }>
                            {skill.alignment}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {alignment.aiReadinessSkillAlignments && alignment.aiReadinessSkillAlignments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI Readiness Skills Alignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {alignment.aiReadinessSkillAlignments.map((skill, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          <div className="w-1/3">
                            <span className="text-sm font-medium">{skill.skillName}</span>
                            {skill.criticality === 'critical' && (
                              <Badge className="ml-2 text-xs bg-blue-600 text-white">C</Badge>
                            )}
                          </div>
                          <div className="flex-1">
                            <Progress value={skill.candidateScore || 0} className="h-2" />
                          </div>
                          <div className="w-20 text-right">
                            <span className={`text-sm font-bold ${
                              skill.alignment === 'Meets' ? 'text-green-600' :
                              skill.alignment === 'Gap' ? 'text-amber-600' : 'text-muted-foreground'
                            }`}>
                              {skill.candidateScore !== null ? `${skill.candidateScore}%` : 'N/A'}
                            </span>
                          </div>
                          <Badge variant={
                            skill.alignment === 'Meets' ? 'default' :
                            skill.alignment === 'Gap' ? 'secondary' : 'outline'
                          }>
                            {skill.alignment}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {(!selectedCandidate || !selectedRole) && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select a candidate and a role to see their fit analysis
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
