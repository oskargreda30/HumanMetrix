import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { getFITQuestions, getAIReadinessQuestions, getAIQQuestions, type QuestionLocale } from "@shared/questions";
import { PROMPT_ARCHITECTURE_LEVELS } from "../data/prompt-architecture-questions";

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
        const data = await res.json();
        if (data.error === "Session has expired") {
          setStatus("expired");
        } else {
          setStatus("error");
          setErrorMessage(data.error || "Failed to load session");
        }
        return;
      }

      const data = await res.json();
      setSession(data);

      if (data.status === "expired") {
        setStatus("expired");
      } else if (data.status === "completed") {
        setStatus("completed");
      } else if (data.status === "started") {
        setQuestions(getQuestions(data.assessmentType, data.questionLocale || 'default'));
        setStatus("started");
      } else {
        setQuestions(getQuestions(data.assessmentType, data.questionLocale || 'default'));
        setStatus("ready");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage("Failed to connect to server");
    }
  };

  const startAssessment = async () => {
    try {
      const res = await fetch(`/api/embed/session/${sessionId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        setStatus("error");
        setErrorMessage(data.error || "Failed to start session");
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

  const handleAnswerChange = (value: string) => {
    const currentQ = questions[currentIndex];
    setAnswers((prev) => ({ ...prev, [currentQ.id]: value }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
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
        const data = await res.json();
        setStatus("error");
        setErrorMessage(data.error || "Failed to submit answers");
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
    
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgMain}`} data-testid="embed-completed">
        <Card className={`max-w-md ${bgCard} border-green-500/30`}>
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
            {completedScores && (
              <div className={`${bgCardAlt} rounded-lg p-4`}>
                <p className="text-lg font-semibold" style={{ color: accentColor }}>
                  Score: {completedScores.totalScore}%
                </p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-700/30 flex items-center justify-center gap-2">
              <span className={`text-xs ${textMuted}`}>Powered by</span>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">HM</span>
                </div>
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
                <li>Take your time - there is no time limit</li>
              </ul>
            </div>
            <Button
              onClick={startAssessment}
              className="w-full"
              style={{ backgroundColor: primaryColor }}
              data-testid="button-start-assessment"
            >
              Start Assessment
            </Button>

            <div className="mt-6 pt-4 border-t border-slate-700/30 flex items-center justify-center gap-2">
              <span className={`text-xs ${textMuted}`}>Powered by</span>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">HM</span>
                </div>
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
            <span className={`text-sm ${textMuted}`}>
              Question {currentIndex + 1} of {questions.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" style={{ '--progress-color': primaryColor } as any} />
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
            <div className="w-5 h-5 rounded bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">HM</span>
            </div>
            <span className={`text-xs font-medium ${textSecondary}`}>HumanMetrix</span>
          </div>
        </div>
      </div>
    </div>
  );
}
