import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isValidEmail, isValidName } from "@/lib/validation";
import { Loader2, Send, Mail, Calendar, CheckCircle2, Clock, XCircle, UserPlus } from "lucide-react";
import { format } from "date-fns";

const ASSESSMENT_TYPES = [
  { id: "fit", label: "FIT Assessment", description: "Behavioural and workplace skills" },
  { id: "ai_readiness", label: "AI Readiness", description: "AI integration readiness" },
  { id: "prompt_architecture", label: "Prompt Architecture", description: "AI prompt engineering skills" },
  { id: "aiq", label: "AIQ Assessment", description: "Ethical AI decision-making" },
];

export default function InvitationsTab() {
  const { toast } = useToast();
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);

  const { data: invitations, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/invitations'],
  });

  const createInvitation = useMutation({
    mutationFn: async (data: { candidateEmail: string; candidateName: string; assessmentTypes: string[]; message?: string }) => {
      return apiRequest("POST", "/api/admin/invitations", data);
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
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation. Please try again.",
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

  const selectAllAssessments = () => {
    setSelectedAssessments(ASSESSMENT_TYPES.map(a => a.id));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'sent':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline"><Mail className="h-3 w-3 mr-1" />{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Candidate
            </CardTitle>
            <CardDescription>Send an assessment invitation to a candidate via email</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="candidateName">Candidate Name *</Label>
                <Input
                  id="candidateName"
                  data-testid="input-invite-candidate-name"
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
                  data-testid="input-invite-candidate-email"
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Assessments *</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={selectAllAssessments} data-testid="button-select-all-assessments">
                    Select All
                  </Button>
                </div>
                <div className="space-y-3 p-3 rounded-md bg-muted/50">
                  {ASSESSMENT_TYPES.map((assessment) => (
                    <div key={assessment.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={`invite-assessment-${assessment.id}`}
                        data-testid={`checkbox-invite-${assessment.id}`}
                        checked={selectedAssessments.includes(assessment.id)}
                        onCheckedChange={() => toggleAssessment(assessment.id)}
                      />
                      <div className="grid gap-0.5 leading-none">
                        <Label htmlFor={`invite-assessment-${assessment.id}`} className="font-medium cursor-pointer">
                          {assessment.label}
                        </Label>
                        <span className="text-xs text-muted-foreground">{assessment.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (optional)</Label>
                <Textarea
                  id="message"
                  data-testid="input-invite-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal message to the invitation email..."
                  rows={3}
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
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
            <CardDescription>Track the status of your sent invitations</CardDescription>
          </CardHeader>
          <CardContent>
            {!invitations || invitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No invitations sent yet</p>
                <p className="text-sm">Send your first invitation to get started</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {invitations.slice(0, 10).map((invitation: any) => (
                  <div key={invitation.id} className="p-3 rounded-md bg-muted/50 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{invitation.candidateName}</p>
                        <p className="text-sm text-muted-foreground truncate">{invitation.candidateEmail}</p>
                      </div>
                      {getStatusBadge(invitation.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(invitation.sentAt), 'dd MMM yyyy')}
                      </span>
                      <span>{invitation.assessmentTypes?.length || 0} assessments</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
