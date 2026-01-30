import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users, Target, TrendingUp, Trophy, AlertTriangle, Download, CheckCircle2, AlertCircle, FileText, BarChart2, Sparkles, MessageSquare, Clock, ShieldAlert, DollarSign, ArrowUp, Brain, Send, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "wouter";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import html2canvas from "html2canvas";
import { exportMultiCandidateComparisonPDF } from "@/lib/pdfExport";
import SkillsLegend from "@/components/SkillsLegend";
import { MultiCandidateCriticalSkillsAnalysis, type CriticalSkillMultiData } from "@/components/shared/MultiCandidateCriticalSkillsAnalysis";

// Mapping from short/legacy skill names to canonical names used in candidate data
const SKILL_NAME_MAPPING: Record<string, string> = {
  'AI Literacy': 'AI Literacy & Prompt Engineering',
  'Collaboration': 'Collaboration & Communication',
  'Domain Fluency': 'Data Fluency',
  'Responsible AI': 'Responsible AI & Ethical Awareness',
  'Technical Fluency': 'Technical Fundamentals',
  'Critical Thinking': 'Critical Thinking & Problem-Solving',
  'Adaptive Learning': 'Adaptability & Continuous Learning',
  'Creative Innovation': 'Creativity & Innovation',
};

// Normalize skill name to canonical form for matching
const normalizeSkillName = (skillName: string): string => {
  return SKILL_NAME_MAPPING[skillName] || skillName;
};

// Find skill in candidate's scores, trying both original and normalized names
const findSkillInScores = (
  skillScores: Array<{ skillName: string; score: number | null; dataAvailable?: boolean; [key: string]: any }>,
  targetSkillName: string
): typeof skillScores[0] | undefined => {
  // Try exact match first
  let skill = skillScores.find(s => s.skillName === targetSkillName);
  if (skill) return skill;
  
  // Try normalized name
  const normalizedTarget = normalizeSkillName(targetSkillName);
  skill = skillScores.find(s => s.skillName === normalizedTarget);
  if (skill) return skill;
  
  // Try reverse lookup (if candidate has short name but we're looking for full name)
  const reverseMapping = Object.entries(SKILL_NAME_MAPPING).find(([_, full]) => full === targetSkillName);
  if (reverseMapping) {
    skill = skillScores.find(s => s.skillName === reverseMapping[0]);
    if (skill) return skill;
  }
  
  return undefined;
};

type CandidateEntry = {
  userId: string;
  userName: string;
  email: string;
  overallFit: number | null;
  rank: number | null;
  fitTier: 'strong' | 'moderate' | 'development-needed' | 'insufficient-data';
  skillScores: Array<{
    skillName: string;
    score: number | null;
    requiredScore: number;
    gap: number | null;
    alignment: string;
    criticality: 'critical' | 'important' | 'nice-to-have';
    category: 'fit' | 'ai_readiness';
    dataAvailable?: boolean;
  }>;
  strengths: string[];
  gaps: string[];
  riskFlags: string[];
  dataCoverage?: {
    percentage: number;
    assessedSkillCount: number;
    totalRequiredSkills: number;
    missingAssessments: string[];
    hasSufficientData?: boolean;
  };
  missingAssessments?: string[];
  hasSufficientData?: boolean;
};

type SkillComparison = {
  skillName: string;
  winner: string;
  winnerScore: number;
  loserScore: number;
  margin: number;
  criticality: string;
};

type MultiCandidateComparison = {
  id: string;
  jobRoleId: string;
  candidateEntries: CandidateEntry[];
  roleSnapshot: {
    roleId: string;
    roleName: string;
    requiredSkillScores: any;
  };
  summaryInsights: {
    topPerformer: { userId: string; userName: string; overallFit: number };
    averageFit: number;
    fitDistribution: { strong: number; moderate: number; developmentNeeded: number };
    commonStrengths: string[];
    commonGaps: string[];
    keyDifferentiators: string[];
    recommendation?: {
      recommendedCandidate: string;
      recommendedUserId: string;
      fitScore: number;
      fitTier: string;
      reasons: string[];
      criticalSkillAdvantages: string[];
    };
    runnerUp?: {
      name: string;
      userId: string;
      fitScore: number;
      fitTier: string;
      consideration: string[];
      advantagesOverTop: string[];
    } | null;
    skillComparison?: SkillComparison[];
    // Advanced analytics
    skillDominance?: Array<{
      candidateName: string;
      candidateId: string;
      winsCount: number;
      totalSkills: number;
      dominancePercent: number;
    }>;
    consistencyScores?: Array<{
      candidateName: string;
      candidateId: string;
      consistencyScore: number;
      interpretation: string;
    }>;
    criticalGapRatios?: Array<{
      candidateName: string;
      candidateId: string;
      criticalGaps: number;
      totalCritical: number;
      gapRatio: number;
      riskLevel: string;
    }>;
    largestDifferential?: {
      skillName: string;
      topCandidate: string;
      topScore: number;
      bottomCandidate: string;
      bottomScore: number;
      spread: number;
      criticality: string;
    } | null;
  };
  createdAt: string;
  aiInsights?: string | null;
};

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

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

const getCoverageBadge = (coverage?: { percentage: number }) => {
  if (!coverage) return null;
  const pct = coverage.percentage;
  if (pct >= 100) {
    return <Badge className="bg-green-100 text-green-800">Full Coverage</Badge>;
  } else if (pct >= 70) {
    return <Badge className="bg-blue-100 text-blue-800">{pct}% Coverage</Badge>;
  } else if (pct >= 40) {
    return <Badge className="bg-amber-100 text-amber-800">{pct}% Coverage</Badge>;
  } else {
    return <Badge className="bg-red-100 text-red-800">Low Coverage ({pct}%)</Badge>;
  }
};

type InsufficientDataError = {
  message: string;
  insufficientDataCandidates?: Array<{
    userName: string;
    email: string;
    dataCoverage: number;
    missingAssessments: string[];
  }>;
};

export default function PartnerMultiCandidateRoleFitTab() {
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [insufficientDataDialogOpen, setInsufficientDataDialogOpen] = useState(false);
  const [insufficientDataError, setInsufficientDataError] = useState<InsufficientDataError | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: candidates } = useQuery<any[]>({
    queryKey: ['/api/partner/me/candidates'],
  });

  const { data: roles } = useQuery<any[]>({
    queryKey: ['/api/partner/me/roles'],
  });

  const selectedRoleData = roles?.find((r) => r.id === selectedRole);

  const compareMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/partner/me/multi-candidate-comparison', {
        jobRoleId: selectedRole,
        candidateIds: selectedCandidates,
      }, { timeoutMs: 120000 });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to generate comparison" }));
        // If the error contains insufficient data candidates, throw with that data
        const error = new Error(errorData.message || "Failed to generate comparison") as Error & { 
          insufficientDataCandidates?: InsufficientDataError['insufficientDataCandidates'] 
        };
        if (errorData.insufficientDataCandidates) {
          (error as any).insufficientDataCandidates = errorData.insufficientDataCandidates;
        }
        throw error;
      }
      
      return res.json();
    },
    onSuccess: (data: MultiCandidateComparison) => {
      queryClient.setQueryData(['multi-candidate-comparison', selectedRole, selectedCandidates.join(',')], data);
      toast({ title: "Comparison generated successfully" });
    },
    onError: (error: Error & { insufficientDataCandidates?: InsufficientDataError['insufficientDataCandidates'] }) => {
      // Check if this is an insufficient data error that should show a dialog
      if (error.insufficientDataCandidates && error.insufficientDataCandidates.length > 0) {
        setInsufficientDataError({
          message: error.message,
          insufficientDataCandidates: error.insufficientDataCandidates,
        });
        setInsufficientDataDialogOpen(true);
      } else {
        // Regular error - show toast
        toast({
          title: "Comparison failed",
          description: error.message || "Failed to generate comparison. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const comparison = compareMutation.data as MultiCandidateComparison | undefined;

  const toggleCandidate = (userId: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : prev.length < 10
        ? [...prev, userId]
        : prev
    );
  };

  const generateRequiredScoresMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const res = await apiRequest('POST', `/api/partner/me/roles/${roleId}/generate-required-scores`, undefined, { timeoutMs: 90000 });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner/me/roles'] });
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

  // AI insights now come directly from comparison response (server-side generation)
  // No separate mutation needed - insights are included in the main comparison API response

  const canCompare = selectedCandidates.length >= 2 && selectedRole && selectedRoleData?.requiredSkillScores;

  const prepareBarChartData = () => {
    if (!comparison) return [];
    // Only include candidates with valid data in the chart
    const validEntries = comparison.candidateEntries
      .filter((entry) => entry.overallFit != null && entry.fitTier !== 'insufficient-data')
      .sort((a, b) => (b.overallFit || 0) - (a.overallFit || 0));
    
    return validEntries.map((entry, index) => ({
      name: entry.userName.length > 15 ? entry.userName.slice(0, 15) + '...' : entry.userName,
      fullName: entry.userName,
      'Overall Fit': entry.overallFit as number,
      tier: entry.fitTier,
      rank: index + 1,
    }));
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { label: '1st', color: 'bg-amber-500 text-white' };
    if (rank === 2) return { label: '2nd', color: 'bg-gray-400 text-white' };
    if (rank === 3) return { label: '3rd', color: 'bg-amber-700 text-white' };
    return { label: `${rank}th`, color: 'bg-muted text-muted-foreground' };
  };

  const handleExportPDF = async () => {
    if (!comparison) return;
    
    setIsExporting(true);
    toast({
      title: "Generating PDF...",
      description: "Capturing charts and preparing your report...",
    });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      await document.fonts.ready;
      
      let barChartImage: string | null = null;
      if (chartRef.current) {
        try {
          const canvas = await html2canvas(chartRef.current, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false,
          });
          barChartImage = canvas.toDataURL('image/png');
        } catch (err) {
          console.error('Error capturing bar chart:', err);
        }
      }
      
      await exportMultiCandidateComparisonPDF({
        roleSnapshot: comparison.roleSnapshot,
        candidateEntries: comparison.candidateEntries,
        summaryInsights: comparison.summaryInsights,
        barChartImage,
      });
      
      toast({
        title: "PDF exported successfully",
        description: "Your multi-candidate comparison report has been downloaded.",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const prepareSkillHeatmapData = () => {
    if (!comparison || comparison.candidateEntries.length === 0) return [];
    
    const allSkills = new Set<string>();
    comparison.candidateEntries.forEach(entry => {
      entry.skillScores.forEach(skill => allSkills.add(skill.skillName));
    });

    return Array.from(allSkills).map(skillName => {
      const row: any = { skillName };
      comparison.candidateEntries.forEach((entry, idx) => {
        const skill = entry.skillScores.find(s => s.skillName === skillName);
        row[`candidate${idx}`] = skill?.score ?? 0;
        row[`required${idx}`] = skill?.requiredScore ?? 0;
      });
      return row;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Multi-Candidate Role Fit Comparison
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Compare 2-10 candidates against a single job role to identify the best fit
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Job Role</label>
              <Select value={selectedRole} onValueChange={(value) => {
                setSelectedRole(value);
                compareMutation.reset();
              }}>
                <SelectTrigger data-testid="select-multi-role">
                  <SelectValue placeholder="Select a role to compare candidates against" />
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

            {selectedRole && selectedRoleData && !selectedRoleData.requiredSkillScores && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">
                      Required Skill Scores Not Generated
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      This role needs required skill scores before you can compare candidates.
                    </p>
                  </div>
                  <Button
                    onClick={() => generateRequiredScoresMutation.mutate(selectedRole)}
                    disabled={generateRequiredScoresMutation.isPending}
                    size="sm"
                    data-testid="button-generate-multi-required-scores"
                  >
                    {generateRequiredScoresMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        Generate Required Scores
                        <Badge variant="secondary" className="ml-2 text-[10px] font-normal">1 credit</Badge>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {selectedRole && selectedRoleData?.requiredSkillScores && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Select Candidates ({selectedCandidates.length}/10 selected)
                </label>
                <p className="text-xs text-muted-foreground">
                  Select 2-10 candidates with completed assessments to compare
                </p>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto border rounded-md p-3">
                  {candidates?.map((candidate: any) => (
                    <label
                      key={candidate.user.id}
                      className="flex items-center gap-2 p-2 rounded-md hover-elevate cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedCandidates.includes(candidate.user.id)}
                        onCheckedChange={() => toggleCandidate(candidate.user.id)}
                        disabled={!selectedCandidates.includes(candidate.user.id) && selectedCandidates.length >= 10}
                        data-testid={`checkbox-candidate-${candidate.user.id}`}
                      />
                      <span className="text-sm truncate">
                        {candidate.user.firstName || candidate.user.lastName
                          ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
                          : candidate.user.email}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => compareMutation.mutate()}
              disabled={!canCompare || compareMutation.isPending}
              className="w-full"
              data-testid="button-compare-candidates"
            >
              {compareMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing {selectedCandidates.length} Candidates...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-4 w-4" />
                  Compare {selectedCandidates.length} Candidates Against Role
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {comparison && (
        <>
          {/* How to Read This Report Section - Matching Individual Tab Style */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                How to Read This Report
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                A step-by-step guide to understanding this multi-candidate comparison for the {comparison.roleSnapshot?.roleName} role
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Step 1 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <p className="font-medium text-sm">Role Alignment Tiers</p>
                    <p className="text-xs text-muted-foreground">
                      <Badge className="bg-green-500 text-white mr-1 text-[10px] px-1 py-0">75%+</Badge> High alignment, 
                      <Badge className="bg-amber-500 text-white mx-1 text-[10px] px-1 py-0">50-74%</Badge> Moderate, 
                      <Badge className="bg-red-500 text-white mx-1 text-[10px] px-1 py-0">&lt;50%</Badge> Development needed
                    </p>
                  </div>
                </div>
                {/* Step 2 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="font-medium text-sm">Skill Criticality</p>
                    <p className="text-xs text-muted-foreground">
                      Skills are prioritised based on how essential they are for success in this role. Focus on critical skills first when evaluating candidates.
                    </p>
                  </div>
                </div>
                {/* Step 3 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="font-medium text-sm">Understanding Trait Scores</p>
                    <p className="text-xs text-muted-foreground">FIT and AI Readiness are <strong>trait-based</strong>. Higher scores indicate stronger trait presence - whether beneficial depends on role requirements.</p>
                  </div>
                </div>
                {/* Step 4 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <p className="font-medium text-sm">Gap Analysis</p>
                    <p className="text-xs text-muted-foreground">Gaps show difference between candidate score and role requirement, helping identify where development may be needed.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hiring Recommendation - Most Important Section */}
          {comparison.summaryInsights.recommendation && (
            <Card className="border-2 border-green-500">
              <CardHeader className="bg-green-50 dark:bg-green-950/30">
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Trophy className="h-6 w-6" />
                  Hiring Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Recommended Candidate */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl font-bold">
                        1
                      </div>
                      <div>
                        <div className="text-xl font-bold">{comparison.summaryInsights.recommendation.recommendedCandidate}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-2xl font-bold text-green-600">{comparison.summaryInsights.recommendation.fitScore}%</span>
                          {getFitTierBadge(comparison.summaryInsights.recommendation.fitTier)}
                        </div>
                      </div>
                    </div>
                    
                    {(comparison.summaryInsights.recommendation.reasons?.length || 0) > 0 && (
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Why This Candidate?</h4>
                        <ul className="space-y-2">
                          {comparison.summaryInsights.recommendation.reasons.map((reason, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(comparison.summaryInsights.recommendation.criticalSkillAdvantages?.length || 0) > 0 && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">Critical Skill Advantages</h4>
                        <div className="flex flex-wrap gap-2">
                          {comparison.summaryInsights.recommendation.criticalSkillAdvantages.map((adv, i) => (
                            <Badge key={i} className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              {adv}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Runner-Up Alternative */}
                  {comparison.summaryInsights.runnerUp && (
                    <div className="space-y-4 border-l-2 border-gray-200 dark:border-gray-700 pl-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white text-lg font-bold">
                          2
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Runner-Up Alternative</div>
                          <div className="text-lg font-bold">{comparison.summaryInsights.runnerUp.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-semibold">{comparison.summaryInsights.runnerUp.fitScore}%</span>
                            {getFitTierBadge(comparison.summaryInsights.runnerUp.fitTier)}
                          </div>
                        </div>
                      </div>

                      {(comparison.summaryInsights.runnerUp.consideration?.length || 0) > 0 && (
                        <div className="p-3 bg-muted rounded-lg">
                          <h4 className="font-medium text-sm mb-2">Why Consider as Alternative?</h4>
                          <ul className="space-y-1">
                            {comparison.summaryInsights.runnerUp.consideration.map((c, i) => (
                              <li key={i} className="text-sm text-muted-foreground">{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {(comparison.summaryInsights.runnerUp.advantagesOverTop?.length || 0) > 0 && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                          <h4 className="font-medium text-sm text-amber-700 dark:text-amber-400 mb-2">
                            Where Runner-Up Outperforms
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {comparison.summaryInsights.runnerUp.advantagesOverTop.map((adv, i) => (
                              <Badge key={i} variant="outline" className="text-amber-700 border-amber-300">
                                {adv}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Critical Skills Dashboard - Most Important for Hiring Decision */}
          <Card className="border-2 border-red-200 dark:border-red-800">
            <CardHeader className="bg-red-50 dark:bg-red-950/30">
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-6 w-6" />
                Critical Skills Dashboard
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Must-have skills for this role. Candidates must meet thresholds (60+) on these skills to be considered.
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              {(() => {
                // Extract critical skills from role snapshot (authoritative source)
                const roleSkills = comparison.roleSnapshot.requiredSkillScores;
                const skillCriticality = roleSkills?.skillCriticality || {};
                
                // Build critical skill list with required scores from role definition
                const criticalSkillsWithRequirements: Array<{ skillName: string; requiredScore: number; category: 'fit' | 'ai_readiness' }> = [];
                
                // Check FIT skills
                if (roleSkills?.fitSkills) {
                  Object.entries(roleSkills.fitSkills).forEach(([skillName, requiredScore]) => {
                    if (skillCriticality[skillName] === 'critical') {
                      criticalSkillsWithRequirements.push({
                        skillName,
                        requiredScore: requiredScore as number,
                        category: 'fit'
                      });
                    }
                  });
                }
                
                // Check AI Readiness skills
                if (roleSkills?.aiReadinessSkills) {
                  Object.entries(roleSkills.aiReadinessSkills).forEach(([skillName, requiredScore]) => {
                    if (skillCriticality[skillName] === 'critical') {
                      criticalSkillsWithRequirements.push({
                        skillName,
                        requiredScore: requiredScore as number,
                        category: 'ai_readiness'
                      });
                    }
                  });
                }
                
                if (criticalSkillsWithRequirements.length === 0) {
                  return (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No critical skills defined for this role.</p>
                    </div>
                  );
                }
                
                // Show ALL candidates - including those with insufficient data
                const allCandidates = comparison.candidateEntries;
                // Sort: ranked candidates first (by rank), then insufficient data
                const sortedCandidates = [...allCandidates].sort((a, b) => {
                  // Use hasSufficientData to determine if candidate should be at end
                  const aHasData = a.hasSufficientData !== false && a.dataCoverage?.hasSufficientData !== false && a.overallFit != null;
                  const bHasData = b.hasSufficientData !== false && b.dataCoverage?.hasSufficientData !== false && b.overallFit != null;
                  
                  if (!aHasData && !bHasData) return 0;
                  if (!aHasData) return 1;
                  if (!bHasData) return -1;
                  
                  // Both have data, sort by rank
                  if (a.rank === null && b.rank === null) return 0;
                  if (a.rank === null) return 1;
                  if (b.rank === null) return -1;
                  return a.rank - b.rank;
                });
                
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold bg-muted/50">Critical Skill</th>
                          <th className="text-center p-3 font-semibold bg-muted/50">Required</th>
                          {sortedCandidates.map((candidate, idx) => {
                            // Use hasSufficientData and dataCoverage for more accurate assessment
                            const hasInsufficientData = candidate.hasSufficientData === false || 
                              candidate.dataCoverage?.hasSufficientData === false || 
                              candidate.fitTier === 'insufficient-data' || 
                              candidate.overallFit == null;
                            return (
                              <th key={candidate.userId} className={`text-center p-3 font-semibold ${idx === 0 && !hasInsufficientData ? 'bg-green-50 dark:bg-green-950/30' : hasInsufficientData ? 'bg-gray-100 dark:bg-gray-800' : 'bg-muted/50'}`}>
                                <div className="flex flex-col items-center gap-1">
                                  <span className="truncate max-w-[100px]">{candidate.userName.split(' ')[0]}</span>
                                  {idx === 0 && !hasInsufficientData && <Badge className="bg-green-600 text-white text-xs">Top</Badge>}
                                  {hasInsufficientData && <Badge variant="outline" className="text-xs text-gray-500">Incomplete</Badge>}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {criticalSkillsWithRequirements.map((criticalSkill, skillIdx) => {
                          return (
                            <tr key={criticalSkill.skillName} className={skillIdx % 2 === 0 ? 'bg-muted/20' : ''}>
                              <td className="p-3 font-medium">{criticalSkill.skillName}</td>
                              <td className="text-center p-3">
                                <Badge variant="outline" className="text-red-600 border-red-300">{criticalSkill.requiredScore}+</Badge>
                              </td>
                              {sortedCandidates.map((candidate, idx) => {
                                // Use hasSufficientData and dataCoverage for more accurate assessment
                                const hasInsufficientData = candidate.hasSufficientData === false || 
                                  candidate.dataCoverage?.hasSufficientData === false || 
                                  candidate.fitTier === 'insufficient-data' || 
                                  candidate.overallFit == null;
                                const skill = findSkillInScores(candidate.skillScores, criticalSkill.skillName);
                                const hasData = skill?.dataAvailable !== false && skill?.score != null;
                                const score = skill?.score || 0;
                                const meetsThreshold = hasData && score >= 60;
                                const meetsRequired = hasData && score >= criticalSkill.requiredScore;
                                
                                return (
                                  <td key={candidate.userId} className={`text-center p-3 ${idx === 0 && !hasInsufficientData ? 'bg-green-50/50 dark:bg-green-950/20' : hasInsufficientData ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                                    {!hasData ? (
                                      <span className="text-muted-foreground italic">N/A</span>
                                    ) : (
                                      <div className="flex flex-col items-center gap-1">
                                        <span className={`font-bold text-lg ${meetsRequired ? 'text-green-600' : meetsThreshold ? 'text-amber-600' : 'text-red-600'}`}>
                                          {score}
                                        </span>
                                        {meetsRequired ? (
                                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        ) : meetsThreshold ? (
                                          <AlertCircle className="h-5 w-5 text-amber-500" />
                                        ) : (
                                          <AlertTriangle className="h-5 w-5 text-red-500" />
                                        )}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-semibold">
                          <td className="p-3">Critical Skills Met</td>
                          <td className="text-center p-3">—</td>
                          {sortedCandidates.map((candidate, idx) => {
                            // Use hasSufficientData and dataCoverage for more accurate assessment
                            const hasInsufficientData = candidate.hasSufficientData === false || 
                              candidate.dataCoverage?.hasSufficientData === false || 
                              candidate.fitTier === 'insufficient-data' || 
                              candidate.overallFit == null;
                            const criticalSkillsMet = criticalSkillsWithRequirements.filter(cs => {
                              const skill = findSkillInScores(candidate.skillScores, cs.skillName);
                              return skill?.dataAvailable !== false && skill?.score != null && (skill.score || 0) >= cs.requiredScore;
                            }).length;
                            const totalCritical = criticalSkillsWithRequirements.length;
                            const assessedCritical = criticalSkillsWithRequirements.filter(cs => {
                              const skill = findSkillInScores(candidate.skillScores, cs.skillName);
                              return skill?.dataAvailable !== false && skill?.score != null;
                            }).length;
                            const allMet = criticalSkillsMet === totalCritical && totalCritical > 0;
                            
                            return (
                              <td key={candidate.userId} className={`text-center p-3 ${idx === 0 && !hasInsufficientData ? 'bg-green-50/50 dark:bg-green-950/20' : hasInsufficientData ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                                {assessedCritical === 0 ? (
                                  <span className="text-muted-foreground italic">No data</span>
                                ) : (
                                  <>
                                    <span className={`text-lg font-bold ${allMet ? 'text-green-600' : 'text-red-600'}`}>
                                      {criticalSkillsMet}/{assessedCritical}
                                    </span>
                                    {assessedCritical < totalCritical && (
                                      <span className="text-xs text-muted-foreground block">({totalCritical - assessedCritical} not assessed)</span>
                                    )}
                                    {allMet && assessedCritical === totalCritical && <Badge className="ml-2 bg-green-600 text-white">All Met</Badge>}
                                  </>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })()}
              
              {/* Critical Skills Legend */}
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Meets or exceeds required score</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span>Above 60 but below required</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span>Below minimum threshold (60)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Critical Skills Deep Dive - AI-Identified Analysis */}
          {(() => {
            const roleSkills = comparison.roleSnapshot.requiredSkillScores;
            const skillCriticality = roleSkills?.skillCriticality || {};
            
            // Build critical skills data for the new component
            const criticalSkillsData: CriticalSkillMultiData[] = [];
            
            // Process FIT skills
            if (roleSkills?.fitSkills) {
              Object.entries(roleSkills.fitSkills).forEach(([skillName, requiredScore]) => {
                if (skillCriticality[skillName] === 'critical') {
                  const candidates = comparison.candidateEntries.map(candidate => {
                    const skill = findSkillInScores(candidate.skillScores, skillName);
                    const hasData = skill?.dataAvailable !== false && skill?.score != null;
                    return {
                      userId: candidate.userId,
                      userName: candidate.userName,
                      score: hasData ? skill.score : null,
                      dataAvailable: hasData,
                      gap: hasData && skill.score != null ? skill.score - (requiredScore as number) : null,
                      meetsRequirement: hasData && (skill?.score || 0) >= (requiredScore as number),
                    };
                  });
                  criticalSkillsData.push({
                    skillName,
                    requiredScore: requiredScore as number,
                    criticality: 'critical',
                    category: 'fit',
                    candidates,
                  });
                }
              });
            }
            
            // Process AI Readiness skills
            if (roleSkills?.aiReadinessSkills) {
              Object.entries(roleSkills.aiReadinessSkills).forEach(([skillName, requiredScore]) => {
                if (skillCriticality[skillName] === 'critical') {
                  const candidates = comparison.candidateEntries.map(candidate => {
                    const skill = findSkillInScores(candidate.skillScores, skillName);
                    const hasData = skill?.dataAvailable !== false && skill?.score != null;
                    return {
                      userId: candidate.userId,
                      userName: candidate.userName,
                      score: hasData ? skill.score : null,
                      dataAvailable: hasData,
                      gap: hasData && skill.score != null ? skill.score - (requiredScore as number) : null,
                      meetsRequirement: hasData && (skill?.score || 0) >= (requiredScore as number),
                    };
                  });
                  criticalSkillsData.push({
                    skillName,
                    requiredScore: requiredScore as number,
                    criticality: 'critical',
                    category: 'ai_readiness',
                    candidates,
                  });
                }
              });
            }
            
            if (criticalSkillsData.length === 0) return null;
            
            return (
              <MultiCandidateCriticalSkillsAnalysis 
                skills={criticalSkillsData}
                roleName={comparison.roleSnapshot.roleName}
              />
            );
          })()}

          {/* Hiring Decision Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Hiring Decision Matrix
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Quick reference for hiring band classification and decision drivers
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {(() => {
                  // Get critical skill required scores from role snapshot
                  const roleSkills = comparison.roleSnapshot.requiredSkillScores;
                  const skillCriticality = roleSkills?.skillCriticality || {};
                  
                  // Build list of critical skill names with their required scores
                  const criticalSkillRequirements = new Map<string, number>();
                  if (roleSkills?.fitSkills) {
                    Object.entries(roleSkills.fitSkills).forEach(([skillName, requiredScore]) => {
                      if (skillCriticality[skillName] === 'critical') {
                        criticalSkillRequirements.set(skillName, requiredScore as number);
                      }
                    });
                  }
                  if (roleSkills?.aiReadinessSkills) {
                    Object.entries(roleSkills.aiReadinessSkills).forEach(([skillName, requiredScore]) => {
                      if (skillCriticality[skillName] === 'critical') {
                        criticalSkillRequirements.set(skillName, requiredScore as number);
                      }
                    });
                  }
                  
                  // Sort: ranked candidates first (by rank), then insufficient data
                  const sortedCandidates = [...comparison.candidateEntries].sort((a, b) => {
                    // Use hasSufficientData to determine if candidate should be at end
                    const aHasData = a.hasSufficientData !== false && a.dataCoverage?.hasSufficientData !== false && a.overallFit != null;
                    const bHasData = b.hasSufficientData !== false && b.dataCoverage?.hasSufficientData !== false && b.overallFit != null;
                    
                    if (!aHasData && !bHasData) return 0;
                    if (!aHasData) return 1;
                    if (!bHasData) return -1;
                    
                    // Both have data, sort by rank
                    if (a.rank === null && b.rank === null) return 0;
                    if (a.rank === null) return 1;
                    if (b.rank === null) return -1;
                    return a.rank - b.rank;
                  });
                  
                  return sortedCandidates.map((candidate, idx) => {
                    // Use hasSufficientData and dataCoverage for more accurate assessment
                    const hasInsufficientData = candidate.hasSufficientData === false || 
                      candidate.dataCoverage?.hasSufficientData === false || 
                      candidate.fitTier === 'insufficient-data' || 
                      candidate.overallFit == null;
                    
                    // Calculate critical gaps using role snapshot requirements
                    const criticalGaps = Array.from(criticalSkillRequirements.entries()).filter(([skillName, requiredScore]) => {
                      const skill = findSkillInScores(candidate.skillScores, skillName);
                      return skill?.dataAvailable !== false && skill?.score != null && (skill.score || 0) < requiredScore;
                    }).length;
                    
                    let hiringBand: { label: string; color: string; bgColor: string };
                    
                    if (hasInsufficientData) {
                      hiringBand = { label: 'INSUFFICIENT DATA', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800 border-gray-300' };
                    } else if (candidate.overallFit! >= 80 && criticalGaps === 0) {
                      hiringBand = { label: 'STRONG HIRE', color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-300' };
                    } else if (candidate.overallFit! >= 70 && criticalGaps <= 1) {
                      hiringBand = { label: 'HIRE', color: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300' };
                    } else if (candidate.overallFit! >= 60 && criticalGaps <= 2) {
                      hiringBand = { label: 'MAYBE', color: 'text-amber-700', bgColor: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300' };
                    } else {
                      hiringBand = { label: 'NO HIRE', color: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-300' };
                    }
                    
                    // Key decision drivers
                    const topStrengths = candidate.strengths.slice(0, 2);
                    const topGaps = candidate.gaps.slice(0, 2);
                    
                    return (
                      <Card key={candidate.userId} className={`border-2 ${hiringBand.bgColor}`}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="font-bold text-lg">{candidate.userName}</div>
                              {hasInsufficientData ? (
                                <div className="text-xl text-muted-foreground">N/A</div>
                              ) : (
                                <div className="text-2xl font-bold">{candidate.overallFit}%</div>
                              )}
                            </div>
                            <div className="text-right">
                              <Badge className={`text-sm font-bold ${hiringBand.color} bg-white dark:bg-gray-800`}>
                                {hiringBand.label}
                              </Badge>
                              {idx === 0 && !hasInsufficientData && (
                                <div className="mt-1">
                                  <Badge className="bg-amber-500 text-white">Top Pick</Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            {hasInsufficientData ? (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>Complete assessments required for evaluation</span>
                              </div>
                            ) : (
                              <>
                                {criticalGaps > 0 && (
                                  <div className="flex items-center gap-2 text-red-600">
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                    <span>{criticalGaps} critical skill gap{criticalGaps > 1 ? 's' : ''}</span>
                                  </div>
                                )}
                                
                                {topStrengths.length > 0 && (
                                  <div className="flex items-start gap-2 text-green-600">
                                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                    <span>{topStrengths.join(', ')}</span>
                                  </div>
                                )}
                                
                                {topGaps.length > 0 && (
                                  <div className="flex items-start gap-2 text-amber-600">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                    <span>{topGaps.join(', ')}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  });
                })()}
              </div>
            </CardContent>
          </Card>

          {/* AI-Powered Strategic Insights */}
          <Card className="bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20" data-testid="card-ai-insights">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                AI-Powered Strategic Insights
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                AI-generated analysis and hiring recommendations based on the comparison data
              </p>
            </CardHeader>
            <CardContent>
              {comparison?.aiInsights ? (
                <div className="prose prose-sm dark:prose-invert max-w-none" data-testid="text-ai-insights">
                  {comparison.aiInsights.split('\n\n').map((paragraph: string, idx: number) => {
                    // Check if this is a heading (starts with **)
                    const headingMatch = paragraph.match(/^\*\*(.+?)\*\*/);
                    if (headingMatch) {
                      const heading = headingMatch[1];
                      const content = paragraph.replace(/^\*\*.+?\*\*\n?/, '').trim();
                      return (
                        <div key={idx} className="mb-4">
                          <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            {heading}
                          </h4>
                          {content && <p className="text-muted-foreground text-sm leading-relaxed">{content}</p>}
                        </div>
                      );
                    }
                    return (
                      <p key={idx} className="text-muted-foreground text-sm leading-relaxed mb-3">{paragraph}</p>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-purple-500/30" />
                  <p className="text-sm">AI insights will appear here once the analysis completes.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Advanced Analytics Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5" />
                Advanced Analytics
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Deep-dive metrics to help you understand candidate differences beyond overall fit scores
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Skill Dominance */}
                {(comparison.summaryInsights.skillDominance?.length || 0) > 0 && (
                  <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      Skill Dominance Count
                    </h4>
                    <div className="text-sm text-muted-foreground space-y-1 pb-2 border-b">
                      <p>Shows how many individual skills each candidate leads in compared to others.</p>
                      <p className="text-xs italic">Why it matters: A candidate who leads in more skills may be more versatile, while one who dominates fewer but critical skills might still be the better choice for specific roles.</p>
                    </div>
                    <div className="space-y-2">
                      {comparison.summaryInsights.skillDominance?.map((sd: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded bg-background">
                          <span className="font-medium">{sd.candidateName}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={i === 0 ? "default" : "outline"}>
                              {sd.winsCount}/{sd.totalSkills} skills
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              ({sd.dominancePercent}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consistency Scores */}
                {(comparison.summaryInsights.consistencyScores?.length || 0) > 0 && (
                  <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      Consistency Score
                    </h4>
                    <div className="text-sm text-muted-foreground space-y-1 pb-2 border-b">
                      <p>Measures how evenly a candidate performs across all required skills (higher = more balanced performance).</p>
                      <p className="text-xs italic">Why it matters: Highly consistent candidates are predictable performers with no major gaps. Variable candidates may excel in some areas but struggle in others, which could be fine depending on team composition.</p>
                    </div>
                    <div className="space-y-2">
                      {comparison.summaryInsights.consistencyScores?.map((cs: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded bg-background">
                          <span className="font-medium">{cs.candidateName}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{cs.consistencyScore}%</span>
                            <Badge 
                              variant="outline"
                              className={
                                cs.interpretation === 'Very Consistent' ? 'border-green-500 text-green-600' :
                                cs.interpretation === 'Consistent' ? 'border-blue-500 text-blue-600' :
                                cs.interpretation === 'Variable' ? 'border-amber-500 text-amber-600' :
                                ''
                              }
                            >
                              {cs.interpretation}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Critical Gap Ratio */}
                {(comparison.summaryInsights.criticalGapRatios?.length || 0) > 0 && (
                  <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                    <h4 className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Critical Gap Ratio
                    </h4>
                    <div className="text-sm text-muted-foreground space-y-1 pb-2 border-b">
                      <p>Identifies how many critical skills fall below the 60% threshold - the minimum acceptable level for role success.</p>
                      <p className="text-xs italic">Why it matters: Critical skills are non-negotiable for the role. Gaps here represent significant hiring risks that may require additional training, support, or could lead to performance issues.</p>
                    </div>
                    <div className="space-y-2">
                      {comparison.summaryInsights.criticalGapRatios?.map((cgr: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded bg-background">
                          <span className="font-medium">{cgr.candidateName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {cgr.criticalGaps}/{cgr.totalCritical} gaps
                            </span>
                            <Badge 
                              variant="outline"
                              className={
                                cgr.riskLevel === 'No Risk' ? 'border-green-500 text-green-600' :
                                cgr.riskLevel === 'Low Risk' ? 'border-blue-500 text-blue-600' :
                                cgr.riskLevel === 'Moderate Risk' ? 'border-amber-500 text-amber-600' :
                                'border-red-500 text-red-600'
                              }
                            >
                              {cgr.riskLevel}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overall Fit Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3" ref={chartRef} id="multi-candidate-bar-chart">
                {prepareBarChartData().map((entry) => {
                  const rankBadge = getRankBadge(entry.rank);
                  return (
                    <div key={entry.fullName} className="flex items-center gap-3">
                      <span className={`flex-shrink-0 w-8 h-6 rounded text-xs font-bold flex items-center justify-center ${rankBadge.color}`}>
                        {rankBadge.label}
                      </span>
                      <span className="w-28 text-sm font-medium truncate" title={entry.fullName}>
                        {entry.name}
                      </span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${entry['Overall Fit']}%`,
                            backgroundColor: entry.tier === 'strong' ? '#22c55e' : entry.tier === 'moderate' ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                      <span className="w-12 text-sm font-bold text-right">
                        {entry['Overall Fit']}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  Strong (80%+)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  Moderate (60-79%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  Development (&lt;60%)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recommended Next Steps - Matching Individual Tab Style */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Recommended Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-medium">
                    1
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Conduct final-round interviews with {comparison.summaryInsights.recommendation?.recommendedCandidate || 'the top candidate'} focusing on team dynamics and cultural alignment
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-medium">
                    2
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Perform reference checks emphasizing leadership and collaboration competencies
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-medium">
                    3
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Prepare competitive offer package based on candidate expectations
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-medium">
                    4
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Design 90-day onboarding plan targeting identified development areas
                  </span>
                </li>
              </ul>

              {/* Complete Candidate Ranking */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Complete Candidate Ranking
                </h4>
                <div className="grid gap-2">
                  {(() => {
                    if (!comparison) return null;
                    const allCandidates = comparison.candidateEntries
                      .map((entry, index) => ({
                        ...entry,
                        hasData: entry.overallFit != null && entry.fitTier !== 'insufficient-data',
                      }))
                      .sort((a, b) => {
                        if (a.hasData && !b.hasData) return -1;
                        if (!a.hasData && b.hasData) return 1;
                        return (b.overallFit || 0) - (a.overallFit || 0);
                      });
                    
                    let rankCounter = 0;
                    return allCandidates.map((entry) => {
                      if (entry.hasData) rankCounter++;
                      const rank = entry.hasData ? rankCounter : null;
                      const rankBadge = rank ? getRankBadge(rank) : null;
                      
                      return (
                        <div 
                          key={entry.userId} 
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            rank === 1 
                              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' 
                              : entry.hasData 
                                ? 'bg-muted/30 border-muted'
                                : 'bg-muted/10 border-muted/50 opacity-60'
                          }`}
                        >
                          {rankBadge ? (
                            <span className={`flex-shrink-0 w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center ${rankBadge.color}`}>
                              {rankBadge.label}
                            </span>
                          ) : (
                            <span className="flex-shrink-0 w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center bg-muted text-muted-foreground">
                              N/A
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-medium truncate block">{entry.userName}</span>
                            <span className="text-xs text-muted-foreground block">
                              {entry.hasData ? (
                                <>
                                  Overall Fit: {entry.overallFit}% - 
                                  <span className={`ml-1 ${
                                    entry.fitTier === 'strong' ? 'text-green-600' :
                                    entry.fitTier === 'moderate' ? 'text-amber-600' :
                                    'text-red-600'
                                  }`}>
                                    {entry.fitTier === 'strong' ? 'Strong Match' :
                                     entry.fitTier === 'moderate' ? 'Moderate Match' :
                                     'Development Needed'}
                                  </span>
                                </>
                              ) : (
                                <span className="text-muted-foreground italic">Insufficient assessment data</span>
                              )}
                            </span>
                          </div>
                          {rank === 1 && (
                            <Badge variant="default">
                              Recommended
                            </Badge>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Services on Request - Matching Individual Tab Style */}
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
                    AI-generated questions based on candidates' assessment results and skill gaps
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                    <Users className="h-4 w-4 text-white" />
                    Team Composition Fit
                  </h4>
                  <p className="text-sm text-white/70">
                    Analysis of how candidates would complement your existing team dynamics
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
              </div>
              <div className="mt-4 text-center">
                <Button 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/20"
                  onClick={() => window.location.href = '/for-employers'}
                  data-testid="button-contact-team-services-multi"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Speak to the Team
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Skills Legend */}
          <SkillsLegend />

          {/* Export PDF and Back to Top Buttons - Bottom of Dashboard */}
          <div className="flex justify-center gap-4 pt-6 pb-4">
            <Button
              onClick={handleExportPDF}
              disabled={isExporting}
              size="lg"
              data-testid="button-export-multi-comparison"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
              size="lg"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              data-testid="button-back-to-top-bottom"
            >
              <ArrowUp className="h-4 w-4 mr-2" />
              Back to Top
            </Button>
          </div>
        </>
      )}

      {/* Insufficient Data Dialog */}
      <Dialog open={insufficientDataDialogOpen} onOpenChange={setInsufficientDataDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Insufficient Assessment Data
            </DialogTitle>
            <DialogDescription>
              Some candidates don't have enough assessment data to generate a meaningful comparison.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {insufficientDataError?.insufficientDataCandidates && insufficientDataError.insufficientDataCandidates.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  The following candidates need to complete additional assessments:
                </p>
                
                {insufficientDataError.insufficientDataCandidates.map((candidate, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{candidate.userName}</p>
                        <p className="text-sm text-muted-foreground">{candidate.email}</p>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        {candidate.dataCoverage}% Coverage
                      </Badge>
                    </div>
                    
                    {candidate.missingAssessments && candidate.missingAssessments.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Missing assessments:</p>
                        <div className="flex flex-wrap gap-1">
                          {candidate.missingAssessments.map((assessment, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {assessment}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                <Send className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Invite these candidates to complete the missing assessments from the{' '}
                  <Link href="/partner?tab=invitations" onClick={() => setInsufficientDataDialogOpen(false)}>
                    <span className="font-medium underline inline-flex items-center gap-1 cursor-pointer hover:text-blue-600">
                      Invitations tab
                      <ExternalLink className="h-3 w-3" />
                    </span>
                  </Link>
                </span>
              </p>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={() => setInsufficientDataDialogOpen(false)} data-testid="button-close-insufficient-data-dialog">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
