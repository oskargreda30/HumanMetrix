import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Info, Clock, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { isValidEmail, isValidName } from "@/lib/validation";
import { SEO } from "@/lib/seo";

type Assessment = {
  id: string;
  name: string;
  description: string;
  duration: string;
  questions: number;
  skills?: number;
};

const assessments: Assessment[] = [
  {
    id: "fit",
    name: "FIT Assessment",
    description: "Measures 6 core behavioral skills including High Agency, Resilience, and Empathy & Ethics",
    duration: "20 min",
    questions: 15,
    skills: 6
  },
  {
    id: "ai_readiness",
    name: "AI Readiness Assessment",
    description: "Evaluates 9 AI skills from AI Literacy to Cross-functional Collaboration",
    duration: "20 min",
    questions: 21,
    skills: 9
  },
  {
    id: "prompt_architecture",
    name: "Prompt Architecture Assessment",
    description: "7 progressive levels testing prompt design skills, evaluated by an AI model",
    duration: "14 min",
    questions: 7
  },
  {
    id: "aiq",
    name: "Algorithmic Integrity Quotient (AIQ)",
    description: "Tests understanding of AI ethics, bias, fairness, transparency, and responsible deployment",
    duration: "20 min",
    questions: 8
  }
];

export default function Purchase() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedAssessments, setSelectedAssessments] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Pre-fill user data if logged in
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedAssessments);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAssessments(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedAssessments.size === 0) {
      toast({
        title: "No assessments selected",
        description: "Please select at least one assessment to continue.",
        variant: "destructive"
      });
      return;
    }

    // If logged in, validate that the entered email matches their account email
    if (user && email.trim() && email.toLowerCase() !== user.email.toLowerCase()) {
      toast({
        title: "Email mismatch",
        description: "The email address associated with this account must be used. Otherwise, a new account must be created.",
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

      if (!isValidName(firstName)) {
        toast({
          title: "Invalid first name",
          description: "First name contains invalid characters.",
          variant: "destructive"
        });
        return;
      }
      
      if (!isValidName(lastName)) {
        toast({
          title: "Invalid last name",
          description: "Last name contains invalid characters.",
          variant: "destructive"
        });
        return;
      }

      if (!isValidEmail(email)) {
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
      // Logged-in users: create free purchase (payment-deferred model)
      if (user) {
        const response = await fetch("/api/create-free-purchase", {
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
          if (response.status === 401) {
            throw new Error("Your session has expired. Please log in again.");
          }
          throw new Error(error.message || "Failed to add assessments");
        }

        const data = await response.json();
        
        toast({
          title: "Success!",
          description: data.message,
        });
        
        // Clear basket
        localStorage.removeItem("humanmetrix-basket");
        
        // Invalidate cache and refetch immediately 
        await queryClient.invalidateQueries({ queryKey: ["/api/available-assessments"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/purchases-with-results"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
        // Force refetch after invalidation
        await queryClient.refetchQueries({ queryKey: ["/api/available-assessments"] });
        await queryClient.refetchQueries({ queryKey: ["/api/purchases-with-results"] });
        
        // Redirect to dashboard with refresh flag to force component update
        setTimeout(() => {
          setLocation("/dashboard?refresh=" + Date.now());
        }, 1500);
      } else {
        // Guest users: create free invitation with email
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

        // Redirect to login or dashboard
        if (data.requiresLogin) {
          setTimeout(() => {
            setLocation("/login?message=check-email");
          }, 2000);
        } else {
          // Invalidate and refetch before redirect
          await queryClient.invalidateQueries({ queryKey: ["/api/available-assessments"] });
          await queryClient.invalidateQueries({ queryKey: ["/api/purchases-with-results"] });
          await queryClient.refetchQueries({ queryKey: ["/api/available-assessments"] });
          await queryClient.refetchQueries({ queryKey: ["/api/purchases-with-results"] });
          setTimeout(() => {
            setLocation("/dashboard?refresh=" + Date.now());
          }, 2000);
        }
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
      <SEO 
        title="Buy Psychometric Tests - Start Assessment"
        description="Start your HumanMetrix psychometric assessments. Select FIT, AI Readiness, Prompt Architecture or AIQ tests. Complete free, pay only to unlock results."
        canonical="/purchase"
        keywords="buy psychometric tests, online assessments, pre-employment testing purchase, AI readiness test, FIT assessment"
      />
      <Navigation />
      
      <main className="flex-grow py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold mb-4">Get Started with HumanMetrix</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Select your assessments and take them for free. Pay only when you're ready to unlock your results.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Assessment Selection */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Choose Your Assessments</h2>
                <p className="text-muted-foreground">
                  Select one or more assessments to get started
                </p>
              </div>

              <div className="space-y-4">
                {assessments.map((assessment) => (
                  <Card 
                    key={assessment.id} 
                    className={`p-6 cursor-pointer transition-all ${
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
                    data-testid={`card-assessment-${assessment.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        id={assessment.id}
                        checked={selectedAssessments.has(assessment.id)}
                        onCheckedChange={() => handleToggle(assessment.id)}
                        className="mt-1"
                        data-testid={`checkbox-${assessment.id}`}
                        onClick={(e) => e.stopPropagation()}
                        aria-labelledby={`assessment-title-${assessment.id}`}
                      />
                      <div className="flex-1">
                        <div 
                          id={`assessment-title-${assessment.id}`}
                          className="text-lg font-semibold cursor-pointer"
                        >
                          {assessment.name}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 mb-3">
                          {assessment.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {assessment.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {assessment.questions} questions
                          </span>
                          {assessment.skills && (
                            <span>{assessment.skills} skills measured</span>
                          )}
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

            {/* Details Form */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-4">
                <h2 className="text-xl font-bold mb-4">Your Details</h2>

                {selectedAssessments.size === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Select assessments to get started</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-4 mb-6">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                        ✨ {user ? "Add More Assessments" : "How it works"}
                      </p>
                      {user ? (
                        <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                          <li>Select additional assessments</li>
                          <li>Take them at your own pace</li>
                          <li>Pay only to unlock results</li>
                        </ol>
                      ) : (
                        <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                          <li>Take all assessments for free</li>
                          <li>Complete at your own pace</li>
                          <li>Pay only to unlock results</li>
                        </ol>
                      )}
                    </div>

                    <div className="space-y-4 mb-6">
                      {user && (
                        <p className="text-xs text-muted-foreground mb-2">
                          Using account details:
                        </p>
                      )}
                      <div>
                        <Label htmlFor="firstName" className="text-sm">First Name {!user && "*"}</Label>
                        <Input
                          id="firstName"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="John"
                          className="mt-1"
                          disabled={isProcessing || !!user}
                          data-testid="input-firstName"
                        />
                      </div>

                      <div>
                        <Label htmlFor="lastName" className="text-sm">Last Name {!user && "*"}</Label>
                        <Input
                          id="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Doe"
                          className="mt-1"
                          disabled={isProcessing || !!user}
                          data-testid="input-lastName"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-sm">Email {!user && "*"}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="mt-1"
                          disabled={isProcessing || !!user}
                          data-testid="input-email"
                        />
                        {user && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Assessment invitations and receipts will be sent here
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <h3 className="text-sm font-semibold">Selected Assessments</h3>
                      {Array.from(selectedAssessments).map((id) => {
                        const assessment = assessments.find(a => a.id === id);
                        return assessment ? (
                          <div key={id} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{assessment.name}</span>
                          </div>
                        ) : null;
                      })}
                    </div>

                    <Button 
                      onClick={handleSubmit}
                      disabled={isProcessing || (!user && (!firstName || !lastName || !email))}
                      className="w-full"
                      size="lg"
                      data-testid="button-continue"
                    >
                      {isProcessing ? "Processing..." : "Get Started"}
                    </Button>

                    {!user && (
                      <p className="text-xs text-center text-muted-foreground mt-4">
                        You'll receive an email with your login credentials to start your assessments
                      </p>
                    )}
                    
                    {user && (
                      <p className="text-xs text-center text-muted-foreground mt-4">
                        Take assessments for free. Pay only when you're ready to unlock your results.
                      </p>
                    )}
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
