import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  Tooltip
} from "recharts";
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
  Lightbulb,
  Star,
  MessageSquare,
  HelpCircle,
  Calendar,
  ExternalLink,
  Clock,
  DollarSign,
  ShieldAlert,
  Search,
  TrendingUp,
} from "lucide-react";
import {
  useEcosystemProject,
  useEcosystemTeamMembers,
  useAnalyzeMission,
  useUpdateOrganizationContext,
  useAddTeamMember,
  useDeleteTeamMember,
  useGenerateTeamAnalysis,
  useSearchableCandidates,
  type SearchableCandidate,
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
  const [industry, setIndustry] = useState("");
  const [teamFunction, setTeamFunction] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [teamStage, setTeamStage] = useState("");
  const [hiringPlans, setHiringPlans] = useState("");
  const [currentChallenges, setCurrentChallenges] = useState("");
  
  // Deep dive questions states
  const [delayedTasks, setDelayedTasks] = useState("");
  const [conflictTopics, setConflictTopics] = useState("");
  const [avoidedWork, setAvoidedWork] = useState("");
  const [overloadedMember, setOverloadedMember] = useState("");
  const [wishedSkills, setWishedSkills] = useState("");
  const [idealInteractionStyle, setIdealInteractionStyle] = useState("");
  const [personalityGap, setPersonalityGap] = useState("");
  const [upcomingInitiative, setUpcomingInitiative] = useState("");
  const [cloneableSkills, setCloneableSkills] = useState("");
  const [transformativeFix, setTransformativeFix] = useState("");
  
  // Deep dive section visibility
  const [showDeepDive, setShowDeepDive] = useState(false);
  
  // Analysis progress tracking
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState("");

  // Team member dialog
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showPdfUploadDialog, setShowPdfUploadDialog] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [memberScores, setMemberScores] = useState<Record<string, number>>({});
  
  // PDF upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [parsedPdfData, setParsedPdfData] = useState<{name?: string; scores?: Record<string, number>} | null>(null);

  // Expanded sections
  const [expandedStep, setExpandedStep] = useState<number>(1);

  // Initialize form from project data
  useEffect(() => {
    if (project) {
      setMissionStatement(project.missionStatement || "");
      setCompanyEthos(project.companyEthos || "");
      setIndustry(project.industry || "");
      setTeamFunction(project.teamFunction || "");
      setTeamSize(project.teamSize?.toString() || "");
      setWorkMode(project.workMode || "");
      setTeamStage(project.teamStage || "");
      setHiringPlans(project.hiringPlans || "");
      setCurrentChallenges(project.currentChallenges || "");
      
      // Deep dive fields
      setDelayedTasks(project.delayedTasks || "");
      setConflictTopics(project.conflictTopics || "");
      setAvoidedWork(project.avoidedWork || "");
      setOverloadedMember(project.overloadedMember || "");
      setWishedSkills(project.wishedSkills || "");
      setIdealInteractionStyle(project.idealInteractionStyle || "");
      setPersonalityGap(project.personalityGap || "");
      setUpcomingInitiative(project.upcomingInitiative || "");
      setCloneableSkills(project.cloneableSkills || "");
      setTransformativeFix(project.transformativeFix || "");
      
      // Check if any deep dive fields have data
      const hasDeepDiveData = project.delayedTasks || project.conflictTopics || project.avoidedWork ||
        project.overloadedMember || project.wishedSkills || project.idealInteractionStyle ||
        project.personalityGap || project.upcomingInitiative || project.cloneableSkills || project.transformativeFix;
      setShowDeepDive(!!hasDeepDiveData);
      
      setExpandedStep(project.currentStep || 1);
    }
  }, [project]);

  // Progress tracking for analysis generation
  useEffect(() => {
    if (!generateAnalysis.isPending) {
      setAnalysisProgress(0);
      setAnalysisStage("");
      return;
    }

    const stages = [
      { progress: 10, stage: "Analyzing team composition..." },
      { progress: 25, stage: "Processing FIT scores..." },
      { progress: 40, stage: "Evaluating mission alignment..." },
      { progress: 55, stage: "Analyzing team context..." },
      { progress: 70, stage: "Running AI gap analysis..." },
      { progress: 85, stage: "Generating ideal candidate profile..." },
      { progress: 95, stage: "Finalizing recommendations..." },
    ];

    let currentStageIndex = 0;
    setAnalysisProgress(stages[0].progress);
    setAnalysisStage(stages[0].stage);

    const interval = setInterval(() => {
      currentStageIndex++;
      if (currentStageIndex < stages.length) {
        setAnalysisProgress(stages[currentStageIndex].progress);
        setAnalysisStage(stages[currentStageIndex].stage);
      }
    }, 8000); // Move to next stage every 8 seconds

    return () => clearInterval(interval);
  }, [generateAnalysis.isPending]);

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
    // All fields are now optional - no validation required
    try {
      await updateOrgContext.mutateAsync({
        projectId,
        // Basic context
        industry: industry || undefined,
        teamFunction: teamFunction || undefined,
        teamSize: teamSize ? parseInt(teamSize, 10) : undefined,
        workMode: workMode || undefined,
        teamStage: teamStage || undefined,
        hiringPlans: hiringPlans || undefined,
        currentChallenges: currentChallenges || undefined,
        
        // Deep dive - Team Dynamics
        delayedTasks: delayedTasks || undefined,
        conflictTopics: conflictTopics || undefined,
        avoidedWork: avoidedWork || undefined,
        
        // Deep dive - Workload & Capacity
        overloadedMember: overloadedMember || undefined,
        wishedSkills: wishedSkills || undefined,
        
        // Deep dive - Culture & Collaboration
        idealInteractionStyle: idealInteractionStyle || undefined,
        personalityGap: personalityGap || undefined,
        
        // Deep dive - Strategic Context
        upcomingInitiative: upcomingInitiative || undefined,
        cloneableSkills: cloneableSkills || undefined,
        transformativeFix: transformativeFix || undefined,
      });
      toast({
        title: "Team context saved",
        description: "Your team details have been saved.",
      });
      setExpandedStep(3);
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error.message || "Could not save team context.",
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

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setParsedPdfData(null);
    }
  };

  const handleParsePdf = async () => {
    if (!pdfFile) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to parse.",
        variant: "destructive",
      });
      return;
    }

    setPdfParsing(true);
    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append("projectId", projectId);

      const response = await fetch("/api/ecosystem/parse-fit-pdf", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to parse PDF");
      }

      const data = await response.json();
      setParsedPdfData(data);
      
      if (data.name && data.scores) {
        setMemberName(data.name);
        setMemberScores(data.scores);
        toast({
          title: "PDF parsed successfully",
          description: `Found scores for ${data.name}. Review and add to team.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "PDF parsing failed",
        description: error.message || "Could not extract FIT scores from PDF.",
        variant: "destructive",
      });
    } finally {
      setPdfParsing(false);
    }
  };

  const handleAddFromPdf = async () => {
    if (!parsedPdfData?.name || !parsedPdfData?.scores) {
      toast({
        title: "No parsed data",
        description: "Please parse a PDF first.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addTeamMember.mutateAsync({
        projectId,
        name: parsedPdfData.name,
        sourceType: "pdf_upload",
        fitScores: parsedPdfData.scores,
      });
      toast({
        title: "Team member added",
        description: `${parsedPdfData.name} has been added from PDF.`,
      });
      setShowPdfUploadDialog(false);
      setPdfFile(null);
      setParsedPdfData(null);
    } catch (error: any) {
      toast({
        title: "Failed to add member",
        description: error.message || "Could not add team member.",
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

      {/* Step 2: Team Context */}
      <Card data-testid="step-2-org-context">
        <StepHeader 
          step={2} 
          title="Team Context" 
          description="Help us understand your team's situation and needs"
          completed={!!industry && !!teamStage}
        />
        {expandedStep === 2 && (
          <div className="p-6 pt-0 space-y-6">
            <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">Context Matters</p>
                <p className="text-sm text-muted-foreground">
                  The more context you provide, the more strategic and relevant our hiring recommendations will be.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
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
                <Label htmlFor="team-stage">Team Stage</Label>
                <Select value={teamStage} onValueChange={setTeamStage}>
                  <SelectTrigger data-testid="select-team-stage">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New Team (0-6 months)</SelectItem>
                    <SelectItem value="growing">Growing (scaling up)</SelectItem>
                    <SelectItem value="mature">Mature (established)</SelectItem>
                    <SelectItem value="restructuring">Restructuring</SelectItem>
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
                <Label htmlFor="team-size">Current Team Size</Label>
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
              <div className="space-y-2">
                <Label htmlFor="hiring-plans">Hiring Plans (next 12 months)</Label>
                <Select value={hiringPlans} onValueChange={setHiringPlans}>
                  <SelectTrigger data-testid="select-hiring-plans">
                    <SelectValue placeholder="Select hiring plans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No planned hires</SelectItem>
                    <SelectItem value="1-3">1-3 hires</SelectItem>
                    <SelectItem value="4-10">4-10 hires</SelectItem>
                    <SelectItem value="10+">10+ hires</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-challenges">Current Challenges</Label>
              <Textarea
                id="current-challenges"
                value={currentChallenges}
                onChange={(e) => setCurrentChallenges(e.target.value)}
                placeholder="Describe any challenges your team is facing... e.g., 'We struggle with meeting deadlines', 'Need to improve cross-team collaboration', 'Looking to build a stronger culture of innovation'"
                className="min-h-[100px]"
                data-testid="textarea-current-challenges"
              />
              <p className="text-xs text-muted-foreground">
                This helps us provide more targeted and relevant recommendations
              </p>
            </div>

            {/* Deep Dive Section */}
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => setShowDeepDive(!showDeepDive)}
                className="w-full flex items-center justify-between p-4 hover-elevate rounded-lg"
                data-testid="button-toggle-deep-dive"
              >
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Deep Dive Questions</p>
                    <p className="text-sm text-muted-foreground">
                      Answer more questions for better hiring recommendations
                    </p>
                  </div>
                </div>
                {showDeepDive ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {showDeepDive && (
                <div className="p-4 pt-0 space-y-6 border-t">
                  {/* Team Dynamics & Pain Points */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Team Dynamics & Pain Points
                    </h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="delayed-tasks">What tasks or responsibilities frequently get delayed or deprioritized?</Label>
                      <Textarea
                        id="delayed-tasks"
                        value={delayedTasks}
                        onChange={(e) => setDelayedTasks(e.target.value)}
                        placeholder="e.g., 'Documentation often falls behind', 'Testing gets rushed at the end of sprints'"
                        className="min-h-[80px]"
                        data-testid="textarea-delayed-tasks"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="conflict-topics">When conflicts arise, what are they usually about?</Label>
                      <Textarea
                        id="conflict-topics"
                        value={conflictTopics}
                        onChange={(e) => setConflictTopics(e.target.value)}
                        placeholder="e.g., 'Disagreements on priorities', 'Communication gaps between teams'"
                        className="min-h-[80px]"
                        data-testid="textarea-conflict-topics"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="avoided-work">What type of work does your team avoid or struggle with?</Label>
                      <Textarea
                        id="avoided-work"
                        value={avoidedWork}
                        onChange={(e) => setAvoidedWork(e.target.value)}
                        placeholder="e.g., 'Cold calling clients', 'Deep technical research', 'Presenting to executives'"
                        className="min-h-[80px]"
                        data-testid="textarea-avoided-work"
                      />
                    </div>
                  </div>

                  {/* Workload & Capacity */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Workload & Capacity
                    </h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="overloaded-member">Who on your team is overloaded? What are they handling that others can't?</Label>
                      <Textarea
                        id="overloaded-member"
                        value={overloadedMember}
                        onChange={(e) => setOverloadedMember(e.target.value)}
                        placeholder="e.g., 'Our lead developer handles all architecture decisions and code reviews'"
                        className="min-h-[80px]"
                        data-testid="textarea-overloaded-member"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="wished-skills">What skills do you constantly wish you had in-house?</Label>
                      <Textarea
                        id="wished-skills"
                        value={wishedSkills}
                        onChange={(e) => setWishedSkills(e.target.value)}
                        placeholder="e.g., 'Data analysis', 'UX design', 'Strategic planning'"
                        className="min-h-[80px]"
                        data-testid="textarea-wished-skills"
                      />
                    </div>
                  </div>

                  {/* Culture & Collaboration */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Culture & Collaboration
                    </h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="ideal-interaction">Describe your ideal team interaction style - do you need someone who leads, supports, or challenges?</Label>
                      <Textarea
                        id="ideal-interaction"
                        value={idealInteractionStyle}
                        onChange={(e) => setIdealInteractionStyle(e.target.value)}
                        placeholder="e.g., 'We need someone who can challenge our assumptions constructively'"
                        className="min-h-[80px]"
                        data-testid="textarea-ideal-interaction"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="personality-gap">What's the biggest personality gap on your team right now?</Label>
                      <Textarea
                        id="personality-gap"
                        value={personalityGap}
                        onChange={(e) => setPersonalityGap(e.target.value)}
                        placeholder="e.g., 'We lack someone who can drive accountability', 'We need more creative thinkers'"
                        className="min-h-[80px]"
                        data-testid="textarea-personality-gap"
                      />
                    </div>
                  </div>

                  {/* Strategic Context */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Strategic Context
                    </h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="upcoming-initiative">What's your biggest upcoming initiative, and what capability would make it easier?</Label>
                      <Textarea
                        id="upcoming-initiative"
                        value={upcomingInitiative}
                        onChange={(e) => setUpcomingInitiative(e.target.value)}
                        placeholder="e.g., 'Launching a new product - we need someone who can manage stakeholders effectively'"
                        className="min-h-[80px]"
                        data-testid="textarea-upcoming-initiative"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cloneable-skills">If you could clone one team member's skills, whose would it be and why?</Label>
                      <Textarea
                        id="cloneable-skills"
                        value={cloneableSkills}
                        onChange={(e) => setCloneableSkills(e.target.value)}
                        placeholder="e.g., 'Our product manager - they're exceptional at translating business needs into technical requirements'"
                        className="min-h-[80px]"
                        data-testid="textarea-cloneable-skills"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="transformative-fix">What's the one thing that, if fixed, would transform your team's performance?</Label>
                      <Textarea
                        id="transformative-fix"
                        value={transformativeFix}
                        onChange={(e) => setTransformativeFix(e.target.value)}
                        placeholder="e.g., 'Better project planning', 'More proactive communication', 'Stronger technical leadership'"
                        className="min-h-[80px]"
                        data-testid="textarea-transformative-fix"
                      />
                    </div>
                  </div>
                </div>
              )}
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
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowAddMemberDialog(true)}
                data-testid="button-add-member"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Member Manually
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPdfUploadDialog(true)}
                data-testid="button-upload-pdf"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload FIT Report PDF
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

            {generateAnalysis.isPending ? (
              <div className="space-y-4" data-testid="analysis-progress">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <Brain className="h-6 w-6 text-primary" />
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">AI Analysis in Progress</p>
                      <p className="text-xs text-muted-foreground">{analysisStage || "Initializing..."}</p>
                    </div>
                  </div>
                  <Progress value={analysisProgress} className="h-2" />
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-muted-foreground">{analysisProgress}% complete</span>
                    <span className="text-xs text-muted-foreground">~60-90 seconds</span>
                  </div>
                </div>
                <Button 
                  disabled
                  size="lg"
                  className="w-full"
                  data-testid="button-generate-analysis"
                >
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Analysis...
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleGenerateAnalysis}
                disabled={teamMembers.filter(m => m.fitScores && Object.keys(m.fitScores).length > 0).length === 0}
                size="lg"
                data-testid="button-generate-analysis"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Team Analysis
              </Button>
            )}
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
              {/* Regenerate Analysis Option */}
              {generateAnalysis.isPending ? (
                <div className="space-y-4" data-testid="regenerate-analysis-progress">
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative">
                        <Brain className="h-6 w-6 text-primary" />
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Regenerating AI Analysis</p>
                        <p className="text-xs text-muted-foreground">{analysisStage || "Initializing..."}</p>
                      </div>
                    </div>
                    <Progress value={analysisProgress} className="h-2" />
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-muted-foreground">{analysisProgress}% complete</span>
                      <span className="text-xs text-muted-foreground">~60-90 seconds</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Made changes?</p>
                      <p className="text-xs text-muted-foreground">
                        Update mission, team members, or context and regenerate your analysis
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleGenerateAnalysis}
                    variant="outline"
                    size="sm"
                    data-testid="button-regenerate-analysis"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate Analysis
                  </Button>
                </div>
              )}

              <TeamAnalysisResults 
                analysis={teamAnalysis} 
                companyName={project.companyName || "Your Team"}
                project={project}
                teamMembers={teamMembers}
              />
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

      {/* Upload PDF Dialog */}
      <Dialog open={showPdfUploadDialog} onOpenChange={setShowPdfUploadDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload FIT Report PDF</DialogTitle>
            <DialogDescription>
              Upload a HumanMetrix FIT assessment PDF to automatically extract scores
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <Label htmlFor="pdf-upload" className="cursor-pointer">
                <span className="text-primary hover:underline">Click to upload</span>
                <span className="text-muted-foreground"> or drag and drop</span>
              </Label>
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handlePdfFileChange}
                className="hidden"
                data-testid="input-pdf-upload"
              />
              <p className="text-xs text-muted-foreground mt-2">PDF files only (max 10MB)</p>
            </div>

            {pdfFile && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{pdfFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(pdfFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleParsePdf}
                  disabled={pdfParsing}
                  data-testid="button-parse-pdf"
                >
                  {pdfParsing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Parse PDF
                    </>
                  )}
                </Button>
              </div>
            )}

            {parsedPdfData && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-700 dark:text-green-400">Scores Extracted</span>
                </div>
                {parsedPdfData.name && (
                  <p className="text-sm mb-2">Name: <span className="font-medium">{parsedPdfData.name}</span></p>
                )}
                {parsedPdfData.scores && (
                  <div className="flex flex-wrap gap-2">
                    {FIT_CAPABILITIES.map((cap) => {
                      const score = parsedPdfData.scores?.[cap.code];
                      return score !== undefined ? (
                        <div 
                          key={cap.code}
                          className={`${cap.color} text-white text-xs px-2 py-1 rounded font-medium`}
                        >
                          {cap.code}: {score}
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPdfUploadDialog(false);
                setPdfFile(null);
                setParsedPdfData(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddFromPdf}
              disabled={!parsedPdfData || addTeamMember.isPending}
              data-testid="button-add-from-pdf"
            >
              {addTeamMember.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add to Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Team Analysis Results Component - Strategic Advisor Report
function TeamAnalysisResults({ 
  analysis, 
  companyName,
  project,
  teamMembers
}: { 
  analysis: EcosystemTeamAnalysis; 
  companyName: string;
  project: any;
  teamMembers: EcosystemTeamMember[];
}) {
  const missionAnalysis = project.missionAnalysis as EcosystemMissionAnalysis | null;
  const CALENDLY_URL = "https://calendly.com/hello-humanmetrix/30min";
  
  // State for candidate search
  const [candidateSearch, setCandidateSearch] = useState("");
  const [showCandidateSearch, setShowCandidateSearch] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  
  // Fetch searchable candidates (only for partners)
  const { data: searchableCandidates = [], isLoading: candidatesLoading } = useSearchableCandidates(
    showCandidateSearch ? project.id : null
  );
  
  // Filter candidates based on search
  const filteredCandidates = searchableCandidates.filter(c => 
    c.name.toLowerCase().includes(candidateSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(candidateSearch.toLowerCase())
  );
  
  // Calculate cumulative scores for radar chart
  const cumulativeScores = FIT_CAPABILITIES.map(cap => {
    const totalScore = teamMembers.reduce((sum, member) => {
      const scores = member.fitScores as Record<string, number> | null;
      const score = scores?.[cap.code] || 0;
      return sum + score;
    }, 0);
    return {
      capability: cap.name,
      code: cap.code,
      score: totalScore,
      maxPossible: teamMembers.length * 100,
    };
  });
  
  // Get selected candidate for team complement visualization
  const selectedCandidate = selectedCandidateId 
    ? filteredCandidates.find(c => c.id === selectedCandidateId) 
    : null;
  
  // Calculate projected team scores with selected candidate added
  const projectedScoresWithCandidate = selectedCandidate ? FIT_CAPABILITIES.map(cap => {
    const currentTotal = cumulativeScores.find(s => s.code === cap.code)?.score || 0;
    const candidateScore = selectedCandidate.fitScores[cap.code] || 0;
    const newTotal = currentTotal + candidateScore;
    const newTeamSize = teamMembers.length + 1;
    return {
      capability: cap.name,
      code: cap.code,
      currentAverage: teamMembers.length > 0 ? Math.round(currentTotal / teamMembers.length) : 0,
      projectedAverage: Math.round(newTotal / newTeamSize),
      improvement: Math.round(newTotal / newTeamSize) - (teamMembers.length > 0 ? Math.round(currentTotal / teamMembers.length) : 0),
      candidateScore,
    };
  }) : [];
  
  return (
    <div className="space-y-8">
      {/* Header with Scores */}
      <div className="flex items-center justify-between pb-4 border-b flex-wrap gap-2">
        <div>
          <h3 className="text-xl font-semibold">Team Diagnostic Report</h3>
          <p className="text-sm text-muted-foreground">
            {analysis.teamSize} team members • Generated {new Date(analysis.generatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant={analysis.overallHealthScore >= 70 ? "default" : analysis.overallHealthScore >= 50 ? "secondary" : "destructive"}>
            Health: {analysis.overallHealthScore}%
          </Badge>
          <Badge variant={analysis.missionAlignmentScore >= 70 ? "default" : analysis.missionAlignmentScore >= 50 ? "secondary" : "destructive"}>
            Mission Fit: {analysis.missionAlignmentScore}%
          </Badge>
        </div>
      </div>
      
      {/* SECTION 1: How to Read This Report */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-slate-600" />
          How to Read This Report
        </h4>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-sm">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-2">
              <FileText className="h-3 w-3 text-muted-foreground" />
              Your Context
            </p>
            <p className="text-xs text-muted-foreground">Summary of the mission, team details, and insights you provided during setup.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-2">
              <Brain className="h-3 w-3 text-muted-foreground" />
              Strategic Assessment
            </p>
            <p className="text-xs text-muted-foreground">Executive summary analyzing your team's strengths, gaps, and strategic recommendations.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-2">
              <Target className="h-3 w-3 text-muted-foreground" />
              Mission Alignment
            </p>
            <p className="text-xs text-muted-foreground">How well your team's capabilities match what your mission requires for success.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-2">
              <Heart className="h-3 w-3 text-muted-foreground" />
              Health Score
            </p>
            <p className="text-xs text-muted-foreground">Overall team capability coverage, balance, and risk exposure assessment.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-2">
              <BarChart3 className="h-3 w-3 text-muted-foreground" />
              Gap Analysis
            </p>
            <p className="text-xs text-muted-foreground">Visual comparison of current team capabilities vs. what your mission requires.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-2">
              <Users className="h-3 w-3 text-muted-foreground" />
              Hiring Recommendations
            </p>
            <p className="text-xs text-muted-foreground">Ideal candidate profiles with specific FIT score targets and interview guidance.</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Your Context - What you told us */}
      <div className="bg-muted/30 rounded-lg p-6 border">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Your Context
        </h4>
        <div className="grid gap-4 md:grid-cols-2">
          {project.missionStatement && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mission Statement</p>
              <p className="text-sm">{project.missionStatement}</p>
            </div>
          )}
          {project.teamStage && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Team Stage</p>
              <p className="text-sm capitalize">{project.teamStage.replace(/_/g, ' ')}</p>
            </div>
          )}
          {project.currentChallenges && (
            <div className="space-y-1 md:col-span-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Challenges</p>
              <p className="text-sm">{project.currentChallenges}</p>
            </div>
          )}
          {project.hiringPlans && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Planned Hires</p>
              <p className="text-sm">{project.hiringPlans} new team members</p>
            </div>
          )}
        </div>
        
        {/* Deep Dive Insights - if any were provided */}
        {(project.delayedTasks || project.conflictTopics || project.avoidedWork || 
          project.overloadedMember || project.wishedSkills || project.idealInteractionStyle ||
          project.personalityGap || project.upcomingInitiative || project.cloneableSkills || project.transformativeFix) && (
          <div className="mt-6 pt-6 border-t">
            <h5 className="text-sm font-medium mb-4 flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Deep Dive Insights
            </h5>
            <div className="grid gap-3 md:grid-cols-2">
              {project.delayedTasks && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delayed Tasks</p>
                  <p className="text-sm">{project.delayedTasks}</p>
                </div>
              )}
              {project.conflictTopics && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conflict Topics</p>
                  <p className="text-sm">{project.conflictTopics}</p>
                </div>
              )}
              {project.avoidedWork && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Work Team Avoids</p>
                  <p className="text-sm">{project.avoidedWork}</p>
                </div>
              )}
              {project.overloadedMember && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overloaded Team Members</p>
                  <p className="text-sm">{project.overloadedMember}</p>
                </div>
              )}
              {project.wishedSkills && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Skills Wished For</p>
                  <p className="text-sm">{project.wishedSkills}</p>
                </div>
              )}
              {project.idealInteractionStyle && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ideal Interaction Style</p>
                  <p className="text-sm">{project.idealInteractionStyle}</p>
                </div>
              )}
              {project.personalityGap && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Personality Gap</p>
                  <p className="text-sm">{project.personalityGap}</p>
                </div>
              )}
              {project.upcomingInitiative && (
                <div className="space-y-1 md:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upcoming Initiative</p>
                  <p className="text-sm">{project.upcomingInitiative}</p>
                </div>
              )}
              {project.cloneableSkills && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Skills to Clone</p>
                  <p className="text-sm">{project.cloneableSkills}</p>
                </div>
              )}
              {project.transformativeFix && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transformative Fix</p>
                  <p className="text-sm">{project.transformativeFix}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2.5: Candidates Assessed Summary */}
      {teamMembers.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-6 border">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Candidates Assessed
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            This analysis is based on FIT assessment scores from {teamMembers.filter(m => m.fitScores && Object.keys(m.fitScores).length > 0).length} of {teamMembers.length} team members.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {teamMembers.map((member) => {
              const hasScores = member.fitScores && Object.keys(member.fitScores).length > 0;
              return (
                <div 
                  key={member.id} 
                  className={`flex items-center gap-3 p-3 rounded-lg border ${hasScores ? 'bg-background' : 'bg-muted/50 opacity-60'}`}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {(member.name || 'TM').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name || 'Team Member'}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.role || 'Team Member'}</p>
                  </div>
                  {hasScores ? (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                      Assessed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Pending
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: Strategic Assessment - AI-Generated Strategic Narrative */}
      {analysis.executiveSummary && (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/20">
          <h4 className="font-semibold mb-4 flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            Strategic Assessment
          </h4>
          <div className="prose prose-sm max-w-none text-muted-foreground">
            {analysis.executiveSummary.split('\n\n').map((paragraph, i) => (
              <p key={i} className="mb-3 last:mb-0 leading-relaxed">{paragraph}</p>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: Mission Alignment Score Explained */}
      {missionAnalysis && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            Mission Alignment Score Explained
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Your Mission Fit score of <span className="font-semibold text-foreground">{analysis.missionAlignmentScore}%</span> measures 
            how well your team's capabilities align with what your mission requires. Based on your mission statement, 
            we've identified which behavioral skills are most critical for your success.
          </p>
          
          {missionAnalysis.summary && (
            <div className="mb-4 p-3 bg-white/50 dark:bg-black/20 rounded-md">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Mission Analysis</p>
              <p className="text-sm">{missionAnalysis.summary}</p>
            </div>
          )}

          {missionAnalysis.capabilityPriorities && missionAnalysis.capabilityPriorities.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Why These Capabilities Matter for Your Mission
              </p>
              <div className="grid gap-2">
                {missionAnalysis.capabilityPriorities
                  .sort((a, b) => {
                    const order = { critical: 0, high: 1, medium: 2, low: 3 };
                    return order[a.priority] - order[b.priority];
                  })
                  .map((cap, i) => {
                    const capInfo = FIT_CAPABILITIES.find(c => c.code === cap.code);
                    const priorityColors = {
                      critical: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
                      high: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
                      medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
                      low: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200",
                    };
                    return (
                      <div key={i} className="flex items-start gap-3 p-2 rounded-md bg-white/30 dark:bg-black/10">
                        <div className={`h-6 w-6 rounded flex-shrink-0 flex items-center justify-center ${capInfo?.color || "bg-gray-500"}`}>
                          <span className="text-white text-xs font-bold">{cap.code}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{cap.name}</span>
                            <Badge className={`text-xs ${priorityColors[cap.priority]}`} variant="outline">
                              {cap.priority} priority
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{cap.reasoning}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: Health Score Explained */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800" data-testid="section-health-score">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Heart className="h-4 w-4 text-green-600" />
          Health Score Explained
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Your Team Health Score of <span className="font-semibold text-foreground">{analysis.overallHealthScore}%</span> is a 
          composite metric that tells you how well-equipped your team is to achieve your mission. Think of it as a "readiness rating" 
          that combines capability strength, coverage breadth, and risk exposure into a single number.
        </p>
        
        <div className="mb-4 p-4 bg-white/50 dark:bg-black/20 rounded-md">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">How It's Calculated</p>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">40%</span>
              </div>
              <div>
                <p className="font-medium">Capability Strength</p>
                <p className="text-muted-foreground text-xs mt-1">
                  The average of your team's FIT scores across all 8 capabilities. Higher individual scores mean a stronger foundation.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">30%</span>
              </div>
              <div>
                <p className="font-medium">Capability Coverage</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Measures whether you have at least one team member meeting the target threshold for each capability. 
                  A team with 100% coverage has someone strong in every area; gaps here indicate blind spots.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">30%</span>
              </div>
              <div>
                <p className="font-medium">Risk & Gap Penalties</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Deductions for critical gaps, warnings, and risk factors. Critical gaps (where the team is 15+ points below target) 
                  have the heaviest penalty (-8 points each). Warnings (-4 points) and minor risks (-2 points) also reduce the score.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 p-4 bg-white/50 dark:bg-black/20 rounded-md">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">What the Score Means</p>
          <div className="grid gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-3 w-12 rounded-full bg-green-500"></div>
              <span><strong>80-100%:</strong> Excellent — Team is well-balanced and mission-ready with minimal gaps</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-12 rounded-full bg-emerald-500"></div>
              <span><strong>65-79%:</strong> Good — Solid foundation with some areas needing attention</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-12 rounded-full bg-amber-500"></div>
              <span><strong>50-64%:</strong> Fair — Notable gaps that could impact mission success</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-12 rounded-full bg-red-500"></div>
              <span><strong>Below 50%:</strong> Needs Attention — Significant capability gaps requiring immediate action</span>
            </div>
          </div>
        </div>

        {analysis.riskAlerts && analysis.riskAlerts.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Factors Affecting Your Score
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              These are the specific issues identified that are reducing your team's health score:
            </p>
            <div className="space-y-2">
              {analysis.riskAlerts.slice(0, 5).map((alert, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                    alert.severity === "critical" ? "text-red-500" : "text-amber-500"
                  }`} />
                  <div>
                    <span className="text-foreground">{alert.title}</span>
                    {alert.severity === "critical" && (
                      <span className="text-xs text-red-500 ml-2">(-8 points)</span>
                    )}
                    {alert.severity === "warning" && (
                      <span className="text-xs text-amber-500 ml-2">(-4 points)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 6: Capability Gap Analysis - Visual Overview */}
      {analysis.capabilityGapMatrix && analysis.capabilityGapMatrix.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Capability Gap Analysis
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Compare your team's current capability levels against what's needed for mission success. 
            The gap score shows how much additional capacity would strengthen each area.
          </p>
          <div className="space-y-4">
            {analysis.capabilityGapMatrix.map((item: any, i: number) => {
              const capInfo = FIT_CAPABILITIES.find(c => c.code === item.code);
              // Calculate scores - assume currentScore and targetScore are provided, or derive from teamStrength
              const strengthToScore: Record<string, number> = {
                strong: 85,
                adequate: 65,
                weak: 40,
                critical: 20,
              };
              const priorityToTarget: Record<string, number> = {
                critical: 90,
                high: 80,
                medium: 65,
                low: 50,
              };
              const currentScore = item.currentScore ?? strengthToScore[item.teamStrength] ?? 50;
              const targetScore = item.targetScore ?? priorityToTarget[item.missionPriority] ?? 70;
              const gap = Math.max(0, targetScore - currentScore);
              const gapColor = gap >= 30 ? "text-red-600 dark:text-red-400" : 
                               gap >= 15 ? "text-amber-600 dark:text-amber-400" : 
                               "text-green-600 dark:text-green-400";
              
              return (
                <div key={i} className="bg-muted/30 rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded ${capInfo?.color || "bg-gray-500"} flex items-center justify-center`}>
                        <span className="text-white text-xs font-bold">{item.code}</span>
                      </div>
                      <span className="font-medium">{item.capability}</span>
                    </div>
                    <div className={`text-sm font-semibold ${gapColor}`}>
                      {gap > 0 ? `+${gap} gap` : "On target"}
                    </div>
                  </div>
                  
                  {/* Horizontal bar chart */}
                  <div className="relative h-6 bg-muted rounded-full overflow-hidden mb-2">
                    {/* Target marker line */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-foreground/60 z-10"
                      style={{ left: `${targetScore}%` }}
                    />
                    {/* Current score bar */}
                    <div 
                      className={`h-full rounded-full transition-all ${capInfo?.color || "bg-primary"}`}
                      style={{ width: `${currentScore}%`, opacity: 0.8 }}
                    />
                    {/* Target score indicator (hollow) */}
                    <div 
                      className="absolute top-0 h-full border-2 border-dashed border-foreground/40 rounded-full"
                      style={{ width: `${targetScore}%` }}
                    />
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <div className={`h-2 w-4 rounded ${capInfo?.color || "bg-primary"}`} style={{ opacity: 0.8 }} />
                        Current: {currentScore}
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="h-2 w-4 rounded border-2 border-dashed border-foreground/40" />
                        Target: {targetScore}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{item.gapAnalysis}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 7: Team Capability Radar Chart */}
      <div data-testid="section-radar-chart">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Team Cumulative Capability Profile
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          This radar chart shows your team's combined scores across all six FIT capabilities. 
          With {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}, the maximum possible score for each capability is {teamMembers.length * 100}.
        </p>
        <div className="bg-muted/30 rounded-lg p-4 border">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={cumulativeScores} margin={{ top: 30, right: 40, bottom: 30, left: 40 }}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="code" 
                  tick={({ x, y, payload, textAnchor, index }: any) => {
                    const item = cumulativeScores[index];
                    const score = item?.score || 0;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text 
                          x={0} 
                          y={0} 
                          textAnchor={textAnchor}
                          fill="hsl(var(--foreground))" 
                          fontSize={12}
                          fontWeight="600"
                        >
                          {payload.value}
                        </text>
                        <text 
                          x={0} 
                          y={14} 
                          textAnchor={textAnchor}
                          fill="hsl(var(--muted-foreground))" 
                          fontSize={10}
                        >
                          {score}
                        </text>
                      </g>
                    );
                  }}
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, teamMembers.length * 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name="Team Score"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value} / ${props.payload.maxPossible} (${Math.round((value / props.payload.maxPossible) * 100)}%)`,
                    props.payload.capability
                  ]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t">
            {cumulativeScores.map((item) => {
              const capInfo = FIT_CAPABILITIES.find(c => c.code === item.code);
              const percentage = Math.round((item.score / item.maxPossible) * 100);
              return (
                <div key={item.code} className="flex items-center gap-2">
                  <div className={`h-6 w-6 rounded flex-shrink-0 flex items-center justify-center ${capInfo?.color || "bg-gray-500"}`}>
                    <span className="text-white text-xs font-bold">{item.code}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{item.capability}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.score}/{item.maxPossible} ({percentage}%)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 8: Deep Contextual Insights - AI Analysis */}
      {analysis.contextualInsights && analysis.contextualInsights.length > 0 && (
        <div data-testid="section-contextual-insights">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Deep Contextual Insights
          </h4>
          <div className="space-y-3">
            {analysis.contextualInsights.map((insight: string, i: number) => (
              <div key={i} className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg" data-testid={`text-insight-${i}`}>
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 9: Ideal Candidate Profile - AI-Generated Detailed Profile */}
      {analysis.idealCandidateProfile && analysis.idealCandidateProfile.summary && (
        <div data-testid="section-ideal-candidate">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            Your Ideal Next Hire
          </h4>
          <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm mb-4 whitespace-pre-line" data-testid="text-candidate-summary">{analysis.idealCandidateProfile.summary}</p>
            
            {/* Target FIT Scores with Reasoning */}
            {Object.keys(analysis.idealCandidateProfile.fitTargets || {}).length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">Target FIT Score Ranges</p>
                <div className="grid gap-2">
                  {Object.entries(analysis.idealCandidateProfile.fitTargets).map(([code, targets]: [string, any]) => {
                    const capInfo = FIT_CAPABILITIES.find(c => c.code === code);
                    return (
                      <div key={code} className="flex items-start gap-3 p-2 bg-background/50 rounded">
                        <div className={`h-6 w-6 rounded ${capInfo?.color || "bg-gray-500"} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white text-xs font-bold">{code}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{capInfo?.name || code}</span>
                            <Badge variant="outline" className="text-xs">
                              {targets.min}-{targets.ideal}%
                            </Badge>
                          </div>
                          {targets.reasoning && (
                            <p className="text-xs text-muted-foreground">{targets.reasoning}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Key Traits */}
            {analysis.idealCandidateProfile.keyTraits && analysis.idealCandidateProfile.keyTraits.length > 0 && (
              <div>
                <p className="text-xs font-medium text-primary mb-2">Key Traits to Seek</p>
                <ul className="text-sm space-y-1">
                  {analysis.idealCandidateProfile.keyTraits.map((trait: string, j: number) => (
                    <li key={j} className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                      <span>{trait}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 10: Ideal Hire Profiles - Strategic Recommendations */}
      {analysis.idealHireProfiles && analysis.idealHireProfiles.length > 0 && (
        <div data-testid="section-hire-profiles">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Recommended Hire Profiles
          </h4>
          <div className="grid gap-4">
            {analysis.idealHireProfiles.map((profile: any, i: number) => (
              <div key={i} className="p-5 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="default" className="text-xs">Priority #{profile.priority}</Badge>
                    </div>
                    <h5 className="font-semibold text-lg">{profile.roleTitle}</h5>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">{profile.rationale}</p>
                
                {/* FIT Score Targets */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Target FIT Scores</p>
                  <div className="grid grid-cols-3 gap-2">
                    {profile.fitTargets && Object.entries(profile.fitTargets).map(([code, targets]: [string, any]) => {
                      const capInfo = FIT_CAPABILITIES.find(c => c.code === code);
                      return (
                        <div key={code} className="flex items-center gap-2 text-sm">
                          <div className={`h-5 w-5 rounded ${capInfo?.color || "bg-gray-500"} flex items-center justify-center`}>
                            <span className="text-white text-[10px] font-bold">{code}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {targets.min}-{targets.ideal}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Key Behaviors & Red Flags */}
                <div className="grid md:grid-cols-2 gap-4">
                  {profile.keyBehaviors && profile.keyBehaviors.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Look For
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {profile.keyBehaviors.map((behavior: string, j: number) => (
                          <li key={j} className="flex items-start gap-2">
                            <span className="text-green-500 mt-1">•</span>
                            {behavior}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {profile.redFlags && profile.redFlags.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Red Flags
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {profile.redFlags.map((flag: string, j: number) => (
                          <li key={j} className="flex items-start gap-2">
                            <span className="text-red-500 mt-1">•</span>
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Candidate Search Section - Only for partner projects */}
          {project.partnerId && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search Your Candidates
                </h5>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCandidateSearch(!showCandidateSearch)}
                  data-testid="button-toggle-candidate-search"
                >
                  {showCandidateSearch ? "Hide" : "Show"} Candidates
                </Button>
              </div>
              
              {showCandidateSearch && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Search through candidates who have completed assessments to find potential matches for your ideal hire profiles.
                  </p>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={candidateSearch}
                      onChange={(e) => setCandidateSearch(e.target.value)}
                      className="pl-10"
                      data-testid="input-candidate-search"
                    />
                  </div>
                  
                  {candidatesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading candidates...</span>
                    </div>
                  ) : filteredCandidates.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {candidateSearch 
                        ? "No candidates match your search" 
                        : "No candidates available (all have been added to your team or none have completed assessments)"}
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">
                        Click on a candidate to see how they would complement your team
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {filteredCandidates.slice(0, 10).map((candidate) => (
                          <div 
                            key={candidate.id} 
                            className={`p-4 rounded-lg border cursor-pointer transition-all hover-elevate ${
                              selectedCandidateId === candidate.id 
                                ? 'bg-primary/10 border-primary ring-2 ring-primary/20' 
                                : 'bg-muted/30'
                            }`}
                            onClick={() => setSelectedCandidateId(
                              selectedCandidateId === candidate.id ? null : candidate.id
                            )}
                            data-testid={`card-candidate-${candidate.id}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium">{candidate.name}</p>
                                <p className="text-xs text-muted-foreground">{candidate.email}</p>
                              </div>
                              {selectedCandidateId === candidate.id && (
                                <Badge variant="default" className="text-xs">Selected</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {FIT_CAPABILITIES.map(cap => {
                                const score = candidate.fitScores[cap.code];
                                if (!score) return null;
                                return (
                                  <Badge 
                                    key={cap.code} 
                                    variant="outline" 
                                    className="text-xs"
                                    data-testid={`badge-score-${candidate.id}-${cap.code}`}
                                  >
                                    {cap.code}: {score}%
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {filteredCandidates.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Showing 10 of {filteredCandidates.length} candidates. Refine your search to see more.
                    </p>
                  )}
                  
                  {/* Team Complement Visualization */}
                  {selectedCandidate && projectedScoresWithCandidate.length > 0 && (
                    <div className="mt-6 p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <h6 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        Team Impact: Adding {selectedCandidate.name}
                      </h6>
                      <p className="text-sm text-muted-foreground mb-4">
                        See how this candidate's scores would improve your team's overall capabilities
                      </p>
                      
                      <div className="space-y-3">
                        {projectedScoresWithCandidate.map((item) => {
                          const capInfo = FIT_CAPABILITIES.find(c => c.code === item.code);
                          const hasImprovement = item.improvement > 0;
                          const hasDecline = item.improvement < 0;
                          return (
                            <div key={item.code} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className={`h-5 w-5 rounded ${capInfo?.color || "bg-gray-500"} flex items-center justify-center`}>
                                    <span className="text-white text-[10px] font-bold">{item.code}</span>
                                  </div>
                                  <span className="font-medium">{item.capability}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-muted-foreground">{item.currentAverage}%</span>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-semibold">{item.projectedAverage}%</span>
                                  {hasImprovement && (
                                    <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50 dark:bg-green-900/30">
                                      +{item.improvement}%
                                    </Badge>
                                  )}
                                  {hasDecline && (
                                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/30">
                                      {item.improvement}%
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="absolute inset-y-0 left-0 bg-muted-foreground/30 rounded-full"
                                  style={{ width: `${item.currentAverage}%` }}
                                />
                                <div 
                                  className={`absolute inset-y-0 left-0 rounded-full ${hasImprovement ? 'bg-green-500' : hasDecline ? 'bg-amber-500' : 'bg-muted-foreground/50'}`}
                                  style={{ width: `${item.projectedAverage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Overall Team Improvement</span>
                          <Badge 
                            variant={projectedScoresWithCandidate.reduce((sum, item) => sum + item.improvement, 0) > 0 ? "default" : "secondary"}
                            className="text-sm"
                          >
                            {projectedScoresWithCandidate.reduce((sum, item) => sum + item.improvement, 0) > 0 ? '+' : ''}
                            {Math.round(projectedScoresWithCandidate.reduce((sum, item) => sum + item.improvement, 0) / projectedScoresWithCandidate.length)}% avg
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
                  alert.severity === "warning" ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" :
                  "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={`h-4 w-4 ${
                    alert.severity === "critical" ? "text-destructive" :
                    alert.severity === "warning" ? "text-amber-600" : "text-blue-600"
                  }`} />
                  <span className="font-medium">{alert.title}</span>
                  <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"} className="ml-auto">
                    {alert.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                <p className="text-sm font-medium text-primary">{alert.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 11: Additional Services On Request */}
      <Card className="border-primary/20 bg-primary">
        <div className="p-6">
          <h4 className="font-semibold mb-2 flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5 text-white" />
            Additional Services on Request
          </h4>
          <p className="text-sm text-white/80 mb-4">
            Contact our team to unlock these premium insights for your hiring decisions
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 rounded-lg bg-white/10 border border-white/20">
              <h5 className="font-medium flex items-center gap-2 mb-2 text-white">
                <MessageSquare className="h-4 w-4 text-white" />
                Suggested Interview Questions
              </h5>
              <p className="text-sm text-white/70">
                Tailored questions based on your team gaps and ideal candidate profiles
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/10 border border-white/20">
              <h5 className="font-medium flex items-center gap-2 mb-2 text-white">
                <Users className="h-4 w-4 text-white" />
                Team Composition Analysis
              </h5>
              <p className="text-sm text-white/70">
                Deep-dive into how new hires would complement your existing team dynamics
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/10 border border-white/20">
              <h5 className="font-medium flex items-center gap-2 mb-2 text-white">
                <Clock className="h-4 w-4 text-white" />
                Time to Productivity Estimate
              </h5>
              <p className="text-sm text-white/70">
                Projected onboarding timeline based on skill readiness and team fit
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/10 border border-white/20">
              <h5 className="font-medium flex items-center gap-2 mb-2 text-white">
                <ShieldAlert className="h-4 w-4 text-white" />
                Hiring Risk Analysis
              </h5>
              <p className="text-sm text-white/70">
                Comprehensive risk assessment with potential challenges and mitigations
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/10 border border-white/20">
              <h5 className="font-medium flex items-center gap-2 mb-2 text-white">
                <DollarSign className="h-4 w-4 text-white" />
                Development Investment Cost
              </h5>
              <p className="text-sm text-white/70">
                Estimated training investment to close identified capability gaps
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/10 border border-white/20">
              <h5 className="font-medium flex items-center gap-2 mb-2 text-white">
                <BarChart3 className="h-4 w-4 text-white" />
                Cohort Benchmarking
              </h5>
              <p className="text-sm text-white/70">
                Compare your team's capabilities against industry benchmarks
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 12: Schedule Consultation */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ready to Discuss Your Results?
            </h4>
            <p className="text-white/90 text-sm">
              Book a 30-minute consultation with our team capability experts to review your report, 
              discuss hiring strategies, and get personalized recommendations for your next steps.
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Button 
              variant="outline" 
              className="border-white text-white hover:bg-white/20"
              onClick={() => window.open(CALENDLY_URL, '_blank')}
              data-testid="button-schedule-consultation"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Consultation
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}

export default EcosystemWorkflow;
