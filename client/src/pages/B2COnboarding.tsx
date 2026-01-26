import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle2, FileText, Mail, Shield, ArrowRight } from "lucide-react";

export default function B2COnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [dataRetentionConsent, setDataRetentionConsent] = useState(false);

  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: { termsAccepted: boolean; marketingOptIn: boolean; dataRetentionConsent: boolean }) => {
      const response = await apiRequest("POST", "/api/user/onboarding-preferences", preferences);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Preferences saved",
        description: "Welcome to HumanMetrix! You can now view your assessment results.",
      });
      setLocation("/my-results");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences",
        variant: "destructive",
      });
    },
  });

  const handleContinue = () => {
    if (!termsAccepted) {
      toast({
        title: "Terms required",
        description: "Please accept the terms and conditions to continue",
        variant: "destructive",
      });
      return;
    }
    
    updatePreferencesMutation.mutate({
      termsAccepted,
      marketingOptIn,
      dataRetentionConsent,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
      
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      
      <Card className="relative w-full max-w-lg bg-white/95 backdrop-blur-sm shadow-2xl border-0">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Welcome to HumanMetrix
          </CardTitle>
          <CardDescription className="text-slate-600 text-base mt-2">
            Your account has been created. Please review and accept the following to access your results.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-slate-50">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                data-testid="checkbox-terms"
              />
              <div className="flex-1">
                <Label htmlFor="terms" className="text-sm font-medium text-slate-900 cursor-pointer flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cyan-600" />
                  Accept Terms and Conditions *
                </Label>
                <p className="text-xs text-slate-500 mt-1">
                  I agree to the{" "}
                  <a href="/terms" target="_blank" className="text-cyan-600 underline">Terms of Service</a>
                  {" "}and{" "}
                  <a href="/privacy" target="_blank" className="text-cyan-600 underline">Privacy Policy</a>
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-slate-50">
              <Checkbox
                id="marketing"
                checked={marketingOptIn}
                onCheckedChange={(checked) => setMarketingOptIn(checked as boolean)}
                data-testid="checkbox-marketing"
              />
              <div className="flex-1">
                <Label htmlFor="marketing" className="text-sm font-medium text-slate-900 cursor-pointer flex items-center gap-2">
                  <Mail className="h-4 w-4 text-cyan-600" />
                  Receive Marketing Communications
                </Label>
                <p className="text-xs text-slate-500 mt-1">
                  Get career tips, industry insights, and exclusive offers from HumanMetrix
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-slate-50">
              <Checkbox
                id="retention"
                checked={dataRetentionConsent}
                onCheckedChange={(checked) => setDataRetentionConsent(checked as boolean)}
                data-testid="checkbox-retention"
              />
              <div className="flex-1">
                <Label htmlFor="retention" className="text-sm font-medium text-slate-900 cursor-pointer flex items-center gap-2">
                  <Shield className="h-4 w-4 text-cyan-600" />
                  Results Retention Consent
                </Label>
                <p className="text-xs text-slate-500 mt-1">
                  Allow HumanMetrix to retain your assessment results for career development and future opportunities
                </p>
              </div>
            </div>
          </div>
          
          <Button
            onClick={handleContinue}
            disabled={!termsAccepted || updatePreferencesMutation.isPending}
            className="w-full"
            data-testid="button-continue"
          >
            {updatePreferencesMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                Continue to Your Results
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          
          <p className="text-xs text-center text-slate-500">
            * Required to continue
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
