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
import { Loader2, CheckCircle2, Clock, FileText, Brain, Sparkles, Code, Scale, Timer, Key, X, Eye, EyeOff, Plus, Lock, Unlock, CreditCard } from "lucide-react";
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
      description: 'Assess behavioral and workplace skills',
      questions: 15,
      minutes: 20,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'ai_readiness': {
      icon: Sparkles,
      description: 'Evaluate AI integration readiness',
      questions: 21,
      minutes: 20,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'ai-readiness': {
      icon: Sparkles,
      description: 'Evaluate AI integration readiness',
      questions: 21,
      minutes: 20,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'prompt_architecture': {
      icon: Code,
      description: 'Test AI prompt engineering skills',
      questions: 7,
      minutes: 14,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'prompt-architecture': {
      icon: Code,
      description: 'Test AI prompt engineering skills',
      questions: 7,
      minutes: 14,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'prompt': {
      icon: Code,
      description: 'Test AI prompt engineering skills',
      questions: 7,
      minutes: 14,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'aiq': {
      icon: Scale,
      description: 'Assess ethical AI decision-making',
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
  
  // Redirect based on role
  if (!authLoading && user) {
    // Super admins always go to admin dashboard (Platform Admin Hub)
    if (user.role === 'super_admin') {
      return <Redirect to="/admin/dashboard" />;
    }
    
    // Partner admins go directly to Partner Dashboard
    if (user.role === 'partner_admin') {
      return <Redirect to="/partner" />;
    }
    
    // Organization admins go to Admin Dashboard
    if (user.role === 'organization_admin') {
      return <Redirect to="/admin/dashboard" />;
    }
  }
  
  // Change password state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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
    }) => {
      const res = await apiRequest("POST", "/api/create-partner-results-checkout", { 
        partnerInvitationId: params.partnerInvitationId,
        countryCode: 'GB', // Default, could be detected from user location
        isBulkPurchase: params.isBulkPurchase,
        assessmentTypes: params.assessmentTypes,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
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

  // Handle partner results purchase success
  useEffect(() => {
    const confirmPartnerPurchase = async () => {
      const params = new URLSearchParams(window.location.search);
      const partnerPurchase = params.get("partner_purchase");
      const sessionId = params.get("session_id");

      if (partnerPurchase === "success" && sessionId) {
        try {
          const res = await apiRequest("POST", "/api/confirm-partner-results-purchase", { sessionId });
          if (res.ok) {
            toast({
              title: "Results Unlocked!",
              description: "You now have full access to your assessment results.",
            });
            refetchPartnerSeries();
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
      }
    };

    confirmPartnerPurchase();
  }, [toast, refetchPartnerSeries]);

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
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-white">My Dashboard</h1>
              <p className="text-white/80">
                Welcome back, {user?.firstName || 'there'}!
              </p>
            </div>
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 text-white border-white/50 hover:bg-white/10" data-testid="button-change-password">
                  <Key className="h-4 w-4" />
                  Change Password
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
          </div>

          {/* Available Assessments */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-white">Available Assessments</h2>
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
                <h2 className="text-2xl font-semibold mb-4 text-white/70">Add to Testing Suite</h2>
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

          {/* Completed Testing Series (Batches) */}
          {purchasesWithCompletedResults.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-white">Your Results</h2>
              <div className="space-y-6">
                {purchasesWithCompletedResults.map((purchase: any, index: number) => {
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
                                  Testing Series #{purchasesWithCompletedResults.length - index}
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

          {/* Partner Testing Series (from partner invitations) */}
          {(partnerTestingSeries || []).length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-white">Partner Testing Series</h2>
              <p className="text-white/70 text-sm mb-4">
                Assessments completed via partner invitations
              </p>
              <div className="space-y-6">
                {(partnerTestingSeries || []).map((series: any, index: number) => {
                  const progressPercentage = Math.round((series.completedCount / series.totalCount) * 100);
                  const isAllComplete = series.allComplete;
                  
                  return (
                    <Card key={series.id} className="p-6 hover-elevate transition-all">
                      <div className="flex flex-col md:flex-row items-start gap-6">
                        {/* Progress Circle */}
                        <div className="flex-shrink-0">
                          <div 
                            className="relative w-20 h-20" 
                            role="img" 
                            aria-label={`${series.completedCount} of ${series.totalCount} assessments completed, ${progressPercentage}% complete`}
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
                                className={isAllComplete ? "text-cyan-500" : "text-blue-500"}
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
                            {isAllComplete ? (
                              <CheckCircle2 className="h-5 w-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <Clock className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-semibold">
                                  Partner Series #{(partnerTestingSeries || []).length - index}
                                </h3>
                                <Badge className="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20">
                                  {series.partnerName}
                                </Badge>
                                {isAllComplete && (
                                  <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                    All Complete
                                  </Badge>
                                )}
                                {/* Unlock status badge */}
                                {isAllComplete && (
                                  series.resultsUnlocked ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 gap-1">
                                      <Unlock className="h-3 w-3" />
                                      {series.isPurchased ? 'Purchased' : 'Auto-Unlocked'}
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 gap-1">
                                      <Lock className="h-3 w-3" />
                                      Scores Locked
                                    </Badge>
                                  )
                                )}
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">
                            <span className="font-medium">{series.completedCount} of {series.totalCount}</span> assessments completed
                            {series.completedAt && (
                              <span className="ml-2">• {format(new Date(series.completedAt), 'MMM d, yyyy')}</span>
                            )}
                            {/* Auto-unlock countdown */}
                            {isAllComplete && !series.resultsUnlocked && series.autoUnlockDate && (
                              <span className="ml-2 text-amber-600 dark:text-amber-400">
                                • Auto-unlocks {format(new Date(series.autoUnlockDate), 'MMM d, yyyy')}
                              </span>
                            )}
                          </p>

                          {/* Completed Assessments */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {(series.results || [])
                              .filter((r: any) => r.status === 'completed')
                              .map((result: any) => {
                                const metadata = getAssessmentMetadata(result.assessmentType);
                                const ResultIcon = metadata.icon;
                                // Use per-result unlock status (supports partial purchases)
                                const isUnlocked = result.isUnlocked || series.resultsUnlocked;
                                return (
                                  <Badge key={result.id} variant="outline" className="gap-1.5 py-1">
                                    <ResultIcon className="h-3 w-3" />
                                    {formatAssessmentName(result.assessmentType)}
                                    {isUnlocked && result.totalScore ? (
                                      <span className="text-cyan-600 dark:text-cyan-400 ml-1">
                                        {result.totalScore}%
                                      </span>
                                    ) : result.status === 'completed' && !isUnlocked ? (
                                      <Lock className="h-3 w-3 text-amber-500 ml-1" />
                                    ) : null}
                                  </Badge>
                                );
                              })}
                          </div>
                        </div>

                        {/* Action */}
                        <div className="flex flex-col gap-2 md:w-48">
                          {isAllComplete && (
                            (() => {
                              // Check if there are any locked results (for partial purchase support)
                              const lockedResults = (series.results || [])
                                .filter((r: any) => r.status === 'completed' && !r.isUnlocked && !series.resultsUnlocked);
                              const hasLockedResults = lockedResults.length > 0;
                              
                              return (
                                <>
                                  <p className="text-sm text-muted-foreground font-medium text-center">
                                    Results shared with {series.partnerName}
                                  </p>
                                  {/* Unlock Results button - shown when any results are locked */}
                                  {hasLockedResults && (
                                    <Button
                                      onClick={() => {
                                        setLockedResultsDialog({
                                          seriesId: series.id,
                                          partnerName: series.partnerName,
                                          autoUnlockDate: series.autoUnlockDate,
                                          completedResults: lockedResults,
                                        });
                                      }}
                                      className="mt-2"
                                      variant="outline"
                                      data-testid={`button-results-${series.id}`}
                                    >
                                      <Lock className="mr-2 h-4 w-4" />
                                      Unlock Results
                                    </Button>
                                  )}
                                </>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
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
                {pricingData.hasBulkDiscount && (
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
                            50% off
                          </Badge>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Best value - unlock all your results at once
                        </p>
                        <p className="text-lg font-semibold mt-2">
                          {pricingData.bulkTotal.priceDisplay}
                          <span className="text-sm text-muted-foreground line-through ml-2">
                            {pricingData.bulkTotal.originalPriceDisplay}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Individual Purchase Option */}
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${purchaseMode === 'individual' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setPurchaseMode('individual')}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="individual" id="individual" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="individual" className="cursor-pointer font-medium flex items-center gap-2">
                        {pricingData.hasBulkDiscount ? 'Choose Individual Assessments' : 'Unlock Assessment'}
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          25% off
                        </Badge>
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
                            <span className="text-xs text-muted-foreground line-through">
                              {assessment.originalPriceDisplay}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {/* Individual Total - apply bulk discount if 2+ selected */}
                      {selectedAssessments.size > 0 && (() => {
                        const selected = pricingData.assessments.filter(a => selectedAssessments.has(a.type));
                        const isBulkEligible = selected.length > 1;
                        
                        return (
                          <div className="pt-3 mt-2 border-t">
                            <div className="flex justify-between items-center font-medium">
                              <span className="flex items-center gap-2">
                                Total ({selectedAssessments.size} selected)
                                {isBulkEligible && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                    50% off applied
                                  </Badge>
                                )}
                              </span>
                              <div className="text-right">
                                {isBulkEligible ? (
                                  <>
                                    <span className="text-lg">{pricingData.bulkTotal.priceDisplay}</span>
                                    <span className="text-sm text-muted-foreground line-through ml-2">
                                      {pricingData.bulkTotal.originalPriceDisplay}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span>{selected.map(a => a.priceDisplay).join(' + ')}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {isBulkEligible && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Bulk discount automatically applied for multiple assessments
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
                    });
                  } else {
                    partnerResultsPurchaseMutation.mutate({
                      partnerInvitationId: lockedResultsDialog.seriesId,
                      isBulkPurchase: useBulkPricing,
                      assessmentTypes: Array.from(selectedAssessments),
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
                    ? `Unlock All - ${pricingData?.bulkTotal.priceDisplay || ''}`
                    : selectedAssessments.size > 1
                      ? `Unlock Selected (${selectedAssessments.size}) - ${pricingData?.bulkTotal.priceDisplay || ''}`
                      : selectedAssessments.size === 1 
                        ? `Unlock Selected (1)`
                        : 'Select Assessments'
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
