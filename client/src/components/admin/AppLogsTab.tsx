import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Search, Play, Pause, Download, Filter, Terminal, AlertCircle, Info, AlertTriangle, Bug, ChevronDown, ChevronUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

interface LogStats {
  total: number;
  info: number;
  warn: number;
  error: number;
  debug: number;
  sources: string[];
}

export default function AppLogsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("1h");
  const [isLive, setIsLive] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Fetch log stats
  const { data: stats, isLoading: statsLoading } = useQuery<LogStats>({
    queryKey: ["/api/admin/app-logs/stats", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/app-logs/stats?timeRange=${timeRange}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  // Fetch logs with filters
  const { data: logsData, isLoading: logsLoading, refetch, isFetching } = useQuery<{ logs: LogEntry[]; total: number }>({
    queryKey: ["/api/admin/app-logs", searchQuery, levelFilter, sourceFilter, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (levelFilter !== "all") params.set("level", levelFilter);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      params.set("timeRange", timeRange);
      params.set("limit", "500");
      
      const res = await fetch(`/api/admin/app-logs?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    },
    refetchInterval: isLive ? 3000 : false,
  });

  // Auto-scroll to bottom when live and new logs arrive
  useEffect(() => {
    if (isLive && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logsData, isLive]);

  const handleRefresh = () => {
    refetch();
  };

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      case 'debug': return <Bug className="h-4 w-4 text-gray-500" />;
      default: return <Terminal className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'warn': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'info': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'debug': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return '';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const exportLogs = () => {
    if (!logsData?.logs) return;
    const content = logsData.logs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}${log.metadata ? ' ' + JSON.stringify(log.metadata) : ''}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-logs-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white" data-testid="text-app-logs-title">App Logs</h2>
          <p className="text-white/70">Real-time application logs and debugging</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4">
            <Switch
              id="live-mode"
              checked={isLive}
              onCheckedChange={setIsLive}
              data-testid="switch-live-mode"
            />
            <Label htmlFor="live-mode" className="text-white/70 flex items-center gap-1">
              {isLive ? <Play className="h-3 w-3 text-green-500" /> : <Pause className="h-3 w-3" />}
              Live
            </Label>
          </div>
          <Button onClick={exportLogs} variant="outline" className="text-white border-white/30 hover:bg-white/10" data-testid="button-export-logs">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleRefresh} variant="outline" className="text-white border-white/30 hover:bg-white/10" data-testid="button-refresh-app-logs">
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <Terminal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-logs">
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.total ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Last {timeRange}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500" data-testid="text-error-count">
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats?.error ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Last {timeRange}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500" data-testid="text-warn-count">
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats?.warn ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Last {timeRange}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
            <Info className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500" data-testid="text-info-count">
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats?.info ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Last {timeRange}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Debug</CardTitle>
            <Bug className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500" data-testid="text-debug-count">
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats?.debug ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Last {timeRange}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-logs"
                />
              </div>
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-level-filter">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-source-filter">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {stats?.sources?.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]" data-testid="select-time-range">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15m">Last 15 min</SelectItem>
                <SelectItem value="1h">Last 1 hour</SelectItem>
                <SelectItem value="6h">Last 6 hours</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Log Stream */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Log Stream
              {isLive && (
                <Badge variant="outline" className="ml-2 bg-green-500/20 text-green-500 border-green-500/30">
                  <span className="mr-1 h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block" />
                  Live
                </Badge>
              )}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {logsData?.logs?.length ?? 0} of {logsData?.total ?? 0} logs
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            ref={logsContainerRef}
            className="bg-slate-950 rounded-lg p-4 font-mono text-sm max-h-[600px] overflow-y-auto"
            data-testid="log-stream-container"
          >
            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !logsData?.logs?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No logs found matching your filters</p>
              </div>
            ) : (
              <div className="space-y-1">
                {logsData.logs.map((log) => (
                  <div 
                    key={log.id}
                    className="group hover:bg-white/5 rounded px-2 py-1 cursor-pointer transition-colors"
                    onClick={() => log.metadata && toggleLogExpansion(log.id)}
                    data-testid={`log-entry-${log.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 whitespace-nowrap text-xs">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-1.5 py-0 ${getLevelBadgeColor(log.level)}`}
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                      <span className="text-cyan-400 text-xs">[{log.source}]</span>
                      <span className="text-slate-200 flex-1 break-all">{log.message}</span>
                      {log.metadata && (
                        <span className="text-slate-500">
                          {expandedLogs.has(log.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                    {log.metadata && expandedLogs.has(log.id) && (
                      <pre className="mt-2 ml-4 p-2 bg-slate-900 rounded text-xs text-slate-400 overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
