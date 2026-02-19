import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle, Clock, Lock, CreditCard, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface BundleResultsData {
  email: string;
  partnerId: number;
  partnerName: string;
  countryCode: string;
  currencyCode: string;
  alreadyUnlocked?: boolean;
  hasExistingAccount?: boolean;
  invitationId?: string;
  completedAssessments: Array<{
    type: string;
    displayName: string;
    completedAt: string;
    originalPrice: number;
    discountedPrice: number;
    originalPriceDisplay: string;
    discountedPriceDisplay: string;
  }>;
  pricing: {
    sumOfIndividualDiscounted: number;
    bundleDiscountedPrice: number;
    sumOfIndividualDisplay: string;
    bundleDiscountedDisplay: string;
    bundleDiscountPercent: number;
  };
  freeAccessDate: string | null;
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

export default function B2BResultsBundle() {
  const [, setLocation] = useLocation();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [unlockOption, setUnlockOption] = useState<'all' | 'individual'>('all');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");
  const partnerId = params.get("partner");
  const countryCode = params.get("country") || "GB";
  const types = params.get("types")?.split(",") || [];

  const { data, isLoading, error } = useQuery<BundleResultsData>({
    queryKey: ['/api/b2b/results-bundle', email, partnerId, countryCode, types.join(',')],
    queryFn: async () => {
      const res = await fetch(`/api/b2b/results-bundle?email=${encodeURIComponent(email || '')}&partner=${partnerId}&country=${countryCode}&types=${types.join(',')}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to load bundle data');
      }
      return res.json();
    },
    enabled: !!email && !!partnerId,
  });

  const handleCheckout = async () => {
    if (!email || !partnerId) return;

    const allTypes = data?.completedAssessments?.map(a => a.type) || [];
    const isSelectAll = unlockOption === 'all' || allTypes.length <= 1;
    const selectedList = isSelectAll ? allTypes : Array.from(selectedTypes);

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
      const res = await fetch('/api/b2b/results-bundle/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          partnerId,
          countryCode, 
          types: selectedList,
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
            successUrl: `${window.location.origin}/b2b-payment-callback?provider=airwallex&bundle=true&email=${encodeURIComponent(email || '')}&partner=${partnerId || ''}&intent_id=${result.intentId}`,
            failUrl: `${window.location.origin}/b2b-results-bundle?email=${encodeURIComponent(email || '')}&partner=${partnerId || ''}&country=${countryCode || 'GB'}`,
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

  if (!email || !partnerId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">
              This link is missing required information. Please use the link from your email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Lock className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Results</h2>
            <p className="text-muted-foreground">
              {error?.message || 'Please try again or contact support.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.alreadyUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold">Results Already Unlocked</h2>
            <p className="text-muted-foreground">
              All your assessment results{data.partnerName ? ` with ${data.partnerName}` : ''} have already been unlocked. You can view them from your dashboard.
            </p>
            <div className="pt-2">
              <Button 
                onClick={() => setLocation(data.hasExistingAccount ? (data.invitationId ? `/dashboard?view=candidate&scrollToSeries=${data.invitationId}` : '/dashboard?view=candidate') : '/login')}
                data-testid="button-go-to-dashboard"
              >
                {data.hasExistingAccount ? 'Go to Dashboard' : 'Sign In to View Results'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assessments = data.completedAssessments || [];
  const showOptions = assessments.length > 1;
  const hasBundleDiscount = data.pricing.bundleDiscountPercent > 0 && assessments.length >= 2;

  const roundUp = (price: number): number => {
    if (price < 100) return Math.ceil(price);
    if (price < 1000) return Math.ceil(price / 10) * 10;
    if (price < 10000) return Math.ceil(price / 100) * 100;
    if (price < 100000) return Math.ceil(price / 1000) * 1000;
    if (price < 1000000) return Math.ceil(price / 10000) * 10000;
    return Math.ceil(price / 100000) * 100000;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-4 py-8 overflow-y-auto" data-testid="bundle-results-content">
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
            <div className="space-y-2 mb-6">
              <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Completed Assessments</h3>
              {assessments.map((assessment) => (
                <div key={assessment.type} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg" data-testid={`assessment-item-${assessment.type}`}>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm font-medium">{formatAssessmentName(assessment.type)}</span>
                  </div>
                  <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                </div>
              ))}
            </div>

            {!showOptions ? (
              <div className="border rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{formatAssessmentName(assessments[0]?.type || '')}</span>
                  <span className="text-lg font-semibold">{assessments[0]?.discountedPriceDisplay}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                <label
                  className={`border rounded-lg p-4 block cursor-pointer transition-colors ${unlockOption === 'all' ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => {
                    setUnlockOption('all');
                    setSelectedTypes(new Set(assessments.map(a => a.type)));
                  }}
                  data-testid="radio-unlock-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${unlockOption === 'all' ? 'border-primary' : 'border-muted-foreground'}`}>
                      {unlockOption === 'all' && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">Unlock All ({assessments.length} assessments)</span>
                        {hasBundleDiscount && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">{data.pricing.bundleDiscountPercent}% off</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Best value - unlock your results at once</p>
                    </div>
                  </div>
                  <div className="mt-2 ml-7">
                    <span className="text-lg font-bold">{data.pricing.bundleDiscountedDisplay}</span>
                    {hasBundleDiscount && (
                      <span className="text-sm text-muted-foreground line-through ml-2">{data.pricing.sumOfIndividualDisplay}</span>
                    )}
                  </div>
                </label>

                <label
                  className={`border rounded-lg p-4 block cursor-pointer transition-colors ${unlockOption === 'individual' ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => {
                    setUnlockOption('individual');
                    setSelectedTypes(new Set());
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
                      {assessments.map((assessment) => (
                        <label
                          key={assessment.type}
                          className="flex items-center justify-between py-2 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedTypes.has(assessment.type)}
                              onCheckedChange={(checked) => {
                                const next = new Set(selectedTypes);
                                if (checked) {
                                  next.add(assessment.type);
                                } else {
                                  next.delete(assessment.type);
                                }
                                setSelectedTypes(next);
                              }}
                              data-testid={`checkbox-unlock-${assessment.type}`}
                            />
                            <span className="text-sm">{formatAssessmentName(assessment.type)}</span>
                          </div>
                          <span className="text-sm font-medium">{assessment.discountedPriceDisplay}</span>
                        </label>
                      ))}
                      {selectedTypes.size >= 2 && hasBundleDiscount && (() => {
                        const selectedAssessments = assessments.filter(a => selectedTypes.has(a.type));
                        const selectedTotal = selectedAssessments.reduce((sum, a) => sum + (a.discountedPrice || 0), 0);
                        const allSelected = selectedTypes.size === assessments.length;
                        const discountedDisplay = allSelected 
                          ? data.pricing.bundleDiscountedDisplay
                          : null;
                        const discountedTotal = roundUp(selectedTotal * 0.75);
                        const currencySymbol = data.pricing.bundleDiscountedDisplay?.replace(/[\d,.\s]/g, '') || '';
                        return (
                          <div className="mt-2 pt-2 border-t border-dashed" data-testid="individual-bundle-discount">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">25% off</Badge>
                                <span className="text-sm text-muted-foreground">{selectedTypes.size} assessments</span>
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

            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={isCheckingOut || (unlockOption === 'individual' && selectedTypes.size === 0)}
              data-testid="button-checkout-bundle"
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
                    ? `Unlock Results - ${assessments[0]?.discountedPriceDisplay || ''}`
                    : unlockOption === 'all'
                      ? `Unlock All - ${data.pricing.bundleDiscountedDisplay}`
                      : selectedTypes.size > 0
                        ? `Unlock Selected (${selectedTypes.size})`
                        : 'Select Assessments'
                  }
                </>
              )}
            </Button>

            {data.freeAccessDate && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    Free access on {format(new Date(data.freeAccessDate), 'dd MMMM yyyy')}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground mt-6">
          <p>Assessment completed with {data.partnerName}</p>
        </div>
        
        <div data-testid="pdf-ready" style={{ display: 'none' }} />
      </div>
    </div>
  );
}
