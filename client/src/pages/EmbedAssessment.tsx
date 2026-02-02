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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, CheckCircle, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, Clock, Mail, Calendar, TrendingUp, Target, Lightbulb } from "lucide-react";
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
import { getFITQuestions, getAIReadinessQuestions, getAIQQuestions, type QuestionLocale } from "@shared/questions";
import { PROMPT_ARCHITECTURE_LEVELS } from "../data/prompt-architecture-questions";
import { getHumanReadableError } from "@/lib/queryClient";
import { isValidEmail } from "@/lib/validation";
import { getAIQBandInterpretation } from "@/data/aiq-questions";

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
  timeRemaining?: number | null;
  isTestSession?: boolean;
  resultsPaymentStatus?: string;
  resultsReleaseStatus?: string;
  results?: {
    scores: Record<string, any>;
    totalScore: number;
    percentile: number;
    evaluations?: Record<string, any>;
  };
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

function generateAnalysis(assessmentType: string, scores: Record<string, number>, totalScore?: number) {
  const sortedSkills = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));
  const strengths = sortedSkills.filter(([_, score]) => (score as number) >= 70);
  const improvements = sortedSkills.filter(([_, score]) => (score as number) < 70);
  
  const analysis = {
    strengths: [] as string[],
    improvements: [] as string[],
    overall: "",
  };

  const normalizedType = assessmentType.replace(/-/g, "_");

  switch (normalizedType) {
    case "fit":
      analysis.overall = "This FIT assessment evaluates core behavioral competencies essential for workplace success and team collaboration.";
      
      if (strengths.length > 0) {
        strengths.forEach(([skill, score]) => {
          if (skill === "High Agency") {
            analysis.strengths.push(`Strong **High Agency** (${score}%): Takes initiative, drives outcomes independently, and shows proactive problem-solving abilities.`);
          } else if (skill === "Intellectual Curiosity") {
            analysis.strengths.push(`Excellent **Intellectual Curiosity** (${score}%): Shows eagerness to learn, asks thoughtful questions, and seeks to understand complex concepts.`);
          } else if (skill === "Resilience") {
            analysis.strengths.push(`Robust **Resilience** (${score}%): Bounces back from setbacks, maintains composure under pressure, and adapts to changing circumstances.`);
          } else if (skill === "Empathy & Ethics") {
            analysis.strengths.push(`Strong **Empathy & Ethics** (${score}%): Considers others' perspectives, makes ethical decisions, and demonstrates social awareness.`);
          } else if (skill === "Growth Mindset") {
            analysis.strengths.push(`Strong **Growth Mindset** (${score}%): Views challenges as opportunities, embraces feedback, and believes in continuous improvement.`);
          } else if (skill === "Interpersonal Agility") {
            analysis.strengths.push(`Excellent **Interpersonal Agility** (${score}%): Builds relationships effectively, adapts communication style, and collaborates seamlessly across diverse teams.`);
          }
        });
      }
      
      if (improvements.length > 0) {
        improvements.forEach(([skill, score]) => {
          if (skill === "High Agency") {
            analysis.improvements.push(`**High Agency** (${score}%): Consider taking more initiative on projects and seeking opportunities to lead rather than follow.`);
          } else if (skill === "Intellectual Curiosity") {
            analysis.improvements.push(`**Intellectual Curiosity** (${score}%): Try exploring topics beyond your immediate role and asking more probing questions.`);
          } else if (skill === "Resilience") {
            analysis.improvements.push(`**Resilience** (${score}%): Focus on developing coping strategies for stress and building your capacity to bounce back from challenges.`);
          } else if (skill === "Empathy & Ethics") {
            analysis.improvements.push(`**Empathy & Ethics** (${score}%): Practice active listening and considering multiple perspectives before making decisions.`);
          } else if (skill === "Growth Mindset") {
            analysis.improvements.push(`**Growth Mindset** (${score}%): Try reframing challenges as learning opportunities and seek constructive feedback.`);
          } else if (skill === "Interpersonal Agility") {
            analysis.improvements.push(`**Interpersonal Agility** (${score}%): Work on adapting your communication style for different audiences and building cross-functional relationships.`);
          }
        });
      }
      break;

    case "ai_readiness":
      analysis.overall = "This AI Readiness assessment measures your preparedness to work effectively in AI-enhanced environments.";
      
      if (strengths.length > 0) {
        strengths.forEach(([skill, score]) => {
          const skillLower = skill.toLowerCase();
          if (skillLower.includes("literacy") || skillLower.includes("prompting")) {
            analysis.strengths.push(`Strong **AI Literacy & Prompt Engineering** (${score}%): Demonstrates understanding of AI capabilities and can craft effective prompts.`);
          } else if (skillLower.includes("technical")) {
            analysis.strengths.push(`Excellent **Technical Fundamentals** (${score}%): Comfortable with technical concepts and AI tools.`);
          } else if (skillLower.includes("critical")) {
            analysis.strengths.push(`Outstanding **Critical Thinking & Problem-Solving** (${score}%): Evaluates AI outputs critically and identifies limitations.`);
          } else if (skillLower.includes("adaptive") || skillLower.includes("collaborative")) {
            analysis.strengths.push(`Proficient **Adaptability & Continuous Learning** (${score}%): Quickly adapts to new AI tools and learns collaboratively.`);
          } else if (skillLower.includes("responsible")) {
            analysis.strengths.push(`Strong **Responsible AI & Ethical Awareness** (${score}%): Uses AI ethically and understands implications.`);
          } else {
            analysis.strengths.push(`Strong **${skill}** (${score}%): Shows proficiency in this AI readiness dimension.`);
          }
        });
      }
      
      if (improvements.length > 0) {
        improvements.forEach(([skill, score]) => {
          const skillLower = skill.toLowerCase();
          if (skillLower.includes("literacy") || skillLower.includes("prompting")) {
            analysis.improvements.push(`**AI Literacy & Prompt Engineering** (${score}%): Recommend focused training on prompt engineering and AI fundamentals.`);
          } else if (skillLower.includes("technical")) {
            analysis.improvements.push(`**Technical Fundamentals** (${score}%): Suggest building technical foundation through hands-on practice with AI tools.`);
          } else if (skillLower.includes("critical")) {
            analysis.improvements.push(`**Critical Thinking & Problem-Solving** (${score}%): Develop skills in evaluating AI outputs and recognizing biases.`);
          } else {
            analysis.improvements.push(`**${skill}** (${score}%): Consider additional learning in this area.`);
          }
        });
      }
      break;

    case "prompt_architecture":
      analysis.overall = "This Prompt Architecture assessment evaluates your ability to craft effective prompts for AI systems.";
      analysis.improvements.push(`Prompts are scored across five dimensions (20 points each): Clarity, Structure, Context Relevance, Creativity, and Iterative Improvement.`);
      break;

    case "aiq":
      const aiqScore = totalScore || Object.values(scores)[0] as number || 0;
      const bandInterpretation = getAIQBandInterpretation(aiqScore);
      
      analysis.overall = `This Algorithmic Integrity Quotient (AIQ) assessment evaluates ethical reasoning in AI scenarios. Score: **${aiqScore}%** - **${bandInterpretation.title}** (${bandInterpretation.range}). ${bandInterpretation.description}`;
      
      if (aiqScore >= 80) {
        analysis.strengths.push(`**Exceptional ethical alignment**: Consistently prioritizes optimal ethical outcomes with sophisticated reasoning.`);
        analysis.strengths.push(`**Strategic ethical leadership**: Demonstrates ability to navigate gray areas while maintaining strong principles.`);
        analysis.strengths.push(`**AI governance ready**: Well-prepared for roles requiring ethical oversight of AI systems.`);
      } else if (aiqScore >= 60) {
        analysis.strengths.push(`**Solid ethical foundation**: Shows consistent ethical judgment in AI scenarios.`);
        analysis.strengths.push(`**Balanced decision-making**: Weighs multiple factors appropriately.`);
        analysis.improvements.push(`Consider deeper exploration of edge cases and complex ethical dilemmas.`);
      } else if (aiqScore >= 40) {
        analysis.improvements.push(`**Developing ethical awareness**: Recommend further study of AI ethics frameworks.`);
        analysis.improvements.push(`Focus on understanding the implications of AI decisions on different stakeholders.`);
      } else {
        analysis.improvements.push(`**Foundation building needed**: Suggest starting with AI ethics fundamentals and case studies.`);
        analysis.improvements.push(`Practice evaluating AI scenarios from multiple stakeholder perspectives.`);
      }
      break;
  }

  return analysis;
}

export default function EmbedAssessment() {
  // Use window.location.search directly for iframe compatibility
  const searchString = typeof window !== 'undefined' ? window.location.search : '';
  const params = new URLSearchParams(searchString);
  const sessionId = params.get("session");
  const theme = params.get("theme") || "dark";
  const inviteToken = params.get("inviteToken");
  const showResultsParam = params.get("showResults") === "true";
  
  // Debug: Log URL params on mount
  useEffect(() => {
    console.log('[EmbedAssessment] URL searchString:', searchString);
    console.log('[EmbedAssessment] inviteToken from URL:', inviteToken);
    console.log('[EmbedAssessment] Full URL:', window.location.href);
  }, []);
  const isDemo = params.get("demo") === "true";
  const singleType = params.get("type") || "fit";
  // Support both single type and comma-separated types (for both demo and real sessions)
  const urlTypes = params.get("types")?.split(",").filter(Boolean) || [singleType];
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
  const [isFromInvitation, setIsFromInvitation] = useState(false);
  const [invitationCompletionData, setInvitationCompletionData] = useState<{
    userExists: boolean;
    email: string;
    bundlePrice: string;
    originalPrice: string;
    discountPercentage: number;
    freeUnlockDate: string;
    dashboardUrl: string | null;
    createAccountUrl: string | null;
    paymentUrl: string;
  } | null>(null);
  const [isLoadingCompletion, setIsLoadingCompletion] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSubmittedRef = useRef<boolean>(false);
  const hasCalledCompletionRef = useRef<boolean>(false);
  
  // Multi-assessment state - use urlTypes for both demo and real sessions
  const [assessmentQueue, setAssessmentQueue] = useState<string[]>(urlTypes);
  const [currentAssessmentIndex, setCurrentAssessmentIndex] = useState(0);
  const [completedAssessments, setCompletedAssessments] = useState<Array<{ type: string; scores: any }>>([]);
  const [showTransitionScreen, setShowTransitionScreen] = useState(false);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [awaitingNextStart, setAwaitingNextStart] = useState(false); // Require user to click Start for next assessment
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingScoresRef = useRef<any>(null); // Store scores for transition
  
  const isMultiAssessment = assessmentQueue.length > 1;
  const currentAssessmentType = assessmentQueue[currentAssessmentIndex] || assessmentQueue[0];
  const isLastAssessment = currentAssessmentIndex >= assessmentQueue.length - 1;
  const isCurrentPromptArchitecture = currentAssessmentType === "prompt_architecture";

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
    // Demo mode - show sample assessment without real session
    if (isDemo) {
      const demoSession: SessionData = {
        sessionId: "demo-preview",
        assessmentType: currentAssessmentType,
        status: "ready",
        partnerName: "Demo Partner",
        isTestSession: true,
      };
      setSession(demoSession);
      // Limit to 2 questions per test in demo/sandbox mode
      const loadedQuestions = getQuestions(currentAssessmentType, 'default').slice(0, 2);
      setQuestions(loadedQuestions);
      setVerificationStep("verified"); // Skip verification for demo
      setStatus("ready");
      // Reset question index when assessment changes
      setCurrentIndex(0);
      setAnswers({});
      return;
    }

    if (!sessionId) {
      setStatus("error");
      setErrorMessage("No session ID provided");
      return;
    }

    fetchSession();
  }, [sessionId, isDemo, currentAssessmentType]);

  // Handle page restored from bfcache (back/forward navigation) and visibility changes
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      // If page is restored from bfcache, re-fetch session to get current state
      if (event.persisted && sessionId && !isDemo) {
        console.log('[EmbedAssessment] Page restored from bfcache, re-fetching session');
        setStatus('loading');
        fetchSession();
      }
    };

    // Also handle visibility change (tab becomes visible again)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && sessionId && !isDemo && status === 'loading') {
        console.log('[EmbedAssessment] Page visible with loading status, re-fetching session');
        fetchSession();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId, isDemo, status]);

  // Periodically save timer state to server while assessment is active
  // This ensures timer state is preserved even if the browser crashes
  useEffect(() => {
    if (status !== 'started' || isDemo || !sessionId) return;
    
    // Save timer state every 30 seconds as a backup
    const saveInterval = setInterval(() => {
      const payload = {
        answers: answersRef.current,
        lastAnsweredIndex: currentIndex,
        timeRemainingMs: timeRemainingRef.current * 1000,
      };
      fetch(`/api/embed/session/${sessionId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }, 30000);
    
    return () => clearInterval(saveInterval);
  }, [status, isDemo, sessionId, currentIndex]);

  // Track loading retry attempts
  const loadingRetryCountRef = useRef<number>(0);
  const MAX_LOADING_RETRIES = 3;

  // Loading timeout recovery - if stuck at loading for more than 10 seconds, retry with limit
  useEffect(() => {
    if (status !== 'loading' || isDemo || !sessionId) {
      // Reset retry count when not loading
      if (status !== 'loading') {
        loadingRetryCountRef.current = 0;
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      if (status === 'loading') {
        if (loadingRetryCountRef.current < MAX_LOADING_RETRIES) {
          loadingRetryCountRef.current += 1;
          console.log(`[EmbedAssessment] Loading timeout, retry ${loadingRetryCountRef.current}/${MAX_LOADING_RETRIES}`);
          fetchSession();
        } else {
          console.log('[EmbedAssessment] Max retries reached, transitioning to error state');
          setStatus('error');
          setErrorMessage('Failed to load session after multiple attempts. Please refresh the page.');
        }
      }
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [status, sessionId, isDemo]);

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
      
      // Skip email verification if session is from a partner invitation (magic link pattern)
      // The user clicked a link sent to their email, which serves as email verification
      console.log('[EmbedAssessment] isFromInvitation:', data.isFromInvitation, 'externalEmail:', data.externalEmail, 'invitationContext:', data.invitationContext);
      if (data.isFromInvitation) {
        setIsFromInvitation(true);
        if (data.externalEmail) {
          console.log('[EmbedAssessment] Skipping email verification for invitation');
          setVerificationStep("verified");
        }
        
        // Set up multi-assessment context from invitation
        if (data.invitationContext && data.invitationContext.assessmentTypes?.length > 1) {
          console.log('[EmbedAssessment] Setting up multi-assessment queue from invitation:', data.invitationContext);
          setAssessmentQueue(data.invitationContext.assessmentTypes);
          setCurrentAssessmentIndex(data.invitationContext.currentIndex);
        }
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

      // Set timer from server-provided remaining time for resumed assessments
      if (data.status === "started" && data.timeRemaining != null) {
        console.log(`[EmbedAssessment] Resuming with ${data.timeRemaining}s remaining`);
        setTimeRemaining(data.timeRemaining);
        
        // Call /start to execute the resume handshake (clears pausedTimeRemainingMs, adjusts startedAt)
        // This ensures the data model is consistent for future timer calculations
        if (!isDemo) {
          fetch(`/api/embed/session/${sessionId}/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resumeFromSaved: true }),
          }).catch(() => {
            // Non-blocking - timer state is already set from GET response
            console.log(`[EmbedAssessment] Resume handshake completed`);
          });
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
    return isValidEmail(email);
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
    // Clear awaiting flag when user explicitly starts
    setAwaitingNextStart(false);
    
    // Demo mode - just start without API call
    if (isDemo) {
      setStatus("started");
      return;
    }
    
    // For multi-assessment invitation flows, we only need to create a new session 
    // when we're TRANSITIONING to the next assessment after completing one.
    // If the current session is already for the correct assessment type, we can just start it.
    // The session's assessment type should match what we're trying to start.
    const expectedAssessmentType = assessmentQueue[currentAssessmentIndex];
    const sessionMatchesExpected = session?.assessmentType === expectedAssessmentType || 
                                    session?.assessmentType === expectedAssessmentType?.replace(/-/g, '_');
    
    // Only create a new session if we're in an invitation flow AND the current session 
    // doesn't match the expected assessment type (i.e., we just completed one and need to start the next)
    if (isFromInvitation && inviteToken && currentAssessmentIndex > 0 && !sessionMatchesExpected) {
      try {
        // Get the next assessment type from the queue
        const nextAssessmentType = assessmentQueue[currentAssessmentIndex];
        
        // Call invite start to get a new session for the next assessment
        const startRes = await fetch(`/api/invite/${inviteToken}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assessmentType: nextAssessmentType }),
        });

        if (!startRes.ok) {
          const data = await startRes.json().catch(() => ({}));
          setStatus("error");
          setErrorMessage(getHumanReadableError(data, "Failed to start next assessment"));
          return;
        }

        const startData = await startRes.json();
        const newSessionId = startData.sessionId;
        const remainingTypes = startData.assessmentTypes || [];
        
        // Redirect to the new session with the remaining assessment types
        // This ensures the URL has the correct session ID and the component reinitializes properly
        const newUrl = `/embed/assessment?session=${newSessionId}&types=${remainingTypes.join(',')}&inviteToken=${inviteToken}&theme=${isLight ? 'light' : 'dark'}`;
        window.location.href = newUrl;
        return;
      } catch (err) {
        setStatus("error");
        setErrorMessage("Failed to start next assessment");
        return;
      }
    }
    
    // For test sessions, skip email verification requirement
    // For production sessions, ensure email is verified before starting
    if (!session?.isTestSession && verificationStep !== "verified") {
      setEmailError("Please verify your email first");
      return;
    }

    // For test sessions, use a placeholder email or the one entered
    const trimmedEmail = session?.isTestSession 
      ? (candidateEmail.trim() || `test-${Date.now()}@test.example.com`)
      : candidateEmail.trim();

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

      const startData = await res.json();
      
      // Ensure questions are (re)hydrated with correct locale when starting
      if (session) {
        setQuestions(getQuestions(session.assessmentType, session.questionLocale || 'default'));
      }
      
      // Use server-provided timeRemaining (either full time for fresh start or remaining time for resume)
      if (startData.timeRemaining != null) {
        console.log(`[EmbedAssessment] Starting with ${startData.timeRemaining}s remaining`);
        setTimeRemaining(startData.timeRemaining);
      }
      
      setStatus("started");
    } catch (err) {
      setStatus("error");
      setErrorMessage("Failed to start assessment");
    }
  };

  // Track the latest answers and timer for debounced saves
  const answersRef = useRef<Record<string, string>>({});
  const timeRemainingRef = useRef<number>(1200);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update refs whenever state changes
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  
  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);
  
  // Save progress to server (called on navigation and beforeunload)
  const saveProgressImmediately = useCallback(async (index: number, includeTimer: boolean = false) => {
    // Skip API call in demo mode
    if (isDemo) return;
    if (!sessionId || status !== "started") return;
    
    // Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    const payload: any = {
      answers: answersRef.current,
      lastAnsweredIndex: index,
    };
    
    // Include timer state when saving on page leave to enable resume
    if (includeTimer) {
      payload.timeRemainingMs = timeRemainingRef.current * 1000;
    }
    
    try {
      await fetch(`/api/embed/session/${sessionId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Failed to save progress:", err);
    }
  }, [sessionId, status, isDemo]);
  
  // Debounced save - only fires 2 seconds after last change
  const debouncedSave = useCallback(() => {
    // Skip API call in demo mode
    if (isDemo) return;
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

  // Handle confirming to leave the assessment
  const handleConfirmLeave = useCallback(() => {
    setShowLeaveConfirmModal(false);
    
    // Save progress before leaving
    if (sessionId && Object.keys(answersRef.current).length > 0) {
      saveProgressImmediately(currentIndex);
    }
    
    // Set flag to allow navigation
    allowNavigationRef.current = true;
    
    // If embedded, notify parent about exit
    if (window.parent !== window) {
      window.parent.postMessage(
        { type: "humanmetrix:exit", sessionId, reason: "user_back" },
        "*"
      );
    }
    
    // Navigate back
    window.history.back();
  }, [sessionId, currentIndex, saveProgressImmediately]);

  // Handle canceling the leave action
  const handleCancelLeave = useCallback(() => {
    setShowLeaveConfirmModal(false);
  }, []);

  // Get time limit based on assessment type (in seconds)
  const getTimeLimit = () => {
    if (!session) return 1200;
    const type = session.assessmentType.replace(/-/g, '_');
    if (type === 'prompt_architecture') return 120; // 2 minutes per question
    return 1200; // 20 minutes for other assessments
  };

  // Timer is now initialized from server response in fetchSession and startAssessment
  // This ensures correct remaining time is used when resuming after tab close

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

  // Track navigation state to prevent re-entry
  const allowNavigationRef = useRef<boolean>(false);
  const historyPushedRef = useRef<boolean>(false);
  const guardPushedRef = useRef<boolean>(false); // Track if cancel guard was pushed

  // Warn user before leaving page during active assessment (tab close/refresh and back button)
  useEffect(() => {
    if (status !== 'started') {
      // Reset refs when not in started state
      allowNavigationRef.current = false;
      historyPushedRef.current = false;
      guardPushedRef.current = false;
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmitting && !allowNavigationRef.current) {
        // Save progress with timer state using sendBeacon for reliable delivery during page unload
        if (sessionId && !isDemo) {
          const payload = {
            answers: answersRef.current,
            lastAnsweredIndex: currentIndex,
            timeRemainingMs: timeRemainingRef.current * 1000,
          };
          navigator.sendBeacon(
            `/api/embed/session/${sessionId}/progress`,
            new Blob([JSON.stringify(payload)], { type: 'application/json' })
          );
        }
        
        e.preventDefault();
        e.returnValue = 'You have an assessment in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    // Handle browser back button
    const handlePopState = () => {
      // If navigation was explicitly allowed, don't intercept
      if (allowNavigationRef.current || isSubmitting) {
        return;
      }

      // Show confirmation modal instead of browser dialog
      setShowLeaveConfirmModal(true);
      
      // Push state to prevent immediate navigation while modal is shown
      window.history.pushState({ assessment: true, pending: true }, '', window.location.href);
    };

    // Push initial history state to enable back button detection (only once)
    if (!historyPushedRef.current) {
      historyPushedRef.current = true;
      window.history.pushState({ assessment: true }, '', window.location.href);
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [status, isSubmitting, sessionId, currentIndex, isDemo]);

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

  // Function to advance to next assessment in multi-assessment mode
  const advanceToNextAssessment = () => {
    // Clear any pending auto-advance timer to prevent double-advance
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    
    // Allow navigation for advancing to next assessment (prevents beforeunload dialog)
    allowNavigationRef.current = true;
    
    // Use stored scores from ref to avoid stale state
    const scoresForCompletion = pendingScoresRef.current;
    if (scoresForCompletion) {
      setCompletedAssessments(prev => [
        ...prev,
        { type: currentAssessmentType, scores: scoresForCompletion }
      ]);
      pendingScoresRef.current = null;
    }
    
    // For invitation flows, redirect back to the invitation landing page
    // This ensures a new session is created for the next assessment
    if (isFromInvitation && inviteToken) {
      window.location.href = `/invite/${inviteToken}`;
      return;
    }
    
    const nextIndex = currentAssessmentIndex + 1;
    const nextType = assessmentQueue[nextIndex];
    
    // Update session with new assessment type so questions reload correctly
    if (session) {
      setSession({
        ...session,
        assessmentType: nextType
      });
    }
    
    setShowTransitionScreen(false);
    setCurrentAssessmentIndex(nextIndex);
    setCompletedScores(null);
    setCurrentIndex(0);
    setAnswers({});
    setStatus("ready");
    setAwaitingNextStart(true); // Require user to click Start for next assessment
    hasSubmittedRef.current = false;
    
    // Reset timer for next assessment (20 min for regular, 7 min for prompt architecture)
    setTimeRemaining(nextType === "prompt_architecture" ? 420 : 1200);
    setShowTimeWarning(false);
    
    // Load new questions for the next assessment type
    if (isDemo) {
      // Limit to 2 questions per test in demo/sandbox mode
      const loadedQuestions = getQuestions(nextType, 'default').slice(0, 2);
      setQuestions(loadedQuestions);
    }
    // For real sessions, questions will reload via fetchSession/startAssessment
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Demo mode - show mock completion
    if (isDemo) {
      const demoScores = {
        scores: { "Demo Score": 75 },
        totalScore: 75,
        percentile: 65,
      };
      setCompletedScores(demoScores);
      
      // If multi-assessment and not the last one, show transition screen
      if (isMultiAssessment && !isLastAssessment) {
        // Store scores in ref for use in advanceToNextAssessment
        pendingScoresRef.current = demoScores;
        setShowTransitionScreen(true);
        setIsSubmitting(false);
        // No auto-advance - user must click button to start next assessment
        return;
      }
      
      setStatus("completed");
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Include multi-assessment context for proper email handling
      const multiAssessmentContext = isMultiAssessment ? {
        assessmentTypes: assessmentQueue,
        currentIndex: currentAssessmentIndex,
        isLastInSeries: isLastAssessment,
        completedInSession: completedAssessments.map(a => a.type),
      } : null;
      
      const res = await fetch(`/api/embed/session/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          answers,
          multiAssessmentContext,
        }),
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

      // For multi-assessment mode, notify parent for each assessment completion
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: isMultiAssessment && !isLastAssessment ? "humanmetrix:assessment_completed" : "humanmetrix:completed",
            sessionId,
            assessmentType: currentAssessmentType,
            scores: data.scores,
            totalScore: data.totalScore,
            percentile: data.percentile,
            isLastAssessment,
            completedCount: currentAssessmentIndex + 1,
            totalCount: assessmentQueue.length,
          },
          "*"
        );
      }
      
      // If multi-assessment and not the last one, show transition screen
      if (isMultiAssessment && !isLastAssessment) {
        // Store scores in ref for use in advanceToNextAssessment
        pendingScoresRef.current = data;
        setShowTransitionScreen(true);
        setIsSubmitting(false);
        // No auto-advance - user must click button to start next assessment
        return;
      }
      
      setStatus("completed");
    } catch (err) {
      setStatus("error");
      setErrorMessage("Failed to submit assessment");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Cleanup transition timer
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  // Call completion API when partner invitation is fully complete
  useEffect(() => {
    if (status === "completed" && isFromInvitation && inviteToken && !hasCalledCompletionRef.current) {
      hasCalledCompletionRef.current = true;
      setIsLoadingCompletion(true);
      
      fetch(`/api/invite/${inviteToken}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setInvitationCompletionData({
              userExists: data.userExists,
              email: data.email,
              bundlePrice: data.bundlePrice,
              originalPrice: data.originalPrice,
              discountPercentage: data.discountPercentage,
              freeUnlockDate: data.freeUnlockDate,
              dashboardUrl: data.dashboardUrl,
              createAccountUrl: data.createAccountUrl,
              paymentUrl: data.paymentUrl,
            });
          }
        })
        .catch(err => {
          console.error('[Invite Complete] Error:', err);
        })
        .finally(() => {
          setIsLoadingCompletion(false);
        });
    }
  }, [status, isFromInvitation, inviteToken]);

  const currentQ = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const isLastQuestion = currentIndex === questions.length - 1;
  const hasAnswered = currentQ ? !!answers[currentQ.id] : false;
  // Use currentAssessmentType for prompt architecture checks (works in multi-assessment mode)
  const isPromptArchitecture = isCurrentPromptArchitecture;

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900" data-testid="embed-loading">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 loader-pulse">
            <img src="/favicon.png" alt="HumanMetrix" className="w-full h-full object-contain" />
          </div>
          <p className="font-semibold text-lg">
            <span className="text-white">Human</span>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Metrix</span>
          </p>
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

  // Multi-assessment transition screen
  if (showTransitionScreen && isMultiAssessment) {
    const branding = session?.branding;
    const primaryColor = branding?.primaryColor || '#0891b2';
    const accentColor = branding?.accentColor || '#06b6d4';
    const nextAssessmentType = assessmentQueue[currentAssessmentIndex + 1];
    const nextAssessmentName = getAssessmentDisplayName(nextAssessmentType);
    const completedName = getAssessmentDisplayName(currentAssessmentType);
    const isTestMode = isDemo || session?.isTestSession;
    
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgMain} p-4`} data-testid="embed-transition">
        <Card className={`max-w-lg w-full ${bgCard}`}>
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="relative">
              <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: accentColor }} />
              <div className="absolute inset-0 animate-ping opacity-20">
                <CheckCircle className="h-16 w-16 mx-auto" style={{ color: accentColor }} />
              </div>
            </div>
            
            <div>
              <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>
                {completedName} Complete!
              </h2>
              <p className={textSecondary}>
                Great job! You've completed {currentAssessmentIndex + 1} of {assessmentQueue.length} assessments.
              </p>
            </div>
            
            <div className="flex justify-center gap-2">
              {assessmentQueue.map((type, index) => (
                <div
                  key={type}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    index <= currentAssessmentIndex
                      ? 'bg-green-500'
                      : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
            
            {/* Check email / Developer Test Mode message */}
            {isTestMode ? (
              <div className={`p-4 rounded-lg border ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/20 border-amber-500/30'}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertCircle className={`w-5 h-5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                  <p className={`font-semibold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                    Developer Test Mode
                  </p>
                </div>
                <p className={`text-sm ${isLight ? 'text-amber-600' : 'text-amber-300'}`}>
                  This was a test session. No billing occurred and no emails were sent. In production, candidates will receive confirmation emails between assessments.
                </p>
              </div>
            ) : (
              <div className={`p-4 rounded-lg ${isLight ? 'bg-blue-50 border border-blue-200' : 'bg-blue-900/20 border border-blue-500/30'}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Mail className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                  <p className={`font-semibold ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                    Check Your Email
                  </p>
                </div>
                <p className={`text-sm ${isLight ? 'text-blue-600' : 'text-blue-300'}`}>
                  We've sent a confirmation of your results. When you're ready, continue to the next assessment.
                </p>
              </div>
            )}
            
            <div className={`p-4 rounded-lg ${isLight ? 'bg-cyan-50 border border-cyan-200' : 'bg-cyan-900/20 border border-cyan-500/30'}`}>
              <p className={`text-sm ${isLight ? 'text-cyan-800' : 'text-cyan-300'} mb-2`}>
                Next up:
              </p>
              <p className={`font-semibold ${textPrimary}`}>{nextAssessmentName}</p>
            </div>
            
            <Button
              onClick={advanceToNextAssessment}
              style={{ backgroundColor: primaryColor }}
              className="text-white w-full"
              size="lg"
              data-testid="button-start-next-assessment"
            >
              Continue to {nextAssessmentName}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only show completed screen if:
  // 1. Status is "completed" AND
  // 2. We have actual completed scores (not null after advancing) AND
  // 3. Either it's not multi-assessment OR we're on the last assessment
  // This prevents showing completion screen between assessments
  if (status === "completed" && completedScores !== null && (!isMultiAssessment || isLastAssessment)) {
    const branding = session?.branding;
    const accentColor = branding?.accentColor || '#06b6d4';
    const displayName = branding?.companyDisplayName || session?.partnerName || 'HumanMetrix';
    
    // Check if results should be shown (payment completed or results released)
    const canViewResults = session?.resultsPaymentStatus === 'paid' || session?.resultsReleaseStatus === 'released';
    const hasResults = session?.results && session.results.totalScore !== undefined;
    
    // Show actual results if payment is complete and showResults param is set
    if ((showResultsParam || canViewResults) && hasResults) {
      const results = session.results;
      const assessmentType = session.assessmentType;
      const assessmentName = getAssessmentDisplayName(assessmentType);
      const normalizedType = assessmentType.replace(/-/g, "_");
      
      // Generate comprehensive analysis
      const analysis = generateAnalysis(assessmentType, results.scores || {}, results.totalScore);
      
      // Get AIQ band interpretation if applicable
      const isAIQ = normalizedType === "aiq";
      const aiqBand = isAIQ ? getAIQBandInterpretation(results.totalScore) : null;
      
      // Helper to render markdown-like bold text
      const renderText = (text: string) => {
        const parts = text.split(/\*\*(.*?)\*\*/g);
        return parts.map((part, i) => 
          i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
        );
      };
      
      return (
        <div className={`min-h-screen ${bgMain} p-4`} data-testid="embed-results">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className={bgCard}>
              <CardHeader className="text-center border-b border-slate-700/30 pb-6">
                {branding?.logoUrl && (
                  <img 
                    src={branding.logoUrl} 
                    alt={displayName}
                    className="h-10 max-w-[150px] object-contain mx-auto mb-4"
                  />
                )}
                <Badge className="mx-auto mb-3 bg-green-500/20 text-green-400 border-green-500/30">
                  Results Unlocked
                </Badge>
                <CardTitle className={textPrimary}>{assessmentName} Results</CardTitle>
                <p className={`${textSecondary} text-sm mt-2`}>
                  Your assessment has been scored and your results are ready.
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Score Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className={`${bgCardAlt} rounded-lg p-6 text-center`}>
                    <p className={`text-sm ${textMuted} mb-2`}>Overall Score</p>
                    <p className="text-2xl md:text-4xl font-bold" style={{ color: accentColor }}>
                      {results.totalScore}%
                    </p>
                    {isAIQ && aiqBand && (
                      <Badge 
                        className={`mt-3 ${
                          results.totalScore >= 80 ? 'bg-green-600' :
                          results.totalScore >= 60 ? 'bg-blue-600' :
                          results.totalScore >= 40 ? 'bg-amber-500' :
                          'bg-red-500'
                        } text-white border-0`}
                        data-testid="badge-aiq-band"
                      >
                        {aiqBand.title}
                      </Badge>
                    )}
                  </div>
                  <div className={`${bgCardAlt} rounded-lg p-6 text-center`}>
                    <p className={`text-sm ${textMuted} mb-2`}>Percentile</p>
                    <p className="text-2xl md:text-4xl font-bold" style={{ color: accentColor }}>
                      {results.percentile}%
                    </p>
                    <p className={`text-xs ${textMuted} mt-1`}>
                      You scored better than {results.percentile}% of test takers
                    </p>
                  </div>
                </div>
                
                {/* AIQ Band Description */}
                {isAIQ && aiqBand && (
                  <div className={`flex gap-4 mb-8`} data-testid="container-aiq-band-description">
                    <div className="w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
                    <div className={`${bgCardAlt} rounded-lg p-6 flex-1`}>
                      <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>{aiqBand.title}</h3>
                      <p className={`text-sm ${textMuted} mb-2`}>{aiqBand.range}</p>
                      <p className={`${textSecondary}`}>{aiqBand.description}</p>
                    </div>
                  </div>
                )}
                
                {/* Overall Analysis */}
                {analysis.overall && (
                  <div className={`${bgCardAlt} rounded-lg p-6 mb-8`} data-testid="container-assessment-overview">
                    <div className="flex items-start gap-3">
                      <Target className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
                      <div>
                        <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Assessment Overview</h3>
                        <p className={`${textSecondary}`}>{renderText(analysis.overall)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Score Breakdown */}
                {results.scores && Object.keys(results.scores).length > 0 && Object.keys(results.scores).length > 1 && (
                  <div className="mb-8" data-testid="container-score-breakdown">
                    <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Score Breakdown</h3>
                    <div className="space-y-4">
                      {Object.entries(results.scores).map(([category, score]) => (
                        <div key={category} className={`${bgCardAlt} rounded-lg p-4`} data-testid={`text-score-${category.replace(/\s/g, '-').toLowerCase()}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className={`font-medium ${textPrimary} capitalize`}>
                              {category.replace(/_/g, ' ')}
                            </span>
                            <span className="font-semibold" style={{ color: accentColor }}>
                              {typeof score === 'number' ? `${score}%` : String(score)}
                            </span>
                          </div>
                          {typeof score === 'number' && (
                            <Progress value={score} className="h-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Strengths Section */}
                {analysis.strengths.length > 0 && (
                  <div className="mb-8" data-testid="container-strengths">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <h3 className={`text-lg font-semibold ${textPrimary}`}>Key Strengths</h3>
                    </div>
                    <div className="space-y-3">
                      {analysis.strengths.map((strength, idx) => (
                        <div key={idx} className="flex gap-3" data-testid={`text-strength-${idx}`}>
                          <div className="w-1 flex-shrink-0 rounded-full bg-green-500" />
                          <div className={`${bgCardAlt} rounded-lg p-4 flex-1`}>
                            <p className={`${textSecondary} text-sm`}>{renderText(strength)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Areas for Development Section */}
                {analysis.improvements.length > 0 && (
                  <div className="mb-8" data-testid="container-improvements">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      <h3 className={`text-lg font-semibold ${textPrimary}`}>Areas for Development</h3>
                    </div>
                    <div className="space-y-3">
                      {analysis.improvements.map((improvement, idx) => (
                        <div key={idx} className="flex gap-3" data-testid={`text-improvement-${idx}`}>
                          <div className="w-1 flex-shrink-0 rounded-full bg-amber-500" />
                          <div className={`${bgCardAlt} rounded-lg p-4 flex-1`}>
                            <p className={`${textSecondary} text-sm`}>{renderText(improvement)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Detailed Evaluations (for Prompt Architecture) */}
                {results.evaluations && Object.keys(results.evaluations).length > 0 && (
                  <div className="mb-8" data-testid="container-evaluations">
                    <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Detailed Evaluations</h3>
                    <div className="space-y-4">
                      {Object.entries(results.evaluations).map(([key, evaluation]: [string, any]) => (
                        <div key={key} className={`${bgCardAlt} rounded-lg p-4`} data-testid={`text-evaluation-${key.replace(/\s/g, '-').toLowerCase()}`}>
                          <h4 className={`font-medium ${textPrimary} mb-2 capitalize`}>
                            {key.replace(/_/g, ' ')}
                          </h4>
                          {typeof evaluation === 'object' && evaluation?.feedback && (
                            <p className={`text-sm ${textSecondary}`}>{evaluation.feedback}</p>
                          )}
                          {typeof evaluation === 'object' && evaluation?.score !== undefined && (
                            <p className="text-sm mt-2" style={{ color: accentColor }}>
                              Score: {evaluation.score}%
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-8 pt-6 border-t border-slate-700/30 flex items-center justify-center gap-2">
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
        </div>
      );
    }
    
    // Simplified completion screen for test sessions
    if (session?.isTestSession) {
      const primaryColor = branding?.primaryColor || '#0891b2';
      return (
        <div className={`min-h-screen flex items-center justify-center ${bgMain} p-4`} data-testid="embed-completed-test">
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
              <h2 className={`text-xl font-semibold ${textPrimary} mb-2`}>Test Complete</h2>
              <p className={`${textSecondary} mb-4`}>The assessment has been completed successfully.</p>
              
              <div className={`${bgCardAlt} p-4 rounded-lg border border-amber-500/30`}>
                <div className="flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <p className="text-sm text-amber-500 font-medium">Developer Test Mode</p>
                </div>
                <p className={`text-xs ${textMuted} mt-2`}>
                  This was a test session. No billing occurred and no emails were sent.
                  In production, candidates will receive payment links to access their results.
                </p>
              </div>

              {inviteToken && (
                <Button
                  className="mt-6 w-full"
                  onClick={() => window.location.href = `/invite/${inviteToken}`}
                  style={{ backgroundColor: primaryColor }}
                  data-testid="button-return-to-invite"
                >
                  Return to Continue
                </Button>
              )}

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
    
    // Enhanced completion screen for partner invitation sessions with pricing and account options
    if (isFromInvitation) {
      const primaryColor = branding?.primaryColor || '#0891b2';
      const freeDate = invitationCompletionData?.freeUnlockDate 
        ? new Date(invitationCompletionData.freeUnlockDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
      
      return (
        <div className={`min-h-screen flex items-center justify-center ${bgMain} p-4`} data-testid="embed-completed-invitation">
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
              <h2 className={`text-xl font-semibold ${textPrimary} mb-2`}>All Assessments Complete!</h2>
              <p className={`${textSecondary} mb-4`}>
                Thank you for completing all {assessmentQueue.length} assessment{assessmentQueue.length > 1 ? 's' : ''}.
              </p>
              
              <div className={`${bgCardAlt} p-4 rounded-lg border border-green-500/30 mb-4`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-green-400 font-medium">Results Submitted to {displayName}</p>
                </div>
                <p className={`text-sm ${textMuted}`}>
                  We've sent you an email with details on how to unlock your full results.
                </p>
              </div>

              {/* Pricing Bundle Section */}
              {isLoadingCompletion ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                </div>
              ) : invitationCompletionData && (
                <div className={`${bgCardAlt} p-4 rounded-lg border border-amber-500/30 mb-4`}>
                  <div className="text-center mb-3">
                    <p className="text-sm font-medium text-amber-400">Unlock Your Full Results</p>
                    {invitationCompletionData.discountPercentage > 0 && (
                      <span className="inline-block bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full mt-1">
                        {invitationCompletionData.discountPercentage}% Bundle Discount
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    {invitationCompletionData.discountPercentage > 0 && (
                      <span className="text-lg line-through text-slate-500">{invitationCompletionData.originalPrice}</span>
                    )}
                    <span className="text-2xl font-bold text-green-400">{invitationCompletionData.bundlePrice}</span>
                  </div>
                  <p className={`text-xs ${textMuted} mt-2`}>
                    Or wait until {freeDate} to access your results for free
                  </p>
                </div>
              )}

              {/* Account Actions */}
              <div className="space-y-3 mt-4">
                {invitationCompletionData?.userExists ? (
                  <>
                    <Button
                      className="w-full"
                      style={{ backgroundColor: primaryColor }}
                      onClick={() => window.location.href = '/dashboard'}
                      data-testid="button-go-to-dashboard"
                    >
                      Go to Dashboard
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.location.href = invitationCompletionData.paymentUrl}
                      data-testid="button-unlock-results"
                    >
                      Unlock Results Now
                    </Button>
                  </>
                ) : invitationCompletionData ? (
                  <>
                    <Button
                      className="w-full"
                      style={{ backgroundColor: primaryColor }}
                      onClick={() => window.location.href = invitationCompletionData.createAccountUrl || '/register'}
                      data-testid="button-create-account"
                    >
                      Create Account to View Results
                    </Button>
                    <p className={`text-xs ${textMuted}`}>
                      Already have an account?{' '}
                      <a href="/login" className="text-cyan-400 hover:underline">Log in</a>
                    </p>
                  </>
                ) : (
                  <Button
                    className="w-full"
                    style={{ backgroundColor: primaryColor }}
                    onClick={() => window.location.href = '/register'}
                    data-testid="button-create-account"
                  >
                    Create Account
                  </Button>
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
    
    // Calculate 30-day free unlock date
    const primaryColor = branding?.primaryColor || '#0891b2';
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

            {inviteToken && (
              <Button
                className="mt-6 w-full"
                onClick={() => window.location.href = `/invite/${inviteToken}`}
                style={{ backgroundColor: primaryColor }}
                data-testid="button-return-to-invite"
              >
                Return to Continue
              </Button>
            )}

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

  // Show ready screen if status is "ready" OR if user needs to confirm starting next assessment
  if (status === "ready" || awaitingNextStart) {
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
                <li>You have {currentAssessmentType === "prompt_architecture" ? "7" : "20"} minutes to complete {isMultiAssessment ? "each assessment" : "the assessment"}</li>
              </ul>
            </div>

            {/* Multi-Assessment Series Indicator */}
            {isMultiAssessment && (
              <div className={`${bgCardAlt} p-4 rounded-lg border ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
                <p className={`text-sm font-medium ${textPrimary} mb-3`}>
                  Assessment Series ({currentAssessmentIndex + 1} of {assessmentQueue.length})
                </p>
                <div className="space-y-2">
                  {assessmentQueue.map((type, index) => {
                    const isCompleted = index < currentAssessmentIndex;
                    const isCurrent = index === currentAssessmentIndex;
                    const isPending = index > currentAssessmentIndex;
                    
                    return (
                      <div 
                        key={type}
                        className={`flex items-center gap-3 p-2 rounded ${
                          isCurrent 
                            ? (isLight ? 'bg-cyan-50 border border-cyan-200' : 'bg-cyan-900/20 border border-cyan-700')
                            : ''
                        }`}
                        data-testid={`assessment-series-item-${type}`}
                      >
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          isCompleted 
                            ? 'bg-green-500 text-white'
                            : isCurrent
                              ? 'bg-cyan-500 text-white'
                              : (isLight ? 'bg-slate-200 text-slate-500' : 'bg-slate-700 text-slate-400')
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <span className={`text-sm ${
                          isCurrent 
                            ? `font-medium ${textPrimary}`
                            : isCompleted
                              ? `${textMuted} line-through`
                              : textMuted
                        }`}>
                          {getAssessmentDisplayName(type)}
                        </span>
                        {isCurrent && (
                          <Badge variant="outline" className="ml-auto text-xs border-cyan-500 text-cyan-500">
                            Current
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Test Mode - Simplified Start Flow */}
            {session?.isTestSession ? (
              <div className="space-y-4">
                <div className={`${bgCardAlt} p-4 rounded-lg border border-amber-500/30`}>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <p className="text-sm text-amber-500 font-medium">Developer Test Mode</p>
                  </div>
                  <p className={`text-xs ${textMuted} mt-2`}>
                    This is a test session. Email verification and billing are disabled. 
                    Use this to validate your integration before going live.
                  </p>
                </div>
                
                <Button
                  onClick={startAssessment}
                  className="w-full"
                  style={{ backgroundColor: primaryColor }}
                  data-testid="button-start-assessment-test"
                >
                  Start Test
                </Button>
              </div>
            ) : (
              /* Production Mode - Email Verification Flow */
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
                    
                    <div className="text-center space-y-4">
                      <div>
                        <Label className={`text-base font-medium ${textPrimary}`}>
                          Enter Verification Code
                        </Label>
                        <p className={`text-xs ${textMuted} mt-1`}>
                          Enter the 6-digit code sent to your email
                        </p>
                      </div>
                      
                      <div className="flex justify-center py-2" data-testid="input-verification-code">
                        <InputOTP
                          maxLength={6}
                          value={verificationCode}
                          onChange={(value) => {
                            setVerificationCode(value);
                            if (codeError) setCodeError("");
                          }}
                          onComplete={(value) => {
                            setVerificationCode(value);
                            // Auto-submit when all 6 digits are entered
                            setTimeout(() => {
                              const verifyBtn = document.querySelector('[data-testid="button-verify-code"]') as HTMLButtonElement;
                              if (verifyBtn && !verifyBtn.disabled) {
                                verifyBtn.click();
                              }
                            }, 100);
                          }}
                          disabled={isVerifying}
                        >
                          <InputOTPGroup className="gap-3">
                            <InputOTPSlot 
                              index={0} 
                              className={`h-14 w-11 text-2xl font-semibold rounded-lg border-2 shadow-sm transition-all duration-200 ${
                                isLight 
                                  ? 'bg-white border-gray-200 text-gray-900 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20' 
                                  : 'bg-slate-800 border-slate-600 text-white focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20'
                              } ${codeError ? 'border-red-500' : ''}`}
                            />
                            <InputOTPSlot 
                              index={1} 
                              className={`h-14 w-11 text-2xl font-semibold rounded-lg border-2 shadow-sm transition-all duration-200 ${
                                isLight 
                                  ? 'bg-white border-gray-200 text-gray-900 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20' 
                                  : 'bg-slate-800 border-slate-600 text-white focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20'
                              } ${codeError ? 'border-red-500' : ''}`}
                            />
                            <InputOTPSlot 
                              index={2} 
                              className={`h-14 w-11 text-2xl font-semibold rounded-lg border-2 shadow-sm transition-all duration-200 ${
                                isLight 
                                  ? 'bg-white border-gray-200 text-gray-900 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20' 
                                  : 'bg-slate-800 border-slate-600 text-white focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20'
                              } ${codeError ? 'border-red-500' : ''}`}
                            />
                            <div className={`flex items-center px-1 ${textMuted}`}>
                              <div className="w-2 h-0.5 bg-current rounded-full opacity-40"></div>
                            </div>
                            <InputOTPSlot 
                              index={3} 
                              className={`h-14 w-11 text-2xl font-semibold rounded-lg border-2 shadow-sm transition-all duration-200 ${
                                isLight 
                                  ? 'bg-white border-gray-200 text-gray-900 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20' 
                                  : 'bg-slate-800 border-slate-600 text-white focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20'
                              } ${codeError ? 'border-red-500' : ''}`}
                            />
                            <InputOTPSlot 
                              index={4} 
                              className={`h-14 w-11 text-2xl font-semibold rounded-lg border-2 shadow-sm transition-all duration-200 ${
                                isLight 
                                  ? 'bg-white border-gray-200 text-gray-900 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20' 
                                  : 'bg-slate-800 border-slate-600 text-white focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20'
                              } ${codeError ? 'border-red-500' : ''}`}
                            />
                            <InputOTPSlot 
                              index={5} 
                              className={`h-14 w-11 text-2xl font-semibold rounded-lg border-2 shadow-sm transition-all duration-200 ${
                                isLight 
                                  ? 'bg-white border-gray-200 text-gray-900 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20' 
                                  : 'bg-slate-800 border-slate-600 text-white focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20'
                              } ${codeError ? 'border-red-500' : ''}`}
                            />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      
                      {codeError && (
                        <p className="text-sm text-red-500 text-center" data-testid="text-code-error">{codeError}</p>
                      )}
                      
                      {isVerifying ? (
                        <div className="flex items-center justify-center gap-2 py-3">
                          <Loader2 className="h-5 w-5 animate-spin" style={{ color: primaryColor }} />
                          <span className={`text-sm font-medium ${textSecondary}`}>Verifying code...</span>
                        </div>
                      ) : (
                        <Button
                          onClick={verifyEmailCode}
                          className="w-full"
                          style={{ backgroundColor: primaryColor }}
                          disabled={verificationCode.length !== 6}
                          data-testid="button-verify-code"
                        >
                          Verify Email
                        </Button>
                      )}
                    </div>
                    
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
            )}

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
        {/* Multi-assessment progress indicator */}
        {isMultiAssessment && (
          <div className={`mb-4 p-3 rounded-lg ${isLight ? 'bg-blue-50 border border-blue-200' : 'bg-blue-900/20 border border-blue-500/30'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${isLight ? 'text-blue-800' : 'text-blue-300'}`}>
                Assessment {currentAssessmentIndex + 1} of {assessmentQueue.length}
              </span>
              <span className={`text-xs ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                {completedAssessments.length} completed
              </span>
            </div>
            <div className="flex gap-1.5">
              {assessmentQueue.map((type, index) => (
                <div
                  key={type}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    index < currentAssessmentIndex
                      ? 'bg-green-500'
                      : index === currentAssessmentIndex
                        ? isLight ? 'bg-blue-500' : 'bg-cyan-500'
                        : isLight ? 'bg-blue-200' : 'bg-slate-600'
                  }`}
                  title={getAssessmentDisplayName(type)}
                />
              ))}
            </div>
          </div>
        )}
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
              <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 ${
                timeRemaining <= (isPromptArchitecture ? 30 : 300) 
                  ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' 
                  : isLight ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-blue-900/30 text-blue-300 border-blue-500/30'
              }`}>
                <Clock className="h-5 w-5" />
                <span className="text-lg font-bold tabular-nums" data-testid="timer-display">
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

      <AlertDialog open={showLeaveConfirmModal} onOpenChange={setShowLeaveConfirmModal}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Leave Assessment?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              You have an assessment in progress. Your answers have been saved, but leaving now may affect your results. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleCancelLeave}
              className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
              data-testid="button-cancel-leave"
            >
              Stay
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLeave}
              className="bg-red-500 hover:bg-red-600 text-white"
              data-testid="button-confirm-leave"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
