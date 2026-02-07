import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Bug,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  Clock,
  User,
  Mail,
  Trash2,
  Image,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import type { BugReport, BugStatus } from "@shared/schema";
import { BUG_STATUS_ORDER, BUG_STATUS_LABELS } from "@shared/schema";

const SEVERITY_CONFIG: Record<string, { color: string; bgClass: string; label: string }> = {
  critical: { color: "text-red-400", bgClass: "bg-red-500/20 text-red-300 border-red-500/30", label: "Critical" },
  high: { color: "text-orange-400", bgClass: "bg-orange-500/20 text-orange-300 border-orange-500/30", label: "High" },
  medium: { color: "text-yellow-400", bgClass: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", label: "Medium" },
  low: { color: "text-blue-400", bgClass: "bg-blue-500/20 text-blue-300 border-blue-500/30", label: "Low" },
};

const STATUS_COLORS: Record<string, string> = {
  new: "border-cyan-500/50",
  in_progress: "border-blue-500/50",
  under_review: "border-purple-500/50",
  resolved: "border-green-500/50",
  closed: "border-gray-500/50",
};

const STATUS_HEADER_COLORS: Record<string, string> = {
  new: "bg-cyan-500/20 text-cyan-300",
  in_progress: "bg-blue-500/20 text-blue-300",
  under_review: "bg-purple-500/20 text-purple-300",
  resolved: "bg-green-500/20 text-green-300",
  closed: "bg-gray-500/20 text-gray-400",
};

function BugCard({ bug, onView, onMove }: {
  bug: BugReport;
  onView: () => void;
  onMove: (newStatus: BugStatus) => void;
}) {
  const severityConfig = SEVERITY_CONFIG[bug.severity] || SEVERITY_CONFIG.medium;
  const currentIdx = BUG_STATUS_ORDER.indexOf(bug.status as BugStatus);
  const canMoveForward = currentIdx < BUG_STATUS_ORDER.length - 1;
  const canMoveBack = currentIdx > 0;

  return (
    <Card
      className="p-3 bg-white/5 border-white/10 hover-elevate cursor-pointer group"
      onClick={onView}
      data-testid={`card-bug-${bug.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-white line-clamp-2 flex-1" data-testid={`text-bug-title-${bug.id}`}>
          {bug.title}
        </h4>
        <Badge variant="outline" className={`${severityConfig.bgClass} text-[10px] shrink-0`} data-testid={`badge-severity-${bug.id}`}>
          {severityConfig.label}
        </Badge>
      </div>

      <p className="text-xs text-white/50 line-clamp-2 mb-3">
        {bug.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-white/40">
          <User className="h-3 w-3" />
          <span className="truncate max-w-[100px]">{bug.reporterName}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-white/40">
          <Clock className="h-3 w-3" />
          <span>{new Date(bug.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
        {canMoveBack && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-white/40 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onMove(BUG_STATUS_ORDER[currentIdx - 1]);
            }}
            data-testid={`button-move-back-${bug.id}`}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
        )}
        <div className="flex-1" />
        {canMoveForward && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-white/40 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onMove(BUG_STATUS_ORDER[currentIdx + 1]);
            }}
            data-testid={`button-move-forward-${bug.id}`}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function BugReportsTab() {
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();

  const { data: bugs = [], isLoading } = useQuery<BugReport[]>({
    queryKey: ["/api/admin/bug-reports"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status?: string; adminNotes?: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/bug-reports/${id}`, { status, adminNotes });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bug-reports"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update bug report",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/bug-reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bug-reports"] });
      setSelectedBug(null);
      toast({ title: "Bug report deleted" });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete bug report",
        variant: "destructive",
      });
    },
  });

  const handleMoveStatus = (bugId: string, newStatus: BugStatus) => {
    updateMutation.mutate({ id: bugId, status: newStatus });
  };

  const handleSaveNotes = () => {
    if (!selectedBug) return;
    updateMutation.mutate(
      { id: selectedBug.id, adminNotes },
      {
        onSuccess: (updated) => {
          setSelectedBug(updated);
          toast({ title: "Notes saved" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" data-testid="loader-bug-reports" />
      </div>
    );
  }

  const bugsByStatus: Record<string, BugReport[]> = {};
  for (const status of BUG_STATUS_ORDER) {
    bugsByStatus[status] = bugs.filter((b) => b.status === status);
  }

  const totalBugs = bugs.length;
  const openBugs = bugs.filter((b) => b.status !== "closed" && b.status !== "resolved").length;
  const criticalBugs = bugs.filter((b) => b.severity === "critical" && b.status !== "closed" && b.status !== "resolved").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-cyan-500/20">
              <Bug className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white" data-testid="text-total-bugs">{totalBugs}</p>
              <p className="text-xs text-white/50">Total Reports</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-yellow-500/20">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white" data-testid="text-open-bugs">{openBugs}</p>
              <p className="text-xs text-white/50">Open</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white" data-testid="text-critical-bugs">{criticalBugs}</p>
              <p className="text-xs text-white/50">Critical Open</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" data-testid="kanban-board">
        {BUG_STATUS_ORDER.map((status) => (
          <div
            key={status}
            className="flex-shrink-0 w-64"
            data-testid={`kanban-column-${status}`}
          >
            <div className={`px-3 py-2 rounded-t-md flex items-center justify-between ${STATUS_HEADER_COLORS[status]}`}>
              <span className="text-sm font-medium">{BUG_STATUS_LABELS[status as BugStatus]}</span>
              <Badge variant="secondary" className="bg-white/10 text-white/70 text-xs">
                {bugsByStatus[status]?.length || 0}
              </Badge>
            </div>
            <div className={`border-x border-b rounded-b-md p-2 space-y-2 min-h-[200px] ${STATUS_COLORS[status]} border-white/10`}>
              {bugsByStatus[status]?.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-8">No bugs</p>
              ) : (
                bugsByStatus[status]?.map((bug) => (
                  <BugCard
                    key={bug.id}
                    bug={bug}
                    onView={() => {
                      setSelectedBug(bug);
                      setAdminNotes(bug.adminNotes || "");
                    }}
                    onMove={(newStatus) => handleMoveStatus(bug.id, newStatus)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedBug} onOpenChange={(open) => { if (!open) setSelectedBug(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-red-500" />
              Bug Report Details
            </DialogTitle>
            <DialogDescription>
              View and manage this bug report
            </DialogDescription>
          </DialogHeader>
          {selectedBug && (
            <div className="space-y-5 mt-2">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className={SEVERITY_CONFIG[selectedBug.severity]?.bgClass || ""}>
                  {SEVERITY_CONFIG[selectedBug.severity]?.label || selectedBug.severity}
                </Badge>
                <Badge variant="outline" className={`${STATUS_HEADER_COLORS[selectedBug.status]} border-white/20`}>
                  {BUG_STATUS_LABELS[selectedBug.status as BugStatus] || selectedBug.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Reported {new Date(selectedBug.createdAt).toLocaleString()}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-semibold" data-testid="text-detail-bug-title">{selectedBug.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{selectedBug.description}</p>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  <span>{selectedBug.reporterName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${selectedBug.reporterEmail}`} className="text-cyan-400 hover:underline">
                    {selectedBug.reporterEmail}
                  </a>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Screenshot</p>
                <div className="border border-border rounded-md overflow-hidden bg-muted">
                  <img
                    src={`/api/bug-reports/screenshot/${selectedBug.id}`}
                    alt="Bug screenshot"
                    className="w-full max-h-96 object-contain"
                    data-testid="img-detail-screenshot"
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  Move to Stage
                </p>
                <div className="flex flex-wrap gap-2">
                  {BUG_STATUS_ORDER.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={selectedBug.status === status ? "default" : "outline"}
                      disabled={selectedBug.status === status || updateMutation.isPending}
                      onClick={() => {
                        updateMutation.mutate(
                          { id: selectedBug.id, status },
                          {
                            onSuccess: (updated) => {
                              setSelectedBug(updated);
                              toast({ title: `Moved to ${BUG_STATUS_LABELS[status as BugStatus]}` });
                            },
                          }
                        );
                      }}
                      data-testid={`button-status-${status}`}
                    >
                      {selectedBug.status === status && <ArrowRight className="h-3 w-3 mr-1" />}
                      {BUG_STATUS_LABELS[status as BugStatus]}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  Admin Notes
                </p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this bug..."
                  rows={3}
                  data-testid="input-admin-notes"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={updateMutation.isPending}
                    data-testid="button-save-notes"
                  >
                    {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Save Notes
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(selectedBug.id)}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-bug"
                >
                  {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                  Delete Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
