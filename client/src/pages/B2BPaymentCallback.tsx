import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function B2BPaymentCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing your payment...");
  const [resultsUrl, setResultsUrl] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const processPayment = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const stripeSessionId = params.get("session_id");
        const b2bSessionId = params.get("b2b_session");

        if (!stripeSessionId || !b2bSessionId) {
          throw new Error("Missing session information");
        }

        const res = await fetch("/api/b2b/process-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            stripeSessionId, 
            b2bSessionId 
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Payment processing failed");
        }

        setStatus("success");
        setMessage("Your results are now unlocked!");
        setResultsUrl(data.resultsUrl);

        setTimeout(() => {
          if (data.resultsUrl) {
            setLocation(data.resultsUrl);
          }
        }, 2000);
      } catch (error: any) {
        console.error("B2B payment processing error:", error);
        setStatus("error");
        setMessage(error.message || "Failed to process payment. Please contact support.");
      }
    };

    processPayment();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-4">
          {status === "processing" && (
            <>
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-bold">Processing Payment</h1>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold">Payment Successful!</h1>
              <p className="text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground">Redirecting to your results...</p>
              {resultsUrl && (
                <Button 
                  onClick={() => setLocation(resultsUrl)}
                  data-testid="button-view-results"
                >
                  View Results Now
                </Button>
              )}
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold">Payment Issue</h1>
              <p className="text-muted-foreground">{message}</p>
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
