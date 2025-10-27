import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AssessmentCard from "@/components/AssessmentCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, Sparkles, Code2, Shield, Network, Languages, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const assessments = [
  {
    id: "fit",
    title: "FIT Assessment",
    description: "Measure 6 core behavioral skills: High Agency, Intellectual Curiosity, Resilience, Empathy & Ethics, Growth Mindset, and Interpersonal Agility.",
    questionCount: 15,
    duration: "20 min",
    price: "£3.50",
    icon: Brain,
    status: "available" as const,
  },
  {
    id: "ai-readiness",
    title: "AI Readiness Assessment",
    description: "Comprehensive evaluation of your ability to work effectively with AI systems, from prompt engineering to ethical AI usage.",
    questionCount: 21,
    duration: "30 min",
    price: "£4.50",
    icon: Sparkles,
    status: "available" as const,
  },
  {
    id: "prompt-architecture",
    title: "Prompt Architecture Assessment",
    description: "Test your ability to design effective prompts across 7 progressive difficulty levels, evaluated by GPT-5.",
    questionCount: 7,
    duration: "25 min",
    price: "£5.00",
    icon: Code2,
    status: "available" as const,
  },
  {
    id: "aiq",
    title: "Algorithmic Integrity Quotient (AIQ)",
    description: "Evaluate your understanding of AI ethics, bias, fairness, and responsible deployment practices.",
    questionCount: 8,
    duration: "20 min",
    price: "£4.00",
    icon: Shield,
    status: "available" as const,
  },
  {
    id: "logic-flow",
    title: "Logic Flow Assessment",
    description: "Coming soon: Advanced assessment of logical reasoning and systematic problem-solving abilities.",
    questionCount: 12,
    duration: "25 min",
    price: "TBA",
    icon: Network,
    status: "coming-soon" as const,
  },
  {
    id: "ai-translator",
    title: "AI Output Translator",
    description: "Coming soon: Test your ability to interpret, refine, and communicate AI-generated content effectively.",
    questionCount: 10,
    duration: "20 min",
    price: "TBA",
    icon: Languages,
    status: "coming-soon" as const,
  },
];

export default function Assessments() {
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const toggleAssessment = (id: string) => {
    setSelectedAssessments((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const availableAssessments = assessments.filter((a) => a.status === "available");
  const selectedItems = availableAssessments.filter((a) => selectedAssessments.includes(a.id));
  
  const baseFee = 15;
  const assessmentTotal = selectedItems.reduce((sum, item) => {
    return sum + parseFloat(item.price.replace("£", ""));
  }, 0);
  const total = selectedAssessments.length > 0 ? baseFee + assessmentTotal : 0;

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/create-checkout-session", "POST", {
        assessmentTypes: selectedAssessments,
      });
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = () => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }

    if (selectedAssessments.length === 0) {
      toast({
        title: "No assessments selected",
        description: "Please select at least one assessment to continue",
        variant: "destructive",
      });
      return;
    }

    checkoutMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Choose Your Assessments
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select the assessments you'd like to complete. Pay once and access your professional results forever.
            </p>
          </div>
        </section>

        {/* Assessment Selection */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Assessment Cards */}
              <div className="lg:col-span-2">
                <div className="grid md:grid-cols-2 gap-6">
                  {assessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className={`cursor-pointer transition-all ${
                        selectedAssessments.includes(assessment.id)
                          ? "ring-2 ring-primary rounded-xl"
                          : ""
                      } ${assessment.status === "coming-soon" ? "opacity-60" : ""}`}
                      onClick={() => {
                        if (assessment.status === "available") {
                          toggleAssessment(assessment.id);
                        }
                      }}
                    >
                      <AssessmentCard
                        {...assessment}
                        onSelect={() => {
                          if (assessment.status === "available") {
                            toggleAssessment(assessment.id);
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Checkout Summary - Sticky */}
              <div className="lg:col-span-1">
                <Card className="p-6 sticky top-24">
                  <h3 className="text-xl font-semibold mb-6">Order Summary</h3>

                  {selectedAssessments.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-sm">Select assessments to begin</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 mb-6">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Base computation fee</span>
                          <span className="font-mono">£15.00</span>
                        </div>
                        {selectedItems.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{item.title}</span>
                            <span className="font-mono">{item.price}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t mb-6">
                        <div className="flex justify-between items-baseline">
                          <span className="font-semibold">Total</span>
                          <span className="text-3xl font-bold font-mono" data-testid="text-total-price">
                            £{total.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handleCheckout}
                        disabled={checkoutMutation.isPending}
                        data-testid="button-checkout"
                      >
                        {checkoutMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating checkout...
                          </>
                        ) : (
                          "Proceed to Checkout"
                        )}
                      </Button>

                      <div className="mt-4 text-xs text-muted-foreground text-center">
                        Secure payment powered by Stripe
                      </div>
                    </>
                  )}

                  <div className="mt-6 pt-6 border-t space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      <span>Instant access after payment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      <span>Professional PDF results</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      <span>Lifetime access to results</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
