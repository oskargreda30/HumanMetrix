import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AcceptPartnerInvite() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">("idle");
  const [message, setMessage] = useState("");
  const [companyName, setCompanyName] = useState<string | null>(null);

  const acceptInvitation = async () => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid invitation link");
      return;
    }

    setStatus("loading");
    
    try {
      const response = await apiRequest("POST", `/api/partner/team/accept/${token}`);
      const data = await response.json();
      
      setStatus("success");
      setMessage(data.message || "Invitation accepted successfully!");
      setCompanyName(data.partner?.companyName || null);
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Failed to accept invitation");
    }
  };

  useEffect(() => {
    if (token && status === "idle") {
      acceptInvitation();
    }
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === "loading" && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
            {status === "success" && (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            )}
            {status === "error" && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
            {status === "idle" && (
              <UserPlus className="h-12 w-12 text-primary" />
            )}
          </div>
          <CardTitle>
            {status === "loading" && "Accepting Invitation..."}
            {status === "success" && "Welcome to the Team!"}
            {status === "error" && "Invitation Error"}
            {status === "idle" && "Team Invitation"}
          </CardTitle>
          <CardDescription className="text-base">
            {status === "loading" && "Please wait while we process your invitation..."}
            {status === "success" && (
              <>
                {companyName 
                  ? `You have successfully joined ${companyName}'s team on HumanMetrix.`
                  : "You have successfully joined the team on HumanMetrix."
                }
              </>
            )}
            {status === "error" && message}
            {status === "idle" && "Processing your invitation..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "success" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                You can now access the partner dashboard to view assessment results and collaborate with your team.
              </p>
              <Button 
                className="w-full" 
                onClick={() => setLocation("/login")}
                data-testid="button-go-to-login"
              >
                Go to Login
              </Button>
            </div>
          )}
          
          {status === "error" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                This could be because the invitation has expired, already been used, or the link is invalid.
              </p>
              <Button 
                variant="outline"
                className="w-full" 
                onClick={() => setLocation("/")}
                data-testid="button-go-home"
              >
                Return Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
