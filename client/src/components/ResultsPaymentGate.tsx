import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ASSESSMENT_PRICES, BASE_FEE, normalizeAssessmentId } from "@shared/schema";
import { useCurrency } from "@/contexts/CurrencyContext";

export function ResultsPaymentGate() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { countryCode, getAdjustedPriceInPence, getLocalPriceNumber, formatLocalCurrency } = useCurrency();
  
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
  // Sum individually-rounded local prices to match what's shown on Assessment page
  const assessmentTypesInBatch = purchaseItems?.map((item: any) => item.assessmentType) || [];
  
  // Get rounded local price for platform fee
  const platformFeeLocal = getLocalPriceNumber(getAdjustedPriceInPence(BASE_FEE));
  
  // Sum rounded local prices for each assessment
  const assessmentsTotalLocal = assessmentTypesInBatch.reduce((sum: number, type: string) => {
    const normalizedType = normalizeAssessmentId(type);
    const originalPrice = ASSESSMENT_PRICES[normalizedType] || 0;
    const adjustedPence = getAdjustedPriceInPence(originalPrice);
    return sum + getLocalPriceNumber(adjustedPence);
  }, 0);
  
  // Total is sum of individually-rounded local prices
  const totalLocal = platformFeeLocal + assessmentsTotalLocal;
  const formattedPrice = formatLocalCurrency(totalLocal);
  
  // Check if user was invited
  const wasInvited = invitationData?.wasInvited === true;

  const unlockMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/unlock-results", {
        purchaseId: currentPurchase?.id, // Pass the specific purchase ID
        countryCode, // Pass for PPP pricing
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to unlock results");
      }
      
      return await response.json();
    },
    onSuccess: async (data: any) => {
      if (data.sessionUrl) {
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
    unlockMutation.mutate();
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
          
          <h1 className="text-3xl font-bold">Congratulations! All of your assessments are complete!</h1>
          
          <p className="text-muted-foreground text-lg">
            You can now purchase your results below.
          </p>
          
          {wasInvited && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>For Invited Candidates:</strong> If you have been invited to complete our assessments as part of a hiring process, your results have been sent to your employer. If you wish to purchase your own copy of your results please do so below.
              </p>
            </div>
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

        {/* Price Breakdown */}
        <div className="border rounded-lg p-4 space-y-3" data-testid="price-breakdown">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Price Breakdown</h3>
          
          {/* Individual assessments */}
          {assessmentTypesInBatch.map((type: string, index: number) => {
            const normalizedType = normalizeAssessmentId(type);
            const originalPrice = ASSESSMENT_PRICES[normalizedType] || 0;
            const adjustedPence = getAdjustedPriceInPence(originalPrice);
            const localPrice = getLocalPriceNumber(adjustedPence);
            const displayName = type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            
            return (
              <div key={index} className="flex justify-between items-center text-sm" data-testid={`price-item-${type}`}>
                <span>{displayName} Assessment</span>
                <span>{formatLocalCurrency(localPrice)}</span>
              </div>
            );
          })}
          
          {/* Platform fee */}
          <div className="flex justify-between items-center text-sm" data-testid="price-platform-fee">
            <span>Platform Fee</span>
            <span>{formatLocalCurrency(platformFeeLocal)}</span>
          </div>
          
          {/* Divider */}
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center font-semibold" data-testid="price-total">
              <span>Total</span>
              <span className="text-lg">{formattedPrice}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
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
                Unlock Results ({formattedPrice})
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
