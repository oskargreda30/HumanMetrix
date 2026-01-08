import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PricingData {
  unlocked: boolean;
  method?: 'paid' | 'free';
  paidAt?: string;
  freeUnlockAt?: string;
  sessionId?: string;
  assessmentType?: string;
  partnerCompanyName?: string;
  pricing?: {
    amount: number;
    currency: string;
    displayPrice: string;
    originalDisplayPrice: string;
    isZeroDecimal: boolean;
  };
  daysUntilFree?: number;
}

export default function B2BResultsPayment() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/b2b-results/${sessionId}/pricing`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch pricing");
        }
        
        setPricing(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchPricing();
    }
  }, [sessionId]);

  const handleCheckout = async () => {
    try {
      setCheckoutLoading(true);
      const res = await fetch(`/api/b2b-results/${sessionId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout");
      }
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      toast({
        title: "Checkout failed",
        description: err.message,
        variant: "destructive",
      });
      setCheckoutLoading(false);
    }
  };

  const formatAssessmentName = (type: string) => {
    const names: Record<string, string> = {
      fit: "FIT Assessment",
      ai_readiness: "AI Readiness Assessment",
      prompt_architecture: "Prompt Architecture Assessment",
      aiq: "AIQ Assessment",
    };
    return names[type] || type;
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      gbp: "£", usd: "$", eur: "€", sgd: "S$", aud: "A$", cad: "C$",
      jpy: "¥", myr: "RM", thb: "฿", php: "₱", inr: "₹", idr: "Rp",
      vnd: "₫", krw: "₩",
    };
    return symbols[currency.toLowerCase()] || currency.toUpperCase() + " ";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-grow flex items-center justify-center py-16">
        <div className="mx-auto max-w-lg px-4 md:px-6">
          {loading ? (
            <Card className="p-8 text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your results information...</p>
            </Card>
          ) : error ? (
            <Card className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Error</h2>
              <p className="text-muted-foreground">{error}</p>
            </Card>
          ) : pricing?.unlocked ? (
            <Card className="p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Results Unlocked!</h2>
              <p className="text-muted-foreground mb-4">
                {pricing.method === 'paid' 
                  ? "Thank you for your payment. Your results are now available."
                  : "Your 30-day waiting period has passed. Your results are now free to access."
                }
              </p>
              <p className="text-sm text-muted-foreground">
                Your results have been shared with your recruiting partner.
              </p>
            </Card>
          ) : (
            <Card className="p-8">
              <div className="text-center mb-6">
                <Badge variant="secondary" className="mb-4">
                  {formatAssessmentName(pricing?.assessmentType || "")}
                </Badge>
                <h1 className="text-2xl font-bold mb-2">Unlock Your Results</h1>
                <p className="text-muted-foreground">
                  Completed for {pricing?.partnerCompanyName}
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Immediate Access</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get your detailed results and personalized insights right now.
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-primary">
                        {pricing?.pricing?.currency && getCurrencySymbol(pricing.pricing.currency)}
                        {pricing?.pricing?.displayPrice}
                      </span>
                      {pricing?.pricing?.originalDisplayPrice && (
                        <span className="text-lg text-muted-foreground line-through">
                          {getCurrencySymbol(pricing.pricing.currency)}
                          {pricing.pricing.originalDisplayPrice}
                        </span>
                      )}
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      25% off
                    </Badge>
                  </div>
                  <Button 
                    onClick={handleCheckout} 
                    disabled={checkoutLoading}
                    className="w-full"
                    size="lg"
                    data-testid="button-unlock-results"
                  >
                    {checkoutLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Unlock Results Now
                      </>
                    )}
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-card px-3 text-muted-foreground">or</span>
                  </div>
                </div>

                <div className="bg-muted/50 border border-border rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-semibold">Free Access</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Wait <strong>{pricing?.daysUntilFree || 30} days</strong> and access your results for free.
                  </p>
                  {pricing?.freeUnlockAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Available on: {new Date(pricing.freeUnlockAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-6">
                Your results include detailed score breakdowns, personalized insights, and recommendations.
              </p>
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
