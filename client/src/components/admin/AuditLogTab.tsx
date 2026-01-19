import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  RefreshCw, 
  FileText,
  AlertTriangle,
  Info,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  userId: string | null;
  userEmail: string | null;
  severity: string;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditLogData {
  logs: AuditLog[];
  total: number;
}

interface FilterOptions {
  actions: string[];
  resourceTypes: string[];
}

const PAGE_SIZE = 25;

export default function AuditLogTab() {
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    severity: '',
    startDate: '',
    endDate: '',
  });

  const buildQueryParams = () => {
    const params = new URLSearchParams({
      limit: PAGE_SIZE.toString(),
      offset: (page * PAGE_SIZE).toString(),
    });
    if (filters.action) params.set('action', filters.action);
    if (filters.resourceType) params.set('resourceType', filters.resourceType);
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    return params.toString();
  };

  const { data, isLoading, refetch, isFetching } = useQuery<AuditLogData>({
    queryKey: ["/api/admin/audit-logs", page, filters],
    queryFn: async () => {
      const response = await fetch(`/api/admin/audit-logs?${buildQueryParams()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    },
  });

  const { data: filterOptions } = useQuery<FilterOptions>({
    queryKey: ["/api/admin/audit-logs/filters"],
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
    refetch();
    toast({ title: "Data refreshed" });
  };

  const handleClearFilters = () => {
    setFilters({
      action: '',
      resourceType: '',
      severity: '',
      startDate: '',
      endDate: '',
    });
    setPage(0);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Warning</Badge>;
      case 'info':
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Info</Badge>;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-audit" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Audit Logs</h2>
          <p className="text-sm text-white/70">Track all administrative actions for compliance and security</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          data-testid="button-refresh-audit"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={filters.action || "_all"} onValueChange={(v) => { setFilters({...filters, action: v === "_all" ? "" : v}); setPage(0); }}>
                <SelectTrigger data-testid="select-action">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All actions</SelectItem>
                  {filterOptions?.actions?.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resource Type</Label>
              <Select value={filters.resourceType || "_all"} onValueChange={(v) => { setFilters({...filters, resourceType: v === "_all" ? "" : v}); setPage(0); }}>
                <SelectTrigger data-testid="select-resource">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All types</SelectItem>
                  {filterOptions?.resourceTypes?.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={filters.severity || "_all"} onValueChange={(v) => { setFilters({...filters, severity: v === "_all" ? "" : v}); setPage(0); }}>
                <SelectTrigger data-testid="select-severity">
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input 
                type="date" 
                value={filters.startDate} 
                onChange={(e) => { setFilters({...filters, startDate: e.target.value}); setPage(0); }}
                data-testid="input-start-date"
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input 
                type="date" 
                value={filters.endDate} 
                onChange={(e) => { setFilters({...filters, endDate: e.target.value}); setPage(0); }}
                data-testid="input-end-date"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={handleClearFilters} data-testid="button-clear-filters">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Log Entries
              </CardTitle>
              <CardDescription>
                {data?.total.toLocaleString()} total entries
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {Math.max(1, totalPages)}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data?.logs && data.logs.length > 0 ? (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {data.logs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 hover-elevate">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(log.severity)}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{log.action}</span>
                            {getSeverityBadge(log.severity)}
                            <Badge variant="outline" className="text-xs">{log.resourceType}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {log.userEmail && <span>by {log.userEmail}</span>}
                            {log.resourceId && <span> on {log.resourceId.slice(0, 8)}...</span>}
                          </div>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground bg-secondary/50 rounded p-2 font-mono overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-medium">
                          {format(new Date(log.createdAt), 'd MMM yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), 'HH:mm:ss')}
                        </div>
                        {log.ipAddress && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {log.ipAddress}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
