import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Clock, Lock, CreditCard } from "lucide-react";
import { format } from "date-fns";

interface B2BResultsData {
  sessionId: string;
  assessmentType: string;
  email: string;
  partnerName: string;
  completedAt: string;
  countryCode: string;
  currencyCode: string;
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
}

export default function B2BResults() {
  const [, setLocation] = useLocation();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutType, setCheckoutType] = useState<'single' | 'bundle' | null>(null);

  // Support both URL path parameter and query parameter for session ID
  const [, routeParams] = useRoute("/b2b-results/:sessionId");
  const params = new URLSearchParams(window.location.search);
  const sessionId = routeParams?.sessionId || params.get("session");
  const countryCode = params.get("country") || "GB";

  const { data, isLoading, error } = useQuery<B2BResultsData>({
    queryKey: ['/api/b2b/results', sessionId, countryCode],
    queryFn: async () => {
      const res = await fetch(`/api/b2b/results/${sessionId}?country=${countryCode}`);
      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.resultsUrl) {
          setLocation(errorData.resultsUrl);
        }
        throw new Error(errorData.error || 'Failed to load session');
      }
      return res.json();
    },
    enabled: !!sessionId,
  });

  const handleCheckout = async (isBundle: boolean) => {
    if (!sessionId) return;
    
    setIsCheckingOut(true);
    setCheckoutType(isBundle ? 'bundle' : 'single');
    
    try {
      const res = await fetch(`/api/b2b/results/${sessionId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
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

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-xl font-semibold mb-2">Invalid Link</h1>
            <p className="text-muted-foreground">
              This link appears to be invalid or expired. Please check your email for the correct link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your results options...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Lock className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-semibold mb-2">Unable to Load</h1>
            <p className="text-muted-foreground">
              {(error as Error).message || 'Failed to load session information.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const freeAccessDate = data.freeAccessDate ? new Date(data.freeAccessDate) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4 bg-green-500/10 text-green-600 border-green-200">
            <CheckCircle className="w-4 h-4 mr-1" />
            Assessment Complete
          </Badge>
          <h1 className="text-3xl font-bold mb-2">Access Your Results</h1>
          <p className="text-muted-foreground">
            Congratulations on completing your <strong>{data.assessmentType.toUpperCase()}</strong> assessment!
          </p>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Unlock Results Now
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Immediate Access</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                  {data.pricing.single.discountPercent}% OFF
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Get your detailed {data.assessmentType.toUpperCase()} assessment results instantly.
              </p>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lg line-through text-muted-foreground">
                  {data.pricing.single.originalDisplay}
                </span>
                <span className="text-2xl font-bold text-primary">
                  {data.pricing.single.discountedDisplay}
                </span>
              </div>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => handleCheckout(false)}
                disabled={isCheckingOut}
                data-testid="button-unlock-single"
              >
                {isCheckingOut && checkoutType === 'single' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Redirecting to payment...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Unlock Results Now
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {freeAccessDate && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-muted rounded-full">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Free Access Option</h3>
                  <p className="text-sm text-muted-foreground">
                    Your results will be available for free on{' '}
                    <strong>{format(freeAccessDate, 'MMMM d, yyyy')}</strong>.
                    We'll send you an email when they're ready.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Assessment completed as part of your evaluation with <strong>{data.partnerName}</strong>
        </p>
      </div>
    </div>
  );
}
