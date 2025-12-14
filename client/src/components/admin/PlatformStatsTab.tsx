import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Users, FileText, CheckCircle, Mail, Globe, UserCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PlatformStats {
  totals: {
    organizations: number;
    activeOrganizations: number;
    candidates: number;
    selfServiceCandidates: number;
    assessments: number;
    completedAssessments: number;
    invitations: number;
  };
  organizationStats: Array<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    memberCount: number;
    candidateCount: number;
    completedAssessments: number;
  }>;
}

export default function PlatformStatsTab() {
  const { data: stats, isLoading } = useQuery<PlatformStats>({
    queryKey: ["/api/admin/platform-stats"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-platform-stats" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load platform statistics
        </CardContent>
      </Card>
    );
  }

  const completionRate = stats.totals.assessments > 0 
    ? Math.round((stats.totals.completedAssessments / stats.totals.assessments) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organisations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-orgs">
              {stats.totals.organizations}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totals.activeOrganizations} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-candidates-platform">
              {stats.totals.candidates}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totals.selfServiceCandidates} self-service
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-assessments-platform">
              {stats.totals.assessments}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totals.completedAssessments} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completion-rate">
              {completionRate}%
            </div>
            <Progress value={completionRate} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Organisation Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.organizationStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No organisations created yet
            </p>
          ) : (
            <div className="space-y-4">
              {stats.organizationStats.map((org) => (
                <div 
                  key={org.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`org-stat-${org.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{org.name}</h4>
                        <Badge variant={org.isActive ? "secondary" : "outline"}>
                          {org.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">/{org.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-semibold">{org.memberCount}</div>
                      <div className="text-muted-foreground text-xs">Members</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{org.candidateCount}</div>
                      <div className="text-muted-foreground text-xs">Candidates</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{org.completedAssessments}</div>
                      <div className="text-muted-foreground text-xs">Completed</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invitations Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-invitations-platform">
              {stats.totals.invitations}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all organisations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Self-Service Candidates</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-self-service">
              {stats.totals.selfServiceCandidates}
            </div>
            <p className="text-xs text-muted-foreground">
              Direct sign-ups (not via organisation)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
