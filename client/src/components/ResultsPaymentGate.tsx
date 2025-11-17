import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Sparkles, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ASSESSMENT_PRICES, BASE_FEE, normalizeAssessmentId } from "@shared/schema";

export function ResultsPaymentGate() {
  const [discountCode, setDiscountCode] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Get purchaseId from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const purchaseId = urlParams.get('purchaseId');
  
  // Fetch current unpaid purchase to get correct pricing for THIS batch only
  const { data: purchases } = useQuery<any[]>({
    queryKey: ["/api/purchases"],
  });
  
  // Check if user was invited (has invitation record)
  const { data: invitationData } = useQuery<any>({
    queryKey: ["/api/invitation-status"],
  });
  
  // Find the specific purchase by ID, or fall back to most recent unpaid purchase
  let currentPurchase;
  if (purchaseId && purchases) {
    currentPurchase = purchases.find((p: any) => p.id === purchaseId);
  } else {
    // Fallback: Find most recent unpaid purchase
    const unpaidPurchases = purchases?.filter((p: any) => !p.resultsAccessPaid) || [];
    unpaidPurchases.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    currentPurchase = unpaidPurchases[0];
  }
  
  // Fetch purchase items for current unpaid purchase to calculate correct price
  const { data: purchaseItems } = useQuery<any[]>({
    queryKey: ["/api/purchase-items", currentPurchase?.id],
    enabled: !!currentPurchase,
  });
  
  // Calculate price based ONLY on assessments in current unpaid purchase batch
  const assessmentTypesInBatch = purchaseItems?.map((item: any) => item.assessmentType) || [];
  const assessmentsTotalPence = assessmentTypesInBatch.reduce((sum: number, type: string) => {
    const normalizedType = normalizeAssessmentId(type);
    return sum + (ASSESSMENT_PRICES[normalizedType] || 0);
  }, 0);
  const totalPence = BASE_FEE + assessmentsTotalPence;
  const price = (totalPence / 100).toFixed(2); // Convert pence to pounds
  
  // Check if user was invited
  const wasInvited = invitationData?.wasInvited === true;

  const unlockMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/unlock-results", {
        discountCode: code || undefined,
        purchaseId: currentPurchase?.id, // Pass the specific purchase ID
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to unlock results");
      }
      
      return await response.json();
    },
    onSuccess: async (data: any) => {
      if (data.free) {
        // Free code used successfully
        toast({
          title: "Results Unlocked!",
          description: "Your results are now available. Redirecting...",
        });
        
        // Refresh purchases to update resultsAccessPaid status
        await queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/results"] });
        
        // Small delay to show toast, then redirect to batch-specific results
        setTimeout(() => {
          setLocation(`/my-results?purchaseId=${currentPurchase?.id}`);
        }, 1000);
      } else if (data.sessionUrl) {
        // Add purchaseId to session metadata so payment callback can redirect correctly
        // The sessionUrl already has the session ID - we'll track it on backend
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
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation("/dashboard")}
          data-testid="button-back-to-dashboard"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          
          <h1 className="text-3xl font-bold">Pay and View Your Results</h1>
          
          <p className="text-muted-foreground text-lg">
            You've completed all your assessments! To view your detailed results and download 
            your professional PDF report, please submit your payment below.
          </p>
          
          {wasInvited && (
            <p className="text-sm text-muted-foreground italic">
              Your results have been submitted to the employer who invited you to complete our assessments. You also have the option to pay and download your own copy of the results for your records, and your future job applications.
            </p>
          )}
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
              type="text"
              placeholder="Enter code (e.g., FREE)"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              data-testid="input-discount-code"
              className="uppercase"
            />
            <p className="text-xs text-muted-foreground">
              Use code <span className="font-mono font-semibold">FREE</span> for complimentary access
            </p>
          </div>

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
                {discountCode.trim().toUpperCase() === "FREE" ? "Unlock Results (FREE)" : `Unlock Results (£${price})`}
              </>
            )}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            Secure payment processed via Stripe
          </p>
        </div>
      </Card>
    </div>
  );
}
