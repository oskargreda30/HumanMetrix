import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Clock, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getFITQuestions, getAIReadinessQuestions, getAIQQuestions } from "@shared/questions";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatAssessmentName, isAllAssessmentsComplete } from "@/lib/assessmentHelpers";
import { AssessmentCompletionDialog } from "@/components/AssessmentCompletionDialog";

export default function Assessment() {
  const { purchaseItemId } = useParams<{ purchaseItemId: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { questionLocale } = useCurrency();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [resultId, setResultId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(1200); // 20 minutes in seconds (2 minutes per question for Prompt Architecture)
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true); // Show instructions before starting
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [isPaidUser, setIsPaidUser] = useState(true); // Default to true
  const [isSubmitting, setIsSubmitting] = useState(false); // Track if assessment is being submitted
  const [evaluationProgress, setEvaluationProgress] = useState(0); // Displayed progress 0-100 for evaluation
  const [isEvaluating, setIsEvaluating] = useState(false); // Track if currently evaluating (for time-based progress)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false); // Show leave confirmation dialog
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const hasSubmittedRef = useRef<boolean>(false); // Synchronous flag to prevent abandon after submit
  const progressAnimationRef = useRef<NodeJS.Timeout | null>(null); // For smooth progress animation

  const { data: availableAssessments, isLoading: loadingAssessments } = useQuery({
    queryKey: ["/api/available-assessments"],
    enabled: isAuthenticated,
  });

  const assessmentsArray = (availableAssessments as any)?.assessments || [];
  const assessment = assessmentsArray.find((a: any) => a.purchaseItemId === purchaseItemId);
  
  // Get questions based on assessment type (uses locale-aware questions)
  const getQuestions = () => {
    if (!assessment) return [];
    // Normalize assessment type (handle both hyphens and underscores)
    const type = assessment.assessmentType.replace(/-/g, '_');
    
    switch (type) {
      case "fit":
        return getFITQuestions(questionLocale);
      case "ai_readiness":
        return getAIReadinessQuestions(questionLocale);
      case "aiq":
        return getAIQQuestions(questionLocale);
      case "prompt_architecture":
        // Convert levels to question format (Prompt Architecture not localized)
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
  const isPromptArchitecture = assessment?.assessmentType === 'prompt_architecture';

  const startMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/assessments/start", { purchaseItemId, questionLocale });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setResultId(data.id);
      setShowInstructions(false); // Only close instructions AFTER successful start
      
      // For Prompt Architecture, set 2 minutes per question instead of total time
      const isPromptArch = assessment?.assessmentType === 'prompt_architecture';
      if (isPromptArch) {
        setTimeRemaining(120); // 2 minutes per question
      } else if (data.timeRemaining !== undefined) {
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

  // Helper to poll for evaluation completion
  const pollForCompletion = async (assessmentId: string): Promise<any> => {
    const maxPolls = 60; // 60 polls × 3 seconds = 3 minutes max
    const pollInterval = 3000; // 3 seconds
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;
    
    // Start time-based progress animation
    setEvaluationProgress(5); // Start at 5% to show immediate feedback
    setIsEvaluating(true);
    
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      try {
        const statusResponse = await fetch(`/api/assessments/${assessmentId}/status`, {
          credentials: 'include',
        });
        
        if (!statusResponse.ok) {
          consecutiveErrors++;
          console.warn(`[Assessment] Poll ${i + 1}/${maxPolls}: HTTP error ${statusResponse.status} (${consecutiveErrors}/${maxConsecutiveErrors})`);
          if (consecutiveErrors >= maxConsecutiveErrors) {
            throw new Error('Failed to check status after multiple attempts');
          }
          continue; // Retry on transient errors
        }
        
        consecutiveErrors = 0; // Reset on successful request
        const statusData = await statusResponse.json();
        
        // Log progress for debugging (progress animation is handled by useEffect)
        if (statusData.evaluationProgress) {
          const { completedEvaluations, totalEvaluations } = statusData.evaluationProgress;
          console.log(`[Assessment] Poll ${i + 1}: ${completedEvaluations}/${totalEvaluations} evaluated`);
        }
        
        if (statusData.status === 'completed') {
          console.log('[Assessment] Evaluation completed successfully');
          setIsEvaluating(false);
          setEvaluationProgress(100); // Complete immediately
          return statusData;
        }
        
        if (statusData.status === 'failed' || statusData.status === 'evaluation_failed') {
          setIsEvaluating(false);
          throw new Error(statusData.message || 'Evaluation failed. Please try again.');
        }
        
        // Still evaluating - continue polling
        console.log(`[Assessment] Poll ${i + 1}/${maxPolls}: status=${statusData.status}`);
      } catch (error: any) {
        if (error.message?.includes('Evaluation failed') || error.message?.includes('after multiple attempts')) {
          setIsEvaluating(false);
          throw error;
        }
        consecutiveErrors++;
        console.warn(`[Assessment] Poll ${i + 1}/${maxPolls}: fetch error (${consecutiveErrors}/${maxConsecutiveErrors}):`, error.message);
        if (consecutiveErrors >= maxConsecutiveErrors) {
          setIsEvaluating(false);
          throw new Error('Failed to check status after multiple attempts');
        }
        // Continue polling on transient network errors
      }
    }
    
    setIsEvaluating(false);
    throw new Error('Evaluation timed out. Please refresh the page.');
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Use shorter timeout - we'll get 202 response immediately for Prompt Architecture
      const response = await apiRequest("POST", `/api/assessments/${resultId}/submit`, { answers }, { timeoutMs: 30000 });
      
      if (!response.ok && response.status !== 202) {
        const errorData = await response.json();
        throw errorData;
      }
      
      const data = await response.json();
      
      // If status is 202 (evaluating), poll for completion
      if (response.status === 202 || data.status === 'evaluating') {
        console.log('[Assessment] Evaluation in progress, polling for completion...');
        return await pollForCompletion(resultId!);
      }
      
      return data;
    },
    onSuccess: async () => {
      setIsSubmitting(false); // Reset submitting state
      await queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/available-assessments"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/purchases-with-results"] });
      // Force refetch to ensure fresh data
      await queryClient.refetchQueries({ queryKey: ["/api/available-assessments"] });
      await queryClient.refetchQueries({ queryKey: ["/api/purchases-with-results"] });
      
      toast({
        title: "Success",
        description: "Assessment submitted successfully!",
        duration: 3000,
      });
      
      // Always redirect to dashboard after submission with refresh flag
      setLocation("/dashboard?refresh=" + Date.now());
    },
    onError: (error: any) => {
      setIsSubmitting(false); // Reset submitting state on error
      setEvaluationProgress(0); // Reset progress on error
      setIsEvaluating(false);
      console.error("[Assessment] Submission error:", error);
      
      // Determine appropriate error message based on error type
      let message = "Failed to submit assessment. Please try again.";
      let title = "Submission Error";
      
      if (error?.error === 'quota_exceeded') {
        message = "OpenAI API quota exceeded. Please contact support to complete this assessment.";
        title = "API Limit Reached";
      } else if (error?.error === 'timeout') {
        message = "The evaluation is taking longer than expected. Please try again.";
        title = "Request Timeout";
      } else if (error?.error === 'database_error') {
        message = "Could not save your results. Please try again in a moment.";
        title = "Save Failed";
      } else if (error?.message) {
        message = error.message;
      }
      
      toast({
        title,
        description: message,
        variant: "destructive",
        duration: 6000, // Show error for longer
      });
    },
  });

  // Abandon mutation - marks assessment as incomplete
  const abandonMutation = useMutation({
    mutationFn: async () => {
      // If no resultId, we can't abandon - but still navigate back to dashboard
      if (!resultId) {
        console.log('[Assessment] No resultId - skipping abandon API call');
        return { skipped: true };
      }
      console.log('[Assessment] Calling abandon API for result:', resultId);
      const response = await apiRequest("POST", `/api/assessments/${resultId}/abandon`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to abandon assessment');
      }
      return data;
    },
    onSuccess: (data) => {
      console.log('[Assessment] Abandon success:', data);
      // Clear heartbeat
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Only show toast if we actually called the API (not skipped)
      if (data && !data.skipped) {
        toast({
          title: "Assessment Incomplete",
          description: "Your assessment has been marked as incomplete.",
          variant: "destructive",
        });
      }
      // Always navigate back to dashboard
      console.log('[Assessment] Navigating to dashboard...');
      setLocation("/dashboard?refresh=" + Date.now());
    },
    onError: (error: any) => {
      console.error('[Assessment] Abandon error:', error);
      // Clear intervals even on error
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to mark assessment as incomplete.",
        variant: "destructive",
      });
      // Still navigate back to dashboard even on error
      setLocation("/dashboard?refresh=" + Date.now());
    },
  });

  // Handle leaving the assessment
  const handleLeaveAssessment = useCallback(() => {
    setShowLeaveDialog(false);
    abandonMutation.mutate();
  }, [abandonMutation]);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
    }
    // Don't auto-start - wait for user to click "Begin" in instructions dialog
  }, [isAuthenticated]);

  // Time-based progress animation - slowly progress from 5% to 95% over average evaluation time
  // Average AI evaluation takes ~70 seconds, so we progress accordingly and stop at 95% if it takes longer
  useEffect(() => {
    if (!isEvaluating) {
      // Clear animation when not evaluating
      if (progressAnimationRef.current) {
        clearInterval(progressAnimationRef.current);
        progressAnimationRef.current = null;
      }
      return;
    }
    
    // Average evaluation time is ~70 seconds (increased from 50s based on real usage)
    // Progress from 5% to 95% (90% range) over this time
    const averageEvaluationMs = 70000; // 70 seconds
    const startProgress = 5;
    const maxProgress = 95; // Stop at 95% until actually complete
    const progressRange = maxProgress - startProgress; // 90%
    
    // Update every 200ms for smoother animation
    const intervalMs = 200;
    const totalIntervals = averageEvaluationMs / intervalMs; // 350 intervals
    const incrementPerInterval = progressRange / totalIntervals; // ~0.26% per interval
    
    progressAnimationRef.current = setInterval(() => {
      setEvaluationProgress(prev => {
        // Stop at 95% - don't go higher until completion is confirmed
        if (prev >= maxProgress) {
          return maxProgress;
        }
        const next = prev + incrementPerInterval;
        return Math.min(maxProgress, Math.round(next));
      });
    }, intervalMs);
    
    return () => {
      if (progressAnimationRef.current) {
        clearInterval(progressAnimationRef.current);
        progressAnimationRef.current = null;
      }
    };
  }, [isEvaluating]);

  // Heartbeat effect - sends ping every 30 seconds to keep session alive
  // Clears when assessment completes, submits, or component unmounts
  useEffect(() => {
    // Clear heartbeat when submission starts or completes
    if (isSubmitting || submitMutation.isSuccess) {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }
    
    if (!resultId) return;

    // Send initial heartbeat
    apiRequest("POST", `/api/assessments/${resultId}/heartbeat`).catch(() => {});

    // Set up heartbeat interval (every 30 seconds)
    heartbeatRef.current = setInterval(() => {
      apiRequest("POST", `/api/assessments/${resultId}/heartbeat`).catch(() => {});
    }, 30000);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [resultId, isSubmitting, submitMutation.isSuccess]);

  // Navigation guard - show dialog when trying to leave via back button
  // Clears when assessment completes to allow normal navigation
  useEffect(() => {
    // Don't set up guard if already submitting or completed
    if (!resultId || submitMutation.isSuccess || isSubmitting) {
      // If previously set up, cleanup happens via return function
      return;
    }

    // Push a fake history entry so we can intercept the back button
    window.history.pushState({ assessmentInProgress: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      // Double-check state before showing dialog (in case of race condition)
      if (submitMutation.isSuccess || isSubmitting) {
        return; // Allow navigation if already completed
      }
      // User pressed back button - show confirmation dialog
      e.preventDefault();
      // Push state again to prevent navigation
      window.history.pushState({ assessmentInProgress: true }, '');
      setShowLeaveDialog(true);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [resultId, submitMutation.isSuccess, isSubmitting]);

  // Show warning when user tries to leave during assessment (browser close/refresh)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (resultId && !submitMutation.isSuccess && !isSubmitting) {
        // Show browser's native "are you sure" dialog
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [resultId, submitMutation.isSuccess, isSubmitting]);

  // Timer effect
  useEffect(() => {
    if (!resultId || isSubmitting || submitMutation.isPending) return; // Don't run timer if submitting

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
            timerRef.current = null;
          }
          
          // Set submitting flag to prevent timer restart
          setIsSubmitting(true);
          
          // Only auto-submit if user has answered at least one question
          // This prevents submitting an empty assessment
          if (Object.keys(answers).length > 0) {
            toast({
              title: "Time's Up!",
              description: "Assessment will be auto-submitted with current answers",
              variant: "destructive",
            });
            
            // Set synchronous flag before calling mutate to prevent race condition
            hasSubmittedRef.current = true;
            // Submit even if incomplete
            submitMutation.mutate();
          } else {
            // No answers provided - mark as abandoned (only if not already submitted)
            // Use synchronous ref to avoid race condition with async mutation state
            if (!hasSubmittedRef.current) {
              toast({
                title: "Time Expired",
                description: "Your assessment has been marked as incomplete.",
                variant: "destructive",
              });
              // Call abandon API
              apiRequest("POST", `/api/assessments/${resultId}/abandon`).finally(() => {
                setLocation("/dashboard?refresh=" + Date.now());
              });
            }
          }
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [resultId, showTimeWarning, submitMutation, isSubmitting]);

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
            "You have 2 minutes per level (14 minutes total for all 7 levels)",
          ]
        };
      case "aiq":
        return {
          title: "Algorithmic Integrity Quotient (AIQ) - 8 Questions",
          description: "This assessment evaluates your ethical reasoning in AI scenarios using a graded scoring system. Each answer is scored based on ethical alignment - from optimal ethical choices to less ideal approaches. Your final score reflects the nuance of your ethical judgment, not just right or wrong answers.",
          tips: [
            "Read each scenario carefully and consider all ethical implications",
            "Choose the option that best balances ethics with practical considerations",
            "Answers are graded on a scale - some are optimal, others are acceptable",
            "You have 20 minutes to complete all 8 questions",
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
      
      // For Prompt Architecture, reset timer to 2 minutes for each new question
      if (isPromptArchitecture) {
        setTimeRemaining(120); // Reset to 2 minutes
        setShowTimeWarning(false); // Reset warning state
      }
      
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
    
    // Stop the timer IMMEDIATELY when user clicks submit
    setIsSubmitting(true);
    // Set synchronous flag to prevent any race conditions with abandon
    hasSubmittedRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    submitMutation.mutate();
  };

  // Calculate progress with smooth sub-progress for Prompt Architecture
  // For assessments with few questions (like PA with 7), add partial progress based on typing
  const calculateProgress = () => {
    const baseProgress = (currentQuestion / questions.length) * 100;
    const questionIncrement = 100 / questions.length;
    
    // For Prompt Architecture, add partial progress based on text input length
    if (isPromptArchitecture && currentQ) {
      const currentAnswer = answers[currentQ.id] || "";
      const charCount = currentAnswer.length;
      // Smooth progress: 0-50 chars = 0-30% of increment, 50-150 chars = 30-70%, 150+ = 70-100%
      let subProgress = 0;
      if (charCount > 0) {
        if (charCount <= 50) {
          subProgress = (charCount / 50) * 0.3; // 0-30% of increment
        } else if (charCount <= 150) {
          subProgress = 0.3 + ((charCount - 50) / 100) * 0.4; // 30-70% of increment
        } else {
          subProgress = 0.7 + Math.min((charCount - 150) / 200, 0.3); // 70-100% of increment
        }
      }
      return Math.min(100, baseProgress + (questionIncrement * subProgress));
    }
    
    // For other assessments, standard progress (question completion based)
    return ((currentQuestion + 1) / questions.length) * 100;
  };
  
  const progress = calculateProgress();

  // Determine if assessment is actively in progress (started but not completed)
  const isAssessmentInProgress = !!(resultId && !submitMutation.isSuccess && !showInstructions);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation assessmentMode={isAssessmentInProgress} />
      
      {/* Instructions Dialog */}
      <Dialog open={showInstructions && !resultId} onOpenChange={(open) => {
        if (!open) {
          // User clicked X or clicked outside - navigate back to dashboard
          setLocation('/dashboard');
        }
      }}>
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
                        onPaste={(e) => {
                          e.preventDefault();
                        }}
                        disabled={isSubmitting}
                        className="min-h-[200px] text-base disabled:opacity-60 disabled:cursor-not-allowed"
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
                        <div 
                          key={option.value} 
                          className="flex items-start space-x-3 mb-4 p-4 rounded-lg hover-elevate active-elevate-2 cursor-pointer"
                          onClick={() => handleAnswerChange(option.value)}
                          data-testid={`answer-container-${currentQ.id}-${option.value}`}
                        >
                          <RadioGroupItem
                            value={option.value}
                            id={`${currentQ.id}-${option.value}`}
                            data-testid={`radio-${currentQ.id}-${option.value}`}
                            className="mt-0.5 pointer-events-none"
                          />
                          <Label
                            htmlFor={`${currentQ.id}-${option.value}`}
                            className="flex-1 cursor-pointer pointer-events-none"
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
                {!submitMutation.isPending && (
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentQuestion === 0}
                    data-testid="button-previous"
                  >
                    Previous
                  </Button>
                )}
                
                {currentQuestion === questions.length - 1 ? (
                  submitMutation.isPending ? (
                    isPromptArchitecture ? (
                      <div className="flex-1 space-y-3" data-testid="evaluation-progress-container">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="font-medium">
                              {evaluationProgress < 100 ? 'Evaluating your answers...' : 'Finishing up...'}
                            </span>
                          </div>
                          <span className="text-muted-foreground">{Math.round(evaluationProgress)}%</span>
                        </div>
                        <Progress 
                          value={evaluationProgress} 
                          className="h-2" 
                          indicatorClassName="transition-transform duration-300 ease-out"
                          data-testid="evaluation-progress-bar" 
                        />
                        <p className="text-xs text-muted-foreground text-center">
                          AI is analyzing your responses. This typically takes 1-2 minutes.
                        </p>
                      </div>
                    ) : (
                      <Button disabled className="flex-1 sm:flex-none" data-testid="button-submitting">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </Button>
                    )
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={submitMutation.isPending}
                      data-testid="button-submit-assessment"
                      className="flex-1 sm:flex-none"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Submit Assessment
                    </Button>
                  )
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
      {/* Footer hidden during active assessment */}
      {!isAssessmentInProgress && <Footer />}
      
      {/* Leave Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent data-testid="leave-assessment-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Are you sure you want to leave?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Your assessment will be marked as <strong>incomplete</strong> and you will not be able to resume it. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-stay">Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveAssessment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-leave-assessment"
            >
              Leave Assessment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
