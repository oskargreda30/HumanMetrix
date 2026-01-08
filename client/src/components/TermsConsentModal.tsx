import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, FileText, CheckCircle2, LayoutDashboard } from "lucide-react";

interface TermsConsentModalProps {
  open: boolean;
  onAccept: () => void;
}

export function TermsConsentModal({ open, onAccept }: TermsConsentModalProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [dataShareConsent, setDataShareConsent] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acceptTermsMutation = useMutation({
    mutationFn: async (data: { termsAccepted: boolean; dataShareConsent: boolean }) => {
      return apiRequest("POST", "/api/user/accept-terms", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome to HumanMetrix",
        description: "Your preferences have been saved. Let's begin your assessment journey.",
      });
      onAccept();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAccept = () => {
    if (!termsAccepted) return;
    acceptTermsMutation.mutate({ termsAccepted, dataShareConsent });
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[750px] [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl" data-testid="text-terms-modal-title">
              Welcome to HumanMetrix
            </DialogTitle>
          </div>
          <DialogDescription className="text-left">
            Before you begin your assessment journey, please review and accept our terms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Complete all assessments honestly and to the best of your ability
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Your results are confidential and will only be shared as you consent
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Assessment sessions should be completed independently without external assistance
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm text-muted-foreground">
            <p>By proceeding, you confirm that you:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Have read and agree to our Terms & Conditions and Privacy Policy</li>
              <li>Will complete assessments authentically and without third-party help</li>
              <li>Understand that your results help employers make fair hiring decisions</li>
            </ul>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="data-share"
                checked={dataShareConsent}
                onCheckedChange={(checked) => setDataShareConsent(checked === true)}
                data-testid="checkbox-data-share"
              />
              <Label 
                htmlFor="data-share" 
                className="text-sm font-normal leading-relaxed cursor-pointer"
              >
                I consent to HumanMetrix storing my assessment results and sharing them with potential employers on my behalf
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms-accept"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                data-testid="checkbox-terms-accept"
              />
              <Label 
                htmlFor="terms-accept" 
                className="text-sm font-normal leading-relaxed cursor-pointer"
              >
                <span>I have read and accept the </span>
                <a 
                  href="/terms" 
                  target="_blank" 
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms & Conditions
                </a>
                <span> and </span>
                <a 
                  href="/privacy" 
                  target="_blank" 
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </a>
              </Label>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleAccept}
            disabled={!termsAccepted || acceptTermsMutation.isPending}
            className="flex-1 gap-2"
            data-testid="button-start-assessment"
          >
            <FileText className="h-4 w-4" />
            {acceptTermsMutation.isPending ? "Saving..." : "Start My Assessment Journey"}
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!termsAccepted || acceptTermsMutation.isPending}
            variant="outline"
            className="flex-1 gap-2"
            data-testid="button-continue-dashboard"
          >
            <LayoutDashboard className="h-4 w-4" />
            {acceptTermsMutation.isPending ? "Saving..." : "Continue to Dashboard"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
