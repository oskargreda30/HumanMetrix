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
import { Loader2, CheckCircle2, Clock, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FIT_QUESTIONS } from "../data/fit-questions";
import { AI_READINESS_QUESTIONS } from "../data/ai-readiness-questions";
import { AIQ_QUESTIONS } from "../data/aiq-questions";
import { PROMPT_ARCHITECTURE_LEVELS } from "../data/prompt-architecture-questions";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatAssessmentName, isAllAssessmentsComplete } from "@/lib/assessmentHelpers";
import { AssessmentCompletionDialog } from "@/components/AssessmentCompletionDialog";

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
  const [showInstructions, setShowInstructions] = useState(true); // Show instructions before starting
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [isPaidUser, setIsPaidUser] = useState(true); // Default to true
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: availableAssessments, isLoading: loadingAssessments } = useQuery({
    queryKey: ["/api/available-assessments"],
    enabled: isAuthenticated,
  });

  const assessmentsArray = (availableAssessments as any)?.assessments || [];
  const assessment = assessmentsArray.find((a: any) => a.purchaseItemId === purchaseItemId);
  
  // Get questions based on assessment type
  const getQuestions = () => {
    if (!assessment) return [];
    // Normalize assessment type (handle both hyphens and underscores)
    const type = assessment.assessmentType.replace(/-/g, '_');
    
    switch (type) {
      case "fit":
        return FIT_QUESTIONS;
      case "ai_readiness":
        return AI_READINESS_QUESTIONS;
      case "aiq":
        return AIQ_QUESTIONS;
      case "prompt_architecture":
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
        console.error(`Unknown assessment type: ${assessment.assessmentType}`);
        return [];
    }
  };

  const questions = getQuestions();
  const currentQ = questions[currentQuestion];
  const isPromptArchitecture = assessment?.assessmentType === 'prompt_architecture' || assessment?.assessmentType === 'prompt-architecture';

  const startMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/assessments/start", { purchaseItemId });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setResultId(data.id);
      setShowInstructions(false); // Only close instructions AFTER successful start
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
      // Stop the timer immediately when submitting
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Use 3-minute timeout for assessment submission (Prompt Architecture can take 2-3 minutes)
      const response = await apiRequest("POST", `/api/assessments/${resultId}/submit`, { answers }, { timeoutMs: 180000 });
      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/available-assessments"] });
      
      toast({
        title: "Success",
        description: "Assessment submitted successfully!",
      });
      
      // Always redirect to dashboard after submission
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      const message = error?.error === 'quota_exceeded' 
        ? "OpenAI API quota exceeded. Please add credits to your OpenAI account to complete this assessment."
        : "Failed to submit assessment. Please try again.";
      
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
    }
    // Don't auto-start - wait for user to click "Begin" in instructions dialog
  }, [isAuthenticated]);

  // Auto-logout when user closes window/tab during assessment
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (resultId && !submitMutation.isSuccess) {
        // Log the user out when they close the window during an active assessment
        try {
          await fetch('/api/logout', { method: 'POST' });
        } catch (error) {
          console.error('Error logging out:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [resultId, submitMutation.isSuccess]);

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

  // Get instructions for each assessment type
  const getInstructions = () => {
    if (!assessment) return { title: "", description: "", tips: [] };
    // Normalize assessment type (handle both hyphens and underscores)
    const type = assessment.assessmentType.replace(/-/g, '_');
    
    switch (type) {
      case "fit":
        return {
          title: "FIT Assessment - 15 Questions",
          description: "This assessment measures 6 core behavioral skills essential for professional success: High Agency, Intellectual Curiosity, Resilience, Empathy & Ethics, Growth Mindset, and Interpersonal Agility.",
          tips: [
            "Choose the option that best represents how you typically behave or think",
            "There are no right or wrong answers - be honest and authentic",
            "Don't overthink each question - go with your first instinct",
            "You have 20 minutes to complete all 15 questions",
          ]
        };
      case "ai_readiness":
        return {
          title: "AI Readiness Assessment - 21 Questions",
          description: "This assessment evaluates 9 skills critical for working effectively with AI: AI Literacy, Technical Fluency, Domain Fluency, Critical Thinking, Adaptive & Collaborative Learning, Responsible AI Integration, Domain Expertise, Creative Innovation, and Cross-functional Collaboration.",
          tips: [
            "Select the response that most closely reflects your current capabilities",
            "There are no right or wrong answers - be truthful about your experience",
            "Consider your real-world experience with AI tools and technologies",
            "You have 20 minutes to complete all 21 questions",
          ]
        };
      case "prompt_architecture":
        return {
          title: "Prompt Architecture Assessment - 7 Levels",
          description: "This assessment tests your ability to design effective prompts for AI systems across 7 progressive difficulty levels. Each prompt is evaluated by an AI model on Clarity, Structure, Context Relevance, Creativity, and Iterative Improvement.",
          tips: [
            "Write clear, specific prompts that address the given scenario",
            "Include relevant context and constraints in your prompts",
            "Think about structure and how to guide the AI effectively",
            "You have 20 minutes to complete all 7 levels",
          ]
        };
      case "aiq":
        return {
          title: "Algorithmic Integrity Quotient (AIQ) - 4 Questions",
          description: "This assessment tests your understanding of AI ethics, bias, fairness, transparency, and responsible deployment. You'll analyze real-world scenarios and make ethically sound decisions. A score of 70% or above is considered a pass.",
          tips: [
            "Read each scenario carefully and consider all ethical implications",
            "Choose the option that prioritizes ethics, safety, and fairness",
            "There are correct answers based on established AI ethics principles",
            "You have 20 minutes to complete all 4 questions",
          ]
        };
      default:
        return { title: "", description: "", tips: [] };
    }
  };

  const instructions = getInstructions();

  const handleBeginAssessment = () => {
    startMutation.mutate();
  };

  if (loadingAssessments || !assessment || questions.length === 0) {
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
      // Scroll to top of page after moving to next question
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      
      {/* Instructions Dialog */}
      <Dialog open={showInstructions && !resultId} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl" data-testid="dialog-instructions">
          <DialogHeader>
            <DialogTitle className="text-2xl">{instructions.title}</DialogTitle>
            <DialogDescription className="text-base pt-4">
              {instructions.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-2">Instructions:</h4>
                <ul className="space-y-2 list-disc list-inside">
                  {instructions.tips.map((tip, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={handleBeginAssessment} 
              disabled={startMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-begin-assessment"
            >
              {startMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                "Begin Assessment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="flex-grow py-16">
        <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8">
          {/* Only show content after instructions dialog is dismissed and assessment started */}
          {!showInstructions && resultId && (
            <>
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">
                      {formatAssessmentName(assessment.assessmentType)} Assessment
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
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-3 font-medium">
                        ⚠️ Candidate is measured on their creativity, copying the above question will score 0 points.
                      </p>
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
                        Your prompt will be evaluated by an AI model on clarity, structure, context relevance, creativity, and iterative improvement.
                      </p>
                    </div>
                  </div>
                ) : (
                  // Multiple choice questions (FIT, AI Readiness, AIQ)
                  <div>
                    <h2 className="text-base md:text-lg font-semibold mb-6">{currentQ.text}</h2>
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
                            className="mt-0.5"
                          />
                          <Label
                            htmlFor={`${currentQ.id}-${option.value}`}
                            className="flex-1 cursor-pointer"
                          >
                            <span className="text-sm">
                              <span className="font-medium">{option.value}.</span>{" "}
                              <span className="text-muted-foreground">{option.text}</span>
                            </span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </Card>

              {/* Navigation */}
              <div className="flex flex-wrap gap-3 justify-between">
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
                    className="flex-1 sm:flex-none"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin flex-shrink-0" />
                        <span className="hidden sm:inline">Your answers are being evaluated, this may take 2-3 minutes...</span>
                        <span className="sm:hidden">Evaluating (2-3 min)...</span>
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
            </>
          )}
        </div>
      </main>
      <Footer />
      
      {/* Completion Dialog */}
      <AssessmentCompletionDialog
        open={showCompletionDialog}
        onOpenChange={setShowCompletionDialog}
        isPaidUser={isPaidUser}
        completedCount={4}
      />
    </div>
  );
}
