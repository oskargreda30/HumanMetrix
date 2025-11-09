import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { formatAssessmentName } from "@/lib/assessmentHelpers";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: availableAssessments, isLoading: assessmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/available-assessments"],
  });

  const { data: results, isLoading: resultsLoading } = useQuery<any[]>({
    queryKey: ["/api/results"],
  });

  if (assessmentsLoading || resultsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completedResults = results?.filter((r: any) => r.status === 'completed') || [];
  const inProgressResults = results?.filter((r: any) => r.status === 'in_progress') || [];
  
  // Check if all 4 assessments are completed
  const allAssessmentsCompleted = completedResults.length === 4;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.firstName || 'there'}!
            </p>
          </div>

          {/* Available Assessments */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Available Assessments</h2>
            {availableAssessments && availableAssessments.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableAssessments.map((assessment: any) => (
                  <Card key={assessment.purchaseItemId} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold">{formatAssessmentName(assessment.assessmentType)}</h3>
                      <Badge variant="secondary">Ready</Badge>
                    </div>
                    <Link href={`/assessment/${assessment.purchaseItemId}`}>
                      <Button className="w-full" data-testid={`button-start-${assessment.assessmentType}`}>
                        Start Assessment
                      </Button>
                    </Link>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No assessments available. Purchase assessments to get started.
                </p>
                <Link href="/assessments">
                  <Button data-testid="button-browse-assessments">Browse Assessments</Button>
                </Link>
              </Card>
            )}
          </section>

          {/* Completed Assessments */}
          {completedResults.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">Your Results</h2>
              <Card className="p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <h3 className="text-xl font-semibold">
                        {allAssessmentsCompleted ? 'All Assessments Complete!' : 'Assessments In Progress'}
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      {allAssessmentsCompleted 
                        ? 'You\'ve completed all 4 assessments. View your results now!' 
                        : `You've completed ${completedResults.length} of 4 assessments. Complete all assessments to view results.`
                      }
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {completedResults.map((result: any) => (
                        <Badge key={result.id} variant="secondary">
                          {formatAssessmentName(result.assessmentType)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {allAssessmentsCompleted && (
                    <div className="flex flex-col gap-2">
                      <Link href="/my-results">
                        <Button size="lg" className="gap-2" data-testid="button-view-all-results">
                          <FileText className="h-4 w-4" />
                          View My Results
                        </Button>
                      </Link>
                      {completedResults[0].completedAt && (
                        <p className="text-xs text-center text-muted-foreground">
                          Last completed {format(new Date(completedResults[0].completedAt), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </section>
          )}

          {/* In Progress */}
          {inProgressResults.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-4">In Progress</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inProgressResults.map((result: any) => (
                  <Card key={result.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold">{formatAssessmentName(result.assessmentType)}</h3>
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Link href={`/assessment/${result.purchaseItemId}`}>
                      <Button variant="outline" className="w-full" data-testid={`button-continue-${result.id}`}>
                        Continue
                      </Button>
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
