import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Building2,
  Users,
  FileText,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  Upload,
  Send,
  ArrowRight,
  Sparkles,
  Brain,
  Heart,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  UserPlus,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  useEcosystemProject,
  useEcosystemTeamMembers,
  useAnalyzeMission,
  useUpdateOrganizationContext,
  useAddTeamMember,
  useDeleteTeamMember,
  useGenerateTeamAnalysis,
} from "@/hooks/useEcosystemProject";
import type { 
  EcosystemProject, 
  EcosystemTeamMember,
  EcosystemMissionAnalysis,
  EcosystemTeamAnalysis,
  EcosystemCapabilityPriority,
  EcosystemGapAnalysis,
  EcosystemHireRecommendation,
  EcosystemRiskAlert,
} from "@shared/schema";

const FIT_CAPABILITIES = [
  { code: "HA", name: "High Agency", color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-100" },
  { code: "IC", name: "Intellectual Curiosity", color: "bg-purple-500", textColor: "text-purple-700", bgLight: "bg-purple-100" },
  { code: "RA", name: "Resilience", color: "bg-green-500", textColor: "text-green-700", bgLight: "bg-green-100" },
  { code: "EE", name: "Empathy & Ethics", color: "bg-rose-500", textColor: "text-rose-700", bgLight: "bg-rose-100" },
  { code: "GM", name: "Growth Mindset", color: "bg-amber-500", textColor: "text-amber-700", bgLight: "bg-amber-100" },
  { code: "IA", name: "Interpersonal Agility", color: "bg-cyan-500", textColor: "text-cyan-700", bgLight: "bg-cyan-100" },
];

interface EcosystemWorkflowProps {
  projectId: string;
  onComplete?: () => void;
  isPartnerDashboard?: boolean;
  partnerId?: string;
}

export function EcosystemWorkflow({ 
  projectId, 
  onComplete,
  isPartnerDashboard = false,
  partnerId,
}: EcosystemWorkflowProps) {
  const { toast } = useToast();
  const { data: project, isLoading: projectLoading } = useEcosystemProject(projectId);
  const { data: teamMembers = [], isLoading: membersLoading } = useEcosystemTeamMembers(projectId);
  
  const analyzeMission = useAnalyzeMission();
  const updateOrgContext = useUpdateOrganizationContext();
  const addTeamMember = useAddTeamMember();
  const deleteTeamMember = useDeleteTeamMember();
  const generateAnalysis = useGenerateTeamAnalysis();

  // Form states
  const [missionStatement, setMissionStatement] = useState("");
  const [companyEthos, setCompanyEthos] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [industry, setIndustry] = useState("");
  const [teamFunction, setTeamFunction] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [workMode, setWorkMode] = useState("");

  // Team member dialog
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [memberScores, setMemberScores] = useState<Record<string, number>>({});

  // Expanded sections
  const [expandedStep, setExpandedStep] = useState<number>(1);

  // Initialize form from project data
  useEffect(() => {
    if (project) {
      setMissionStatement(project.missionStatement || "");
      setCompanyEthos(project.companyEthos || "");
      setCompanyName(project.companyName || "");
      setCompanySize(project.companySize || "");
      setIndustry(project.industry || "");
      setTeamFunction(project.teamFunction || "");
      setTeamSize(project.teamSize?.toString() || "");
      setWorkMode(project.workMode || "");
      setExpandedStep(project.currentStep || 1);
    }
  }, [project]);

  const handleAnalyzeMission = async () => {
    if (!missionStatement.trim()) {
      toast({
        title: "Mission statement required",
        description: "Please enter your mission statement or company ethos.",
        variant: "destructive",
      });
      return;
    }

    try {
      await analyzeMission.mutateAsync({
        projectId,
        missionStatement,
        companyEthos,
      });
      toast({
        title: "Mission analyzed",
        description: "AI has analyzed your mission and identified capability priorities.",
      });
      setExpandedStep(2);
    } catch (error: any) {
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze mission statement.",
        variant: "destructive",
      });
    }
  };

  const handleSaveOrgContext = async () => {
    if (!companyName.trim() || !companySize || !industry || !teamFunction || !teamSize || !workMode) {
      toast({
        title: "Missing information",
        description: "Please fill in all organization details.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateOrgContext.mutateAsync({
        projectId,
        companyName,
        companySize,
        industry,
        teamFunction,
        teamSize: parseInt(teamSize, 10),
        workMode,
      });
      toast({
        title: "Organization context saved",
        description: "Your company details have been saved.",
      });
      setExpandedStep(3);
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error.message || "Could not save organization context.",
        variant: "destructive",
      });
    }
  };

  const handleAddTeamMember = async () => {
    if (!memberName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter the team member's name.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addTeamMember.mutateAsync({
        projectId,
        name: memberName,
        email: memberEmail || undefined,
        role: memberRole || undefined,
        sourceType: "manual",
        fitScores: Object.keys(memberScores).length > 0 ? memberScores : undefined,
      });
      toast({
        title: "Team member added",
        description: `${memberName} has been added to the team.`,
      });
      setShowAddMemberDialog(false);
      setMemberName("");
      setMemberEmail("");
      setMemberRole("");
      setMemberScores({});
    } catch (error: any) {
      toast({
        title: "Failed to add member",
        description: error.message || "Could not add team member.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMember = async (memberId: string, name: string) => {
    try {
      await deleteTeamMember.mutateAsync({ projectId, memberId });
      toast({
        title: "Member removed",
        description: `${name} has been removed from the team.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to remove",
        description: error.message || "Could not remove team member.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateAnalysis = async () => {
    const membersWithScores = teamMembers.filter(m => m.fitScores && Object.keys(m.fitScores).length > 0);
    if (membersWithScores.length === 0) {
      toast({
        title: "No scored members",
        description: "Add at least one team member with FIT scores to generate analysis.",
        variant: "destructive",
      });
      return;
    }

    try {
      await generateAnalysis.mutateAsync({ projectId });
      toast({
        title: "Analysis generated",
        description: "Your team diagnostic report is ready.",
      });
      setExpandedStep(5);
    } catch (error: any) {
      toast({
        title: "Analysis failed",
        description: error.message || "Could not generate team analysis.",
        variant: "destructive",
      });
    }
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const missionAnalysis = project.missionAnalysis as EcosystemMissionAnalysis | null;
  const teamAnalysis = project.teamAnalysis as EcosystemTeamAnalysis | null;

  const StepHeader = ({ 
    step, 
    title, 
    description, 
    completed 
  }: { 
    step: number; 
    title: string; 
    description: string; 
    completed?: boolean;
  }) => (
    <div 
      className="flex items-center gap-3 p-4 cursor-pointer hover-elevate rounded-lg"
      onClick={() => setExpandedStep(expandedStep === step ? -1 : step)}
      data-testid={`step-header-${step}`}
    >
      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${
        completed ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'
      }`}>
        {completed ? <CheckCircle className="h-5 w-5" /> : step}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {expandedStep === step ? (
        <ChevronDown className="h-5 w-5 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Step 1: Mission Analysis */}
      <Card data-testid="step-1-mission">
        <StepHeader 
          step={1} 
          title="Define Your Mission & Ethos" 
          description="AI-powered analysis of your organizational priorities"
          completed={!!missionAnalysis}
        />
        {expandedStep === 1 && (
          <div className="p-6 pt-0 space-y-4">
            <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <Brain className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">AI-Powered Analysis</p>
                <p className="text-sm text-muted-foreground">
                  Our AI will analyze your mission to identify which FIT capabilities are most critical for your organization's success.
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mission">Mission Statement</Label>
              <Textarea
                id="mission"
                value={missionStatement}
                onChange={(e) => setMissionStatement(e.target.value)}
                placeholder="Enter your company's mission statement..."
                className="min-h-[120px]"
                data-testid="textarea-mission"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ethos">Company Ethos / Values (Optional)</Label>
              <Textarea
                id="ethos"
                value={companyEthos}
                onChange={(e) => setCompanyEthos(e.target.value)}
                placeholder="Additional context about your culture and values..."
                className="min-h-[80px]"
                data-testid="textarea-ethos"
              />
            </div>

            <Button 
              onClick={handleAnalyzeMission}
              disabled={analyzeMission.isPending}
              data-testid="button-analyze-mission"
            >
              {analyzeMission.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze Mission
                </>
              )}
            </Button>

            {missionAnalysis && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Analysis Summary</h4>
                  <p className="text-sm text-muted-foreground">{missionAnalysis.summary}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Capability Priorities</h4>
                  <div className="space-y-2">
                    {missionAnalysis.capabilityPriorities.map((cap) => {
                      const fitCap = FIT_CAPABILITIES.find(c => c.code === cap.code);
                      return (
                        <div key={cap.code} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                          <div className={`h-8 w-8 rounded-full ${fitCap?.color || 'bg-gray-500'} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-white text-xs font-bold">{cap.code}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{cap.name}</span>
                              <Badge variant={
                                cap.priority === "critical" ? "destructive" :
                                cap.priority === "high" ? "default" :
                                cap.priority === "medium" ? "secondary" : "outline"
                              }>
                                {cap.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{cap.reasoning}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {missionAnalysis.keyThemes.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Key Themes</h4>
                    <div className="flex flex-wrap gap-2">
                      {missionAnalysis.keyThemes.map((theme, i) => (
                        <Badge key={i} variant="outline">{theme}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Step 2: Organization Context */}
      <Card data-testid="step-2-org-context">
        <StepHeader 
          step={2} 
          title="Organization Context" 
          description="Tell us about your company and team"
          completed={!!project.companyName}
        />
        {expandedStep === 2 && (
          <div className="p-6 pt-0 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corporation"
                  data-testid="input-company-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-size">Company Size</Label>
                <Select value={companySize} onValueChange={setCompanySize}>
                  <SelectTrigger data-testid="select-company-size">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-500">201-500 employees</SelectItem>
                    <SelectItem value="500+">500+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger data-testid="select-industry">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="finance">Finance & Banking</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="retail">Retail & E-commerce</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-function">Team Function</Label>
                <Select value={teamFunction} onValueChange={setTeamFunction}>
                  <SelectTrigger data-testid="select-team-function">
                    <SelectValue placeholder="Select function" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="leadership">Leadership/Executive</SelectItem>
                    <SelectItem value="cross-functional">Cross-functional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-size">Team Size</Label>
                <Input
                  id="team-size"
                  type="number"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  placeholder="8"
                  min="1"
                  data-testid="input-team-size"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="work-mode">Work Mode</Label>
                <Select value={workMode} onValueChange={setWorkMode}>
                  <SelectTrigger data-testid="select-work-mode">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Fully Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleSaveOrgContext}
              disabled={updateOrgContext.isPending}
              data-testid="button-save-org-context"
            >
              {updateOrgContext.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Save & Continue
                </>
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* Step 3: Team Members */}
      <Card data-testid="step-3-team-members">
        <StepHeader 
          step={3} 
          title="Add Team Members" 
          description={`${teamMembers.length} members added`}
          completed={teamMembers.length > 0}
        />
        {expandedStep === 3 && (
          <div className="p-6 pt-0 space-y-4">
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setShowAddMemberDialog(true)}
                data-testid="button-add-member"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Member Manually
              </Button>
              {isPartnerDashboard && partnerId && (
                <Button variant="outline" disabled data-testid="button-invite-from-candidates">
                  <Send className="mr-2 h-4 w-4" />
                  Invite from Candidates
                </Button>
              )}
            </div>

            {teamMembers.length > 0 && (
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    data-testid={`team-member-${member.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{member.name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.role || member.email || "No details"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {member.fitScores && Object.keys(member.fitScores).length > 0 ? (
                        <div className="flex gap-1">
                          {FIT_CAPABILITIES.map((cap) => {
                            const score = member.fitScores?.[cap.code as keyof typeof member.fitScores];
                            return score !== undefined ? (
                              <div 
                                key={cap.code}
                                className={`${cap.color} text-white text-xs px-1.5 py-0.5 rounded font-medium`}
                                title={`${cap.name}: ${score}%`}
                              >
                                {cap.code}
                              </div>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <Badge variant="outline">No scores</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMember(member.id, member.name || "Member")}
                        data-testid={`button-delete-member-${member.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {teamMembers.length === 0 && (
              <div className="text-center p-8 bg-muted/30 rounded-lg">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No team members added yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add team members with their FIT scores to generate analysis
                </p>
              </div>
            )}

            {teamMembers.length > 0 && (
              <Button 
                onClick={() => setExpandedStep(4)}
                data-testid="button-continue-to-analysis"
              >
                Continue to Analysis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Step 4: Generate Analysis */}
      <Card data-testid="step-4-generate-analysis">
        <StepHeader 
          step={4} 
          title="Generate Team Analysis" 
          description="AI-powered diagnostic report"
          completed={!!teamAnalysis}
        />
        {expandedStep === 4 && (
          <div className="p-6 pt-0 space-y-4">
            <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <BarChart3 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">Comprehensive Analysis</p>
                <p className="text-sm text-muted-foreground">
                  Generate a detailed report including capability distribution, gap analysis, 
                  hire recommendations, and risk alerts.
                </p>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                <span>{teamMembers.length} team members</span>
                <span className="text-muted-foreground">•</span>
                <span>{teamMembers.filter(m => m.fitScores && Object.keys(m.fitScores).length > 0).length} with FIT scores</span>
              </div>
            </div>

            <Button 
              onClick={handleGenerateAnalysis}
              disabled={generateAnalysis.isPending || teamMembers.filter(m => m.fitScores && Object.keys(m.fitScores).length > 0).length === 0}
              size="lg"
              data-testid="button-generate-analysis"
            >
              {generateAnalysis.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Analysis...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Team Analysis
                </>
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* Step 5: Results */}
      {teamAnalysis && (
        <Card data-testid="step-5-results">
          <StepHeader 
            step={5} 
            title="Team Diagnostic Report" 
            description="Your comprehensive analysis"
            completed={true}
          />
          {expandedStep === 5 && (
            <div className="p-6 pt-0 space-y-6">
              <TeamAnalysisResults analysis={teamAnalysis} companyName={project.companyName || "Your Team"} />
            </div>
          )}
        </Card>
      )}

      {/* Add Team Member Dialog */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Enter the team member's details and FIT assessment scores
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="member-name">Name *</Label>
                <Input
                  id="member-name"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="John Doe"
                  data-testid="input-member-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-role">Role</Label>
                <Input
                  id="member-role"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  placeholder="Engineer"
                  data-testid="input-member-role"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="john@company.com"
                data-testid="input-member-email"
              />
            </div>

            <div className="space-y-2">
              <Label>FIT Scores (0-100)</Label>
              <div className="grid grid-cols-2 gap-2">
                {FIT_CAPABILITIES.map((cap) => (
                  <div key={cap.code} className="flex items-center gap-2">
                    <div className={`h-6 w-6 rounded ${cap.color} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-xs font-bold">{cap.code}</span>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={memberScores[cap.code] || ""}
                      onChange={(e) => setMemberScores(prev => ({
                        ...prev,
                        [cap.code]: parseInt(e.target.value, 10) || 0,
                      }))}
                      placeholder="0-100"
                      className="h-8"
                      data-testid={`input-score-${cap.code}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddTeamMember}
              disabled={addTeamMember.isPending}
              data-testid="button-confirm-add-member"
            >
              {addTeamMember.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Team Analysis Results Component
function TeamAnalysisResults({ 
  analysis, 
  companyName 
}: { 
  analysis: EcosystemTeamAnalysis; 
  companyName: string;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h3 className="text-lg font-semibold">{companyName}</h3>
          <p className="text-sm text-muted-foreground">
            {analysis.teamSize} team members • Generated {new Date(analysis.generatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={analysis.overallHealthScore >= 70 ? "default" : analysis.overallHealthScore >= 50 ? "secondary" : "destructive"}>
            Health: {analysis.overallHealthScore}%
          </Badge>
          <Badge variant={analysis.missionAlignmentScore >= 70 ? "default" : analysis.missionAlignmentScore >= 50 ? "secondary" : "destructive"}>
            Alignment: {analysis.missionAlignmentScore}%
          </Badge>
        </div>
      </div>

      {/* Capability Distribution */}
      <div>
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Capability Distribution
        </h4>
        <div className="space-y-3">
          {FIT_CAPABILITIES.map((cap) => {
            const dist = analysis.capabilityDistribution[cap.code];
            if (!dist) return null;
            return (
              <div key={cap.code} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{cap.name}</span>
                  <span className="text-muted-foreground">
                    Avg: {dist.average}% • Coverage: {dist.coverage}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                    <div 
                      className={`h-full ${cap.color} rounded-full`}
                      style={{ width: `${dist.average}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-16">
                    {dist.min}-{dist.max}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gap Analysis */}
      {analysis.gapAnalysis.length > 0 && (
        <div>
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Gap Analysis
          </h4>
          <div className="space-y-2">
            {analysis.gapAnalysis.map((gap, i) => (
              <div 
                key={i}
                className={`p-3 rounded-lg border ${
                  gap.gapSeverity === "critical" ? "bg-destructive/5 border-destructive/20" :
                  gap.gapSeverity === "warning" ? "bg-amber-50 border-amber-200" :
                  "bg-green-50 border-green-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{gap.capability}</span>
                  <Badge variant={
                    gap.gapSeverity === "critical" ? "destructive" :
                    gap.gapSeverity === "warning" ? "secondary" : "default"
                  }>
                    {gap.gapSeverity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{gap.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Alerts */}
      {analysis.riskAlerts.length > 0 && (
        <div>
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risk Alerts
          </h4>
          <div className="space-y-2">
            {analysis.riskAlerts.map((alert, i) => (
              <div 
                key={i}
                className={`p-4 rounded-lg border ${
                  alert.severity === "critical" ? "bg-destructive/5 border-destructive/20" :
                  alert.severity === "warning" ? "bg-amber-50 border-amber-200" :
                  "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={`h-4 w-4 ${
                    alert.severity === "critical" ? "text-destructive" :
                    alert.severity === "warning" ? "text-amber-600" : "text-blue-600"
                  }`} />
                  <span className="font-medium">{alert.title}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                <p className="text-sm font-medium">{alert.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hire Recommendations */}
      {analysis.hireRecommendations.length > 0 && (
        <div>
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Next Hire Recommendations
          </h4>
          <div className="space-y-2">
            {analysis.hireRecommendations.map((rec, i) => (
              <div key={i} className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">#{rec.priorityRank}</Badge>
                    <span className="font-medium">{rec.capability}</span>
                  </div>
                  <Badge variant="outline">Target: {rec.targetScore}%+</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                {rec.alignsWithMission && (
                  <Badge variant="secondary" className="mt-2">Aligns with Mission</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="pt-4 border-t">
        <Button variant="outline" data-testid="button-export-report">
          <FileText className="mr-2 h-4 w-4" />
          Export Report as PDF
        </Button>
      </div>
    </div>
  );
}

export default EcosystemWorkflow;
