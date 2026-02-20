import { useState, useRef, useEffect, useMemo } from "react";
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
import { Loader2, Users, Target, TrendingUp, Trophy, AlertTriangle, Download, CheckCircle2, AlertCircle, Sparkles, Clock, ShieldAlert, ArrowUp, Brain, Send, ExternalLink, RefreshCw, Mail } from "lucide-react";
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
import { generateDynamicNextSteps } from "@/lib/multiCandidateNextSteps";
import SkillsLegend from "@/components/SkillsLegend";
import { MultiCandidateCriticalSkillsAnalysis, type CriticalSkillMultiData } from "@/components/shared/MultiCandidateCriticalSkillsAnalysis";
import { HowToReadReport } from "@/components/shared/HowToReadReport";
import { AdditionalServicesSection } from "@/components/shared/AdditionalServicesSection";

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
      return <Badge variant="secondary">Strong Fit</Badge>;
    case 'moderate':
      return <Badge variant="secondary">Moderate Fit</Badge>;
    case 'insufficient-data':
      return <Badge variant="secondary">Insufficient Data</Badge>;
    default:
      return <Badge variant="secondary">Development Needed</Badge>;
  }
};

const getCoverageBadge = (coverage?: { percentage: number }) => {
  if (!coverage) return null;
  const pct = coverage.percentage;
  if (pct >= 100) {
    return <Badge variant="secondary">Full Coverage</Badge>;
  } else if (pct >= 70) {
    return <Badge variant="secondary">{pct}% Coverage</Badge>;
  } else if (pct >= 40) {
    return <Badge variant="secondary">{pct}% Coverage</Badge>;
  } else {
    return <Badge variant="secondary">Low Coverage ({pct}%)</Badge>;
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

interface PartnerMultiCandidateRoleFitTabProps {
  staticData?: {
    comparison: MultiCandidateComparison;
  };
}

export default function PartnerMultiCandidateRoleFitTab({ staticData }: PartnerMultiCandidateRoleFitTabProps = {}) {
  const isStaticMode = !!staticData;
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [insufficientDataDialogOpen, setInsufficientDataDialogOpen] = useState(false);
  const [insufficientDataError, setInsufficientDataError] = useState<InsufficientDataError | null>(null);
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
    enabled: !isStaticMode,
  });

  const { data: roles } = useQuery<any[]>({
    queryKey: ['/api/partner/me/roles'],
    enabled: !isStaticMode,
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
      queryClient.invalidateQueries({ queryKey: ["/api/partner/account"] });
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
  const effectiveComparison = isStaticMode ? staticData!.comparison : comparison;

  const multiCriticalSkills = useMemo(() => {
    if (!effectiveComparison) return [];
    const roleSkills = effectiveComparison.roleSnapshot.requiredSkillScores;
    const skillCriticality = roleSkills?.skillCriticality || {};
    const result: Array<{ skillName: string; requiredScore: number; category: 'fit' | 'ai_readiness' | 'prompt_architecture' | 'aiq' }> = [];
    if (roleSkills?.fitSkills) {
      Object.entries(roleSkills.fitSkills).forEach(([skillName, requiredScore]) => {
        if (skillCriticality[skillName] === 'critical') {
          result.push({ skillName, requiredScore: requiredScore as number, category: 'fit' });
        }
      });
    }
    if (roleSkills?.aiReadinessSkills) {
      Object.entries(roleSkills.aiReadinessSkills).forEach(([skillName, requiredScore]) => {
        if (skillCriticality[skillName] === 'critical') {
          result.push({ skillName, requiredScore: requiredScore as number, category: 'ai_readiness' });
        }
      });
    }
    if (roleSkills?.promptArchitectureSkills) {
      Object.entries(roleSkills.promptArchitectureSkills).forEach(([skillName, requiredScore]) => {
        if (skillCriticality[skillName] === 'critical') {
          result.push({ skillName, requiredScore: requiredScore as number, category: 'prompt_architecture' });
        }
      });
    }
    if (roleSkills?.aiqSkills) {
      Object.entries(roleSkills.aiqSkills).forEach(([skillName, requiredScore]) => {
        if (skillCriticality[skillName] === 'critical') {
          result.push({ skillName, requiredScore: requiredScore as number, category: 'aiq' });
        }
      });
    }
    result.sort((a, b) => b.requiredScore - a.requiredScore);
    return result.slice(0, 6);
  }, [effectiveComparison]);

  const multiCriticalSkillNames = useMemo(() => new Set(multiCriticalSkills.map(s => s.skillName)), [multiCriticalSkills]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/partner/account"] });
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
    if (!effectiveComparison) return [];
    const validEntries = effectiveComparison.candidateEntries
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
    if (!effectiveComparison) return;
    
    setIsExporting(true);
    toast({
      title: "Generating PDF...",
      description: "Capturing charts and preparing your report...",
    });
    
    try {
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
          barChartImage = canvas.toDataURL('image/jpeg', 0.85);
        } catch (err) {
          console.error('Error capturing bar chart:', err);
        }
      }
      
      await exportMultiCandidateComparisonPDF({
        roleSnapshot: effectiveComparison.roleSnapshot,
        candidateEntries: effectiveComparison.candidateEntries,
        summaryInsights: effectiveComparison.summaryInsights,
        barChartImage,
        criticalSkillNames: multiCriticalSkills.map(s => s.skillName),
        aiInsights: effectiveComparison.aiInsights || null,
        recommendation: effectiveComparison.summaryInsights?.recommendation || null,
        nextSteps: generateDynamicNextSteps(effectiveComparison),
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
    if (!effectiveComparison || effectiveComparison.candidateEntries.length === 0) return [];
    
    const allSkills = new Set<string>();
    effectiveComparison.candidateEntries.forEach(entry => {
      entry.skillScores.forEach(skill => allSkills.add(skill.skillName));
    });

    return Array.from(allSkills).map(skillName => {
      const row: any = { skillName };
      effectiveComparison.candidateEntries.forEach((entry, idx) => {
        const skill = entry.skillScores.find(s => s.skillName === skillName);
        row[`candidate${idx}`] = skill?.score ?? 0;
        row[`required${idx}`] = skill?.requiredScore ?? 0;
      });
      return row;
    });
  };

  return (
    <div className="space-y-6">
      {!isStaticMode && (
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
      )}

      {!isStaticMode && (
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
      )}

      {!isStaticMode && compareMutation.isPending && (
        <AnalysisLoadingScreen
          isComplete={false}
          averageTimeSeconds={30}
          message={isRerunning ? "Re-generating AI comparison with fresh insights..." : "Analyzing candidates against role requirements..."}
        />
      )}

      {((isStaticMode && effectiveComparison) || (comparison && !compareMutation.isPending)) && (
        <>
          {/* Report Header with Date, Re-run, and Export PDF */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 rounded-lg bg-card border border-border p-3">
            <div className="flex items-center gap-2">
              {!isStaticMode && (effectiveComparison as any)?.generatedAt && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="text-multi-rolefit-report-date">
                  {(effectiveComparison as any)?.cached ? (
                    <>
                      <Clock className="h-3 w-3" />
                      <span>Cached — {formatReportDate((effectiveComparison as any).generatedAt)}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      <span>Generated {formatReportDate((effectiveComparison as any).generatedAt)}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!isStaticMode && (
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
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Re-run Analysis ({selectedCandidates.length} credits)
              </Button>
              )}
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

          <HowToReadReport reportType="rolefit_multi" />

          {/* Hiring Recommendation - Most Important Section */}
          {effectiveComparison!.summaryInsights.recommendation && (
            <Card className="border-2 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-primary" />
                  Hiring Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Recommended Candidate */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                        1
                      </div>
                      <div>
                        <div className="text-xl font-bold">{effectiveComparison!.summaryInsights.recommendation!.recommendedCandidate}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-2xl font-bold text-foreground">{effectiveComparison!.summaryInsights.recommendation!.fitScore}%</span>
                          {getFitTierBadge(effectiveComparison!.summaryInsights.recommendation!.fitTier)}
                        </div>
                      </div>
                    </div>
                    
                    {(effectiveComparison!.summaryInsights.recommendation!.reasons?.length || 0) > 0 && (
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold text-foreground mb-2">Why This Candidate?</h4>
                        <ul className="space-y-2">
                          {effectiveComparison!.summaryInsights.recommendation!.reasons.map((reason, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(effectiveComparison!.summaryInsights.recommendation!.criticalSkillAdvantages?.length || 0) > 0 && (
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold text-foreground mb-2">Critical Skill Advantages</h4>
                        <div className="flex flex-wrap gap-2">
                          {effectiveComparison!.summaryInsights.recommendation!.criticalSkillAdvantages.map((adv, i) => (
                            <Badge key={i} variant="secondary">
                              {adv}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Runner-Up Alternative */}
                  {effectiveComparison!.summaryInsights.runnerUp && (
                    <div className="space-y-4 border-l-2 border-gray-200 dark:border-gray-700 pl-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white text-lg font-bold">
                          2
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Runner-Up Alternative</div>
                          <div className="text-lg font-bold">{effectiveComparison!.summaryInsights.runnerUp.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-semibold">{effectiveComparison!.summaryInsights.runnerUp.fitScore}%</span>
                            {getFitTierBadge(effectiveComparison!.summaryInsights.runnerUp.fitTier)}
                          </div>
                        </div>
                      </div>

                      {(effectiveComparison!.summaryInsights.runnerUp.consideration?.length || 0) > 0 && (
                        <div className="p-3 bg-muted rounded-lg">
                          <h4 className="font-medium text-sm mb-2">Why Consider as Alternative?</h4>
                          <ul className="space-y-1">
                            {effectiveComparison!.summaryInsights.runnerUp.consideration.map((c, i) => (
                              <li key={i} className="text-sm text-muted-foreground">{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {(effectiveComparison!.summaryInsights.runnerUp.advantagesOverTop?.length || 0) > 0 && (
                        <div className="p-3 bg-muted rounded-lg">
                          <h4 className="font-medium text-sm text-foreground mb-2">
                            Where Runner-Up Outperforms
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {effectiveComparison!.summaryInsights.runnerUp.advantagesOverTop.map((adv, i) => (
                              <Badge key={i} variant="outline">
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
          <Card className="border-2 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-primary" />
                Critical Skills Dashboard
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Must-have skills for this role. Candidates must meet thresholds (60+) on these skills to be considered.
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              {(() => {
                const cappedCriticalSkills = multiCriticalSkills;

                if (cappedCriticalSkills.length === 0) {
                  return (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No critical skills defined for this role.</p>
                    </div>
                  );
                }
                
                // Show ALL candidates - including those with insufficient data
                const allCandidates = effectiveComparison!.candidateEntries;
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
                              <th key={candidate.userId} className={`text-center p-2 md:p-3 font-semibold min-w-[50px] md:min-w-[80px] ${idx === 0 && !hasInsufficientData ? 'bg-muted/60' : hasInsufficientData ? 'bg-gray-100 dark:bg-gray-800' : 'bg-muted/50'}`}>
                                <div className="flex flex-col items-center gap-0.5 md:gap-1">
                                  <span className="truncate max-w-[50px] md:max-w-[100px] text-xs md:text-sm">{candidate.userName.split(' ')[0]}</span>
                                  {idx === 0 && !hasInsufficientData && <Badge variant="secondary" className="text-[10px] md:text-xs px-1">Top</Badge>}
                                  {hasInsufficientData && <Badge variant="outline" className="text-[10px] md:text-xs text-gray-500 px-1">Inc</Badge>}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {cappedCriticalSkills.map((criticalSkill, skillIdx) => {
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
                                  <td key={candidate.userId} className={`text-center p-2 md:p-3 ${idx === 0 && !hasInsufficientData ? 'bg-muted/30' : hasInsufficientData ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
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
                            const criticalSkillsMet = cappedCriticalSkills.filter(cs => {
                              const skill = findSkillInScores(candidate.skillScores, cs.skillName);
                              return skill?.dataAvailable !== false && skill?.score != null && (skill.score || 0) >= cs.requiredScore;
                            }).length;
                            const totalCritical = cappedCriticalSkills.length;
                            const assessedCritical = cappedCriticalSkills.filter(cs => {
                              const skill = findSkillInScores(candidate.skillScores, cs.skillName);
                              return skill?.dataAvailable !== false && skill?.score != null;
                            }).length;
                            const allMet = criticalSkillsMet === totalCritical && totalCritical > 0;
                            
                            return (
                              <td key={candidate.userId} className={`text-center p-2 md:p-3 ${idx === 0 && !hasInsufficientData ? 'bg-muted/30' : hasInsufficientData ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
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
                                    {allMet && assessedCritical === totalCritical && <Badge variant="secondary" className="ml-2">All Met</Badge>}
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

          {/* Critical Skills Deep Dive — uses component-level multiCriticalSkillNames */}
          {(() => {
            const roleSkills = effectiveComparison!.roleSnapshot.requiredSkillScores;

            const criticalSkillsData: CriticalSkillMultiData[] = [];

            const processCategory = (skillsMap: Record<string, number> | undefined, category: 'fit' | 'ai_readiness' | 'prompt_architecture' | 'aiq') => {
              if (!skillsMap) return;
              Object.entries(skillsMap).forEach(([skillName, requiredScore]) => {
                if (multiCriticalSkillNames.has(skillName)) {
                  const candidates = effectiveComparison!.candidateEntries.map(candidate => {
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
                    category,
                    candidates,
                  });
                }
              });
            };

            processCategory(roleSkills?.fitSkills as Record<string, number> | undefined, 'fit');
            processCategory(roleSkills?.aiReadinessSkills as Record<string, number> | undefined, 'ai_readiness');
            processCategory(roleSkills?.promptArchitectureSkills as Record<string, number> | undefined, 'prompt_architecture');
            processCategory(roleSkills?.aiqSkills as Record<string, number> | undefined, 'aiq');

            criticalSkillsData.sort((a, b) => b.requiredScore - a.requiredScore);

            if (criticalSkillsData.length === 0) return null;
            
            return (
              <MultiCandidateCriticalSkillsAnalysis 
                skills={criticalSkillsData}
                roleName={effectiveComparison!.roleSnapshot.roleName}
              />
            );
          })()}

          {/* Skill Gap Heatmap */}
          {(() => {
            const roleSnap = effectiveComparison!.roleSnapshot;
            const reqSkills = roleSnap.requiredSkillScores;
            const skillCriticality = (reqSkills?.skillCriticality || {}) as Record<string, string>;
            const allHeatmapSkills: Array<{ skillName: string; requiredScore: number; criticality: string }> = [];

            if (reqSkills?.fitSkills) {
              Object.entries(reqSkills.fitSkills).forEach(([name, req]) => {
                if (typeof req === 'number') {
                  allHeatmapSkills.push({ skillName: name, requiredScore: req, criticality: skillCriticality[name] || 'standard' });
                }
              });
            }
            if (reqSkills?.aiReadinessSkills) {
              Object.entries(reqSkills.aiReadinessSkills).forEach(([name, req]) => {
                if (typeof req === 'number') {
                  allHeatmapSkills.push({ skillName: name, requiredScore: req, criticality: skillCriticality[name] || 'standard' });
                }
              });
            }
            allHeatmapSkills.sort((a, b) => b.requiredScore - a.requiredScore);

            if (allHeatmapSkills.length === 0) return null;

            const sortedCandidates = [...effectiveComparison!.candidateEntries]
              .filter((c: CandidateEntry) => c.overallFit != null)
              .sort((a: CandidateEntry, b: CandidateEntry) => (b.overallFit ?? 0) - (a.overallFit ?? 0));

            return (
              <Card data-testid="card-skill-gap-heatmap" data-report-section="skill-gap-heatmap">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Target className="h-4 w-4 md:h-5 md:w-5" />
                    Skill Gap Heatmap
                  </CardTitle>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Visual overview of candidate scores across all required skills for <span className="font-medium">{roleSnap.roleName}</span>. Green indicates the candidate meets or exceeds the requirement, yellow is close but below, and red signals a significant gap.
                  </p>
                </CardHeader>
                <CardContent className="p-2 md:p-6">
                  <div className="overflow-x-auto -mx-2 md:mx-0">
                    <table className="w-full border-collapse text-xs md:text-sm" data-testid="table-skill-gap-heatmap">
                      <thead>
                        <tr className="bg-blue-500 text-white">
                          <th className="text-left p-2 md:p-3 font-medium min-w-[140px] md:min-w-[200px] rounded-tl-md" data-testid="th-heatmap-skill">Skill</th>
                          <th className="text-center p-2 md:p-3 font-medium min-w-[40px] md:min-w-[50px]" data-testid="th-heatmap-req">Req</th>
                          {sortedCandidates.map((c: CandidateEntry, i: number) => (
                            <th key={c.userId} data-testid={`th-heatmap-candidate-${c.userId}`} className={`text-center p-2 md:p-3 font-medium min-w-[60px] md:min-w-[80px] ${i === sortedCandidates.length - 1 ? 'rounded-tr-md' : ''}`}>
                              {(c.userName || '').split(' ')[0]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allHeatmapSkills.map((skill, si) => {
                          const isCritical = skill.criticality === 'critical';
                          return (
                            <tr key={skill.skillName} className={si % 2 === 0 ? 'bg-muted/20' : ''} data-testid={`row-heatmap-skill-${si}`}>
                              <td className={`p-2 md:p-3 ${isCritical ? 'font-semibold' : ''} border-b border-border/50`} data-testid={`td-heatmap-skillname-${si}`}>
                                <div className="flex items-center gap-1.5">
                                  <span>{skill.skillName}</span>
                                  {isCritical && (
                                    <span className="inline-block w-2 h-2 rounded-full bg-red-500 shrink-0" title="Critical skill" />
                                  )}
                                </div>
                              </td>
                              <td className="p-2 md:p-3 text-center text-muted-foreground border-b border-border/50">
                                {skill.requiredScore}+
                              </td>
                              {sortedCandidates.map((candidate: CandidateEntry) => {
                                const skillData = candidate.skillScores?.find((s: any) => s.skillName === skill.skillName);
                                const score = skillData?.score;
                                const hasScore = score !== undefined && score !== null;
                                const meetsReq = hasScore && score >= skill.requiredScore;
                                const isClose = hasScore && !meetsReq && score >= 60;

                                let cellBg = '';
                                let cellText = '';
                                if (!hasScore) {
                                  cellBg = 'bg-muted/50';
                                  cellText = 'text-muted-foreground';
                                } else if (meetsReq) {
                                  cellBg = 'bg-green-100 dark:bg-green-900/30';
                                  cellText = 'text-green-700 dark:text-green-400';
                                } else if (isClose) {
                                  cellBg = 'bg-yellow-100 dark:bg-yellow-900/30';
                                  cellText = 'text-yellow-700 dark:text-yellow-400';
                                } else {
                                  cellBg = 'bg-red-100 dark:bg-red-900/30';
                                  cellText = 'text-red-700 dark:text-red-400';
                                }

                                return (
                                  <td key={candidate.userId} className="p-1 md:p-2 text-center border-b border-border/50" data-testid={`td-heatmap-score-${si}-${candidate.userId}`}>
                                    <span className={`inline-block px-2 py-0.5 rounded font-semibold ${cellBg} ${cellText}`}>
                                      {hasScore ? score : '—'}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800" />
                      <span>Meets required</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800" />
                      <span>Close (60+)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800" />
                      <span>Below threshold</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                      <span>Critical skill</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Prompt Architecture Comparison Section */}
          {(() => {
            const paRoleSkills = effectiveComparison!.roleSnapshot.requiredSkillScores || {};
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
                const candidatesWithPA = effectiveComparison!.candidateEntries.filter(
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
                        {effectiveComparison!.candidateEntries.map((candidate: CandidateEntry, idx: number) => {
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
            const aiqRoleSkills = effectiveComparison!.roleSnapshot.requiredSkillScores || {};
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
                const candidatesWithAIQ = effectiveComparison!.candidateEntries.filter(
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
                        {effectiveComparison!.candidateEntries.map((candidate: CandidateEntry, idx: number) => {
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
              {effectiveComparison?.aiInsights ? (
                <div className="space-y-4" data-testid="text-ai-insights">
                  {(() => {
                    const lines = effectiveComparison.aiInsights!.split('\n');
                    const elements: JSX.Element[] = [];
                    let bulletBuffer: string[] = [];
                    let lineIdx = 0;

                    const flushBullets = () => {
                      if (bulletBuffer.length > 0) {
                        elements.push(
                          <ul key={`bullets-${lineIdx}`} className="space-y-1.5 ml-4">
                            {bulletBuffer.map((b, bi) => (
                              <li key={bi} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                                <span dangerouslySetInnerHTML={{ __html: b.replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>') }} />
                              </li>
                            ))}
                          </ul>
                        );
                        bulletBuffer = [];
                      }
                    };

                    const renderInlineBold = (text: string) => {
                      return text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>');
                    };

                    const stripEmoji = (text: string) => {
                      return text.replace(/[^\x00-\x7F\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/g, '').replace(/\s{2,}/g, ' ').trim();
                    };

                    lines.forEach((line, li) => {
                      lineIdx = li;
                      const trimmed = line.trim();
                      if (!trimmed) {
                        flushBullets();
                        return;
                      }

                      const h3Match = trimmed.match(/^###\s+(.+)/);
                      if (h3Match) {
                        flushBullets();
                        elements.push(
                          <h5 key={`h3-${li}`} className="font-semibold text-foreground text-sm mt-3 mb-1">
                            {stripEmoji(h3Match[1])}
                          </h5>
                        );
                        return;
                      }

                      const h2Match = trimmed.match(/^#{1,2}\s+(.+)/);
                      if (h2Match) {
                        flushBullets();
                        elements.push(
                          <h4 key={`h-${li}`} className="font-bold text-foreground text-base mt-4 mb-1">
                            {stripEmoji(h2Match[1])}
                          </h4>
                        );
                        return;
                      }

                      const boldHeadingMatch = trimmed.match(/^\*\*(.+?)\*\*\s*$/);
                      if (boldHeadingMatch) {
                        flushBullets();
                        elements.push(
                          <h5 key={`bh-${li}`} className="font-semibold text-foreground text-sm mt-3 mb-1">
                            {stripEmoji(boldHeadingMatch[1])}
                          </h5>
                        );
                        return;
                      }

                      const bulletMatch = trimmed.match(/^[-*]\s+(.+)/);
                      if (bulletMatch) {
                        bulletBuffer.push(stripEmoji(bulletMatch[1]));
                        return;
                      }

                      const numberedMatch = trimmed.match(/^\d+\.\s+(.+)/);
                      if (numberedMatch) {
                        bulletBuffer.push(stripEmoji(numberedMatch[1]));
                        return;
                      }

                      flushBullets();
                      elements.push(
                        <p key={`p-${li}`} className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: renderInlineBold(stripEmoji(trimmed)) }} />
                      );
                    });
                    flushBullets();
                    return elements;
                  })()}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-purple-500/30" />
                  <p className="text-sm">AI insights will appear here once the analysis completes.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recommended Next Steps - Data-Driven */}
          {(() => {
            const steps = generateDynamicNextSteps(effectiveComparison);
            const roleName = effectiveComparison!.roleSnapshot.roleName;
            if (steps.length === 0) return null;

            return (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Recommended Next Steps
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tailored action items based on assessment data for the {roleName} role
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-medium mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <div className="text-sm font-medium text-foreground">{step.title}</div>
                          <div className="text-sm text-muted-foreground mt-0.5">{step.detail}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })()}

          <AdditionalServicesSection enquiryContext="Multi-Candidate Role Fit - Premium Services" />

          {/* Skills Legend */}
          <SkillsLegend />

          {/* Export PDF and Back to Top Buttons - Bottom of Dashboard */}
          <div className="flex justify-end gap-4 pt-6 pb-4 rounded-lg bg-card border border-border p-3">
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

    </div>
  );
}
