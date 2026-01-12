import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isValidEmail, isValidName } from "@/lib/validation";
import { Loader2, Send, Mail, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
const ASSESSMENT_TYPES_ARRAY = ["fit", "ai_readiness", "prompt_architecture", "aiq"] as const;

export default function AdminInvitations() {
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);

  const { data: invitations, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/invitations'],
    enabled: user?.role === 'super_admin' || user?.role === 'organization_admin',
  });

  const createInvitation = useMutation({
    mutationFn: async (data: { candidateEmail: string; candidateName: string; assessmentTypes: string[]; message?: string }) => {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create invitation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/invitations'] });
      setCandidateEmail("");
      setCandidateName("");
      setMessage("");
      setSelectedAssessments([]);
      toast({
        title: "Invitation sent",
        description: "The assessment invitation has been sent successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateEmail || !candidateName || selectedAssessments.length === 0) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields and select at least one assessment.",
        variant: "destructive",
      });
      return;
    }
    
    if (!isValidEmail(candidateEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    if (!isValidName(candidateName)) {
      toast({
        title: "Invalid name",
        description: "Name contains invalid characters.",
        variant: "destructive",
      });
      return;
    }
    
    createInvitation.mutate({
      candidateEmail,
      candidateName,
      assessmentTypes: selectedAssessments,
      message: message || undefined,
    });
  };

  const toggleAssessment = (type: string) => {
    setSelectedAssessments(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-user" />
      </div>
    );
  }

  if (user?.role !== 'super_admin' && user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'sent':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Mail className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-admin-invitations">Assessment Invitations</h1>
        <p className="text-muted-foreground">Send assessment invitations to candidates via email</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send New Invitation
            </CardTitle>
            <CardDescription>Invite a candidate to complete assessments</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="candidateName">Candidate Name *</Label>
                <Input
                  id="candidateName"
                  data-testid="input-candidate-name"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="candidateEmail">Email Address *</Label>
                <Input
                  id="candidateEmail"
                  data-testid="input-candidate-email"
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Assessments *</Label>
                <div className="space-y-2">
                  {ASSESSMENT_TYPES_ARRAY.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`assessment-${type}`}
                        data-testid={`checkbox-assessment-${type}`}
                        checked={selectedAssessments.includes(type)}
                        onCheckedChange={() => toggleAssessment(type)}
                      />
                      <Label htmlFor={`assessment-${type}`} className="font-normal cursor-pointer">
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (optional)</Label>
                <Textarea
                  id="message"
                  data-testid="textarea-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal note to the candidate..."
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createInvitation.isPending}
                data-testid="button-send-invitation"
              >
                {createInvitation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Recent Invitations
            </CardTitle>
            <CardDescription>View all sent invitations</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-invitations" />
              </div>
            ) : invitations && invitations.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {invitations.map((invitation: any) => (
                  <div
                    key={invitation.id}
                    className="p-4 border rounded-lg space-y-2"
                    data-testid={`invitation-${invitation.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium" data-testid={`text-candidate-name-${invitation.id}`}>
                          {invitation.candidateName}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-candidate-email-${invitation.id}`}>
                          {invitation.candidateEmail}
                        </p>
                      </div>
                      <div className="flex items-center gap-1" data-testid={`status-${invitation.id}`}>
                        {getStatusIcon(invitation.status)}
                        <span className="text-sm capitalize">{invitation.status}</span>
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="text-muted-foreground">
                        <strong>Assessments:</strong> {invitation.assessmentTypes.join(', ')}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Sent: {new Date(invitation.sentAt).toLocaleDateString()}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No invitations sent yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
