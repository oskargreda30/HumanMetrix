import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, CreditCard, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Assessment = {
  id: string;
  name: string;
  description: string;
  price: number;
  questions: number;
  skills?: number;
};

const assessments: Assessment[] = [
  {
    id: "fit",
    name: "FIT Assessment",
    description: "Measures 6 core behavioral skills including High Agency, Resilience, and Empathy & Ethics",
    price: 0.01,
    questions: 15,
    skills: 6
  },
  {
    id: "ai-readiness",
    name: "AI Readiness Assessment",
    description: "Evaluates 9 AI skills from AI Literacy to Cross-functional Collaboration",
    price: 0.01,
    questions: 21,
    skills: 9
  },
  {
    id: "prompt-architecture",
    name: "Prompt Architecture Assessment",
    description: "7 progressive levels testing prompt design skills, evaluated by GPT-4o",
    price: 0.01,
    questions: 7
  },
  {
    id: "aiq",
    name: "Algorithmic Integrity Quotient (AIQ)",
    description: "Tests understanding of AI ethics, bias, fairness, transparency, and responsible deployment",
    price: 0.01,
    questions: 4
  }
];

const BASE_FEE = 0.02;

export default function Purchase() {
  const { toast } = useToast();
  const [selectedAssessments, setSelectedAssessments] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"]
  });

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedAssessments);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAssessments(newSelected);
  };

  const selectedItems = assessments.filter(a => selectedAssessments.has(a.id));
  const assessmentsTotal = selectedItems.reduce((sum, a) => sum + a.price, 0);
  const total = selectedAssessments.size > 0 ? BASE_FEE + assessmentsTotal : 0;

  const handleCheckout = async () => {
    if (selectedAssessments.size === 0) {
      toast({
        title: "No assessments selected",
        description: "Please select at least one assessment to continue.",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to purchase assessments.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assessmentIds: Array.from(selectedAssessments),
        }),
        credentials: "include",
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
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-grow py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold mb-4">Purchase Assessments</h1>
            <p className="text-xl text-muted-foreground">
              Select the assessments you'd like to take and complete your purchase
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Assessment Selection */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Available Assessments</h2>
                <p className="text-muted-foreground">
                  Select one or more assessments to add to your cart
                </p>
              </div>

              <div className="space-y-4">
                {assessments.map((assessment) => (
                  <Card 
                    key={assessment.id} 
                    className="p-6 hover-elevate"
                    data-testid={`card-assessment-${assessment.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        id={assessment.id}
                        checked={selectedAssessments.has(assessment.id)}
                        onCheckedChange={() => handleToggle(assessment.id)}
                        className="mt-1"
                        data-testid={`checkbox-${assessment.id}`}
                      />
                      <div className="flex-1 cursor-pointer" onClick={() => handleToggle(assessment.id)}>
                        <Label 
                          htmlFor={assessment.id}
                          className="text-lg font-semibold cursor-pointer"
                        >
                          {assessment.name}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1 mb-3">
                          {assessment.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{assessment.questions} questions</span>
                          {assessment.skills && <span>{assessment.skills} skills measured</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          £{assessment.price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-4">
                <div className="flex items-center gap-2 mb-6">
                  <ShoppingCart className="h-5 w-5" />
                  <h2 className="text-xl font-bold">Order Summary</h2>
                </div>

                {selectedAssessments.size === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No assessments selected</p>
                    <p className="text-xs mt-1">Select assessments to see your total</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
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

                    <div className="flex justify-between items-center mb-6">
                      <span className="text-lg font-bold">Total</span>
                      <span className="text-2xl font-bold" data-testid="text-total">
                        £{total.toFixed(2)}
                      </span>
                    </div>

                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handleCheckout}
                      disabled={isProcessing}
                      data-testid="button-checkout"
                    >
                      <CreditCard className="mr-2 h-5 w-5" />
                      {isProcessing ? "Processing..." : "Proceed to Checkout"}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center mt-4">
                      Secure payment powered by Stripe
                    </p>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
