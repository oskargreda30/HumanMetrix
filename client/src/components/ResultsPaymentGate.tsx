import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2, Loader2, ArrowLeft, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ASSESSMENT_PRICES, BASE_FEE, normalizeAssessmentId } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

export function ResultsPaymentGate() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showReferenceDialog, setShowReferenceDialog] = useState(false);
  const [reference, setReference] = useState("");
  
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
  
  // Check reference status from backend
  const { data: referenceStatus } = useQuery<{ hasSubmitted: boolean; reference: any }>({
    queryKey: ["/api/reference-status"],
    refetchOnMount: "always",
  });
  
  const showFreeCode = referenceStatus?.hasSubmitted || false;

  const unlockMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/unlock-results", {
        purchaseId: currentPurchase?.id, // Pass the specific purchase ID
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

  // Count words in reference
  const wordCount = reference.trim().split(/\s+/).filter(word => word.length > 0).length;
  const isReferenceValid = wordCount >= 50;

  const submitReferenceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/submit-reference", {
        referenceText: reference,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit reference");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setShowReferenceDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/reference-status"] });
      
      toast({
        title: "Reference submitted!",
        description: "Your FREE discount code is now displayed above.",
        duration: 5000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit reference",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmitReference = () => {
    if (!isReferenceValid) {
      toast({
        title: "Reference too short",
        description: "Please write at least 50 words for your reference.",
        variant: "destructive",
      });
      return;
    }
    
    submitReferenceMutation.mutate();
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
            You now have the option to purchase your results below.
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

        <div className="space-y-4">
          {/* Free Code Display (after reference submission) */}
          {showFreeCode && (
            <Card className="p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <div className="text-center space-y-2">
                <p className="font-semibold text-green-700 dark:text-green-300">
                  Your discount code is ready!
                </p>
                <div className="flex items-center justify-center gap-2">
                  <code className="px-4 py-2 bg-white dark:bg-gray-800 border-2 border-green-500 rounded-lg text-lg font-bold">
                    FREE
                  </code>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Enter this code at checkout to unlock your results for free
                </p>
              </div>
            </Card>
          )}

          {/* Write Reference Button */}
          {!showFreeCode && (
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => setShowReferenceDialog(true)}
              data-testid="button-write-reference"
            >
              <FileText className="mr-2 h-4 w-4" />
              Write a Reference for Free Results
            </Button>
          )}

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

      {/* Reference Writing Dialog */}
      <Dialog open={showReferenceDialog} onOpenChange={setShowReferenceDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-reference">
          <DialogHeader>
            <DialogTitle>Write a Reference for Free Results</DialogTitle>
            <DialogDescription>
              Write a reference for HumanMetrix (minimum 50 words) to unlock your results for free.
              Share your honest experience completing these assessments.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Share your experience with HumanMetrix assessments... (minimum 50 words)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="min-h-[200px]"
              data-testid="input-reference"
            />
            
            <div className="flex items-center justify-between">
              <p className={`text-sm ${isReferenceValid ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                Word count: {wordCount} / 50 {isReferenceValid && '✓'}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReferenceDialog(false)}
              data-testid="button-cancel-reference"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReference}
              disabled={!isReferenceValid}
              data-testid="button-submit-reference"
            >
              Submit Reference
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
