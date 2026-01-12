import { useState, useEffect, useRef, useCallback } from "react";
import { useSearch } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, ArrowLeft, ArrowRight, Clock, Mail, Calendar } from "lucide-react";
import { getFITQuestions, getAIReadinessQuestions, getAIQQuestions, type QuestionLocale } from "@shared/questions";
import { PROMPT_ARCHITECTURE_LEVELS } from "../data/prompt-architecture-questions";
import { getHumanReadableError } from "@/lib/queryClient";

interface PartnerBranding {
  enabled: boolean;
  primaryColor: string;
  accentColor: string;
  logoUrl?: string | null;
  welcomeTitle?: string | null;
  welcomeMessage?: string | null;
  companyDisplayName?: string | null;
}

interface SessionData {
  sessionId: string;
  assessmentType: string;
  status: string;
  externalUserId?: string;
  externalEmail?: string;
  partnerName?: string;
  questionLocale?: QuestionLocale;
  branding?: PartnerBranding;
  savedAnswers?: Record<string, any> | null;
  lastAnsweredIndex?: number | null;
  lastActivityAt?: string | null;
}

type Question = {
  id: string;
  text: string;
  options?: { value: string; text: string }[];
  level?: number;
  title?: string;
  description?: string;
  taskInstructions?: string;
  type?: "text-input";
};

function getQuestions(assessmentType: string, locale: QuestionLocale = 'default'): Question[] {
  const type = assessmentType.replace(/-/g, "_");

  switch (type) {
    case "fit":
      return getFITQuestions(locale);
    case "ai_readiness":
      return getAIReadinessQuestions(locale);
    case "aiq":
      return getAIQQuestions(locale);
    case "prompt_architecture":
      return PROMPT_ARCHITECTURE_LEVELS.map((level: { level: number; scenario: string; title: string; description: string; taskInstructions: string }) => ({
        id: `level-${level.level}`,
        text: level.scenario,
        level: level.level,
        title: level.title,
        description: level.description,
        taskInstructions: level.taskInstructions,
        type: "text-input" as const,
      }));
    default:
      return [];
  }
}

function getAssessmentDisplayName(type: string): string {
  const names: Record<string, string> = {
    fit: "FIT Assessment",
    ai_readiness: "AI Readiness Assessment",
    prompt_architecture: "Prompt Architecture Assessment",
    aiq: "AIQ Assessment",
  };
  return names[type.replace(/-/g, "_")] || type;
}

export default function EmbedAssessment() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const sessionId = params.get("session");
  const theme = params.get("theme") || "dark";
  const isLight = theme === "light";

  const [session, setSession] = useState<SessionData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "started" | "completed" | "error" | "expired">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedScores, setCompletedScores] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState(1200); // 20 minutes default
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationStep, setVerificationStep] = useState<"email" | "code" | "verified">("email");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSubmittedRef = useRef<boolean>(false);

  // Theme-aware class names
  const bgMain = isLight ? "bg-gray-50" : "bg-slate-900";
  const bgCard = isLight ? "bg-white border-gray-200" : "bg-slate-800 border-slate-700";
  const bgCardAlt = isLight ? "bg-gray-100" : "bg-slate-900/50";
  const textPrimary = isLight ? "text-gray-900" : "text-white";
  const textSecondary = isLight ? "text-gray-600" : "text-slate-300";
  const textMuted = isLight ? "text-gray-500" : "text-slate-400";
  const borderColor = isLight ? "border-gray-300" : "border-slate-600";
  const inputBg = isLight ? "bg-white border-gray-300 text-gray-900" : "bg-slate-900 border-slate-600 text-white";

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setErrorMessage("No session ID provided");
      return;
    }

    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/embed/session/${sessionId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errorMsg = getHumanReadableError(data, "Failed to load session");
        if (errorMsg.toLowerCase().includes("expired")) {
          setStatus("expired");
        } else {
          setStatus("error");
          setErrorMessage(errorMsg);
        }
        return;
      }

      const data = await res.json();
      setSession(data);
      
      // Pre-fill email if available from session
      if (data.externalEmail) {
        setCandidateEmail(data.externalEmail);
      }
      
      // Load questions
      const loadedQuestions = getQuestions(data.assessmentType, data.questionLocale || 'default');
      setQuestions(loadedQuestions);
      
      // Load saved answers if they exist
      if (data.savedAnswers) {
        setAnswers(data.savedAnswers);
        
        // Find the first unanswered question to resume from
        const firstUnansweredIndex = loadedQuestions.findIndex(
          (q) => !data.savedAnswers[q.id]
        );
        
        // If all answered, go to last question, otherwise go to first unanswered
        if (firstUnansweredIndex === -1 && loadedQuestions.length > 0) {
          setCurrentIndex(loadedQuestions.length - 1);
        } else if (firstUnansweredIndex > 0) {
          setCurrentIndex(firstUnansweredIndex);
        }
      }

      if (data.status === "expired") {
        setStatus("expired");
      } else if (data.status === "completed") {
        setStatus("completed");
      } else if (data.status === "started") {
        setStatus("started");
      } else {
        setStatus("ready");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage("Failed to connect to server");
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendVerificationCode = async () => {
    const trimmedEmail = candidateEmail.trim();
    if (!trimmedEmail) {
      setEmailError("Email is required");
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setEmailError("");
    setIsSendingCode(true);

    try {
      const res = await fetch(`/api/embed/session/${sessionId}/send-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 429 && data.retryAfter) {
          setResendCooldown(data.retryAfter);
        }
        setEmailError(data.error || "Failed to send verification code");
        return;
      }

      setVerificationStep("code");
      setResendCooldown(60); // 60 second cooldown for resend
    } catch (err) {
      setEmailError("Failed to send verification code");
    } finally {
      setIsSendingCode(false);
    }
  };

  const verifyEmailCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setCodeError("Please enter the 6-digit code");
      return;
    }
    setCodeError("");
    setIsVerifying(true);

    try {
      const res = await fetch(`/api/embed/session/${sessionId}/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: candidateEmail.trim(), 
          code: verificationCode 
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setCodeError(data.error || "Invalid verification code");
        return;
      }

      setVerificationStep("verified");
    } catch (err) {
      setCodeError("Failed to verify code");
    } finally {
      setIsVerifying(false);
    }
  };

  const startAssessment = async () => {
    // Ensure email is verified before starting
    if (verificationStep !== "verified") {
      setEmailError("Please verify your email first");
      return;
    }

    const trimmedEmail = candidateEmail.trim();

    try {
      const res = await fetch(`/api/embed/session/${sessionId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateEmail: trimmedEmail }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === "EMAIL_NOT_VERIFIED") {
          setVerificationStep("email");
          setEmailError("Email verification expired. Please verify again.");
          return;
        }
        setStatus("error");
        setErrorMessage(getHumanReadableError(data, "Failed to start session"));
        return;
      }

      // Ensure questions are (re)hydrated with correct locale when starting
      if (session) {
        setQuestions(getQuestions(session.assessmentType, session.questionLocale || 'default'));
      }
      setStatus("started");
    } catch (err) {
      setStatus("error");
      setErrorMessage("Failed to start assessment");
    }
  };

  // Track the latest answers for debounced saves
  const answersRef = useRef<Record<string, string>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update ref whenever answers change
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  
  // Save progress to server (called on navigation)
  const saveProgressImmediately = useCallback(async (index: number) => {
    if (!sessionId || status !== "started") return;
    
    // Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    try {
      await fetch(`/api/embed/session/${sessionId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answersRef.current,
          lastAnsweredIndex: index,
        }),
      });
    } catch (err) {
      console.error("Failed to save progress:", err);
    }
  }, [sessionId, status]);
  
  // Debounced save - only fires 2 seconds after last change
  const debouncedSave = useCallback(() => {
    if (!sessionId || status !== "started") return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveProgressImmediately(currentIndex);
    }, 2000);
  }, [sessionId, status, currentIndex, saveProgressImmediately]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get time limit based on assessment type (in seconds)
  const getTimeLimit = () => {
    if (!session) return 1200;
    const type = session.assessmentType.replace(/-/g, '_');
    if (type === 'prompt_architecture') return 120; // 2 minutes per question
    return 1200; // 20 minutes for other assessments
  };

  // Initialize timer when assessment starts
  useEffect(() => {
    if (status === 'started' && session) {
      const isPromptArch = session.assessmentType.replace(/-/g, '_') === 'prompt_architecture';
      setTimeRemaining(isPromptArch ? 120 : 1200);
    }
  }, [status, session]);

  // Timer countdown effect
  useEffect(() => {
    if (status !== 'started' || isSubmitting) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;

        // Show warning at 5 minutes for regular or 30 seconds for prompt architecture
        const warningThreshold = session?.assessmentType.replace(/-/g, '_') === 'prompt_architecture' ? 30 : 300;
        if (newTime === warningThreshold && !showTimeWarning) {
          setShowTimeWarning(true);
        }

        // Auto-submit when time runs out
        if (newTime <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          setIsSubmitting(true);

          // Only auto-submit if user has answered at least one question
          if (Object.keys(answersRef.current).length > 0 && !hasSubmittedRef.current) {
            hasSubmittedRef.current = true;
            // Submit with current answers
            fetch(`/api/embed/session/${sessionId}/submit`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ answers: answersRef.current }),
            })
              .then((res) => res.json())
              .then((data) => {
                setCompletedScores(data);
                setStatus("completed");
                if (window.parent !== window) {
                  window.parent.postMessage(
                    {
                      type: "humanmetrix:completed",
                      sessionId,
                      scores: data.scores,
                      totalScore: data.totalScore,
                      percentile: data.percentile,
                    },
                    "*"
                  );
                }
              })
              .catch(() => {
                setStatus("error");
                setErrorMessage("Failed to submit assessment on time expiry");
              });
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
  }, [status, isSubmitting, showTimeWarning, sessionId, session]);

  // Reset timer for prompt architecture when moving to next question
  useEffect(() => {
    if (status === 'started' && session?.assessmentType.replace(/-/g, '_') === 'prompt_architecture') {
      setTimeRemaining(120); // Reset to 2 minutes per question
      setShowTimeWarning(false);
    }
  }, [currentIndex]);

  const handleAnswerChange = (value: string) => {
    const currentQ = questions[currentIndex];
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);
    
    // Trigger debounced save for text questions (will fire 2s after last change)
    if (currentQ.type === "text-input") {
      debouncedSave();
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      // Save progress immediately before moving to next question
      saveProgressImmediately(currentIndex + 1);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      // Save progress immediately before moving to previous question
      saveProgressImmediately(currentIndex - 1);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/embed/session/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setErrorMessage(getHumanReadableError(data, "Failed to submit answers"));
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      setCompletedScores(data);
      setStatus("completed");

      if (window.parent !== window) {
        // Post message to parent - widget validates the origin
        // Using '*' is acceptable here because:
        // 1. The receiving widget validates event.origin
        // 2. The data being sent (scores) is meant for the partner who created the session
        // 3. Session IDs are only known to the partner who created them
        window.parent.postMessage(
          {
            type: "humanmetrix:completed",
            sessionId,
            scores: data.scores,
            totalScore: data.totalScore,
            percentile: data.percentile,
          },
          "*"
        );
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage("Failed to submit assessment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQ = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const isLastQuestion = currentIndex === questions.length - 1;
  const hasAnswered = currentQ ? !!answers[currentQ.id] : false;
  const isPromptArchitecture = session?.assessmentType === "prompt_architecture";

  if (status === "loading") {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgMain}`} data-testid="embed-loading">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className={textSecondary}>Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgMain}`} data-testid="embed-error">
        <Card className={`max-w-md ${bgCard} border-red-500/30`}>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className={`text-xl font-semibold ${textPrimary} mb-2`}>Error</h2>
            <p className={textSecondary}>{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgMain}`} data-testid="embed-expired">
        <Card className={`max-w-md ${bgCard} border-amber-500/30`}>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className={`text-xl font-semibold ${textPrimary} mb-2`}>Session Expired</h2>
            <p className={textSecondary}>This assessment session has expired. Please request a new link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "completed") {
    const branding = session?.branding;
    const accentColor = branding?.accentColor || '#06b6d4';
    const displayName = branding?.companyDisplayName || session?.partnerName || 'HumanMetrix';
    
    // Calculate 30-day free unlock date
    const freeUnlockDate = new Date();
    freeUnlockDate.setDate(freeUnlockDate.getDate() + 30);
    const formattedDate = freeUnlockDate.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgMain} p-4`} data-testid="embed-completed">
        <Card className={`max-w-lg ${bgCard} border-green-500/30`}>
          <CardContent className="pt-6 text-center">
            {branding?.logoUrl && (
              <img 
                src={branding.logoUrl} 
                alt={displayName}
                className="h-10 max-w-[150px] object-contain mx-auto mb-4"
              />
            )}
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className={`text-xl font-semibold ${textPrimary} mb-2`}>Assessment Complete</h2>
            <p className={`${textSecondary} mb-4`}>Thank you for completing the assessment.</p>
            
            <div className={`${bgCardAlt} rounded-lg p-5 text-left space-y-4`}>
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-cyan-400 mt-0.5 shrink-0" />
                <div>
                  <p className={`font-medium ${textPrimary}`}>Check Your Email</p>
                  <p className={`text-sm ${textMuted}`}>
                    We've sent you a link to view your detailed results. Pay a small fee for instant access.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className={`font-medium ${textPrimary}`}>Or Wait for Free Results</p>
                  <p className={`text-sm ${textMuted}`}>
                    Your full results will be emailed to you automatically on <span className="font-medium" style={{ color: accentColor }}>{formattedDate}</span> at no cost.
                  </p>
                </div>
              </div>
            </div>
            
            <p className={`text-xs ${textMuted} mt-4`}>
              Didn't receive the email? Check your spam folder or contact support.
            </p>

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

  if (status === "ready") {
    const branding = session?.branding;
    const primaryColor = branding?.primaryColor || '#0891b2';
    const accentColor = branding?.accentColor || '#06b6d4';
    const displayName = branding?.companyDisplayName || session?.partnerName || 'HumanMetrix';
    const welcomeTitle = branding?.welcomeTitle;
    const welcomeMessage = branding?.welcomeMessage;
    
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgMain} p-4`} data-testid="embed-ready">
        <Card className={`max-w-lg ${bgCard}`}>
          <CardHeader className="text-center">
            {branding?.logoUrl ? (
              <img 
                src={branding.logoUrl} 
                alt={displayName}
                className="h-12 max-w-[200px] object-contain mx-auto mb-2"
                data-testid="img-partner-logo"
              />
            ) : (
              <Badge 
                className="mb-2 mx-auto border"
                style={{ 
                  backgroundColor: `${accentColor}20`,
                  color: accentColor,
                  borderColor: `${accentColor}4D`
                }}
                data-testid="badge-partner-name"
              >
                {displayName}
              </Badge>
            )}
            <CardTitle className={`text-2xl ${textPrimary}`}>
              {welcomeTitle || (session && getAssessmentDisplayName(session.assessmentType))}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`${textSecondary} space-y-3`}>
              {welcomeMessage ? (
                <p>{welcomeMessage}</p>
              ) : (
                <p>You are about to begin an assessment with {questions.length} questions.</p>
              )}
              <ul className={`list-disc list-inside text-sm space-y-1 ${textMuted}`}>
                <li>Answer each question honestly and thoughtfully</li>
                <li>There are no right or wrong answers</li>
                <li>Your progress will be saved automatically</li>
                <li>You have 20 minutes to complete the assessment</li>
              </ul>
            </div>

            {/* Email Verification Flow */}
            <div className="space-y-4">
              {/* Step 1: Email Input */}
              {verificationStep === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="candidate-email" className={textPrimary}>
                    Your Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="candidate-email"
                    type="email"
                    placeholder="Enter your email to receive your results"
                    value={candidateEmail}
                    onChange={(e) => {
                      setCandidateEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    className={`${inputBg} ${emailError ? 'border-red-500' : ''}`}
                    data-testid="input-candidate-email"
                  />
                  {emailError && (
                    <p className="text-sm text-red-500" data-testid="text-email-error">{emailError}</p>
                  )}
                  <p className={`text-xs ${textMuted}`}>
                    We'll send a verification code to confirm your email address.
                  </p>
                  <Button
                    onClick={sendVerificationCode}
                    className="w-full"
                    style={{ backgroundColor: primaryColor }}
                    disabled={isSendingCode}
                    data-testid="button-send-code"
                  >
                    {isSendingCode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending Code...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Verification Code
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Step 2: Verification Code Input */}
              {verificationStep === "code" && (
                <div className="space-y-3">
                  <div className={`${bgCardAlt} p-4 rounded-lg flex items-center gap-3`}>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className={`text-sm ${textPrimary}`}>Code sent to</p>
                      <p className={`text-sm font-medium ${textSecondary}`}>{candidateEmail}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-auto text-xs"
                      onClick={() => {
                        setVerificationStep("email");
                        setVerificationCode("");
                        setCodeError("");
                      }}
                      data-testid="button-change-email"
                    >
                      Change
                    </Button>
                  </div>
                  
                  <Label htmlFor="verification-code" className={textPrimary}>
                    Enter Verification Code
                  </Label>
                  <Input
                    id="verification-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setVerificationCode(value);
                      if (codeError) setCodeError("");
                    }}
                    className={`${inputBg} text-center text-2xl tracking-widest font-mono ${codeError ? 'border-red-500' : ''}`}
                    data-testid="input-verification-code"
                  />
                  {codeError && (
                    <p className="text-sm text-red-500" data-testid="text-code-error">{codeError}</p>
                  )}
                  
                  <Button
                    onClick={verifyEmailCode}
                    className="w-full"
                    style={{ backgroundColor: primaryColor }}
                    disabled={isVerifying || verificationCode.length !== 6}
                    data-testid="button-verify-code"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Email"
                    )}
                  </Button>
                  
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-sm ${textMuted}`}>Didn't receive the code?</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={sendVerificationCode}
                      disabled={resendCooldown > 0 || isSendingCode}
                      className="text-sm underline"
                      data-testid="button-resend-code"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Email Verified - Ready to Start */}
              {verificationStep === "verified" && (
                <div className="space-y-3">
                  <div className={`${bgCardAlt} p-4 rounded-lg flex items-center gap-3`}>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>Email Verified</p>
                      <p className={`text-sm ${textSecondary}`}>{candidateEmail}</p>
                    </div>
                  </div>
                  
                  <p className={`text-xs ${textMuted}`}>
                    After completing the assessment, you'll receive a payment link to view your results immediately, or you can wait 30 days for free access.
                  </p>
                  
                  <Button
                    onClick={startAssessment}
                    className="w-full"
                    style={{ backgroundColor: primaryColor }}
                    data-testid="button-start-assessment"
                  >
                    Start Assessment
                  </Button>
                </div>
              )}
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

  const branding = session?.branding;
  const primaryColor = branding?.primaryColor || '#0891b2';
  const accentColor = branding?.accentColor || '#06b6d4';

  return (
    <div className={`min-h-screen ${bgMain} p-4`} data-testid="embed-assessment">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Badge 
              className="border"
              style={{ 
                backgroundColor: `${accentColor}20`,
                color: accentColor,
                borderColor: `${accentColor}4D`
              }}
            >
              {session && getAssessmentDisplayName(session.assessmentType)}
            </Badge>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${textMuted}`}>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                timeRemaining <= (isPromptArchitecture ? 30 : 300) 
                  ? 'bg-red-500/20 text-red-400' 
                  : isLight ? 'bg-gray-200 text-gray-700' : 'bg-slate-700 text-slate-300'
              }`}>
                <Clock className="h-4 w-4" />
                <span className="text-sm font-semibold" data-testid="timer-display">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          </div>
          <Progress value={progress} className="h-2" style={{ '--progress-color': primaryColor } as any} />
          {showTimeWarning && (
            <div className={`mt-2 text-sm text-center ${isLight ? 'text-red-600' : 'text-red-400'}`}>
              {isPromptArchitecture ? '30 seconds remaining!' : '5 minutes remaining!'}
            </div>
          )}
        </div>

        <Card className={bgCard}>
          <CardContent className="pt-6">
            {isPromptArchitecture && currentQ?.type === "text-input" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    Level {currentQ.level}
                  </Badge>
                  <span className={`text-sm ${textMuted}`}>{currentQ.title}</span>
                </div>
                <p className={`${textSecondary} text-sm mb-4`}>{currentQ.description}</p>
                <div className={`${bgCardAlt} p-4 rounded-lg mb-4`}>
                  <h3 className={`font-semibold ${textPrimary} mb-2`}>Scenario</h3>
                  <p className={`${textSecondary} text-sm`}>{currentQ.text}</p>
                </div>
                {currentQ.taskInstructions && (
                  <div className="bg-cyan-900/20 border border-cyan-500/30 p-4 rounded-lg mb-4">
                    <h3 className="font-semibold text-cyan-400 mb-2">Your Task</h3>
                    <p className={`${textSecondary} text-sm`}>{currentQ.taskInstructions}</p>
                  </div>
                )}
                <Textarea
                  value={answers[currentQ.id] || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Write your prompt here..."
                  className={`min-h-[150px] ${inputBg}`}
                  data-testid="textarea-prompt-response"
                />
              </div>
            ) : (
              <div>
                <h2 className={`text-lg font-semibold ${textPrimary} mb-6`}>{currentQ?.text}</h2>
                <RadioGroup
                  value={answers[currentQ?.id] || ""}
                  onValueChange={handleAnswerChange}
                >
                  {currentQ?.options?.map((option) => (
                    <div
                      key={option.value}
                      className={`flex items-start space-x-3 mb-3 p-4 rounded-lg ${bgCardAlt} hover-elevate active-elevate-2 cursor-pointer`}
                    >
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

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`${borderColor} ${textSecondary}`}
            data-testid="button-previous"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={!hasAnswered || isSubmitting}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Assessment"
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!hasAnswered}
              style={{ backgroundColor: primaryColor }}
              data-testid="button-next"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

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
      </div>
    </div>
  );
}
