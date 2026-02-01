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
  }, [projects, projectsLoading, createProject, partnerId, refetch]);

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

  // Handle creating a new analysis
  const handleStartNewAnalysis = () => {
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
      {/* Project Selector - only show if there are completed analyses */}
      {(completedProjects.length > 0 || projects.length > 1) && (
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 border">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Current Analysis:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-1"
                  data-testid="button-project-selector"
                >
                  {currentProject?.name || "Team Diagnostic"}
                  {currentProject?.teamAnalysis && (
                    <Badge variant="secondary" className="ml-1 text-xs">Complete</Badge>
                  )}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {projects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    onClick={() => setProjectId(project.id)}
                    className="flex items-center justify-between"
                    data-testid={`menu-item-project-${project.id}`}
                  >
                    <span className="truncate flex-1">{project.name}</span>
                    <div className="flex items-center gap-2">
                      {project.teamAnalysis && (
                        <Badge variant="secondary" className="text-xs">Complete</Badge>
                      )}
                      {project.id === projectId && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
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
          
          {!currentProject?.teamAnalysis && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartNewAnalysis}
              disabled={createProject.isPending}
              className="text-xs"
              data-testid="button-new-analysis"
            >
              {createProject.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Plus className="h-3 w-3 mr-1" />
              )}
              New Analysis
            </Button>
          )}
        </div>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Credit Usage for Team Diagnostic
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              This feature uses <strong>{ECOSYSTEM_CREDITS_REQUIRED} credits</strong> for AI-powered team analysis. 
              Credits are consumed when you click "Use Credits" to generate your comprehensive team capability report.
            </p>
          </div>
        </div>
      </div>
      
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
