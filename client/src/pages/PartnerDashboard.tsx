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
import { Loader2, Package, TrendingUp, AlertTriangle, CheckCircle, CreditCard, Activity, BarChart3, FileText, Receipt, Building2, ArrowLeft, ExternalLink, Settings, Key, Bell, RefreshCw, Copy, Check, Shield, Webhook, Link2, FileSpreadsheet, Home, Users, ClipboardList, Clock, Plus, Trash2, Eye, Mail } from "lucide-react";
import { PartnerIntegrationsTab } from "@/components/PartnerIntegrationsTab";
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

interface PartnerOrganization {
  id: string;
  partnerId: string;
  name: string;
  slug: string;
  adminEmail: string | null;
  adminName: string | null;
  isActive: boolean;
  createdAt: string;
  testsUsed: number;
  activeTests: number;
}

interface OrganizationsData {
  organizations: PartnerOrganization[];
}

interface OrganizationDetails {
  organization: PartnerOrganization;
  stats: {
    totalTests: number;
    completedTests: number;
    pendingTests: number;
    inProgressTests: number;
  };
  results: Array<{
    sessionId: string;
    assessmentType: string;
    externalUserId: string | null;
    externalEmail: string | null;
    completedAt: string | null;
    score: any;
  }>;
}

interface ActivityLog {
  activities: Array<{
    id: string;
    type: string;
    description: string;
    metadata?: any;
    createdAt: string;
    organizationId: string | null;
  }>;
  total: number;
}

interface PartnerResult {
  sessionId: string;
  assessmentType: string;
  externalUserId: string | null;
  externalEmail: string | null;
  completedAt: string | null;
  createdAt: string;
  organization: { id: string; name: string } | null;
  scores: any;
  overallScore: number | null;
}

interface ResultsData {
  results: PartnerResult[];
  total: number;
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
  const [activeTab, setActiveTab] = useState("home");
  const { toast } = useToast();
  
  // Organization state
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [showAddOrgDialog, setShowAddOrgDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [newOrgAdminEmail, setNewOrgAdminEmail] = useState("");
  const [newOrgAdminName, setNewOrgAdminName] = useState("");
  
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
  
  // Purchase state
  const [purchasingPackageSize, setPurchasingPackageSize] = useState<number | null>(null);

  const { data: account, isLoading: accountLoading } = useQuery<PartnerAccount>({
    queryKey: ["/api/partner/account"],
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

  const { data: organizations, isLoading: organizationsLoading } = useQuery<OrganizationsData>({
    queryKey: ["/api/partner/me/organizations"],
    enabled: !!account?.hasPartnerAccount,
  });

  const { data: selectedOrg, isLoading: selectedOrgLoading } = useQuery<OrganizationDetails>({
    queryKey: ["/api/partner/me/organizations", selectedOrgId],
    enabled: !!selectedOrgId,
  });

  const { data: activityLog, isLoading: activityLoading } = useQuery<ActivityLog>({
    queryKey: ["/api/partner/me/activity-log"],
    enabled: !!account?.hasPartnerAccount,
  });

  const { data: resultsData, isLoading: resultsLoading } = useQuery<ResultsData>({
    queryKey: ["/api/partner/me/results"],
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

  // Purchase test package mutation
  const purchaseMutation = useMutation({
    mutationFn: async (packageSize: number) => {
      const response = await apiRequest("POST", "/api/partner/purchase/checkout", { packageSize });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
      setPurchasingPackageSize(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create checkout",
        description: error.message,
        variant: "destructive",
      });
      setPurchasingPackageSize(null);
    },
  });

  const handlePurchase = (packageSize: number) => {
    setPurchasingPackageSize(packageSize);
    purchaseMutation.mutate(packageSize);
  };

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; adminEmail?: string; adminName?: string }) => {
      const response = await apiRequest("POST", "/api/partner/me/organizations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/organizations"] });
      setShowAddOrgDialog(false);
      setNewOrgName("");
      setNewOrgSlug("");
      setNewOrgAdminEmail("");
      setNewOrgAdminName("");
      toast({
        title: "Organization created",
        description: "The organization has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete organization mutation
  const deleteOrgMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const response = await apiRequest("DELETE", `/api/partner/me/organizations/${orgId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/organizations"] });
      setSelectedOrgId(null);
      toast({
        title: "Organization deleted",
        description: "The organization has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateOrg = () => {
    if (!newOrgName || !newOrgSlug) return;
    createOrgMutation.mutate({
      name: newOrgName,
      slug: newOrgSlug,
      adminEmail: newOrgAdminEmail || undefined,
      adminName: newOrgAdminName || undefined,
    });
  };

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

      <main className="flex-grow py-16 relative z-10">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white" data-testid="text-partner-name">
                {partner.companyName || partner.name}
              </h1>
              {partner.isSuspended ? (
                <Badge variant="destructive" className="gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  API Suspended
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1.5 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                  <CheckCircle className="h-3 w-3" />
                  Partner
                </Badge>
              )}
            </div>
            <p className="text-white/80">
              Manage your assessments, organizations, and API integrations
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="inline-flex flex-wrap gap-1 h-auto p-1 bg-white/10 border border-white/20 w-auto">
              <TabsTrigger value="home" data-testid="tab-home" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Home
              </TabsTrigger>
              <TabsTrigger value="results" data-testid="tab-results" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Results
              </TabsTrigger>
              <TabsTrigger value="organizations" data-testid="tab-organizations" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Organizations
              </TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Activity Log
              </TabsTrigger>
              <TabsTrigger value="usage" data-testid="tab-usage" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Usage
              </TabsTrigger>
              <TabsTrigger value="billing" data-testid="tab-billing" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Billing
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings" onClick={initSettings} className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Settings
              </TabsTrigger>
              <TabsTrigger value="integrations" data-testid="tab-integrations" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Integrations
              </TabsTrigger>
            </TabsList>

            {/* Home Tab */}
            <TabsContent value="home" className="space-y-6">
              {/* Usage Stats */}
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
                    <p className="text-xs text-muted-foreground">Total credits</p>
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
                    <p className="text-xs text-muted-foreground">Completed assessments</p>
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
                    <p className="text-xs text-muted-foreground">Available credits</p>
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
                    <p className="text-xs text-muted-foreground">Connected applications</p>
                  </CardContent>
                </Card>
              </div>

              {/* Usage Progress */}
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

              {/* Secondary Stats */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">This Month</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary" data-testid="home-month-sessions">
                      {usage?.currentMonth?.sessions ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">assessments completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="home-org-count">
                      {organizations?.organizations?.length ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">active organizations</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed Results</CardTitle>
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="home-results-count">
                      {resultsData?.total ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">assessment results</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>Latest events across your account</CardDescription>
                </CardHeader>
                <CardContent>
                  {activityLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : activityLog?.activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activityLog?.activities.slice(0, 5).map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-primary/10">
                              <Activity className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">{activity.description}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(activity.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("results")} data-testid="card-quick-results">
                  <CardContent className="pt-6 text-center">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-semibold">View Results</h3>
                    <p className="text-sm text-muted-foreground">See assessment results</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("organizations")} data-testid="card-quick-organizations">
                  <CardContent className="pt-6 text-center">
                    <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-semibold">Organizations</h3>
                    <p className="text-sm text-muted-foreground">Manage clients</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("billing")} data-testid="card-quick-billing">
                  <CardContent className="pt-6 text-center">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-semibold">Buy Tests</h3>
                    <p className="text-sm text-muted-foreground">Purchase credits</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setLocation("/developers")} data-testid="card-quick-api-docs">
                  <CardContent className="pt-6 text-center">
                    <ExternalLink className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-semibold">API Docs</h3>
                    <p className="text-sm text-muted-foreground">Integration guides</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Candidate Results</CardTitle>
                  <CardDescription>View completed assessment results for your candidates</CardDescription>
                </CardHeader>
                <CardContent>
                  {resultsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : resultsData?.results.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No results yet</p>
                      <p className="text-sm">Results will appear here when candidates complete assessments</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {resultsData?.results.map((result) => (
                        <div key={result.sessionId} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`result-${result.sessionId}`}>
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-md bg-primary/10">
                              <ClipboardList className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {result.externalEmail || result.externalUserId || 'Anonymous'}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Badge variant="outline">{result.assessmentType}</Badge>
                                {result.organization && (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {result.organization.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {result.overallScore !== null && (
                              <div className="text-lg font-bold text-primary">{result.overallScore}%</div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {result.completedAt ? formatDate(result.completedAt) : 'Pending'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Organizations Tab */}
            <TabsContent value="organizations" className="space-y-4">
              {selectedOrgId ? (
                // Organization Details View
                <div className="space-y-4">
                  <Button variant="outline" onClick={() => setSelectedOrgId(null)} className="gap-2" data-testid="button-back-orgs">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Organizations
                  </Button>
                  
                  {selectedOrgLoading ? (
                    <Card>
                      <CardContent className="py-8 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </CardContent>
                    </Card>
                  ) : selectedOrg ? (
                    <>
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">{selectedOrg.organization.name}</CardTitle>
                              <CardDescription>Organization Details</CardDescription>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteOrgMutation.mutate(selectedOrgId)}
                              disabled={deleteOrgMutation.isPending}
                              data-testid="button-delete-org"
                            >
                              {deleteOrgMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <Label className="text-muted-foreground">Admin Name</Label>
                              <p className="font-medium">{selectedOrg.organization.adminName || 'Not set'}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Admin Email</Label>
                              <p className="font-medium">{selectedOrg.organization.adminEmail || 'Not set'}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Slug</Label>
                              <p className="font-medium font-mono">{selectedOrg.organization.slug}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Status</Label>
                              <Badge variant={selectedOrg.organization.isActive ? "default" : "secondary"}>
                                {selectedOrg.organization.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold">{selectedOrg.stats.totalTests}</div>
                            <p className="text-sm text-muted-foreground">Total Tests</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-green-500">{selectedOrg.stats.completedTests}</div>
                            <p className="text-sm text-muted-foreground">Completed</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-amber-500">{selectedOrg.stats.inProgressTests}</div>
                            <p className="text-sm text-muted-foreground">In Progress</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold">{selectedOrg.stats.pendingTests}</div>
                            <p className="text-sm text-muted-foreground">Pending</p>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Assessment Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedOrg.results.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No completed assessments yet</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {selectedOrg.results.map((result) => (
                                <div key={result.sessionId} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div>
                                    <div className="font-medium">{result.externalEmail || result.externalUserId || 'Anonymous'}</div>
                                    <div className="text-sm text-muted-foreground">
                                      <Badge variant="outline" className="mr-2">{result.assessmentType}</Badge>
                                      {result.completedAt && formatDate(result.completedAt)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  ) : null}
                </div>
              ) : (
                // Organizations List View
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Organizations</h2>
                      <p className="text-white/70 text-sm">Manage client organizations under your partner account</p>
                    </div>
                    <Button onClick={() => setShowAddOrgDialog(true)} className="gap-2" data-testid="button-add-org">
                      <Plus className="h-4 w-4" />
                      Add Organization
                    </Button>
                  </div>

                  {organizationsLoading ? (
                    <Card>
                      <CardContent className="py-8 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </CardContent>
                    </Card>
                  ) : organizations?.organizations.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No organizations yet</p>
                        <p className="text-sm">Add organizations to track usage by client</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {organizations?.organizations.map((org) => (
                        <Card 
                          key={org.id} 
                          className="cursor-pointer hover:border-primary transition-colors"
                          onClick={() => setSelectedOrgId(org.id)}
                          data-testid={`org-card-${org.id}`}
                        >
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{org.name}</CardTitle>
                              <Badge variant={org.isActive ? "default" : "secondary"}>
                                {org.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <CardDescription className="font-mono text-xs">{org.slug}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Tests Used:</span>{' '}
                                <span className="font-semibold">{org.testsUsed}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Active:</span>{' '}
                                <span className="font-semibold">{org.activeTests}</span>
                              </div>
                            </div>
                            {org.adminEmail && (
                              <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {org.adminEmail}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Activity Log Tab */}
            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Activity Log</CardTitle>
                  <CardDescription>Complete history of account activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {activityLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : activityLog?.activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No activity recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activityLog?.activities.map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`activity-${activity.id}`}>
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-md bg-primary/10">
                              <Activity className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{activity.description}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Badge variant="outline">{activity.type}</Badge>
                                {formatDate(activity.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

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

                  {/* Buy More Tests - Only for prepaid and auto_bill billing types */}
                  {(account?.partner?.billingType === 'prepaid' || account?.partner?.billingType === 'auto_bill') && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Buy More Tests
                        </CardTitle>
                        <CardDescription>
                          Purchase additional assessment credits for your team
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                          {[
                            { size: 10, name: 'Starter', price: 50 },
                            { size: 25, name: 'Growth', price: 112.50 },
                            { size: 50, name: 'Professional', price: 200 },
                            { size: 100, name: 'Business', price: 350 },
                            { size: 250, name: 'Enterprise', price: 750 },
                            { size: 500, name: 'Enterprise+', price: 1250 },
                          ].map((pkg) => (
                            <div 
                              key={pkg.size} 
                              className="border rounded-lg p-4 hover:border-primary transition-colors"
                            >
                              <div className="font-semibold text-lg">{pkg.name}</div>
                              <div className="text-2xl font-bold text-primary">
                                {pkg.size} tests
                              </div>
                              <div className="text-sm text-muted-foreground mb-3">
                                £{pkg.price.toFixed(2)} (£{(pkg.price / pkg.size).toFixed(2)}/test)
                              </div>
                              <Button 
                                className="w-full" 
                                onClick={() => handlePurchase(pkg.size)}
                                disabled={purchasingPackageSize !== null}
                                data-testid={`button-buy-${pkg.size}`}
                              >
                                {purchasingPackageSize === pkg.size ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Purchase
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Billing History</CardTitle>
                      <CardDescription>
                        {account?.partner?.billingType === 'invoice' 
                          ? 'Invoices and payment history' 
                          : 'Receipts and invoices'}
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

            <TabsContent value="integrations" className="space-y-4">
              <PartnerIntegrationsTab />
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

      {/* Add Organization Dialog */}
      <Dialog open={showAddOrgDialog} onOpenChange={setShowAddOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Organization</DialogTitle>
            <DialogDescription>
              Create a new client organization to track their assessment usage separately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name *</Label>
              <Input
                id="org-name"
                placeholder="Acme Corp"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                data-testid="input-org-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">Slug *</Label>
              <Input
                id="org-slug"
                placeholder="acme-corp"
                value={newOrgSlug}
                onChange={(e) => setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                data-testid="input-org-slug"
              />
              <p className="text-xs text-muted-foreground">Used for API identification (lowercase, no spaces)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-admin-name">Admin Name</Label>
              <Input
                id="org-admin-name"
                placeholder="John Smith"
                value={newOrgAdminName}
                onChange={(e) => setNewOrgAdminName(e.target.value)}
                data-testid="input-org-admin-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-admin-email">Admin Email</Label>
              <Input
                id="org-admin-email"
                type="email"
                placeholder="john@acme.com"
                value={newOrgAdminEmail}
                onChange={(e) => setNewOrgAdminEmail(e.target.value)}
                data-testid="input-org-admin-email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddOrgDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateOrg}
              disabled={!newOrgName || !newOrgSlug || createOrgMutation.isPending}
              data-testid="button-create-org"
            >
              {createOrgMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
