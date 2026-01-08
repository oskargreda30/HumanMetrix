import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, TrendingUp, Mail, CheckCircle, Building2 } from "lucide-react";

export default function OverviewTab() {
  const { data: results } = useQuery<any[]>({
    queryKey: ['/api/admin/results'],
  });

  const { data: candidates } = useQuery<any[]>({
    queryKey: ['/api/admin/candidates'],
  });

  const { data: invitations } = useQuery<any[]>({
    queryKey: ['/api/admin/invitations'],
  });

  const { data: partners } = useQuery<any[]>({
    queryKey: ['/api/admin/partners'],
  });

  const completedResults = results?.filter((r) => r.status === 'completed') || [];
  const inProgressResults = results?.filter((r) => r.status === 'in_progress') || [];
  
  const candidatesWithCompletedAssessments = candidates?.filter((c) => 
    c.assessments?.some((a: any) => a.status === 'completed')
  ).length || 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-7">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-candidates">
              {candidates?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">B2B Partners</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-b2b-partners">
              {partners?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invitations Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-invitations-sent">
              {invitations?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Assessments</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completed-candidates">
              {candidatesWithCompletedAssessments}
            </div>
            <p className="text-xs text-muted-foreground mt-1">candidates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-assessments">
              {results?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completed-assessments">
              {completedResults.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-in-progress-assessments">
              {inProgressResults.length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
