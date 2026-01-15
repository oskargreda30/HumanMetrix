import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, Package, TrendingUp } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import dashboardBg from "@assets/image_1763608498774.png";

function useCountUp(end: number, start: number, duration: number = 1500, enabled: boolean = true) {
  const [count, setCount] = useState(start);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    if (!enabled || start === end) {
      setCount(end);
      return;
    }

    setCount(start);
    startTimeRef.current = undefined;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(start + (end - start) * easeOutQuart);

      setCount(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [start, end, duration, enabled]);

  return count;
}

export default function PartnerPackageSuccess() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState<string>("");
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [previousBalance, setPreviousBalance] = useState<number | null>(null);
  const [creditsAdded, setCreditsAdded] = useState<number | null>(null);
  const [animationStarted, setAnimationStarted] = useState(false);

  const displayCount = useCountUp(
    newBalance || 0, 
    previousBalance || 0, 
    1500, 
    animationStarted && previousBalance !== null && newBalance !== null
  );

  useEffect(() => {
    const processPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get("session_id");

      if (!sessionId) {
        setStatus("error");
        setMessage("No session ID found. Payment may not have completed.");
        return;
      }

      try {
        const response = await fetch("/api/partner/package/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus("success");
          setMessage(data.message || "Test credits have been added to your account.");
          if (data.newBalance !== undefined) {
            setNewBalance(data.newBalance);
          }
          if (data.previousBalance !== undefined) {
            setPreviousBalance(data.previousBalance);
          }
          if (data.creditsAdded !== undefined) {
            setCreditsAdded(data.creditsAdded);
          }
          setTimeout(() => setAnimationStarted(true), 300);
        } else {
          setStatus("error");
          setMessage(data.message || "Failed to process payment.");
        }
      } catch (error) {
        console.error("Error processing payment:", error);
        setStatus("error");
        setMessage("An error occurred while processing your payment. Please contact support.");
      }
    };

    processPayment();
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url(${dashboardBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(13, 29, 51, 0.85), rgba(13, 29, 51, 0.75), rgba(13, 29, 51, 0.85))'
        }} />
      </div>
      <Navigation />
      <main className="flex-grow flex items-center justify-center relative z-10 py-16 px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            {status === "processing" && (
              <>
                <div className="mx-auto mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <CardTitle>Processing Payment</CardTitle>
                <CardDescription>
                  Please wait while we verify your payment and add credits to your account...
                </CardDescription>
              </>
            )}
            {status === "success" && (
              <>
                <div className="mx-auto mb-4 p-3 rounded-full bg-green-500/20">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <CardTitle>Payment Successful</CardTitle>
                <CardDescription>
                  {message}
                </CardDescription>
              </>
            )}
            {status === "error" && (
              <>
                <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/20">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                </div>
                <CardTitle>Payment Issue</CardTitle>
                <CardDescription>
                  {message}
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "success" && newBalance !== null && (
              <div className="p-4 rounded-lg bg-muted/50 text-center space-y-3">
                {creditsAdded && (
                  <div className="flex items-center justify-center gap-2 text-green-500">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">+{creditsAdded} tests added</span>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">New Balance</span>
                </div>
                <div 
                  className="text-4xl font-bold text-primary transition-all" 
                  data-testid="text-new-balance"
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {animationStarted && previousBalance !== null ? displayCount : newBalance} tests
                </div>
                {previousBalance !== null && previousBalance !== newBalance && (
                  <div className="text-xs text-muted-foreground">
                    Previous balance: {previousBalance} tests
                  </div>
                )}
              </div>
            )}
            <Button
              className="w-full"
              onClick={() => setLocation("/partner?tab=billing")}
              data-testid="button-return-dashboard"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
