import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { BasketItem } from "@/contexts/BasketContext";

const assessments = [
  {
    id: "fit",
    name: "FIT Assessment",
    description: "15 questions • 6 behavioral skills",
    duration: "20 min",
  },
  {
    id: "ai_readiness",
    name: "AI Readiness Assessment",
    description: "21 questions • 9 AI skills",
    duration: "30 min",
  },
  {
    id: "prompt_architecture",
    name: "Prompt Architecture Assessment",
    description: "7 progressive levels",
    duration: "14 min",
  },
  {
    id: "aiq",
    name: "Algorithmic Integrity Quotient (AIQ)",
    description: "4 questions + rationales",
    duration: "20 min",
  },
];

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedAssessmentId?: string | null;
  basketItems?: BasketItem[];
}

export default function CheckoutModal({
  open,
  onOpenChange,
  preselectedAssessmentId,
  basketItems,
}: CheckoutModalProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedAssessments, setSelectedAssessments] = useState<Set<string>>(new Set());
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset all state when modal closes
      setSelectedAssessments(new Set());
      setFirstName("");
      setLastName("");
      setEmail("");
      setIsProcessing(false);
      return;
    }
    
    // Set initial selections when modal opens
    if (basketItems && basketItems.length > 0) {
      setSelectedAssessments(new Set(basketItems.map(item => item.id)));
    } else if (preselectedAssessmentId) {
      setSelectedAssessments(new Set([preselectedAssessmentId]));
    } else {
      setSelectedAssessments(new Set());
    }
  }, [preselectedAssessmentId, basketItems, open]);

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedAssessments);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAssessments(newSelected);
  };

  const handleProceed = async () => {
    if (selectedAssessments.size === 0) {
      toast({
        title: "No assessments selected",
        description: "Please select at least one assessment to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields (name and email).",
        variant: "destructive",
      });
      return;
    }

    if (!email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/create-free-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assessmentIds: Array.from(selectedAssessments),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create account");
      }

      const data = await response.json();
      
      toast({
        title: "Success!",
        description: data.message,
      });

      // Reset processing state before navigation
      setIsProcessing(false);

      // Close modal and navigate
      onOpenChange(false);
      if (data.requiresLogin) {
        setTimeout(() => {
          setLocation("/login?message=check-email");
        }, 2000);
      } else {
        setTimeout(() => {
          setLocation("/dashboard");
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process request. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Get Started with HumanMetrix
          </DialogTitle>
          <DialogDescription>
            Choose your assessments and enter your details. Take all assessments for free, pay only to unlock results.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assessment Selection */}
          <div>
            <h3 className="font-semibold mb-3">Choose Assessments</h3>
            <div className="space-y-2">
              {assessments.map((assessment) => (
                <Card
                  key={assessment.id}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedAssessments.has(assessment.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover-elevate'
                  }`}
                  onClick={() => handleToggle(assessment.id)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && e.currentTarget === e.target) {
                      e.preventDefault();
                      handleToggle(assessment.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selectedAssessments.has(assessment.id)}
                  data-testid={`checkout-card-${assessment.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`checkout-${assessment.id}`}
                      checked={selectedAssessments.has(assessment.id)}
                      onCheckedChange={() => handleToggle(assessment.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-labelledby={`checkout-title-${assessment.id}`}
                      data-testid={`checkout-checkbox-${assessment.id}`}
                    />
                    <div className="flex-1">
                      <div
                        id={`checkout-title-${assessment.id}`}
                        className="font-medium cursor-pointer"
                      >
                        {assessment.name}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {assessment.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {assessment.duration}
                        </span>
                      </div>
                    </div>
                    {selectedAssessments.has(assessment.id) && (
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Customer Details */}
          <div>
            <h3 className="font-semibold mb-3">Your Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkout-firstname">First Name</Label>
                  <Input
                    id="checkout-firstname"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    data-testid="checkout-input-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout-lastname">Last Name</Label>
                  <Input
                    id="checkout-lastname"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    data-testid="checkout-input-lastname"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkout-email">Email Address</Label>
                <Input
                  id="checkout-email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="checkout-input-email"
                />
                <p className="text-xs text-muted-foreground">
                  We'll send your login credentials to this email
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              ✨ What happens next?
            </p>
            <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Complete all selected assessments</li>
              <li>Submit your results and payment</li>
              <li>Download your results</li>
            </ol>
          </div>

          {/* Proceed Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleProceed}
            disabled={isProcessing || selectedAssessments.size === 0}
            data-testid="checkout-button-proceed"
          >
            {isProcessing ? "Processing..." : "Get Started"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
