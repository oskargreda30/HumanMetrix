import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function PaymentCancelCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"processing" | "done">("processing");
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const restoreSession = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const userId = params.get("userId");

        if (userId) {
          const res = await fetch("/api/restore-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ userId }),
          });

          if (res.ok) {
            console.log("Session restored after payment cancellation");
          }
        }

        setStatus("done");
        
        setTimeout(() => {
          setLocation("/dashboard?payment=cancelled");
        }, 1500);
      } catch (error) {
        console.error("Session restore error:", error);
        setStatus("done");
        setTimeout(() => {
          setLocation("/dashboard?payment=cancelled");
        }, 1500);
      }
    };

    restoreSession();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-4">
          {status === "processing" ? (
            <>
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-bold">Returning to Dashboard</h1>
              <p className="text-muted-foreground">Please wait...</p>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center">
                <XCircle className="h-8 w-8 text-amber-500" />
              </div>
              <h1 className="text-2xl font-bold">Payment Cancelled</h1>
              <p className="text-muted-foreground">Redirecting to dashboard...</p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
