import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Clock, AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getFITQuestions, getAIReadinessQuestions, getAIQQuestions } from "@shared/questions";
import { PROMPT_ARCHITECTURE_LEVELS } from "../data/prompt-architecture-questions";
import { Textarea } from "@/components/ui/textarea";
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
import { useDarkBody } from "@/hooks/use-dark-body";

const bgMain = "bg-slate-900";
const bgCard = "bg-slate-800 border-slate-700";
const bgCardAlt = "bg-slate-900/50";
const textPrimary = "text-white";
const textSecondary = "text-slate-300";
const textMuted = "text-slate-400";
const borderColor = "border-slate-600";
const inputBg = "bg-slate-900 border-slate-600 text-white";
const primaryColor = '#0891b2';
const accentColor = '#06b6d4';

export default function Assessment() {
  const { purchaseItemId } = useParams<{ purchaseItemId: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { questionLocale } = useCurrency();
  useDarkBody("#0f172a");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [resultId, setResultId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(1200); // 20 minutes in seconds (3 minutes per question for Prompt Architecture)
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true); // Show instructions before starting
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [isPaidUser, setIsPaidUser] = useState(true); // Default to true
  const [isSubmitting, setIsSubmitting] = useState(false); // Track if assessment is being submitted
  const [evaluationProgress, setEvaluationProgress] = useState(0); // Displayed progress 0-100 for evaluation
  const [isEvaluating, setIsEvaluating] = useState(false); // Track if currently evaluating (for time-based progress)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false); // Show leave confirmation dialog
  const [showTimesUp, setShowTimesUp] = useState(false); // "Time's Up" overlay
  const paQuestionAdvancingRef = useRef<boolean>(false); // Re-entry guard for PA per-question auto-advance
  const timerResetKeyRef = useRef<number>(0);
  const [timerResetKey, setTimerResetKey] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const hasSubmittedRef = useRef<boolean>(false); // Synchronous flag to prevent abandon after submit
  const progressAnimationRef = useRef<NodeJS.Timeout | null>(null); // For smooth progress animation
  const answersRef = useRef<Record<string, string>>({}); // Stable ref for timer expiry access
  const currentQuestionRef = useRef<number>(0); // Stable ref for timer expiry access
  const timeRemainingRef = useRef<number>(1200); // Stable ref for timer value during sendBeacon
  const navBarRef = useRef<HTMLDivElement>(null);

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

  // Keep refs in sync with state for stable timer callback access
  answersRef.current = answers;
  currentQuestionRef.current = currentQuestion;
  timeRemainingRef.current = timeRemaining;

  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    let scrollTimer: NodeJS.Timeout;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        setKeyboardOpen(true);
        scrollTimer = setTimeout(() => {
          navBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 400);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (!related || (related.tagName !== 'TEXTAREA' && related.tagName !== 'INPUT')) {
        setKeyboardOpen(false);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      clearTimeout(scrollTimer);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  const startMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/assessments/start", { purchaseItemId, questionLocale });
      const data = await response.json();
      
      if (data.isPaused) {
        const resumeResponse = await apiRequest("POST", `/api/assessments/${data.id}/resume`);
        const resumeData = await resumeResponse.json();
        return {
          ...data,
          timeRemaining: Math.floor((resumeData.timeRemainingMs || 0) / 1000),
          isPaused: false,
          resumed: true,
        };
      }
      
      return data;
    },
    onSuccess: (data: any) => {
      setResultId(data.id);
      setShowInstructions(false);
      
      const isPromptArch = assessment?.assessmentType === 'prompt_architecture';
      if (isPromptArch) {
        if (data.resumed && data.timeRemaining != null && data.timeRemaining > 0 && data.timeRemaining <= 180) {
          setTimeRemaining(data.timeRemaining);
        } else {
          setTimeRemaining(180);
        }
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
          // Smoothly animate to 100% over 1 second before returning
          const animateToComplete = () => {
            return new Promise<void>((resolve) => {
              const targetProgress = 100;
              const animationDuration = 1000; // 1 second
              const intervalMs = 50; // Update every 50ms
              const steps = animationDuration / intervalMs;
              let currentStep = 0;
              
              const interval = setInterval(() => {
                currentStep++;
                setEvaluationProgress(prev => {
                  const remaining = targetProgress - prev;
                  const increment = remaining / (steps - currentStep + 1);
                  return Math.min(targetProgress, prev + increment);
                });
                
                if (currentStep >= steps) {
                  clearInterval(interval);
                  setEvaluationProgress(100);
                  resolve();
                }
              }, intervalMs);
            });
          };
          await animateToComplete();
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

  // Time-based progress animation - slowly progress from 5% to 95% over 2 minutes
  // This provides smooth visual feedback while evaluation runs in background
  useEffect(() => {
    if (!isEvaluating) {
      // Clear animation when not evaluating
      if (progressAnimationRef.current) {
        clearInterval(progressAnimationRef.current);
        progressAnimationRef.current = null;
      }
      return;
    }
    
    // Target 2 minutes (120 seconds) for full animation
    // Progress from 5% to 95% (90% range) over this time
    const targetDurationMs = 120000; // 2 minutes
    const startProgress = 5;
    const maxProgress = 95; // Stop at 95% until actually complete
    const progressRange = maxProgress - startProgress; // 90%
    
    // Update every 100ms for very smooth animation
    const intervalMs = 100;
    const totalIntervals = targetDurationMs / intervalMs; // 1200 intervals
    const incrementPerInterval = progressRange / totalIntervals; // 0.075% per interval
    
    progressAnimationRef.current = setInterval(() => {
      setEvaluationProgress(prev => {
        // Stop at 95% - don't go higher until completion is confirmed
        if (prev >= maxProgress) {
          return maxProgress;
        }
        // Use decimal precision for smooth animation (no rounding)
        const next = prev + incrementPerInterval;
        return Math.min(maxProgress, next);
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

    // Send initial heartbeat with timer state (convert seconds to ms)
    apiRequest("POST", `/api/assessments/${resultId}/heartbeat`, {
      timeRemainingMs: timeRemainingRef.current * 1000,
    }).catch(() => {});

    // Set up heartbeat interval (every 30 seconds) - saves timer state as backup
    heartbeatRef.current = setInterval(() => {
      apiRequest("POST", `/api/assessments/${resultId}/heartbeat`, {
        timeRemainingMs: timeRemainingRef.current * 1000,
      }).catch(() => {});
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

  // Save timer state and pause assessment when user closes tab/browser
  useEffect(() => {
    if (!resultId || submitMutation.isSuccess || isSubmitting || hasSubmittedRef.current) {
      return;
    }

    const sendPauseBeacon = () => {
      if (hasSubmittedRef.current) return;
      navigator.sendBeacon(
        `/api/assessments/${resultId}/pause`,
        new Blob([JSON.stringify({ timeRemainingMs: timeRemainingRef.current * 1000 })], { type: 'application/json' })
      );
      console.log(`[Assessment] Sent pause beacon with ${timeRemainingRef.current}s remaining`);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasSubmittedRef.current) return;
      sendPauseBeacon();
      e.preventDefault();
      e.returnValue = 'Your assessment progress will be saved. You can resume within 30 minutes.';
      return e.returnValue;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !hasSubmittedRef.current) {
        sendPauseBeacon();
      }
    };

    const handlePageHide = () => {
      sendPauseBeacon();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [resultId, submitMutation.isSuccess, isSubmitting]);


  // Handle PA last question timer expiry - submit the full assessment
  const handlePALastQuestionExpiry = useCallback(() => {
    setShowTimesUp(true);
    setIsSubmitting(true);
    setTimeout(() => {
      setShowTimesUp(false);
      if (Object.keys(answersRef.current).length > 0 && !hasSubmittedRef.current) {
        hasSubmittedRef.current = true;
        submitMutation.mutate();
      }
    }, 2000);
  }, [submitMutation]);

  // Timer effect - pauses when tab is hidden, resumes when visible
  useEffect(() => {
    if (!resultId || isSubmitting || submitMutation.isPending) return;

    const startTimer = () => {
      if (timerRef.current) return;
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1;
          
          const warningThreshold = isPromptArchitecture ? 30 : 300;
          const warningTitle = isPromptArchitecture ? "30 Seconds Remaining" : "5 Minutes Remaining";
          const warningDesc = isPromptArchitecture 
            ? "You have 30 seconds left for this question"
            : "You have 5 minutes left to complete this assessment";
          if (newTime === warningThreshold && !showTimeWarning) {
            setShowTimeWarning(true);
            toast({
              title: warningTitle,
              description: warningDesc,
              variant: "destructive",
            });
          }
          
          if (newTime <= 0) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            
            if (isPromptArchitecture) {
              const curQ = currentQuestionRef.current;
              if (curQ < questions.length - 1) {
                if (paQuestionAdvancingRef.current) return 0;
                paQuestionAdvancingRef.current = true;
                setShowTimesUp(true);
                setTimeout(() => {
                  setShowTimesUp(false);
                  paQuestionAdvancingRef.current = false;
                  setCurrentQuestion(curQ + 1);
                  setTimeRemaining(180);
                  setShowTimeWarning(false);
                  timerResetKeyRef.current += 1;
                  setTimerResetKey(timerResetKeyRef.current);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 1500);
              } else {
                handlePALastQuestionExpiry();
              }
              return 0;
            }
            
            setShowTimesUp(true);
            setIsSubmitting(true);
            
            setTimeout(() => {
              setShowTimesUp(false);
              if (Object.keys(answersRef.current).length > 0) {
                hasSubmittedRef.current = true;
                submitMutation.mutate();
              } else {
                if (!hasSubmittedRef.current) {
                  toast({
                    title: "Time Expired",
                    description: "Your assessment has been marked as incomplete.",
                    variant: "destructive",
                  });
                  apiRequest("POST", `/api/assessments/${resultId}/abandon`).finally(() => {
                    setLocation("/dashboard?refresh=" + Date.now());
                  });
                }
              }
            }, 2000);
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    };

    const stopTimer = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stopTimer();
      } else {
        startTimer();
      }
    };

    if (document.visibilityState === 'visible') {
      startTimer();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resultId, showTimeWarning, submitMutation, isSubmitting, isPromptArchitecture, handlePALastQuestionExpiry, questions.length, toast, setLocation, timerResetKey]);

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
          description: "This assessment evaluates 9 skills critical for working effectively with AI: AI Literacy & Prompt Engineering, Technical Fundamentals, Data Fluency, Critical Thinking & Problem-Solving, Adaptability & Continuous Learning, Collaboration & Communication, Responsible AI & Ethical Awareness, Creativity & Innovation, and Domain Expertise.",
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
            "You have 3 minutes per level (21 minutes total for all 7 levels)",
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
      <div className={`min-h-[100dvh] flex items-center justify-center ${bgMain}`}>
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
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
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      
      if (isPromptArchitecture) {
        setTimeRemaining(180);
        setShowTimeWarning(false);
        timerResetKeyRef.current += 1;
        setTimerResetKey(timerResetKeyRef.current);
      }
      
      if (window.innerWidth < 768) {
        window.scrollTo({ top: 0, behavior: "instant" });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
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

  // Show instructions screen (matching B2B ready screen)
  if (showInstructions && !resultId) {
    return (
      <div className={`min-h-[100dvh] flex items-center justify-center ${bgMain} p-4`} data-testid="assessment-ready">
        <Card className={`max-w-lg ${bgCard}`}>
          <CardHeader className="text-center">
            <Badge 
              className="mb-2 mx-auto border w-fit"
              style={{ 
                backgroundColor: `${accentColor}20`,
                color: accentColor,
                borderColor: `${accentColor}4D`
              }}
            >
              HumanMetrix
            </Badge>
            <CardTitle className={`text-2xl ${textPrimary}`}>
              {instructions.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`${textSecondary} space-y-3`}>
              <p>{instructions.description}</p>
              <ul className={`list-disc list-inside text-sm space-y-1 ${textMuted}`}>
                {instructions.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleBeginAssessment}
                disabled={startMutation.isPending}
                className="w-full"
                style={{ backgroundColor: primaryColor }}
                data-testid="button-begin-assessment"
              >
                {startMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  "Start Assessment"
                )}
              </Button>
              <Button
                variant="outline"
                className={`w-full ${borderColor} ${textSecondary}`}
                onClick={() => setLocation('/dashboard')}
                data-testid="button-back-to-dashboard"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/30 flex items-center justify-center gap-2">
              <span className={`text-xs ${textMuted}`}>Powered by</span>
              <div className="flex items-center gap-1.5">
                <img 
                  src="/assets/humanmetrix-logo.png" 
                  alt="HumanMetrix" 
                  className="h-5 w-5 object-contain"
                />
                <span className={`text-xs font-medium ${textSecondary}`}>HumanMetrix</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${bgMain} min-h-[100dvh] pt-3 md:pt-4 pb-4 px-4`} data-testid="assessment-started">
      <div className="max-w-2xl mx-auto">
        {/* Header - sticky so timer is always visible */}
        {!showInstructions && resultId && (
          <>
            <div className={`sticky top-0 z-40 pb-3 -mx-4 px-4 pt-2 bg-slate-900`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <Badge 
                    className="border w-fit"
                    style={{ 
                      backgroundColor: `${accentColor}20`,
                      color: accentColor,
                      borderColor: `${accentColor}4D`
                    }}
                  >
                    {formatAssessmentName(assessment.assessmentType)}
                  </Badge>
                  <span className={`text-sm ${textMuted}`}>
                    Question {currentQuestion + 1} of {questions.length}
                  </span>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 flex-shrink-0 ${
                  timeRemaining <= (isPromptArchitecture ? 30 : 300) 
                    ? 'bg-red-500/10 text-red-400 border-red-500/50 animate-pulse' 
                    : 'bg-slate-800 border-slate-600'
                }`}>
                  <Clock className={`h-5 w-5 ${timeRemaining <= (isPromptArchitecture ? 30 : 300) ? 'text-red-400' : 'text-cyan-400'}`} />
                  <span className={`text-lg font-bold tabular-nums ${textPrimary}`} data-testid="timer-display">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>
              <Progress value={progress} className="h-2" style={{ '--progress-color': primaryColor } as any} />
              {showTimeWarning && (
                <div className="mt-2 text-sm text-center text-red-400">
                  {isPromptArchitecture ? '30 seconds remaining!' : '5 minutes remaining!'}
                </div>
              )}
            </div>

            {showTimesUp && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" data-testid="overlay-times-up">
                <div className="text-center animate-in fade-in zoom-in duration-300">
                  <div className="bg-red-500 rounded-full p-6 mx-auto mb-4 w-24 h-24 flex items-center justify-center">
                    <Clock className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Time's Up!</h2>
                  <p className="text-slate-300 text-lg">
                    {isPromptArchitecture && currentQuestion < questions.length - 1
                      ? "Moving to next question..."
                      : "Auto-submitting your answers..."}
                  </p>
                </div>
              </div>
            )}

            {/* Question Card */}
            <Card className={bgCard}>
              <CardContent className="pt-6">
                {isPromptArchitecture ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                        Level {(currentQ as any).level}
                      </Badge>
                      <span className={`text-sm ${textMuted}`}>{(currentQ as any).title}</span>
                    </div>
                    <p className={`${textSecondary} text-sm mb-4`}>{(currentQ as any).description}</p>
                    <div className={`${bgCardAlt} p-4 rounded-lg mb-4`}>
                      <h3 className={`font-semibold ${textPrimary} mb-2`}>Scenario</h3>
                      <p className={`${textSecondary} text-sm`}>{currentQ.text}</p>
                    </div>
                    {(currentQ as any).taskInstructions && (
                      <div className="bg-cyan-900/20 border border-cyan-500/30 p-4 rounded-lg mb-4">
                        <h3 className="font-semibold text-cyan-400 mb-2">Your Task</h3>
                        <p className={`${textSecondary} text-sm`}>{(currentQ as any).taskInstructions}</p>
                      </div>
                    )}
                    <Textarea
                      id={`prompt-${currentQ.id}`}
                      placeholder="Write your prompt here..."
                      value={answers[currentQ.id] || ""}
                      onChange={handleTextChange}
                      onPaste={(e) => {
                        e.preventDefault();
                      }}
                      disabled={isSubmitting}
                      className={`min-h-[150px] ${inputBg}`}
                      data-testid={`input-prompt-${currentQ.id}`}
                    />
                    <p className="text-xs text-red-400 mt-1">
                      Pasting is disabled. Copied content will score zero.
                    </p>
                  </div>
                ) : (
                  <div>
                    <h2 className={`text-lg font-semibold ${textPrimary} mb-6`}>{currentQ.text}</h2>
                    <RadioGroup
                      value={answers[currentQ.id] || ""}
                      onValueChange={handleAnswerChange}
                    >
                      {(currentQ as any).options?.map((option: any) => (
                        <div 
                          key={option.value} 
                          className={`flex items-start space-x-3 mb-3 p-4 rounded-lg ${bgCardAlt} hover-elevate active-elevate-2 cursor-pointer`}
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
                              <span className={`font-medium ${textPrimary}`}>{option.value}.</span>{" "}
                              <span className={textSecondary}>{option.text}</span>
                            </span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div ref={navBarRef} className="mt-6 py-3 flex justify-between gap-3" style={keyboardOpen ? { marginBottom: '60vh' } : undefined}>
              {isPromptArchitecture ? (
                <div />
              ) : (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  className={`${borderColor} ${textSecondary}`}
                  data-testid="button-previous"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              )}
              
              {currentQuestion === questions.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!answers[currentQ.id] || submitMutation.isPending}
                  className="bg-green-600"
                  data-testid="button-submit-assessment"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isPromptArchitecture ? "Analysing..." : "Submitting..."}
                    </>
                  ) : (
                    "Submit Assessment"
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleNext} 
                  disabled={!answers[currentQ.id]}
                  style={{ backgroundColor: primaryColor }}
                  data-testid="button-next"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

            {/* Evaluation progress for Prompt Architecture */}
            {submitMutation.isPending && isPromptArchitecture && (
              <div className="mt-4 px-2" data-testid="evaluation-progress-container">
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-cyan-500 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${evaluationProgress}%` }}
                  />
                </div>
                <p className={`text-xs text-center mt-1.5 ${textMuted}`}>
                  {evaluationProgress < 25 ? "Sending responses to AI engine..." : 
                   evaluationProgress < 55 ? "Evaluating prompt structure and clarity..." : 
                   evaluationProgress < 85 ? "Calculating scores and generating feedback..." : 
                   "Finalising results..."}
                </p>
              </div>
            )}

            <div className="mt-8 pt-4 border-t border-slate-700/50 flex items-center justify-center gap-2">
              <span className={`text-xs ${textMuted}`}>Powered by</span>
              <div className="flex items-center gap-1.5">
                <img 
                  src="/assets/humanmetrix-logo.png" 
                  alt="HumanMetrix" 
                  className="h-5 w-5 object-contain"
                />
                <span className={`text-xs font-medium ${textSecondary}`}>HumanMetrix</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Leave Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Leave Assessment?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              You have an assessment in progress. Your answers have been saved, but leaving now may affect your results. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-slate-700 text-white border-slate-600"
              data-testid="button-stay"
            >
              Stay
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveAssessment}
              className="bg-red-500 text-white"
              data-testid="button-leave-assessment"
            >
              Leave
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
