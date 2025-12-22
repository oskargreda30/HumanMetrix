import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Package, TrendingUp, AlertTriangle, CheckCircle, Building2, BarChart3, CreditCard, Activity } from "lucide-react";
import { useUser } from "@/hooks/use-user";

interface PartnerUsageStats {
  partnerId: string;
  partnerName: string;
  companyName: string | null;
  testsPurchased: number;
  testsConsumed: number;
  remaining: number;
  usagePercentage: number;
  isSuspended: boolean;
  currentMonthSessions: number;
  totalTestsCompleted: number;
}

interface PlatformUsageStats {
  totals: {
    totalPartners: number;
    activePartners: number;
    suspendedPartners: number;
    totalTestsPurchased: number;
    totalTestsConsumed: number;
    totalRemaining: number;
    currentMonthSessions: number;
  };
  partners: PartnerUsageStats[];
}

interface OrgUsageStats {
  hasPartnerAccount: boolean;
  partner?: PartnerUsageStats;
}

export default function UsageTab() {
  const { user } = useUser();
  const isSuperAdmin = user?.role === 'super_admin';

  const { data: platformStats, isLoading: platformLoading } = useQuery<PlatformUsageStats>({
    queryKey: ["/api/admin/usage/platform"],
    enabled: isSuperAdmin,
  });

  const { data: orgStats, isLoading: orgLoading } = useQuery<OrgUsageStats>({
    queryKey: ["/api/admin/usage/organization"],
    enabled: !isSuperAdmin,
  });

  if (isSuperAdmin ? platformLoading : orgLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-usage" />
      </div>
    );
  }

  if (isSuperAdmin) {
    return <SuperAdminUsageView stats={platformStats} />;
  }

  return <OrgAdminUsageView stats={orgStats} />;
}

function SuperAdminUsageView({ stats }: { stats?: PlatformUsageStats }) {
  if (!stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load usage statistics
        </CardContent>
      </Card>
    );
  }

  const overallUsagePercent = stats.totals.totalTestsPurchased > 0
    ? Math.round((stats.totals.totalTestsConsumed / stats.totals.totalTestsPurchased) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-partners">
              {stats.totals.totalPartners}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totals.activePartners} active, {stats.totals.suspendedPartners} suspended
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Purchased</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-tests-purchased">
              {stats.totals.totalTestsPurchased.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all partners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Consumed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-tests-consumed">
              {stats.totals.totalTestsConsumed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totals.totalRemaining.toLocaleString()} remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-month-sessions">
              {stats.totals.currentMonthSessions}
            </div>
            <p className="text-xs text-muted-foreground">
              Sessions completed
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overall Platform Usage</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={overallUsagePercent} className="flex-1 h-3" data-testid="progress-platform-usage" />
            <span className="text-lg font-semibold w-16 text-right" data-testid="text-platform-usage-percent">{overallUsagePercent}%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.totals.totalTestsConsumed.toLocaleString()} of {stats.totals.totalTestsPurchased.toLocaleString()} tests used
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Partner Usage Breakdown
          </CardTitle>
          <CardDescription>
            Individual partner quota and consumption status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.partners.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No B2B partners yet
            </p>
          ) : (
            <div className="space-y-4">
              {stats.partners.map((partner) => (
                <div
                  key={partner.partnerId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`partner-usage-${partner.partnerId}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold truncate">{partner.companyName || partner.partnerName}</h4>
                        {partner.isSuspended ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Suspended
                          </Badge>
                        ) : partner.usagePercentage >= 90 ? (
                          <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-600 border-amber-500/30">
                            <AlertTriangle className="h-3 w-3" />
                            Low Quota
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-600 border-green-500/30">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={partner.usagePercentage} className="flex-1 h-2" />
                        <span className="text-sm text-muted-foreground w-12 text-right">{partner.usagePercentage}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm ml-4">
                    <div className="text-center">
                      <div className="font-semibold">{partner.testsPurchased}</div>
                      <div className="text-muted-foreground text-xs">Purchased</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{partner.testsConsumed}</div>
                      <div className="text-muted-foreground text-xs">Used</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{partner.remaining}</div>
                      <div className="text-muted-foreground text-xs">Remaining</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{partner.currentMonthSessions}</div>
                      <div className="text-muted-foreground text-xs">This Month</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OrgAdminUsageView({ stats }: { stats?: OrgUsageStats }) {
  if (!stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load usage statistics
        </CardContent>
      </Card>
    );
  }

  if (!stats.hasPartnerAccount || !stats.partner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            B2B Partner Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="mb-2">Your organisation does not have a B2B partner account.</p>
          <p className="text-sm">Contact your account manager to set up B2B API access.</p>
        </CardContent>
      </Card>
    );
  }

  const partner = stats.partner;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Purchased</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-org-tests-purchased">
              {partner.testsPurchased.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total prepaid tests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-org-tests-used">
              {partner.testsConsumed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed assessments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-org-remaining">
              {partner.remaining.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Available credits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-org-month-sessions">
              {partner.currentMonthSessions}
            </div>
            <p className="text-xs text-muted-foreground">
              Sessions completed
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Quota Usage
            {partner.isSuspended ? (
              <Badge variant="destructive" className="gap-1 ml-2">
                <AlertTriangle className="h-3 w-3" />
                API Access Suspended
              </Badge>
            ) : partner.usagePercentage >= 90 ? (
              <Badge variant="secondary" className="gap-1 ml-2 bg-amber-500/20 text-amber-600 border-amber-500/30">
                <AlertTriangle className="h-3 w-3" />
                Low Quota Warning
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 ml-2 bg-green-500/20 text-green-600 border-green-500/30">
                <CheckCircle className="h-3 w-3" />
                Active
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Your organisation's prepaid test package usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Progress value={partner.usagePercentage} className="flex-1 h-4" data-testid="progress-org-usage" />
            <span className="text-xl font-bold w-16 text-right" data-testid="text-org-usage-percent">{partner.usagePercentage}%</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">{partner.testsPurchased}</div>
              <div className="text-sm text-muted-foreground">Total Purchased</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{partner.testsConsumed}</div>
              <div className="text-sm text-muted-foreground">Used</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className={`text-2xl font-bold ${partner.remaining <= 10 ? 'text-destructive' : partner.remaining <= 25 ? 'text-amber-500' : 'text-green-500'}`}>
                {partner.remaining}
              </div>
              <div className="text-sm text-muted-foreground">Remaining</div>
            </div>
          </div>
          {partner.isSuspended && (
            <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">API Access Suspended</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Your test quota has been exhausted. Please purchase additional test credits to restore API access.
              </p>
            </div>
          )}
          {!partner.isSuspended && partner.usagePercentage >= 90 && (
            <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Low Quota Warning</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                You have only {partner.remaining} tests remaining. Consider purchasing additional credits to avoid service interruption.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
