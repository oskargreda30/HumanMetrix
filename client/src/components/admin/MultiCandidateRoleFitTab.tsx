import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users, Target, TrendingUp, Trophy, AlertTriangle, Download, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, FileText, BarChart2, ArrowUpDown } from "lucide-react";
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
import { Info } from "lucide-react";

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

export default function MultiCandidateRoleFitTab() {
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: candidates } = useQuery<any[]>({
    queryKey: ['/api/admin/candidates'],
  });

  const { data: roles } = useQuery<any[]>({
    queryKey: ['/api/admin/roles'],
  });

  const selectedRoleData = roles?.find((r) => r.id === selectedRole);

  const compareMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/multi-candidate-comparison', {
        jobRoleId: selectedRole,
        candidateIds: selectedCandidates,
      }, { timeoutMs: 120000 });
      return res.json();
    },
    onSuccess: (data: MultiCandidateComparison) => {
      queryClient.setQueryData(['multi-candidate-comparison', selectedRole, selectedCandidates.join(',')], data);
      toast({ title: "Comparison generated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Comparison failed",
        description: error.message || "Failed to generate comparison. Please try again.",
        variant: "destructive",
      });
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
      const res = await apiRequest('POST', `/api/admin/roles/${roleId}/generate-required-scores`, undefined, { timeoutMs: 90000 });
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

  const canCompare = selectedCandidates.length >= 2 && selectedRole && selectedRoleData?.requiredSkillScores;

  const prepareBarChartData = () => {
    if (!comparison) return [];
    // Only include candidates with valid data in the chart
    return comparison.candidateEntries
      .filter((entry) => entry.overallFit != null && entry.fitTier !== 'insufficient-data')
      .map((entry) => ({
        name: entry.userName.length > 15 ? entry.userName.slice(0, 15) + '...' : entry.userName,
        fullName: entry.userName,
        'Overall Fit': entry.overallFit as number,
        tier: entry.fitTier,
      }));
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
                      'Generate Required Scores'
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
        </CardContent>
      </Card>

      {comparison && (
        <>
          {/* How to Read This Report Section - Always Visible */}
          <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader className="flex flex-row items-center gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-base text-blue-800 dark:text-blue-300">How to Read This Report</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Role Alignment Tiers</h4>
                    <p className="text-muted-foreground text-xs mb-2">These indicate how well a candidate's trait profile matches what the role requires - NOT trait quality:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li><Badge className="bg-green-500 text-white mr-2">75%+</Badge> High alignment with role requirements</li>
                      <li><Badge className="bg-amber-500 text-white mr-2">50-74%</Badge> Moderate alignment with role requirements</li>
                      <li><Badge className="bg-red-500 text-white mr-2">&lt;50%</Badge> Lower alignment - may need development for this role</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Skill Criticality</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li><Badge variant="default" className="mr-2">C</Badge> Critical - Must-have for the role</li>
                      <li><Badge variant="outline" className="mr-2">I</Badge> Important - Significant impact</li>
                      <li><Badge variant="outline" className="mr-2">N</Badge> Nice-to-have - Beneficial but not essential</li>
                    </ul>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Understanding Trait Scores</h4>
                    <p className="text-muted-foreground">FIT and AI Readiness are <strong>trait-based</strong> assessments. Higher scores indicate stronger presence of that trait - whether that's beneficial depends entirely on what the role requires. A high score is not inherently "good" or "bad".</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Gap Analysis</h4>
                    <p className="text-muted-foreground">Gaps show the difference between candidate score and role requirement. This helps identify where trait profiles differ from role needs.</p>
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
                                const skill = candidate.skillScores.find(s => s.skillName === criticalSkill.skillName);
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
                              const skill = candidate.skillScores.find(s => s.skillName === cs.skillName);
                              return skill?.dataAvailable !== false && skill?.score != null && (skill.score || 0) >= cs.requiredScore;
                            }).length;
                            const totalCritical = criticalSkillsWithRequirements.length;
                            const assessedCritical = criticalSkillsWithRequirements.filter(cs => {
                              const skill = candidate.skillScores.find(s => s.skillName === cs.skillName);
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
                      const skill = candidate.skillScores.find(s => s.skillName === skillName);
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

          {/* Head-to-Head Skill Comparison - Now Filtered to Critical First */}
          {comparison.summaryInsights.skillComparison && comparison.summaryInsights.skillComparison.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Skill-by-Skill Comparison: Who Wins Each Skill?
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Head-to-head comparison showing which candidate leads on each skill (critical skills shown first)
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {comparison.summaryInsights.skillComparison.map((skill, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        skill.criticality === 'critical' 
                          ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' 
                          : skill.criticality === 'important'
                          ? 'bg-amber-50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800'
                          : 'bg-muted border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline" 
                          className={
                            skill.criticality === 'critical' 
                              ? 'text-red-700 border-red-400 bg-red-100 dark:bg-red-900/50' 
                              : skill.criticality === 'important'
                              ? 'text-amber-700 border-amber-400 bg-amber-100 dark:bg-amber-900/50'
                              : ''
                          }
                        >
                          {skill.criticality}
                        </Badge>
                        <span className="font-medium">{skill.skillName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600">{skill.winner}</span>
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          {skill.winnerScore}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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

                {/* Largest Skill Differential */}
                {comparison.summaryInsights.largestDifferential && (
                  <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                    <h4 className="font-semibold flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4 text-purple-500" />
                      Largest Skill Differential
                    </h4>
                    <div className="text-sm text-muted-foreground space-y-1 pb-2 border-b">
                      <p>Highlights the skill with the biggest performance gap between the top and bottom candidates.</p>
                      <p className="text-xs italic">Why it matters: Large differentials on critical skills can be decisive factors. If this skill is essential for the role, it may clearly separate suitable candidates from unsuitable ones.</p>
                    </div>
                    <div className="p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-purple-700 dark:text-purple-400">
                          {comparison.summaryInsights.largestDifferential.skillName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {comparison.summaryInsights.largestDifferential.criticality}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div>
                          <span className="text-green-600 font-medium">{comparison.summaryInsights.largestDifferential.topCandidate}</span>
                          <span className="text-muted-foreground ml-1">({comparison.summaryInsights.largestDifferential.topScore}%)</span>
                        </div>
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {comparison.summaryInsights.largestDifferential.spread} pt spread
                        </Badge>
                        <div>
                          <span className="text-red-600 font-medium">{comparison.summaryInsights.largestDifferential.bottomCandidate}</span>
                          <span className="text-muted-foreground ml-1">({comparison.summaryInsights.largestDifferential.bottomScore}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>Overall Fit Comparison</CardTitle>
              <Button
                onClick={handleExportPDF}
                disabled={isExporting}
                variant="outline"
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
            </CardHeader>
            <CardContent>
              <div className="h-80" ref={chartRef} id="multi-candidate-bar-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepareBarChartData()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, 'Overall Fit']}
                      labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label}
                    />
                    <Bar dataKey="Overall Fit" radius={[0, 4, 4, 0]}>
                      {prepareBarChartData().map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.tier === 'strong' ? '#22c55e' : entry.tier === 'moderate' ? '#f59e0b' : '#ef4444'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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

          <Card>
            <CardHeader>
              <CardTitle>Candidate Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {comparison.candidateEntries.map((entry, idx) => {
                  const hasInsufficientData = entry.fitTier === 'insufficient-data' || entry.overallFit == null || !entry.dataCoverage?.hasSufficientData;
                  return (
                  <div 
                    key={entry.userId} 
                    className="border rounded-lg overflow-hidden"
                  >
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover-elevate"
                      onClick={() => setExpandedCandidate(expandedCandidate === entry.userId ? null : entry.userId)}
                      data-testid={`row-candidate-${entry.userId}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          hasInsufficientData ? 'bg-muted text-muted-foreground' : 
                          idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-700' : 'bg-muted text-foreground'
                        }`}>
                          {hasInsufficientData ? '—' : entry.rank}
                        </div>
                        <div>
                          <div className="font-medium">{entry.userName}</div>
                          <div className="text-sm text-muted-foreground">{entry.email}</div>
                          {hasInsufficientData && entry.dataCoverage && (
                            <div className="text-xs text-amber-600 mt-1">
                              {entry.dataCoverage.assessedSkillCount === 0 
                                ? 'No completed assessments'
                                : `${entry.dataCoverage.percentage}% coverage (${entry.dataCoverage.assessedSkillCount}/${entry.dataCoverage.totalRequiredSkills} skills)`
                              }
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {hasInsufficientData ? (
                            <>
                              <div className="text-lg font-medium text-muted-foreground">N/A</div>
                              <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700">Insufficient Data</Badge>
                            </>
                          ) : (
                            <>
                              <div className="text-2xl font-bold">{entry.overallFit}%</div>
                              {getFitTierBadge(entry.fitTier)}
                            </>
                          )}
                        </div>
                        {expandedCandidate === entry.userId ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                    
                    {expandedCandidate === entry.userId && (
                      <div className="p-4 border-t bg-muted/30 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          {entry.strengths.length > 0 && (
                            <div>
                              <h5 className="font-medium text-green-600 mb-2">Strengths</h5>
                              <ul className="space-y-1">
                                {entry.strengths.map((s, i) => (
                                  <li key={i} className="text-sm flex items-center gap-2">
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {entry.gaps.length > 0 && (
                            <div>
                              <h5 className="font-medium text-amber-600 mb-2">Development Areas</h5>
                              <ul className="space-y-1">
                                {entry.gaps.map((g, i) => (
                                  <li key={i} className="text-sm flex items-center gap-2">
                                    <AlertCircle className="h-3 w-3 text-amber-500" />
                                    {g}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {(entry.riskFlags?.length || 0) > 0 && (
                          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                            <h5 className="font-medium text-red-600 mb-1 flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              Risk Flags
                            </h5>
                            <ul className="space-y-1">
                              {entry.riskFlags.map((r, i) => (
                                <li key={i} className="text-sm text-red-600">{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div>
                          <h5 className="font-medium mb-3">Skill Comparison vs Other Candidates</h5>
                          <div className="grid gap-2 md:grid-cols-2">
                            {entry.skillScores.map((skill, i) => {
                              const hasData = skill.dataAvailable !== false && skill.score !== null;
                              
                              if (!hasData) {
                                return (
                                  <div key={i} className="p-2 rounded bg-muted/30 border border-dashed border-muted-foreground/30">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium truncate text-muted-foreground">{skill.skillName}</span>
                                      <div className="flex items-center gap-1">
                                        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500">
                                          {skill.criticality === 'critical' ? 'C' : skill.criticality === 'important' ? 'I' : 'N'}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-muted-foreground italic">N/A - Not Assessed</span>
                                    </div>
                                  </div>
                                );
                              }
                              
                              const allScoresForSkill = comparison.candidateEntries
                                .map(c => c.skillScores.find(s => s.skillName === skill.skillName))
                                .filter(s => s && s.dataAvailable !== false && s.score !== null)
                                .map(s => s!.score as number)
                                .sort((a, b) => b - a);
                              const skillRank = allScoresForSkill.indexOf(skill.score as number) + 1;
                              const isLeader = skillRank === 1 && allScoresForSkill.length > 1;
                              const topScore = allScoresForSkill[0] || 0;
                              const gapToLeader = topScore - (skill.score as number);
                              
                              return (
                                <div key={i} className={`p-2 rounded ${isLeader ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800' : 'bg-muted/50'}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium truncate">{skill.skillName}</span>
                                    <div className="flex items-center gap-1">
                                      <Badge 
                                        variant={skill.criticality === 'critical' ? 'default' : 'outline'}
                                        className="text-xs"
                                      >
                                        {skill.criticality === 'critical' ? 'C' : skill.criticality === 'important' ? 'I' : 'N'}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className={`font-medium ${isLeader ? 'text-green-600' : ''}`}>
                                      {isLeader ? (
                                        <span className="flex items-center gap-1">
                                          <Trophy className="h-3 w-3" /> Leads
                                        </span>
                                      ) : allScoresForSkill.length > 1 ? (
                                        `Rank ${skillRank}/${allScoresForSkill.length}`
                                      ) : (
                                        `Score: ${skill.score}`
                                      )}
                                    </span>
                                    {!isLeader && gapToLeader > 0 && allScoresForSkill.length > 1 && (
                                      <span className="text-muted-foreground text-xs">
                                        {gapToLeader} pts behind leader
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps Section */}
          <Card className="border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader className="flex flex-row items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <CardTitle className="text-base text-green-800 dark:text-green-300">Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-white dark:bg-background rounded-lg border">
                    <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <div>
                      <h4 className="font-semibold text-green-800 dark:text-green-300">Review Critical Skills</h4>
                      <p className="text-muted-foreground text-xs">Focus on candidates who meet or exceed the required scores for critical skills. These are non-negotiable for role success.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white dark:bg-background rounded-lg border">
                    <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <div>
                      <h4 className="font-semibold text-green-800 dark:text-green-300">Consider Development Potential</h4>
                      <p className="text-muted-foreground text-xs">Candidates with gaps in "Important" or "Nice-to-have" skills may still be strong hires if they show potential for growth.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-white dark:bg-background rounded-lg border">
                    <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <div>
                      <h4 className="font-semibold text-green-800 dark:text-green-300">Use Interviews to Validate</h4>
                      <p className="text-muted-foreground text-xs">Assessment data provides objective insights. Use structured interviews to explore specific skills and cultural fit in more depth.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white dark:bg-background rounded-lg border">
                    <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold shrink-0">4</div>
                    <div>
                      <h4 className="font-semibold text-green-800 dark:text-green-300">Export & Share</h4>
                      <p className="text-muted-foreground text-xs">Download the PDF report to share with hiring stakeholders. Use the comparison data to support data-driven hiring decisions.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills Legend */}
          <SkillsLegend />
        </>
      )}
    </div>
  );
}
