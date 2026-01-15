import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Users, 
  CreditCard, 
  Building2, 
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  FileText,
  ShoppingCart,
  Zap
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalAssessmentsCompleted: number;
    totalB2cRevenue: number;
    totalPartners: number;
    activePartners: number;
  };
  today: {
    b2cTransactions: number;
    b2cRevenue: number;
    b2bSessions: number;
    b2bCompletions: number;
    assessmentsCompleted: number;
  };
  thisMonth: {
    b2cTransactions: number;
    b2cRevenue: number;
    b2bSessions: number;
    b2bCompletions: number;
    b2bRevenue: number;
    b2bTests: number;
    assessmentsCompleted: number;
  };
  lastMonth: {
    b2cRevenue: number;
    b2bRevenue: number;
  };
  trends: Array<{
    date: string;
    b2cRevenue: number;
    b2cTransactions: number;
    b2bSessions: number;
    assessmentsCompleted: number;
  }>;
  partnerBreakdown: Array<{
    id: string;
    name: string;
    billingType: string;
    isSuspended: boolean;
    totalSessions: number;
    completedSessions: number;
    todaySessions: number;
    monthSessions: number;
    testsPurchased: number;
    testsConsumed: number;
  }>;
  assessmentBreakdown: Record<string, {
    started: number;
    completed: number;
    today: number;
  }>;
  activityFeed: Array<{
    type: string;
    timestamp: string;
    description: string;
    details: Record<string, any>;
  }>;
}

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const ASSESSMENT_NAMES: Record<string, string> = {
  'fit': 'FIT',
  'ai_readiness': 'AI Readiness',
  'prompt_architecture': 'Prompt Architecture',
  'aiq': 'AIQ'
};

export default function AnalyticsTab() {
  const { toast } = useToast();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [subTab, setSubTab] = useState("overview");

  const { data: analytics, isLoading, refetch, isFetching } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const handleRefresh = () => {
    // Invalidate analytics query to clear cache
    queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
    refetch();
    toast({ title: "Data refreshed", description: "Analytics data has been reloaded" });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-analytics" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load analytics data
        </CardContent>
      </Card>
    );
  }

  const b2cRevenueChange = analytics.lastMonth.b2cRevenue > 0
    ? ((analytics.thisMonth.b2cRevenue - analytics.lastMonth.b2cRevenue) / analytics.lastMonth.b2cRevenue * 100)
    : 0;

  const totalRevenueThisMonth = analytics.thisMonth.b2cRevenue + analytics.thisMonth.b2bRevenue;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Real-Time Analytics</h2>
          <p className="text-sm text-white/70">
            {autoRefresh ? 'Auto-refreshing every 30 seconds' : 'Auto-refresh paused'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-500/20 border-green-500/50 text-green-300' : ''}
            data-testid="button-toggle-auto-refresh"
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            data-testid="button-refresh-analytics"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="bg-white/10 border border-white/20">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
            Overview
          </TabsTrigger>
          <TabsTrigger value="b2c" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
            B2C Sales
          </TabsTrigger>
          <TabsTrigger value="b2b" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
            B2B Partners
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
            Activity Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue (Month)</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-revenue-month">
                  £{(totalRevenueThisMonth / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span className="text-cyan-400">B2C: £{(analytics.thisMonth.b2cRevenue / 100).toFixed(2)}</span>
                  <span className="mx-2">|</span>
                  <span className="text-purple-400">B2B: £{(analytics.thisMonth.b2bRevenue / 100).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-today-activity">
                  {analytics.today.assessmentsCompleted}
                </div>
                <p className="text-xs text-muted-foreground">
                  Assessments completed today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-users">
                  {analytics.overview.totalUsers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Registered on platform
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">B2B Partners</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-partners">
                  {analytics.overview.totalPartners}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.overview.activePartners} active
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  30-Day Trend
                </CardTitle>
                <CardDescription>
                  B2C revenue and assessments completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9ca3af"
                        tickFormatter={(value) => format(new Date(value), 'd MMM')}
                        fontSize={12}
                      />
                      <YAxis stroke="#9ca3af" fontSize={12} yAxisId="left" />
                      <YAxis stroke="#9ca3af" fontSize={12} yAxisId="right" orientation="right" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                        labelFormatter={(value) => format(new Date(value), 'dd MMM yyyy')}
                        formatter={(value: number, name: string) => {
                          if (name === 'b2cRevenue') return [`£${(value / 100).toFixed(2)}`, 'B2C Revenue'];
                          if (name === 'assessmentsCompleted') return [value, 'Assessments'];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="b2cRevenue" 
                        stroke="#06b6d4" 
                        fill="#06b6d4"
                        fillOpacity={0.3}
                        name="B2C Revenue"
                      />
                      <Area 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="assessmentsCompleted" 
                        stroke="#8b5cf6" 
                        fill="#8b5cf6"
                        fillOpacity={0.3}
                        name="Assessments"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Assessment Breakdown
                </CardTitle>
                <CardDescription>
                  Completions by assessment type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.assessmentBreakdown).map(([type, data], index) => {
                    const completionRate = data.started > 0 ? (data.completed / data.started * 100) : 0;
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{ASSESSMENT_NAMES[type] || type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {data.today} today
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {data.completed} / {data.started}
                            </span>
                          </div>
                        </div>
                        <Progress value={completionRate} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="b2c" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-b2c-revenue-today">
                  £{(analytics.today.b2cRevenue / 100).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.today.b2cTransactions} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-b2c-revenue-month">
                  £{(analytics.thisMonth.b2cRevenue / 100).toFixed(2)}
                </div>
                <div className="flex items-center text-xs">
                  {b2cRevenueChange >= 0 ? (
                    <span className="text-green-500 flex items-center">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      +{b2cRevenueChange.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center">
                      <ArrowDownRight className="h-3 w-3 mr-1" />
                      {b2cRevenueChange.toFixed(1)}%
                    </span>
                  )}
                  <span className="text-muted-foreground ml-2">vs last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">All-Time Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-b2c-revenue-total">
                  £{(analytics.overview.totalB2cRevenue / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lifetime B2C revenue
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daily B2C Transactions</CardTitle>
              <CardDescription>Transaction count over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9ca3af"
                      tickFormatter={(value) => format(new Date(value), 'd')}
                      fontSize={12}
                    />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                      labelFormatter={(value) => format(new Date(value), 'dd MMM yyyy')}
                    />
                    <Bar dataKey="b2cTransactions" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Transactions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="b2b" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Sessions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-b2b-sessions-today">
                  {analytics.today.b2bSessions}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.today.b2bCompletions} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month Sessions</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-b2b-sessions-month">
                  {analytics.thisMonth.b2bSessions}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.thisMonth.b2bCompletions} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">B2B Revenue</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-b2b-revenue-month">
                  £{(analytics.thisMonth.b2bRevenue / 100).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tests Used</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-b2b-tests-month">
                  {analytics.thisMonth.b2bTests}
                </div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Partner Activity
              </CardTitle>
              <CardDescription>
                Current activity across all B2B partners
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {analytics.partnerBreakdown.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No partners found
                    </p>
                  ) : (
                    analytics.partnerBreakdown
                      .sort((a, b) => b.monthSessions - a.monthSessions)
                      .map((partner) => (
                        <div 
                          key={partner.id} 
                          className="flex items-center justify-between p-4 rounded-lg bg-card/50 border"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{partner.name}</span>
                                {partner.isSuspended && (
                                  <Badge variant="destructive" className="text-xs">Suspended</Badge>
                                )}
                                <Badge variant="outline" className="text-xs capitalize">
                                  {partner.billingType}
                                </Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {partner.completedSessions} / {partner.totalSessions} completed
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-right">
                            <div>
                              <div className="text-lg font-semibold text-cyan-400">
                                {partner.todaySessions}
                              </div>
                              <div className="text-xs text-muted-foreground">Today</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-purple-400">
                                {partner.monthSessions}
                              </div>
                              <div className="text-xs text-muted-foreground">This Month</div>
                            </div>
                            {partner.billingType === 'prepaid' && (
                              <div>
                                <div className="text-lg font-semibold">
                                  {partner.testsPurchased - partner.testsConsumed}
                                </div>
                                <div className="text-xs text-muted-foreground">Remaining</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>B2B Sessions Trend</CardTitle>
              <CardDescription>Daily B2B session activity over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9ca3af"
                      tickFormatter={(value) => format(new Date(value), 'd')}
                      fontSize={12}
                    />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                      labelFormatter={(value) => format(new Date(value), 'dd MMM yyyy')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="b2bSessions" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={false}
                      name="B2B Sessions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Activity Feed
              </CardTitle>
              <CardDescription>
                Recent transactions and sessions across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {analytics.activityFeed.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No recent activity
                    </p>
                  ) : (
                    analytics.activityFeed.map((activity, index) => (
                      <div 
                        key={index}
                        className="flex items-start gap-4 p-3 rounded-lg bg-card/50 border hover-elevate"
                      >
                        <div className={`p-2 rounded-full ${
                          activity.type === 'b2c_purchase' 
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : activity.type === 'b2b_completion'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {activity.type === 'b2c_purchase' ? (
                            <ShoppingCart className="h-4 w-4" />
                          ) : activity.type === 'b2b_completion' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Activity className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">
                              {activity.description}
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {activity.type === 'b2c_purchase' && (
                              <span>{activity.details.user} • {activity.details.items} items</span>
                            )}
                            {(activity.type === 'b2b_session' || activity.type === 'b2b_completion') && (
                              <span>{activity.details.partner} • {ASSESSMENT_NAMES[activity.details.assessmentType] || activity.details.assessmentType}</span>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant={activity.type === 'b2c_purchase' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {activity.type === 'b2c_purchase' ? 'B2C' : 'B2B'}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
