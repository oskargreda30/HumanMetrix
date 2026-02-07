import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Clock, Lock, CreditCard, ArrowRight, Mail, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface B2BResultsData {
  sessionId: string;
  assessmentType: string;
  email: string;
  partnerName: string;
  completedAt?: string;
  countryCode?: string;
  currencyCode?: string;
  pricing?: {
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
  freeAccessDate?: string | null;
  alreadyPaid?: boolean;
  hasExistingAccount?: boolean;
  userId?: number;
  resultsDeliveryStatus?: string;
}

const ASSESSMENT_NAMES: Record<string, string> = {
  'fit': 'FIT Assessment',
  'ai_readiness': 'AI Readiness Assessment',
  'aiq': 'AIQ Assessment',
  'prompt_architecture': 'Prompt Architecture Assessment',
};

export default function B2BResults() {
  const [, setLocation] = useLocation();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutType, setCheckoutType] = useState<'single' | 'bundle' | null>(null);
  const [isProcessingAccount, setIsProcessingAccount] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [isGeneratingResults, setIsGeneratingResults] = useState(false);
  const { toast } = useToast();

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

  const handleViewResults = async () => {
    if (!data?.email || !sessionId) return;
    
    setIsProcessingAccount(true);
    
    try {
      const res = await apiRequest("POST", "/api/b2b/create-account", {
        email: data.email,
        sessionId,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to access results");
      }
      
      const result = await res.json();
      
      toast({
        title: data.hasExistingAccount ? "Welcome back!" : "Account created!",
        description: "Redirecting to your dashboard...",
      });
      
      queryClient.clear();
      
      setTimeout(() => {
        setLocation(result.redirectTo || "/dashboard");
      }, 1000);
    } catch (err: any) {
      setIsProcessingAccount(false);
      toast({
        title: "Error",
        description: err.message || "Failed to access results. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResendEmail = async () => {
    if (!sessionId || !data?.email) return;
    
    setIsResendingEmail(true);
    
    try {
      const res = await apiRequest("POST", `/api/b2b/results/${sessionId}/resend-email`, {
        email: data.email,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to resend email");
      }
      
      toast({
        title: "Email sent!",
        description: "A link to your results has been resent to your email address.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to resend",
        description: err.message || "Unable to resend email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResendingEmail(false);
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

  const needsResultsEmail = data.alreadyPaid && data.resultsDeliveryStatus === 'pending_client_pdf';

  if (data.alreadyPaid) {
    // If results email hasn't been sent yet, redirect to results page
    if (needsResultsEmail) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
          
          <Card className="relative max-w-lg w-full p-8 space-y-6 bg-white/95 backdrop-blur-sm shadow-2xl border-0">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-cyan-600 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Payment Successful!</h1>
              <p className="text-slate-600">
                We're preparing your {ASSESSMENT_NAMES[data.assessmentType] || data.assessmentType} results.
              </p>
              <p className="text-sm text-slate-500">
                Click below to view your results and receive a link via email.
              </p>
              
              <div className="pt-4">
                <Button
                  onClick={() => setLocation(`/b2b-pdf-email/${data.sessionId}?email=${encodeURIComponent(data.email)}`)}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
                  data-testid="button-view-results-send-email"
                >
                  View Results & Send Email
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    // Results email already sent - show success view
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        
        <Card className="relative max-w-lg w-full p-8 space-y-6 bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Results Already Unlocked!</h1>
            <p className="text-slate-600">
              You've already paid for your {ASSESSMENT_NAMES[data.assessmentType] || data.assessmentType} results.
            </p>
            
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mt-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                <div className="text-left flex-1">
                  <p className="font-medium text-slate-900">Results link sent to your email</p>
                  <p className="text-sm text-slate-600 mt-1">
                    A link to your results was sent to <strong>{data.email}</strong>
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendEmail}
                disabled={isResendingEmail}
                className="w-full mt-3 text-cyan-700 border-cyan-300 hover:bg-cyan-50"
                data-testid="button-resend-email"
              >
                {isResendingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resend Email
                  </>
                )}
              </Button>
            </div>
            
            <div className="pt-4">
              <Button
                onClick={handleViewResults}
                disabled={isProcessingAccount}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
                data-testid="button-view-or-create"
              >
                {isProcessingAccount ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {data.hasExistingAccount ? "Logging in..." : "Creating Account..."}
                  </>
                ) : (
                  <>
                    {data.hasExistingAccount ? "View Results" : "Create Account"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
              
              <p className="text-xs text-slate-500 mt-3">
                {data.hasExistingAccount 
                  ? "You'll be logged in and taken to your dashboard"
                  : "We'll create an account and send you login details"
                }
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const freeAccessDate = data.freeAccessDate ? new Date(data.freeAccessDate) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pt-16 md:pt-12 pb-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4 bg-green-500/10 text-green-600 border-green-200">
            <CheckCircle className="w-4 h-4 mr-1" />
            Assessment Complete
          </Badge>
          <h1 className="text-3xl font-bold mb-2">Your Results Are Ready</h1>
          <p className="text-muted-foreground">
            Completed with <strong>{data.partnerName}</strong>
          </p>
        </div>

        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Immediate Access</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Get your detailed results right now for just{" "}
              {(data.pricing?.single?.discountPercent ?? 0) > 0 && (
                <span className="line-through text-muted-foreground/60 mr-1">{data.pricing?.single?.originalDisplay}</span>
              )}
              <span className="font-bold text-primary text-lg">{data.pricing?.single?.discountedDisplay}</span>
              {(data.pricing?.single?.discountPercent ?? 0) > 0 && (
                <span className="ml-1 text-sm text-green-600 font-medium">({data.pricing?.single?.discountPercent}% off)</span>
              )}
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Comprehensive results report
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Detailed insights and recommendations
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Instant delivery to your email
              </li>
            </ul>
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => handleCheckout(false)}
              disabled={isCheckingOut}
              data-testid="button-checkout-single"
            >
              {isCheckingOut && checkoutType === 'single' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting to checkout...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Unlock Results Now
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {freeAccessDate && (
          <Card className="bg-muted/30">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-background rounded-full">
                  <Clock className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Free Access in 30 Days</h3>
                  <p className="text-sm text-muted-foreground">
                    Your results will be available for free on{" "}
                    <strong>{format(freeAccessDate, "MMMM d, yyyy")}</strong>.
                    We'll send you an email when they're ready.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
