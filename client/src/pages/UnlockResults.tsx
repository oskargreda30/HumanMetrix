import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Clock, Lock, CreditCard, ArrowRight } from "lucide-react";
import { format } from "date-fns";

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
  freeAccessDate: string | null;
  allPaid: boolean;
}

const assessmentNames: Record<string, string> = {
  fit: "FIT Assessment",
  ai_readiness: "AI Readiness Assessment",
  aiq: "AIQ Assessment",
  prompt_architecture: "Prompt Architecture Assessment",
};

export default function UnlockResults() {
  const [, setLocation] = useLocation();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutType, setCheckoutType] = useState<'single' | 'bundle' | null>(null);

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

  const handleCheckout = async (isBundle: boolean) => {
    if (!inviteToken) return;
    
    setIsCheckingOut(true);
    setCheckoutType(isBundle ? 'bundle' : 'single');
    
    try {
      const res = await fetch(`/api/unlock-results/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          inviteToken,
          countryCode, 
          isBundle 
        }),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Failed to create checkout');
      }
      
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setIsCheckingOut(false);
      setCheckoutType(null);
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
          <div className="w-20 h-20 mx-auto mb-4 animate-pulse">
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
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Results Already Unlocked</h2>
            <p className="text-muted-foreground mb-6">
              You've already unlocked access to your assessment results.
            </p>
            <Button onClick={() => setLocation('/login')} data-testid="button-go-to-login">
              Sign In to View Results
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unpaidCount = data.completedAssessments.filter(a => a.paymentStatus !== 'paid').length;
  const showBundle = unpaidCount > 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Unlock Your Assessment Results</CardTitle>
            <p className="text-muted-foreground mt-2">
              Completed with <span className="font-medium">{data.partnerName}</span>
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Completed Assessments</h3>
              {data.completedAssessments.map((assessment) => (
                <div key={assessment.sessionId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium">{assessmentNames[assessment.assessmentType] || assessment.assessmentType}</span>
                  </div>
                  {assessment.paymentStatus === 'paid' ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Unlocked
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Single assessment option - always shown */}
            <Card className="border mb-4">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Unlock Single Assessment</h3>
                    <p className="text-sm text-muted-foreground">
                      Unlock one assessment result
                    </p>
                  </div>
                  <div className="text-right">
                    {data.pricing.single.discountPercent > 0 && (
                      <div className="text-sm text-muted-foreground line-through">
                        {data.pricing.single.originalDisplay}
                      </div>
                    )}
                    <div className="text-2xl font-bold">
                      {data.pricing.single.discountedDisplay}
                    </div>
                    {data.pricing.single.discountPercent > 0 && (
                      <Badge variant="secondary">
                        {data.pricing.single.discountPercent}% OFF
                      </Badge>
                    )}
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
                  variant="outline"
                  onClick={() => handleCheckout(false)}
                  disabled={isCheckingOut}
                  data-testid="button-checkout-single"
                >
                  {isCheckingOut && checkoutType === 'single' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Unlock Single Result
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Bundle option - shown when there are multiple unpaid assessments */}
            {showBundle && (
              <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-cyan-200 dark:border-cyan-800 mb-4">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-green-500 text-white">Best Value</Badge>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Bundle All {unpaidCount} Assessments</h3>
                      <p className="text-sm text-muted-foreground">
                        Save more by unlocking all results together
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground line-through">
                        {data.pricing.bundle.originalDisplay}
                      </div>
                      <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                        {data.pricing.bundle.discountedDisplay}
                      </div>
                      <Badge className="bg-cyan-500 text-white">
                        {data.pricing.bundle.discountPercent}% OFF
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => handleCheckout(true)}
                    disabled={isCheckingOut}
                    data-testid="button-checkout-bundle"
                  >
                    {isCheckingOut && checkoutType === 'bundle' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Unlock All Results
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {data.freeAccessDate && (
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Free Access</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your results will be available for free on{' '}
                  <span className="font-medium">{format(new Date(data.freeAccessDate), 'd MMMM yyyy')}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Need help? Contact us at support@humanmetrix.com</p>
        </div>
      </div>
    </div>
  );
}
