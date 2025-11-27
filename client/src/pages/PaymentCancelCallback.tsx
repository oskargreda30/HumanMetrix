import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { queryClient } from "@/lib/queryClient";

export default function PaymentCancelCallback() {
  const [, setLocation] = useLocation();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    // Clear cache and redirect immediately to dashboard
    queryClient.clear();
    
    setTimeout(() => {
      setLocation("/dashboard");
    }, 1500);
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center">
            <XCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold">Payment Cancelled</h1>
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </Card>
    </div>
  );
}
