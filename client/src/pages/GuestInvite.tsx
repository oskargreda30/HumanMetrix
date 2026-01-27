import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, AlertCircle, User, ArrowRight, Mail, PartyPopper, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface AssessmentStatus {
  type: string;
  status: string;
  sessionId: string | null;
}

interface InvitationData {
  id: string;
  email: string | null;
  name: string | null;
  assessmentTypes: string[];
  assessmentStatuses: AssessmentStatus[];
  partnerName: string;
  partnerId: string;
  expiresAt: string | null;
  status: string;
  allComplete: boolean;
  hasExistingAccount: boolean;
}

const ASSESSMENT_NAMES: Record<string, string> = {
  fit: "FIT Assessment",
  ai_readiness: "AI Readiness",
  prompt_architecture: "Prompt Architecture",
  aiq: "AIQ (Algorithmic Integrity)",
};

export default function GuestInvite() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [showingResults, setShowingResults] = useState(false);
  const [checkingProgress, setCheckingProgress] = useState(false);
  const [autoLoggingIn, setAutoLoggingIn] = useState(false);
  const autoLoginTriggeredRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const fetchInvitation = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`/api/guest/invite/${token}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load invitation");
      }
      
      const data = await res.json();
      setInvitation(data);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to load invitation");
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInvitation();
  }, [fetchInvitation]);

  const startNextAssessment = useCallback(async (invitationData: InvitationData) => {
    if (!token) return;
    
    const nextAssessment = invitationData.assessmentStatuses.find(
      (s) => s.status !== "completed"
    );
    
    if (!nextAssessment) {
      setShowingResults(true);
      return;
    }
    
    try {
      setCreatingSession(true);
      
      const res = await fetch(`/api/guest/invite/${token}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentType: nextAssessment.type }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start assessment");
      }
      
      const { sessionId } = await res.json();
      setCurrentSessionId(sessionId);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to start assessment",
        variant: "destructive",
      });
    } finally {
      setCreatingSession(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (invitation && !invitation.allComplete && !currentSessionId && !creatingSession) {
      startNextAssessment(invitation);
    } else if (invitation?.allComplete) {
      setShowingResults(true);
    }
  }, [invitation, currentSessionId, creatingSession, startNextAssessment]);

  // Auto-login for existing users when all assessments complete
  useEffect(() => {
    const performAutoLogin = async () => {
      if (!token || !invitation?.allComplete || !invitation?.hasExistingAccount) return;
      if (autoLoginTriggeredRef.current) return;
      
      autoLoginTriggeredRef.current = true;
      setAutoLoggingIn(true);
      
      try {
        const res = await apiRequest("POST", `/api/guest/invite/${token}/create-account`, {});
        
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to log in");
        }
        
        const data = await res.json();
        
        toast({
          title: "Welcome back!",
          description: "You've been logged into your existing account. Redirecting to your dashboard...",
        });
        
        // Invalidate auth cache to ensure the session is recognized
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        // Redirect to dashboard after a brief moment
        setTimeout(() => {
          setLocation(data.redirectTo || '/dashboard');
        }, 1500);
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to auto-login",
          variant: "destructive",
        });
        setAutoLoggingIn(false);
        autoLoginTriggeredRef.current = false;
      }
    };
    
    if (showingResults && invitation?.hasExistingAccount) {
      performAutoLogin();
    }
  }, [showingResults, invitation, token, toast, setLocation]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate origin - only accept messages from same origin
      if (event.origin !== window.location.origin) {
        return;
      }
      
      // Validate source is from our iframe
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) {
        return;
      }
      
      const messageType = event.data?.type;
      const messageSessionId = event.data?.sessionId;
      
      // Only process if it's a valid completion message with matching session
      if ((messageType === 'humanmetrix:completed' || 
           messageType === 'humanmetrix:assessment_completed') &&
          messageSessionId === currentSessionId) {
        setCurrentSessionId(null);
        const updatedInvitation = await fetchInvitation();
        if (updatedInvitation && !updatedInvitation.allComplete) {
          await startNextAssessment(updatedInvitation);
        } else {
          setShowingResults(true);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchInvitation, startNextAssessment, currentSessionId]);

  // Polling fallback - check status every 30 seconds while in assessment
  useEffect(() => {
    if (currentSessionId && !pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(async () => {
        const updatedInvitation = await fetchInvitation();
        if (updatedInvitation) {
          const currentAssessment = updatedInvitation.assessmentStatuses.find(
            (s: AssessmentStatus) => s.sessionId === currentSessionId
          );
          // If current session is now completed, advance
          if (currentAssessment?.status === 'completed') {
            setCurrentSessionId(null);
            if (!updatedInvitation.allComplete) {
              await startNextAssessment(updatedInvitation);
            } else {
              setShowingResults(true);
            }
          }
        }
      }, 30000); // Poll every 30 seconds
    }
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [currentSessionId, fetchInvitation, startNextAssessment]);

  // Manual progress check function
  const checkProgress = async () => {
    setCheckingProgress(true);
    const updatedInvitation = await fetchInvitation();
    if (updatedInvitation) {
      if (updatedInvitation.allComplete) {
        setCurrentSessionId(null);
        setShowingResults(true);
      } else {
        const currentAssessment = updatedInvitation.assessmentStatuses.find(
          (s: AssessmentStatus) => s.sessionId === currentSessionId
        );
        if (currentAssessment?.status === 'completed') {
          setCurrentSessionId(null);
          await startNextAssessment(updatedInvitation);
        }
      }
    }
    setCheckingProgress(false);
  };

  const createAccount = async () => {
    if (!token) return;
    
    try {
      setCreatingAccount(true);
      
      const res = await apiRequest("POST", `/api/guest/invite/${token}/create-account`, {});
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create account");
      }
      
      const data = await res.json();
      
      toast({
        title: data.existingAccount ? "Logged in" : "Account created",
        description: data.existingAccount 
          ? "You have been logged in to your existing account."
          : "Check your email for your login password. You have been logged in automatically.",
      });
      
      // Invalidate auth cache to ensure the session is recognized
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      if (data.redirectTo) {
        setLocation(data.redirectTo);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setCreatingAccount(false);
    }
  };

  const getCompletedCount = () => {
    if (!invitation) return 0;
    return invitation.assessmentStatuses.filter(s => s.status === 'completed').length;
  };

  const getCurrentAssessmentName = () => {
    if (!invitation) return '';
    const current = invitation.assessmentStatuses.find(s => s.status !== 'completed');
    return current ? ASSESSMENT_NAMES[current.type] || current.type : '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" data-testid="loading-spinner" />
          <p className="text-muted-foreground">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Unable to Load Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              This could be because the invitation has expired, already been used, or the link is invalid.
            </p>
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-go-home">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  if (showingResults || invitation.allComplete) {
    // Auto-logging in existing user
    if (autoLoggingIn || invitation.hasExistingAccount) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
          
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
          
          <Card className="relative w-full max-w-lg bg-white/95 backdrop-blur-sm shadow-2xl border-0">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                <PartyPopper className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">
                All Assessments Complete!
              </CardTitle>
              <CardDescription className="text-slate-600 text-base mt-2">
                Great job{invitation.name ? `, ${invitation.name.split(" ")[0]}` : ""}! You've completed all {invitation.assessmentTypes.length} assessments.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-3">Completed Assessments:</h4>
                <div className="space-y-2">
                  {invitation.assessmentStatuses.map((assessment) => (
                    <div key={assessment.type} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>{ASSESSMENT_NAMES[assessment.type] || assessment.type}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
                <span className="text-slate-600">Logging you into your account...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // New user - show Create Account option
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
        
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        
        <Card className="relative w-full max-w-lg bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
              <PartyPopper className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              All Assessments Complete!
            </CardTitle>
            <CardDescription className="text-slate-600 text-base mt-2">
              Great job{invitation.name ? `, ${invitation.name.split(" ")[0]}` : ""}! You've completed all {invitation.assessmentTypes.length} assessments assigned by {invitation.partnerName}.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 mb-3">Completed Assessments:</h4>
              <div className="space-y-2">
                {invitation.assessmentStatuses.map((assessment) => (
                  <div key={assessment.type} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{ASSESSMENT_NAMES[assessment.type] || assessment.type}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border rounded-lg p-4 bg-cyan-50 border-cyan-200">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-cyan-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-slate-900">Create Your Account</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    Create an account to access your results anytime. We'll email you your login details.
                  </p>
                  {invitation.email && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                      <Mail className="h-4 w-4" />
                      <span>{invitation.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button
                onClick={createAccount}
                disabled={creatingAccount}
                className="w-full"
                data-testid="button-create-account"
              >
                {creatingAccount ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account & View Results
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => setLocation("/")}
                className="text-slate-500"
                data-testid="button-skip"
              >
                Skip for now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (creatingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Preparing your next assessment...</p>
        </div>
      </div>
    );
  }

  if (currentSessionId) {
    const embedUrl = `/embed/assessment?session=${currentSessionId}&inviteToken=${token}`;
    
    return (
      <div className="min-h-screen flex flex-col">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-3 px-4 border-b">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {invitation.partnerName}
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm font-medium">
                {getCurrentAssessmentName()}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Progress:</span>
                <span className="font-medium">
                  {getCompletedCount()} / {invitation.assessmentTypes.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={checkProgress}
                disabled={checkingProgress}
                data-testid="button-check-progress"
              >
                {checkingProgress ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-1 hidden sm:inline">Check Progress</span>
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex-1">
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full min-h-[calc(100vh-52px)] border-0"
            title={getCurrentAssessmentName()}
            data-testid="assessment-iframe"
          />
        </div>
      </div>
    );
  }

  if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation expired on {new Date(invitation.expiresAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Please contact {invitation.partnerName} for a new invitation.
            </p>
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-go-home">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
