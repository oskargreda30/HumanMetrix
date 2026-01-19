import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Plus, 
  FolderOpen,
  Calendar,
  Trash2,
  BarChart3,
  ArrowRight,
  Loader2,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  useEcosystemProjects,
  useCreateEcosystemProject,
  useDeleteEcosystemProject,
} from "@/hooks/useEcosystemProject";
import type { EcosystemProject } from "@shared/schema";

interface EcosystemProjectSelectorProps {
  onSelectProject: (projectId: string) => void;
  partnerId?: string;
  isPartnerDashboard?: boolean;
}

export function EcosystemProjectSelector({ 
  onSelectProject, 
  partnerId,
  isPartnerDashboard = false,
}: EcosystemProjectSelectorProps) {
  const { toast } = useToast();
  const { data: projects = [], isLoading } = useEcosystemProjects(partnerId);
  const createProject = useCreateEcosystemProject();
  const deleteProject = useDeleteEcosystemProject();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [projectName, setProjectName] = useState("");

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your project.",
        variant: "destructive",
      });
      return;
    }

    try {
      const project = await createProject.mutateAsync({
        name: projectName,
        partnerId,
      });
      toast({
        title: "Project created",
        description: "Your new team analysis project is ready.",
      });
      setShowCreateDialog(false);
      setProjectName("");
      onSelectProject(project.id);
    } catch (error: any) {
      toast({
        title: "Failed to create project",
        description: error.message || "Could not create project.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteProject.mutateAsync(id);
      toast({
        title: "Project deleted",
        description: `"${name}" has been deleted.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete",
        description: error.message || "Could not delete project.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (project: EcosystemProject) => {
    switch (project.status) {
      case "completed":
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      case "in_progress":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> In Progress</Badge>;
      case "analysis_ready":
        return <Badge variant="outline"><BarChart3 className="h-3 w-3 mr-1" /> Ready for Analysis</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Team Analysis Projects</h2>
          <p className="text-sm text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-new-project">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first team analysis project to get started
          </p>
          <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first-project">
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card 
              key={project.id}
              className="p-4 cursor-pointer hover-elevate transition-all"
              onClick={() => onSelectProject(project.id)}
              data-testid={`project-card-${project.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{project.name}</h3>
                  {project.companyName && (
                    <p className="text-sm text-muted-foreground truncate">{project.companyName}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={(e) => handleDeleteProject(project.id, project.name, e)}
                  data-testid={`button-delete-project-${project.id}`}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                {getStatusBadge(project)}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Step {project.currentStep}/5
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Start a new team analysis project
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Q1 2026 Engineering Team Analysis"
                data-testid="input-project-name"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject}
              disabled={createProject.isPending}
              data-testid="button-confirm-create-project"
            >
              {createProject.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EcosystemProjectSelector;
