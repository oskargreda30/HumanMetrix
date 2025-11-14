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
  
  // Fetch unique completed assessment types to calculate price
  const { data: results } = useQuery<any[]>({
    queryKey: ["/api/results"],
  });
  
  // Check if user was invited (has invitation record)
  const { data: invitationData } = useQuery<any>({
    queryKey: ["/api/invitation-status"],
  });
  
  const completedResults = results?.filter((r: any) => r.status === 'completed') || [];
  const uniqueAssessmentTypes = new Set(completedResults.map((r: any) => r.assessmentType));
  
  const assessmentsTotalPence = Array.from(uniqueAssessmentTypes).reduce((sum, type) => {
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
        
        // Small delay to show toast, then redirect using client-side navigation (preserves session)
        setTimeout(() => {
          setLocation("/results");
        }, 1000);
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
            your professional PDF report, please submit your payment and view results below.
          </p>
          
          {wasInvited && (
            <p className="text-sm text-muted-foreground italic">
              Your results have been submitted to the employer who invited you to complete these. You also have the option to pay and download your own copy of the results for your records, and your future job applications.
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
                Unlock Results (£{price})
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
