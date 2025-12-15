import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Users, FileText, CheckCircle, Mail, Globe, UserCheck, Activity, Database, Server } from "lucide-react";
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

interface QueueStats {
  queues: {
    email: {
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    };
    scoring: {
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    };
  };
  database: {
    totalConnections: number;
    idleConnections: number;
    waitingRequests: number;
  };
  timestamp: string;
}

interface User {
  id: string;
  role?: string;
}

interface PlatformStatsTabProps {
  currentUser?: User | null;
}

export default function PlatformStatsTab({ currentUser }: PlatformStatsTabProps) {
  const isSuperAdmin = currentUser?.role === 'super_admin';
  
  const { data: stats, isLoading } = useQuery<PlatformStats>({
    queryKey: ["/api/admin/platform-stats"],
  });

  const { data: queueStats, isLoading: queueLoading } = useQuery<QueueStats>({
    queryKey: ["/api/admin/queue-stats"],
    refetchInterval: 10000,
    enabled: isSuperAdmin,
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

      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
              {queueLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queueStats ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-md" data-testid="card-email-queue">
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Email Queue</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Pending:</span>
                      <span className="ml-2 font-medium" data-testid="text-email-pending">{queueStats.queues.email.pending}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Processing:</span>
                      <span className="ml-2 font-medium" data-testid="text-email-processing">{queueStats.queues.email.processing}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="ml-2 font-medium text-primary" data-testid="text-email-completed">{queueStats.queues.email.completed}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Failed:</span>
                      <span className="ml-2 font-medium text-destructive" data-testid="text-email-failed">{queueStats.queues.email.failed}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-md" data-testid="card-scoring-queue">
                  <div className="flex items-center gap-2 mb-3">
                    <Server className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Scoring Queue</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Pending:</span>
                      <span className="ml-2 font-medium" data-testid="text-scoring-pending">{queueStats.queues.scoring.pending}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Processing:</span>
                      <span className="ml-2 font-medium" data-testid="text-scoring-processing">{queueStats.queues.scoring.processing}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="ml-2 font-medium text-primary" data-testid="text-scoring-completed">{queueStats.queues.scoring.completed}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Failed:</span>
                      <span className="ml-2 font-medium text-destructive" data-testid="text-scoring-failed">{queueStats.queues.scoring.failed}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-md" data-testid="card-database-pool">
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Database Pool</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Connections:</span>
                      <span className="font-medium" data-testid="text-db-total">{queueStats.database.totalConnections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Idle:</span>
                      <span className="font-medium text-primary" data-testid="text-db-idle">{queueStats.database.idleConnections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Waiting:</span>
                      <span className={`font-medium ${queueStats.database.waitingRequests > 0 ? 'text-destructive' : ''}`} data-testid="text-db-waiting">
                        {queueStats.database.waitingRequests}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Unable to load system health data
              </p>
            )}
            {queueStats && (
              <p className="text-xs text-muted-foreground mt-4 text-right">
                Last updated: {new Date(queueStats.timestamp).toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
