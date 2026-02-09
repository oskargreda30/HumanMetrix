import { useEffect, useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Sparkles, Plus, ChevronDown, Check, FileText, Search, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EcosystemWorkflow } from "./EcosystemWorkflow";
import { useEcosystemProjects, useCreateEcosystemProject } from "@/hooks/useEcosystemProject";
import { queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

const ECOSYSTEM_CREDITS_REQUIRED = 20;
const MAX_ANALYSIS_NAME_LENGTH = 100;
const DEFAULT_PROJECT_NAME = "Team Diagnostic";

interface EcosystemAutoProjectProps {
  partnerId?: string;
  billingType?: string;
  hasCardOnFile?: boolean;
  creditsRemaining?: number;
  onNavigateToBilling?: () => void;
  onNavigateToAnalysis?: () => void;
}

export function EcosystemAutoProject({ 
  partnerId, 
  billingType, 
  hasCardOnFile, 
  creditsRemaining, 
  onNavigateToBilling,
  onNavigateToAnalysis 
}: EcosystemAutoProjectProps) {
  const { toast } = useToast();
  const { data: projects = [], isLoading: projectsLoading, refetch } = useEcosystemProjects(partnerId);
  const createProject = useCreateEcosystemProject();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const creationAttemptedRef = useRef(false);
  
  // View state for quick action cards - null initially so content only shows when user clicks
  const [activeView, setActiveView] = useState<'new' | 'saved' | null>(null);
  
  // New analysis naming dialog state
  const [showNewAnalysisDialog, setShowNewAnalysisDialog] = useState(false);
  const [newAnalysisName, setNewAnalysisName] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [pendingProjectName, setPendingProjectName] = useState<string | null>(null);
  
  // Search filter for project dropdown
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  
  // Flag to prevent auto-selection during new project creation
  // This prevents race conditions where useEffect tries to auto-select an old project
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  
  // Helper function to switch projects with proper cache clearing
  // This prevents stale data from the old project being displayed during transitions
  const switchToProject = (newProjectId: string | null) => {
    const oldProjectId = projectId;
    
    // If switching to a different project, invalidate ALL ecosystem queries broadly
    // This ensures no stale data from mission analysis, team analysis, etc. persists
    if (oldProjectId && oldProjectId !== newProjectId) {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.includes(`/api/ecosystem/projects/${oldProjectId}`);
        }
      });
    }
    
    setProjectId(newProjectId);
  };
  
  // Get completed and in-progress analyses (must be before early returns for hooks rules)
  const completedProjects = useMemo(() => projects.filter(p => p.teamAnalysis), [projects]);
  const inProgressProjects = useMemo(() => projects.filter(p => !p.teamAnalysis), [projects]);
  
  // Filter projects by search query (must be before early returns for hooks rules)
  const filteredCompletedProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return completedProjects;
    const query = projectSearchQuery.toLowerCase();
    return completedProjects.filter(p => p.name.toLowerCase().includes(query));
  }, [completedProjects, projectSearchQuery]);
  
  const filteredInProgressProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return inProgressProjects;
    const query = projectSearchQuery.toLowerCase();
    return inProgressProjects.filter(p => p.name.toLowerCase().includes(query));
  }, [inProgressProjects, projectSearchQuery]);

  useEffect(() => {
    if (projectsLoading) return;
    
    // CRITICAL: Don't auto-select during new project creation
    // This prevents race conditions where we'd select an old project
    // while the new one is being created
    if (isCreatingProject) return;
    
    // Only auto-select a project if none is currently selected (initial load)
    // Don't override user's selection when they click on saved reports
    if (projectId !== null) {
      // Verify the selected project still exists in the list
      const projectExists = projects.some(p => p.id === projectId);
      if (projectExists) return; // Keep current selection
      // If project no longer exists, fall through to select a new one
    }
    
    const defaultProject = projects.find(p => p.name === DEFAULT_PROJECT_NAME);
    
    if (defaultProject) {
      setProjectId(defaultProject.id);
      return;
    }
    
    if (projects.length > 0) {
      setProjectId(projects[0].id);
      return;
    }
    
    // No projects exist - don't auto-create. Let the user explicitly create one.
  }, [projects, projectsLoading, projectId, isCreatingProject]);

  const handleRetry = () => {
    setError(null);
    creationAttemptedRef.current = false;
    refetch();
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                The Ecosystem Index
                <Badge variant="secondary" className="bg-cyan-500 text-white border-0">New</Badge>
              </CardTitle>
              <CardDescription>AI-powered team diagnostic and hiring recommendations</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={handleRetry} data-testid="button-retry-setup">
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (projectsLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                The Ecosystem Index
                <Badge variant="secondary" className="bg-cyan-500 text-white border-0">New</Badge>
              </CardTitle>
              <CardDescription>AI-powered team diagnostic and hiring recommendations</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-muted-foreground">Loading your analyses...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Open the new analysis naming dialog
  const handleStartNewAnalysis = () => {
    const timestamp = new Date().toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    setNewAnalysisName(`Team Diagnostic - ${timestamp}`);
    setShowNewAnalysisDialog(true);
  };
  
  const sanitizeAnalysisName = (name: string): string => {
    const sanitized = name
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '')
      .trim()
      .slice(0, MAX_ANALYSIS_NAME_LENGTH);
    return sanitized;
  };
  
  const handleConfirmNewAnalysis = async () => {
    console.log("[Ecosystem] handleConfirmNewAnalysis called", { 
      newAnalysisName, 
      isPending: createProject.isPending, 
      isCreatingProject,
      partnerId 
    });
    
    const sanitizedName = sanitizeAnalysisName(newAnalysisName);
    
    if (!sanitizedName) {
      setDialogError("Please enter a name for your analysis.");
      return;
    }
    
    if (createProject.isPending) {
      console.warn("[Ecosystem] Create project mutation already pending, skipping");
      return;
    }
    
    setDialogError(null);
    setIsCreatingProject(true);
    
    const oldProjectId = projectId;
    setProjectId(null);
    
    if (oldProjectId) {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.includes(`/api/ecosystem/projects/${oldProjectId}`);
        }
      });
    }
    
    try {
      console.log("[Ecosystem] Sending POST /api/ecosystem/projects", { name: sanitizedName, partnerId });
      const project = await createProject.mutateAsync({
        name: sanitizedName,
        partnerId,
      });
      
      console.log("[Ecosystem] Analysis created successfully:", project?.id);
      setPendingProjectName(sanitizedName);
      setProjectId(project.id);
      setShowNewAnalysisDialog(false);
      setNewAnalysisName("");
      setDialogError(null);
      await refetch();
      setPendingProjectName(null);
      toast({
        title: "Analysis created",
        description: `"${sanitizedName}" is ready to start.`,
      });
    } catch (err: any) {
      console.error("[Ecosystem] Failed to create analysis:", err);
      setProjectId(oldProjectId);
      const errorMsg = err?.message || "Unable to create analysis. Please try again.";
      setDialogError(errorMsg);
      toast({
        title: "Failed to create analysis",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsCreatingProject(false);
    }
  };

  const renderNewAnalysisDialog = () => (
    <Dialog 
      open={showNewAnalysisDialog} 
      onOpenChange={(open) => {
        if (!open && createProject.isPending) return;
        
        if (open && !newAnalysisName) {
          const timestamp = new Date().toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          });
          setNewAnalysisName(`Team Diagnostic - ${timestamp}`);
        }
        setShowNewAnalysisDialog(open);
        if (!open) {
          setNewAnalysisName("");
          setDialogError(null);
        }
      }}
    >
      <DialogContent 
        onEscapeKeyDown={(e) => {
          if (createProject.isPending) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (createProject.isPending) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Name Your Analysis</DialogTitle>
          <DialogDescription>
            Give your new team analysis a descriptive name to help you identify it later.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="analysis-name">Analysis Name</Label>
          <Input
            id="analysis-name"
            value={newAnalysisName}
            onChange={(e) => {
              const value = e.target.value.slice(0, MAX_ANALYSIS_NAME_LENGTH);
              setNewAnalysisName(value);
              if (dialogError) setDialogError(null);
            }}
            placeholder="e.g., Q1 2026 Engineering Team"
            className={dialogError ? "border-destructive" : ""}
            data-testid="input-analysis-name"
            disabled={createProject.isPending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !createProject.isPending) {
                handleConfirmNewAnalysis();
              }
            }}
          />
          <div className="flex items-center justify-between text-xs">
            <span className={dialogError ? "text-destructive" : "text-transparent"}>
              {dialogError || " "}
            </span>
            <span className={`text-muted-foreground ${newAnalysisName.length >= MAX_ANALYSIS_NAME_LENGTH ? "text-destructive" : ""}`}>
              {newAnalysisName.length}/{MAX_ANALYSIS_NAME_LENGTH}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowNewAnalysisDialog(false);
              setNewAnalysisName("");
              setDialogError(null);
            }}
            disabled={createProject.isPending}
            data-testid="button-cancel-new-analysis"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmNewAnalysis}
            disabled={createProject.isPending || isCreatingProject || !newAnalysisName.trim()}
            data-testid="button-confirm-new-analysis"
          >
            {(createProject.isPending || isCreatingProject) ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Analysis"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (projects.length === 0 && !projectId) {
    return (
      <div className="space-y-4 md:space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  The Ecosystem Index
                  <Badge variant="secondary" className="bg-cyan-500 text-white border-0">New</Badge>
                </CardTitle>
                <CardDescription>AI-powered team diagnostic and hiring recommendations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary opacity-60" />
              <h3 className="text-lg font-semibold mb-2">Welcome to the Ecosystem Index</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Assess your team's capabilities, identify skill gaps, and get AI-powered hiring recommendations. Create your first analysis to get started.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Button
                  onClick={handleStartNewAnalysis}
                  disabled={createProject.isPending}
                  data-testid="button-create-first-analysis"
                >
                  {createProject.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Analysis
                    </>
                  )}
                </Button>
                {onNavigateToAnalysis && (
                  <Button
                    variant="outline"
                    onClick={() => onNavigateToAnalysis()}
                    data-testid="button-back-to-individual"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Individual Analysis
                  </Button>
                )}
              </div>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                <div className="p-4 rounded-md bg-muted/50">
                  <h4 className="font-medium text-sm mb-1">Mission Alignment</h4>
                  <p className="text-xs text-muted-foreground">Analyze how your team's skills align with your company mission</p>
                </div>
                <div className="p-4 rounded-md bg-muted/50">
                  <h4 className="font-medium text-sm mb-1">Gap Analysis</h4>
                  <p className="text-xs text-muted-foreground">Identify critical capability gaps and get hiring priorities</p>
                </div>
                <div className="p-4 rounded-md bg-muted/50">
                  <h4 className="font-medium text-sm mb-1">Ideal Candidate</h4>
                  <p className="text-xs text-muted-foreground">Get AI-generated profiles for your next ideal hire</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {renderNewAnalysisDialog()}
      </div>
    );
  }

  // Get current project for display
  const currentProject = projects.find(p => p.id === projectId);
  
  // Derived values (the useMemo hooks are defined above before early returns)
  const hasMultipleAnalyses = completedProjects.length > 1 || (completedProjects.length === 1 && !currentProject?.teamAnalysis);
  
  // Show search box if there are many projects
  const showProjectSearch = projects.length > 5;
  
  // Truncate long names with ellipsis
  const truncateName = (name: string, maxLength: number = 30) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength - 3) + "...";
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Quick Action Cards - 3 columns on desktop */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-3">
        <Card 
          className={`cursor-pointer hover-elevate ${activeView === 'new' ? 'border-primary ring-1 ring-primary' : ''}`}
          onClick={() => {
            setActiveView('new');
            // Also open the new analysis naming dialog for a fresh start
            handleStartNewAnalysis();
          }}
          data-testid="card-new-analysis"
        >
          <CardContent className="p-4 md:p-6 text-center">
            <Plus className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold text-sm md:text-base">New Analysis</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Start a fresh team diagnostic workflow</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover-elevate ${activeView === 'saved' ? 'border-primary ring-1 ring-primary' : ''}`}
          onClick={() => setActiveView('saved')}
          data-testid="card-saved-reports"
        >
          <CardContent className="p-4 md:p-6 text-center">
            <FileText className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold text-sm md:text-base">Your Analyses</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              {projects.length > 0 ? `${completedProjects.length} completed, ${inProgressProjects.length} in progress` : 'No analyses yet'}
            </p>
          </CardContent>
        </Card>
        {/* Back to Individual Analysis - different color (matching the pattern from PartnerAnalysisTab) */}
        <Card 
          className="cursor-pointer hover-elevate bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/30"
          onClick={() => onNavigateToAnalysis?.()}
          data-testid="card-back-to-analysis"
        >
          <CardContent className="p-4 md:p-6 text-center">
            <User className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-violet-600" />
            <h3 className="font-semibold text-sm md:text-base text-violet-700 dark:text-violet-400">Individual Analysis</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Back to candidate-level insights</p>
          </CardContent>
        </Card>
      </div>

      {/* Landing state when no view is selected */}
      {activeView === null && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Team Ecosystem Analysis</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Select an option above to start a new team diagnostic or view your saved analyses.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Content based on selected card */}
      {activeView === 'new' && (
        <>
          {/* Compact Header Row: Analysis Selector + New Analysis + Credit Info */}
          <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Left: Analysis Title */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Analysis:</span>
              <span className="font-bold text-foreground" data-testid="text-current-analysis">
                {currentProject?.name || pendingProjectName || "Team Diagnostic"}
              </span>
              {currentProject?.teamAnalysis && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">Complete</Badge>
              )}
              
              {/* Hidden dropdown for selecting/switching analyses */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                    data-testid="button-project-selector"
                  >
                    <ChevronDown className="h-4 w-4" />
                    <span className="sr-only">Switch analysis</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start" 
                  className="w-72 max-h-80 overflow-y-auto"
                  onCloseAutoFocus={() => setProjectSearchQuery("")}
                  onInteractOutside={(e) => {
                    // Prevent closing when interacting with any element in the search container
                    const target = e.target as HTMLElement;
                    if (target.closest('[data-search-container="true"]')) {
                      e.preventDefault();
                    }
                  }}
                >
                  {/* Search box for many projects */}
                  {showProjectSearch && (
                    <div 
                      className="p-2 border-b"
                      data-search-container="true"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search analyses..."
                          value={projectSearchQuery}
                          onChange={(e) => setProjectSearchQuery(e.target.value)}
                          className="pl-8 text-sm"
                          data-testid="input-project-search"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          onFocus={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            // Prevent Enter from closing dropdown
                            if (e.key === 'Enter') {
                              e.preventDefault();
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Show completed analyses first */}
                  {filteredCompletedProjects.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                        Completed Analyses
                      </div>
                      {filteredCompletedProjects.map((project) => (
                        <Tooltip key={project.id}>
                          <TooltipTrigger asChild>
                            <DropdownMenuItem
                              onClick={() => switchToProject(project.id)}
                              className="flex items-center justify-between"
                              data-testid={`menu-item-project-${project.id}`}
                            >
                              <span className="truncate flex-1 max-w-[140px]">{truncateName(project.name)}</span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Complete</Badge>
                                {project.id === projectId && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </div>
                            </DropdownMenuItem>
                          </TooltipTrigger>
                          {project.name.length > 30 && (
                            <TooltipContent side="right">
                              <p>{project.name}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      ))}
                    </>
                  )}
                  
                  {/* Show in-progress analyses */}
                  {filteredInProgressProjects.length > 0 && (
                    <>
                      {filteredCompletedProjects.length > 0 && <DropdownMenuSeparator />}
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                        In Progress
                      </div>
                      {filteredInProgressProjects.map((project) => (
                        <Tooltip key={project.id}>
                          <TooltipTrigger asChild>
                            <DropdownMenuItem
                              onClick={() => switchToProject(project.id)}
                              className="flex items-center justify-between"
                              data-testid={`menu-item-project-${project.id}`}
                            >
                              <span className="truncate flex-1 max-w-[140px]">{truncateName(project.name)}</span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant="outline" className="text-xs">Draft</Badge>
                                {project.id === projectId && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </div>
                            </DropdownMenuItem>
                          </TooltipTrigger>
                          {project.name.length > 30 && (
                            <TooltipContent side="right">
                              <p>{project.name}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      ))}
                    </>
                  )}
                  
                  {/* No results message */}
                  {projectSearchQuery && filteredCompletedProjects.length === 0 && filteredInProgressProjects.length === 0 && (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No analyses found
                    </div>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleStartNewAnalysis}
                    className="text-primary"
                    data-testid="menu-item-new-analysis"
                    disabled={createProject.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Start New Analysis
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Credit Badge with Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1 cursor-help">
                    <Sparkles className="h-3 w-3" />
                    {ECOSYSTEM_CREDITS_REQUIRED} credits per analysis
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Credits are consumed when you generate or regenerate an AI-powered team analysis.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            {/* Right: New Analysis Button */}
            <Button
              variant="default"
              size="sm"
              onClick={handleStartNewAnalysis}
              disabled={createProject.isPending}
              data-testid="button-new-analysis-header"
            >
              {createProject.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              New Analysis
            </Button>
          </div>
          
        </CardContent>
      </Card>

      {/* Main Workflow Card */}
      <Card>
        <CardContent className="pt-6">
          {/* Show loading state during new project creation */}
          {isCreatingProject || !projectId ? (
            <div className="space-y-4 md:space-y-6">
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">
                  {isCreatingProject ? "Creating new analysis..." : "Loading..."}
                </p>
              </div>
            </div>
          ) : (
            <EcosystemWorkflow 
              projectId={projectId}
              isPartnerDashboard={true}
              partnerId={partnerId}
              billingType={billingType}
              hasCardOnFile={hasCardOnFile}
              creditsRemaining={creditsRemaining}
              onNavigateToBilling={onNavigateToBilling}
            />
          )}
        </CardContent>
      </Card>
      
      {renderNewAnalysisDialog()}
        </>
      )}

      {/* Saved Reports View */}
      {activeView === 'saved' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Your Analyses
            </CardTitle>
            <CardDescription>View completed reports and resume in-progress analyses</CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length > 0 ? (
              <div className="space-y-3">
                {/* Completed analyses first */}
                {completedProjects.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</p>
                    {completedProjects.map((proj) => (
                      <div 
                        key={proj.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                        onClick={() => {
                          switchToProject(proj.id);
                          setActiveView('new');
                        }}
                        data-testid={`saved-report-card-${proj.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{proj.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : 'Completed'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                          Complete
                        </Badge>
                      </div>
                    ))}
                  </>
                )}
                
                {/* In-progress analyses */}
                {inProgressProjects.length > 0 && (
                  <>
                    {completedProjects.length > 0 && <div className="my-2" />}
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">In Progress</p>
                    {inProgressProjects.map((proj) => (
                      <div 
                        key={proj.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                        onClick={() => {
                          switchToProject(proj.id);
                          setActiveView('new');
                        }}
                        data-testid={`saved-report-card-${proj.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{proj.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Step {proj.currentStep || 1} of 7 &middot; {proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : 'Draft'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          Draft
                        </Badge>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No analyses yet</p>
                <p className="text-sm mt-1">Create a new team diagnostic to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
