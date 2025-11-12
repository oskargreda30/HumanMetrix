import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Info } from "lucide-react";
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
    description: "7 progressive levels testing prompt design skills, evaluated by an AI model",
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

const BASE_FEE = 0.30;

export default function Purchase() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedAssessments, setSelectedAssessments] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

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

  const handleSubmit = async () => {
    if (selectedAssessments.size === 0) {
      toast({
        title: "No assessments selected",
        description: "Please select at least one assessment to continue.",
        variant: "destructive"
      });
      return;
    }

    // If not logged in, require name and email
    if (!user) {
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        toast({
          title: "Details required",
          description: "Please enter your name and email to continue.",
          variant: "destructive"
        });
        return;
      }

      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email address.",
          variant: "destructive"
        });
        return;
      }
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
        throw new Error(error.message || "Failed to create invitation");
      }

      const data = await response.json();
      
      toast({
        title: "Success!",
        description: "Check your email for instructions to start your assessments.",
      });

      // Redirect to login or dashboard
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
            <h1 className="text-4xl font-bold mb-4">Select Your Assessments</h1>
            <p className="text-xl text-muted-foreground">
              Choose your assessments and enter your details to get started
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Complete your assessments first, then pay to unlock your results
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Assessment Selection */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Available Assessments</h2>
                <p className="text-muted-foreground">
                  Select one or more assessments to take
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
                        <div className="text-xs text-muted-foreground">per test</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Summary and Details Form */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-4">
                <div className="flex items-center gap-2 mb-6">
                  <CheckCircle2 className="h-5 w-5" />
                  <h2 className="text-xl font-bold">Get Started</h2>
                </div>

                {selectedAssessments.size === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No assessments selected</p>
                    <p className="text-xs mt-1">Select assessments to continue</p>
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
                      <span className="text-lg font-bold">Total Price</span>
                      <span className="text-2xl font-bold" data-testid="text-total">
                        £{total.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-6">
                      <p className="text-xs text-blue-900 dark:text-blue-100">
                        💡 Payment required only after completing assessments to unlock results
                      </p>
                    </div>

                    {!user && (
                      <>
                        <Separator className="my-4" />
                        
                        <div className="space-y-4 mb-6">
                          <h3 className="text-sm font-semibold">Your Details</h3>
                          
                          <div>
                            <Label htmlFor="firstName" className="text-sm">First Name</Label>
                            <Input
                              id="firstName"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              placeholder="John"
                              data-testid="input-first-name"
                              disabled={isProcessing}
                            />
                          </div>

                          <div>
                            <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                            <Input
                              id="lastName"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              placeholder="Doe"
                              data-testid="input-last-name"
                              disabled={isProcessing}
                            />
                          </div>

                          <div>
                            <Label htmlFor="email" className="text-sm">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="john@example.com"
                              data-testid="input-email"
                              disabled={isProcessing}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handleSubmit}
                      disabled={isProcessing}
                      data-testid="button-get-started"
                    >
                      {isProcessing ? "Processing..." : "Get Started"}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center mt-4">
                      You'll receive an email with access to your assessments
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
