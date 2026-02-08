import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, AlertCircle, Mail, LogIn, Eye } from "lucide-react";
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
  const [redirectFailed, setRedirectFailed] = useState(false);
  const processedRef = useRef(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const processPayment = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const stripeSessionId = params.get("session_id");
        const b2bSessionId = params.get("b2b_session");
        const isBundle = params.get("bundle") === "true";
        const provider = params.get("provider");
        const intentId = params.get("intent_id");

        if (!stripeSessionId && !(provider === 'airwallex' && intentId)) {
          throw new Error("Missing session information");
        }

        let res;
        
        if (isBundle) {
          res = await fetch("/api/b2b/results-bundle/process-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              provider === 'airwallex' && intentId
                ? { intentId, provider: 'airwallex' }
                : { stripeSessionId }
            ),
          });
        } else if (b2bSessionId) {
          res = await fetch("/api/b2b/process-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              provider === 'airwallex' && intentId
                ? { intentId, provider: 'airwallex', b2bSessionId }
                : { stripeSessionId, b2bSessionId }
            ),
          });
        } else {
          res = await fetch("/api/unlock-results/process-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              provider === 'airwallex' && intentId
                ? { intentId, provider: 'airwallex' }
                : { stripeSessionId }
            ),
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

        if (data.resultsUrl) {
          setMessage("Your results are ready! Redirecting to your results...");
          queryClient.clear();
          redirectTimerRef.current = setTimeout(() => {
            setLocation(data.resultsUrl);
          }, 2000);
          fallbackTimerRef.current = setTimeout(() => {
            setRedirectFailed(true);
          }, 5000);
        } else {
          setMessage("Payment successful! Your results are ready.");
        }
      } catch (error: any) {
        console.error("B2B payment processing error:", error);
        setStatus("error");
        setMessage(error.message || "Failed to process payment. Please contact support.");
      }
    };

    processPayment();
  }, [setLocation]);


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
              
              <div className="space-y-4 pt-2">
                {!redirectFailed && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
                    <span className="text-slate-500 text-sm">Redirecting to your results...</span>
                  </div>
                )}

                {redirectFailed && sessionId && (
                  <Button
                    onClick={() => {
                      queryClient.clear();
                      setLocation(`/b2b-results/${sessionId}`);
                    }}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
                    data-testid="button-view-results"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Results
                  </Button>
                )}

                {!hasExistingAccount && email && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <p className="font-medium text-slate-900">Results PDF will be emailed shortly</p>
                        <p className="text-sm text-slate-600 mt-1">
                          We'll send your detailed results to <strong>{email}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!hasExistingAccount && (
                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/login")}
                    className="w-full text-slate-500"
                    data-testid="button-login-existing"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Already have an account? Login
                  </Button>
                )}
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Payment Issue</h1>
              <p className="text-slate-600">{message}</p>
              <div className="flex flex-col gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => window.history.back()}
                  data-testid="button-go-back"
                >
                  Go Back
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setLocation("/login")}
                  className="text-slate-500"
                  data-testid="button-login-error"
                >
                  Login to check your account
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
