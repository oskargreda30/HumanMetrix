import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  RefreshCw, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Building2,
  Users,
  ArrowUpRight,
  ArrowDownRight
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
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RevenueData {
  overview: {
    totalRevenue: number;
    b2cRevenue: number;
    b2bRevenue: number;
    mrr: number;
    arr: number;
    thisMonth: {
      total: number;
      b2c: number;
      b2b: number;
    };
    lastMonth: {
      total: number;
      b2c: number;
      b2b: number;
    };
    growthRate: string | number;
  };
  monthlyTrends: Array<{
    month: string;
    monthLabel: string;
    b2cRevenue: number;
    b2bRevenue: number;
    totalRevenue: number;
  }>;
  revenueByBillingType: {
    payg: number;
    subscription: number;
    enterprise: number;
  };
  topPartners: Array<{
    partnerId: string;
    partnerName: string;
    billingType: string;
    totalRevenue: number;
    invoiceCount: number;
  }>;
  metrics: {
    b2cTransactions: number;
    b2bInvoicesPaid: number;
    activeSubscriptions: number;
    averageB2cOrder: number;
    averageB2bInvoice: number;
  };
}

const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b'];

export default function RevenueDashboardTab() {
  const { toast } = useToast();
  
  const { data, isLoading, refetch, isFetching } = useQuery<RevenueData>({
    queryKey: ["/api/admin/billing/revenue-dashboard"],
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/revenue-dashboard"] });
    refetch();
    toast({ title: "Data refreshed" });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-revenue" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load revenue data
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return `£${(amount / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
  };

  const growthRate = Number(data.overview.growthRate);
  const isPositiveGrowth = growthRate >= 0;

  const billingTypeData = [
    { name: 'PAYG', value: data.revenueByBillingType.payg },
    { name: 'Subscription', value: data.revenueByBillingType.subscription },
    { name: 'Enterprise', value: data.revenueByBillingType.enterprise },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Revenue Dashboard</h2>
          <p className="text-sm text-white/70">Comprehensive revenue analytics and trends</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          data-testid="button-refresh-revenue"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">{formatCurrency(data.overview.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            {isPositiveGrowth ? (
              <ArrowUpRight className="h-4 w-4 text-green-400" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-this-month">{formatCurrency(data.overview.thisMonth.total)}</div>
            <div className={`text-xs ${isPositiveGrowth ? 'text-green-400' : 'text-red-400'}`}>
              {isPositiveGrowth ? '+' : ''}{growthRate}% vs last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-mrr">{formatCurrency(data.overview.mrr)}</div>
            <p className="text-xs text-muted-foreground">Monthly Recurring Revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-arr">{formatCurrency(data.overview.arr)}</div>
            <p className="text-xs text-muted-foreground">Annual Recurring Revenue</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">B2C Revenue</CardTitle>
            <Users className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-cyan-400">{formatCurrency(data.overview.b2cRevenue)}</div>
            <p className="text-xs text-muted-foreground">{data.metrics.b2cTransactions} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">B2B Revenue</CardTitle>
            <Building2 className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-400">{formatCurrency(data.overview.b2bRevenue)}</div>
            <p className="text-xs text-muted-foreground">{data.metrics.b2bInvoicesPaid} invoices paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg B2C Order</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(data.metrics.averageB2cOrder)}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg B2B Invoice</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(data.metrics.averageB2bInvoice)}</div>
            <p className="text-xs text-muted-foreground">{data.metrics.activeSubscriptions} active subscriptions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
            <CardDescription>B2C and B2B revenue over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="monthLabel" 
                    stroke="#9ca3af"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={12}
                    tickFormatter={(value) => `£${(value / 100).toFixed(0)}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    formatter={(value: number) => [`£${(value / 100).toFixed(2)}`, '']}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="b2cRevenue" name="B2C" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="b2bRevenue" name="B2B" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Billing Type</CardTitle>
            <CardDescription>B2B partner revenue breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {billingTypeData.length > 0 ? (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={billingTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {billingTypeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                        formatter={(value: number) => [formatCurrency(value), '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {billingTypeData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No B2B revenue data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Partners by Revenue</CardTitle>
          <CardDescription>Partners generating the most revenue</CardDescription>
        </CardHeader>
        <CardContent>
          {data.topPartners.length > 0 ? (
            <div className="space-y-4">
              {data.topPartners.map((partner, index) => {
                const maxRevenue = data.topPartners[0]?.totalRevenue || 1;
                const percentage = (partner.totalRevenue / maxRevenue) * 100;
                return (
                  <div key={partner.partnerId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground w-6">{index + 1}</span>
                        <div>
                          <span className="font-medium">{partner.partnerName}</span>
                          <Badge variant="outline" className="ml-2 text-xs">{partner.billingType}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(partner.totalRevenue)}</div>
                        <div className="text-xs text-muted-foreground">{partner.invoiceCount} invoices</div>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No partner revenue data yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
