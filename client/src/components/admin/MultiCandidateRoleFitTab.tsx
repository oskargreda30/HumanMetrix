import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users, Target, TrendingUp, Trophy, AlertTriangle, Download, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, FileText } from "lucide-react";
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

type CandidateEntry = {
  userId: string;
  userName: string;
  email: string;
  overallFit: number;
  rank: number;
  fitTier: 'strong' | 'moderate' | 'development-needed';
  skillScores: Array<{
    skillName: string;
    score: number;
    requiredScore: number;
    gap: number;
    alignment: string;
    criticality: 'critical' | 'important' | 'nice-to-have';
    category: 'fit' | 'ai_readiness';
  }>;
  strengths: string[];
  gaps: string[];
  riskFlags: string[];
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
    default:
      return <Badge variant="destructive">Development Needed</Badge>;
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
    return comparison.candidateEntries.map((entry) => ({
      name: entry.userName.length > 15 ? entry.userName.slice(0, 15) + '...' : entry.userName,
      fullName: entry.userName,
      'Overall Fit': entry.overallFit,
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

          {/* Head-to-Head Skill Comparison */}
          {comparison.summaryInsights.skillComparison && comparison.summaryInsights.skillComparison.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Skill-by-Skill Comparison: Who Wins Each Skill?
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Head-to-head comparison showing which candidate leads on each skill
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
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="font-bold text-green-600">{skill.winner}</span>
                          <span className="text-muted-foreground mx-2">wins by</span>
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            +{skill.margin} pts
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ({skill.winnerScore} vs {skill.loserScore})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Comparison Summary: {comparison.roleSnapshot.roleName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold">{comparison.candidateEntries.length}</div>
                  <div className="text-sm text-muted-foreground">Candidates Compared</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold">{comparison.summaryInsights.averageFit}%</div>
                  <div className="text-sm text-muted-foreground">Average Fit</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold">
                    {comparison.summaryInsights.topPerformer.overallFit - (comparison.summaryInsights.runnerUp?.fitScore || comparison.summaryInsights.averageFit)}
                  </div>
                  <div className="text-sm text-muted-foreground">Point Gap to Runner-Up</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">Fit Distribution</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-green-600">Strong (80%+)</span>
                      <span className="font-medium">{comparison.summaryInsights.fitDistribution.strong}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-600">Moderate (60-79%)</span>
                      <span className="font-medium">{comparison.summaryInsights.fitDistribution.moderate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Development (&lt;60%)</span>
                      <span className="font-medium">{comparison.summaryInsights.fitDistribution.developmentNeeded}</span>
                    </div>
                  </div>
                </div>
              </div>

              {(comparison.summaryInsights.keyDifferentiators?.length || 0) > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Key Differentiators
                  </h4>
                  <ul className="space-y-1">
                    {comparison.summaryInsights.keyDifferentiators.map((d, i) => (
                      <li key={i} className="text-sm text-blue-600 dark:text-blue-300">{d}</li>
                    ))}
                  </ul>
                </div>
              )}
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
                {comparison.candidateEntries.map((entry, idx) => (
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
                          idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-700' : 'bg-muted text-foreground'
                        }`}>
                          {entry.rank}
                        </div>
                        <div>
                          <div className="font-medium">{entry.userName}</div>
                          <div className="text-sm text-muted-foreground">{entry.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold">{entry.overallFit}%</div>
                          {getFitTierBadge(entry.fitTier)}
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
                              // Calculate rank for this skill among all candidates
                              const allScoresForSkill = comparison.candidateEntries
                                .map(c => c.skillScores.find(s => s.skillName === skill.skillName)?.score || 0)
                                .sort((a, b) => b - a);
                              const skillRank = allScoresForSkill.indexOf(skill.score) + 1;
                              const isLeader = skillRank === 1;
                              const topScore = allScoresForSkill[0];
                              const gap = topScore - skill.score;
                              
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
                                      ) : (
                                        `Rank ${skillRank}/${comparison.candidateEntries.length}`
                                      )}
                                    </span>
                                    {!isLeader && gap > 0 && (
                                      <span className="text-muted-foreground text-xs">
                                        {gap} pts behind leader
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
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
