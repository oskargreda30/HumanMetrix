import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, AlertCircle, User, ArrowRight, Mail, PartyPopper, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useDarkBody } from "@/hooks/use-dark-body";

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
  useDarkBody();
  
  // Check if user is already logged in (use returnNull on 401 to avoid error flash for guests)
  const { data: currentUser, isLoading: authLoading } = useQuery<{ id: number; email: string } | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 0,
  });
  
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
  const earlyRedirectRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const fetchInvitation = useCallback(async (silent = false) => {
    if (!token) return;
    
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      
      const res = await fetch(`/api/guest/invite/${token}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load invitation");
      }
      
      const data = await res.json();
      setInvitation(data);
      return data;
    } catch (err: any) {
      if (!silent) {
        setError(err.message || "Failed to load invitation");
      }
      return null;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    fetchInvitation(false);
  }, [fetchInvitation]);

  // Early redirect for already-logged-in users with completed assessments
  useEffect(() => {
    if (earlyRedirectRef.current) return;
    if (authLoading || loading) return;
    if (!currentUser || !invitation) return;
    
    // If user is already logged in and all assessments are complete, redirect directly to dashboard
    if (invitation.allComplete && invitation.hasExistingAccount) {
      earlyRedirectRef.current = true;
      toast({
        title: "Welcome back!",
        description: "Redirecting to your dashboard...",
      });
      window.location.href = '/dashboard';
      return;
    }
  }, [authLoading, loading, currentUser, invitation, toast]);

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
      
      const res = await apiRequest("POST", `/api/guest/invite/${token}/session`, { 
        assessmentType: nextAssessment.type 
      });
      
      const data = await res.json();
      
      // If the response indicates assessment is already completed, refresh and show results
      if (data.status === 'completed' || data.error?.includes('already completed')) {
        // Silently refresh invitation data and check if all complete
        const updatedInvitation = await fetchInvitation(true);
        if (updatedInvitation?.allComplete) {
          setShowingResults(true);
        }
        return;
      }
      
      setCurrentSessionId(data.sessionId);
    } catch (err: any) {
      // Handle "already completed" error gracefully - this can happen due to race conditions
      if (err.message?.includes('already completed') || err.message?.includes('Assessment already completed')) {
        const updatedInvitation = await fetchInvitation(true);
        if (updatedInvitation?.allComplete) {
          setShowingResults(true);
        }
        return;
      }
      
      toast({
        title: "Error",
        description: err.message || "Failed to start assessment",
        variant: "destructive",
      });
    } finally {
      setCreatingSession(false);
    }
  }, [token, toast, fetchInvitation]);

  useEffect(() => {
    if (invitation && !invitation.allComplete && !currentSessionId && !creatingSession) {
      startNextAssessment(invitation);
    } else if (invitation?.allComplete) {
      setShowingResults(true);
    }
  }, [invitation, currentSessionId, creatingSession, startNextAssessment]);

  // Auto-login for existing users when all assessments complete (only if not already logged in)
  useEffect(() => {
    const performAutoLogin = async () => {
      if (!token || !invitation?.allComplete || !invitation?.hasExistingAccount) return;
      if (autoLoginTriggeredRef.current || earlyRedirectRef.current) return;
      // Skip if user is already logged in - early redirect will handle it
      if (currentUser) return;
      
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
          description: "Redirecting to your dashboard...",
        });
        
        // Use full page navigation to ensure session cookie is properly recognized
        window.location.href = data.redirectTo || '/dashboard';
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
    
    if (showingResults && invitation?.hasExistingAccount && !currentUser) {
      performAutoLogin();
    }
  }, [showingResults, invitation, token, toast, setLocation, currentUser]);

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
        const updatedInvitation = await fetchInvitation(true); // Silent mode to avoid loading flash
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

  // Polling fallback - check status every 30 seconds while in assessment (silent mode to avoid UI flash)
  useEffect(() => {
    if (currentSessionId && !pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(async () => {
        const updatedInvitation = await fetchInvitation(true); // Silent mode - no loading state
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
    const updatedInvitation = await fetchInvitation(true); // Silent mode to avoid loading flash
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
      
      if (data.redirectTo) {
        // Use full page navigation to ensure session cookie is properly recognized
        window.location.href = data.redirectTo;
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
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 loader-pulse">
            <img src="/favicon.png" alt="HumanMetrix" className="w-full h-full object-contain" data-testid="loading-spinner" />
          </div>
          <p className="font-semibold text-lg">
            <span className="text-white">Human</span>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Metrix</span>
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
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
        <div className="min-h-[100dvh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
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

              <p className="text-sm text-slate-500 text-center">
                Your results have been sent to <strong className="text-slate-700">{invitation.partnerName || "your employer"}</strong>.
              </p>
              
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
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
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
              Great job{invitation.name ? `, ${invitation.name.split(" ")[0]}` : ""}! You've completed all {invitation.assessmentTypes.length} assessments assigned by {invitation.partnerName + "."}
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

            <p className="text-sm text-slate-500 text-center">
              Your results have been sent to <strong className="text-slate-700">{invitation.partnerName || "your employer"}</strong>.
            </p>
            
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

  if (currentSessionId) {
    const embedUrl = `/embed/assessment?session=${currentSessionId}&inviteToken=${token}`;
    
    return (
      <div className="min-h-[100dvh] flex flex-col">
        <div className="flex-1">
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full min-h-[100dvh] border-0"
            title={getCurrentAssessmentName()}
            data-testid="assessment-iframe"
          />
        </div>
      </div>
    );
  }

  if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
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
