import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function PaymentCallback() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing your payment...");

  useEffect(() => {
    const processPayment = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("session_id");

        if (!sessionId) {
          throw new Error("No session ID found");
        }

        const res = await fetch("/api/process-results-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Payment processing failed");
        }

        setStatus("success");
        setMessage("Results unlocked! Redirecting...");

        // Results are now unlocked in the database
        // If user is authenticated, go directly to results
        // Otherwise, redirect to login first
        setTimeout(() => {
          if (isAuthenticated) {
            setLocation("/my-results");
          } else {
            window.location.href = "/login?redirect=/my-results";
          }
        }, 1500);
      } catch (error: any) {
        console.error("Payment processing error:", error);
        setStatus("error");
        setMessage(error.message || "Failed to process payment. Please contact support.");

        // Redirect to dashboard after error
        setTimeout(() => {
          setLocation("/dashboard");
        }, 3000);
      }
    };

    // Only process payment once auth status is known
    if (!authLoading) {
      processPayment();
    }
  }, [setLocation, isAuthenticated, authLoading]);

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
