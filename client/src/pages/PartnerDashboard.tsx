import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Package, TrendingUp, AlertTriangle, CheckCircle, CreditCard, Activity, BarChart3, FileText, Receipt, Building2, ArrowLeft, ExternalLink, Settings, Key, Bell, RefreshCw, Copy, Check, Shield } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import dashboardBg from "@assets/image_1763608498774.png";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PartnerAccount {
  hasPartnerAccount: boolean;
  partner?: {
    id: string;
    name: string;
    companyName: string | null;
    billingType: string;
    testsPurchased: number;
    testsConsumed: number;
    remaining: number;
    isSuspended: boolean;
    suspendedAt: string | null;
    activeApiKeys: number;
    createdAt: string;
  };
}

interface UsageStats {
  currentMonth: {
    sessions: number;
    period: { start: string; end: string };
  };
  allTime: {
    totalTests: number;
  };
  quota: {
    purchased: number;
    consumed: number;
    remaining: number;
  };
  monthlyUsage: Array<{ month: string; sessions: number }>;
  recentEvents: Array<{
    id: string;
    eventType: string;
    createdAt: string;
    metadata?: any;
  }>;
}

interface BillingData {
  billingType: string;
  summary: {
    totalSpent: number;
    pendingAmount: number;
    pendingInvoices: number;
  };
  items: Array<{
    id: string;
    type: 'receipt' | 'invoice';
    date: string;
    description: string;
    amount: number;
    currency: string;
    status: string;
    invoiceNumber?: string;
    dueDate?: string;
    tests?: number;
    pricePerTest?: number;
    testsUsed?: number;
  }>;
}

interface PartnerSettings {
  hasPartnerAccount: boolean;
  settings?: {
    quotaAlertEnabled: boolean;
    quotaAlertThreshold: number;
    quotaAlertEmail: string;
    autoTopUpEnabled: boolean;
    autoTopUpThreshold: number;
    autoTopUpPackage: string | null;
    billingType: string;
    billingEmail: string;
  };
}

interface ApiKey {
  id: string;
  name: string;
  environment: string;
  keyPrefix: string;
  keyHint: string;
  displayKey: string;
  permissions: string[];
  rateLimit: number;
  lastUsedAt: string | null;
  createdAt: string;
  organisationId: string | null;
}

interface ApiKeysData {
  hasPartnerAccount: boolean;
  apiKeys: ApiKey[];
}

const PACKAGE_OPTIONS = [
  { value: 'starter', label: 'Starter (10 tests)' },
  { value: 'growth', label: 'Growth (25 tests)' },
  { value: 'professional', label: 'Professional (50 tests)' },
  { value: 'business', label: 'Business (100 tests)' },
  { value: 'enterprise', label: 'Enterprise (250 tests)' },
  { value: 'enterprise_plus', label: 'Enterprise+ (500 tests)' },
];

export default function PartnerDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("usage");
  const { toast } = useToast();
  
  // Settings state
  const [quotaAlertEnabled, setQuotaAlertEnabled] = useState(true);
  const [quotaAlertThreshold, setQuotaAlertThreshold] = useState(80);
  const [quotaAlertEmail, setQuotaAlertEmail] = useState("");
  const [autoTopUpEnabled, setAutoTopUpEnabled] = useState(false);
  const [autoTopUpThreshold, setAutoTopUpThreshold] = useState(10);
  const [autoTopUpPackage, setAutoTopUpPackage] = useState<string | null>(null);
  
  // API key rotation state
  const [rotatingKeyId, setRotatingKeyId] = useState<string | null>(null);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState(false);

  const { data: account, isLoading: accountLoading } = useQuery<PartnerAccount>({
    queryKey: ["/api/partner/me"],
  });

  const { data: usage, isLoading: usageLoading } = useQuery<UsageStats>({
    queryKey: ["/api/partner/me/usage"],
    enabled: !!account?.hasPartnerAccount,
  });

  const { data: billing, isLoading: billingLoading } = useQuery<BillingData>({
    queryKey: ["/api/partner/me/billing"],
    enabled: !!account?.hasPartnerAccount,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<PartnerSettings>({
    queryKey: ["/api/partner/me/settings"],
    enabled: !!account?.hasPartnerAccount,
  });

  const { data: apiKeys, isLoading: apiKeysLoading } = useQuery<ApiKeysData>({
    queryKey: ["/api/partner/me/api-keys"],
    enabled: !!account?.hasPartnerAccount,
  });

  // Initialize settings from fetched data
  const initSettings = () => {
    if (settings?.settings) {
      setQuotaAlertEnabled(settings.settings.quotaAlertEnabled);
      setQuotaAlertThreshold(settings.settings.quotaAlertThreshold);
      setQuotaAlertEmail(settings.settings.quotaAlertEmail);
      setAutoTopUpEnabled(settings.settings.autoTopUpEnabled);
      setAutoTopUpThreshold(settings.settings.autoTopUpThreshold);
      setAutoTopUpPackage(settings.settings.autoTopUpPackage);
    }
  };

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<{
      quotaAlertEnabled: boolean;
      quotaAlertThreshold: number;
      quotaAlertEmail: string;
      autoTopUpEnabled: boolean;
      autoTopUpThreshold: number;
      autoTopUpPackage: string | null;
    }>) => {
      const response = await apiRequest("PATCH", "/api/partner/me/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/settings"] });
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Rotate API key mutation
  const rotateKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await apiRequest("POST", `/api/partner/me/api-keys/${keyId}/rotate`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/api-keys"] });
      setNewApiKey(data.newKey);
      setShowNewKeyDialog(true);
      setRotatingKeyId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to rotate key",
        description: error.message,
        variant: "destructive",
      });
      setRotatingKeyId(null);
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      quotaAlertEnabled,
      quotaAlertThreshold,
      quotaAlertEmail,
      autoTopUpEnabled,
      autoTopUpThreshold,
      autoTopUpPackage,
    });
  };

  const handleRotateKey = (keyId: string) => {
    setRotatingKeyId(keyId);
    rotateKeyMutation.mutate(keyId);
  };

  const handleCopyKey = async () => {
    await navigator.clipboard.writeText(newApiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const formatCurrency = (amount: number, currency: string = 'gbp') => {
    const currencySymbols: Record<string, string> = {
      gbp: '£',
      usd: '$',
      eur: '€',
    };
    const symbol = currencySymbols[currency.toLowerCase()] || '£';
    return `${symbol}${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (accountLoading) {
    return (
      <div className="min-h-screen flex flex-col relative">
        <Navigation />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-partner-dashboard" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!account?.hasPartnerAccount) {
    return (
      <div className="min-h-screen flex flex-col relative">
        <div className="fixed inset-0 z-0">
          <div 
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: `url(${dashboardBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to bottom, rgba(13, 29, 51, 0.85), rgba(13, 29, 51, 0.75), rgba(13, 29, 51, 0.85))'
          }} />
        </div>
        <Navigation />
        <main className="flex-grow flex items-center justify-center relative z-10 py-16 px-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>No Partner Account</CardTitle>
              <CardDescription>
                Your organisation does not have a B2B partner account. Contact our team to set up API access for your organisation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => setLocation("/dashboard")}
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const partner = account.partner!;
  const usagePercentage = partner.testsPurchased > 0 
    ? Math.round((partner.testsConsumed / partner.testsPurchased) * 100) 
    : 0;

  return (
    <div className="min-h-screen flex flex-col relative">
      <Helmet>
        <title>Partner Dashboard | HumanMetrix</title>
        <meta name="description" content="View your B2B partner usage statistics and billing history." />
      </Helmet>

      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url(${dashboardBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(13, 29, 51, 0.85), rgba(13, 29, 51, 0.75), rgba(13, 29, 51, 0.85))'
        }} />
      </div>

      <Navigation />

      <main className="flex-grow relative z-10 py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white" data-testid="text-partner-name">
                {partner.companyName || partner.name}
              </h1>
              <p className="text-white/70">Partner Dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              {partner.isSuspended ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  API Suspended
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="h-3 w-3" />
                  Active
                </Badge>
              )}
              <Button
                variant="outline"
                onClick={() => setLocation("/developers")}
                className="gap-2"
                data-testid="button-api-docs"
              >
                <ExternalLink className="h-4 w-4" />
                API Docs
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tests Purchased</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-tests-purchased">
                  {partner.testsPurchased.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total credits
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tests Used</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-tests-used">
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
                <div className={`text-2xl font-bold ${partner.remaining <= 10 ? 'text-destructive' : partner.remaining <= 25 ? 'text-amber-500' : ''}`} data-testid="text-remaining">
                  {partner.remaining.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Available credits
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active API Keys</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-api-keys">
                  {partner.activeApiKeys}
                </div>
                <p className="text-xs text-muted-foreground">
                  Connected applications
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-4 mb-2">
                <Progress value={usagePercentage} className="flex-1 h-3" data-testid="progress-usage" />
                <span className="text-lg font-semibold w-16 text-right" data-testid="text-usage-percent">{usagePercentage}%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {partner.testsConsumed.toLocaleString()} of {partner.testsPurchased.toLocaleString()} tests used
              </p>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="usage" className="gap-2" data-testid="tab-usage">
                <BarChart3 className="h-4 w-4" />
                Usage
              </TabsTrigger>
              <TabsTrigger value="billing" className="gap-2" data-testid="tab-billing">
                <Receipt className="h-4 w-4" />
                Billing
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings" onClick={initSettings}>
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="usage" className="space-y-4">
              {usageLoading ? (
                <Card>
                  <CardContent className="py-8 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </CardContent>
                </Card>
              ) : usage ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">This Month</CardTitle>
                        <CardDescription>
                          {new Date(usage.currentMonth.period.start).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold text-primary" data-testid="text-month-sessions">
                          {usage.currentMonth.sessions}
                        </div>
                        <p className="text-sm text-muted-foreground">assessments completed</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">All Time</CardTitle>
                        <CardDescription>
                          Since account creation
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold" data-testid="text-total-tests">
                          {usage.allTime.totalTests}
                        </div>
                        <p className="text-sm text-muted-foreground">total assessments</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Monthly Usage Trend</CardTitle>
                      <CardDescription>Last 6 months activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={usage.monthlyUsage}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="month" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                            <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {usage.recentEvents.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                        <CardDescription>Latest assessment sessions</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {usage.recentEvents.map((event) => (
                            <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md bg-primary/10">
                                  <Activity className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <div className="font-medium text-sm">
                                    {event.eventType === 'session_completed' ? 'Assessment Completed' : 
                                     event.eventType === 'session_started' ? 'Session Started' :
                                     event.eventType}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(event.createdAt)}
                                  </div>
                                </div>
                              </div>
                              {event.metadata?.assessmentType && (
                                <Badge variant="secondary">{event.metadata.assessmentType}</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Unable to load usage data
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="billing" className="space-y-4">
              {billingLoading ? (
                <Card>
                  <CardContent className="py-8 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </CardContent>
                </Card>
              ) : billing ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="text-total-spent">
                          {formatCurrency(billing.summary.totalSpent)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          All time purchases
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="text-pending-count">
                          {billing.summary.pendingInvoices}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Awaiting payment
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Amount Due</CardTitle>
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${billing.summary.pendingAmount > 0 ? 'text-amber-500' : ''}`} data-testid="text-pending-amount">
                          {formatCurrency(billing.summary.pendingAmount)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Outstanding balance
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Billing History</CardTitle>
                      <CardDescription>
                        Receipts and invoices
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {billing.items.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No billing history yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {billing.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`billing-item-${item.id}`}>
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-md ${item.type === 'receipt' ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                                  {item.type === 'receipt' ? (
                                    <Receipt className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <FileText className="h-5 w-5 text-primary" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium">{item.description}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatDate(item.date)}
                                    {item.invoiceNumber && ` • ${item.invoiceNumber}`}
                                  </div>
                                  {item.tests && (
                                    <div className="text-xs text-muted-foreground">
                                      {item.tests} tests @ {formatCurrency(item.pricePerTest || 0)}/test
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg">
                                  {formatCurrency(item.amount, item.currency)}
                                </div>
                                {item.type === 'receipt' ? (
                                  <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                                    Paid
                                  </Badge>
                                ) : (
                                  <Badge 
                                    variant={item.status === 'paid' ? 'secondary' : item.status === 'overdue' ? 'destructive' : 'outline'}
                                    className={item.status === 'paid' ? 'bg-green-500/20 text-green-600' : ''}
                                  >
                                    {item.status === 'sent' ? 'Pending' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                  </Badge>
                                )}
                                {item.dueDate && item.status !== 'paid' && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Due: {formatDate(item.dueDate)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Unable to load billing data
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              {settingsLoading || apiKeysLoading ? (
                <Card>
                  <CardContent className="py-8 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        API Keys
                      </CardTitle>
                      <CardDescription>
                        Manage your API keys for accessing the HumanMetrix API
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!apiKeys?.apiKeys || apiKeys.apiKeys.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No API keys found</p>
                          <p className="text-sm mt-2">Contact support to create API keys for your account</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {apiKeys.apiKeys.map((key) => (
                            <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`api-key-${key.id}`}>
                              <div className="flex items-center gap-4">
                                <div className="p-2 rounded-md bg-primary/10">
                                  <Shield className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <div className="font-medium">{key.name}</div>
                                  <div className="text-sm font-mono text-muted-foreground" data-testid={`api-key-display-${key.id}`}>
                                    {key.displayKey}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {key.environment}
                                    </Badge>
                                    {key.lastUsedAt && (
                                      <span className="text-xs text-muted-foreground">
                                        Last used: {formatDate(key.lastUsedAt)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRotateKey(key.id)}
                                disabled={rotatingKeyId === key.id}
                                data-testid={`button-rotate-key-${key.id}`}
                              >
                                {rotatingKeyId === key.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                                <span className="ml-2">Rotate</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Quota Alerts
                      </CardTitle>
                      <CardDescription>
                        Get notified when your test credits are running low
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="quota-alerts">Enable quota alerts</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive email notifications when credits drop below threshold
                          </p>
                        </div>
                        <Switch
                          id="quota-alerts"
                          checked={quotaAlertEnabled}
                          onCheckedChange={setQuotaAlertEnabled}
                          data-testid="switch-quota-alerts"
                        />
                      </div>

                      {quotaAlertEnabled && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="alert-threshold">Alert threshold (%)</Label>
                            <Select
                              value={quotaAlertThreshold.toString()}
                              onValueChange={(v) => setQuotaAlertThreshold(parseInt(v))}
                            >
                              <SelectTrigger data-testid="select-quota-threshold">
                                <SelectValue placeholder="Select threshold" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="90">90% used (10% remaining)</SelectItem>
                                <SelectItem value="80">80% used (20% remaining)</SelectItem>
                                <SelectItem value="70">70% used (30% remaining)</SelectItem>
                                <SelectItem value="50">50% used (50% remaining)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="alert-email">Notification email</Label>
                            <Input
                              id="alert-email"
                              type="email"
                              placeholder="billing@company.com"
                              value={quotaAlertEmail}
                              onChange={(e) => setQuotaAlertEmail(e.target.value)}
                              data-testid="input-quota-email"
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {settings?.settings?.billingType === 'prepaid' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Auto Top-Up
                        </CardTitle>
                        <CardDescription>
                          Automatically purchase more tests when your balance runs low
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="auto-topup">Enable auto top-up</Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically purchase credits when remaining tests fall below threshold
                            </p>
                          </div>
                          <Switch
                            id="auto-topup"
                            checked={autoTopUpEnabled}
                            onCheckedChange={setAutoTopUpEnabled}
                            data-testid="switch-auto-topup"
                          />
                        </div>

                        {autoTopUpEnabled && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="topup-threshold">Trigger when remaining tests fall below</Label>
                              <Input
                                id="topup-threshold"
                                type="number"
                                min={1}
                                max={100}
                                value={autoTopUpThreshold}
                                onChange={(e) => setAutoTopUpThreshold(parseInt(e.target.value) || 10)}
                                data-testid="input-topup-threshold"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="topup-package">Package to purchase</Label>
                              <Select
                                value={autoTopUpPackage || ""}
                                onValueChange={(v) => setAutoTopUpPackage(v || null)}
                              >
                                <SelectTrigger data-testid="select-topup-package">
                                  <SelectValue placeholder="Select a package" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PACKAGE_OPTIONS.map((pkg) => (
                                    <SelectItem key={pkg.value} value={pkg.value}>
                                      {pkg.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveSettings}
                      disabled={updateSettingsMutation.isPending}
                      data-testid="button-save-settings"
                    >
                      {updateSettingsMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
                      Save Settings
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New API Key Generated</DialogTitle>
            <DialogDescription>
              Your API key has been rotated. Copy the new key now - you won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm break-all">
              <code data-testid="text-new-api-key">{newApiKey}</code>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCopyKey} data-testid="button-copy-new-key">
              {copiedKey ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copiedKey ? "Copied!" : "Copy Key"}
            </Button>
            <Button onClick={() => setShowNewKeyDialog(false)} data-testid="button-close-key-dialog">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
