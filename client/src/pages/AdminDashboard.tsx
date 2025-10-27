import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, FileText, TrendingUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const { user, isLoading: userLoading } = useUser();

  const { data: results, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/results'],
    enabled: !!user?.isAdmin,
  });

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-user" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const completedResults = results?.filter((r) => r.status === 'completed') || [];
  const inProgressResults = results?.filter((r) => r.status === 'in_progress') || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-admin-dashboard">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of all assessment results</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-in-progress-assessments">
              {inProgressResults.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Assessment Results</CardTitle>
          <CardDescription>View results from all users</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-results" />
            </div>
          ) : results && results.length > 0 ? (
            <div className="space-y-4">
              {results.map((result: any) => (
                <div
                  key={result.id}
                  className="p-4 border rounded-lg space-y-3"
                  data-testid={`result-${result.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold" data-testid={`text-assessment-type-${result.id}`}>
                          {result.assessmentType}
                        </h3>
                        <Badge
                          variant={result.status === 'completed' ? 'default' : 'secondary'}
                          data-testid={`badge-status-${result.id}`}
                        >
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-user-id-${result.id}`}>
                        User ID: {result.userId}
                      </p>
                    </div>
                    {result.totalScore !== null && result.totalScore !== undefined && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary" data-testid={`text-total-score-${result.id}`}>
                          {result.totalScore}%
                        </div>
                        {result.percentile && (
                          <p className="text-sm text-muted-foreground">
                            {result.percentile}th percentile
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {result.scores && Object.keys(result.scores).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Skill Scores:</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(result.scores as Record<string, number>).map(([skill, score]) => (
                          <div key={skill} className="text-sm">
                            <span className="text-muted-foreground">{skill}:</span>{' '}
                            <span className="font-medium">{score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Started: {new Date(result.startedAt).toLocaleDateString()}
                    </div>
                    {result.completedAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Completed: {new Date(result.completedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No assessment results yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
