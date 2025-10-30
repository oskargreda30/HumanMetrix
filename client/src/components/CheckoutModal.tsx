import { useState, useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { ShoppingCart, CreditCard, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const assessments = [
  {
    id: "fit",
    name: "FIT Assessment",
    description: "15 questions • 6 behavioral skills",
    price: 0.01,
  },
  {
    id: "ai-readiness",
    name: "AI Readiness Assessment",
    description: "21 questions • 9 AI skills",
    price: 0.01,
  },
  {
    id: "prompt-architecture",
    name: "Prompt Architecture Assessment",
    description: "7 progressive levels",
    price: 0.01,
  },
  {
    id: "aiq",
    name: "Algorithmic Integrity Quotient (AIQ)",
    description: "4 questions + rationales",
    price: 0.01,
  },
];

const BASE_FEE = 0.02;

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedAssessmentId?: string | null;
}

export default function CheckoutModal({
  open,
  onOpenChange,
  preselectedAssessmentId,
}: CheckoutModalProps) {
  const { toast } = useToast();
  const [selectedAssessments, setSelectedAssessments] = useState<Set<string>>(new Set());
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (preselectedAssessmentId && open) {
      setSelectedAssessments(new Set([preselectedAssessmentId]));
    }
  }, [preselectedAssessmentId, open]);

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedAssessments);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAssessments(newSelected);
  };

  const selectedItems = assessments.filter((a) => selectedAssessments.has(a.id));
  const assessmentsTotal = selectedItems.reduce((sum, a) => sum + a.price, 0);
  const total = selectedAssessments.size > 0 ? BASE_FEE + assessmentsTotal : 0;

  const handleCheckout = async () => {
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
      const response = await fetch("/api/create-checkout-session-guest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assessmentIds: Array.from(selectedAssessments),
          customerEmail: email,
          customerName: `${firstName} ${lastName}`,
          firstName,
          lastName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create checkout session");
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      toast({
        title: "Checkout Error",
        description: error.message || "Failed to initiate checkout. Please try again.",
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
            <ShoppingCart className="h-5 w-5" />
            Purchase Assessments
          </DialogTitle>
          <DialogDescription>
            Select the assessments you'd like to take and enter your details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assessment Selection */}
          <div>
            <h3 className="font-semibold mb-3">Select Assessments</h3>
            <div className="space-y-2">
              {assessments.map((assessment) => (
                <Card
                  key={assessment.id}
                  className="p-4 hover-elevate cursor-pointer"
                  onClick={() => handleToggle(assessment.id)}
                  data-testid={`checkout-card-${assessment.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`checkout-${assessment.id}`}
                      checked={selectedAssessments.has(assessment.id)}
                      onCheckedChange={() => handleToggle(assessment.id)}
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`checkout-checkbox-${assessment.id}`}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`checkout-${assessment.id}`}
                        className="font-medium cursor-pointer"
                      >
                        {assessment.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {assessment.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">£{assessment.price.toFixed(2)}</div>
                    </div>
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
                  We'll send your login credentials to this email after purchase
                </p>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <Separator className="mb-4" />
            {selectedAssessments.size === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Info className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select at least one assessment to continue</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base computation fee</span>
                    <span className="font-medium">£{BASE_FEE.toFixed(2)}</span>
                  </div>

                  {selectedItems.map((assessment) => (
                    <div key={assessment.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{assessment.name}</span>
                      <span className="font-medium">£{assessment.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-bold" data-testid="checkout-total">
                    £{total.toFixed(2)}
                  </span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  data-testid="checkout-button-proceed"
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  {isProcessing ? "Processing..." : "Proceed to Payment"}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-3">
                  Secure payment powered by Stripe
                </p>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
