import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ResultsPaymentGate() {
  const [discountCode, setDiscountCode] = useState("");
  const { toast } = useToast();

  const unlockMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/unlock-results", {
        discountCode: code || undefined,
      });
      return response;
    },
    onSuccess: async (data: any) => {
      if (data.free) {
        // Free code used successfully
        toast({
          title: "Results Unlocked!",
          description: "Your results are now available. Refreshing...",
        });
        
        // Refresh purchases to update resultsAccessPaid status
        await queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
        
        // Reload page to show results
        window.location.reload();
      } else if (data.sessionUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.sessionUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unlock results",
        variant: "destructive",
      });
    },
  });

  const handleUnlock = () => {
    unlockMutation.mutate(discountCode);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="max-w-2xl w-full p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          
          <h1 className="text-3xl font-bold">Unlock Your Results</h1>
          
          <p className="text-muted-foreground text-lg">
            You've completed all your assessments! To view your detailed results and download 
            your professional PDF report, please unlock your results.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Comprehensive Assessment Analysis</p>
              <p className="text-sm text-muted-foreground">
                Detailed breakdown of your skills and competencies
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Professional PDF Report</p>
              <p className="text-sm text-muted-foreground">
                Employer-ready report you can attach to your CV
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Personalized Insights</p>
              <p className="text-sm text-muted-foreground">
                Strengths analysis and development recommendations
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="discount-code">Discount Code (Optional)</Label>
            <Input
              id="discount-code"
              placeholder="Enter FREE if employer covered payment"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              disabled={unlockMutation.isPending}
              data-testid="input-discount-code"
            />
          </div>

          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              If your employer has covered the cost, use discount code <span className="font-mono font-bold">FREE</span> to unlock your results instantly.
            </AlertDescription>
          </Alert>

          <Button
            className="w-full"
            size="lg"
            onClick={handleUnlock}
            disabled={unlockMutation.isPending}
            data-testid="button-unlock-results"
          >
            {unlockMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Unlock Results {discountCode ? "(Free)" : "($20)"}
              </>
            )}
          </Button>

          {!discountCode && (
            <p className="text-sm text-center text-muted-foreground">
              Secure payment processed via Stripe
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
