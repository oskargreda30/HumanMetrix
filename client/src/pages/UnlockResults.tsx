import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle, Lock, CreditCard, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AssessmentPrice {
  type: string;
  priceDisplay: string;
  localPrice: number;
}

interface UnlockResultsData {
  email: string;
  inviteToken: string;
  partnerName: string;
  completedAssessments: Array<{
    sessionId: string;
    assessmentType: string;
    completedAt: string;
    paymentStatus: string;
  }>;
  assessments: AssessmentPrice[];
  pricing: {
    single: {
      originalPricePence: number;
      discountedPricePence: number;
      originalDisplay: string;
      discountedDisplay: string;
      discountPercent: number;
    };
    bundle: {
      originalPricePence: number;
      discountedPricePence: number;
      originalDisplay: string;
      discountedDisplay: string;
      discountPercent: number;
    };
  };
  hasBulkDiscount: boolean;
  bulkDiscountRate: number;
  freeAccessDate: string | null;
  allPaid: boolean;
  invitationId?: string;
  hasExistingAccount?: boolean;
}

const assessmentNames: Record<string, string> = {
  fit: "FIT",
  ai_readiness: "AI Readiness",
  aiq: "AIQ",
  prompt_architecture: "Prompt Architecture",
};

function formatAssessmentName(type: string): string {
  return assessmentNames[type.toLowerCase()] || type;
}

export default function UnlockResults() {
  const [, setLocation] = useLocation();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [unlockOption, setUnlockOption] = useState<'all' | 'individual'>('all');
  const [selectedUnlockTypes, setSelectedUnlockTypes] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");
  const inviteToken = params.get("invite");
  const countryCode = params.get("country") || "GB";

  const { data, isLoading, error } = useQuery<UnlockResultsData>({
    queryKey: ['/api/unlock-results', email, inviteToken, countryCode],
    queryFn: async () => {
      const res = await fetch(`/api/unlock-results?email=${encodeURIComponent(email || '')}&invite=${inviteToken || ''}&country=${countryCode}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to load results');
      }
      return res.json();
    },
    enabled: !!email && !!inviteToken,
  });

  const handleCheckout = async () => {
    if (!inviteToken || !email) return;

    const unpaidTypes = data?.assessments?.map(a => a.type) || [];
    const isSelectAll = unlockOption === 'all' || unpaidTypes.length <= 1;
    const selectedList = isSelectAll ? unpaidTypes : Array.from(selectedUnlockTypes);
    const isBundle = selectedList.length >= 2;

    if (selectedList.length === 0) {
      toast({
        title: "Please select assessments",
        description: "Choose which assessment results you'd like to unlock.",
        variant: "destructive",
      });
      return;
    }
    
    setIsCheckingOut(true);
    
    try {
      const res = await fetch(`/api/unlock-results/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          inviteToken,
          countryCode, 
          isBundle,
          selectedTypes: isSelectAll ? undefined : selectedList,
        }),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Failed to create checkout');
      }
      
      if (result.provider === 'airwallex' && result.intentId && result.clientSecret) {
        try {
          const { redirectToAirwallexCheckout } = await import('@/lib/airwallexCheckout');
          await redirectToAirwallexCheckout({
            intentId: result.intentId,
            clientSecret: result.clientSecret,
            currency: result.currency || 'GBP',
            countryCode: countryCode || 'GB',
            airwallexEnv: result.airwallexEnv,
            successUrl: `${window.location.origin}/b2b-payment-callback?success=true&provider=airwallex&intent_id=${result.intentId}`,
            failUrl: `${window.location.origin}/unlock-results?email=${encodeURIComponent(email || '')}&invite=${inviteToken || ''}`,
          });
          return;
        } catch (err: any) {
          console.error('Airwallex redirect failed:', err);
          toast({
            title: "Payment redirect failed",
            description: "Unable to open payment page. Please try again.",
            variant: "destructive",
          });
          setIsCheckingOut(false);
          return;
        }
      }
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast({
        title: "Checkout failed",
        description: err.message || "Unable to create checkout. Please try again.",
        variant: "destructive",
      });
      setIsCheckingOut(false);
    }
  };

  if (!email || !inviteToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">
              This unlock link is missing required information. Please use the link from your email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900" data-testid="unlock-results-loading">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 loader-pulse">
            <img src="/favicon.png" alt="HumanMetrix" className="w-full h-full object-contain" />
          </div>
          <p className="font-semibold text-lg">
            <span className="text-white">Human</span>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Metrix</span>
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Results</h2>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : 'Failed to load your assessment results. Please try again or contact support.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.allPaid) {
    const scrollParam = data.invitationId ? `&scrollToSeries=${data.invitationId}` : '';
    const dashboardUrl = `/dashboard?view=candidate${scrollParam}`;
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Results Already Unlocked</h2>
            <p className="text-muted-foreground mb-6">
              You've already unlocked access to your assessment results.
            </p>
            <Button onClick={() => setLocation(data.hasExistingAccount ? dashboardUrl : '/login')} data-testid="button-go-to-dashboard">
              {data.hasExistingAccount ? "View Results" : "Create Account"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              {data.hasExistingAccount 
                ? "You'll be taken to your test series"
                : "We'll create an account and send you login details"
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unpaidAssessments = data.assessments || [];
  const showOptions = unpaidAssessments.length > 1;

  const roundUp = (price: number): number => {
    if (price < 100) return Math.ceil(price);
    if (price < 1000) return Math.ceil(price / 10) * 10;
    if (price < 10000) return Math.ceil(price / 100) * 100;
    if (price < 100000) return Math.ceil(price / 1000) * 1000;
    if (price < 1000000) return Math.ceil(price / 10000) * 10000;
    return Math.ceil(price / 100000) * 100000;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-4 py-8 overflow-y-auto">
      <div className="max-w-md mx-auto pb-8">
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Lock className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-xl">Unlock Results</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Your assessment results from <span className="font-medium">{data.partnerName}</span> are currently locked.
            </p>
          </CardHeader>
          <CardContent>
            {/* Completed assessments list */}
            <div className="space-y-2 mb-6">
              <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Completed Assessments</h3>
              {data.completedAssessments.map((assessment) => (
                <div key={assessment.sessionId} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm font-medium">{formatAssessmentName(assessment.assessmentType)}</span>
                  </div>
                  {assessment.paymentStatus === 'paid' ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                      Unlocked
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Pricing options */}
            {!showOptions ? (
              /* Single assessment - simple unlock */
              <div className="border rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{formatAssessmentName(unpaidAssessments[0]?.type || '')}</span>
                  <span className="text-lg font-semibold">{data.pricing.single.discountedDisplay}</span>
                </div>
              </div>
            ) : (
              /* Multiple assessments - Unlock All vs Individual selection */
              <div className="space-y-3 mb-4">
                {/* Unlock All option */}
                <label
                  className={`border rounded-lg p-4 block cursor-pointer transition-colors ${unlockOption === 'all' ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => {
                    setUnlockOption('all');
                    setSelectedUnlockTypes(new Set(unpaidAssessments.map(a => a.type)));
                  }}
                  data-testid="radio-unlock-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${unlockOption === 'all' ? 'border-primary' : 'border-muted-foreground'}`}>
                      {unlockOption === 'all' && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">Unlock All ({unpaidAssessments.length} assessments)</span>
                        {data.hasBulkDiscount && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">{data.bulkDiscountRate}% off</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Best value - unlock your results at once</p>
                    </div>
                  </div>
                  <div className="mt-2 ml-7">
                    <span className="text-lg font-bold">{data.pricing.bundle.discountedDisplay}</span>
                    {data.hasBulkDiscount && (
                      <span className="text-sm text-muted-foreground line-through ml-2">{data.pricing.bundle.originalDisplay}</span>
                    )}
                  </div>
                </label>

                {/* Individual selection option */}
                <label
                  className={`border rounded-lg p-4 block cursor-pointer transition-colors ${unlockOption === 'individual' ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => {
                    setUnlockOption('individual');
                    setSelectedUnlockTypes(new Set());
                  }}
                  data-testid="radio-unlock-individual"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${unlockOption === 'individual' ? 'border-primary' : 'border-muted-foreground'}`}>
                      {unlockOption === 'individual' && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <span className="font-medium">Select Individual Assessments</span>
                      <p className="text-sm text-muted-foreground">Select specific assessments to unlock</p>
                    </div>
                  </div>

                  {unlockOption === 'individual' && (
                    <div className="mt-3 ml-7 space-y-1">
                      {unpaidAssessments.map((assessment) => (
                        <label
                          key={assessment.type}
                          className="flex items-center justify-between py-2 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedUnlockTypes.has(assessment.type)}
                              onCheckedChange={(checked) => {
                                const next = new Set(selectedUnlockTypes);
                                if (checked) {
                                  next.add(assessment.type);
                                } else {
                                  next.delete(assessment.type);
                                }
                                setSelectedUnlockTypes(next);
                              }}
                              data-testid={`checkbox-unlock-${assessment.type}`}
                            />
                            <span className="text-sm">{formatAssessmentName(assessment.type)}</span>
                          </div>
                          <span className="text-sm font-medium">{assessment.priceDisplay}</span>
                        </label>
                      ))}
                      {selectedUnlockTypes.size >= 2 && data.hasBulkDiscount && (() => {
                        const selectedAssessments = unpaidAssessments.filter(a => selectedUnlockTypes.has(a.type));
                        const selectedTotal = selectedAssessments.reduce((sum, a) => sum + (a.localPrice || 0), 0);
                        const allSelected = selectedUnlockTypes.size === unpaidAssessments.length;
                        const discountedDisplay = allSelected 
                          ? data.pricing.bundle.discountedDisplay
                          : null;
                        const discountedTotal = roundUp(selectedTotal * 0.75);
                        const currencySymbol = data.pricing.bundle.discountedDisplay?.replace(/[\d,.\s]/g, '') || '';
                        return (
                          <div className="mt-2 pt-2 border-t border-dashed" data-testid="individual-bundle-discount">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">25% off</Badge>
                                <span className="text-sm text-muted-foreground">{selectedUnlockTypes.size} assessments</span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold">{discountedDisplay || `${currencySymbol}${discountedTotal.toLocaleString()}`}</span>
                                <span className="text-xs text-muted-foreground line-through ml-1.5">{currencySymbol}{selectedTotal.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </label>
              </div>
            )}

            {/* Checkout button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={isCheckingOut || (unlockOption === 'individual' && selectedUnlockTypes.size === 0)}
              data-testid="button-unlock-now"
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {!showOptions
                    ? `Unlock Results - ${data.pricing.single.discountedDisplay}`
                    : unlockOption === 'all'
                      ? `Unlock All - ${data.pricing.bundle.discountedDisplay}`
                      : selectedUnlockTypes.size > 0
                        ? `Unlock Selected (${selectedUnlockTypes.size})`
                        : 'Select Assessments'
                  }
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground mt-6">
          <p>Need help? Contact us at hello@humanmetrix.co.uk</p>
        </div>
      </div>
    </div>
  );
}
