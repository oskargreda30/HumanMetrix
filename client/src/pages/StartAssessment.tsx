import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, Clock, ClipboardList } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import logoSymbol from "@assets/Gemini_Generated_Image_misel3misel3mise-removebg-preview_1762775600899.png";

interface InvitationData {
  id: string;
  externalUserId: string;
  name: string | null;
  assessmentTypes: string[];
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

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No invitation token provided");
      return;
    }

    fetch(`/api/invite/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to validate invitation");
        }
        return res.json();
      })
      .then((data) => {
        setInvitation(data);
        setStatus("ready");
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err.message || "Invalid or expired invitation");
      });
  }, [token]);

  const startAssessment = async (assessmentType: string) => {
    if (!token) return;

    setStartingType(assessmentType);
    setStatus("starting");

    try {
      const response = await apiRequest("POST", `/api/invite/${token}/start`, {
        assessmentType,
      }) as { widgetUrl?: string; sessionId?: string };

      if (response.widgetUrl) {
        window.location.href = response.widgetUrl;
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Failed to start assessment");
    }
  };

  const primaryColor = invitation?.branding?.primaryColor || "#0891b2";
  const companyName = invitation?.branding?.companyDisplayName || invitation?.partnerName || "HumanMetrix";

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-slate-300">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-slate-300">Starting {startingType ? formatAssessmentName(startingType) : "assessment"}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4">
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
              className="text-3xl font-bold mb-2"
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
              <h3 className="text-sm font-medium text-slate-300">Assessments to Complete:</h3>
              {invitation?.assessmentTypes.map((type) => (
                <div 
                  key={type}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-slate-700"
                >
                  <div>
                    <h4 className="font-medium text-white">{formatAssessmentName(type)}</h4>
                    <p className="text-sm text-slate-400">
                      {type === 'fit' && "Behavioral assessment measuring workplace adaptability"}
                      {type === 'ai_readiness' && "Evaluate your readiness for AI-driven roles"}
                      {type === 'prompt_architecture' && "Test your ability to craft effective AI prompts"}
                      {type === 'aiq' && "Assess your understanding of AI ethics"}
                    </p>
                  </div>
                  <Button
                    onClick={() => startAssessment(type)}
                    style={{ backgroundColor: primaryColor }}
                    className="hover:opacity-90"
                    data-testid={`button-start-${type}`}
                  >
                    Start
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <span>Powered by</span>
          <img src={logoSymbol} alt="HumanMetrix Logo" className="h-5 w-5" />
          <span className="text-cyan-500">HumanMetrix</span>
          <span>- AI Assessment Platform</span>
        </div>
      </div>
    </div>
  );
}
