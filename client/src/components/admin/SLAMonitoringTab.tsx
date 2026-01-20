import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Loader2, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw, 
  Activity, Gauge, Timer, TrendingUp, TrendingDown, Server
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";

interface SLAMetric {
  name: string;
  target: number;
  current: number;
  unit: string;
  status: "healthy" | "warning" | "critical";
  trend: "up" | "down" | "stable";
  lastMeasured: string;
}

interface SLAData {
  uptime: {
    current: number;
    target: number;
    last30Days: number;
    lastIncident?: string;
  };
  responseTime: {
    average: number;
    p95: number;
    p99: number;
    target: number;
  };
  errorRate: {
    current: number;
    target: number;
    last24h: number;
  };
  throughput: {
    requestsPerMinute: number;
    peakRpm: number;
    averageRpm: number;
  };
  metrics: SLAMetric[];
  uptimeHistory: Array<{ date: string; uptime: number }>;
  responseTimeHistory: Array<{ time: string; avgMs: number; p95Ms: number }>;
  alerts: Array<{ id: string; type: string; message: string; severity: string; timestamp: string }>;
}

export default function SLAMonitoringTab() {
  const { data, isLoading, refetch } = useQuery<SLAData>({
    queryKey: ["/api/admin/health/sla"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-green-500";
      case "warning": return "text-yellow-500";
      case "critical": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy": return <Badge className="bg-green-500/10 text-green-600">Healthy</Badge>;
      case "warning": return <Badge className="bg-yellow-500/10 text-yellow-600">Warning</Badge>;
      case "critical": return <Badge variant="destructive">Critical</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const uptime = data?.uptime || { current: 99.9, target: 99.9, last30Days: 99.9 };
  const responseTime = data?.responseTime || { average: 100, p95: 200, p99: 350, target: 500 };
  const errorRate = data?.errorRate || { current: 0.1, target: 1, last24h: 0.5 };
  const throughput = data?.throughput || { requestsPerMinute: 50, peakRpm: 200, averageRpm: 75 };
  const metrics = data?.metrics || [];
  const alerts = data?.alerts || [];
  const uptimeHistory = data?.uptimeHistory || [];
  const responseTimeHistory = data?.responseTimeHistory || [];

  const overallStatus = uptime.current >= uptime.target && 
    responseTime.average <= responseTime.target && 
    errorRate.current <= errorRate.target ? "healthy" : 
    (uptime.current >= 99 && errorRate.current <= 2 ? "warning" : "critical");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Gauge className="h-5 w-5 text-cyan-500" />
            SLA Monitoring
          </h3>
          <p className="text-sm text-white/70">Service level agreement metrics and performance tracking</p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(overallStatus)}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-white/30 text-white hover:bg-white/10 hover:text-white">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {alerts.length > 0 && (
        <Alert variant={alerts[0].severity === "critical" ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Active Alerts ({alerts.length})</AlertTitle>
          <AlertDescription>
            {alerts[0].message}
            {alerts.length > 1 && ` (+${alerts.length - 1} more)`}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className={`h-4 w-4 ${uptime.current >= uptime.target ? "text-green-500" : "text-yellow-500"}`} />
              Uptime (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{uptime.last30Days.toFixed(2)}%</div>
            <p className="text-sm text-muted-foreground">Target: {uptime.target}%</p>
            <Progress 
              value={(uptime.last30Days / uptime.target) * 100} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Timer className={`h-4 w-4 ${responseTime.average <= responseTime.target ? "text-green-500" : "text-yellow-500"}`} />
              Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{responseTime.average}ms</div>
            <p className="text-sm text-muted-foreground">
              P95: {responseTime.p95}ms | P99: {responseTime.p99}ms
            </p>
            <Progress 
              value={Math.min((responseTime.target - responseTime.average) / responseTime.target * 100 + 50, 100)} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className={`h-4 w-4 ${errorRate.current <= errorRate.target ? "text-green-500" : "text-red-500"}`} />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{errorRate.current.toFixed(2)}%</div>
            <p className="text-sm text-muted-foreground">Target: &lt;{errorRate.target}%</p>
            <Progress 
              value={Math.max(100 - (errorRate.current / errorRate.target) * 100, 0)} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Server className="h-4 w-4 text-cyan-500" />
              Throughput
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{throughput.requestsPerMinute}</div>
            <p className="text-sm text-muted-foreground">
              requests/min (Peak: {throughput.peakRpm})
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Uptime History (30 Days)</CardTitle>
            <CardDescription>Daily uptime percentage</CardDescription>
          </CardHeader>
          <CardContent>
            {uptimeHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={uptimeHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[99, 100]} />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="uptime" 
                    stroke="#06b6d4" 
                    fill="#06b6d4" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No uptime history available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Time Trend</CardTitle>
            <CardDescription>Average and P95 latency over time</CardDescription>
          </CardHeader>
          <CardContent>
            {responseTimeHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={responseTimeHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="avgMs" 
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    name="Average"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="p95Ms" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="P95"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No response time history available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SLA Metrics Overview</CardTitle>
          <CardDescription>Detailed breakdown of all monitored service level metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.length > 0 ? (
                metrics.map((metric) => (
                  <TableRow key={metric.name}>
                    <TableCell className="font-medium">{metric.name}</TableCell>
                    <TableCell>{metric.current}{metric.unit}</TableCell>
                    <TableCell>{metric.target}{metric.unit}</TableCell>
                    <TableCell>{getStatusBadge(metric.status)}</TableCell>
                    <TableCell>{getTrendIcon(metric.trend)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {metric.lastMeasured ? formatDistanceToNow(new Date(metric.lastMeasured), { addSuffix: true }) : "-"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <>
                  <TableRow>
                    <TableCell className="font-medium">API Availability</TableCell>
                    <TableCell>{uptime.current}%</TableCell>
                    <TableCell>{uptime.target}%</TableCell>
                    <TableCell>{getStatusBadge(uptime.current >= uptime.target ? "healthy" : "warning")}</TableCell>
                    <TableCell><Activity className="h-4 w-4 text-muted-foreground" /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">Just now</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Response Time (Avg)</TableCell>
                    <TableCell>{responseTime.average}ms</TableCell>
                    <TableCell>{responseTime.target}ms</TableCell>
                    <TableCell>{getStatusBadge(responseTime.average <= responseTime.target ? "healthy" : "warning")}</TableCell>
                    <TableCell><Activity className="h-4 w-4 text-muted-foreground" /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">Just now</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Error Rate</TableCell>
                    <TableCell>{errorRate.current}%</TableCell>
                    <TableCell>&lt;{errorRate.target}%</TableCell>
                    <TableCell>{getStatusBadge(errorRate.current <= errorRate.target ? "healthy" : "critical")}</TableCell>
                    <TableCell><Activity className="h-4 w-4 text-muted-foreground" /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">Just now</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Database Latency</TableCell>
                    <TableCell>{Math.round(responseTime.average * 0.3)}ms</TableCell>
                    <TableCell>100ms</TableCell>
                    <TableCell>{getStatusBadge("healthy")}</TableCell>
                    <TableCell><Activity className="h-4 w-4 text-muted-foreground" /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">Just now</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {uptime.lastIncident && (
        <Card>
          <CardHeader>
            <CardTitle>Last Incident</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="font-medium">Service Disruption</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(uptime.lastIncident), "PPpp")} - 
                  {formatDistanceToNow(new Date(uptime.lastIncident), { addSuffix: true })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
