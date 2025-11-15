import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PurchaseSuccess() {
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [accountCreated, setAccountCreated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const processPayment = async (session: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const res = await fetch("/api/process-payment-success", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: session }),
      });

      const data = await res.json();

      // Check if response is OK and success flag is true
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to process payment");
      }

      // Clear basket from localStorage after successful checkout
      try {
        localStorage.removeItem("humanmetrix-basket");
      } catch (error) {
        console.error("Error clearing basket:", error);
      }

      setAccountCreated(true);
      setUserEmail(data.email || "");
      setIsProcessing(false);
    } catch (err: any) {
      console.error("Error processing payment:", err);
      setError(err.message || "Failed to create account. Please contact support.");
      setIsProcessing(false);
      
      toast({
        title: "Account creation failed",
        description: "Payment was successful but account setup failed. Please contact support.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get("session_id");
    setSessionId(session);

    if (session) {
      processPayment(session);
    } else {
      setIsProcessing(false);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-grow flex items-center justify-center py-16">
        <div className="mx-auto max-w-2xl px-4 md:px-6">
          <Card className="p-8 text-center">
            {isProcessing ? (
              <>
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
                <h1 className="text-3xl font-bold mb-4">Processing Payment...</h1>
                <p className="text-lg text-muted-foreground mb-6">
                  Please wait while we set up your account
                </p>
              </>
            ) : error ? (
              <>
                <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                
                <h1 className="text-3xl font-bold mb-4">Account Setup Failed</h1>
                <p className="text-lg text-muted-foreground mb-6">
                  Your payment was received, but we encountered an issue creating your account.
                </p>
                
                <div className="bg-destructive/10 p-4 rounded-lg mb-6 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium mb-1">Error:</p>
                  <p className="text-sm text-destructive/90">{error}</p>
                </div>
                
                {sessionId && (
                  <div className="bg-muted p-4 rounded-lg mb-6">
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Reference your order ID when contacting support:</strong>
                    </p>
                    <p className="font-mono text-sm break-all">{sessionId}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => sessionId && processPayment(sessionId)}
                    disabled={!sessionId}
                    data-testid="button-retry-processing"
                  >
                    Retry Account Setup
                  </Button>
                  
                  <p className="text-sm text-muted-foreground mt-4">
                    If the problem persists, please contact support with your order ID above
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
                
                <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
                <p className="text-lg text-muted-foreground mb-6">
                  {accountCreated 
                    ? "Your account has been created and your assessments are ready!"
                    : "Thank you for your purchase. Your assessments are now available."}
                </p>
                
                {userEmail && (
                  <div className="bg-muted p-4 rounded-lg mb-6">
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Login credentials sent to:</strong>
                    </p>
                    <p className="font-mono text-lg">{userEmail}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Check your email for your password and login link
                    </p>
                  </div>
                )}
                
                {sessionId && (
                  <p className="text-sm text-muted-foreground mb-8">
                    Order ID: <span className="font-mono">{sessionId.slice(0, 20)}...</span>
                  </p>
                )}

                <div className="space-y-3">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => setLocation(userEmail ? "/login" : "/dashboard")}
                    data-testid={userEmail ? "button-go-to-login" : "button-go-to-dashboard"}
                  >
                    {userEmail ? "Go to Login" : "Go to Dashboard"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  
                  {userEmail && (
                    <p className="text-sm text-muted-foreground mt-4">
                      Log in with the credentials we sent to your email
                    </p>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
