import { useEffect, useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Sparkles, Plus, ChevronDown, Check, FileText, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EcosystemWorkflow } from "./EcosystemWorkflow";
import { useEcosystemProjects, useCreateEcosystemProject } from "@/hooks/useEcosystemProject";
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
}

export function EcosystemAutoProject({ 
  partnerId, 
  billingType, 
  hasCardOnFile, 
  creditsRemaining, 
  onNavigateToBilling 
}: EcosystemAutoProjectProps) {
  const { toast } = useToast();
  const { data: projects = [], isLoading: projectsLoading, refetch } = useEcosystemProjects(partnerId);
  const createProject = useCreateEcosystemProject();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const creationAttemptedRef = useRef(false);
  
  // New analysis naming dialog state
  const [showNewAnalysisDialog, setShowNewAnalysisDialog] = useState(false);
  const [newAnalysisName, setNewAnalysisName] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  
  // Search filter for project dropdown
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  
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
    
    if (creationAttemptedRef.current) return;
    
    creationAttemptedRef.current = true;
    
    createProject.mutateAsync({
      name: DEFAULT_PROJECT_NAME,
      partnerId,
    }).then((project) => {
      setProjectId(project.id);
      refetch();
    }).catch((err) => {
      setError("Unable to set up team diagnostic. Please try again.");
      creationAttemptedRef.current = false;
    });
  }, [projects, projectsLoading, createProject, partnerId, refetch, projectId]);

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

  if (projectsLoading || createProject.isPending || !projectId) {
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
            <span className="text-muted-foreground">Setting up your team diagnostic...</span>
          </div>
        </CardContent>
      </Card>
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

  // Open the new analysis naming dialog
  const handleStartNewAnalysis = () => {
    // Generate default name with timestamp
    const timestamp = new Date().toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    setNewAnalysisName(`Team Diagnostic - ${timestamp}`);
    setShowNewAnalysisDialog(true);
  };
  
  // Sanitize analysis name - remove XSS vectors and limit length
  // Note: Quotes and other punctuation are allowed since React JSX automatically
  // escapes them on render. We only need to remove HTML tags and angle brackets
  // which could be used for script injection if the name were ever rendered as raw HTML.
  const sanitizeAnalysisName = (name: string): string => {
    const sanitized = name
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>]/g, '')    // Remove stray angle brackets
      .trim()
      .slice(0, MAX_ANALYSIS_NAME_LENGTH);
    return sanitized;
  };
  
  // Create the new analysis with the custom name
  const handleConfirmNewAnalysis = async () => {
    const sanitizedName = sanitizeAnalysisName(newAnalysisName);
    
    if (!sanitizedName) {
      setDialogError("Please enter a name for your analysis.");
      return;
    }
    
    // Guard against concurrent creation
    if (createProject.isPending) return;
    
    setDialogError(null);
    
    try {
      const project = await createProject.mutateAsync({
        name: sanitizedName,
        partnerId,
      });
      setProjectId(project.id);
      setShowNewAnalysisDialog(false);
      setNewAnalysisName("");
      setDialogError(null);
      refetch();
      toast({
        title: "Analysis created",
        description: `"${sanitizedName}" is ready to start.`,
      });
    } catch (err) {
      // Keep dialog open on error so user can retry
      setDialogError("Unable to create analysis. Please try again.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Header Row: Analysis Selector + New Analysis + Credit Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Left: Analysis Title */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Analysis:</span>
              <span className="font-bold text-foreground" data-testid="text-current-analysis">
                {currentProject?.name || "Team Diagnostic"}
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
                              onClick={() => setProjectId(project.id)}
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
                              onClick={() => setProjectId(project.id)}
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
          
          {/* Saved Reports Row - compact horizontal pills */}
          {completedProjects.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground">Saved Reports:</span>
                <div className="flex flex-wrap gap-2">
                  {completedProjects.map((proj) => (
                    <Tooltip key={proj.id}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={proj.id === projectId ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setProjectId(proj.id)}
                          data-testid={`saved-report-${proj.id}`}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          {truncateName(proj.name, 20)}
                          {proj.id === projectId && <Check className="h-3 w-3 ml-1" />}
                        </Button>
                      </TooltipTrigger>
                      {proj.name.length > 20 && (
                        <TooltipContent>
                          <p>{proj.name}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Workflow Card */}
      <Card>
        <CardContent className="pt-6">
          <EcosystemWorkflow 
            projectId={projectId}
            isPartnerDashboard={true}
            partnerId={partnerId}
            billingType={billingType}
            hasCardOnFile={hasCardOnFile}
            creditsRemaining={creditsRemaining}
            onNavigateToBilling={onNavigateToBilling}
          />
        </CardContent>
      </Card>
      
      {/* New Analysis Naming Dialog */}
      <Dialog 
        open={showNewAnalysisDialog} 
        onOpenChange={(open) => {
          // Prevent closing while mutation is pending
          if (!open && createProject.isPending) return;
          
          if (open && !newAnalysisName) {
            // Ensure prefill with suggested name when dialog opens without a name
            const timestamp = new Date().toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            });
            setNewAnalysisName(`Team Diagnostic - ${timestamp}`);
          }
          setShowNewAnalysisDialog(open);
          if (!open) {
            // Clear state when dialog closes
            setNewAnalysisName("");
            setDialogError(null);
          }
        }}
      >
        <DialogContent 
          onEscapeKeyDown={(e) => {
            // Prevent closing with Escape while mutation is pending
            if (createProject.isPending) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            // Prevent closing by clicking outside while mutation is pending
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
                // Limit to max length
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
              disabled={createProject.isPending || !newAnalysisName.trim()}
              data-testid="button-confirm-new-analysis"
            >
              {createProject.isPending ? (
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
    </div>
  );
}
