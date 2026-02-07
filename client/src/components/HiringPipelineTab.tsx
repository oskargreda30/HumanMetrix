import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  User,
  MoreVertical,
  Search,
  ChevronRight,
  ChevronDown,
  GripVertical,
  FileText,
  CheckCircle2,
  Clock,
  UserCheck,
  Star,
  XCircle,
  Eye,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface CandidateSession {
  sessionId: string;
  assessmentType: string;
  status: string;
  pipelineStage: string;
  pipelineNotes: string | null;
  totalScore: number | null;
  percentile: number | null;
  createdAt: string;
  completedAt: string | null;
  pipelineStageUpdatedAt: string | null;
  metadata: Record<string, any> | null;
}

interface PipelineCandidate {
  candidateEmail: string;
  candidateName: string | null;
  externalUserId: string | null;
  pipelineStage: string;
  sessions: CandidateSession[];
  sessionCount: number;
  completedCount: number;
  latestActivity: string;
}

interface PipelineData {
  pipeline: Record<string, PipelineCandidate[]>;
  totalCount: number;
  stages: { id: string; label: string; count: number }[];
}

const stageConfig: Record<string, { icon: typeof User; color: string; bgColor: string }> = {
  new: { icon: User, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950" },
  in_progress: { icon: Clock, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950" },
  completed: { icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-950" },
  reviewing: { icon: Eye, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950" },
  shortlisted: { icon: Star, color: "text-yellow-600", bgColor: "bg-yellow-50 dark:bg-yellow-950" },
  hired: { icon: UserCheck, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950" },
  rejected: { icon: XCircle, color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950" },
};

const assessmentLabels: Record<string, string> = {
  fit: "FIT",
  aiReadiness: "AI Ready",
  ai_readiness: "AI Ready",
  promptArchitecture: "Prompt",
  prompt_architecture: "Prompt",
  aiq: "AIQ",
};

const getScoreBadgeClass = (score: number | null) => {
  if (score === null) return "";
  if (score >= 80) return "bg-green-500/10 text-green-700 border-green-500/30";
  if (score >= 60) return "bg-amber-500/10 text-amber-700 border-amber-500/30";
  return "bg-red-500/10 text-red-700 border-red-500/30";
};

export function HiringPipelineTab() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<PipelineCandidate | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesSessionIds, setNotesSessionIds] = useState<string[]>([]);
  const [draggedCandidate, setDraggedCandidate] = useState<PipelineCandidate | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set(["new", "reviewing", "shortlisted"]));
  
  const toggleStage = useCallback((stageId: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  }, []);

  const { data: pipelineData, isLoading } = useQuery<PipelineData>({
    queryKey: ["/api/partner/pipeline"],
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ sessionIds, pipelineNotes }: { sessionIds: string[]; pipelineNotes: string }) => {
      await Promise.all(
        sessionIds.map(sid =>
          apiRequest("PATCH", `/api/partner/sessions/${sid}/pipeline`, { pipelineNotes })
        )
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/pipeline"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save notes", variant: "destructive" });
    },
  });

  const moveCandidateToStage = useCallback(async (candidate: PipelineCandidate, targetStage: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    await queryClient.cancelQueries({ queryKey: ["/api/partner/pipeline"] });
    
    const previousData = queryClient.getQueryData<PipelineData>(["/api/partner/pipeline"]);
    if (previousData) {
      const newPipeline = { ...previousData.pipeline };
      
      const currentStage = candidate.pipelineStage;
      if (newPipeline[currentStage]) {
        newPipeline[currentStage] = newPipeline[currentStage].filter(c => c.candidateEmail !== candidate.candidateEmail);
      }
      
      const movedCandidate = { ...candidate, pipelineStage: targetStage };
      if (newPipeline[targetStage]) {
        newPipeline[targetStage] = [movedCandidate, ...newPipeline[targetStage]];
      }
      
      const newStages = previousData.stages.map(stage => ({
        ...stage,
        count: newPipeline[stage.id]?.length || 0
      }));
      
      queryClient.setQueryData<PipelineData>(["/api/partner/pipeline"], {
        ...previousData,
        pipeline: newPipeline,
        stages: newStages,
        totalCount: Object.values(newPipeline).reduce((sum, arr) => sum + arr.length, 0),
      });
    }
    
    try {
      await apiRequest("POST", "/api/partner/pipeline/bulk-update", {
        updates: candidate.sessions.map(session => ({
          sessionId: session.sessionId,
          pipelineStage: targetStage,
        })),
      });
      toast({ title: "Success", description: `Moved to ${targetStage.replace('_', ' ')}` });
    } catch (error) {
      if (previousData) {
        queryClient.setQueryData(["/api/partner/pipeline"], previousData);
      }
      toast({ title: "Error", description: "Failed to move candidate", variant: "destructive" });
      console.error("Move failed:", error);
    } finally {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/pipeline"] });
    }
  }, [toast]);

  const handleDragStart = (e: React.DragEvent, candidate: PipelineCandidate) => {
    setDraggedCandidate(candidate);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    
    if (draggedCandidate && draggedCandidate.pipelineStage !== targetStage) {
      await moveCandidateToStage(draggedCandidate, targetStage);
    }
    setDraggedCandidate(null);
  };

  const handleSaveNotes = async () => {
    if (notesSessionIds.length > 0) {
      try {
        await updateStageMutation.mutateAsync({
          sessionIds: notesSessionIds,
          pipelineNotes: notes,
        });
        toast({ title: "Notes saved", description: "Candidate notes have been updated" });
        setNotesDialogOpen(false);
        setNotesSessionIds([]);
      } catch (error) {
        console.error("Failed to save notes:", error);
        toast({ title: "Error", description: "Failed to save notes. Please try again.", variant: "destructive" });
      }
    }
  };

  const openNotesDialog = (candidate: PipelineCandidate) => {
    setNotesSessionIds(candidate.sessions.map(s => s.sessionId));
    const existingNotes = candidate.sessions.find(s => s.pipelineNotes)?.pipelineNotes || "";
    setNotes(existingNotes);
    setNotesDialogOpen(true);
  };

  const openDetailsDialog = (candidate: PipelineCandidate) => {
    setSelectedCandidate(candidate);
    setDetailsDialogOpen(true);
  };

  const filterCandidates = (candidates: PipelineCandidate[]) => {
    if (!searchQuery.trim()) return candidates;
    const query = searchQuery.toLowerCase();
    return candidates.filter(c => 
      c.candidateEmail?.toLowerCase().includes(query) ||
      c.externalUserId?.toLowerCase().includes(query) ||
      c.sessions.some(s => (assessmentLabels[s.assessmentType] || s.assessmentType).toLowerCase().includes(query))
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stages = pipelineData?.stages || [];
  const pipeline = pipelineData?.pipeline || {};

  const renderCandidateCard = (candidate: PipelineCandidate, isMobile: boolean = false) => {
    const hasNotes = candidate.sessions.some(s => s.pipelineNotes);
    
    return (
      <Card
        key={candidate.candidateEmail}
        className="cursor-pointer hover-elevate"
        draggable
        onDragStart={(e) => handleDragStart(e, candidate)}
        onClick={() => openDetailsDialog(candidate)}
        data-testid={`pipeline-card-${isMobile ? 'mobile-' : ''}${candidate.candidateEmail.replace(/[^a-zA-Z0-9]/g, '_')}`}
      >
        <CardContent className={isMobile ? "p-3" : "p-2"}>
          <div className="flex items-start justify-between gap-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-1 mb-1">
                <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0 cursor-grab mt-0.5" />
                <div className="min-w-0">
                  {candidate.candidateName && (
                    <span className={`font-medium block ${isMobile ? 'text-sm truncate' : 'text-xs truncate'}`} data-testid={`text-candidate-name-${candidate.candidateEmail.replace(/[^a-zA-Z0-9]/g, '_')}`}>
                      {candidate.candidateName}
                    </span>
                  )}
                  <span className={`${candidate.candidateName ? 'text-muted-foreground' : 'font-medium'} ${isMobile ? 'text-sm truncate' : 'text-[11px] break-all leading-tight'}`} title={candidate.candidateEmail} data-testid={`text-candidate-email-${candidate.candidateEmail.replace(/[^a-zA-Z0-9]/g, '_')}`}>
                    {candidate.candidateEmail}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-wrap mb-1">
                {candidate.sessions.map((session) => (
                  <Badge 
                    key={session.sessionId}
                    variant="outline" 
                    className={`text-[10px] px-1.5 py-0 ${
                      session.status === 'completed' && session.totalScore !== null 
                        ? getScoreBadgeClass(session.totalScore)
                        : ''
                    }`}
                    data-testid={`badge-assessment-${session.sessionId}`}
                  >
                    {assessmentLabels[session.assessmentType] || session.assessmentType}
                    {session.status === 'completed' && session.totalScore !== null && (
                      <span className="ml-1 font-semibold">{session.totalScore}%</span>
                    )}
                  </Badge>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                <span>{format(new Date(candidate.latestActivity), "MMM d, yyyy")}</span>
                {candidate.completedCount > 0 && (
                  <span className="text-green-600">{candidate.completedCount}/{candidate.sessionCount} done</span>
                )}
              </div>
              {hasNotes && (
                <div className="mt-1 text-[10px] text-muted-foreground truncate flex items-center gap-1">
                  <FileText className="h-2.5 w-2.5" />
                  {candidate.sessions.find(s => s.pipelineNotes)?.pipelineNotes?.substring(0, 25)}...
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()} data-testid={`button-card-menu-${candidate.candidateEmail.replace(/[^a-zA-Z0-9]/g, '_')}`}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onSelect={(e) => e.preventDefault()}
                  onClick={(e) => { e.stopPropagation(); openNotesDialog(candidate); }} 
                  data-testid={`menu-item-notes-${candidate.candidateEmail.replace(/[^a-zA-Z0-9]/g, '_')}`}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {hasNotes ? "Edit Notes" : "Add Notes"}
                </DropdownMenuItem>
                {candidate.sessions.filter(s => s.status === 'completed').length > 0 && (
                  <DropdownMenuItem asChild>
                    <a 
                      href={`/partner/results/${candidate.sessions.find(s => s.status === 'completed')?.sessionId}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      data-testid={`menu-item-results-${candidate.candidateEmail.replace(/[^a-zA-Z0-9]/g, '_')}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Results
                    </a>
                  </DropdownMenuItem>
                )}
                {stages.filter(s => s.id !== candidate.pipelineStage).map(targetStage => (
                  <DropdownMenuItem
                    key={targetStage.id}
                    onClick={(e) => moveCandidateToStage(candidate, targetStage.id, e)}
                    data-testid={`menu-item-move-${candidate.candidateEmail.replace(/[^a-zA-Z0-9]/g, '_')}-${targetStage.id}`}
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Move to {targetStage.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Hiring Pipeline</h2>
          <p className="text-sm text-white/70 mt-1">
            Track candidates through your hiring process with drag-and-drop
          </p>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <Input
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            data-testid="input-pipeline-search"
          />
        </div>
      </div>

      {/* Desktop: Horizontal kanban grid */}
      <div className="hidden md:flex gap-2 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const config = stageConfig[stage.id];
          const Icon = config?.icon || User;
          const candidates = filterCandidates(pipeline[stage.id] || []);
          const isDropTarget = dragOverStage === stage.id;

          return (
            <div
              key={stage.id}
              className={`flex-1 min-w-[180px] max-w-[220px] rounded-lg border ${
                isDropTarget ? "border-primary border-2 bg-primary/5" : "border-border"
              } transition-all`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
              data-testid={`pipeline-column-${stage.id}`}
            >
              <div className={`px-2 py-2 rounded-t-lg ${config?.bgColor || "bg-muted"}`} data-testid={`pipeline-header-${stage.id}`}>
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-4 w-4 flex-shrink-0 ${config?.color || "text-foreground"}`} />
                  <span className="font-medium text-xs truncate" data-testid={`text-stage-label-${stage.id}`}>{stage.label}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0" data-testid={`badge-stage-count-${stage.id}`}>
                    ({candidates.length})
                  </span>
                </div>
              </div>
              <ScrollArea className="h-[500px] p-2">
                <div className="space-y-2">
                  {candidates.map((candidate) => renderCandidateCard(candidate, false))}
                  {candidates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm" data-testid={`empty-state-${stage.id}`}>
                      No candidates
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Mobile: Collapsible vertical stacked view */}
      <div className="md:hidden space-y-3">
        {stages.map((stage) => {
          const config = stageConfig[stage.id];
          const Icon = config?.icon || User;
          const candidates = filterCandidates(pipeline[stage.id] || []);
          const isDropTarget = dragOverStage === stage.id;
          const isExpanded = expandedStages.has(stage.id);

          return (
            <Collapsible
              key={stage.id}
              open={isExpanded}
              onOpenChange={() => toggleStage(stage.id)}
            >
              <div
                className={`rounded-lg border ${
                  isDropTarget ? "border-primary border-2 bg-primary/5" : "border-border"
                } transition-all overflow-hidden`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
                data-testid={`pipeline-column-mobile-${stage.id}`}
              >
                <CollapsibleTrigger asChild>
                  <button 
                    className={`w-full px-4 py-3 ${config?.bgColor || "bg-muted"} ${isExpanded ? '' : 'rounded-b-lg'}`}
                    data-testid={`toggle-stage-${stage.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 flex-shrink-0 ${config?.color || "text-foreground"}`} />
                        <span className="font-medium text-sm">{stage.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {candidates.length}
                        </Badge>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {candidates.length > 0 ? (
                    <div className="p-3 space-y-2 bg-card">
                      {candidates.map((candidate) => renderCandidateCard(candidate, true))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-sm bg-card">
                      No candidates in this stage
                    </div>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Candidate Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Add notes about this candidate..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[150px]"
              data-testid="textarea-candidate-notes"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)} data-testid="button-cancel-notes">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveNotes} 
              disabled={updateStageMutation.isPending}
              data-testid="button-save-notes"
            >
              {updateStageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Candidate Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Candidate Details</DialogTitle>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-4 py-2">
              <div className="space-y-3">
                {selectedCandidate.candidateName && (
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium" data-testid="text-detail-candidate-name">{selectedCandidate.candidateName}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedCandidate.candidateEmail || "Not provided"}</p>
                </div>
                {selectedCandidate.externalUserId && (
                  <div>
                    <p className="text-xs text-muted-foreground">User ID</p>
                    <p className="font-medium text-sm">{selectedCandidate.externalUserId}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Pipeline Stage</p>
                  <Badge variant="outline">
                    {stages.find(s => s.id === selectedCandidate.pipelineStage)?.label || selectedCandidate.pipelineStage}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Assessments ({selectedCandidate.sessionCount})</p>
                  <div className="space-y-2">
                    {selectedCandidate.sessions.map((session) => (
                      <div key={session.sessionId} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {assessmentLabels[session.assessmentType] || session.assessmentType}
                          </Badge>
                          <Badge variant={session.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                            {session.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {session.status === "completed" && session.totalScore !== null && (
                            <span className="text-sm font-bold">{session.totalScore}%</span>
                          )}
                          {session.status === "completed" && (
                            <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
                              <a href={`/partner/results/${session.sessionId}`} target="_blank" rel="noopener noreferrer" data-testid={`button-view-session-${session.sessionId}`}>
                                <Eye className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Latest Activity</p>
                  <p className="text-sm">
                    {format(new Date(selectedCandidate.latestActivity), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                {selectedCandidate.sessions.some(s => s.pipelineNotes) && (
                  <div>
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-sm bg-muted p-2 rounded">
                      {selectedCandidate.sessions.find(s => s.pipelineNotes)?.pipelineNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)} data-testid="button-close-details">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
