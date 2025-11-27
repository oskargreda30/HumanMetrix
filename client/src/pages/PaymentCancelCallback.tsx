import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentCancelCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"checking" | "authenticated" | "needs_login">("checking");
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/user", {
          credentials: "include",
        });

        if (res.ok) {
          setStatus("authenticated");
          setTimeout(() => {
            setLocation("/dashboard?payment=cancelled");
          }, 1500);
        } else {
          setStatus("needs_login");
        }
      } catch (error) {
        console.error("Session check error:", error);
        setStatus("needs_login");
      }
    };

    checkSession();
  }, [setLocation]);

  const handleLogin = () => {
    setLocation("/login?redirect=/dashboard&message=payment_cancelled");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-4">
          {status === "checking" && (
            <>
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-bold">Returning to Dashboard</h1>
              <p className="text-muted-foreground">Please wait...</p>
            </>
          )}

          {status === "authenticated" && (
            <>
              <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center">
                <XCircle className="h-8 w-8 text-amber-500" />
              </div>
              <h1 className="text-2xl font-bold">Payment Cancelled</h1>
              <p className="text-muted-foreground">Redirecting to dashboard...</p>
            </>
          )}

          {status === "needs_login" && (
            <>
              <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center">
                <XCircle className="h-8 w-8 text-amber-500" />
              </div>
              <h1 className="text-2xl font-bold">Payment Cancelled</h1>
              <p className="text-muted-foreground">
                Your session has expired. Please log in to continue.
              </p>
              <Button 
                onClick={handleLogin} 
                className="mt-4"
                data-testid="button-login-after-cancel"
              >
                Log In to Dashboard
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
