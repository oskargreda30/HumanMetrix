import { useState, useRef, useEffect } from "react";
import { AnalysisLoadingScreen } from "@/components/shared/AnalysisLoadingScreen";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Helper to get CSRF token from cookies
function getCsrfToken(): string | null {
  const match = document.cookie.match(/(^|;)\s*csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[2]) : null;
}
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users, Target, TrendingUp, Trophy, AlertTriangle, Download, CheckCircle2, AlertCircle, FileText, Sparkles, MessageSquare, Clock, ShieldAlert, DollarSign, ArrowUp, Brain, Send, ExternalLink, RefreshCw, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { EnquiryModal } from "@/components/EnquiryModal";

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
    criticality: 'critical' | 'standard';
    category: 'fit' | 'ai_readiness';
    dataAvailable?: boolean;
  }>;
  strengths: (string | { skill: string; summary: string; description: string })[];
  gaps: (string | { skill: string; summary: string; description: string })[];
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
  promptArchitectureScore?: number | null;
  aiqScore?: number | null;
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

const CHART_COLORS = ['#4A7FA8', '#6A9BC5', '#8AB5D5', '#3D6F96', '#7BAAD0', '#527EA3', '#6393B9', '#4878A0', '#7CA8CC', '#5B8DB8'];

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

const formatReportDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} at ${timePart}`;
};

export default function PartnerMultiCandidateRoleFitTab() {
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [insufficientDataDialogOpen, setInsufficientDataDialogOpen] = useState(false);
  const [insufficientDataError, setInsufficientDataError] = useState<InsufficientDataError | null>(null);
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [incompleteCandidates, setIncompleteCandidates] = useState<Array<{
    id: string;
    name: string;
    email: string;
    missingAssessments: string[];
  }>>([]);
  const chartRef = useRef<HTMLDivElement>(null);
  const forceRefreshRef = useRef(false);
  const { toast } = useToast();

  const ALL_ASSESSMENT_TYPES = [
    { id: 'fit', label: 'FIT Assessment' },
    { id: 'ai_readiness', label: 'AI Readiness' },
    { id: 'prompt_architecture', label: 'Prompt Architecture' },
    { id: 'aiq', label: 'AIQ' },
  ];

  const { data: candidates } = useQuery<any[]>({
    queryKey: ['/api/partner/me/candidates'],
  });

  const { data: roles } = useQuery<any[]>({
    queryKey: ['/api/partner/me/roles'],
  });

  const selectedRoleData = roles?.find((r) => r.id === selectedRole);

  const inviteMutation = useMutation({
    mutationFn: async (candidatesToInvite: Array<{ email: string; name: string; missingAssessments: string[] }>) => {
      const groups = new Map<string, Array<{ email: string; name: string }>>();
      for (const c of candidatesToInvite) {
        const key = c.missingAssessments.sort().join(',');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push({ email: c.email, name: c.name });
      }

      let totalSuccess = 0;
      for (const [assessmentKey, groupCandidates] of Array.from(groups.entries())) {
        const payload = {
          candidates: groupCandidates,
          assessmentTypes: assessmentKey.split(','),
          sendEmails: true,
          forceReinvite: true,
        };
        const response = await apiRequest('POST', '/api/partner/me/invitations/bulk', payload, { timeoutMs: 120000 });
        const data = await response.json();
        totalSuccess += data.summary?.successCount || 0;
      }
      return { totalSuccess };
    },
    onSuccess: (data: { totalSuccess: number }) => {
      setInviteModalOpen(false);
      setIncompleteCandidates([]);
      queryClient.invalidateQueries({ queryKey: ['/api/partner/me/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/partner/me/invitations'] });
      toast({
        title: "Invitations sent",
        description: `${data.totalSuccess} invitation(s) sent successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitations",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCompareClick = () => {
    if (!candidates) return;

    const incomplete: typeof incompleteCandidates = [];
    const complete: string[] = [];

    for (const candidateId of selectedCandidates) {
      const candidate = candidates.find((c: any) => c.user.id === candidateId);
      if (!candidate) continue;

      const completedTypes = (candidate.results || [])
        .filter((r: any) => r.status === 'completed')
        .map((r: any) => r.assessmentType?.toLowerCase());

      const missing = ALL_ASSESSMENT_TYPES
        .filter(at => !completedTypes.includes(at.id))
        .map(at => at.id);

      const hasFit = completedTypes.includes('fit');

      if (!hasFit) {
        const displayName = candidate.user.firstName || candidate.user.lastName
          ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
          : candidate.user.email;
        incomplete.push({
          id: candidateId,
          name: displayName,
          email: candidate.user.email,
          missingAssessments: missing.length > 0 ? missing : ['fit'],
        });
      } else {
        complete.push(candidateId);
      }
    }

    if (incomplete.length > 0) {
      setIncompleteCandidates(incomplete);
      setInviteModalOpen(true);
    } else {
      compareMutation.mutate();
    }
  };

  const compareMutation = useMutation({
    mutationFn: async () => {
      // Use fetch directly to handle error responses with custom data
      const csrfToken = getCsrfToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }
      const res = await fetch('/api/partner/me/multi-candidate-comparison', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jobRoleId: selectedRole,
          candidateIds: selectedCandidates,
          forceRefresh: forceRefreshRef.current,
        }),
        credentials: 'include',
      });
      
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
      forceRefreshRef.current = false;
      queryClient.setQueryData(['multi-candidate-comparison', selectedRole, selectedCandidates.join(',')], data);
      if (isRerunning) {
        setIsRerunning(false);
        toast({ title: "Analysis regenerated", description: "Fresh AI comparison has been generated successfully." });
      } else {
        toast({ title: "Comparison generated successfully" });
      }
    },
    onError: (error: Error & { insufficientDataCandidates?: InsufficientDataError['insufficientDataCandidates'] }) => {
      forceRefreshRef.current = false;
      setIsRerunning(false);
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
          title: "Unable to compare",
          description: error.message || "Failed to generate comparison. Please try again.",
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
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 md:p-4">
        <div className="flex items-start gap-2 md:gap-3">
          <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs md:text-sm font-medium text-blue-800 dark:text-blue-200">
              Credit Usage for Analysis
            </p>
            <p className="text-[11px] md:text-xs text-blue-700 dark:text-blue-300 mt-0.5 md:mt-1">
              Credits are only consumed when generating new analysis – saved results are always free. Multi-candidate comparison: 1 credit per candidate.
            </p>
          </div>
        </div>
      </div>

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
              onClick={handleCompareClick}
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

      {compareMutation.isPending && (
        <AnalysisLoadingScreen
          isComplete={false}
          averageTimeSeconds={30}
          message={isRerunning ? "Re-generating AI comparison with fresh insights..." : "Analyzing candidates against role requirements..."}
        />
      )}

      {comparison && !compareMutation.isPending && (
        <>
          {/* Report Header with Date, Re-run, and Export PDF */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 p-3">
            <div className="flex items-center gap-2">
              {(comparison as any)?.generatedAt && (
                <div className="flex items-center gap-1.5 text-xs text-white/80" data-testid="text-multi-rolefit-report-date">
                  {(comparison as any)?.cached ? (
                    <>
                      <Clock className="h-3 w-3" />
                      <span>Cached — {formatReportDate((comparison as any).generatedAt)}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      <span>Generated {formatReportDate((comparison as any).generatedAt)}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  forceRefreshRef.current = true;
                  setIsRerunning(true);
                  compareMutation.mutate();
                }}
                disabled={compareMutation.isPending}
                data-testid="button-rerun-multi-rolefit-analysis"
                className="border-white/30 text-white/90"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Re-run Analysis ({selectedCandidates.length} credits)
              </Button>
              <Button
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting}
                data-testid="button-export-multi-comparison-top"
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
          </div>

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
                    <p className="font-medium text-sm">Prompt Architecture Scores</p>
                    <p className="text-xs text-muted-foreground">Measures <strong>AI prompt engineering</strong> ability across 7 progressive levels - from basic prompts to advanced multi-agent orchestration.</p>
                  </div>
                </div>
                {/* Step 5 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
                  <div>
                    <p className="font-medium text-sm">AIQ (Algorithmic Integrity Quotient)</p>
                    <p className="text-xs text-muted-foreground">Assesses <strong>ethical AI decision-making</strong> - how candidates balance efficiency, fairness, and transparency in AI-driven scenarios.</p>
                  </div>
                </div>
                {/* Step 6 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">6</div>
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
                const criticalSkillsWithRequirements: Array<{ skillName: string; requiredScore: number; category: 'fit' | 'ai_readiness' | 'prompt_architecture' | 'aiq' }> = [];
                
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
                
                // Check Prompt Architecture skills
                if (roleSkills?.promptArchitectureSkills) {
                  Object.entries(roleSkills.promptArchitectureSkills).forEach(([skillName, requiredScore]) => {
                    if (skillCriticality[skillName] === 'critical') {
                      criticalSkillsWithRequirements.push({
                        skillName,
                        requiredScore: requiredScore as number,
                        category: 'prompt_architecture'
                      });
                    }
                  });
                }
                
                // Check AIQ skills
                if (roleSkills?.aiqSkills) {
                  Object.entries(roleSkills.aiqSkills).forEach(([skillName, requiredScore]) => {
                    if (skillCriticality[skillName] === 'critical') {
                      criticalSkillsWithRequirements.push({
                        skillName,
                        requiredScore: requiredScore as number,
                        category: 'aiq'
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
                  <div className="overflow-x-auto -mx-2 md:mx-0">
                    <table className="w-full text-xs md:text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 md:p-3 font-semibold bg-muted/50 min-w-[80px] md:min-w-[120px]">Skill</th>
                          <th className="text-center p-2 md:p-3 font-semibold bg-muted/50">Req</th>
                          {sortedCandidates.map((candidate, idx) => {
                            // Use hasSufficientData and dataCoverage for more accurate assessment
                            const hasInsufficientData = candidate.hasSufficientData === false || 
                              candidate.dataCoverage?.hasSufficientData === false || 
                              candidate.fitTier === 'insufficient-data' || 
                              candidate.overallFit == null;
                            return (
                              <th key={candidate.userId} className={`text-center p-2 md:p-3 font-semibold min-w-[50px] md:min-w-[80px] ${idx === 0 && !hasInsufficientData ? 'bg-green-50 dark:bg-green-950/30' : hasInsufficientData ? 'bg-gray-100 dark:bg-gray-800' : 'bg-muted/50'}`}>
                                <div className="flex flex-col items-center gap-0.5 md:gap-1">
                                  <span className="truncate max-w-[50px] md:max-w-[100px] text-xs md:text-sm">{candidate.userName.split(' ')[0]}</span>
                                  {idx === 0 && !hasInsufficientData && <Badge className="bg-green-600 text-white text-[10px] md:text-xs px-1">Top</Badge>}
                                  {hasInsufficientData && <Badge variant="outline" className="text-[10px] md:text-xs text-gray-500 px-1">Inc</Badge>}
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
                              <td className="p-2 md:p-3 font-medium text-xs md:text-sm">{criticalSkill.skillName}</td>
                              <td className="text-center p-2 md:p-3">
                                <Badge variant="outline" className="text-red-600 border-red-300 text-[10px] md:text-xs px-1">{criticalSkill.requiredScore}+</Badge>
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
                                  <td key={candidate.userId} className={`text-center p-2 md:p-3 ${idx === 0 && !hasInsufficientData ? 'bg-green-50/50 dark:bg-green-950/20' : hasInsufficientData ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                                    {!hasData ? (
                                      <span className="text-muted-foreground italic text-xs">N/A</span>
                                    ) : (
                                      <div className="flex flex-col items-center gap-0.5 md:gap-1">
                                        <span className={`font-bold text-sm md:text-lg ${meetsRequired ? 'text-green-600' : meetsThreshold ? 'text-amber-600' : 'text-red-600'}`}>
                                          {score}
                                        </span>
                                        {meetsRequired ? (
                                          <CheckCircle2 className="h-3 w-3 md:h-5 md:w-5 text-green-500" />
                                        ) : meetsThreshold ? (
                                          <AlertCircle className="h-3 w-3 md:h-5 md:w-5 text-amber-500" />
                                        ) : (
                                          <AlertTriangle className="h-3 w-3 md:h-5 md:w-5 text-red-500" />
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
                          <td className="p-2 md:p-3 text-xs md:text-sm">Critical Met</td>
                          <td className="text-center p-2 md:p-3">—</td>
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
                              <td key={candidate.userId} className={`text-center p-2 md:p-3 ${idx === 0 && !hasInsufficientData ? 'bg-green-50/50 dark:bg-green-950/20' : hasInsufficientData ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                                {assessedCritical === 0 ? (
                                  <span className="text-muted-foreground italic text-xs">No data</span>
                                ) : (
                                  <>
                                    <span className={`text-sm md:text-lg font-bold ${allMet ? 'text-green-600' : 'text-red-600'}`}>
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

          {/* Prompt Architecture Comparison Section */}
          {(() => {
            const paRoleSkills = comparison.roleSnapshot.requiredSkillScores || {};
            const REQUIRED_PA_SCORE = paRoleSkills.promptArchitectureScore || 62;
            return (
          <Card data-testid="card-prompt-architecture-comparison">
            <CardHeader className="bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <Target className="h-4 w-4 md:h-5 md:w-5 text-cyan-600" />
                Prompt Architecture Comparison
              </CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground">
                AI prompt engineering ability across 7 progressive levels{REQUIRED_PA_SCORE ? ` - candidates should score ${REQUIRED_PA_SCORE}+ to demonstrate proficiency` : ""}
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              {(() => {
                const candidatesWithPA = comparison.candidateEntries.filter(
                  (c: CandidateEntry) => c.promptArchitectureScore != null && c.promptArchitectureScore !== undefined
                );
                
                if (candidatesWithPA.length === 0) {
                  return (
                    <div className="text-center py-6 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                      <p className="text-sm">No candidates have completed the Prompt Architecture assessment yet.</p>
                      {REQUIRED_PA_SCORE != null && <p className="text-xs mt-1">Required score for this role: {REQUIRED_PA_SCORE}/100</p>}
                    </div>
                  );
                }
                
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs md:text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 md:p-3 font-semibold">Candidate</th>
                          <th className="text-center p-2 md:p-3 font-semibold">Score</th>
                          <th className="text-center p-2 md:p-3 font-semibold">Required</th>
                          <th className="text-center p-2 md:p-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.candidateEntries.map((candidate: CandidateEntry, idx: number) => {
                          const hasScore = candidate.promptArchitectureScore != null;
                          const score = candidate.promptArchitectureScore || 0;
                          const meetsRequirement = hasScore && REQUIRED_PA_SCORE != null && score >= REQUIRED_PA_SCORE;
                          
                          return (
                            <tr key={candidate.userId} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                              <td className="p-2 md:p-3 font-medium">{candidate.userName}</td>
                              <td className="text-center p-2 md:p-3">
                                {hasScore ? (
                                  <span className={`font-bold ${meetsRequirement ? 'text-green-600' : 'text-red-600'}`}>
                                    {score}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground italic">No scores</span>
                                )}
                              </td>
                              <td className="text-center p-2 md:p-3">
                                <Badge variant="outline" className="text-cyan-600 border-cyan-300 text-[10px] md:text-xs px-1">
                                  {REQUIRED_PA_SCORE != null ? `${REQUIRED_PA_SCORE}+` : "N/A"}
                                </Badge>
                              </td>
                              <td className="text-center p-2 md:p-3">
                                {!hasScore ? (
                                  <Badge variant="outline" className="text-muted-foreground text-[10px] md:text-xs">N/A</Badge>
                                ) : meetsRequirement ? (
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px] md:text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Meets
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-[10px] md:text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Below
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
            );
          })()}

          {/* AIQ (Algorithmic Integrity Quotient) Comparison Section */}
          {(() => {
            const aiqRoleSkills = comparison.roleSnapshot.requiredSkillScores || {};
            const REQUIRED_AIQ_SCORE = aiqRoleSkills.aiqScore || 62;
            return (
          <Card data-testid="card-aiq-comparison">
            <CardHeader className="bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <ShieldAlert className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                AIQ (Algorithmic Integrity Quotient) Comparison
              </CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground">
                Ethical AI decision-making - balancing efficiency, fairness, and transparency{REQUIRED_AIQ_SCORE ? ` - candidates should score ${REQUIRED_AIQ_SCORE}+ to demonstrate proficiency` : ""}
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              {(() => {
                const candidatesWithAIQ = comparison.candidateEntries.filter(
                  (c: CandidateEntry) => c.aiqScore != null && c.aiqScore !== undefined
                );
                
                if (candidatesWithAIQ.length === 0) {
                  return (
                    <div className="text-center py-6 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                      <p className="text-sm">No candidates have completed the AIQ assessment yet.</p>
                      {REQUIRED_AIQ_SCORE != null && <p className="text-xs mt-1">Required score for this role: {REQUIRED_AIQ_SCORE}/100</p>}
                    </div>
                  );
                }
                
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs md:text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 md:p-3 font-semibold">Candidate</th>
                          <th className="text-center p-2 md:p-3 font-semibold">Score</th>
                          <th className="text-center p-2 md:p-3 font-semibold">Required</th>
                          <th className="text-center p-2 md:p-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.candidateEntries.map((candidate: CandidateEntry, idx: number) => {
                          const hasScore = candidate.aiqScore != null;
                          const score = candidate.aiqScore || 0;
                          const meetsRequirement = hasScore && REQUIRED_AIQ_SCORE != null && score >= REQUIRED_AIQ_SCORE;
                          
                          return (
                            <tr key={candidate.userId} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                              <td className="p-2 md:p-3 font-medium">{candidate.userName}</td>
                              <td className="text-center p-2 md:p-3">
                                {hasScore ? (
                                  <span className={`font-bold ${meetsRequirement ? 'text-green-600' : 'text-red-600'}`}>
                                    {score}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground italic">No scores</span>
                                )}
                              </td>
                              <td className="text-center p-2 md:p-3">
                                <Badge variant="outline" className="text-purple-600 border-purple-300 text-[10px] md:text-xs px-1">
                                  {REQUIRED_AIQ_SCORE != null ? `${REQUIRED_AIQ_SCORE}+` : "N/A"}
                                </Badge>
                              </td>
                              <td className="text-center p-2 md:p-3">
                                {!hasScore ? (
                                  <Badge variant="outline" className="text-muted-foreground text-[10px] md:text-xs">N/A</Badge>
                                ) : meetsRequirement ? (
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px] md:text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Meets
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-[10px] md:text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Below
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
            );
          })()}

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
                  className="border-white text-white"
                  onClick={() => setShowEnquiryModal(true)}
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
          <div className="flex justify-end gap-4 pt-6 pb-4">
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
              variant="default"
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
      <Dialog open={insufficientDataDialogOpen} onOpenChange={(open) => {
        setInsufficientDataDialogOpen(open);
        if (!open) {
          setInsufficientDataError(null);
        }
      }}>
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

      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Assessments Required
            </DialogTitle>
            <DialogDescription>
              The following candidates have not completed the assessments needed for this comparison. Send them an invitation to complete the missing tests.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {incompleteCandidates.map((candidate) => (
              <div key={candidate.id} className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-sm" data-testid={`text-incomplete-candidate-${candidate.id}`}>{candidate.name}</p>
                    <p className="text-xs text-muted-foreground">{candidate.email}</p>
                  </div>
                </div>
                <div className="mt-1">
                  <p className="text-xs text-muted-foreground mb-1">Missing assessments:</p>
                  <div className="flex flex-wrap gap-1">
                    {candidate.missingAssessments.map((assessmentId) => {
                      const label = ALL_ASSESSMENT_TYPES.find(a => a.id === assessmentId)?.label || assessmentId;
                      return (
                        <Badge key={assessmentId} variant="secondary" className="text-xs">
                          {label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setInviteModalOpen(false)}
              data-testid="button-cancel-invite-modal"
            >
              Cancel
            </Button>
            <Button
              onClick={() => inviteMutation.mutate(incompleteCandidates)}
              disabled={inviteMutation.isPending}
              data-testid="button-send-invite-from-comparison"
            >
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation{incompleteCandidates.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EnquiryModal 
        open={showEnquiryModal} 
        onOpenChange={setShowEnquiryModal}
        context="Multi-Candidate Role Fit - Enterprise Services"
      />
    </div>
  );
}
