import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Clock, PlayCircle, XCircle, AlertCircle, User, Lock, ArrowRight, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [startingAssessment, setStartingAssessment] = useState<string | null>(null);
  
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
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
    } catch (err: any) {
      setError(err.message || "Failed to load invitation");
    } finally {
      setLoading(false);
    }
  };

  const startAssessment = async (assessmentType: string) => {
    if (!token || !invitation) return;
    
    try {
      setStartingAssessment(assessmentType);
      
      const res = await fetch(`/api/guest/invite/${token}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentType }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start assessment");
      }
      
      const { sessionId } = await res.json();
      
      setLocation(`/embed?session=${sessionId}&inviteToken=${token}`);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to start assessment",
        variant: "destructive",
      });
    } finally {
      setStartingAssessment(null);
    }
  };

  const createAccount = async () => {
    if (!token || !password) return;
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setCreatingAccount(true);
      
      const res = await fetch(`/api/guest/invite/${token}/create-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create account");
      }
      
      const data = await res.json();
      setAccountCreated(true);
      
      toast({
        title: data.existingAccount ? "Account exists" : "Account created",
        description: data.existingAccount 
          ? "You already have an account. Log in to access your results."
          : "You can now log in to access your results anytime",
      });
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "in_progress":
      case "started":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "not_started":
      default:
        return <PlayCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in_progress":
      case "started":
        return "In Progress";
      case "not_started":
      default:
        return "Not Started";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
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

  const nextAssessment = invitation.assessmentStatuses.find(
    (s) => s.status !== "completed"
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-2">
            Welcome{invitation.name ? `, ${invitation.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-muted-foreground">
            {invitation.partnerName} has invited you to complete the following assessments
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 -mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Assessments
            </CardTitle>
            <CardDescription>
              Complete the assessments below to measure your AI readiness and capabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {invitation.assessmentStatuses.map((assessment, index) => (
              <div
                key={assessment.type}
                className="flex items-center justify-between p-4 border rounded-lg"
                data-testid={`assessment-item-${assessment.type}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{ASSESSMENT_NAMES[assessment.type] || assessment.type}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {getStatusIcon(assessment.status)}
                      <span>{getStatusText(assessment.status)}</span>
                    </div>
                  </div>
                </div>
                
                {assessment.status === "completed" ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <Button
                    onClick={() => startAssessment(assessment.type)}
                    disabled={startingAssessment !== null}
                    data-testid={`button-start-${assessment.type}`}
                  >
                    {startingAssessment === assessment.type ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {assessment.status === "in_progress" ? "Continue" : "Start"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
          
          {invitation.expiresAt && (
            <CardFooter className="text-sm text-muted-foreground border-t pt-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              This invitation expires on {new Date(invitation.expiresAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </CardFooter>
          )}
        </Card>

        {invitation.allComplete && !accountCreated && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                All Assessments Complete!
              </CardTitle>
              <CardDescription>
                Great job! You've completed all your assigned assessments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showAccountForm ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Would you like to create an account to access your results anytime?
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowAccountForm(true)} data-testid="button-create-account">
                      <User className="h-4 w-4 mr-2" />
                      Create Account
                    </Button>
                    <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-done">
                      No Thanks
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {invitation.email && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{invitation.email}</span>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Create Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a password"
                      data-testid="input-password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      data-testid="input-confirm-password"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={createAccount} 
                      disabled={creatingAccount || !password || !confirmPassword}
                      data-testid="button-submit-account"
                    >
                      {creatingAccount && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      <Lock className="h-4 w-4 mr-2" />
                      Create Account
                    </Button>
                    <Button variant="outline" onClick={() => setShowAccountForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {accountCreated && (
          <Card className="mt-6 border-green-500/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Account Created!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You can now log in to access your results anytime.
                </p>
                <Button onClick={() => setLocation("/login")} data-testid="button-go-to-login">
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
