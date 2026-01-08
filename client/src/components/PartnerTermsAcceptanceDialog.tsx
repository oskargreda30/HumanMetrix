import { useState } from "react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PartnerTermsAcceptanceDialogProps {
  open: boolean;
  onAccepted: () => void;
}

export default function PartnerTermsAcceptanceDialog({
  open,
  onAccepted,
}: PartnerTermsAcceptanceDialogProps) {
  const [eulaAccepted, setEulaAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const canProceed = eulaAccepted && privacyAccepted;

  const handleAccept = async () => {
    if (!canProceed) return;

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/partner/me/accept-terms");
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me"] });
      toast({
        title: "Terms accepted",
        description: "Welcome to HumanMetrix Partner Dashboard!",
      });
      onAccepted();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save your acceptance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[500px]" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" />
            Welcome to HumanMetrix Partner Dashboard
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Before you can access your dashboard, please review and accept our terms.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            HumanMetrix provides AI-powered assessment tools to help you evaluate job candidates. 
            Our platform is designed as an advisory tool to support your hiring decisions, with 
            final employment decisions remaining with your organization.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="eula-accept"
                checked={eulaAccepted}
                onCheckedChange={(checked) => setEulaAccepted(checked === true)}
                data-testid="checkbox-accept-eula"
              />
              <Label 
                htmlFor="eula-accept" 
                className="text-sm leading-relaxed cursor-pointer"
              >
                I have read and accept the{" "}
                <Link href="/eula" target="_blank">
                  <span className="text-primary hover:underline font-medium">
                    End User License Agreement (EULA)
                  </span>
                </Link>
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="privacy-accept"
                checked={privacyAccepted}
                onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
                data-testid="checkbox-accept-privacy"
              />
              <Label 
                htmlFor="privacy-accept" 
                className="text-sm leading-relaxed cursor-pointer"
              >
                I have read and accept the{" "}
                <Link href="/privacy" target="_blank">
                  <span className="text-primary hover:underline font-medium">
                    Privacy Policy
                  </span>
                </Link>
              </Label>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span>
              Your acceptance will be recorded and you can access these documents at any time from the footer.
            </span>
          </div>
        </div>

        <Button
          onClick={handleAccept}
          disabled={!canProceed || isSubmitting}
          className="w-full"
          size="lg"
          data-testid="button-continue-dashboard"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Continue to Dashboard"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
