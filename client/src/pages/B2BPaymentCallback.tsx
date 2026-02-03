import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function B2BPaymentCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing your payment...");
  const [email, setEmail] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const processedRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const processPayment = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const stripeSessionId = params.get("session_id");
        const b2bSessionId = params.get("b2b_session");

        if (!stripeSessionId) {
          throw new Error("Missing session information");
        }

        let res;
        
        if (b2bSessionId) {
          // Standard B2B flow - requires b2b_session param (from bundle checkout)
          res = await fetch("/api/b2b/process-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              stripeSessionId, 
              b2bSessionId 
            }),
          });
        } else {
          // Unlock flow (from email payment link) - uses metadata from Stripe session
          // This handles cases with or without success=true param
          res = await fetch("/api/unlock-results/process-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stripeSessionId }),
          });
        }

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Payment processing failed");
        }

        console.log("[B2B Callback] Payment processed successfully:", {
          email: data.email,
          sessionId: data.sessionId,
          hasExistingAccount: data.hasExistingAccount,
        });

        setStatus("success");
        setEmail(data.email || null);
        setSessionId(data.sessionId || null);
        setHasExistingAccount(data.hasExistingAccount);

        if (data.hasExistingAccount && data.resultsUrl) {
          setMessage("Your results are ready! Redirecting to your dashboard...");
          queryClient.clear();
          setTimeout(() => {
            setLocation(data.resultsUrl);
          }, 2000);
        } else {
          setMessage("Your results have been sent to your email!");
        }
      } catch (error: any) {
        console.error("B2B payment processing error:", error);
        setStatus("error");
        setMessage(error.message || "Failed to process payment. Please contact support.");
      }
    };

    processPayment();
  }, [setLocation]);

  const handleCreateAccount = async () => {
    if (!email || !sessionId) {
      console.error("[B2B Callback] Missing email or sessionId for account creation", { email, sessionId });
      toast({
        title: "Unable to create account",
        description: "Missing required information. Please contact support or check your email for your results.",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreatingAccount(true);
    
    try {
      const res = await apiRequest("POST", "/api/b2b/create-account", {
        email,
        sessionId,
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create account");
      }
      
      const data = await res.json();
      
      toast({
        title: "Account created!",
        description: "Welcome to HumanMetrix. Redirecting to your dashboard...",
      });
      
      queryClient.clear();
      
      setTimeout(() => {
        setLocation(data.redirectTo || "/dashboard");
      }, 1500);
    } catch (error: any) {
      setIsCreatingAccount(false);
      toast({
        title: "Error",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      
      <Card className="relative max-w-lg w-full p-8 space-y-6 bg-white/95 backdrop-blur-sm shadow-2xl border-0">
        <div className="text-center space-y-4">
          {status === "processing" && (
            <>
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Processing Payment</h1>
              <p className="text-slate-600">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Payment Successful!</h1>
              <p className="text-slate-600">{message}</p>
              
              {hasExistingAccount ? (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
                  <span className="text-slate-500 text-sm">Redirecting to dashboard...</span>
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <p className="font-medium text-slate-900">Results sent to your email</p>
                        <p className="text-sm text-slate-600 mt-1">
                          We've sent your assessment results to <strong>{email}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                    <p className="text-sm text-slate-700 mb-3">
                      Create an account to access your results anytime and track your progress.
                    </p>
                    <Button
                      onClick={handleCreateAccount}
                      disabled={isCreatingAccount}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                      data-testid="button-create-account"
                    >
                      {isCreatingAccount ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          Create Account & View Results
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/")}
                    className="text-slate-500"
                    data-testid="button-skip"
                  >
                    Skip for now
                  </Button>
                </div>
              )}
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Payment Issue</h1>
              <p className="text-slate-600">{message}</p>
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                data-testid="button-go-back"
              >
                Go Back
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
