import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Mail, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function B2BResultsSuccess() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const verifyPayment = async () => {
      const params = new URLSearchParams(window.location.search);
      const stripeSessionId = params.get("session_id");
      const airwallexIntentId = params.get("intent_id");
      const provider = params.get("provider") || (airwallexIntentId ? 'airwallex' : 'stripe');

      if (!stripeSessionId && !airwallexIntentId) {
        setError("Missing payment session information");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/b2b-results/${sessionId}/verify-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            stripeSessionId,
            airwallexIntentId,
            provider,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to verify payment");
        }

        setVerified(true);
        toast({
          title: "Payment successful",
          description: "Your results are now unlocked!",
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      verifyPayment();
    }
  }, [sessionId, toast]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-grow flex items-center justify-center py-16">
        <div className="mx-auto max-w-lg px-4 md:px-6">
          <Card className="p-8 text-center">
            {loading ? (
              <>
                <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Verifying Payment...</h2>
                <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
              </>
            ) : error ? (
              <>
                <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Verification Failed</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button 
                  onClick={() => setLocation(`/b2b-results-payment/${sessionId}`)}
                  variant="outline"
                >
                  Try Again
                </Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
                
                <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
                <p className="text-muted-foreground mb-6">
                  Your assessment results are now unlocked.
                </p>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Mail className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Check Your Email</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We're preparing your detailed PDF report and will send it to your email shortly.
                    This includes your full results, personalized insights, and recommendations.
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>Your results have been shared with your recruiting partner.</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Thank you for completing your assessment. Good luck with your application!
                </p>
              </>
            )}
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
