import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Shield, Download, Users, Lock } from "lucide-react";

interface ResultsRetentionConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (consent: boolean) => void;
}

export function ResultsRetentionConsentDialog({
  open,
  onOpenChange,
  onComplete,
}: ResultsRetentionConsentDialogProps) {
  const { toast } = useToast();

  const consentMutation = useMutation({
    mutationFn: async (consentValue: boolean) => {
      const response = await apiRequest('POST', '/api/results-retention-consent', { consent: consentValue });
      return { response, consent: consentValue };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      onOpenChange(false);
      onComplete(data.consent);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your preference. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConsent = (consentValue: boolean) => {
    consentMutation.mutate(consentValue);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md" 
        data-testid="dialog-results-retention" 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-4">
            <div className="relative">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <Download className="absolute -right-2 -bottom-2 h-8 w-8 text-primary bg-background rounded-full p-1" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl" data-testid="title-results-ready">
            Your Results Are Ready
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            You can now download your comprehensive assessment report.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Would you like to make your results visible to potential employers on HumanMetrix?
          </p>
          
          <div className="space-y-3">
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Share with employers</p>
                  <p className="text-xs text-muted-foreground">
                    Employers using HumanMetrix can view your assessment results and may reach out about opportunities.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Keep private</p>
                  <p className="text-xs text-muted-foreground">
                    Your results remain visible only to you. You can change this preference at any time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span>Your data is protected under our privacy policy.</span>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline"
            onClick={() => handleConsent(false)} 
            disabled={consentMutation.isPending}
            className="w-full sm:w-auto"
            data-testid="button-decline-sharing"
          >
            {consentMutation.isPending ? "Saving..." : "Keep Private"}
          </Button>
          <Button 
            onClick={() => handleConsent(true)} 
            disabled={consentMutation.isPending}
            className="w-full sm:w-auto"
            data-testid="button-accept-sharing"
          >
            {consentMutation.isPending ? "Saving..." : "Share with Employers"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
