import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  RefreshCw, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Brain,
  Percent,
  Zap,
  Activity
} from "lucide-react";
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
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProfitData {
  overview: {
    totalRevenue: number;
    b2cRevenue: number;
    b2bRevenue: number;
    totalAiCost: number;
    grossProfit: number;
    profitMargin: number;
    avgCostPerAssessment: number;
  };
  aiCosts: {
    totalCostCents: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalRequests: number;
    byOperationType: Array<{
      operationType: string;
      count: number;
      totalCostCents: number;
      avgCostCents: number;
    }>;
    byModel: Array<{
      model: string;
      count: number;
      totalCostCents: number;
    }>;
    dailyCosts: Array<{
      date: string;
      totalCostCents: number;
      requestCount: number;
    }>;
  };
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    aiCost: number;
    profit: number;
  }>;
  metrics: {
    totalTransactions: number;
    totalAssessments: number;
    revenuePerRequest: number;
    costPerRequest: number;
  };
}

const OPERATION_LABELS: Record<string, string> = {
  'assessment_scoring': 'Assessment Scoring',
  'role_fit_single': 'Role Fit Analysis',
  'role_fit_multi': 'Multi-Candidate Analysis',
  'individual_narrative': 'Individual Report AI',
  'pdf_parsing': 'PDF Parsing',
};

const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

export default function ProfitAnalyticsTab() {
  const { toast } = useToast();
  
  const { data, isLoading, refetch, isFetching } = useQuery<ProfitData>({
    queryKey: ["/api/admin/analytics/profit"],
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/profit"] });
    refetch();
    toast({ title: "Data refreshed" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <p className="text-white/70">No profit data available</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(value);
  };

  const formatCents = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(cents / 100);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const monthlyTrendsFormatted = data.monthlyTrends.map(m => ({
    ...m,
    monthLabel: new Date(m.month + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Profit Analytics</h2>
          <p className="text-sm text-white/60">Revenue vs AI Costs Analysis</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          className="border-white/20 text-white hover:bg-white/10"
          data-testid="button-refresh-profit"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/60">Total Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-cyan-400" />
              <span className="text-2xl font-bold text-white" data-testid="text-total-revenue">
                {formatCurrency(data.overview.totalRevenue)}
              </span>
            </div>
            <div className="flex gap-4 mt-2 text-xs text-white/60">
              <span>B2C: {formatCurrency(data.overview.b2cRevenue)}</span>
              <span>B2B: {formatCurrency(data.overview.b2bRevenue)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/60">AI Costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <span className="text-2xl font-bold text-white" data-testid="text-total-ai-cost">
                {formatCurrency(data.overview.totalAiCost)}
              </span>
            </div>
            <div className="flex gap-4 mt-2 text-xs text-white/60">
              <span>{formatNumber(data.aiCosts.totalRequests)} requests</span>
              <span>{formatNumber(data.aiCosts.totalInputTokens + data.aiCosts.totalOutputTokens)} tokens</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/60">Gross Profit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {data.overview.grossProfit >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-400" />
              )}
              <span className={`text-2xl font-bold ${data.overview.grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`} data-testid="text-gross-profit">
                {formatCurrency(data.overview.grossProfit)}
              </span>
            </div>
            <div className="mt-2 text-xs text-white/60">
              Revenue minus AI costs
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/60">Profit Margin</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-amber-400" />
              <span className={`text-2xl font-bold ${data.overview.profitMargin >= 50 ? 'text-green-400' : data.overview.profitMargin >= 0 ? 'text-amber-400' : 'text-red-400'}`} data-testid="text-profit-margin">
                {data.overview.profitMargin.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 text-xs text-white/60">
              Avg {formatCurrency(data.overview.avgCostPerAssessment)}/assessment
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">Monthly Profit Trend</CardTitle>
            <CardDescription className="text-white/60">Revenue, costs, and profit over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendsFormatted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="monthLabel" 
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                    tickFormatter={(v) => formatCurrency(v)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.9)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'white' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Revenue"
                    stroke="#06b6d4" 
                    fill="#06b6d4" 
                    fillOpacity={0.3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="aiCost" 
                    name="AI Cost"
                    stroke="#8b5cf6" 
                    fill="#8b5cf6" 
                    fillOpacity={0.3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    name="Profit"
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">AI Cost by Operation</CardTitle>
            <CardDescription className="text-white/60">Breakdown by operation type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.aiCosts.byOperationType.map((op, i) => ({
                      name: OPERATION_LABELS[op.operationType] || op.operationType,
                      value: op.totalCostCents,
                      count: op.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.aiCosts.byOperationType.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.9)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'white' }}
                    formatter={(value: number) => formatCents(value)}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    formatter={(value) => <span className="text-white/80 text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">AI Cost Details</CardTitle>
            <CardDescription className="text-white/60">Cost breakdown by operation type</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-3">
                {data.aiCosts.byOperationType.length > 0 ? (
                  data.aiCosts.byOperationType.map((op, index) => (
                    <div key={op.operationType} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div>
                          <p className="text-white font-medium text-sm">
                            {OPERATION_LABELS[op.operationType] || op.operationType}
                          </p>
                          <p className="text-white/60 text-xs">
                            {op.count.toLocaleString()} requests
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{formatCents(op.totalCostCents)}</p>
                        <p className="text-white/60 text-xs">
                          avg {formatCents(op.avgCostCents)}/req
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-white/60 text-center py-4">No AI usage data yet</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">Model Usage</CardTitle>
            <CardDescription className="text-white/60">Cost breakdown by AI model</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-3">
                {data.aiCosts.byModel.length > 0 ? (
                  data.aiCosts.byModel.map((model, index) => (
                    <div key={model.model} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="h-4 w-4 text-amber-400" />
                        <div>
                          <p className="text-white font-medium text-sm">{model.model}</p>
                          <p className="text-white/60 text-xs">
                            {model.count.toLocaleString()} requests
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{formatCents(model.totalCostCents)}</p>
                        <p className="text-white/60 text-xs">
                          {((model.totalCostCents / (data.aiCosts.totalCostCents || 1)) * 100).toFixed(1)}% of total
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-white/60 text-center py-4">No model usage data yet</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-lg">Key Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white/5 rounded-lg text-center">
              <Activity className="h-5 w-5 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{data.metrics.totalTransactions}</p>
              <p className="text-xs text-white/60">Total Transactions</p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg text-center">
              <Brain className="h-5 w-5 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{data.aiCosts.totalRequests}</p>
              <p className="text-xs text-white/60">AI Requests</p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg text-center">
              <TrendingUp className="h-5 w-5 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{formatCurrency(data.metrics.revenuePerRequest)}</p>
              <p className="text-xs text-white/60">Revenue per Request</p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg text-center">
              <DollarSign className="h-5 w-5 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{formatCurrency(data.metrics.costPerRequest)}</p>
              <p className="text-xs text-white/60">Cost per Request</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
