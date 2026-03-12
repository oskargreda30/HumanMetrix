import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isValidEmail, isValidName } from "@/lib/validation";
import { Loader2, Send, Mail, Calendar, CheckCircle2, Clock, XCircle, UserPlus, Link2, Copy, Check, Search, Building2 } from "lucide-react";
import { format } from "date-fns";

const ASSESSMENT_TYPES = [
  { id: "fit", label: "FIT Assessment", description: "Behavioural and workplace skills" },
  { id: "ai_readiness", label: "AI Readiness", description: "AI integration readiness" },
  { id: "prompt_architecture", label: "Prompt Architecture", description: "AI prompt engineering skills" },
  { id: "aiq", label: "AIQ Assessment", description: "Ethical AI decision-making" },
];

const ASSESSMENT_COLORS: Record<string, string> = {
  fit: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-800",
  ai_readiness: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800",
  prompt_architecture: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
  aiq: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800",
};

const ASSESSMENT_NAMES: Record<string, string> = {
  fit: "FIT Assessment",
  ai_readiness: "AI Readiness",
  prompt_architecture: "Prompt Architecture",
  aiq: "AIQ Assessment",
};

interface AssessmentLink {
  id: string;
  partnerId: string;
  partnerName: string;
  assessmentType: string;
  token: string;
  isActive: boolean;
  clickCount: number;
  completionCount: number;
  url: string;
}

export default function InvitationsTab() {
  const { toast } = useToast();
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
  const [linkSearch, setLinkSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: invitations, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/invitations'],
  });

  const { data: allLinks, isLoading: linksLoading } = useQuery<AssessmentLink[]>({
    queryKey: ['/api/admin/assessment-links'],
  });

  const toggleLinkMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/partner/me/assessment-links/${id}/toggle`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/assessment-links'] }),
  });

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
      toast({ title: "Invitation sent", description: "The assessment invitation has been sent successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send invitation. Please try again.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateEmail || !candidateName || selectedAssessments.length === 0) {
      toast({ title: "Validation error", description: "Please fill in all required fields and select at least one assessment.", variant: "destructive" });
      return;
    }
    if (!isValidEmail(candidateEmail)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    if (!isValidName(candidateName)) {
      toast({ title: "Invalid name", description: "Name contains invalid characters.", variant: "destructive" });
      return;
    }
    createInvitation.mutate({ candidateEmail, candidateName, assessmentTypes: selectedAssessments, message: message || undefined });
  };

  const toggleAssessment = (type: string) => {
    setSelectedAssessments(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const selectAllAssessments = () => setSelectedAssessments(ASSESSMENT_TYPES.map(a => a.id));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500/20 text-green-600 border-green-200 dark:text-green-400 dark:border-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'sent': return <Badge className="bg-blue-500/20 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'expired': return <Badge className="bg-red-500/20 text-red-600 border-red-200 dark:text-red-400 dark:border-red-800"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      default: return <Badge variant="outline"><Mail className="h-3 w-3 mr-1" />{status}</Badge>;
    }
  };

  // Group links by partner, filtered by search
  const partnerGroups = (() => {
    if (!allLinks) return [];
    const q = linkSearch.toLowerCase();
    const filtered = allLinks.filter(l =>
      !q || l.partnerName.toLowerCase().includes(q) || l.assessmentType.includes(q)
    );
    const map = new Map<string, { partnerName: string; links: AssessmentLink[] }>();
    for (const link of filtered) {
      if (!map.has(link.partnerId)) map.set(link.partnerId, { partnerName: link.partnerName, links: [] });
      map.get(link.partnerId)!.links.push(link);
    }
    return Array.from(map.values());
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email invite + recent invitations */}
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
                <div className="flex items-center justify-between flex-wrap gap-2">
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

              <Button type="submit" className="w-full" disabled={createInvitation.isPending} data-testid="button-send-invitation">
                {createInvitation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" />Send Invitation</>
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
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{invitation.candidateName}</p>
                        <p className="text-sm text-muted-foreground truncate">{invitation.candidateEmail}</p>
                      </div>
                      {getStatusBadge(invitation.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
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

      {/* Partner Shareable Links */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                Partner Shareable Assessment Links
              </CardTitle>
              <CardDescription>
                Copy and share direct assessment links for any partner — candidates verify their email via OTP and start immediately.
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search partner..."
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                className="pl-8 h-8 w-48 text-sm"
                data-testid="input-search-partner-links"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {linksLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : partnerGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Link2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{linkSearch ? "No partners match your search" : "No partner links available"}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {partnerGroups.map(({ partnerName, links }) => (
                <div key={partnerName} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    {partnerName}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-5">
                    {links.map((link) => {
                      const isCopied = copiedId === link.id;
                      return (
                        <div
                          key={link.id}
                          data-testid={`card-admin-link-${link.assessmentType}`}
                          className={`rounded-md border p-3 flex flex-col gap-2 transition-opacity ${link.isActive ? "" : "opacity-50"}`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${ASSESSMENT_COLORS[link.assessmentType] || "bg-muted text-muted-foreground"}`}>
                              {ASSESSMENT_NAMES[link.assessmentType] || link.assessmentType}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">{link.clickCount} visits · {link.completionCount} done</span>
                              <Switch
                                data-testid={`toggle-admin-link-${link.id}`}
                                checked={link.isActive}
                                onCheckedChange={(checked) => toggleLinkMutation.mutate({ id: link.id, isActive: checked })}
                                className="scale-75"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs text-muted-foreground bg-muted rounded px-2 py-1.5 truncate font-mono">
                              {link.url}
                            </code>
                            <Button
                              size="icon"
                              variant="ghost"
                              data-testid={`button-copy-admin-link-${link.id}`}
                              onClick={() => copyLink(link.url, link.id)}
                              disabled={!link.isActive}
                            >
                              {isCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
