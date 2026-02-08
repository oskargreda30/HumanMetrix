import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, Clock, ClipboardList, PlayCircle, RotateCcw } from "lucide-react";
import { apiRequest, getHumanReadableError } from "@/lib/queryClient";
import logoSymbol from "@assets/Gemini_Generated_Image_misel3misel3mise-removebg-preview_1762775600899.png";
import { useDarkBody } from "@/hooks/use-dark-body";

interface InvitationData {
  id: string;
  externalUserId: string;
  name: string | null;
  assessmentTypes: string[];
  completedAssessmentTypes: string[];
  inProgressSession: { id: string; assessmentType: string } | null;
  status: string;
  expiresAt: string | null;
  partnerName: string;
  branding: {
    enabled: boolean;
    primaryColor: string | null;
    accentColor: string | null;
    logoUrl: string | null;
    welcomeTitle: string | null;
    welcomeMessage: string | null;
    companyDisplayName: string | null;
  } | null;
}

function formatAssessmentName(type: string): string {
  const names: Record<string, string> = {
    'fit': 'FIT Assessment',
    'ai_readiness': 'AI Readiness Assessment',
    'prompt_architecture': 'Prompt Architecture Assessment',
    'aiq': 'AIQ Assessment',
  };
  return names[type] || type;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function StartAssessment() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(searchString);
  const token = params.get("token");

  const [status, setStatus] = useState<"loading" | "ready" | "starting" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [startingType, setStartingType] = useState<string | null>(null);

  useDarkBody();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No invitation token provided");
      return;
    }

    fetch(`/api/invite/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(getHumanReadableError(data, "Failed to validate invitation"));
        }
        return res.json();
      })
      .then((data) => {
        // Handle completed invitation - redirect to appropriate page
        if (data.isCompleted) {
          // Redirect to the guest invite page which handles account creation/login
          setLocation(`/invite/${data.invitationToken || token}`);
          return;
        }
        setInvitation(data);
        setStatus("ready");
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(getHumanReadableError(err, "Invalid or expired invitation"));
      });
  }, [token, setLocation]);

  const startAssessment = async (assessmentType: string) => {
    if (!token) return;

    setStartingType(assessmentType);
    setStatus("starting");

    try {
      const response = await apiRequest("POST", `/api/invite/${token}/start`, {
        assessmentType,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(getHumanReadableError(errorData, "Failed to start assessment"));
      }
      
      const data = await response.json() as { widgetUrl?: string; sessionId?: string };

      if (data.widgetUrl) {
        // Use replace to prevent back button returning to this loading screen
        window.location.replace(data.widgetUrl);
      } else {
        throw new Error("No assessment URL returned");
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(getHumanReadableError(err, "Failed to start assessment"));
    }
  };

  const primaryColor = invitation?.branding?.primaryColor || "#0891b2";
  const companyName = invitation?.branding?.companyDisplayName || invitation?.partnerName || "HumanMetrix";

  if (status === "loading") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900">
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
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900 p-4">
        <Card className="max-w-md w-full bg-slate-800 border-slate-700">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Unable to Access Invitation</h2>
            <p className="text-slate-400">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "starting") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900">
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

  return (
    <div className="min-h-[100dvh] bg-slate-900 pt-8 md:pt-12 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          {invitation?.branding?.logoUrl ? (
            <img 
              src={invitation.branding.logoUrl} 
              alt={companyName}
              className="h-16 mx-auto mb-4 object-contain"
            />
          ) : (
            <h1 
              className="text-2xl md:text-3xl font-bold mb-2"
              style={{ color: primaryColor }}
            >
              {companyName}
            </h1>
          )}
          <p className="text-slate-400">Assessment Invitation</p>
        </div>

        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5" style={{ color: primaryColor }} />
              {invitation?.branding?.welcomeTitle || `Welcome${invitation?.name ? `, ${invitation.name}` : ""}`}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {invitation?.branding?.welcomeMessage || 
                `You have been invited to complete the following assessments by ${companyName}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitation?.expiresAt && (
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
                <Clock className="w-4 h-4" />
                <span>Expires: {formatDate(invitation.expiresAt)}</span>
              </div>
            )}

            <div className="space-y-4">
              {(() => {
                const completed = invitation?.completedAssessmentTypes || [];
                const total = invitation?.assessmentTypes.length || 0;
                const hasProgress = completed.length > 0;
                const hasInProgress = !!invitation?.inProgressSession;
                
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-slate-300">Assessment Series ({total} assessments):</h3>
                      {hasProgress && (
                        <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-400">
                          {completed.length}/{total} Complete
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 -mt-2">These assessments will run sequentially. Complete each one to proceed to the next.</p>
                  </>
                );
              })()}
              {invitation?.assessmentTypes.map((type, index) => {
                const isCompleted = invitation.completedAssessmentTypes?.includes(type);
                const isInProgress = invitation.inProgressSession?.assessmentType === type;
                
                return (
                  <div 
                    key={type}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isCompleted 
                        ? 'bg-green-900/20 border-green-700/50' 
                        : isInProgress 
                          ? 'bg-cyan-900/20 border-cyan-700/50' 
                          : 'bg-slate-900/50 border-slate-700'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                      isCompleted 
                        ? 'bg-green-700 text-white' 
                        : isInProgress 
                          ? 'bg-cyan-700 text-white' 
                          : 'bg-slate-700 text-slate-300'
                    }`}>
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-white text-sm">{formatAssessmentName(type)}</h4>
                        {isCompleted && <Badge variant="outline" className="text-xs py-0 border-green-500/50 text-green-400">Complete</Badge>}
                        {isInProgress && <Badge variant="outline" className="text-xs py-0 border-cyan-500/50 text-cyan-400">In Progress</Badge>}
                      </div>
                      <p className="text-xs text-slate-400">
                        {type === 'fit' && "Behavioral assessment measuring workplace adaptability"}
                        {type === 'ai_readiness' && "Evaluate your readiness for AI-driven roles"}
                        {type === 'prompt_architecture' && "Test your ability to craft effective AI prompts"}
                        {type === 'aiq' && "Assess your understanding of AI ethics"}
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {(() => {
                const completed = invitation?.completedAssessmentTypes || [];
                const allTypes = invitation?.assessmentTypes || [];
                const hasInProgress = !!invitation?.inProgressSession;
                
                // Find the next assessment to start (first non-completed one)
                const nextType = allTypes.find(t => !completed.includes(t));
                
                if (!nextType) {
                  // All completed
                  return (
                    <div className="text-center p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-green-400 font-medium">All Assessments Complete!</p>
                      <p className="text-xs text-slate-400 mt-1">Your results have been submitted.</p>
                    </div>
                  );
                }
                
                const buttonText = hasInProgress 
                  ? 'Resume Assessment' 
                  : completed.length > 0 
                    ? 'Continue Assessment Series' 
                    : 'Start Assessment Series';
                
                const ButtonIcon = hasInProgress ? RotateCcw : PlayCircle;
                
                return (
                  <Button
                    onClick={() => startAssessment(nextType)}
                    style={{ backgroundColor: primaryColor }}
                    className="w-full mt-4 hover:opacity-90"
                    size="lg"
                    data-testid="button-start-series"
                  >
                    <ButtonIcon className="w-5 h-5 mr-2" />
                    {buttonText}
                  </Button>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center justify-center gap-1 text-sm text-slate-500" data-testid="footer-branding">
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <img src={logoSymbol} alt="HumanMetrix Logo" className="h-8 w-8" />
            <span className="text-cyan-500">HumanMetrix</span>
          </div>
          <span>AI Assessment Platform</span>
        </div>
      </div>
    </div>
  );
}
