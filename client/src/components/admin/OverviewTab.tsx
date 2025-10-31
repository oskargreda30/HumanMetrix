import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, FileText, TrendingUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isSkillBasedAssessment, getTopSkills, formatAssessmentType } from "@/lib/assessmentSkills";

export default function OverviewTab() {
  const { data: results, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/results'],
  });

  const { data: candidates } = useQuery<any[]>({
    queryKey: ['/api/admin/candidates'],
  });

  const completedResults = results?.filter((r) => r.status === 'completed') || [];
  const inProgressResults = results?.filter((r) => r.status === 'in_progress') || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Recent Assessment Results</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-results" />
            </div>
          ) : results && results.length > 0 ? (
            <div className="space-y-4">
              {results.slice(0, 10).map((result: any) => (
                <div
                  key={result.id}
                  className="p-4 border rounded-lg space-y-3"
                  data-testid={`result-${result.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold" data-testid={`text-assessment-type-${result.id}`}>
                          {formatAssessmentType(result.assessmentType)}
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
                    <div className="text-right">
                      {isSkillBasedAssessment(result.assessmentType) && result.scores ? (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Top Skills</p>
                          {getTopSkills(result.scores, result.assessmentType, 2).map((skill) => (
                            <div key={skill.name} className="flex items-center gap-2 justify-end">
                              <span className="text-sm font-medium">{skill.name}</span>
                              <Badge variant="outline" className="font-mono text-xs">
                                {skill.score}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : result.totalScore !== null && result.totalScore !== undefined ? (
                        <div>
                          <div className="text-2xl font-bold text-primary" data-testid={`text-total-score-${result.id}`}>
                            {result.totalScore}%
                          </div>
                          {result.percentile && (
                            <p className="text-sm text-muted-foreground">
                              {result.percentile}th percentile
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

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
