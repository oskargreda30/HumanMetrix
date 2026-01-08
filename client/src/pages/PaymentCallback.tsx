import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { queryClient } from "@/lib/queryClient";

export default function PaymentCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing your payment...");
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double processing
    if (processedRef.current) return;
    processedRef.current = true;

    const processPayment = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("session_id");
        const intentId = params.get("intent_id");
        const provider = params.get("provider");
        const purchaseIdFromUrl = params.get("purchaseId");

        if (!sessionId && !intentId) {
          throw new Error("No payment session found");
        }

        const res = await fetch("/api/process-results-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ 
            sessionId, 
            intentId,
            provider: provider || (intentId ? 'airwallex' : 'stripe'),
            purchaseId: purchaseIdFromUrl 
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Payment processing failed");
        }

        setStatus("success");
        setMessage("Results unlocked! Redirecting...");

        // Wait for session to be established before redirecting
        // Poll /api/auth/user to verify session cookie is set
        let sessionVerified = false;
        let attempts = 0;
        const maxAttempts = 10; // 5 seconds max
        
        while (!sessionVerified && attempts < maxAttempts) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            const sessionCheck = await fetch("/api/auth/user", {
              credentials: "include"
            });
            
            if (sessionCheck.ok) {
              sessionVerified = true;
              console.log("✓ Session verified after payment");
            }
          } catch (e) {
            console.log(`Session check attempt ${attempts} failed`);
          }
        }
        
        if (!sessionVerified) {
          console.warn("Session verification timed out, redirecting anyway");
        }

        // Clear cache to ensure fresh data for correct user
        queryClient.clear();

        // Session verified or timeout - redirect to batch-specific results page
        const redirectUrl = data.purchaseId 
          ? `/my-results?purchaseId=${data.purchaseId}`
          : "/my-results";
        setLocation(redirectUrl);
      } catch (error: any) {
        console.error("Payment processing error:", error);
        setStatus("error");
        setMessage(error.message || "Failed to process payment. Please contact support.");

        // Clear cache before redirect
        queryClient.clear();
        
        // Redirect to dashboard after error
        setTimeout(() => {
          setLocation("/dashboard");
        }, 3000);
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
              <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold">Success!</h1>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold">Error</h1>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
