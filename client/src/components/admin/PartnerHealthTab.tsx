import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  RefreshCw, 
  HeartPulse,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  CreditCard,
  Users,
  Zap,
  ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PartnerHealth {
  partnerId: string;
  partnerName: string;
  billingType: string;
  overallScore: number;
  status: 'healthy' | 'warning' | 'critical';
  components: {
    usage: { score: number; sessionsLast30Days: number };
    payment: { score: number; overdueInvoices: number; failedAttempts: number };
    engagement: { score: number; completionRate: string };
    apiHealth: { score: number; isSuspended: boolean };
  };
  recommendations: string[];
  lastActivity: string;
}

interface HealthData {
  partners: PartnerHealth[];
  summary: {
    healthy: number;
    warning: number;
    critical: number;
    averageScore: number;
  };
}

export default function PartnerHealthTab() {
  const { toast } = useToast();
  
  const { data, isLoading, refetch, isFetching } = useQuery<HealthData>({
    queryKey: ["/api/admin/partners/health-scores"],
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/partners/health-scores"] });
    refetch();
    toast({ title: "Data refreshed" });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-health" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load partner health data
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Healthy</Badge>;
      case 'warning': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Warning</Badge>;
      case 'critical': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Critical</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Partner Health Scores</h2>
          <p className="text-sm text-white/70">Monitor partner engagement, payments, and API health</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          className="border-white/30 text-white hover:bg-white/10 hover:text-white"
          data-testid="button-refresh-health"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-score">{data.summary.averageScore}</div>
            <Progress value={data.summary.averageScore} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400" data-testid="text-healthy">{data.summary.healthy}</div>
            <p className="text-xs text-muted-foreground">Score 70+</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warning</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400" data-testid="text-warning">{data.summary.warning}</div>
            <p className="text-xs text-muted-foreground">Score 40-69</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <XCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400" data-testid="text-critical">{data.summary.critical}</div>
            <p className="text-xs text-muted-foreground">Score below 40</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partner Health Overview</CardTitle>
          <CardDescription>Sorted by health score (lowest first to highlight issues)</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {data.partners.map((partner) => (
                <div 
                  key={partner.partnerId} 
                  className="border rounded-lg p-4 hover-elevate"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                        style={{ backgroundColor: getScoreColor(partner.overallScore) + '20', color: getScoreColor(partner.overallScore) }}
                      >
                        {partner.overallScore}
                      </div>
                      <div>
                        <h3 className="font-medium">{partner.partnerName}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">{partner.billingType}</Badge>
                          {partner.lastActivity && (
                            <span>Last active {formatDistanceToNow(new Date(partner.lastActivity))} ago</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(partner.status)}
                  </div>

                  <div className="grid gap-4 md:grid-cols-4 mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Activity className="h-4 w-4 text-cyan-400" />
                        <span>Usage</span>
                        <span className="ml-auto font-medium">{partner.components.usage.score}</span>
                      </div>
                      <Progress value={partner.components.usage.score} className="h-1.5" />
                      <div className="text-xs text-muted-foreground">{partner.components.usage.sessionsLast30Days} sessions (30d)</div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="h-4 w-4 text-green-400" />
                        <span>Payment</span>
                        <span className="ml-auto font-medium">{partner.components.payment.score}</span>
                      </div>
                      <Progress value={partner.components.payment.score} className="h-1.5" />
                      <div className="text-xs text-muted-foreground">
                        {partner.components.payment.overdueInvoices > 0 
                          ? `${partner.components.payment.overdueInvoices} overdue` 
                          : 'No issues'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-purple-400" />
                        <span>Engagement</span>
                        <span className="ml-auto font-medium">{partner.components.engagement.score}</span>
                      </div>
                      <Progress value={partner.components.engagement.score} className="h-1.5" />
                      <div className="text-xs text-muted-foreground">{partner.components.engagement.completionRate}% completion</div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4 text-yellow-400" />
                        <span>API Health</span>
                        <span className="ml-auto font-medium">{partner.components.apiHealth.score}</span>
                      </div>
                      <Progress value={partner.components.apiHealth.score} className="h-1.5" />
                      <div className="text-xs text-muted-foreground">
                        {partner.components.apiHealth.isSuspended ? 'Suspended' : 'Active'}
                      </div>
                    </div>
                  </div>

                  {partner.recommendations.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm font-medium mb-2">Recommendations:</div>
                      <ul className="space-y-1">
                        {partner.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
