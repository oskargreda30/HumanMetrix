import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Package, TrendingUp, AlertTriangle, CheckCircle, Building2, BarChart3, CreditCard, Activity, Plus, ShoppingCart } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  freeTestsAllocated: number;
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

interface PackageTier {
  size: number;
  pricePerTest: number;
  name: string;
  totalPrice: number;
  displayPrice: string;
  displayPricePerTest: string;
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
                      <div className="font-semibold">{Math.max(0, partner.testsPurchased - (partner.freeTestsAllocated || 0))}</div>
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

// Volume-based pricing tiers per pricing document ($1.00 = 1 Credit, 6-month expiration)
// Boutique (1-100): $20/test, Growth (101-500): $10/test, Small Enterprise (501-2,500): $5/test
// Enterprise (2,501-9,999): $2.50/test, Pro (10,000+): $1.00/test
const PACKAGE_TIERS: PackageTier[] = [
  { size: 50, pricePerTest: 20.00, name: "Boutique", totalPrice: 1000, displayPrice: "$1,000", displayPricePerTest: "$20.00" },
  { size: 250, pricePerTest: 10.00, name: "Growth", totalPrice: 2500, displayPrice: "$2,500", displayPricePerTest: "$10.00" },
  { size: 1000, pricePerTest: 5.00, name: "Small Enterprise", totalPrice: 5000, displayPrice: "$5,000", displayPricePerTest: "$5.00" },
  { size: 5000, pricePerTest: 2.50, name: "Enterprise", totalPrice: 12500, displayPrice: "$12,500", displayPricePerTest: "$2.50" },
  { size: 10000, pricePerTest: 1.00, name: "Pro", totalPrice: 10000, displayPrice: "$10,000", displayPricePerTest: "$1.00" },
];

function OrgAdminUsageView({ stats }: { stats?: OrgUsageStats }) {
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageTier | null>(null);
  const { toast } = useToast();

  const purchaseMutation = useMutation({
    mutationFn: async (packageSize: number) => {
      const response = await apiRequest("/api/partner/purchase/checkout", {
        method: "POST",
        body: JSON.stringify({ packageSize }),
      });
      return response;
    },
    onSuccess: (data: { success: boolean; sessionUrl: string }) => {
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = () => {
    if (!selectedPackage) return;
    purchaseMutation.mutate(selectedPackage.size);
  };

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
              {Math.max(0, partner.testsPurchased - (partner.freeTestsAllocated || 0)).toLocaleString()}
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
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <BarChart3 className="h-5 w-5" />
              Quota Usage
              {partner.isSuspended ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  API Access Suspended
                </Badge>
              ) : partner.usagePercentage >= 90 ? (
                <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-600 border-amber-500/30">
                  <AlertTriangle className="h-3 w-3" />
                  Low Quota Warning
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-600 border-green-500/30">
                  <CheckCircle className="h-3 w-3" />
                  Active
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Your organisation's prepaid test package usage
            </CardDescription>
          </div>
          <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-top-up">
                <Plus className="h-4 w-4" />
                Top Up Tests
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Purchase Test Package
                </DialogTitle>
                <DialogDescription>
                  Select a test package to add credits to your account. Larger packages offer better value.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-4">
                {PACKAGE_TIERS.map((tier) => (
                  <div
                    key={tier.size}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors hover-elevate ${
                      selectedPackage?.size === tier.size
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    onClick={() => setSelectedPackage(tier)}
                    data-testid={`package-tier-${tier.size}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPackage?.size === tier.size
                          ? "border-primary"
                          : "border-muted-foreground"
                      }`}>
                        {selectedPackage?.size === tier.size && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{tier.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {tier.size} tests at {tier.displayPricePerTest}/test
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{tier.displayPrice}</div>
                      {tier.pricePerTest < 5 && (
                        <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">
                          Save {Math.round((1 - tier.pricePerTest / 5) * 100)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPurchaseOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handlePurchase}
                  disabled={!selectedPackage || purchaseMutation.isPending}
                  data-testid="button-confirm-purchase"
                >
                  {purchaseMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Redirecting...
                    </>
                  ) : selectedPackage ? (
                    `Purchase ${selectedPackage.size} Tests`
                  ) : (
                    "Select a Package"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Progress value={partner.usagePercentage} className="flex-1 h-4" data-testid="progress-org-usage" />
            <span className="text-xl font-bold w-16 text-right" data-testid="text-org-usage-percent">{partner.usagePercentage}%</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">{Math.max(0, partner.testsPurchased - (partner.freeTestsAllocated || 0))}</div>
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
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">API Access Suspended</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your test quota has been exhausted. Purchase additional credits to restore API access.
                  </p>
                </div>
                <Button onClick={() => setIsPurchaseOpen(true)} data-testid="button-restore-access">
                  Restore Access
                </Button>
              </div>
            </div>
          )}
          {!partner.isSuspended && partner.usagePercentage >= 90 && (
            <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Low Quota Warning</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    You have only {partner.remaining} tests remaining. Consider purchasing additional credits.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setIsPurchaseOpen(true)} data-testid="button-top-up-warning">
                  Top Up
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
