import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  RefreshCw, 
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { 
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FunnelData {
  b2c: {
    allTime: {
      started: number;
      completed: number;
      paid: number;
      startToCompleteRate: string | number;
      completeToPaidRate: string | number;
    };
    last30Days: {
      started: number;
      completed: number;
      paid: number;
      startToCompleteRate: string | number;
      completeToPaidRate: string | number;
    };
  };
  b2b: {
    allTime: {
      invited: number;
      started: number;
      completed: number;
      resultsViewed: number;
      inviteToStartRate: string | number;
      startToCompleteRate: string | number;
    };
    last30Days: {
      invited: number;
      started: number;
      completed: number;
    };
  };
  typeBreakdown: Array<{
    type: string;
    b2cStarted: number;
    b2cCompleted: number;
    b2cCompletionRate: string | number;
    b2bStarted: number;
    b2bCompleted: number;
    b2bCompletionRate: string | number;
  }>;
  dailyFunnel: Array<{
    date: string;
    started: number;
    completed: number;
    paid: number;
  }>;
}

const ASSESSMENT_NAMES: Record<string, string> = {
  'fit': 'FIT',
  'ai_readiness': 'AI Readiness',
  'prompt_architecture': 'Prompt Architecture',
  'aiq': 'AIQ'
};

export default function AssessmentFunnelTab() {
  const { toast } = useToast();
  
  const { data, isLoading, refetch, isFetching } = useQuery<FunnelData>({
    queryKey: ["/api/admin/analytics/funnel"],
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/funnel"] });
    refetch();
    toast({ title: "Data refreshed" });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-funnel" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load funnel data
        </CardContent>
      </Card>
    );
  }

  const FunnelStep = ({ label, value, rate, color }: { label: string; value: number; rate?: string | number; color: string }) => (
    <div className="flex-1 text-center">
      <div className="text-2xl font-bold" style={{ color }}>{value.toLocaleString()}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {rate !== undefined && (
        <Badge variant="outline" className="mt-1 text-xs">
          {rate}%
        </Badge>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Assessment Funnel Analytics</h2>
          <p className="text-sm text-white/70">Conversion rates from start to completion to payment</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          data-testid="button-refresh-funnel"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-cyan-400" />
              B2C Funnel (All Time)
            </CardTitle>
            <CardDescription>Individual assessment journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <FunnelStep label="Started" value={data.b2c.allTime.started} color="#06b6d4" />
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <FunnelStep label="Completed" value={data.b2c.allTime.completed} rate={data.b2c.allTime.startToCompleteRate} color="#3b82f6" />
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <FunnelStep label="Paid" value={data.b2c.allTime.paid} rate={data.b2c.allTime.completeToPaidRate} color="#10b981" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Start to Complete</span>
                <span className="font-medium">{data.b2c.allTime.startToCompleteRate}%</span>
              </div>
              <Progress value={Number(data.b2c.allTime.startToCompleteRate)} className="h-2" />
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Complete to Paid</span>
                <span className="font-medium">{data.b2c.allTime.completeToPaidRate}%</span>
              </div>
              <Progress value={Number(data.b2c.allTime.completeToPaidRate)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-purple-400" />
              B2B Funnel (All Time)
            </CardTitle>
            <CardDescription>Partner candidate journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <FunnelStep label="Invited" value={data.b2b.allTime.invited} color="#8b5cf6" />
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <FunnelStep label="Started" value={data.b2b.allTime.started} rate={data.b2b.allTime.inviteToStartRate} color="#3b82f6" />
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <FunnelStep label="Completed" value={data.b2b.allTime.completed} rate={data.b2b.allTime.startToCompleteRate} color="#10b981" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invite to Start</span>
                <span className="font-medium">{data.b2b.allTime.inviteToStartRate}%</span>
              </div>
              <Progress value={Number(data.b2b.allTime.inviteToStartRate)} className="h-2" />
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Start to Complete</span>
                <span className="font-medium">{data.b2b.allTime.startToCompleteRate}%</span>
              </div>
              <Progress value={Number(data.b2b.allTime.startToCompleteRate)} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funnel Trend (Last 30 Days)</CardTitle>
          <CardDescription>Daily assessment starts, completions, and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyFunnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  tickFormatter={(value) => format(new Date(value), 'd MMM')}
                  fontSize={12}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelFormatter={(value) => format(new Date(value), 'd MMM yyyy')}
                />
                <Legend />
                <Area type="monotone" dataKey="started" name="Started" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Area type="monotone" dataKey="paid" name="Paid" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Completion Rate by Assessment Type</CardTitle>
          <CardDescription>Compare conversion rates across different assessments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.typeBreakdown.map((item) => (
              <div key={item.type} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{ASSESSMENT_NAMES[item.type] || item.type}</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-cyan-400">B2C</span>
                      <span>{item.b2cCompleted} / {item.b2cStarted} completed</span>
                    </div>
                    <Progress value={Number(item.b2cCompletionRate)} className="h-2" />
                    <div className="text-xs text-muted-foreground mt-1">{item.b2cCompletionRate}% completion rate</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-purple-400">B2B</span>
                      <span>{item.b2bCompleted} / {item.b2bStarted} completed</span>
                    </div>
                    <Progress value={Number(item.b2bCompletionRate)} className="h-2" />
                    <div className="text-xs text-muted-foreground mt-1">{item.b2bCompletionRate}% completion rate</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
