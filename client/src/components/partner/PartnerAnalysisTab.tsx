import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, User, BarChart3, Target, Award, Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, FileText, Star, Building2, MessageSquare, Mail } from "lucide-react";
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
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 75) return 'default';
    if (score >= 50) return 'secondary';
    return 'destructive';
  };

  const selectedCandidateData = candidates?.find(c => c.user.id === selectedCandidate);
  const selectedCandidateDataList = selectedCandidates
    .map(id => candidates?.find((c) => c.user.id === id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  const fitData = candidateReport?.fitAssessments?.[0];
  const aiData = candidateReport?.aiReadinessAssessments?.[0];
  const promptArchData = candidateReport?.promptArchitectureAssessments?.[0];
  const aiqData = candidateReport?.aiqAssessments?.[0];

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

  // Calculate overall scores for each assessment type
  const fitOverallScore = fitRadarData.length > 0 
    ? Math.round(fitRadarData.reduce((sum, d) => sum + d.score, 0) / fitRadarData.length) 
    : null;
  const aiOverallScore = aiRadarData.length > 0 
    ? Math.round(aiRadarData.reduce((sum, d) => sum + d.score, 0) / aiRadarData.length) 
    : null;
  const promptArchScore = promptArchData?.totalScore ?? null;
  const aiqScore = aiqData?.totalScore ?? null;

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

          {/* How to Read This Report */}
          <Card className="mb-8" data-testid="section-how-to-read">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold" data-testid="heading-how-to-read">How to Read This Report</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4" data-testid="text-guide-intro">
                A guide to interpreting candidate assessment data for informed hiring decisions
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <span className="font-medium text-sm">Score Interpretation</span>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-1">
                      <Badge className="bg-green-500 text-white text-[10px] px-1 py-0">75%+</Badge> <span>Strong performer,</span>
                      <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0">50-74%</Badge> <span>Developing,</span>
                      <Badge className="bg-red-500 text-white text-[10px] px-1 py-0">&lt;50%</Badge> <span>Needs attention</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="font-medium text-sm">Radar Charts</p>
                    <p className="text-xs text-muted-foreground">
                      Visual overlays show how candidates compare across each capability dimension at a glance.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="font-medium text-sm">Rankings & Percentiles</p>
                    <p className="text-xs text-muted-foreground">
                      See how each candidate ranks relative to others in the cohort and against broader benchmarks.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <p className="font-medium text-sm">Strengths & Development Areas</p>
                    <p className="text-xs text-muted-foreground">
                      Each candidate's key strengths and growth areas help you understand their unique value proposition.
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
            {/* Assessment Overview - All 4 Assessments */}
            <Card className="mb-6" data-testid="section-assessment-overview">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Assessment Overview
                </CardTitle>
                <CardDescription>
                  Summary of all completed assessments for {getCandidateName(selectedCandidateData)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="p-4 border rounded-lg text-center" data-testid="score-card-fit">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Award className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">FIT Assessment</span>
                    </div>
                    <p className={`text-3xl font-bold ${fitOverallScore !== null ? getScoreColor(fitOverallScore) : 'text-muted-foreground'}`}>
                      {fitOverallScore !== null ? `${fitOverallScore}%` : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fitData ? 'Completed' : 'Not taken'}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg text-center" data-testid="score-card-ai-readiness">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI Readiness</span>
                    </div>
                    <p className={`text-3xl font-bold ${aiOverallScore !== null ? getScoreColor(aiOverallScore) : 'text-muted-foreground'}`}>
                      {aiOverallScore !== null ? `${aiOverallScore}%` : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {aiData ? 'Completed' : 'Not taken'}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg text-center" data-testid="score-card-prompt-arch">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Prompt Architecture</span>
                    </div>
                    <p className={`text-3xl font-bold ${promptArchScore !== null ? getScoreColor(promptArchScore) : 'text-muted-foreground'}`}>
                      {promptArchScore !== null ? `${promptArchScore}%` : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {promptArchData ? 'Completed' : 'Not taken'}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg text-center" data-testid="score-card-aiq">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AIQ (Ethics)</span>
                    </div>
                    <p className={`text-3xl font-bold ${aiqScore !== null ? getScoreColor(aiqScore) : 'text-muted-foreground'}`}>
                      {aiqScore !== null ? `${aiqScore}%` : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {aiqData ? 'Completed' : 'Not taken'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                    <SkillsLegend compact />
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
                    <SkillsLegend compact />
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
            </>
          )}

          {/* Enterprise Services Section */}
          <Card className="mb-8" data-testid="section-additional-services">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-bold" data-testid="heading-enterprise-services">Enterprise Services</h3>
              </div>
              <p className="text-muted-foreground mb-6" data-testid="text-services-intro">
                Enhance your hiring process with our advanced enterprise solutions:
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-ecosystem">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-ecosystem">The Ecosystem Index</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-ecosystem">
                    Comprehensive team capability diagnostic that maps skills distribution and identifies gaps
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-cohort">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-cohort">Cohort Benchmarking</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-cohort">
                    Compare your team's performance against industry benchmarks and peer organizations
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-multi-role">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-multi-role">Multi-Candidate Role Fit</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-multi-role">
                    Compare multiple candidates against a specific role with ranked recommendations
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-consulting">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-consulting">Strategic Consulting</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-consulting">
                    Expert-led sessions to interpret results and develop actionable hiring strategies
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-integration">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-integration">ATS Integration</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-integration">
                    Seamless integration with your existing applicant tracking and HR systems
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
                      onClick={(e) => e.stopPropagation()}
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

          {/* How to Read This Comparison */}
          <Card className="mb-8" data-testid="section-how-to-read-compare">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold" data-testid="heading-how-to-read-compare">How to Read This Comparison</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4" data-testid="text-guide-intro-compare">
                A guide to interpreting multi-candidate comparison data
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <p className="font-medium text-sm">Radar Overlay</p>
                    <p className="text-xs text-muted-foreground">
                      Visual comparison across all skills - larger coverage indicates stronger overall performance
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="font-medium text-sm">Score Bands</p>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-1">
                      <Badge className="bg-green-500 text-white text-[10px] px-1 py-0">75%+</Badge> <span>Strong,</span>
                      <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0">50-74%</Badge> <span>Developing,</span>
                      <Badge className="bg-red-500 text-white text-[10px] px-1 py-0">&lt;50%</Badge> <span>Attention</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="font-medium text-sm">Color Coding</p>
                    <p className="text-xs text-muted-foreground">
                      Each candidate is represented by a distinct color for easy visual tracking across charts
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <p className="font-medium text-sm">Decision Support</p>
                    <p className="text-xs text-muted-foreground">
                      Use overall scores combined with skill-specific analysis for comprehensive candidate evaluation
                    </p>
                  </div>
                </div>
              </div>
            </div>
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

              {/* All 4 Assessments Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Comparison</CardTitle>
                  <CardDescription>All 4 assessments across selected candidates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-medium">Assessment</th>
                          {selectedCandidateDataList.map((candidate, idx) => (
                            <th key={idx} className="text-center py-3 px-2 font-medium" style={{ color: CHART_COLORS[idx] }}>
                              {getCandidateName(candidate)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-3 px-2 flex items-center gap-2">
                            <Award className="h-4 w-4 text-primary" />
                            FIT Assessment
                          </td>
                          {selectedCandidateDataList.map((_, idx) => {
                            const fitResult = comparison.fitAssessments?.[idx];
                            const score = fitResult ? Math.round(Object.values(fitResult.scores as Record<string, number>).reduce((a, b) => a + b, 0) / Object.keys(fitResult.scores).length) : null;
                            return (
                              <td key={idx} className="text-center py-3 px-2">
                                <span className={`font-bold ${score !== null ? getScoreColor(score) : 'text-muted-foreground'}`}>
                                  {score !== null ? `${score}%` : 'N/A'}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-2 flex items-center gap-2">
                            <Brain className="h-4 w-4 text-primary" />
                            AI Readiness
                          </td>
                          {selectedCandidateDataList.map((_, idx) => {
                            const aiResult = comparison.aiReadinessAssessments?.[idx];
                            const score = aiResult ? Math.round(Object.values(aiResult.scores as Record<string, number>).reduce((a, b) => a + b, 0) / Object.keys(aiResult.scores).length) : null;
                            return (
                              <td key={idx} className="text-center py-3 px-2">
                                <span className={`font-bold ${score !== null ? getScoreColor(score) : 'text-muted-foreground'}`}>
                                  {score !== null ? `${score}%` : 'N/A'}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-2 flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            Prompt Architecture
                          </td>
                          {selectedCandidateDataList.map((_, idx) => {
                            const paResult = comparison.promptArchitectureAssessments?.[idx];
                            const score = paResult?.totalScore ?? null;
                            return (
                              <td key={idx} className="text-center py-3 px-2">
                                <span className={`font-bold ${score !== null ? getScoreColor(score) : 'text-muted-foreground'}`}>
                                  {score !== null ? `${score}%` : 'N/A'}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                        <tr>
                          <td className="py-3 px-2 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            AIQ (Ethics)
                          </td>
                          {selectedCandidateDataList.map((_, idx) => {
                            const aiqResult = comparison.aiqAssessments?.[idx];
                            const score = aiqResult?.totalScore ?? null;
                            return (
                              <td key={idx} className="text-center py-3 px-2">
                                <span className={`font-bold ${score !== null ? getScoreColor(score) : 'text-muted-foreground'}`}>
                                  {score !== null ? `${score}%` : 'N/A'}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Average Scores */}
              <Card>
                <CardHeader>
                  <CardTitle>Overall Average</CardTitle>
                  <CardDescription>Average across skill-based assessments (FIT + AI Readiness)</CardDescription>
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

          {/* Enterprise Services Section */}
          <Card className="mb-8" data-testid="section-additional-services-compare">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-bold" data-testid="heading-enterprise-services-compare">Enterprise Services</h3>
              </div>
              <p className="text-muted-foreground mb-6" data-testid="text-services-intro-compare">
                Enhance your hiring process with our advanced enterprise solutions:
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-ecosystem-compare">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-ecosystem-compare">The Ecosystem Index</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-ecosystem-compare">
                    Comprehensive team capability diagnostic that maps skills distribution and identifies gaps
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-cohort-compare">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-cohort-compare">Cohort Benchmarking</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-cohort-compare">
                    Compare your team's performance against industry benchmarks and peer organizations
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-multi-role-compare">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-multi-role-compare">Multi-Candidate Role Fit</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-multi-role-compare">
                    Compare multiple candidates against a specific role with ranked recommendations
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-consulting-compare">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-consulting-compare">Strategic Consulting</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-consulting-compare">
                    Expert-led sessions to interpret results and develop actionable hiring strategies
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-integration-compare">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-integration-compare">ATS Integration</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-integration-compare">
                    Seamless integration with your existing applicant tracking and HR systems
                  </p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-primary/5 rounded-lg flex items-center gap-3" data-testid="container-contact-email-compare">
                <Mail className="h-5 w-5 text-primary" />
                <p className="text-sm" data-testid="text-contact-email-compare">
                  Contact us at <a href="mailto:hello@humanmetrix.co.uk" className="font-semibold text-primary underline" data-testid="link-contact-email-compare">hello@humanmetrix.co.uk</a> to discuss your enterprise requirements.
                </p>
              </div>
            </div>
          </Card>
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

          {/* How to Read This Role Fit Analysis */}
          <Card className="mb-8" data-testid="section-how-to-read-rolefit">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold" data-testid="heading-how-to-read-rolefit">How to Read This Role Fit Analysis</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4" data-testid="text-guide-intro-rolefit">
                A guide to interpreting candidate-role alignment data
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <p className="font-medium text-sm">Overall Fit Score</p>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-1">
                      <Badge className="bg-green-500 text-white text-[10px] px-1 py-0">75%+</Badge> <span>Strong,</span>
                      <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0">50-74%</Badge> <span>Developing,</span>
                      <Badge className="bg-red-500 text-white text-[10px] px-1 py-0">&lt;50%</Badge> <span>Needs attention</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="font-medium text-sm">Critical Skills</p>
                    <p className="text-xs text-muted-foreground">
                      Skills marked with <Badge className="bg-blue-600 text-white text-[10px] px-1 py-0 mx-1">C</Badge> are critical for role success
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="font-medium text-sm">Alignment Status</p>
                    <p className="text-xs text-muted-foreground">
                      "Meets" indicates candidate exceeds requirements; "Gap" indicates development needed
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <p className="font-medium text-sm">Data Coverage</p>
                    <p className="text-xs text-muted-foreground">
                      Higher coverage percentage means more comprehensive assessment data is available
                    </p>
                  </div>
                </div>
              </div>
            </div>
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

              {/* All 4 Assessments Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Summary</CardTitle>
                  <CardDescription>All 4 assessment types for this candidate</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 border rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Award className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">FIT Assessment</span>
                      </div>
                      <p className={`text-2xl font-bold ${alignment.fitSkillAlignments ? getScoreColor(Math.round(alignment.fitSkillAlignments.filter(a => a.candidateScore !== null).reduce((sum, a) => sum + (a.candidateScore || 0), 0) / (alignment.fitSkillAlignments.filter(a => a.candidateScore !== null).length || 1))) : 'text-muted-foreground'}`}>
                        {alignment.fitSkillAlignments && alignment.fitSkillAlignments.some(a => a.candidateScore !== null)
                          ? `${Math.round(alignment.fitSkillAlignments.filter(a => a.candidateScore !== null).reduce((sum, a) => sum + (a.candidateScore || 0), 0) / (alignment.fitSkillAlignments.filter(a => a.candidateScore !== null).length || 1))}%`
                          : 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alignment.fitSkillAlignments ? 'Completed' : 'Not taken'}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">AI Readiness</span>
                      </div>
                      <p className={`text-2xl font-bold ${alignment.aiReadinessSkillAlignments ? getScoreColor(Math.round(alignment.aiReadinessSkillAlignments.filter(a => a.candidateScore !== null).reduce((sum, a) => sum + (a.candidateScore || 0), 0) / (alignment.aiReadinessSkillAlignments.filter(a => a.candidateScore !== null).length || 1))) : 'text-muted-foreground'}`}>
                        {alignment.aiReadinessSkillAlignments && alignment.aiReadinessSkillAlignments.some(a => a.candidateScore !== null)
                          ? `${Math.round(alignment.aiReadinessSkillAlignments.filter(a => a.candidateScore !== null).reduce((sum, a) => sum + (a.candidateScore || 0), 0) / (alignment.aiReadinessSkillAlignments.filter(a => a.candidateScore !== null).length || 1))}%`
                          : 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alignment.aiReadinessSkillAlignments ? 'Completed' : 'Not taken'}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Prompt Arch.</span>
                      </div>
                      <p className={`text-2xl font-bold ${alignment.promptArchitectureScore !== null && alignment.promptArchitectureScore !== undefined ? getScoreColor(alignment.promptArchitectureScore) : 'text-muted-foreground'}`}>
                        {alignment.promptArchitectureScore !== null && alignment.promptArchitectureScore !== undefined ? `${alignment.promptArchitectureScore}%` : 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alignment.promptArchitectureScore !== null && alignment.promptArchitectureScore !== undefined ? 'Completed' : 'Not taken'}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">AIQ (Ethics)</span>
                      </div>
                      <p className={`text-2xl font-bold ${alignment.aiqScore !== null && alignment.aiqScore !== undefined ? getScoreColor(alignment.aiqScore) : 'text-muted-foreground'}`}>
                        {alignment.aiqScore !== null && alignment.aiqScore !== undefined ? `${alignment.aiqScore}%` : 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alignment.aiqScore !== null && alignment.aiqScore !== undefined ? 'Completed' : 'Not taken'}
                      </p>
                    </div>
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

          {/* Enterprise Services Section */}
          <Card className="mb-8" data-testid="section-additional-services-rolefit">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-bold" data-testid="heading-enterprise-services-rolefit">Enterprise Services</h3>
              </div>
              <p className="text-muted-foreground mb-6" data-testid="text-services-intro-rolefit">
                Enhance your hiring process with our advanced enterprise solutions:
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-ecosystem-rolefit">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-ecosystem-rolefit">The Ecosystem Index</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-ecosystem-rolefit">
                    Comprehensive team capability diagnostic that maps skills distribution and identifies gaps
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-cohort-rolefit">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-cohort-rolefit">Cohort Benchmarking</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-cohort-rolefit">
                    Compare your team's performance against industry benchmarks and peer organizations
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-multi-role-rolefit">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-multi-role-rolefit">Multi-Candidate Role Fit</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-multi-role-rolefit">
                    Compare multiple candidates against a specific role with ranked recommendations
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-consulting-rolefit">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-consulting-rolefit">Strategic Consulting</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-consulting-rolefit">
                    Expert-led sessions to interpret results and develop actionable hiring strategies
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-integration-rolefit">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-service-integration-rolefit">ATS Integration</h4>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-service-integration-rolefit">
                    Seamless integration with your existing applicant tracking and HR systems
                  </p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-primary/5 rounded-lg flex items-center gap-3" data-testid="container-contact-email-rolefit">
                <Mail className="h-5 w-5 text-primary" />
                <p className="text-sm" data-testid="text-contact-email-rolefit">
                  Contact us at <a href="mailto:hello@humanmetrix.co.uk" className="font-semibold text-primary underline" data-testid="link-contact-email-rolefit">hello@humanmetrix.co.uk</a> to discuss your enterprise requirements.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
