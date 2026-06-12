import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Users, Target, TrendingUp, TrendingDown, Minus, Download,
  RefreshCw, Brain, BarChart3, Search, Sparkles, AlertCircle, UserCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import SkillsLegend from "@/components/SkillsLegend";

// ============================================================================
// Types
// ============================================================================

interface CandidateResult {
  id: string;
  assessmentType: string;
  totalScore: number;
  scores: Record<string, number>;
  completedAt: string;
  status: string;
}

interface CandidateData {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    externalUserId?: string;
  };
  results: CandidateResult[];
}

export type Outlier = 'above' | 'below' | null;

export interface SkillRow {
  skillName: string;
  teamAverage: number | null;
  candidateScore: number | null;
  delta: number | null;
  teamMin?: number | null;
  teamMax?: number | null;
  outlier?: Outlier;
}

export interface SkillSection {
  hasData: boolean;
  skills: SkillRow[];
  teamAverage: number | null;
  candidateScore: number | null;
  delta: number | null;
  teamMembersWithData: number;
}

export interface OverallSection {
  hasData: boolean;
  teamAverage: number | null;
  candidateScore: number | null;
  delta: number | null;
  teamMin?: number | null;
  teamMax?: number | null;
  outlier?: Outlier;
  teamMembersWithData: number;
}

export interface DeviationItem {
  label: string;
  category: string;
  delta: number;
}

export interface DeviationSummary {
  aboveTeam: DeviationItem[];
  belowTeam: DeviationItem[];
}

export interface CohortBenchmarkData {
  targetCandidate: { id: string; name: string; email: string };
  teamMembers: { id: string; name: string; email: string }[];
  teamName: string;
  fit: SkillSection;
  aiReadiness: SkillSection;
  promptArchitecture: OverallSection;
  aiq: OverallSection;
  deviationSummary?: DeviationSummary;
  overall: { teamAverage: number | null; candidateScore: number | null; delta: number | null };
  aiInsights: string | null;
  generatedAt?: string;
  reportId?: string;
  cached?: boolean;
}

export interface SharedCohortBenchmarkConfig {
  candidatesEndpoint: string;
  benchmarkEndpoint: string;
}

interface SharedCohortBenchmarkProps {
  config: SharedCohortBenchmarkConfig;
  staticData?: { benchmark: CohortBenchmarkData };
}

// ============================================================================
// Helpers
// ============================================================================

const candidateName = (c: CandidateData): string => {
  const n = [c.user.firstName, c.user.lastName].filter(Boolean).join(" ").trim();
  return n || c.user.email || c.user.id;
};

const latestByType = (c: CandidateData): Record<string, CandidateResult> => {
  const latest: Record<string, CandidateResult> = {};
  c.results
    .filter(r => r.status === "completed")
    .forEach(r => {
      const prev = latest[r.assessmentType];
      if (!prev || new Date(r.completedAt) > new Date(prev.completedAt)) {
        latest[r.assessmentType] = r;
      }
    });
  return latest;
};

const candidateOverall = (c: CandidateData): number | null => {
  const latest = latestByType(c);
  const vals: number[] = [];
  Object.values(latest).forEach(r => {
    if (r.assessmentType === "fit" || r.assessmentType === "ai_readiness") {
      const s = Object.values(r.scores || {}).filter(v => typeof v === "number");
      if (s.length) vals.push(s.reduce((a, b) => a + b, 0) / s.length);
    } else if (typeof r.totalScore === "number") {
      vals.push(r.totalScore);
    }
  });
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
};

const candidateCompletedCount = (c: CandidateData): number =>
  new Set(c.results.filter(r => r.status === "completed").map(r => r.assessmentType)).size;

// ============================================================================
// Presentational sub-components
// ============================================================================

// Renders a candidate-vs-team deviation. Green = above the team average, red =
// below — applied consistently across every assessment, including FIT.
function DeltaBadge({
  delta,
  size = "sm",
  suffix = "",
}: {
  delta: number | null;
  size?: "sm" | "lg";
  suffix?: string;
}) {
  const cls = size === "lg" ? "text-xs md:text-sm" : "text-[10px] md:text-xs";
  const suf = suffix ? ` ${suffix}` : "";
  if (delta === null) {
    return <Badge variant="secondary" className={cls} data-testid="badge-delta-nodata">No data</Badge>;
  }
  if (delta === 0) {
    return (
      <Badge variant="secondary" className={`gap-1 ${cls}`} data-testid="badge-delta-neutral">
        <Minus className="h-3 w-3" />in line{suf}
      </Badge>
    );
  }
  const Icon = delta > 0 ? TrendingUp : TrendingDown;
  const value = `${delta > 0 ? "+" : ""}${delta}${suf}`;
  const color = delta > 0 ? "bg-green-600" : "bg-red-600";
  return (
    <Badge
      className={`${color} text-white border-0 gap-1 ${cls}`}
      data-testid={delta > 0 ? "badge-delta-positive" : "badge-delta-negative"}
    >
      <Icon className="h-3 w-3" />{value}
    </Badge>
  );
}

// Small inline note showing whether the candidate sits inside or outside the
// team's observed range (a quick "is this a true outlier?" signal).
function OutlierNote({
  outlier,
  hasRange = true,
}: {
  outlier?: Outlier;
  hasRange?: boolean;
}) {
  if (!outlier) {
    if (!hasRange) {
      return (
        <span className="text-[10px] md:text-xs text-muted-foreground" data-testid="text-outlier-unavailable">
          Range unavailable
        </span>
      );
    }
    return (
      <span className="text-[10px] md:text-xs text-muted-foreground" data-testid="text-outlier-within">
        Within team range
      </span>
    );
  }
  const label = outlier === "above" ? "Above team range" : "Below team range";
  const colorCls = outlier === "above"
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
  return (
    <span className={`text-[10px] md:text-xs font-medium ${colorCls}`} data-testid={`text-outlier-${outlier}`}>
      {label}
    </span>
  );
}

function ComparisonBar({
  label,
  teamAverage,
  candidateScore,
  delta,
  teamMin,
  teamMax,
  outlier,
  targetLabel,
  testId,
}: {
  label: string;
  teamAverage: number | null;
  candidateScore: number | null;
  delta: number | null;
  teamMin?: number | null;
  teamMax?: number | null;
  outlier?: Outlier;
  targetLabel: string;
  testId: string;
}) {
  const hasRange = typeof teamMin === "number" && typeof teamMax === "number";
  return (
    <div className="space-y-1.5" data-testid={testId}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs md:text-sm font-medium" data-testid={`text-skill-name-${testId}`}>{label}</span>
        <DeltaBadge delta={delta} suffix="vs team" />
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] md:text-xs text-muted-foreground w-16 md:w-32 flex-shrink-0 truncate">Team Avg</span>
          <Progress
            value={teamAverage ?? 0}
            className="h-2 md:h-2.5 bg-blue-100 dark:bg-blue-950"
            indicatorClassName="bg-blue-300 dark:bg-blue-400"
          />
          <span className="text-[10px] md:text-xs font-semibold w-7 md:w-9 text-right">{teamAverage ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] md:text-xs text-muted-foreground w-16 md:w-32 flex-shrink-0 truncate" title={targetLabel}>{targetLabel}</span>
          <Progress
            value={candidateScore ?? 0}
            className="h-2 md:h-2.5 bg-blue-100 dark:bg-blue-950"
            indicatorClassName="bg-blue-600 dark:bg-blue-500"
          />
          <span className="text-[10px] md:text-xs font-semibold w-7 md:w-9 text-right">{candidateScore ?? "—"}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
        {hasRange ? (
          <span className="text-[10px] md:text-xs text-muted-foreground" data-testid={`text-team-range-${testId}`}>
            Team range {teamMin}–{teamMax}
          </span>
        ) : (
          <span />
        )}
        <OutlierNote outlier={outlier} hasRange={hasRange} />
      </div>
    </div>
  );
}

function AiNarrative({ text }: { text: string | null }) {
  if (!text) {
    return (
      <div className="text-center py-8 text-muted-foreground" data-testid="text-ai-insights-empty">
        <Brain className="h-12 w-12 mx-auto mb-4 text-blue-500/30" />
        <p className="text-sm">AI insights are unavailable for this benchmark.</p>
      </div>
    );
  }

  // Safely render **bold** segments as React nodes (no HTML injection).
  const renderInlineBold = (t: string): React.ReactNode[] =>
    t.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
      const m = part.match(/^\*\*([^*]+)\*\*$/);
      return m ? (
        <strong key={i} className="text-foreground font-semibold">{m[1]}</strong>
      ) : (
        <span key={i}>{part}</span>
      );
    });
  const stripEmoji = (t: string) =>
    t.replace(/[^\x00-\x7F\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/g, "").replace(/\s{2,}/g, " ").trim();

  const lines = text.split("\n");
  const elements: JSX.Element[] = [];
  let bulletBuffer: string[] = [];
  let lineIdx = 0;

  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      elements.push(
        <ul key={`bullets-${lineIdx}`} className="space-y-1.5 ml-4">
          {bulletBuffer.map((b, bi) => (
            <li key={bi} className="text-xs md:text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/50 flex-shrink-0" />
              <span>{renderInlineBold(b)}</span>
            </li>
          ))}
        </ul>
      );
      bulletBuffer = [];
    }
  };

  lines.forEach((line, li) => {
    lineIdx = li;
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      return;
    }
    const boldHeadingMatch = trimmed.match(/^\*\*(.+?)\*\*\s*$/);
    if (boldHeadingMatch) {
      flushBullets();
      elements.push(
        <h5 key={`bh-${li}`} className="font-semibold text-foreground text-sm md:text-base mt-3 mb-1">
          {stripEmoji(boldHeadingMatch[1])}
        </h5>
      );
      return;
    }
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      flushBullets();
      elements.push(
        <h5 key={`h-${li}`} className="font-semibold text-foreground text-sm md:text-base mt-3 mb-1">
          {stripEmoji(headingMatch[1])}
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
      <p
        key={`p-${li}`}
        className="text-xs md:text-sm text-muted-foreground leading-relaxed"
      >
        {renderInlineBold(stripEmoji(trimmed))}
      </p>
    );
  });
  flushBullets();

  return (
    <div className="space-y-3" data-testid="text-ai-insights">
      {elements}
    </div>
  );
}

// Highlights the dimensions where the candidate deviates most from the team —
// the headline takeaway that replaces the old single "overall score".
function DeviationColumn({
  title,
  items,
  emptyText,
  testId,
}: {
  title: string;
  items: DeviationItem[];
  emptyText: string;
  testId: string;
}) {
  return (
    <div data-testid={testId}>
      <h4 className="text-xs md:text-sm font-semibold text-foreground mb-2">{title}</h4>
      {items.length ? (
        <div className="space-y-1.5">
          {items.map((d, i) => (
            <div
              key={`${d.category}-${d.label}-${i}`}
              className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1.5"
              data-testid={`deviation-item-${testId}-${i}`}
            >
              <div className="min-w-0">
                <div className="text-xs md:text-sm font-medium truncate">{d.label}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground truncate">{d.category}</div>
              </div>
              <DeltaBadge delta={d.delta} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] md:text-xs text-muted-foreground py-2">{emptyText}</p>
      )}
    </div>
  );
}

function DeviationSummaryCard({
  summary,
  targetLabel,
}: {
  summary?: DeviationSummary;
  targetLabel: string;
}) {
  const above = summary?.aboveTeam ?? [];
  const below = summary?.belowTeam ?? [];
  if (!above.length && !below.length) return null;
  return (
    <Card data-testid="card-deviation-summary">
      <CardHeader className="p-3 md:p-6">
        <CardTitle className="text-sm md:text-lg flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          Where {targetLabel} Differs Most From the Team
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          The dimensions with the largest gaps from the team's profile — where this candidate stands out most
          relative to the team.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <DeviationColumn
            title="Higher than the team"
            items={above}
            emptyText="No dimensions notably above the team."
            testId="list-deviation-above"
          />
          <DeviationColumn
            title="Lower than the team"
            items={below}
            emptyText="No dimensions notably below the team."
            testId="list-deviation-below"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main component
// ============================================================================

export function SharedCohortBenchmark({ config, staticData }: SharedCohortBenchmarkProps) {
  const isStaticMode = !!staticData;
  const { toast } = useToast();

  const [targetId, setTargetId] = useState<string>("");
  const [teamIds, setTeamIds] = useState<Set<string>>(new Set());
  const [teamName, setTeamName] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<"score" | "name">("score");
  const [liveResult, setLiveResult] = useState<CohortBenchmarkData | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: candidates = [], isLoading: candidatesLoading } = useQuery<CandidateData[]>({
    queryKey: [config.candidatesEndpoint],
    enabled: !isStaticMode,
  });

  const eligible = useMemo(
    () => candidates.filter(c => candidateCompletedCount(c) > 0),
    [candidates],
  );

  const teamList = useMemo(() => {
    let list = eligible.filter(c => c.user.id !== targetId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        c => candidateName(c).toLowerCase().includes(q) || (c.user.email || "").toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === "name") return candidateName(a).localeCompare(candidateName(b));
      return (candidateOverall(b) ?? -1) - (candidateOverall(a) ?? -1);
    });
  }, [eligible, targetId, search, sortBy]);

  const runMutation = useMutation({
    mutationFn: async (forceRefresh: boolean) => {
      const res = await apiRequest(
        "POST",
        config.benchmarkEndpoint,
        {
          targetCandidateId: targetId,
          teamCandidateIds: Array.from(teamIds),
          teamName: teamName.trim() || undefined,
          forceRefresh,
        },
        { timeoutMs: 90000 },
      );
      return res.json() as Promise<CohortBenchmarkData>;
    },
    onSuccess: (data) => {
      setLiveResult(data);
      toast({
        title: data.cached ? "Loaded saved benchmark" : "Benchmark complete",
        description: data.cached
          ? "Showing a previously generated analysis (no credit used)."
          : "Team cohort benchmark generated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Benchmark failed",
        description: err?.message || "Failed to run the team cohort benchmark. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onTargetChange = (id: string) => {
    setTargetId(id);
    setTeamIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleTeam = (id: string) => {
    setTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const result = staticData?.benchmark ?? liveResult;
  const canRun = !!targetId && teamIds.size >= 2 && !runMutation.isPending;

  const handleExport = async () => {
    if (!result) return;
    setIsExporting(true);
    try {
      const { exportCohortBenchmarkPDF } = await import("@/lib/pdfExport");
      await exportCohortBenchmarkPDF(result);
    } catch (e) {
      console.error("Cohort benchmark PDF export failed:", e);
      toast({ title: "Export failed", description: "Failed to generate the PDF. Please try again.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  // --------------------------------------------------------------------------
  // Selection UI (live mode only)
  // --------------------------------------------------------------------------
  const renderSelection = () => (
    <Card data-testid="card-cohort-selection">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base md:text-xl">
          <Users className="h-4 w-4 md:h-5 md:w-5 text-cyan-500" />
          Team Cohort Benchmark
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Build a team from your candidates, then compare one target candidate against the team's average scores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-6 p-3 md:p-6">
        {candidatesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : eligible.length < 3 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-cohort">
            <AlertCircle className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="text-sm text-muted-foreground max-w-md">
              You need at least 3 candidates with completed assessments to run a team benchmark
              (one target plus two team members). You currently have {eligible.length}.
            </p>
          </div>
        ) : (
          <>
            {/* Target candidate */}
            <div className="space-y-2">
              <Label className="text-xs md:text-sm flex items-center gap-1.5">
                <Target className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                Target Candidate (the prospective hire)
              </Label>
              <Select value={targetId} onValueChange={onTargetChange}>
                <SelectTrigger data-testid="select-target-candidate" className="text-xs md:text-sm">
                  <SelectValue placeholder="Select a candidate to evaluate" />
                </SelectTrigger>
                <SelectContent>
                  {eligible.map(c => (
                    <SelectItem key={c.user.id} value={c.user.id} data-testid={`option-target-${c.user.id}`}>
                      {candidateName(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team name */}
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Team Name (optional)</Label>
              <Input
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="e.g. Engineering Team"
                className="text-xs md:text-sm"
                data-testid="input-team-name"
              />
            </div>

            {/* Team members */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="text-xs md:text-sm flex items-center gap-1.5">
                  <UserCheck className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                  Team Members ({teamIds.size} selected)
                </Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as "score" | "name")}>
                    <SelectTrigger className="h-8 w-[130px] text-xs" data-testid="select-sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score" data-testid="option-sort-score">Sort by score</SelectItem>
                      <SelectItem value="name" data-testid="option-sort-name">Sort by name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search candidates..."
                  className="pl-8 text-xs md:text-sm"
                  data-testid="input-search-candidates"
                />
              </div>
              <div className="border rounded-md divide-y max-h-72 overflow-y-auto" data-testid="list-team-candidates">
                {teamList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">No candidates match your search.</div>
                ) : (
                  teamList.map(c => {
                    const checked = teamIds.has(c.user.id);
                    return (
                      <label
                        key={c.user.id}
                        className="flex items-center gap-3 p-2.5 md:p-3 cursor-pointer hover-elevate"
                        data-testid={`row-candidate-${c.user.id}`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleTeam(c.user.id)}
                          data-testid={`checkbox-candidate-${c.user.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs md:text-sm font-medium truncate">{candidateName(c)}</div>
                          <div className="text-[10px] md:text-xs text-muted-foreground truncate">{c.user.email}</div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <Button
              onClick={() => runMutation.mutate(false)}
              disabled={!canRun}
              className="w-full md:w-auto"
              data-testid="button-run-benchmark"
            >
              {runMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Run Team Benchmark (3 credits)
                </>
              )}
            </Button>
            {!canRun && !runMutation.isPending && (
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Select a target candidate and at least 2 team members to continue.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  // --------------------------------------------------------------------------
  // Results UI (shared between live & static)
  // --------------------------------------------------------------------------
  const renderResults = (data: CohortBenchmarkData) => {
    const targetLabel = data.targetCandidate.name;
    const skillSections: { title: string; section: SkillSection }[] = [
      { title: "FIT (Behavioral)", section: data.fit },
      { title: "AI Readiness", section: data.aiReadiness },
    ];
    const overallSections: { title: string; section: OverallSection }[] = [
      { title: "Prompt Architecture", section: data.promptArchitecture },
      { title: "AIQ (Ethical AI)", section: data.aiq },
    ];

    return (
      <div className="space-y-4 md:space-y-6" data-testid="cohort-benchmark-results">
        {/* Header / overall */}
        <Card>
          <CardHeader className="p-3 md:p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <CardTitle className="text-base md:text-xl flex items-center gap-2">
                  <Target className="h-4 w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0" />
                  <span className="truncate" data-testid="text-target-name">{targetLabel}</span>
                </CardTitle>
                <CardDescription className="text-xs md:text-sm mt-1">
                  vs <span className="font-medium" data-testid="text-team-name">{data.teamName}</span> ({data.teamMembers.length} members)
                  {data.cached && <Badge variant="secondary" className="ml-2 text-[10px]">Saved</Badge>}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {!isStaticMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runMutation.mutate(true)}
                    disabled={runMutation.isPending}
                    data-testid="button-rerun-benchmark"
                  >
                    {runMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Re-run (3 credits)
                  </Button>
                )}
                <Button size="sm" onClick={handleExport} disabled={isExporting} data-testid="button-export-pdf">
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/40 p-3 md:p-4">
              <p className="text-[11px] md:text-sm text-muted-foreground leading-relaxed" data-testid="text-benchmark-explainer">
                This benchmark shows how <span className="font-medium text-foreground">{targetLabel}</span> deviates from the team
                on each dimension, rather than a single overall score. Across every assessment, green means above the team
                average and red means below.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Deviation summary */}
        <DeviationSummaryCard summary={data.deviationSummary} targetLabel={targetLabel} />

        {/* Skill-based sections */}
        {skillSections.map(({ title, section }) => (
          <Card key={title}>
            <CardHeader className="p-3 md:p-6">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-sm md:text-lg flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  {title}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0 md:pt-0 space-y-3 md:space-y-4">
              {section.hasData ? (
                section.skills.map(row => (
                  <ComparisonBar
                    key={row.skillName}
                    label={row.skillName}
                    teamAverage={row.teamAverage}
                    candidateScore={row.candidateScore}
                    delta={row.delta}
                    teamMin={row.teamMin}
                    teamMax={row.teamMax}
                    outlier={row.outlier}
                    targetLabel={targetLabel}
                    testId={`bar-${title}-${row.skillName}`}
                  />
                ))
              ) : (
                <p className="text-xs md:text-sm text-muted-foreground py-4 text-center">
                  No {title} assessment data available for this comparison.
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Overall-only sections */}
        {overallSections.some(s => s.section.hasData) && (
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-sm md:text-lg flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                Technical Assessments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0 md:pt-0 space-y-3 md:space-y-4">
              {overallSections.map(({ title, section }) =>
                section.hasData ? (
                  <ComparisonBar
                    key={title}
                    label={title}
                    teamAverage={section.teamAverage}
                    candidateScore={section.candidateScore}
                    delta={section.delta}
                    teamMin={section.teamMin}
                    teamMax={section.teamMax}
                    outlier={section.outlier}
                    targetLabel={targetLabel}
                    testId={`bar-overall-${title}`}
                  />
                ) : null,
              )}
            </CardContent>
          </Card>
        )}

        {/* AI narrative */}
        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-sm md:text-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              AI Hiring Analysis
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              How this candidate compares to the team and what it means for your hiring decision.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <AiNarrative text={data.aiInsights} />
          </CardContent>
        </Card>

        <SkillsLegend />
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  if (isStaticMode && result) {
    return renderResults(result);
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {renderSelection()}
      {liveResult && renderResults(liveResult)}
    </div>
  );
}

export default SharedCohortBenchmark;
