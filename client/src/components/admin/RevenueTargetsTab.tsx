import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  RefreshCw, 
  TrendingUp,
  TrendingDown,
  Target,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap
} from "lucide-react";
import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Cell
} from "recharts";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MonthlyData {
  month: string;
  monthLabel: string;
  target: number;
  actual: number;
  variance: number;
  hitTarget: boolean;
}

interface MilestoneProgress {
  label: string;
  target: number;
  current: number;
  percentComplete: number;
  meetsThreshold: boolean;
  vestedPercent: number;
  additionalPercent: number;
}

interface RevenueTargetsData {
  monthlyData: MonthlyData[];
  summary: {
    totalTarget: number;
    currentTotal: number;
    cumulativeVariance: number;
    monthsHittingTarget: number;
    monthsTotal: number;
    momGrowth: string;
    avgMonthlyRevenue: number;
  };
  forecast: {
    projectedTotal: number;
    forecastVsTarget: number;
    onTrackForTarget: boolean;
    remainingMonths: number;
  };
  profitParticipation: {
    effectiveDate: string;
    cliffPassed: boolean;
    monthsUntilCliff: number;
    baseParticipation: number;
    performanceParticipation: string;
    totalParticipation: string;
    maxPossible: number;
    milestones: MilestoneProgress[];
    totalRevenueSinceEffective: number;
    monthsRemainingForMilestones: number;
  };
}

export default function RevenueTargetsTab() {
  const { toast } = useToast();
  
  const { data, isLoading, refetch, isFetching } = useQuery<RevenueTargetsData>({
    queryKey: ["/api/admin/accounting/revenue-targets"],
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/accounting/revenue-targets"] });
    refetch();
    toast({ title: "Data refreshed" });
  };

  const formatCurrency = (amount: number) => {
    return `£${(amount / 100).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatCurrencyDetailed = (amount: number) => {
    return `£${(amount / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-revenue-targets" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load revenue targets data
        </CardContent>
      </Card>
    );
  }

  const momGrowth = parseFloat(data.summary.momGrowth);
  const isPositiveGrowth = momGrowth >= 0;

  const chartData = data.monthlyData.map(m => ({
    ...m,
    targetDisplay: m.target / 100,
    actualDisplay: m.actual / 100,
    varianceDisplay: m.variance / 100,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Sales Targets</h2>
          <p className="text-sm text-muted-foreground">Track monthly revenue against targets</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          data-testid="button-refresh-targets"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Revenue</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.currentTotal)}</div>
            <p className="text-xs text-muted-foreground">
              of {formatCurrency(data.summary.totalTarget)} target
            </p>
            <Progress 
              value={(data.summary.currentTotal / data.summary.totalTarget) * 100} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Months On Target</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.monthsHittingTarget}/{data.summary.monthsTotal}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.monthsTotal > 0 
                ? `${Math.round((data.summary.monthsHittingTarget / data.summary.monthsTotal) * 100)}% success rate`
                : 'No data yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MoM Growth</CardTitle>
            {isPositiveGrowth ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-1 ${isPositiveGrowth ? 'text-green-600' : 'text-red-600'}`}>
              {isPositiveGrowth ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              {Math.abs(momGrowth).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">vs previous month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumulative Variance</CardTitle>
            {data.summary.cumulativeVariance >= 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.summary.cumulativeVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.summary.cumulativeVariance >= 0 ? '+' : ''}{formatCurrency(data.summary.cumulativeVariance)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.cumulativeVariance >= 0 ? 'Ahead of target' : 'Behind target'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Monthly Target vs Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="monthLabel" 
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  formatter={(value: number) => [`£${value.toLocaleString()}`, '']}
                  labelFormatter={(label) => `Month: ${label}`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="targetDisplay" 
                  name="Target" 
                  fill="hsl(var(--muted-foreground))" 
                  opacity={0.4}
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="actualDisplay" 
                  name="Actual" 
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.hitTarget ? '#10b981' : entry.actual > 0 ? '#f59e0b' : 'hsl(var(--muted))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-muted-foreground">Target Hit</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-muted-foreground">Below Target</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-muted" />
              <span className="text-muted-foreground">No Data</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Forecast Projection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Projected Year-End Total</p>
              <p className="text-3xl font-bold">{formatCurrency(data.forecast.projectedTotal)}</p>
              <p className="text-sm text-muted-foreground">
                Based on £{(data.summary.avgMonthlyRevenue / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })} avg monthly
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Forecast vs Target</p>
              <p className={`text-3xl font-bold ${data.forecast.forecastVsTarget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.forecast.forecastVsTarget >= 0 ? '+' : ''}{formatCurrency(data.forecast.forecastVsTarget)}
              </p>
              <Badge variant={data.forecast.onTrackForTarget ? "default" : "destructive"}>
                {data.forecast.onTrackForTarget ? 'On Track' : 'At Risk'}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Months Remaining</p>
              <p className="text-3xl font-bold">{data.forecast.remainingMonths}</p>
              <p className="text-sm text-muted-foreground">in target period</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <Trophy className="h-5 w-5" />
            Profit Participation Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Base Participation</p>
              <p className="text-2xl font-bold text-purple-600">
                {data.profitParticipation.cliffPassed ? `${data.profitParticipation.baseParticipation}%` : '0%'}
              </p>
              {!data.profitParticipation.cliffPassed && (
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <Clock className="h-3 w-3" />
                  {data.profitParticipation.monthsUntilCliff} months until cliff
                </div>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Performance Bonus</p>
              <p className="text-2xl font-bold text-purple-600">
                +{data.profitParticipation.performanceParticipation}%
              </p>
              <p className="text-xs text-muted-foreground">of 15% possible</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Participation</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {data.profitParticipation.totalParticipation}%
              </p>
              <p className="text-xs text-muted-foreground">
                of {data.profitParticipation.maxPossible}% maximum
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Revenue Since Start</p>
              <p className="text-2xl font-bold">
                {formatCurrency(data.profitParticipation.totalRevenueSinceEffective)}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.profitParticipation.monthsRemainingForMilestones} months left
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Revenue Milestones</h4>
            {data.profitParticipation.milestones.map((milestone, index) => (
              <div key={index} className="space-y-2 p-4 rounded-lg bg-background border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={milestone.percentComplete >= 100 ? "default" : "outline"}
                      className={milestone.percentComplete >= 100 ? "bg-green-500" : ""}
                    >
                      Tier {index + 1}
                    </Badge>
                    <span className="font-medium">{milestone.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">+{milestone.vestedPercent.toFixed(2)}%</span>
                    <span className="text-muted-foreground text-sm"> / {milestone.additionalPercent}%</span>
                  </div>
                </div>
                <Progress 
                  value={milestone.percentComplete} 
                  className={`h-3 ${milestone.percentComplete >= 100 ? '[&>div]:bg-green-500' : milestone.meetsThreshold ? '[&>div]:bg-amber-500' : ''}`}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatCurrency(milestone.current)} / {formatCurrency(milestone.target)}
                  </span>
                  <span className={`font-medium ${
                    milestone.percentComplete >= 100 ? 'text-green-600' : 
                    milestone.meetsThreshold ? 'text-amber-600' : 'text-muted-foreground'
                  }`}>
                    {milestone.percentComplete.toFixed(1)}%
                    {milestone.meetsThreshold && milestone.percentComplete < 100 && (
                      <span className="text-xs ml-1">(pro-rata eligible)</span>
                    )}
                  </span>
                </div>
                {milestone.percentComplete < 60 && (
                  <p className="text-xs text-muted-foreground">
                    Need {formatCurrency(milestone.target * 0.6)} (60%) for pro-rata vesting
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium mb-2">How it works:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Base 15% participation after 6-month cliff</li>
              <li>• Additional 5% for each milestone achieved (up to 15% bonus)</li>
              <li>• If 60%+ of a milestone is hit, pro-rata vesting applies</li>
              <li>• All milestones must be achieved within 36 months</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
