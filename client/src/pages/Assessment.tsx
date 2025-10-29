import { useEffect, useState, useRef } from "react";
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
import { Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FIT_QUESTIONS } from "../data/fit-questions";
import { AI_READINESS_QUESTIONS } from "../data/ai-readiness-questions";
import { AIQ_QUESTIONS } from "../data/aiq-questions";
import { PROMPT_ARCHITECTURE_LEVELS } from "../data/prompt-architecture-questions";
import { Textarea } from "@/components/ui/textarea";

export default function Assessment() {
  const { purchaseItemId } = useParams<{ purchaseItemId: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [resultId, setResultId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(1200); // 20 minutes in seconds
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      case "prompt-architecture":
        // Convert levels to question format
        return PROMPT_ARCHITECTURE_LEVELS.map(level => ({
          id: `level-${level.level}`,
          text: level.scenario,
          level: level.level,
          title: level.title,
          description: level.description,
          taskInstructions: level.taskInstructions,
          type: 'text-input' as const
        }));
      default:
        return [];
    }
  };

  const questions = getQuestions();
  const currentQ = questions[currentQuestion];
  const isPromptArchitecture = assessment?.assessmentType === 'prompt-architecture';

  const startMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/assessments/start", { purchaseItemId });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setResultId(data.id);
      // Set remaining time from server (prevents bypass by refreshing)
      if (data.timeRemaining !== undefined) {
        setTimeRemaining(data.timeRemaining);
      }
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

  // Timer effect
  useEffect(() => {
    if (!resultId) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        
        // Show warning at 5 minutes
        if (newTime === 300 && !showTimeWarning) {
          setShowTimeWarning(true);
          toast({
            title: "5 Minutes Remaining",
            description: "You have 5 minutes left to complete this assessment",
            variant: "destructive",
          });
        }
        
        // Auto-submit when time runs out
        if (newTime <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          
          // Auto-submit with current answers
          toast({
            title: "Time's Up!",
            description: "Assessment will be auto-submitted with current answers",
            variant: "destructive",
          });
          
          // Submit even if incomplete
          submitMutation.mutate();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [resultId, showTimeWarning, submitMutation]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAnswers({ ...answers, [currentQ.id]: e.target.value });
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
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {assessment.assessmentType.toUpperCase()} Assessment
                </h1>
                <p className="text-muted-foreground">
                  Question {currentQuestion + 1} of {questions.length}
                </p>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeRemaining <= 300 ? 'bg-destructive/10 text-destructive' : 'bg-muted'
              }`}>
                <Clock className="h-5 w-5" />
                <span className="text-lg font-semibold" data-testid="timer-display">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Time Warning */}
          {timeRemaining <= 300 && timeRemaining > 0 && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Time Running Out!</AlertTitle>
              <AlertDescription>
                You have less than 5 minutes remaining. Please complete your assessment soon.
              </AlertDescription>
            </Alert>
          )}

          {/* Question */}
          <Card className="p-8 mb-6">
            {isPromptArchitecture ? (
              // Prompt Architecture text input
              <div>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-2xl font-bold">Level {(currentQ as any).level}</h2>
                    <span className="text-sm text-muted-foreground">{(currentQ as any).title}</span>
                  </div>
                  <p className="text-muted-foreground mb-4">{(currentQ as any).description}</p>
                </div>
                
                <div className="mb-6 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Scenario:</h3>
                  <p className="text-sm">{currentQ.text}</p>
                </div>
                
                <div className="mb-6 p-4 bg-primary/5 border-l-4 border-primary rounded-lg">
                  <h3 className="font-semibold mb-2">Task:</h3>
                  <p className="text-sm">{(currentQ as any).taskInstructions}</p>
                </div>
                
                <div>
                  <Label htmlFor={`prompt-${currentQ.id}`} className="text-base font-semibold mb-2 block">
                    Your Prompt:
                  </Label>
                  <Textarea
                    id={`prompt-${currentQ.id}`}
                    placeholder="Write your prompt here... Be specific, clear, and creative!"
                    value={answers[currentQ.id] || ""}
                    onChange={handleTextChange}
                    className="min-h-[200px] text-base"
                    data-testid={`input-prompt-${currentQ.id}`}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Your prompt will be evaluated by GPT-4o on clarity, structure, context relevance, creativity, and iterative improvement.
                  </p>
                </div>
              </div>
            ) : (
              // Multiple choice questions (FIT, AI Readiness, AIQ)
              <div>
                <h2 className="text-xl font-semibold mb-6">{currentQ.text}</h2>
                <RadioGroup
                  value={answers[currentQ.id] || ""}
                  onValueChange={handleAnswerChange}
                >
                  {(currentQ as any).options?.map((option: any) => (
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
              </div>
            )}
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
