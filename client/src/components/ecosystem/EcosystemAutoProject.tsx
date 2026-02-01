import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Sparkles, Plus, ChevronDown, Check, FileText } from "lucide-react";
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

const ECOSYSTEM_CREDITS_REQUIRED = 20;

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
  const { data: projects = [], isLoading: projectsLoading, refetch } = useEcosystemProjects(partnerId);
  const createProject = useCreateEcosystemProject();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const creationAttemptedRef = useRef(false);

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
  
  // Get completed analyses (projects with teamAnalysis)
  const completedProjects = projects.filter(p => p.teamAnalysis);
  const hasMultipleAnalyses = completedProjects.length > 1 || (completedProjects.length === 1 && !currentProject?.teamAnalysis);

  // Handle creating a new analysis with guard against concurrent creation
  const handleStartNewAnalysis = () => {
    // Guard against concurrent creation
    if (createProject.isPending) return;
    
    const timestamp = new Date().toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const newName = `Team Diagnostic - ${timestamp}`;
    
    createProject.mutateAsync({
      name: newName,
      partnerId,
    }).then((project) => {
      setProjectId(project.id);
      refetch();
    }).catch((err) => {
      setError("Unable to create new analysis. Please try again.");
    });
  };

  return (
    <div className="space-y-4">
      {/* Current Analysis and Credit Info - side by side layout */}
      <div className="flex flex-col md:flex-row items-stretch gap-3">
        {/* Current Analysis Selector */}
        {projects.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Current Analysis:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="default" 
                    size="default" 
                    className="gap-2 font-semibold"
                    data-testid="button-project-selector"
                  >
                    {currentProject?.name || "Team Diagnostic"}
                    {currentProject?.teamAnalysis && (
                      <Badge variant="secondary" className="ml-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">Complete</Badge>
                    )}
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {/* Show completed analyses first */}
                  {completedProjects.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                        Completed Analyses
                      </div>
                      {completedProjects.map((project) => (
                        <DropdownMenuItem
                          key={project.id}
                          onClick={() => setProjectId(project.id)}
                          className="flex items-center justify-between"
                          data-testid={`menu-item-project-${project.id}`}
                        >
                          <span className="truncate flex-1">{project.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Complete</Badge>
                            {project.id === projectId && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  {/* Show in-progress analyses */}
                  {projects.filter(p => !p.teamAnalysis).length > 0 && (
                    <>
                      {completedProjects.length > 0 && <DropdownMenuSeparator />}
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                        In Progress
                      </div>
                      {projects.filter(p => !p.teamAnalysis).map((project) => (
                        <DropdownMenuItem
                          key={project.id}
                          onClick={() => setProjectId(project.id)}
                          className="flex items-center justify-between"
                          data-testid={`menu-item-project-${project.id}`}
                        >
                          <span className="truncate flex-1">{project.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Draft</Badge>
                            {project.id === projectId && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </>
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
            </div>
          </div>
        )}

        {/* Credit Usage Info */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">Credit Usage:</span>{" "}
              <span className="text-xs text-blue-700 dark:text-blue-300">
                This feature uses <strong>{ECOSYSTEM_CREDITS_REQUIRED} credits</strong> for AI-powered team analysis. Credits are consumed when you click "Use Credits".
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Saved Reports Section - below Current Analysis and Credit Usage */}
      {completedProjects.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">Saved Reports ({completedProjects.length})</span>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleStartNewAnalysis}
              disabled={createProject.isPending}
              data-testid="button-new-analysis-saved-reports"
            >
              {createProject.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              New Analysis
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {completedProjects.map((proj) => (
              <Button
                key={proj.id}
                variant={proj.id === projectId ? "default" : "outline"}
                size="sm"
                onClick={() => setProjectId(proj.id)}
                data-testid={`saved-report-${proj.id}`}
              >
                <FileText className="h-3 w-3 mr-1" />
                {proj.name}
                {proj.id === projectId && <Check className="h-3 w-3 ml-1" />}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Show New Analysis button prominently when no completed projects */}
      {completedProjects.length === 0 && (
        <div className="flex justify-end">
          <Button
            variant="default"
            onClick={handleStartNewAnalysis}
            disabled={createProject.isPending}
            data-testid="button-new-analysis-empty-state"
          >
            {createProject.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Start New Analysis
          </Button>
        </div>
      )}
      
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
    </div>
  );
}
