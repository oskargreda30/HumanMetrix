import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";
import { FIT_QUESTIONS } from "../data/fit-questions";
import { AI_READINESS_QUESTIONS } from "../data/ai-readiness-questions";
import { AIQ_QUESTIONS } from "../data/aiq-questions";

export default function Assessment() {
  const { purchaseItemId } = useParams<{ purchaseItemId: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [resultId, setResultId] = useState<string | null>(null);

  const { data: availableAssessments, isLoading: loadingAssessments } = useQuery({
    queryKey: ["/api/available-assessments"],
    enabled: isAuthenticated,
  });

  const assessment = (availableAssessments as any[])?.find((a: any) => a.purchaseItemId === purchaseItemId);
  
  // Get questions based on assessment type
  const getQuestions = () => {
    if (!assessment) return [];
    switch (assessment.assessmentType) {
      case "fit":
        return FIT_QUESTIONS;
      case "ai-readiness":
        return AI_READINESS_QUESTIONS;
      case "aiq":
        return AIQ_QUESTIONS;
      default:
        return [];
    }
  };

  const questions = getQuestions();
  const currentQ = questions[currentQuestion];

  const startMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/assessments/start", { purchaseItemId });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setResultId(data.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start assessment",
        variant: "destructive",
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/assessments/${resultId}/submit`, { answers });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/available-assessments"] });
      toast({
        title: "Success",
        description: "Assessment submitted successfully!",
      });
      setLocation("/dashboard");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit assessment",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
    } else if (assessment && !resultId) {
      startMutation.mutate();
    }
  }, [isAuthenticated, assessment, resultId]);

  if (loadingAssessments || !assessment || !resultId || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleAnswerChange = (value: string) => {
    setAnswers({ ...answers, [currentQ.id]: value });
  };

  const handleNext = () => {
    if (!answers[currentQ.id]) {
      toast({
        title: "Please select an answer",
        description: "You must answer the current question before proceeding",
        variant: "destructive",
      });
      return;
    }
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) {
      toast({
        title: "Incomplete assessment",
        description: "Please answer all questions before submitting",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate();
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow py-16">
        <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {assessment.assessmentType.toUpperCase()} Assessment
            </h1>
            <p className="text-muted-foreground">
              Question {currentQuestion + 1} of {questions.length}
            </p>
            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <Card className="p-8 mb-6">
            <h2 className="text-xl font-semibold mb-6">{currentQ.text}</h2>
            <RadioGroup
              value={answers[currentQ.id] || ""}
              onValueChange={handleAnswerChange}
            >
              {currentQ.options.map((option: any) => (
                <div key={option.value} className="flex items-start space-x-3 mb-4 p-4 rounded-lg hover-elevate active-elevate-2">
                  <RadioGroupItem
                    value={option.value}
                    id={`${currentQ.id}-${option.value}`}
                    data-testid={`radio-${currentQ.id}-${option.value}`}
                  />
                  <Label
                    htmlFor={`${currentQ.id}-${option.value}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium mb-1">{option.value}.</div>
                    <div className="text-muted-foreground">{option.text}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              data-testid="button-previous"
            >
              Previous
            </Button>
            
            {currentQuestion === questions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                data-testid="button-submit-assessment"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Submit Assessment
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext} data-testid="button-next">
                Next
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
