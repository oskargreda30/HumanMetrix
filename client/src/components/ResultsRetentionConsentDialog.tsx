import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PartyPopper, Shield, Sparkles, Users, Lock } from "lucide-react";

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
              <PartyPopper className="h-16 w-16 text-amber-500" />
              <Sparkles className="absolute -right-2 -bottom-2 h-8 w-8 text-primary bg-background rounded-full p-1" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl" data-testid="title-results-ready">
            Congratulations! You did it!
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Your assessment results are ready to view. Nice work completing all four assessments!
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-center">
            One quick thing before you dive in - would you like employers to see your results?
          </p>
          
          <div className="space-y-3">
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Yes, show me off!</p>
                  <p className="text-xs text-muted-foreground">
                    Companies using HumanMetrix can discover your profile and might just slide into your inbox with exciting opportunities. Your next role could be a click away!
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Keep it between us</p>
                  <p className="text-xs text-muted-foreground">
                    No worries - your results stay private. You can always change your mind later in settings.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span>Your data is always protected under our privacy policy.</span>
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
            {consentMutation.isPending ? "Saving..." : "Keep it Private"}
          </Button>
          <Button 
            onClick={() => handleConsent(true)} 
            disabled={consentMutation.isPending}
            className="w-full sm:w-auto"
            data-testid="button-accept-sharing"
          >
            {consentMutation.isPending ? "Saving..." : "Yes, Show Me Off!"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
