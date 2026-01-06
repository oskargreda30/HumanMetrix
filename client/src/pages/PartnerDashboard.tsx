import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Initialize Stripe with public key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Package, TrendingUp, AlertTriangle, CheckCircle, CreditCard, Activity, BarChart2, BarChart3, FileText, Receipt, Building2, ArrowLeft, ExternalLink, Settings, Key, Bell, RefreshCw, Copy, Check, Shield, Webhook, Link2, FileSpreadsheet, Home, Users, ClipboardList, Clock, Plus, Trash2, Eye, Mail, Calendar, ChevronRight, ChevronLeft, X, Sparkles, HelpCircle, Palette, Info, Upload } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DeveloperSubTabs } from "@/components/DeveloperSubTabs";
import { PartnerTour } from "@/components/PartnerTour";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import dashboardBg from "@assets/image_1763608498774.png";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BulkInvitationsTab } from "@/components/partner/BulkInvitationsTab";

// Helper component for info tooltips - accessible with keyboard
function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="More information"
        >
          <Info className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-muted-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface CardStatus {
  hasCard: boolean;
  cardLast4?: string;
  cardBrand?: string;
  overageRatePerTest?: number;
  billingType: string;
}

interface OverageHistoryItem {
  id: string;
  billingMonth: string;
  overageTests: number;
  overageAmount: number;
  chargeStatus: string;
  stripePaymentIntentId?: string;
  createdAt: string;
}

function PrepaidCardManagementInner({ partnerId }: { partnerId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);

  const { data: cardStatus, isLoading, refetch } = useQuery<CardStatus>({
    queryKey: ["/api/partner/card/status"],
  });

  const { data: overageHistory } = useQuery<OverageHistoryItem[]>({
    queryKey: ["/api/partner/overage-history"],
  });

  const handleSaveCard = async () => {
    if (!stripe || !elements) return;

    setIsSettingUp(true);
    setCardError(null);

    try {
      const response = await apiRequest("POST", "/api/partner/card/setup-intent");
      const { clientSecret } = await response.json();

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (setupIntent?.payment_method) {
        await apiRequest("POST", "/api/partner/card/confirm", {
          paymentMethodId: setupIntent.payment_method,
        });

        toast({
          title: "Card saved",
          description: "Your card has been saved for overage billing.",
        });
        setShowAddCard(false);
        refetch();
        // Also refresh overage history
        queryClient.invalidateQueries({ queryKey: ["/api/partner/overage-history"] });
      }
    } catch (error: any) {
      setCardError(error.message || "Failed to save card");
      toast({
        title: "Error",
        description: error.message || "Failed to save card",
        variant: "destructive",
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleRemoveCard = async () => {
    setIsRemoving(true);
    try {
      await apiRequest("DELETE", "/api/partner/card");
      toast({
        title: "Card removed",
        description: "Your saved card has been removed.",
      });
      refetch();
      // Also refresh overage history
      queryClient.invalidateQueries({ queryKey: ["/api/partner/overage-history"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove card",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const formatCardBrand = (brand?: string) => {
    if (!brand) return "";
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Card on File
          </CardTitle>
          <CardDescription>
            Save a card for automatic overage billing when your prepaid credits run out
          </CardDescription>
        </div>
        {cardStatus?.hasCard && (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {cardStatus?.hasCard ? (
          <>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {formatCardBrand(cardStatus.cardBrand)} ending in {cardStatus.cardLast4}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Overage rate: £{((cardStatus.overageRatePerTest || 500) / 100).toFixed(2)} per test
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveCard}
                disabled={isRemoving}
                data-testid="button-remove-card"
              >
                {isRemoving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Remove
              </Button>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 inline mr-1" />
                With a card on file, your API access stays active even when prepaid credits run out. Overages are billed automatically on the 1st of each month.
              </p>
            </div>

            {overageHistory && overageHistory.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Overage History</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Month</th>
                        <th className="px-3 py-2 text-right font-medium">Tests</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                        <th className="px-3 py-2 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {overageHistory.slice(0, 6).map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2">{item.billingMonth}</td>
                          <td className="px-3 py-2 text-right">{item.overageTests}</td>
                          <td className="px-3 py-2 text-right">£{(item.overageAmount / 100).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">
                            <Badge 
                              variant="outline" 
                              className={
                                item.chargeStatus === 'paid' 
                                  ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                                  : item.chargeStatus === 'pending'
                                  ? 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                                  : 'bg-red-500/10 text-red-600 border-red-500/30'
                              }
                            >
                              {item.chargeStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : showAddCard ? (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: "16px",
                      color: "#424770",
                      "::placeholder": { color: "#aab7c4" },
                    },
                    invalid: { color: "#9e2146" },
                  },
                }}
                onChange={(event) => {
                  setCardComplete(event.complete);
                  setCardError(event.error ? event.error.message : null);
                }}
              />
              {cardError && (
                <p className="text-sm text-destructive mt-2">{cardError}</p>
              )}
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Your card details are securely processed by Stripe. We never store your full card number.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveCard}
                disabled={!cardComplete || isSettingUp || !stripe}
                data-testid="button-confirm-save-card"
              >
                {isSettingUp && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Card
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddCard(false);
                  setCardError(null);
                }}
                disabled={isSettingUp}
                data-testid="button-cancel-save-card"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 border-2 border-dashed rounded-lg text-center">
              <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                No card saved. Add a card to keep API access active when credits run out.
              </p>
              <Button onClick={() => setShowAddCard(true)} data-testid="button-add-card">
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Without a card on file, your API access will be suspended when prepaid credits are exhausted.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PrepaidCardManagement({ partnerId }: { partnerId: string }) {
  return (
    <Elements stripe={stripePromise}>
      <PrepaidCardManagementInner partnerId={partnerId} />
    </Elements>
  );
}

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
    freeTestsAllocated: number;
    freeTestsExpiresAt: string | null;
    currency: string;
    prepaidCreditsExpiresAt: string | null;
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
    brandingEnabled: boolean;
    brandingPrimaryColor: string;
    brandingAccentColor: string;
    brandingWelcomeTitle: string;
    brandingWelcomeMessage: string;
    brandingCompanyDisplayName: string;
    logoUrl: string;
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

interface PartnerAnalytics {
  testsOverTime: Array<{ date: string; count: number }>;
  byAssessmentType: Array<{ type: string; count: number; avgScore: number | null }>;
  byOrganization: Array<{ orgId: string; orgName: string; count: number }>;
}

interface PartnerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsData {
  notifications: PartnerNotification[];
  unreadCount: number;
}

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
  inviteStatus: string;
  createdAt: string;
  acceptedAt: string | null;
}

interface TeamData {
  members: TeamMember[];
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
  
  // Tour state
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialChecked, setTutorialChecked] = useState(false);
  
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
  // Branding settings state
  const [brandingEnabled, setBrandingEnabled] = useState(false);
  const [brandingPrimaryColor, setBrandingPrimaryColor] = useState("#0891b2");
  const [brandingAccentColor, setBrandingAccentColor] = useState("#06b6d4");
  const [brandingWelcomeTitle, setBrandingWelcomeTitle] = useState("");
  const [brandingWelcomeMessage, setBrandingWelcomeMessage] = useState("");
  const [brandingCompanyDisplayName, setBrandingCompanyDisplayName] = useState("");
  const [brandingLogoUrl, setBrandingLogoUrl] = useState("");
  
  // API key rotation state
  const [rotatingKeyId, setRotatingKeyId] = useState<string | null>(null);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [confirmRotateKeyId, setConfirmRotateKeyId] = useState<string | null>(null);
  const [confirmRevokeKeyId, setConfirmRevokeKeyId] = useState<string | null>(null);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState(false);
  
  // Create API key state
  const [showCreateKeyDialog, setShowCreateKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEnvironment, setNewKeyEnvironment] = useState<"test" | "live">("test");
  
  // Purchase state
  const [purchasingPackageSize, setPurchasingPackageSize] = useState<number | null>(null);

  // Billing change request state
  const [showBillingChangeDialog, setShowBillingChangeDialog] = useState(false);
  const [selectedBillingType, setSelectedBillingType] = useState<string | null>(null);
  const [billingChangeReason, setBillingChangeReason] = useState("");
  const [isSubmittingBillingChange, setIsSubmittingBillingChange] = useState(false);
  const [isCancellingBillingChange, setIsCancellingBillingChange] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);

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

  // Billing change request data
  interface BillingChangeRequestData {
    pendingRequest: {
      id: string;
      requestedBillingType: string;
      reason?: string;
      createdAt: string;
      status: string;
    } | null;
    history: Array<{
      id: string;
      currentBillingType: string;
      requestedBillingType: string;
      reason?: string;
      status: string;
      reviewNotes?: string;
      createdAt: string;
      reviewedAt?: string;
    }>;
  }

  const { data: billingChangeData, isLoading: billingChangeLoading, refetch: refetchBillingChange } = useQuery<BillingChangeRequestData>({
    queryKey: ["/api/partner/me/billing-change-request"],
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

  // Analytics state
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [analyticsDays, setAnalyticsDays] = useState(30);

  const { data: analytics, isLoading: analyticsLoading } = useQuery<PartnerAnalytics>({
    queryKey: ['/api/partner/me/analytics', analyticsPeriod, analyticsDays],
    queryFn: async () => {
      const res = await fetch(`/api/partner/me/analytics?period=${analyticsPeriod}&days=${analyticsDays}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!account?.hasPartnerAccount,
  });

  const { data: notifications, isLoading: notificationsLoading, refetch: refetchNotifications } = useQuery<NotificationsData>({
    queryKey: ["/api/partner/me/notifications"],
    enabled: !!account?.hasPartnerAccount,
  });

  const { data: team, isLoading: teamLoading } = useQuery<TeamData>({
    queryKey: ["/api/partner/me/team"],
    enabled: !!account?.hasPartnerAccount,
  });

  // Team member state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  // Initialize settings from fetched data
  const initSettings = () => {
    if (settings?.settings) {
      setQuotaAlertEnabled(settings.settings.quotaAlertEnabled);
      setQuotaAlertThreshold(settings.settings.quotaAlertThreshold);
      setQuotaAlertEmail(settings.settings.quotaAlertEmail);
      setAutoTopUpEnabled(settings.settings.autoTopUpEnabled);
      setAutoTopUpThreshold(settings.settings.autoTopUpThreshold);
      setAutoTopUpPackage(settings.settings.autoTopUpPackage);
      // Branding settings
      setBrandingEnabled(settings.settings.brandingEnabled ?? false);
      setBrandingPrimaryColor(settings.settings.brandingPrimaryColor || '#0891b2');
      setBrandingAccentColor(settings.settings.brandingAccentColor || '#06b6d4');
      setBrandingWelcomeTitle(settings.settings.brandingWelcomeTitle || '');
      setBrandingWelcomeMessage(settings.settings.brandingWelcomeMessage || '');
      setBrandingCompanyDisplayName(settings.settings.brandingCompanyDisplayName || '');
      setBrandingLogoUrl(settings.settings.logoUrl || '');
    }
  };

  // Check if user needs to see tutorial on first login
  useEffect(() => {
    if (account?.hasPartnerAccount && account?.partner?.id && !tutorialChecked) {
      setTutorialChecked(true);
      const tutorialKey = `humanmetrix_tutorial_completed_${account.partner.id}`;
      const hasCompletedTutorial = localStorage.getItem(tutorialKey);
      if (!hasCompletedTutorial) {
        // Small delay to let the dashboard load first
        setTimeout(() => setShowTutorial(true), 500);
      }
    }
  }, [account, tutorialChecked]);

  // Tour handlers
  const handleTourComplete = () => {
    if (account?.partner?.id) {
      const tutorialKey = `humanmetrix_tutorial_completed_${account.partner.id}`;
      localStorage.setItem(tutorialKey, 'true');
    }
    setShowTutorial(false);
    setActiveTab('home');
    toast({
      title: "Tour completed!",
      description: "You can take the tour again anytime using the 'Take a Tour' button.",
    });
  };

  const handleTourClose = () => {
    if (account?.partner?.id) {
      const tutorialKey = `humanmetrix_tutorial_completed_${account.partner.id}`;
      localStorage.setItem(tutorialKey, 'true');
    }
    setShowTutorial(false);
  };

  const handleRestartTutorial = () => {
    setActiveTab('home');
    setShowTutorial(true);
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
      brandingEnabled: boolean;
      brandingPrimaryColor: string;
      brandingAccentColor: string;
      brandingWelcomeTitle: string;
      brandingWelcomeMessage: string;
      brandingCompanyDisplayName: string;
      logoUrl: string;
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

  // Billing change request handlers
  const handleSubmitBillingChange = async () => {
    if (!selectedBillingType) return;
    setIsSubmittingBillingChange(true);
    try {
      const response = await apiRequest("POST", "/api/partner/me/billing-change-request", {
        requestedBillingType: selectedBillingType,
        reason: billingChangeReason || undefined,
      });
      if (response.ok) {
        toast({
          title: "Request submitted",
          description: "Your billing change request has been submitted for review.",
        });
        setShowBillingChangeDialog(false);
        setSelectedBillingType(null);
        setBillingChangeReason("");
        refetchBillingChange();
      } else {
        const data = await response.json();
        toast({
          title: "Failed to submit request",
          description: data.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to submit request",
        description: "An error occurred while submitting your request.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingBillingChange(false);
    }
  };

  const handleCancelBillingChange = async (requestId: string) => {
    setIsCancellingBillingChange(true);
    try {
      const response = await apiRequest("DELETE", `/api/partner/me/billing-change-request/${requestId}`);
      if (response.ok) {
        toast({
          title: "Request cancelled",
          description: "Your billing change request has been cancelled.",
        });
        refetchBillingChange();
      } else {
        const data = await response.json();
        toast({
          title: "Failed to cancel request",
          description: data.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to cancel request",
        description: "An error occurred while cancelling your request.",
        variant: "destructive",
      });
    } finally {
      setIsCancellingBillingChange(false);
    }
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

  // Create API key mutation
  const createKeyMutation = useMutation({
    mutationFn: async (data: { name: string; environment: "test" | "live" }) => {
      const response = await apiRequest("POST", "/api/partner/me/api-keys", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partner/account"] });
      
      // Ensure the API key data is present in response
      if (data?.apiKey?.fullKey) {
        setNewApiKey(data.apiKey.fullKey);
        setShowCreateKeyDialog(false);
        setShowNewKeyDialog(true);
        setNewKeyName("");
        setNewKeyEnvironment("test");
        toast({
          title: "API Key Created",
          description: "Your new API key has been generated. Copy it now - it won't be shown again.",
        });
      } else {
        console.error("API key creation response missing fullKey:", data);
        toast({
          title: "API Key Created",
          description: "Key was created but the full key could not be displayed. Please contact support.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create API key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Revoke API key mutation
  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await apiRequest("DELETE", `/api/partner/me/api-keys/${keyId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partner/account"] });
      setRevokingKeyId(null);
      toast({
        title: "API key revoked",
        description: "The API key has been permanently deactivated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to revoke key",
        description: error.message,
        variant: "destructive",
      });
      setRevokingKeyId(null);
    },
  });

  const handleCreateKey = () => {
    if (!newKeyName) return;
    createKeyMutation.mutate({ name: newKeyName, environment: newKeyEnvironment });
  };

  const handleRevokeKey = (keyId: string) => {
    setConfirmRevokeKeyId(keyId);
  };

  const confirmRevoke = () => {
    if (confirmRevokeKeyId) {
      setRevokingKeyId(confirmRevokeKeyId);
      revokeKeyMutation.mutate(confirmRevokeKeyId);
      setConfirmRevokeKeyId(null);
    }
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      quotaAlertEnabled,
      quotaAlertThreshold,
      quotaAlertEmail,
      autoTopUpEnabled,
      autoTopUpThreshold,
      autoTopUpPackage,
      brandingEnabled,
      brandingPrimaryColor,
      brandingAccentColor,
      brandingWelcomeTitle,
      brandingWelcomeMessage,
      brandingCompanyDisplayName,
      logoUrl: brandingLogoUrl,
    });
  };

  const handleRotateKey = (keyId: string) => {
    setConfirmRotateKeyId(keyId);
  };

  const confirmRotate = () => {
    if (confirmRotateKeyId) {
      setRotatingKeyId(confirmRotateKeyId);
      rotateKeyMutation.mutate(confirmRotateKeyId);
      setConfirmRotateKeyId(null);
    }
  };

  const handleCopyKey = async () => {
    await navigator.clipboard.writeText(newApiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Team member mutations
  const inviteMemberMutation = useMutation({
    mutationFn: async (data: { email: string; name?: string; role: string }) => {
      const response = await apiRequest("POST", "/api/partner/me/team/invite", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/team"] });
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("member");
      toast({ title: "Invitation sent", description: "Team member has been invited." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to invite", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/partner/me/team/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/team"] });
      toast({ title: "Member removed" });
    },
  });

  // Notification mutations
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/partner/me/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/partner/me/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/notifications"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  const partnerCurrency = account?.partner?.currency || 'GBP';
  
  const formatCurrency = (amount: number, currency?: string) => {
    const curr = currency || partnerCurrency;
    const currencySymbols: Record<string, string> = {
      // Tier 1 - Developed Markets
      gbp: '£',
      usd: '$',
      eur: '€',
      sgd: 'S$',
      aud: 'A$',
      cad: 'C$',
      jpy: '¥',
      chf: 'Fr',
      nzd: 'NZ$',
      hkd: 'HK$',
      // Tier 2 - Emerging Markets
      myr: 'RM',
      thb: '฿',
      php: '₱',
      inr: '₹',
      aed: 'د.إ',
      sar: '﷼',
      zar: 'R',
      brl: 'R$',
      mxn: 'Mex$',
      krw: '₩',
      twd: 'NT$',
      // Tier 3 - SEA Emerging Markets
      idr: 'Rp',
      vnd: '₫',
      mmk: 'K',
      khr: '៛',
      lak: '₭',
      bnd: 'B$',
      pkr: '₨',
      bdt: '৳',
      lkr: 'Rs',
      npr: '₨',
      try: '₺',
      egp: 'E£',
      ngn: '₦',
      kes: 'KSh',
      clp: 'CLP$',
      cop: 'COL$',
      pen: 'S/',
      ars: 'AR$',
    };
    const symbol = currencySymbols[curr.toLowerCase()] || '£';
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
            <div className="flex items-center justify-between">
              <div>
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestartTutorial}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                data-testid="button-help-tutorial"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Take a Tour
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="inline-flex flex-wrap gap-1 h-auto p-1 bg-white/10 border border-white/20 w-auto">
              {/* Overview */}
              <TabsTrigger value="home" data-testid="tab-home" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Overview
              </TabsTrigger>
              {/* Core Business */}
              <TabsTrigger value="results" data-testid="tab-results" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Results
              </TabsTrigger>
              <TabsTrigger value="invitations" data-testid="tab-invitations" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Invitations
              </TabsTrigger>
              <TabsTrigger value="organizations" data-testid="tab-organizations" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Organizations
              </TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Analytics
              </TabsTrigger>
              {/* Account & Operations */}
              <TabsTrigger value="usage" data-testid="tab-usage" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Usage
              </TabsTrigger>
              <TabsTrigger value="billing" data-testid="tab-billing" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Billing
              </TabsTrigger>
              <TabsTrigger value="notifications" data-testid="tab-notifications" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors relative">
                Notifications
                {(notifications?.unreadCount ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {notifications!.unreadCount > 9 ? '9+' : notifications!.unreadCount}
                  </span>
                )}
              </TabsTrigger>
              {/* Developer Hub */}
              <TabsTrigger value="developer" data-testid="tab-developer" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Developer
              </TabsTrigger>
              {/* Administration */}
              <TabsTrigger value="team" data-testid="tab-team" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Team
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings" onClick={initSettings} className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Settings
              </TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Activity Log
              </TabsTrigger>
            </TabsList>

            {/* Home Tab */}
            <TabsContent value="home" className="space-y-6" data-testid="panel-home">
              {/* Getting Started Guide */}
              {(() => {
                const hasApiKey = (partner?.activeApiKeys ?? 0) > 0;
                const hasAssessment = (partner?.testsConsumed ?? 0) > 0;
                const hasOrganization = (organizations?.organizations?.length ?? 0) > 0;
                const hasWebhook = false; // Would need webhook data
                const hasTeamMember = (team?.members?.length ?? 0) > 1; // More than just owner
                
                const completedSteps = [hasApiKey, hasAssessment, hasOrganization, hasTeamMember].filter(Boolean).length;
                const totalSteps = 4;
                const allComplete = completedSteps === totalSteps;
                
                // Hide if all steps are complete
                if (allComplete) return null;
                
                return (
                  <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <CheckCircle className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Getting Started</CardTitle>
                            <CardDescription>Complete these steps to get the most out of HumanMetrix</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-sm" data-testid="badge-setup-progress">
                          {completedSteps}/{totalSteps} complete
                        </Badge>
                      </div>
                      <Progress value={(completedSteps / totalSteps) * 100} className="h-2 mt-3" data-testid="progress-setup" />
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid gap-3 md:grid-cols-2">
                        {/* Step 1: Create API Key */}
                        <button
                          onClick={() => setActiveTab('api-keys')}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left hover-elevate ${
                            hasApiKey ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/30 border-muted'
                          }`}
                          data-testid="setup-step-api-key"
                        >
                          <div className={`p-1.5 rounded-full ${hasApiKey ? 'bg-green-500/20' : 'bg-muted'}`}>
                            {hasApiKey ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Key className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={`font-medium text-sm ${hasApiKey ? 'text-green-700 dark:text-green-400' : ''}`}>
                              Create an API key
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {hasApiKey ? 'API key created' : 'Required to send assessments'}
                            </div>
                          </div>
                          {!hasApiKey && <ExternalLink className="h-4 w-4 text-muted-foreground" />}
                        </button>

                        {/* Step 2: Send First Assessment */}
                        <button
                          onClick={() => setActiveTab('invitations')}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left hover-elevate ${
                            hasAssessment ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/30 border-muted'
                          }`}
                          data-testid="setup-step-assessment"
                        >
                          <div className={`p-1.5 rounded-full ${hasAssessment ? 'bg-green-500/20' : 'bg-muted'}`}>
                            {hasAssessment ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <ClipboardList className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={`font-medium text-sm ${hasAssessment ? 'text-green-700 dark:text-green-400' : ''}`}>
                              Send first assessment
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {hasAssessment ? `${partner?.testsConsumed} assessments completed` : 'Invite candidates to take assessments'}
                            </div>
                          </div>
                          {!hasAssessment && <ExternalLink className="h-4 w-4 text-muted-foreground" />}
                        </button>

                        {/* Step 3: Create Organization */}
                        <button
                          onClick={() => setActiveTab('organizations')}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left hover-elevate ${
                            hasOrganization ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/30 border-muted'
                          }`}
                          data-testid="setup-step-organization"
                        >
                          <div className={`p-1.5 rounded-full ${hasOrganization ? 'bg-green-500/20' : 'bg-muted'}`}>
                            {hasOrganization ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={`font-medium text-sm ${hasOrganization ? 'text-green-700 dark:text-green-400' : ''}`}>
                              Create an organization
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {hasOrganization ? `${organizations?.organizations?.length} organization(s) created` : 'Group assessments by client or department'}
                            </div>
                          </div>
                          {!hasOrganization && <ExternalLink className="h-4 w-4 text-muted-foreground" />}
                        </button>

                        {/* Step 4: Invite Team Member */}
                        <button
                          onClick={() => setActiveTab('team')}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left hover-elevate ${
                            hasTeamMember ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/30 border-muted'
                          }`}
                          data-testid="setup-step-team"
                        >
                          <div className={`p-1.5 rounded-full ${hasTeamMember ? 'bg-green-500/20' : 'bg-muted'}`}>
                            {hasTeamMember ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Users className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={`font-medium text-sm ${hasTeamMember ? 'text-green-700 dark:text-green-400' : ''}`}>
                              Invite team members
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {hasTeamMember ? 'Team members invited' : 'Collaborate with your colleagues'}
                            </div>
                          </div>
                          {!hasTeamMember && <ExternalLink className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Free Tests Expiry Banner */}
              {(() => {
                if (!partner?.freeTestsAllocated || partner.freeTestsAllocated === 0) return null;
                if (!partner?.freeTestsExpiresAt) return null;
                
                const expiryDate = new Date(partner.freeTestsExpiresAt);
                const now = new Date();
                const diffMs = expiryDate.getTime() - now.getTime();
                const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                
                // Don't show if already expired
                if (daysRemaining <= 0) return null;
                
                const isUrgent = daysRemaining <= 2;
                
                return (
                  <Card className={`border-2 ${isUrgent ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-cyan-500/50 bg-cyan-50 dark:bg-cyan-950/30'}`} data-testid="card-free-tests-expiry">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${isUrgent ? 'bg-amber-500' : 'bg-cyan-500'}`}>
                            <Clock className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className={`font-semibold ${isUrgent ? 'text-amber-700 dark:text-amber-400' : 'text-cyan-700 dark:text-cyan-400'}`}>
                              {isUrgent ? 'Free Tests Expiring Soon!' : 'Free Tests Available'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              You have <strong>{partner.freeTestsAllocated}</strong> complimentary tests that expire in <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong>
                              {' '}({expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant={isUrgent ? "default" : "outline"} 
                          size="sm" 
                          onClick={() => window.open('/developers', '_blank')}
                          className={isUrgent ? 'bg-amber-600 hover:bg-amber-700' : ''}
                        >
                          Get Started
                          <ExternalLink className="h-3 w-3 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Contract & Terms View */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Contract & Terms</CardTitle>
                        <CardDescription>Your current agreement details</CardDescription>
                      </div>
                    </div>
                    <Badge 
                      variant={partner?.isSuspended ? "destructive" : "default"}
                      data-testid="badge-account-status"
                    >
                      {partner?.isSuspended ? 'Suspended' : 'Active'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="p-3 rounded-lg bg-muted/30 border">
                      <div className="text-xs text-muted-foreground mb-1">Billing Model</div>
                      <div className="font-semibold flex items-center gap-2" data-testid="text-billing-model">
                        <CreditCard className="h-4 w-4 text-primary" />
                        {account?.partner?.billingType === 'payg' && 'Pay As You Go'}
                        {account?.partner?.billingType === 'subscription' && 'Subscription'}
                        {account?.partner?.billingType === 'enterprise' && 'Enterprise'}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border">
                      <div className="text-xs text-muted-foreground mb-1">Member Since</div>
                      <div className="font-semibold flex items-center gap-2" data-testid="text-member-since">
                        <Calendar className="h-4 w-4 text-primary" />
                        {partner?.createdAt ? new Date(partner.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border">
                      <div className="text-xs text-muted-foreground mb-1">Company</div>
                      <div className="font-semibold flex items-center gap-2" data-testid="text-company-name">
                        <Building2 className="h-4 w-4 text-primary" />
                        {partner?.companyName || partner?.name || 'Not specified'}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border">
                      <div className="text-xs text-muted-foreground mb-1">Account ID</div>
                      <div className="font-semibold flex items-center gap-2 font-mono text-sm" data-testid="text-account-id">
                        <Shield className="h-4 w-4 text-primary" />
                        {partner?.id?.slice(0, 8) || 'N/A'}...
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      For contract modifications or questions, please contact your account manager.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('billing')} data-testid="button-view-billing">
                      View Billing
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Usage Stats */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-sm font-medium">Tests Purchased</CardTitle>
                      <InfoTooltip content="Total assessment credits purchased for your account. Each completed assessment consumes one credit." />
                    </div>
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
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-sm font-medium">Tests Used</CardTitle>
                      <InfoTooltip content="Number of assessments that candidates have fully completed. Only completed tests consume credits." />
                    </div>
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
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                      <InfoTooltip content="Credits available for new assessments. Low balance shown in amber/red. Consider purchasing more credits when low." />
                    </div>
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
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-sm font-medium">Active API Keys</CardTitle>
                      <InfoTooltip content="Number of API keys currently active. Each key can be used to integrate assessments into your applications." />
                    </div>
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
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-sm font-medium">This Month</CardTitle>
                      <InfoTooltip content="Assessments completed during the current calendar month. Resets on the 1st of each month." />
                    </div>
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
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                      <InfoTooltip content="Separate workspaces to group assessments by client, department, or project. Each org can have its own API key." />
                    </div>
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
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-sm font-medium">Completed Results</CardTitle>
                      <InfoTooltip content="Total number of assessment results available for review. Only completed assessments appear here." />
                    </div>
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
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setActiveTab("results"); window.scrollTo(0, 0); }} data-testid="card-quick-results">
                  <CardContent className="pt-6 text-center">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-semibold">View Results</h3>
                    <p className="text-sm text-muted-foreground">See assessment results</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setActiveTab("organizations"); window.scrollTo(0, 0); }} data-testid="card-quick-organizations">
                  <CardContent className="pt-6 text-center">
                    <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-semibold">Organizations</h3>
                    <p className="text-sm text-muted-foreground">Manage clients</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setActiveTab("billing"); window.scrollTo(0, 0); }} data-testid="card-quick-billing">
                  <CardContent className="pt-6 text-center">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-semibold">Buy Tests</h3>
                    <p className="text-sm text-muted-foreground">Purchase credits</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => window.open('/developers', '_blank')} data-testid="card-quick-api-docs">
                  <CardContent className="pt-6 text-center">
                    <ExternalLink className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-semibold">API Docs</h3>
                    <p className="text-sm text-muted-foreground">Integration guides</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="space-y-4" data-testid="panel-results">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Candidate Results</CardTitle>
                    <InfoTooltip content="Assessment scores are percentages (0-100%). Higher scores indicate stronger performance. Scores above 70% are considered strong, 50-70% average, and below 50% may need development." />
                  </div>
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
                      <p className="font-medium">No results yet</p>
                      <p className="text-sm mt-1">Results will appear here when candidates complete assessments.</p>
                      <p className="text-sm mt-2">Get started by creating an assessment session via the API or Widget Test Lab.</p>
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

            {/* Invitations Tab */}
            <TabsContent value="invitations" className="space-y-4" data-testid="panel-invitations">
              {partner?.id && partner?.billingType ? (
                <BulkInvitationsTab partnerId={partner.id} billingType={partner.billingType} />
              ) : (
                <Card>
                  <CardContent className="py-8 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Organizations Tab */}
            <TabsContent value="organizations" className="space-y-4" data-testid="panel-organizations">
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
                              <p className="font-medium">No completed assessments yet</p>
                              <p className="text-sm mt-1">Assessments assigned to this organization will appear here once completed.</p>
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
                        <p className="font-medium">No organizations yet</p>
                        <p className="text-sm mt-1">Organizations help you group candidates by client or department.</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4"
                          onClick={() => setShowAddOrgDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-1.5" />
                          Add Your First Organization
                        </Button>
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
            <TabsContent value="activity" className="space-y-4" data-testid="panel-activity">
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
                      <p className="font-medium">No activity recorded yet</p>
                      <p className="text-sm mt-1">Your account activity will appear here as you use the platform.</p>
                      <p className="text-sm">This includes API calls, assessments, billing events, and more.</p>
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

            <TabsContent value="usage" className="space-y-4" data-testid="panel-usage">
              {/* Free Tests Expiry Banner in Usage Tab */}
              {(() => {
                if (!partner?.freeTestsAllocated || partner.freeTestsAllocated === 0) return null;
                if (!partner?.freeTestsExpiresAt) return null;
                
                const expiryDate = new Date(partner.freeTestsExpiresAt);
                const now = new Date();
                const diffMs = expiryDate.getTime() - now.getTime();
                const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                
                if (daysRemaining <= 0) return null;
                
                const isUrgent = daysRemaining <= 2;
                
                return (
                  <Card className={`border-2 ${isUrgent ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-cyan-500/50 bg-cyan-50 dark:bg-cyan-950/30'}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isUrgent ? 'bg-amber-500' : 'bg-cyan-500'}`}>
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className={`font-semibold ${isUrgent ? 'text-amber-700 dark:text-amber-400' : 'text-cyan-700 dark:text-cyan-400'}`}>
                            Free Tests: <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> remaining
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {partner.freeTestsAllocated} complimentary tests expire on {expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

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

                  {/* Usage Forecasting */}
                  {(() => {
                    const monthlyData = usage.monthlyUsage || [];
                    const recentMonths = monthlyData.slice(-3);
                    const avgUsage = recentMonths.length > 0 
                      ? Math.round(recentMonths.reduce((sum, m) => sum + m.sessions, 0) / recentMonths.length)
                      : 0;
                    const projectedNextMonth = Math.round(avgUsage * 1.1); // 10% growth assumption
                    const remaining = partner?.remaining || 0;
                    const monthsUntilEmpty = avgUsage > 0 ? Math.floor(remaining / avgUsage) : null;
                    const runOutDate = monthsUntilEmpty !== null && monthsUntilEmpty < 12
                      ? new Date(Date.now() + monthsUntilEmpty * 30 * 24 * 60 * 60 * 1000)
                      : null;

                    return (
                      <Card className="border-primary/20">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <TrendingUp className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">Usage Forecast</CardTitle>
                                <CardDescription>Projected usage based on your recent activity</CardDescription>
                              </div>
                            </div>
                            {monthsUntilEmpty !== null && monthsUntilEmpty <= 2 && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Low Credits
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="p-4 rounded-lg bg-muted/30 border">
                              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" />
                                Avg. Monthly Usage
                              </div>
                              <div className="text-2xl font-bold" data-testid="text-avg-usage">
                                {avgUsage}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Based on last {recentMonths.length} month{recentMonths.length !== 1 ? 's' : ''}
                              </p>
                            </div>

                            <div className="p-4 rounded-lg bg-muted/30 border">
                              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Next Month Projection
                              </div>
                              <div className="text-2xl font-bold text-primary" data-testid="text-projected-usage">
                                {projectedNextMonth}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Estimated tests needed
                              </p>
                            </div>

                            <div className="p-4 rounded-lg bg-muted/30 border">
                              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Credits Runway
                              </div>
                              <div className={`text-2xl font-bold ${monthsUntilEmpty !== null && monthsUntilEmpty <= 2 ? 'text-destructive' : monthsUntilEmpty !== null && monthsUntilEmpty <= 4 ? 'text-amber-500' : ''}`} data-testid="text-runway">
                                {monthsUntilEmpty === null ? '12+ months' : monthsUntilEmpty === 0 ? 'This month' : `${monthsUntilEmpty} month${monthsUntilEmpty !== 1 ? 's' : ''}`}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {runOutDate ? `Until ~${runOutDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : 'At current rate'}
                              </p>
                            </div>
                          </div>

                          {monthsUntilEmpty !== null && monthsUntilEmpty <= 3 && (
                            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                <span className="text-sm">
                                  {monthsUntilEmpty === 0 
                                    ? 'Your credits may run out this month. Consider purchasing more.'
                                    : `Based on your usage, you'll need more credits in ${monthsUntilEmpty} month${monthsUntilEmpty !== 1 ? 's' : ''}.`
                                  }
                                </span>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => setActiveTab('billing')}
                                data-testid="button-buy-credits"
                              >
                                Buy Credits
                              </Button>
                            </div>
                          )}

                          {avgUsage === 0 && (
                            <div className="mt-4 p-3 rounded-lg bg-muted/50 border text-center text-sm text-muted-foreground">
                              Not enough usage data to generate accurate forecasts. Continue using assessments to build your forecast.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}

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
                            <RechartsTooltip 
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

            <TabsContent value="billing" className="space-y-4" data-testid="panel-billing">
              {billingLoading ? (
                <Card>
                  <CardContent className="py-8 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </CardContent>
                </Card>
              ) : billing ? (
                <>
                  {/* Billing Model Header */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          {account?.partner?.billingType === 'payg' && 'Pay As You Go (PAYG)'}
                          {account?.partner?.billingType === 'subscription' && 'Subscription + Auto-Bill'}
                          {account?.partner?.billingType === 'enterprise' && 'Enterprise Prepayment'}
                        </CardTitle>
                        <CardDescription>
                          {account?.partner?.billingType === 'payg' && 'No card on file. Bulk discounts via upfront purchase. API suspended at zero credits.'}
                          {account?.partner?.billingType === 'subscription' && 'Card on file. Min monthly charge + auto-bill for additional usage.'}
                          {account?.partner?.billingType === 'enterprise' && 'For high-volume BPOs. Pro-forma invoicing for bulk credit blocks.'}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-sm" data-testid="badge-billing-type">
                        {account?.partner?.billingType === 'payg' && 'PAYG'}
                        {account?.partner?.billingType === 'subscription' && 'Subscription'}
                        {account?.partner?.billingType === 'enterprise' && 'Enterprise'}
                      </Badge>
                    </CardHeader>
                  </Card>

                  {/* Card on File for Prepaid Partners */}
                  {account?.partner?.billingType === 'payg' && (
                    <PrepaidCardManagement partnerId={account.partner.id} />
                  )}

                  {/* Pending Billing Change Request Alert */}
                  {billingChangeData?.pendingRequest && (
                    <Card className="border-2 border-orange-500 bg-orange-500/20 dark:bg-orange-600/25">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-full bg-orange-500 dark:bg-orange-600">
                              <Clock className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-orange-700 dark:text-orange-300 text-base">Billing Change Pending</p>
                              <p className="text-sm text-orange-900/80 dark:text-orange-100/80">
                                Your request to change to{' '}
                                <span className="font-medium">
                                  {billingChangeData.pendingRequest.requestedBillingType === 'payg' && 'Pay As You Go'}
                                  {billingChangeData.pendingRequest.requestedBillingType === 'subscription' && 'Subscription'}
                                  {billingChangeData.pendingRequest.requestedBillingType === 'enterprise' && 'Enterprise'}
                                </span>{' '}
                                billing is being reviewed.
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelBillingChange(billingChangeData.pendingRequest!.id)}
                            disabled={isCancellingBillingChange}
                            data-testid="button-cancel-billing-change"
                          >
                            {isCancellingBillingChange ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <X className="h-4 w-4 mr-2" />
                            )}
                            Cancel Request
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Billing Options */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Billing Options
                        <InfoTooltip content="Choose the billing model that works best for your organization. Request a change and our team will review it within 1-2 business days." />
                      </CardTitle>
                      <CardDescription>
                        Compare billing models and request a change if needed
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        {/* PAYG Option */}
                        <div 
                          className={`border rounded-lg p-4 transition-colors ${
                            account?.partner?.billingType === 'payg' 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:border-muted-foreground/50'
                          }`}
                          data-testid="billing-option-payg"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Package className="h-5 w-5 text-primary" />
                              <span className="font-semibold">Pay As You Go</span>
                            </div>
                            {account?.partner?.billingType === 'payg' && (
                              <Badge className="bg-primary/20 text-primary border-0">Current</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">
                            No card on file. Purchase credits upfront with bulk discounts. API suspended at zero.
                          </p>
                          <ul className="text-sm space-y-1 mb-4">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              No recurring charges
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Bulk discounts available
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Control your spend
                            </li>
                          </ul>
                          {account?.partner?.billingType !== 'payg' && !billingChangeData?.pendingRequest && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setSelectedBillingType('payg');
                                setShowBillingChangeDialog(true);
                              }}
                              data-testid="button-request-payg"
                            >
                              Request Change
                            </Button>
                          )}
                        </div>

                        {/* Subscription Option */}
                        <div 
                          className={`border rounded-lg p-4 transition-colors ${
                            account?.partner?.billingType === 'subscription' 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:border-muted-foreground/50'
                          }`}
                          data-testid="billing-option-subscription"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-5 w-5 text-primary" />
                              <span className="font-semibold">Subscription</span>
                            </div>
                            {account?.partner?.billingType === 'subscription' && (
                              <Badge className="bg-primary/20 text-primary border-0">Current</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">
                            Card on file. Min monthly charge + auto-bill for additional usage at base rates.
                          </p>
                          <ul className="text-sm space-y-1 mb-4">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Predictable monthly base
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Pay as you grow
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Automatic billing
                            </li>
                          </ul>
                          {account?.partner?.billingType !== 'subscription' && !billingChangeData?.pendingRequest && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setSelectedBillingType('subscription');
                                setShowBillingChangeDialog(true);
                              }}
                              data-testid="button-request-subscription"
                            >
                              Request Change
                            </Button>
                          )}
                        </div>

                        {/* Enterprise Option */}
                        <div 
                          className={`border rounded-lg p-4 transition-colors ${
                            account?.partner?.billingType === 'enterprise' 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:border-muted-foreground/50'
                          }`}
                          data-testid="billing-option-enterprise"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-primary" />
                              <span className="font-semibold">Enterprise</span>
                            </div>
                            {account?.partner?.billingType === 'enterprise' && (
                              <Badge className="bg-primary/20 text-primary border-0">Current</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">
                            For high-volume BPOs. Pro-forma invoicing for bulk credit blocks.
                          </p>
                          <ul className="text-sm space-y-1 mb-4">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Bulk credit blocks
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Pro-forma invoicing
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Custom contracts
                            </li>
                          </ul>
                          {account?.partner?.billingType !== 'enterprise' && !billingChangeData?.pendingRequest && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setSelectedBillingType('enterprise');
                                setShowBillingChangeDialog(true);
                              }}
                              data-testid="button-request-enterprise"
                            >
                              Request Change
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Request History */}
                      {billingChangeData?.history && billingChangeData.history.length > 0 && (
                        <div className="mt-6 pt-6 border-t">
                          <h4 className="text-sm font-medium mb-3">Request History</h4>
                          <div className="space-y-2">
                            {billingChangeData.history.slice(0, 5).map((request) => (
                              <div key={request.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                                <div className="flex items-center gap-2">
                                  <span>
                                    {request.currentBillingType} → {request.requestedBillingType}
                                  </span>
                                  <Badge 
                                    variant={request.status === 'approved' ? 'secondary' : request.status === 'rejected' ? 'destructive' : 'outline'}
                                    className={request.status === 'approved' ? 'bg-green-500/20 text-green-600' : ''}
                                  >
                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                  </Badge>
                                </div>
                                <span className="text-muted-foreground">{formatDate(request.createdAt)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* PAYG Billing Stats */}
                  {account?.partner?.billingType === 'payg' && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-primary" data-testid="text-credit-balance">
                            {partner?.testsPurchased ? (partner.testsPurchased - partner.testsConsumed) : 0} tests
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Available credits
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold" data-testid="text-total-purchased">
                            {partner?.testsPurchased || 0} tests
                          </div>
                          <p className="text-xs text-muted-foreground">
                            All time credits
                          </p>
                        </CardContent>
                      </Card>

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
                    </div>
                  )}

                  {/* Auto-Bill Billing Stats */}
                  {account?.partner?.billingType === 'subscription' && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Tests Used</CardTitle>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold" data-testid="text-tests-used">
                            {partner?.testsConsumed || 0} tests
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Billed automatically each month
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
                    </div>
                  )}

                  {/* Invoice Billing Stats */}
                  {account?.partner?.billingType === 'enterprise' && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold" data-testid="text-pending-invoices">
                            {billing.summary.pendingInvoices}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Awaiting payment
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold ${billing.summary.pendingAmount > 0 ? 'text-amber-500' : ''}`} data-testid="text-pending-amount">
                            {formatCurrency(billing.summary.pendingAmount)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {billing.summary.pendingInvoices} pending invoice{billing.summary.pendingInvoices !== 1 ? 's' : ''}
                          </p>
                        </CardContent>
                      </Card>

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
                    </div>
                  )}

                  {/* Buy More Tests - Only for PAYG and Subscription billing types */}
                  {(account?.partner?.billingType === 'payg' || account?.partner?.billingType === 'subscription') && (
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
                          {/* Volume-based pricing tiers: Boutique $20, Growth $10, Small Enterprise $5, Enterprise $2.50, Pro $1.00 */}
                          {[
                            { size: 50, name: 'Boutique', price: 1000, pricePerTest: 20.00 },
                            { size: 250, name: 'Growth', price: 2500, pricePerTest: 10.00 },
                            { size: 1000, name: 'Small Enterprise', price: 5000, pricePerTest: 5.00 },
                            { size: 5000, name: 'Enterprise', price: 12500, pricePerTest: 2.50 },
                            { size: 10000, name: 'Pro', price: 10000, pricePerTest: 1.00 },
                          ].map((pkg) => (
                            <div 
                              key={pkg.size} 
                              className="border rounded-lg p-4 hover:border-primary transition-colors"
                            >
                              <div className="font-semibold text-lg">{pkg.name}</div>
                              <div className="text-2xl font-bold text-primary">
                                {pkg.size.toLocaleString()} tests
                              </div>
                              <div className="text-sm text-muted-foreground mb-3">
                                ${pkg.price.toLocaleString()} (${pkg.pricePerTest.toFixed(2)}/test)
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
                        {account?.partner?.billingType === 'enterprise' 
                          ? 'Invoices and payment history' 
                          : 'Receipts and invoices'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {billing.items.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="font-medium">No billing history yet</p>
                          <p className="text-sm mt-1">Your receipts and invoices will appear here after your first purchase.</p>
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

            <TabsContent value="settings" className="space-y-4" data-testid="panel-settings">
              {settingsLoading ? (
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
                        <Bell className="h-5 w-5" />
                        Quota Alerts
                        <InfoTooltip content="Set up email notifications to alert you when your remaining credits drop below a certain percentage. Helps prevent running out of credits unexpectedly." />
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

                  {settings?.settings?.billingType === 'payg' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Auto Top-Up
                          <InfoTooltip content="Automatically purchase a pre-selected credit package when your balance falls below a threshold. Uses your saved payment method. Only available for PAYG accounts." />
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

                  {/* White-Label Branding Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        White-Label Branding
                        <InfoTooltip content="Display your company logo, colors, and messaging instead of HumanMetrix branding. Candidates will see your brand throughout the assessment experience." />
                      </CardTitle>
                      <CardDescription>
                        Customize the assessment experience with your company branding for candidates
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="branding-enabled">Enable white-label branding</Label>
                          <p className="text-sm text-muted-foreground">
                            Show your branding instead of HumanMetrix branding to candidates
                          </p>
                        </div>
                        <Switch
                          id="branding-enabled"
                          checked={brandingEnabled}
                          onCheckedChange={setBrandingEnabled}
                          data-testid="switch-branding-enabled"
                        />
                      </div>

                      {brandingEnabled && (
                        <>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="branding-display-name">Display Name</Label>
                              <Input
                                id="branding-display-name"
                                placeholder="Your Company Name"
                                value={brandingCompanyDisplayName}
                                onChange={(e) => setBrandingCompanyDisplayName(e.target.value)}
                                maxLength={100}
                                data-testid="input-branding-display-name"
                              />
                              <p className="text-xs text-muted-foreground">
                                Shown to candidates during assessments
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label>Company Logo</Label>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Input
                                    id="branding-logo"
                                    type="url"
                                    placeholder="https://your-company.com/logo.png"
                                    value={brandingLogoUrl}
                                    onChange={(e) => setBrandingLogoUrl(e.target.value)}
                                    data-testid="input-branding-logo"
                                    className="flex-1"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">or</span>
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                    id="branding-logo-upload"
                                    className="hidden"
                                    data-testid="input-branding-logo-upload"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        try {
                                          const res = await fetch("/api/uploads/request-url", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            credentials: "include",
                                            body: JSON.stringify({
                                              name: file.name,
                                              size: file.size,
                                              contentType: file.type,
                                            }),
                                          });
                                          if (!res.ok) {
                                            throw new Error("Failed to get upload URL");
                                          }
                                          const { uploadURL, objectPath } = await res.json();
                                          const uploadRes = await fetch(uploadURL, {
                                            method: "PUT",
                                            body: file,
                                            headers: { "Content-Type": file.type },
                                          });
                                          if (!uploadRes.ok) {
                                            throw new Error("Failed to upload file");
                                          }
                                          setBrandingLogoUrl(objectPath);
                                          // Reset file input to allow re-uploading the same file
                                          e.target.value = "";
                                          toast({
                                            title: "Logo uploaded",
                                            description: "Your logo has been uploaded successfully.",
                                          });
                                        } catch (err) {
                                          toast({
                                            title: "Upload failed",
                                            description: "Failed to upload logo. Please try again.",
                                            variant: "destructive",
                                          });
                                        }
                                      }
                                    }}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    onClick={() => document.getElementById("branding-logo-upload")?.click()}
                                    data-testid="button-upload-logo"
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Logo
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Enter a URL or upload an image (PNG, JPEG, SVG, or WebP recommended)
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="branding-primary-color">Primary Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="branding-primary-color"
                                  type="color"
                                  value={brandingPrimaryColor}
                                  onChange={(e) => setBrandingPrimaryColor(e.target.value)}
                                  className="w-12 h-10 p-1 cursor-pointer"
                                  data-testid="input-branding-primary-color"
                                />
                                <Input
                                  value={brandingPrimaryColor}
                                  onChange={(e) => setBrandingPrimaryColor(e.target.value)}
                                  placeholder="#0891b2"
                                  className="flex-1 font-mono"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="branding-accent-color">Accent Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="branding-accent-color"
                                  type="color"
                                  value={brandingAccentColor}
                                  onChange={(e) => setBrandingAccentColor(e.target.value)}
                                  className="w-12 h-10 p-1 cursor-pointer"
                                  data-testid="input-branding-accent-color"
                                />
                                <Input
                                  value={brandingAccentColor}
                                  onChange={(e) => setBrandingAccentColor(e.target.value)}
                                  placeholder="#06b6d4"
                                  className="flex-1 font-mono"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="branding-welcome-title">Welcome Title</Label>
                            <Input
                              id="branding-welcome-title"
                              placeholder="Welcome to Your Assessment"
                              value={brandingWelcomeTitle}
                              onChange={(e) => setBrandingWelcomeTitle(e.target.value)}
                              maxLength={100}
                              data-testid="input-branding-welcome-title"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="branding-welcome-message">Welcome Message</Label>
                            <Textarea
                              id="branding-welcome-message"
                              placeholder="A personalized message for candidates before they start their assessment..."
                              value={brandingWelcomeMessage}
                              onChange={(e) => setBrandingWelcomeMessage(e.target.value)}
                              maxLength={500}
                              rows={3}
                              data-testid="input-branding-welcome-message"
                            />
                            <p className="text-xs text-muted-foreground">
                              {brandingWelcomeMessage.length}/500 characters
                            </p>
                          </div>

                          {/* Preview */}
                          <div className="border rounded-lg p-4 bg-muted/30">
                            <p className="text-sm font-medium mb-3 flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Preview
                            </p>
                            <div 
                              className="p-4 rounded-lg border-2"
                              style={{ borderColor: brandingPrimaryColor }}
                            >
                              <div className="flex items-center gap-3 mb-3">
                                {brandingLogoUrl ? (
                                  <img 
                                    src={brandingLogoUrl} 
                                    alt="Logo preview" 
                                    className="h-10 w-auto max-w-[120px] object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div 
                                    className="h-10 w-10 rounded flex items-center justify-center text-white font-bold"
                                    style={{ backgroundColor: brandingPrimaryColor }}
                                  >
                                    {(brandingCompanyDisplayName || 'C').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-semibold">
                                  {brandingCompanyDisplayName || 'Your Company'}
                                </span>
                              </div>
                              <h3 
                                className="font-semibold text-lg mb-1"
                                style={{ color: brandingPrimaryColor }}
                              >
                                {brandingWelcomeTitle || 'Welcome to Your Assessment'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {brandingWelcomeMessage || 'Your personalized welcome message will appear here...'}
                              </p>
                              <Button 
                                size="sm" 
                                className="mt-3"
                                style={{ 
                                  backgroundColor: brandingPrimaryColor,
                                  borderColor: brandingPrimaryColor 
                                }}
                              >
                                Start Assessment
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

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

            {/* Developer Hub Tab */}
            <TabsContent value="developer" className="space-y-6" data-testid="panel-developer">
              <DeveloperSubTabs 
                apiKeys={apiKeys}
                apiKeysLoading={apiKeysLoading}
                onCreateKey={() => setShowCreateKeyDialog(true)}
                onRotateKey={handleRotateKey}
                onRevokeKey={handleRevokeKey}
                rotatingKeyId={rotatingKeyId}
                revokingKeyId={revokingKeyId}
              />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6" data-testid="panel-analytics">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 flex-wrap">
                  <div>
                    <CardTitle>Assessment Analytics</CardTitle>
                    <CardDescription>Visualize your assessment usage and performance</CardDescription>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <Select value={analyticsPeriod} onValueChange={(v: 'daily' | 'weekly' | 'monthly') => setAnalyticsPeriod(v)}>
                      <SelectTrigger className="w-32" data-testid="select-analytics-period">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={analyticsDays.toString()} onValueChange={(v) => setAnalyticsDays(parseInt(v))}>
                      <SelectTrigger className="w-32" data-testid="select-analytics-days">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                        <SelectItem value="365">Last year</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => window.open('/api/partner/me/export/results', '_blank')} data-testid="button-export-results">
                        <FileText className="h-4 w-4 mr-1.5" />
                        Export Results
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.open('/api/partner/me/export/usage', '_blank')} data-testid="button-export-usage">
                        <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                        Export Usage
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.open('/api/partner/me/export/billing', '_blank')} data-testid="button-export-billing">
                        <Receipt className="h-4 w-4 mr-1.5" />
                        Export Billing
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {analyticsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : analytics ? (
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Tests Over Time Chart */}
                      <div className="lg:col-span-2 border rounded-lg p-4">
                        <div className="mb-4">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">Tests Completed Over Time</h3>
                            <InfoTooltip content="Shows the volume of completed assessments over time. Use the period selector above to switch between daily, weekly, or monthly views." />
                          </div>
                          <p className="text-sm text-muted-foreground">Number of assessments completed per {analyticsPeriod === 'daily' ? 'day' : analyticsPeriod === 'weekly' ? 'week' : 'month'}</p>
                        </div>
                        <div className="h-80">
                          {analytics.testsOverTime.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={analytics.testsOverTime}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="date" className="text-xs" />
                                <YAxis className="text-xs" />
                                <RechartsTooltip />
                                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                              <p className="font-medium">No data for this period</p>
                              <p className="text-sm">Complete some assessments to see trends over time.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* By Assessment Type */}
                      <div className="border rounded-lg p-4">
                        <div className="mb-4">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">By Assessment Type</h3>
                            <InfoTooltip content="Shows how many of each assessment type have been completed, along with the average score for each type." />
                          </div>
                          <p className="text-sm text-muted-foreground">Breakdown of tests by type with average scores</p>
                        </div>
                        {analytics.byAssessmentType.length > 0 ? (
                          <div className="space-y-4">
                            {analytics.byAssessmentType.map((item, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                                  <p className="text-sm text-muted-foreground">{item.count} tests</p>
                                </div>
                                {item.avgScore !== null && (
                                  <Badge variant="secondary">Avg: {item.avgScore}%</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">No completed assessments yet. Data will appear as candidates finish tests.</p>
                        )}
                      </div>

                      {/* By Organization */}
                      <div className="border rounded-lg p-4">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold">By Organization</h3>
                          <p className="text-sm text-muted-foreground">Test distribution across organizations</p>
                        </div>
                        {analytics.byOrganization.length > 0 ? (
                          <div className="space-y-4">
                            {analytics.byOrganization.map((item, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <p className="font-medium">{item.orgName}</p>
                                <Badge variant="outline">{item.count} tests</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">Create organizations to see test distribution by client.</p>
                        )}
                      </div>

                      {/* Score Distribution Charts */}
                      <div className="lg:col-span-2 border rounded-lg p-4">
                        <div className="mb-4">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">Score Distribution</h3>
                            <InfoTooltip content="Visualize how candidates score across each assessment type. Each bar shows the number of candidates who scored within that range (0-20%, 21-40%, etc.)." />
                          </div>
                          <p className="text-sm text-muted-foreground">How candidates score across assessments</p>
                        </div>
                        {analytics.scoreDistribution && analytics.scoreDistribution.length > 0 ? (
                          <div className="grid gap-6 md:grid-cols-2">
                            {analytics.scoreDistribution.map((dist, i) => (
                              <div key={i} className="space-y-3">
                                <h4 className="font-medium text-sm">
                                  {dist.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </h4>
                                <div className="h-40">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dist.buckets} layout="vertical">
                                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                                      <XAxis type="number" className="text-xs" />
                                      <YAxis dataKey="range" type="category" className="text-xs" width={50} />
                                      <RechartsTooltip 
                                        formatter={(value: number) => [`${value} candidates`, 'Count']}
                                      />
                                      <Bar 
                                        dataKey="count" 
                                        fill="hsl(var(--primary))" 
                                        radius={[0, 4, 4, 0]}
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                            <p className="font-medium">No score data yet</p>
                            <p className="text-sm">Score distribution will appear after candidates complete assessments.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      <BarChart2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No analytics data yet</p>
                      <p className="text-sm mt-1">Analytics will populate as your candidates complete assessments.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6" data-testid="panel-notifications">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Stay updated with your account activity</CardDescription>
                  </div>
                  {notifications?.unreadCount && notifications.unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending} data-testid="button-mark-all-read">
                      <Check className="h-4 w-4 mr-1.5" />
                      Mark All Read
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {notificationsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : notifications?.notifications && notifications.notifications.length > 0 ? (
                    <div className="space-y-3">
                      {notifications.notifications.map((notif) => (
                        <div key={notif.id} className={`p-4 border rounded-lg ${notif.isRead ? 'opacity-60' : ''}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-full ${
                                notif.type.includes('warning') || notif.type.includes('critical') 
                                  ? 'bg-amber-500/10 text-amber-500' 
                                  : notif.type.includes('success') || notif.type.includes('purchase')
                                    ? 'bg-green-500/10 text-green-500'
                                    : 'bg-primary/10 text-primary'
                              }`}>
                                <Bell className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">{notif.title}</p>
                                <p className="text-sm text-muted-foreground">{notif.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDate(notif.createdAt)}
                                </p>
                              </div>
                            </div>
                            {!notif.isRead && (
                              <Button variant="ghost" size="sm" onClick={() => markReadMutation.mutate(notif.id)} data-testid={`button-mark-read-${notif.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No notifications yet</p>
                      <p className="text-sm mt-1">You'll receive notifications for quota alerts, billing updates, and system announcements.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team" className="space-y-6" data-testid="panel-team">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Manage access to your partner account</CardDescription>
                  </div>
                  <Button onClick={() => setShowInviteDialog(true)} data-testid="button-invite-member">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Invite Member
                  </Button>
                </CardHeader>
                <CardContent>
                  {teamLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : team?.members && team.members.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {team.members.map((member) => (
                        <div key={member.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{member.name || member.email}</p>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant={member.inviteStatus === 'accepted' ? 'secondary' : 'outline'}>
                                  {member.inviteStatus === 'accepted' ? 'Active' : 'Pending'}
                                </Badge>
                                <Badge variant="outline" className="capitalize">{member.role}</Badge>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeMemberMutation.mutate(member.id)}
                              disabled={removeMemberMutation.isPending}
                              data-testid={`button-remove-member-${member.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No team members yet</p>
                      <p className="text-sm mt-1">Invite colleagues to help manage assessments and view results.</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4"
                        onClick={() => setShowInviteDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Invite Your First Team Member
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Invite Dialog */}
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join your partner account
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="invite-email">Email</Label>
                      <Input 
                        id="invite-email" 
                        type="email" 
                        value={inviteEmail} 
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        data-testid="input-invite-email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="invite-name">Name (optional)</Label>
                      <Input 
                        id="invite-name" 
                        value={inviteName} 
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="John Smith"
                        data-testid="input-invite-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="invite-role">Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger data-testid="select-invite-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer - View only access</SelectItem>
                          <SelectItem value="member">Member - Can manage assessments</SelectItem>
                          <SelectItem value="admin">Admin - Full access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => inviteMemberMutation.mutate({ email: inviteEmail, name: inviteName || undefined, role: inviteRole })}
                      disabled={!inviteEmail || inviteMemberMutation.isPending}
                      data-testid="button-send-invite"
                    >
                      {inviteMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Mail className="h-4 w-4 mr-1.5" />}
                      Send Invitation
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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

      {/* Create API Key Dialog */}
      <Dialog open={showCreateKeyDialog} onOpenChange={setShowCreateKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for accessing the HumanMetrix API.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name *</Label>
              <Input
                id="key-name"
                placeholder="e.g., Production Server, Development"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                data-testid="input-new-key-name"
              />
              <p className="text-xs text-muted-foreground">A descriptive name to identify this key</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-environment">Environment</Label>
              <Select value={newKeyEnvironment} onValueChange={(v) => setNewKeyEnvironment(v as "test" | "live")}>
                <SelectTrigger data-testid="select-key-environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test (hm_test_...)</SelectItem>
                  <SelectItem value="live">Live (hm_live_...)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Test keys are for development, live keys are for production
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateKeyDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateKey} 
              disabled={!newKeyName || createKeyMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700"
              data-testid="button-confirm-create-key"
            >
              {createKeyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Key
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
              <Label htmlFor="org-slug">URL Identifier *</Label>
              <Input
                id="org-slug"
                placeholder="acme-corp"
                value={newOrgSlug}
                onChange={(e) => setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                data-testid="input-org-slug"
              />
              <p className="text-xs text-muted-foreground">A short, unique ID for this organization (e.g., "acme-corp"). Used in URLs and API calls. Lowercase letters, numbers, and hyphens only.</p>
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

      {/* Rotate API Key Confirmation */}
      <AlertDialog open={!!confirmRotateKeyId} onOpenChange={(open) => !open && setConfirmRotateKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new API key and invalidate the current one. Any applications using the old key will stop working immediately. You'll need to update your integrations with the new key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-rotate">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRotate} 
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="button-confirm-rotate"
            >
              {rotatingKeyId === confirmRotateKeyId && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Rotate Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke API Key Confirmation */}
      <AlertDialog open={!!confirmRevokeKeyId} onOpenChange={(open) => !open && setConfirmRevokeKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently deactivate this API key. Any applications using this key will immediately lose access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-revoke">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRevoke} 
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-revoke"
            >
              {revokingKeyId === confirmRevokeKeyId && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Billing Change Request Dialog */}
      <Dialog open={showBillingChangeDialog} onOpenChange={(open) => {
        setShowBillingChangeDialog(open);
        if (!open) {
          setSelectedBillingType(null);
          setBillingChangeReason("");
          setCardError(null);
          setCardComplete(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Billing Change</DialogTitle>
            <DialogDescription>
              Submit a request to change your billing model. Our team will review and respond within 1-2 business days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current billing type</p>
                  <p className="font-medium">
                    {account?.partner?.billingType === 'payg' && 'Pay As You Go'}
                    {account?.partner?.billingType === 'subscription' && 'Subscription'}
                    {account?.partner?.billingType === 'enterprise' && 'Enterprise'}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Requested billing type</p>
                  <p className="font-medium text-primary">
                    {selectedBillingType === 'payg' && 'Pay As You Go'}
                    {selectedBillingType === 'subscription' && 'Subscription'}
                    {selectedBillingType === 'enterprise' && 'Enterprise'}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-reason">Reason for change (optional)</Label>
              <textarea
                id="billing-reason"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Tell us why you'd like to change your billing model..."
                value={billingChangeReason}
                onChange={(e) => setBillingChangeReason(e.target.value)}
                data-testid="textarea-billing-reason"
              />
              <p className="text-xs text-muted-foreground">
                This helps our team understand your needs and process your request faster.
              </p>
            </div>

            {/* Card Details Section - Only shown when requesting Auto-Bill */}
            {selectedBillingType === 'subscription' && (
              <div className="space-y-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <Label className="font-medium">Card Details</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-billing requires a card on file. Your card will only be charged based on actual usage at the end of each billing cycle.
                </p>
                <Elements stripe={stripePromise}>
                  <div className="space-y-3">
                    <div className="p-3 rounded-md border bg-background">
                      <CardElement 
                        options={{
                          style: {
                            base: {
                              fontSize: '14px',
                              color: '#424770',
                              '::placeholder': {
                                color: '#aab7c4',
                              },
                            },
                            invalid: {
                              color: '#9e2146',
                            },
                          },
                        }}
                        onChange={(event) => {
                          setCardComplete(event.complete);
                          setCardError(event.error ? event.error.message : null);
                        }}
                      />
                    </div>
                    {cardError && (
                      <p className="text-xs text-destructive">{cardError}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      <span>Your card details are securely processed by Stripe</span>
                    </div>
                  </div>
                </Elements>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBillingChangeDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitBillingChange}
              disabled={isSubmittingBillingChange || (selectedBillingType === 'subscription' && !cardComplete)}
              data-testid="button-submit-billing-change"
            >
              {isSubmittingBillingChange && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interactive Spotlight Tour */}
      <PartnerTour
        isOpen={showTutorial}
        onClose={handleTourClose}
        onComplete={handleTourComplete}
        onTabChange={setActiveTab}
      />

      <Footer />
    </div>
  );
}
