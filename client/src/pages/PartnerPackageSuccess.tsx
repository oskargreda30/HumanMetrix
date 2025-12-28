import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, Package } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import dashboardBg from "@assets/image_1763608498774.png";

export default function PartnerPackageSuccess() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState<string>("");
  const [newBalance, setNewBalance] = useState<number | null>(null);

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
          if (data.newBalance) {
            setNewBalance(data.newBalance);
          }
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
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">New Balance</span>
                </div>
                <div className="text-3xl font-bold text-primary" data-testid="text-new-balance">
                  {newBalance} tests
                </div>
              </div>
            )}
            <Button
              className="w-full"
              onClick={() => setLocation("/admin?tab=partners&subtab=usage")}
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
