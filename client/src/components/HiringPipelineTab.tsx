import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface PipelineSession {
  sessionId: string;
  externalUserId: string | null;
  externalEmail: string | null;
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

interface PipelineData {
  pipeline: Record<string, PipelineSession[]>;
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
  aiReadiness: "AI Readiness",
  promptArchitecture: "Prompt Arch.",
  aiq: "AIQ",
};

export function HiringPipelineTab() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSession, setSelectedSession] = useState<PipelineSession | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [draggedSession, setDraggedSession] = useState<PipelineSession | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const { data: pipelineData, isLoading, refetch } = useQuery<PipelineData>({
    queryKey: ["/api/partner/pipeline"],
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ sessionId, pipelineStage, pipelineNotes }: { sessionId: string; pipelineStage?: string; pipelineNotes?: string }) => {
      return await apiRequest("PATCH", `/api/partner/sessions/${sessionId}/pipeline`, {
        pipelineStage,
        pipelineNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/pipeline"] });
      toast({ title: "Pipeline updated", description: "Candidate stage has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update pipeline", variant: "destructive" });
    },
  });

  const handleDragStart = (e: React.DragEvent, session: PipelineSession) => {
    setDraggedSession(session);
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
    
    if (draggedSession && draggedSession.pipelineStage !== targetStage) {
      await updateStageMutation.mutateAsync({
        sessionId: draggedSession.sessionId,
        pipelineStage: targetStage,
      });
    }
    setDraggedSession(null);
  };

  const handleSaveNotes = async () => {
    if (selectedSession) {
      await updateStageMutation.mutateAsync({
        sessionId: selectedSession.sessionId,
        pipelineNotes: notes,
      });
      setNotesDialogOpen(false);
      setSelectedSession(null);
    }
  };

  const openNotesDialog = (session: PipelineSession) => {
    setSelectedSession(session);
    setNotes(session.pipelineNotes || "");
    setNotesDialogOpen(true);
  };

  const moveToStage = async (session: PipelineSession, targetStage: string) => {
    await updateStageMutation.mutateAsync({
      sessionId: session.sessionId,
      pipelineStage: targetStage,
    });
  };

  const filterSessions = (sessions: PipelineSession[]) => {
    if (!searchQuery.trim()) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(s => 
      s.externalEmail?.toLowerCase().includes(query) ||
      s.externalUserId?.toLowerCase().includes(query) ||
      s.assessmentType.toLowerCase().includes(query)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Hiring Pipeline</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track candidates through your hiring process with drag-and-drop
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[250px]"
              data-testid="input-pipeline-search"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-pipeline">
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const config = stageConfig[stage.id];
          const Icon = config?.icon || User;
          const sessions = filterSessions(pipeline[stage.id] || []);
          const isDropTarget = dragOverStage === stage.id;

          return (
            <div
              key={stage.id}
              className={`min-w-[220px] rounded-lg border ${
                isDropTarget ? "border-primary border-2 bg-primary/5" : "border-border"
              } transition-all`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
              data-testid={`pipeline-column-${stage.id}`}
            >
              <div className={`px-3 py-2 rounded-t-lg ${config?.bgColor || "bg-muted"}`} data-testid={`pipeline-header-${stage.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${config?.color || "text-foreground"}`} />
                    <span className="font-medium text-sm" data-testid={`text-stage-label-${stage.id}`}>{stage.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs" data-testid={`badge-stage-count-${stage.id}`}>
                    {sessions.length}
                  </Badge>
                </div>
              </div>
              <ScrollArea className="h-[500px] p-2">
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <Card
                      key={session.sessionId}
                      className="cursor-grab active:cursor-grabbing hover-elevate"
                      draggable
                      onDragStart={(e) => handleDragStart(e, session)}
                      data-testid={`pipeline-card-${session.sessionId}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-sm truncate" data-testid={`text-candidate-${session.sessionId}`}>
                                {session.externalEmail || session.externalUserId || "Unknown"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {assessmentLabels[session.assessmentType] || session.assessmentType}
                              </Badge>
                              {session.status === "completed" && session.totalScore !== null && (
                                <Badge variant="secondary" className="text-xs">
                                  {session.totalScore}%
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {session.completedAt
                                ? format(new Date(session.completedAt), "MMM d, yyyy")
                                : format(new Date(session.createdAt), "MMM d, yyyy")
                              }
                            </div>
                            {session.pipelineNotes && (
                              <div className="mt-2 text-xs text-muted-foreground truncate flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {session.pipelineNotes.substring(0, 30)}...
                              </div>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`button-card-menu-${session.sessionId}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openNotesDialog(session)} data-testid={`menu-item-notes-${session.sessionId}`}>
                                <FileText className="h-4 w-4 mr-2" />
                                {session.pipelineNotes ? "Edit Notes" : "Add Notes"}
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={`/partner/results/${session.sessionId}`} target="_blank" rel="noopener noreferrer" data-testid={`menu-item-results-${session.sessionId}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Results
                                </a>
                              </DropdownMenuItem>
                              {stages.filter(s => s.id !== session.pipelineStage).map(targetStage => (
                                <DropdownMenuItem
                                  key={targetStage.id}
                                  onClick={() => moveToStage(session, targetStage.id)}
                                  data-testid={`menu-item-move-${session.sessionId}-${targetStage.id}`}
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
                  ))}
                  {sessions.length === 0 && (
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

      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Candidate Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              {selectedSession?.externalEmail || selectedSession?.externalUserId || "Unknown Candidate"}
            </div>
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
    </div>
  );
}
