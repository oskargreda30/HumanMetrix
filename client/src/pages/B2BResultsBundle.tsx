import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Clock, Lock, CreditCard, Package } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface BundleResultsData {
  email: string;
  partnerId: number;
  partnerName: string;
  countryCode: string;
  currencyCode: string;
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

function formatAssessmentName(type: string): string {
  const mapping: Record<string, string> = {
    'fit': 'FIT Assessment',
    'ai_readiness': 'AI Readiness Assessment',
    'prompt_architecture': 'Prompt Architecture Assessment',
    'aiq': 'AIQ Assessment',
  };
  return mapping[type.toLowerCase()] || type;
}

export default function B2BResultsBundle() {
  const [isCheckingOut, setIsCheckingOut] = useState(false);

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
    
    setIsCheckingOut(true);
    
    try {
      const result = await apiRequest<{ checkoutUrl: string }>('/api/b2b/results-bundle/checkout', {
        method: 'POST',
        body: JSON.stringify({ 
          email,
          partnerId,
          countryCode, 
          types,
        }),
      });
      
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      console.error('Checkout error:', err);
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
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="relative animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <span className="text-white font-bold text-lg">HM</span>
              </div>
            </div>
            <span className="text-xl font-semibold text-white">HumanMetrix</span>
          </div>
          <div className="h-8 w-8 mx-auto border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Unlock All Your Results</h1>
          <p className="text-muted-foreground">
            Get instant access to all your assessment results with our bundle discount
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Completed Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.completedAssessments.map((assessment) => (
                <div
                  key={assessment.type}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  data-testid={`assessment-item-${assessment.type}`}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <span className="font-medium">{assessment.displayName}</span>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(assessment.completedAt), 'dd MMM yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground line-through">
                      {assessment.originalPriceDisplay}
                    </span>
                    <div className="font-semibold text-primary">
                      {assessment.discountedPriceDisplay}
                    </div>
                    <Badge variant="secondary" className="text-xs">25% off</Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="font-medium">Subtotal (Individual Prices)</span>
              <span className="font-semibold">{data.pricing.sumOfIndividualDisplay}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader>
            <CardTitle className="text-center">Bundle Offer</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-6">
              <p className="text-muted-foreground mb-4">
                Unlock all {data.completedAssessments.length} assessment results and save {data.pricing.bundleDiscountPercent}%
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-xl text-muted-foreground line-through">
                  {data.pricing.sumOfIndividualDisplay}
                </span>
                <span className="text-3xl font-bold text-primary">
                  {data.pricing.bundleDiscountedDisplay}
                </span>
                <Badge variant="default" className="bg-green-500">
                  SAVE {data.pricing.bundleDiscountPercent}%
                </Badge>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleCheckout}
              disabled={isCheckingOut}
              data-testid="button-checkout-bundle"
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Unlock All Results Now
                </>
              )}
            </Button>

            {data.freeAccessDate && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
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

        <p className="text-center text-sm text-muted-foreground mt-6">
          Assessment completed with {data.partnerName}
        </p>
      </div>
    </div>
  );
}
