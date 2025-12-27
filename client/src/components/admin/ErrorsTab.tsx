import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertTriangle, AlertCircle, Info, XCircle, RefreshCw, Eye, CheckCircle, Clock, Search as SearchIcon, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";

interface ErrorLog {
  id: string;
  message: string;
  stack: string | null;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  status: 'new' | 'investigating' | 'resolved' | 'ignored';
  source: string;
  url: string | null;
  method: string | null;
  statusCode: number | null;
  userId: string | null;
  partnerId: string | null;
  apiKeyId: string | null;
  requestBody: Record<string, any> | null;
  responseBody: Record<string, any> | null;
  metadata: Record<string, any> | null;
  fingerprint: string;
  occurrenceCount: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  notes: string | null;
  createdAt: string;
}

interface ErrorStats {
  totalErrors: number;
  newErrors: number;
  criticalErrors: number;
  errorsByStatus: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  last24Hours: number;
  last7Days: number;
}

type SeverityFilter = 'all' | 'info' | 'warning' | 'error' | 'critical';
type StatusFilter = 'all' | 'new' | 'investigating' | 'resolved' | 'ignored';

export default function ErrorsTab() {
  const { toast } = useToast();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [detailError, setDetailError] = useState<ErrorLog | null>(null);
  const [updateNotes, setUpdateNotes] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<ErrorStats>({
    queryKey: ["/api/admin/errors/stats"],
  });

  const buildQueryUrl = () => {
    const params = new URLSearchParams();
    if (severityFilter !== 'all') params.set('severity', severityFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    params.set('limit', '100');
    const qs = params.toString();
    return `/api/admin/errors${qs ? '?' + qs : ''}`;
  };

  const { data: errors, isLoading: errorsLoading, refetch: refetchErrors } = useQuery<ErrorLog[]>({
    queryKey: [buildQueryUrl()],
  });

  const updateErrorMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      return apiRequest("PATCH", `/api/admin/errors/${id}`, { status, notes });
    },
    onSuccess: () => {
      toast({ title: "Error status updated" });
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key?.startsWith('/api/admin/errors');
      }});
      setSelectedError(null);
      setUpdateNotes("");
      setNewStatus("");
      if (detailError) {
        setDetailError(null);
      }
    },
    onError: () => {
      toast({ title: "Failed to update error", variant: "destructive" });
    },
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      error: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    };
    return (
      <Badge className={variants[severity] || variants.info}>
        {severity}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      new: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      investigating: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      ignored: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };
    return (
      <Badge className={variants[status] || variants.new}>
        {status}
      </Badge>
    );
  };

  const handleRefresh = () => {
    refetchStats();
    refetchErrors();
    toast({ title: "Refreshed error logs" });
  };

  if (detailError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => setDetailError(null)}
            data-testid="button-back-to-errors"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Errors
          </Button>
          <h2 className="text-xl font-semibold">Error Details</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card data-testid="card-error-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getSeverityIcon(detailError.severity)}
                Error Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Severity:</span>
                  <div className="mt-1" data-testid="text-detail-severity">{getSeverityBadge(detailError.severity)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1" data-testid="text-detail-status">{getStatusBadge(detailError.status)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <div className="mt-1 font-mono text-xs" data-testid="text-detail-type">{detailError.type}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Source:</span>
                  <div className="mt-1 font-mono text-xs" data-testid="text-detail-source">{detailError.source}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Occurrences:</span>
                  <div className="mt-1 font-semibold" data-testid="text-detail-occurrences">{detailError.occurrenceCount}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Status Code:</span>
                  <div className="mt-1 font-mono" data-testid="text-detail-statuscode">{detailError.statusCode || 'N/A'}</div>
                </div>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Message:</span>
                <p className="mt-1 p-3 bg-muted rounded-md font-mono text-sm break-all" data-testid="text-detail-message">
                  {detailError.message}
                </p>
              </div>

              {detailError.url && (
                <div>
                  <span className="text-sm text-muted-foreground">URL:</span>
                  <p className="mt-1 p-2 bg-muted rounded-md font-mono text-xs break-all">
                    {detailError.method && <span className="font-bold mr-2">{detailError.method}</span>}
                    {detailError.url}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline & Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">First Occurred:</span>
                  <div className="mt-1">{format(new Date(detailError.firstOccurredAt), 'PPpp')}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Occurred:</span>
                  <div className="mt-1">{format(new Date(detailError.lastOccurredAt), 'PPpp')}</div>
                </div>
                {detailError.userId && (
                  <div>
                    <span className="text-muted-foreground">User ID:</span>
                    <div className="mt-1 font-mono text-xs">{detailError.userId}</div>
                  </div>
                )}
                {detailError.partnerId && (
                  <div>
                    <span className="text-muted-foreground">Partner ID:</span>
                    <div className="mt-1 font-mono text-xs">{detailError.partnerId}</div>
                  </div>
                )}
                {detailError.apiKeyId && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">API Key ID:</span>
                    <div className="mt-1 font-mono text-xs">{detailError.apiKeyId}</div>
                  </div>
                )}
              </div>

              {detailError.resolvedAt && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                  <span className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Resolved {format(new Date(detailError.resolvedAt), 'PPpp')}
                  </span>
                </div>
              )}

              {detailError.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes:</span>
                  <p className="mt-1 p-3 bg-muted rounded-md text-sm">{detailError.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <span className="text-sm text-muted-foreground block mb-2">Update Status:</span>
                <div className="flex gap-2 flex-wrap">
                  {detailError.status !== 'investigating' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedError(detailError);
                        setNewStatus('investigating');
                      }}
                      data-testid="button-set-investigating"
                    >
                      <SearchIcon className="h-3 w-3 mr-1" />
                      Investigating
                    </Button>
                  )}
                  {detailError.status !== 'resolved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedError(detailError);
                        setNewStatus('resolved');
                      }}
                      data-testid="button-set-resolved"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolved
                    </Button>
                  )}
                  {detailError.status !== 'ignored' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedError(detailError);
                        setNewStatus('ignored');
                      }}
                      data-testid="button-set-ignored"
                    >
                      Ignore
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {detailError.stack && (
          <Card>
            <CardHeader>
              <CardTitle>Stack Trace</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <pre className="p-4 bg-muted rounded-md font-mono text-xs whitespace-pre-wrap">
                  {detailError.stack}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {(detailError.requestBody || detailError.responseBody || detailError.metadata) && (
          <div className="grid gap-6 md:grid-cols-3">
            {detailError.requestBody && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Request Body</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <pre className="font-mono text-xs">
                      {JSON.stringify(detailError.requestBody, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
            {detailError.responseBody && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Response Body</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <pre className="font-mono text-xs">
                      {JSON.stringify(detailError.responseBody, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
            {detailError.metadata && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Metadata</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <pre className="font-mono text-xs">
                      {JSON.stringify(detailError.metadata, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white" data-testid="heading-errors">Error Tracking</h2>
          <p className="text-white/70">Monitor application errors and diagnose issues</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          className="border-white/30 text-white hover:bg-white/10 hover:text-white"
          data-testid="button-refresh-errors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {statsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card data-testid="card-total-errors">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-errors">{stats.totalErrors}</div>
              <p className="text-xs text-muted-foreground">
                {stats.last24Hours} in last 24h
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-new-errors">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Errors</CardTitle>
              <Clock className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-new-errors">{stats.newErrors}</div>
              <p className="text-xs text-muted-foreground">
                Requiring attention
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-critical-errors">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-critical-errors">{stats.criticalErrors}</div>
              <p className="text-xs text-muted-foreground">
                High priority issues
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-weekly-errors">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-weekly-errors">{stats.last7Days}</div>
              <p className="text-xs text-muted-foreground">
                Weekly error volume
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>
                View and manage application errors
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}>
                <SelectTrigger className="w-[130px]" data-testid="select-severity-filter">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {errorsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !errors?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No errors found matching your filters</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Sev</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[80px]">Count</TableHead>
                    <TableHead className="w-[150px]">Last Occurred</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.map((error) => (
                    <TableRow key={error.id} className="cursor-pointer hover-elevate" onClick={() => setDetailError(error)} data-testid={`row-error-${error.id}`}>
                      <TableCell>
                        {getSeverityIcon(error.severity)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[400px]">
                          <p className="font-medium truncate">{error.message}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {error.type} • {error.source}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(error.status)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{error.occurrenceCount}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(error.lastOccurredAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailError(error);
                          }}
                          data-testid={`button-view-error-${error.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedError && !!newStatus} onOpenChange={() => { setSelectedError(null); setNewStatus(""); setUpdateNotes(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Error Status</DialogTitle>
            <DialogDescription>
              Change the status of this error to "{newStatus}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Error:</p>
              <p className="text-sm text-muted-foreground line-clamp-2">{selectedError?.message}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                placeholder="Add any notes about this status change..."
                className="mt-2"
                data-testid="input-error-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedError(null); setNewStatus(""); setUpdateNotes(""); }} data-testid="button-cancel-status-update">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedError && newStatus) {
                  updateErrorMutation.mutate({
                    id: selectedError.id,
                    status: newStatus,
                    notes: updateNotes || undefined,
                  });
                }
              }}
              disabled={updateErrorMutation.isPending}
              data-testid="button-confirm-status-update"
            >
              {updateErrorMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
