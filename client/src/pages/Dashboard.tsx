import { Link, useLocation, Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, CheckCircle2, Clock, FileText, Brain, Sparkles, Code, Scale, Timer, Key, X, Eye, EyeOff, Plus, Lock, Unlock, CreditCard, PlayCircle, Bell, Trash2, Mail, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { formatAssessmentName } from "@/lib/assessmentHelpers";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import dashboardBg from "@assets/image_1763608498774.png";

// Assessment metadata
const getAssessmentMetadata = (type: string) => {
  const metadata: Record<string, { icon: any; description: string; questions: number; minutes: number; iconBg: string }> = {
    'fit': {
      icon: Brain,
      description: 'Measures 6 core behavioral and workplace competencies',
      questions: 15,
      minutes: 20,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'ai_readiness': {
      icon: Sparkles,
      description: 'Evaluates candidates\' readiness to work with AI systems',
      questions: 21,
      minutes: 20,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'ai-readiness': {
      icon: Sparkles,
      description: 'Evaluates candidates\' readiness to work with AI systems',
      questions: 21,
      minutes: 20,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'prompt_architecture': {
      icon: Code,
      description: 'Measures prompt engineering and AI communication skills',
      questions: 7,
      minutes: 21,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'prompt-architecture': {
      icon: Code,
      description: 'Measures prompt engineering and AI communication skills',
      questions: 7,
      minutes: 21,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'prompt': {
      icon: Code,
      description: 'Measures prompt engineering and AI communication skills',
      questions: 7,
      minutes: 21,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'aiq': {
      icon: Scale,
      description: 'Measures candidates\' ethical AI reasoning and judgment',
      questions: 8,
      minutes: 20,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    }
  };
  return metadata[type] || metadata['fit'];
};

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { countryCode, currency, formatLocalCurrency, getLocalPriceNumber } = useCurrency();
  
  const initialSearchParams = new URLSearchParams(window.location.search);
  const [candidateView] = useState(() => 
    initialSearchParams.get('view') === 'candidate' || initialSearchParams.has('scrollToSeries') || initialSearchParams.has('scrollToB2C')
  );
  
  // Change password state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Notification preferences state
  const [notificationsDialogOpen, setNotificationsDialogOpen] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    assessmentReminders: true,
    resultNotifications: true,
    marketingEmails: false,
  });
  
  // Delete account state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      setPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });
  
  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };
  
  // Update notification preferences mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (prefs: typeof notificationPrefs) => {
      const res = await apiRequest("PATCH", "/api/user/notification-preferences", prefs);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved.",
      });
      setNotificationsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notification preferences",
        variant: "destructive",
      });
    },
  });
  
  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/user/request-account-deletion");
      return res.json();
    },
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setDeleteConfirmText("");
      toast({
        title: "Request Submitted",
        description: "Your account deletion request has been sent to our team for review. You'll receive a confirmation email once processed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit deletion request",
        variant: "destructive",
      });
    },
  });
  
  // Remove assessment state and mutation
  const [assessmentToRemove, setAssessmentToRemove] = useState<{ id: string; name: string } | null>(null);
  
  // Partner results unlock dialog state
  const [lockedResultsDialog, setLockedResultsDialog] = useState<{
    seriesId: string;
    partnerName: string;
    autoUnlockDate: string | null;
    completedResults: { id: string; assessmentType: string }[];
  } | null>(null);
  
  // Track purchase mode: 'bulk' or 'individual'
  const [purchaseMode, setPurchaseMode] = useState<'bulk' | 'individual'>('bulk');
  
  // Track selected assessments for individual purchase
  const [selectedAssessments, setSelectedAssessments] = useState<Set<string>>(new Set());
  
  // Result selection dialog state (for viewing multiple results)
  const [resultSelectionDialog, setResultSelectionDialog] = useState<{
    seriesId: string;
    partnerName: string;
    unlockedResults: { id: string; assessmentType: string; totalScore: number | null }[];
  } | null>(null);
  
  // Helper to format assessment type for display
  const formatAssessmentTypeDisplay = (type: string): string => {
    const typeMap: Record<string, string> = {
      'fit': 'FIT Assessment',
      'ai_readiness': 'AI Readiness',
      'prompt_architecture': 'Prompt Architecture',
      'aiq': 'AIQ',
    };
    return typeMap[type.toLowerCase()] || type;
  };
  
  // Pricing query for the unlock dialog - uses user's country for currency
  const { data: pricingData, isLoading: pricingLoading } = useQuery<{
    baseFee: number;
    baseFeeDisplay: string;
    assessments: { type: string; priceInPence: number; priceDisplay: string; originalPriceDisplay: string }[];
    individualTotal: { priceInPence: number; priceDisplay: string; originalPriceDisplay: string; discountRate: number };
    bulkTotal: { priceInPence: number; priceDisplay: string; originalPriceDisplay: string; discountRate: number };
    currency: string;
    currencySymbol: string;
    hasBulkDiscount: boolean;
    individualDiscountRate: number;
    bulkDiscountRate: number;
    lockedExchangeRate: number; // Exchange rate locked at pricing time for checkout consistency
  }>({
    queryKey: ['/api/partner-results-pricing', lockedResultsDialog?.seriesId, countryCode],
    queryFn: async () => {
      const url = `/api/partner-results-pricing/${lockedResultsDialog?.seriesId}${countryCode ? `?countryCode=${countryCode}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch pricing');
      return res.json();
    },
    enabled: !!lockedResultsDialog?.seriesId,
  });
  
  // Auto-select when there's only 1 assessment remaining
  useEffect(() => {
    if (pricingData && pricingData.assessments.length === 1) {
      setPurchaseMode('individual');
      setSelectedAssessments(new Set([pricingData.assessments[0].type]));
    }
  }, [pricingData]);
  
  const removeAssessmentMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("DELETE", `/api/purchase-items/${itemId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Assessment Removed",
        description: "The assessment has been removed from your testing suite.",
      });
      setAssessmentToRemove(null);
      queryClient.invalidateQueries({ queryKey: ["/api/available-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases-with-results"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove assessment",
        variant: "destructive",
      });
      setAssessmentToRemove(null);
    },
  });
  
  // Add assessment mutation - adds an assessment back to the testing suite
  const addAssessmentMutation = useMutation({
    mutationFn: async (assessmentType: string) => {
      const res = await apiRequest("POST", "/api/purchase-items/add", { assessmentType });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Assessment Added",
        description: "The assessment has been added to your testing suite.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/available-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases-with-results"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add assessment",
        variant: "destructive",
      });
    },
  });

  const { data: availableData, isLoading: assessmentsLoading, refetch: refetchAssessments } = useQuery<{assessments: any[], requiredAssessmentTypes: string[]}>({
    queryKey: ["/api/available-assessments"],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale
  });

  const { data: purchasesWithResults, isLoading: purchasesLoading, refetch: refetchPurchases } = useQuery<any[]>({
    queryKey: ["/api/purchases-with-results"],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Fetch partner testing series (from partner invitations)
  const { data: partnerTestingSeries, isLoading: partnerSeriesLoading, refetch: refetchPartnerSeries } = useQuery<any[]>({
    queryKey: ["/api/partner-testing-series"],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale
  });

  // Partner results purchase mutation
  const partnerResultsPurchaseMutation = useMutation({
    mutationFn: async (params: { 
      partnerInvitationId: string; 
      isBulkPurchase?: boolean;
      assessmentTypes?: string[];
      lockedExchangeRate?: number;
    }) => {
      const res = await apiRequest("POST", "/api/create-partner-results-checkout", { 
        partnerInvitationId: params.partnerInvitationId,
        countryCode: countryCode || 'GB', // Use detected country from geolocation
        isBulkPurchase: params.isBulkPurchase,
        assessmentTypes: params.assessmentTypes,
        lockedExchangeRate: params.lockedExchangeRate, // Pass locked rate to prevent price changes
      });
      return res.json();
    },
    onSuccess: async (data) => {
      if (data.provider === 'airwallex' && data.intentId && data.clientSecret) {
        try {
          const { redirectToAirwallexCheckout } = await import('@/lib/airwallexCheckout');
          await redirectToAirwallexCheckout({
            intentId: data.intentId,
            clientSecret: data.clientSecret,
            currency: data.currency || 'GBP',
            countryCode: countryCode || 'GB',
            airwallexEnv: data.airwallexEnv,
            successUrl: `${window.location.origin}/dashboard?view=candidate&partner_purchase=success&provider=airwallex&intent_id=${data.intentId}&seriesId=${lockedResultsDialog?.seriesId || ''}`,
            failUrl: `${window.location.origin}/dashboard?view=candidate&partner_purchase=cancelled`,
          });
          return;
        } catch (err: any) {
          console.error('Airwallex redirect failed:', err);
          toast({
            title: "Payment redirect failed",
            description: "Unable to open payment page. Please try again.",
            variant: "destructive",
          });
        }
      }
      if (data.url) {
        window.location.replace(data.url);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });
  
  // Force refetch when returning from Purchase page with refresh flag
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refresh = params.get("refresh");
    
    if (refresh) {
      // Force refetch of data
      refetchAssessments();
      refetchPurchases();
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [refetchAssessments, refetchPurchases]);

  // Check for stale/abandoned assessments on dashboard load
  useEffect(() => {
    let isMounted = true;
    
    const checkStaleAssessments = async () => {
      try {
        const response = await apiRequest("POST", "/api/assessments/check-stale");
        if (!response.ok) return; // Handle non-200 responses gracefully
        
        const result = await response.json();
        // Guard against malformed response and component unmount
        if (isMounted && result && typeof result.markedAbandoned === 'number' && result.markedAbandoned > 0) {
          // Refetch data if any assessments were marked abandoned
          refetchAssessments();
          refetchPurchases();
        }
      } catch {
        // Silently handle - non-critical operation
      }
    };
    
    checkStaleAssessments();
    
    return () => {
      isMounted = false;
    };
  }, [refetchAssessments, refetchPurchases]);

  const availableAssessments = availableData?.assessments || [];
  const requiredAssessmentTypes = availableData?.requiredAssessmentTypes || [];

  // Handle payment cancellation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");

    if (payment === "cancelled") {
      toast({
        title: "Payment Cancelled",
        description: "You can unlock your results anytime from your dashboard.",
      });
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [toast]);

  // Track which series to scroll to after purchase
  const [scrollToSeriesId, setScrollToSeriesId] = useState<string | null>(null);
  const [scrollToB2C, setScrollToB2C] = useState(false);

  // Handle partner results purchase success
  useEffect(() => {
    const confirmPartnerPurchase = async () => {
      const params = new URLSearchParams(window.location.search);
      const partnerPurchase = params.get("partner_purchase");
      const sessionId = params.get("session_id");
      const provider = params.get("provider");
      const intentId = params.get("intent_id");
      const seriesId = params.get("seriesId");
      const scrollToSeriesParam = params.get("scrollToSeries");
      const scrollToB2CParam = params.get("scrollToB2C");

      if (partnerPurchase === "success" && (sessionId || intentId)) {
        try {
          const body = provider === 'airwallex' && intentId
            ? { intentId, provider: 'airwallex' }
            : { sessionId };
          const res = await apiRequest("POST", "/api/confirm-partner-results-purchase", body);
          if (res.ok) {
            toast({
              title: "Results Unlocked!",
              description: "You now have full access to your assessment results.",
            });
            await refetchPartnerSeries();
            if (seriesId) {
              setScrollToSeriesId(seriesId);
            }
          }
        } catch (error) {
          console.error("Error confirming partner purchase:", error);
        }
        window.history.replaceState({}, '', '/dashboard');
      } else if (partnerPurchase === "cancelled") {
        toast({
          title: "Purchase Cancelled",
          description: "You can unlock your results anytime from your dashboard or wait for 30-day auto-unlock.",
        });
        window.history.replaceState({}, '', '/dashboard');
      } else if (scrollToSeriesParam) {
        setScrollToSeriesId(scrollToSeriesParam);
        window.history.replaceState({}, '', '/dashboard');
      } else if (scrollToB2CParam) {
        setScrollToB2C(true);
        window.history.replaceState({}, '', '/dashboard');
      }
    };

    confirmPartnerPurchase();
  }, [toast, refetchPartnerSeries]);

  // Scroll to the target series card after data loads
  useEffect(() => {
    if (!scrollToSeriesId) return;
    
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryScroll = () => {
      const element = document.getElementById(`partner-series-${scrollToSeriesId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-cyan-500', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-cyan-500', 'ring-offset-2');
        }, 3000);
        setScrollToSeriesId(null);
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          timer = setTimeout(tryScroll, 500);
        } else {
          setScrollToSeriesId(null);
        }
      }
    };
    
    let timer = setTimeout(tryScroll, 500);
    return () => clearTimeout(timer);
  }, [scrollToSeriesId, partnerTestingSeries]);

  // Scroll to B2C testing series section after checkout
  useEffect(() => {
    if (!scrollToB2C) return;
    
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryScroll = () => {
      const element = document.getElementById('b2c-testing-series');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setScrollToB2C(false);
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          timer = setTimeout(tryScroll, 500);
        } else {
          setScrollToB2C(false);
        }
      }
    };
    
    let timer = setTimeout(tryScroll, 500);
    return () => clearTimeout(timer);
  }, [scrollToB2C, availableAssessments]);

  if (!authLoading && user) {
    if (user.role === 'super_admin' && !candidateView) {
      return <Redirect to="/admin/dashboard" />;
    }
    
    if (user.role === 'partner_admin' && !candidateView) {
      return <Redirect to="/partner" />;
    }
    
    if (user.role === 'organization_admin' && !candidateView) {
      return <Redirect to="/admin/dashboard" />;
    }
  }

  if (assessmentsLoading || purchasesLoading || partnerSeriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Filter purchases with consumed slots (completed OR abandoned)
  // This includes series where tests were abandoned - they should appear in "Your Results"
  const purchasesWithCompletedResults = (purchasesWithResults || []).filter(
    (purchase: any) => purchase.completedCount > 0 || purchase.abandonedCount > 0
  );

  // Determine section ordering: compare earliest creation dates (safe against missing dates)
  const getEarliestDate = (items: any[]) => {
    const dates = items
      .map((item: any) => item.createdAt ? new Date(item.createdAt).getTime() : NaN)
      .filter((d: number) => !isNaN(d));
    return dates.length > 0 ? Math.min(...dates) : Infinity;
  };
  const earliestPartnerDate = getEarliestDate(partnerTestingSeries || []);
  const earliestB2CDate = Math.min(
    getEarliestDate(purchasesWithResults || []),
    getEarliestDate(availableAssessments || [])
  );
  const showPartnerFirst = earliestPartnerDate <= earliestB2CDate;

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background image with dark overlay */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url(${dashboardBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(13, 29, 51, 0.85), rgba(13, 29, 51, 0.75), rgba(13, 29, 51, 0.85))'
        }} />
      </div>
      <Navigation />
      <main className="flex-grow py-16 relative z-10">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">My Dashboard</h1>
              <p className="text-white/80">
                Welcome back, {user?.firstName || 'there'}!
              </p>
              {user?.email && (
                <p className="text-white/60 text-sm flex items-center gap-1 mt-1" data-testid="text-user-email">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </p>
              )}
            </div>
            
            {/* Account action buttons */}
            <div className="flex flex-wrap gap-2">
              {/* Change Password */}
              <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-white border-white/50 hover:bg-white/10" data-testid="button-change-password">
                    <Key className="h-4 w-4" />
                    <span className="hidden sm:inline">Change Password</span>
                    <span className="sm:hidden">Password</span>
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Enter your current password and choose a new one.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        data-testid="input-current-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-current-password"
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        data-testid="input-new-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-new-password"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        data-testid="input-confirm-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-confirm-password"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button 
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                    className="w-full"
                    data-testid="button-submit-password-change"
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      "Change Password"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
              
              {/* Settings Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-white border-white/50 hover:bg-white/10" data-testid="button-settings">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    onSelect={(e) => e.preventDefault()}
                    onClick={() => setNotificationsDialogOpen(true)}
                    data-testid="menu-notifications"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={(e) => e.preventDefault()}
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-red-600 focus:text-red-600"
                    data-testid="menu-delete-account"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Notification Preferences Dialog */}
              <Dialog open={notificationsDialogOpen} onOpenChange={setNotificationsDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Notification Preferences</DialogTitle>
                    <DialogDescription>
                      Choose which email notifications you'd like to receive.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="assessment-reminders">Assessment Reminders</Label>
                        <p className="text-sm text-muted-foreground">Reminders for incomplete assessments</p>
                      </div>
                      <Checkbox
                        id="assessment-reminders"
                        checked={notificationPrefs.assessmentReminders}
                        onCheckedChange={(checked) => 
                          setNotificationPrefs(prev => ({ ...prev, assessmentReminders: !!checked }))
                        }
                        data-testid="checkbox-assessment-reminders"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="result-notifications">Result Notifications</Label>
                        <p className="text-sm text-muted-foreground">Emails when your results are ready</p>
                      </div>
                      <Checkbox
                        id="result-notifications"
                        checked={notificationPrefs.resultNotifications}
                        onCheckedChange={(checked) => 
                          setNotificationPrefs(prev => ({ ...prev, resultNotifications: !!checked }))
                        }
                        data-testid="checkbox-result-notifications"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="marketing-emails">Marketing Emails</Label>
                        <p className="text-sm text-muted-foreground">Updates about new features and offers</p>
                      </div>
                      <Checkbox
                        id="marketing-emails"
                        checked={notificationPrefs.marketingEmails}
                        onCheckedChange={(checked) => 
                          setNotificationPrefs(prev => ({ ...prev, marketingEmails: !!checked }))
                        }
                        data-testid="checkbox-marketing-emails"
                      />
                    </div>
                    <Button 
                      onClick={() => updateNotificationsMutation.mutate(notificationPrefs)}
                      disabled={updateNotificationsMutation.isPending}
                      className="w-full"
                      data-testid="button-save-notifications"
                    >
                      {updateNotificationsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Preferences"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Delete Account Request Dialog */}
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Request Account Deletion</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your account deletion request will be sent to our team for review. A super admin will process your request and you'll receive a confirmation email once completed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Label htmlFor="delete-confirm">Type "DELETE" to confirm your request:</Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE"
                      className="mt-2"
                      data-testid="input-delete-confirm"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
                    <Button
                      onClick={() => {
                        deleteAccountMutation.mutate();
                      }}
                      disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
                      variant="destructive"
                      data-testid="button-confirm-delete"
                    >
                      {deleteAccountMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Request"
                      )}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Sections ordered chronologically: oldest testing series first */}
          <div className="flex flex-col">

          {(partnerTestingSeries || []).length > 0 && (
            <section className="mb-12" style={{ order: showPartnerFirst ? 0 : 5 }}>
              <h2 className="text-xl md:text-2xl font-semibold mb-4 text-white">Partner Testing Series</h2>
              <p className="text-white/70 text-sm mb-4">
                Assessments completed via partner invitations
              </p>
              <div className="space-y-6">
                {[...(partnerTestingSeries || [])].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((series: any, index: number) => {
                  const progressPercentage = Math.round((series.completedCount / series.totalCount) * 100);
                  const isAllComplete = series.allComplete;
                  
                  return (
                    <Card key={series.id} id={`partner-series-${series.id}`} className="p-6 hover-elevate transition-all">
                      <div className="flex flex-col md:flex-row items-start gap-6">
                        <div className="flex-shrink-0">
                          <div 
                            className="relative w-20 h-20" 
                            role="img" 
                            aria-label={`${series.completedCount} of ${series.totalCount} assessments completed, ${progressPercentage}% complete`}
                          >
                            <svg className="w-20 h-20 transform -rotate-90" aria-hidden="true">
                              <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="none" className="text-muted/20" />
                              <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="none"
                                strokeDasharray={`${2 * Math.PI * 36}`}
                                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progressPercentage / 100)}`}
                                className={isAllComplete ? "text-cyan-500" : "text-blue-500"}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                              <span className="text-lg font-bold">{progressPercentage}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-2">
                            {isAllComplete ? (
                              <CheckCircle2 className="h-5 w-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <Clock className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-semibold">Partner Series #{index + 1}</h3>
                                <Badge className="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20">
                                  {series.partnerName}
                                </Badge>
                                {(() => {
                                  const hasAnyResult = (series.results || []).length > 0;
                                  const hasInProgress = (series.results || []).some((r: any) => r.status === 'in_progress' || r.status === 'started');
                                  if (isAllComplete) {
                                    return (<Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 gap-1"><CheckCircle2 className="h-3 w-3" />Completed</Badge>);
                                  } else if (hasInProgress || (hasAnyResult && series.completedCount > 0)) {
                                    return (<Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 gap-1"><Clock className="h-3 w-3" />In Progress</Badge>);
                                  } else {
                                    return (<Badge className="bg-muted text-muted-foreground border-muted-foreground/20 gap-1"><PlayCircle className="h-3 w-3" />Not Started</Badge>);
                                  }
                                })()}
                                {isAllComplete && (() => {
                                  const unlockedCount = (series.results || []).filter((r: any) => r.isUnlocked).length;
                                  const totalCompleted = (series.results || []).filter((r: any) => r.status === 'completed').length;
                                  const hasPartialUnlock = unlockedCount > 0 && unlockedCount < totalCompleted;
                                  if (series.resultsUnlocked) {
                                    return (<Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 gap-1"><Unlock className="h-3 w-3" />{series.isPurchased ? 'Purchased' : 'Auto-Unlocked'}</Badge>);
                                  } else if (hasPartialUnlock) {
                                    return (<Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 gap-1"><Unlock className="h-3 w-3" />{unlockedCount} of {totalCompleted} Unlocked</Badge>);
                                  } else {
                                    return (<Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 gap-1"><Lock className="h-3 w-3" />Scores Locked</Badge>);
                                  }
                                })()}
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">
                            <span className="font-medium">{series.completedCount} of {series.totalCount}</span> assessments completed
                            {series.completedAt && (<span className="ml-2">• {format(new Date(series.completedAt), 'MMM d, yyyy')}</span>)}
                            {isAllComplete && !series.resultsUnlocked && series.autoUnlockDate && (
                              <span className="ml-2 text-amber-600 dark:text-amber-400">• Auto-unlocks {format(new Date(series.autoUnlockDate), 'MMM d, yyyy')}</span>
                            )}
                          </p>

                          <div className="flex flex-wrap gap-2 mb-4">
                            {(series.assessmentTypes || []).map((assessmentType: string) => {
                              const normalizedType = assessmentType.toLowerCase().replace(/-/g, '_');
                              const metadata = getAssessmentMetadata(normalizedType);
                              const ResultIcon = metadata.icon;
                              const result = (series.results || []).find((r: any) => r.assessmentType.toLowerCase().replace(/-/g, '_') === normalizedType);
                              const isCompleted = result?.status === 'completed';
                              const isInProgress = result?.status === 'in_progress' || result?.status === 'started';
                              const isAbandoned = result?.status === 'abandoned';
                              const isUnlocked = result?.isUnlocked || series.resultsUnlocked;
                              let badgeClassName = "gap-1.5 py-1 ";
                              if (isCompleted) { badgeClassName += "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"; }
                              else if (isInProgress) { badgeClassName += "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"; }
                              else if (isAbandoned) { badgeClassName += "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"; }
                              else { badgeClassName += "bg-muted/50 border-muted-foreground/20"; }
                              return (
                                <Badge key={assessmentType} variant="outline" className={badgeClassName} data-testid={`badge-assessment-${normalizedType}`}>
                                  <ResultIcon className="h-3 w-3" />
                                  {formatAssessmentName(normalizedType)}
                                  {isCompleted ? (
                                    isUnlocked && result?.totalScore ? (<span className="text-cyan-600 dark:text-cyan-400 ml-1">{result.totalScore}%</span>) : (<Lock className="h-3 w-3 text-amber-500 ml-1" />)
                                  ) : isInProgress ? (<Clock className="h-3 w-3 text-blue-500 ml-1" />
                                  ) : isAbandoned ? (<span className="text-orange-600 dark:text-orange-400 text-xs ml-1">Incomplete</span>
                                  ) : (<span className="text-muted-foreground text-xs ml-1">Not started</span>)}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 md:w-48">
                          {(() => {
                            const completedResults = (series.results || []).filter((r: any) => r.status === 'completed');
                            const hasCompletedResults = completedResults.length > 0;
                            const lockedResults = completedResults.filter((r: any) => !r.isUnlocked && !series.resultsUnlocked);
                            const hasLockedResults = lockedResults.length > 0;
                            const unlockedResults = completedResults.filter((r: any) => r.isUnlocked || series.resultsUnlocked);
                            const hasUnlockedResults = unlockedResults.length > 0;
                            const isIncomplete = !series.allComplete;
                            return (
                              <>
                                {hasCompletedResults && (<p className="text-sm text-muted-foreground font-medium text-center">Results shared with {series.partnerName}</p>)}
                                {isIncomplete && series.inviteToken && (
                                  <Link href={`/start-assessment?token=${series.inviteToken}`}>
                                    <Button className="mt-2 w-full" variant="default" data-testid={`button-resume-testing-${series.id}`}>
                                      <PlayCircle className="mr-2 h-4 w-4" />Resume Testing
                                    </Button>
                                  </Link>
                                )}
                                {hasUnlockedResults && (
                                  unlockedResults.length > 1 ? (
                                    <Button className="mt-2 w-full" variant={isIncomplete ? "outline" : "default"} data-testid={`button-view-partner-results-${series.id}`}
                                      onClick={() => { setResultSelectionDialog({ seriesId: series.id, partnerName: series.partnerName, unlockedResults: unlockedResults.map((r: any) => ({ id: r.id, assessmentType: r.assessmentType, totalScore: r.totalScore })) }); }}>
                                      <FileText className="mr-2 h-4 w-4" />View Results
                                    </Button>
                                  ) : (
                                    <Link href={`/my-results?partnerInvitationId=${series.id}`}>
                                      <Button className="mt-2 w-full" variant={isIncomplete ? "outline" : "default"} data-testid={`button-view-partner-results-${series.id}`}>
                                        <FileText className="mr-2 h-4 w-4" />View Results
                                      </Button>
                                    </Link>
                                  )
                                )}
                                {hasLockedResults && (
                                  <Button onClick={() => { setLockedResultsDialog({ seriesId: series.id, partnerName: series.partnerName, autoUnlockDate: series.autoUnlockDate, completedResults: lockedResults }); }}
                                    className="mt-2" variant="outline" data-testid={`button-results-${series.id}`}>
                                    <Lock className="mr-2 h-4 w-4" />Unlock Results
                                  </Button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Available Assessments */}
          <section id="b2c-testing-series" className="mb-12" style={{ order: (availableAssessments && availableAssessments.length > 0) ? (showPartnerFirst ? 1 : 0) : (showPartnerFirst ? 3 : 2) }}>
            <h2 className="text-xl md:text-2xl font-semibold mb-4 text-white">Available Assessments</h2>
            {availableAssessments && availableAssessments.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableAssessments.map((assessment: any) => {
                  const metadata = getAssessmentMetadata(assessment.assessmentType);
                  const AssessmentIcon = metadata.icon;
                  const isInProgress = assessment.status === 'in_progress';
                  // Can only remove if: canRemove flag is true AND not in progress
                  const canRemove = assessment.canRemove && !isInProgress;
                  return (
                    <Card 
                      key={assessment.purchaseItemId} 
                      className="hover-elevate active-elevate-2 transition-all border-2 relative group"
                    >
                      <div className="p-4">
                        {/* Remove assessment button - subtle icon inside card, only show if canRemove and not in progress */}
                        {canRemove && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setAssessmentToRemove({
                                id: assessment.purchaseItemId,
                                name: formatAssessmentName(assessment.assessmentType)
                              });
                            }}
                            className="absolute top-2 right-2 p-1 rounded text-gray-500 hover:text-destructive hover:bg-destructive/10 transition-colors"
                            data-testid={`button-remove-${assessment.assessmentType}`}
                            aria-label={`Remove ${formatAssessmentName(assessment.assessmentType)} assessment`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <div className="flex items-start gap-3 mb-4">
                          <div className={`p-2.5 rounded-xl ${metadata.iconBg} text-white shadow-lg flex-shrink-0`}>
                            <AssessmentIcon className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-1 flex-wrap">
                              <Badge 
                                variant="secondary" 
                                className={`flex-shrink-0 text-xs ${
                                  isInProgress 
                                    ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20' 
                                    : 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                                }`}
                              >
                                {isInProgress ? 'In Progress' : 'Ready'}
                              </Badge>
                              <h3 className="text-lg font-bold leading-tight">{formatAssessmentName(assessment.assessmentType)}</h3>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{metadata.description}</p>
                        <div className="flex items-center gap-4 mb-4 pb-4 border-b">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 rounded-md bg-muted">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{metadata.questions}</div>
                              <div className="text-xs text-muted-foreground">questions</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 rounded-md bg-muted">
                              <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{metadata.minutes}</div>
                              <div className="text-xs text-muted-foreground">minutes</div>
                            </div>
                          </div>
                        </div>
                        <Link href={`/assessment/${assessment.purchaseItemId}`}>
                          <Button className="w-full" data-testid={`button-start-${assessment.assessmentType}`}>
                            {isInProgress ? 'Continue Assessment' : 'Start Assessment'}
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No assessments available. Get started with a testing series.
                </p>
                <Link href="/assessments?view=candidate">
                  <Button data-testid="button-browse-assessments">Browse More Assessments</Button>
                </Link>
              </Card>
            )}
          </section>

          {/* Add to Testing Suite - Show assessments not currently in the active suite */}
          <div style={{ order: showPartnerFirst ? 4 : 3 }}>
          {(() => {
            // All available assessment types
            const allAssessmentTypes = ['fit', 'ai_readiness', 'prompt_architecture', 'aiq'];
            
            // Get currently active assessment types (assessments in Available Assessments section)
            const activeTypes = new Set(
              availableAssessments.map((a: any) => a.assessmentType)
            );
            
            // Get the active purchaseId(s) from available assessments
            const activePurchaseIds = new Set(
              availableAssessments
                .filter((a: any) => a.purchaseId)
                .map((a: any) => a.purchaseId)
            );
            
            // Get completed types ONLY from the active purchase(s)
            // Types completed in OTHER testing series can be re-added
            const completedInActivePurchase = new Set<string>();
            purchasesWithCompletedResults.forEach((purchase: any) => {
              // Only consider completions from the active purchase
              if (activePurchaseIds.has(purchase.id)) {
                purchase.results?.forEach((result: any) => {
                  if (result.assessmentType && (result.status === 'completed' || result.status === 'abandoned')) {
                    completedInActivePurchase.add(result.assessmentType);
                  }
                });
              }
            });
            
            // Find missing types that can be added:
            // - Not currently in Available Assessments (not active)
            // - Not completed/abandoned in the active testing series
            const missingTypes = allAssessmentTypes.filter(type => 
              !activeTypes.has(type) && !completedInActivePurchase.has(type)
            );
            
            // Only show this section if there are missing assessments AND user has at least one active assessment
            if (missingTypes.length === 0 || availableAssessments.length === 0) return null;
            
            return (
              <section className="mb-12">
                <h2 className="text-xl md:text-2xl font-semibold mb-4 text-white/70">Add to Testing Suite</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {missingTypes.map((type) => {
                    const metadata = getAssessmentMetadata(type);
                    const AssessmentIcon = metadata.icon;
                    return (
                      <Card 
                        key={type}
                        className="hover-elevate active-elevate-2 transition-all border-2 border-dashed border-muted-foreground/30 bg-card/60"
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3 mb-4">
                            <div className={`p-2.5 rounded-xl ${metadata.iconBg} text-white shadow-lg flex-shrink-0 opacity-70`}>
                              <AssessmentIcon className="h-6 w-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 mb-1 flex-wrap">
                                <Badge 
                                  variant="secondary" 
                                  className="flex-shrink-0 text-xs bg-muted/50 text-muted-foreground border-muted-foreground/20"
                                >
                                  Not Added
                                </Badge>
                                <h3 className="text-lg font-bold leading-tight text-foreground/80">{formatAssessmentName(type)}</h3>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{metadata.description}</p>
                          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-dashed border-muted-foreground/20">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="p-1.5 rounded-md bg-muted/50">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="font-semibold text-sm text-foreground/70">{metadata.questions}</div>
                                <div className="text-xs text-muted-foreground">questions</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="p-1.5 rounded-md bg-muted/50">
                                <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="font-semibold text-sm text-foreground/70">{metadata.minutes}</div>
                                <div className="text-xs text-muted-foreground">minutes</div>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => addAssessmentMutation.mutate(type)}
                            disabled={addAssessmentMutation.isPending}
                            data-testid={`button-add-${type}`}
                          >
                            {addAssessmentMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4" />
                                Add to Testing Suite
                              </>
                            )}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })()}
          </div>

          {/* Completed Testing Series (Batches) */}
          {purchasesWithCompletedResults.length > 0 && (
            <section className="mb-12" style={{ order: (availableAssessments && availableAssessments.length > 0) ? (showPartnerFirst ? 2 : 1) : (showPartnerFirst ? 1 : 0) }}>
              <h2 className="text-xl md:text-2xl font-semibold mb-4 text-white">Your Results</h2>
              <div className="space-y-6">
                {[...purchasesWithCompletedResults].reverse().map((purchase: any, index: number) => {
                  // For progress: show consumed (completed + abandoned) / total
                  const consumedCount = (purchase.completedCount || 0) + (purchase.abandonedCount || 0);
                  const progressPercentage = Math.round((consumedCount / purchase.totalCount) * 100);
                  const isAllConsumed = consumedCount >= purchase.totalCount;
                  // Series is "complete" if all slots consumed AND at least one valid result
                  const hasValidResults = purchase.completedCount > 0;
                  
                  return (
                    <Card key={purchase.id} className="p-6 hover-elevate transition-all">
                      <div className="flex flex-col md:flex-row items-start gap-6">
                        {/* Progress Circle */}
                        <div className="flex-shrink-0">
                          <div 
                            className="relative w-20 h-20" 
                            role="img" 
                            aria-label={`${consumedCount} of ${purchase.totalCount} assessments used, ${progressPercentage}% complete${isAllConsumed ? ', all assessments finished' : ''}`}
                          >
                            <svg className="w-20 h-20 transform -rotate-90" aria-hidden="true">
                              <circle
                                cx="40"
                                cy="40"
                                r="36"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="none"
                                className="text-muted/20"
                              />
                              <circle
                                cx="40"
                                cy="40"
                                r="36"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 36}`}
                                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progressPercentage / 100)}`}
                                className={purchase.hasOnlyAbandonedResults ? "text-orange-500" : (isAllConsumed && hasValidResults ? "text-green-500" : "text-blue-500")}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                              <span className="text-lg font-bold">{progressPercentage}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-2">
                            {purchase.hasOnlyAbandonedResults ? (
                              <Clock className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                            ) : isAllConsumed && hasValidResults ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <Clock className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-semibold">
                                  Testing Series #{index + 1}
                                </h3>
                                {purchase.hasOnlyAbandonedResults ? (
                                  <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20">
                                    Incomplete
                                  </Badge>
                                ) : isAllConsumed && hasValidResults && (
                                  <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                    All Complete
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">
                            <span className="font-medium">{purchase.completedCount} of {purchase.totalCount}</span> assessments completed
                            {purchase.abandonedCount > 0 && (
                              <span className="text-orange-600 dark:text-orange-400 ml-1">({purchase.abandonedCount} incomplete)</span>
                            )}
                            {purchase.completedAt && (
                              <span className="ml-2">• {format(new Date(purchase.completedAt), 'MMM d, yyyy')}</span>
                            )}
                          </p>

                          {/* Completed and Abandoned Assessments with Icons */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {(purchase.results || [])
                              .filter((r: any) => r.status === 'completed')
                              .map((result: any) => {
                                const metadata = getAssessmentMetadata(result.assessmentType);
                                const ResultIcon = metadata.icon;
                                return (
                                  <Badge key={result.id} variant="outline" className="gap-1.5 py-1">
                                    <ResultIcon className="h-3 w-3" />
                                    {formatAssessmentName(result.assessmentType)}
                                  </Badge>
                                );
                              })}
                            {/* Show abandoned assessments with Incomplete badge */}
                            {(purchase.results || [])
                              .filter((r: any) => r.status === 'abandoned')
                              .map((result: any) => {
                                const metadata = getAssessmentMetadata(result.assessmentType);
                                const ResultIcon = metadata.icon;
                                return (
                                  <Badge 
                                    key={result.id} 
                                    variant="outline" 
                                    className="gap-1.5 py-1 border-orange-500/50 text-orange-600 dark:text-orange-400"
                                    data-testid={`badge-incomplete-${result.assessmentType}`}
                                  >
                                    <ResultIcon className="h-3 w-3" />
                                    {formatAssessmentName(result.assessmentType)}
                                    <span className="text-[10px] uppercase tracking-wide">(Incomplete)</span>
                                  </Badge>
                                );
                              })}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 md:w-48">
                          {/* Series with only abandoned tests - no results to unlock */}
                          {purchase.hasOnlyAbandonedResults && (
                            <div className="text-center py-2">
                              <p className="text-sm text-muted-foreground font-medium" data-testid={`text-incomplete-${purchase.id}`}>
                                Test Incomplete
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                No results available
                              </p>
                            </div>
                          )}
                          {/* All consumed with valid results AND paid - can view */}
                          {!purchase.hasOnlyAbandonedResults && isAllConsumed && hasValidResults && purchase.resultsAccessPaid && (
                            <>
                              <Link href={`/my-results?purchaseId=${purchase.id}`}>
                                <Button className="gap-2 w-full" data-testid={`button-view-results-${purchase.id}`}>
                                  <FileText className="h-4 w-4" />
                                  View Results
                                </Button>
                              </Link>
                              <div className="text-center">
                                <Badge variant="secondary" className="text-xs">
                                  ✓ Unlocked
                                </Badge>
                              </div>
                            </>
                          )}
                          {/* All consumed with valid results BUT not paid - can unlock */}
                          {!purchase.hasOnlyAbandonedResults && isAllConsumed && hasValidResults && !purchase.resultsAccessPaid && (
                            <>
                              <Link href={`/my-results?purchaseId=${purchase.id}`}>
                                <Button variant="default" className="gap-2 w-full" data-testid={`button-unlock-results-${purchase.id}`}>
                                  <FileText className="h-4 w-4" />
                                  Unlock Results
                                </Button>
                              </Link>
                              <div className="text-center">
                                <Badge variant="outline" className="text-xs border-orange-500 text-orange-600 dark:text-orange-400">
                                  Payment Required
                                </Badge>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          </div>{/* end flex-col for section ordering */}

        </div>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
      
      {/* Remove Assessment Confirmation Dialog */}
      <AlertDialog open={!!assessmentToRemove} onOpenChange={(open) => !open && setAssessmentToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {assessmentToRemove?.name} from the testing suite? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => assessmentToRemove && removeAssessmentMutation.mutate(assessmentToRemove.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove"
            >
              {removeAssessmentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Yes, Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Result Selection Dialog - for choosing which result to view */}
      <Dialog open={!!resultSelectionDialog} onOpenChange={(open) => {
        if (!open) {
          setResultSelectionDialog(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Select Assessment Result
            </DialogTitle>
            <DialogDescription>
              You have {resultSelectionDialog?.unlockedResults.length} completed assessments from {resultSelectionDialog?.partnerName}. Select which result to view.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {resultSelectionDialog?.unlockedResults.map((result) => (
              <Button
                key={result.id}
                variant="outline"
                className="w-full justify-between h-auto py-3"
                data-testid={`button-select-result-${result.assessmentType}`}
                onClick={() => {
                  const seriesId = resultSelectionDialog?.seriesId;
                  if (seriesId) {
                    // Navigate directly to avoid dialog persistence issues
                    window.location.href = `/my-results?partnerInvitationId=${seriesId}&assessmentType=${result.assessmentType}`;
                  }
                }}
              >
                <span className="flex items-center gap-2">
                  {result.assessmentType === 'fit' && <Brain className="h-4 w-4 text-blue-500" />}
                  {result.assessmentType === 'ai_readiness' && <Sparkles className="h-4 w-4 text-purple-500" />}
                  {result.assessmentType === 'prompt_architecture' && <Code className="h-4 w-4 text-green-500" />}
                  {result.assessmentType === 'aiq' && <Scale className="h-4 w-4 text-cyan-500" />}
                  {formatAssessmentName(result.assessmentType)}
                </span>
                {result.totalScore !== null && (
                  <Badge variant="secondary">{result.totalScore}%</Badge>
                )}
              </Button>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button 
              variant="default" 
              data-testid="button-view-all-results"
              onClick={() => {
                const seriesId = resultSelectionDialog?.seriesId;
                if (seriesId) {
                  // Navigate directly to avoid dialog persistence issues
                  window.location.href = `/my-results?partnerInvitationId=${seriesId}`;
                }
              }}
            >
              View All Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Locked Results Payment Dialog */}
      <Dialog open={!!lockedResultsDialog} onOpenChange={(open) => {
        if (!open) {
          setLockedResultsDialog(null);
          setPurchaseMode('bulk');
          setSelectedAssessments(new Set());
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" />
              Unlock Results
            </DialogTitle>
            <DialogDescription className="pt-2">
              Your assessment results from <span className="font-medium">{lockedResultsDialog?.partnerName}</span> are currently locked.
            </DialogDescription>
          </DialogHeader>
          
          {pricingLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pricingData ? (
            <div className="space-y-4">
              {/* Purchase Mode Selection */}
              <RadioGroup 
                value={purchaseMode} 
                onValueChange={(v) => {
                  setPurchaseMode(v as 'bulk' | 'individual');
                  setSelectedAssessments(new Set());
                }}
                className="space-y-3"
              >
                {/* Bulk Purchase Option */}
                {pricingData.hasBulkDiscount && (() => {
                  const allTotal = pricingData.assessments.reduce((sum, a) => sum + parseFloat(a.priceDisplay.replace(/[^\d.]/g, '')), 0);
                  const allOriginalDisplay = `${pricingData.currencySymbol}${Math.round(allTotal).toLocaleString()}`;
                  const allDiscountedDisplay = `${pricingData.currencySymbol}${Math.round(allTotal * 0.75).toLocaleString()}`;
                  return (
                  <div 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${purchaseMode === 'bulk' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setPurchaseMode('bulk')}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="bulk" id="bulk" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="bulk" className="cursor-pointer font-medium flex items-center gap-2">
                          Unlock All ({pricingData.assessments.length} assessments)
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            25% off
                          </Badge>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Best value - unlock all your results at once
                        </p>
                        <p className="text-lg font-semibold mt-2">
                          {allDiscountedDisplay}
                          <span className="text-sm text-muted-foreground line-through ml-2">
                            {allOriginalDisplay}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  );
                })()}
                
                {/* Individual Purchase Option */}
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${purchaseMode === 'individual' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setPurchaseMode('individual')}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="individual" id="individual" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="individual" className="cursor-pointer font-medium flex items-center gap-2">
                        {pricingData.hasBulkDiscount ? 'Select Individual Assessments' : 'Unlock Assessment'}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pricingData.hasBulkDiscount ? 'Select specific assessments to unlock' : 'Unlock your assessment result'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Individual Assessment Checkboxes */}
                  {purchaseMode === 'individual' && (
                    <div className="mt-4 space-y-2 pl-6">
                      {pricingData.assessments.map((assessment) => (
                        <div 
                          key={assessment.type}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={assessment.type}
                              checked={selectedAssessments.has(assessment.type)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedAssessments);
                                if (checked) {
                                  newSelected.add(assessment.type);
                                } else {
                                  newSelected.delete(assessment.type);
                                }
                                setSelectedAssessments(newSelected);
                              }}
                              data-testid={`checkbox-assessment-${assessment.type}`}
                            />
                            <Label htmlFor={assessment.type} className="cursor-pointer">
                              {formatAssessmentName(assessment.type)}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {assessment.priceDisplay}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {/* Individual Total - bulk discount only when ALL tests selected and more than one */}
                      {selectedAssessments.size > 0 && (() => {
                        const selected = pricingData.assessments.filter(a => selectedAssessments.has(a.type));
                        // Bulk discount only applies when ALL assessments are selected AND more than 1
                        const isAllSelected = selected.length === pricingData.assessments.length;
                        const isBulkEligible = isAllSelected && selected.length > 1;
                        
                        const selectedTotal = selected.reduce((sum, a) => sum + parseFloat(a.priceDisplay.replace(/[^\d.]/g, '')), 0);
                        const selectedOriginalDisplay = `${pricingData.currencySymbol}${Math.round(selectedTotal).toLocaleString()}`;
                        const discountedTotal = isBulkEligible ? Math.round(selectedTotal * 0.75) : selectedTotal;
                        const selectedDiscountedDisplay = `${pricingData.currencySymbol}${Math.round(discountedTotal).toLocaleString()}`;
                        
                        return (
                          <div className="pt-3 mt-2 border-t">
                            <div className="flex justify-between items-center font-medium">
                              <span className="flex items-center gap-2">
                                Total ({selectedAssessments.size} selected)
                                {isBulkEligible && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                    25% off applied
                                  </Badge>
                                )}
                              </span>
                              <div className="text-right">
                                {isBulkEligible ? (
                                  <>
                                    <span className="text-lg">{selectedDiscountedDisplay}</span>
                                    <span className="text-sm text-muted-foreground line-through ml-2">
                                      {selectedOriginalDisplay}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-lg">{selectedOriginalDisplay}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {isBulkEligible && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Bulk discount applied for purchasing all assessments
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </RadioGroup>
              
              {/* Auto-unlock info */}
              {lockedResultsDialog?.autoUnlockDate && (
                <div className="text-sm bg-muted p-3 rounded-md">
                  <Clock className="h-4 w-4 inline mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Or wait - auto-unlocks </span>
                  <span className="font-medium">{format(new Date(lockedResultsDialog.autoUnlockDate), 'MMMM d, yyyy')}</span>
                </div>
              )}
            </div>
          ) : null}
          
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => {
                if (lockedResultsDialog) {
                  // Use bulk pricing if explicitly bulk OR if multiple assessments selected
                  const useBulkPricing = purchaseMode === 'bulk' || selectedAssessments.size > 1;
                  
                  if (purchaseMode === 'bulk') {
                    partnerResultsPurchaseMutation.mutate({
                      partnerInvitationId: lockedResultsDialog.seriesId,
                      isBulkPurchase: true,
                      lockedExchangeRate: pricingData?.lockedExchangeRate,
                    });
                  } else {
                    partnerResultsPurchaseMutation.mutate({
                      partnerInvitationId: lockedResultsDialog.seriesId,
                      isBulkPurchase: useBulkPricing,
                      assessmentTypes: Array.from(selectedAssessments),
                      lockedExchangeRate: pricingData?.lockedExchangeRate,
                    });
                  }
                }
              }}
              disabled={partnerResultsPurchaseMutation.isPending || pricingLoading || (purchaseMode === 'individual' && selectedAssessments.size === 0)}
              data-testid="button-unlock-now"
            >
              {partnerResultsPurchaseMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {purchaseMode === 'bulk' 
                    ? (() => {
                        const allTotal = pricingData?.assessments.reduce((sum, a) => sum + parseFloat(a.priceDisplay.replace(/[^\d.]/g, '')), 0) || 0;
                        return `Unlock All - ${pricingData?.currencySymbol || ''}${Math.round(allTotal * 0.75).toLocaleString()}`;
                      })()
                    : (() => {
                        const selected = pricingData?.assessments.filter(a => selectedAssessments.has(a.type)) || [];
                        const totalAssessments = pricingData?.assessments.length || 0;
                        const isAllSelected = selected.length === totalAssessments;
                        const isBulkEligible = isAllSelected && selected.length > 1;
                        const selectedTotal = selected.reduce((sum, a) => sum + parseFloat(a.priceDisplay.replace(/[^\d.]/g, '')), 0);
                        const finalPrice = isBulkEligible ? Math.round(selectedTotal * 0.75) : Math.round(selectedTotal);
                        const priceDisplay = `${pricingData?.currencySymbol || ''}${finalPrice.toLocaleString()}`;
                        
                        if (selectedAssessments.size === 0) return 'Select Assessments';
                        if (selectedAssessments.size === 1) {
                          const selectedType = Array.from(selectedAssessments)[0];
                          const selectedAssessment = pricingData?.assessments.find(a => a.type === selectedType);
                          return `Unlock ${formatAssessmentTypeDisplay(selectedType)} - ${selectedAssessment?.priceDisplay || ''}`;
                        }
                        return `Unlock Selected (${selectedAssessments.size}) - ${priceDisplay}`;
                      })()
                  }
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setLockedResultsDialog(null);
                setPurchaseMode('bulk');
                setSelectedAssessments(new Set());
              }}
              data-testid="button-wait-autounlock"
            >
              Wait for Auto-Unlock
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
