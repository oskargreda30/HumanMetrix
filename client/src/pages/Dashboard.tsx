import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Clock, FileText } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: availableAssessments, isLoading: assessmentsLoading } = useQuery({
    queryKey: ["/api/available-assessments"],
    enabled: isAuthenticated,
  });

  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ["/api/results"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please log in to access your dashboard",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  if (authLoading || assessmentsLoading || resultsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completedResults = results?.filter((r: any) => r.status === 'completed') || [];
  const inProgressResults = results?.filter((r: any) => r.status === 'in_progress') || [];

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
                      <h3 className="text-lg font-semibold">{assessment.assessmentType.toUpperCase()}</h3>
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
              <h2 className="text-2xl font-semibold mb-4">Completed Assessments</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedResults.map((result: any) => (
                  <Card key={result.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{result.assessmentType.toUpperCase()}</h3>
                        <p className="text-sm text-muted-foreground">
                          Score: {result.totalScore || 0}/100
                        </p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <Link href={`/results/${result.id}`}>
                      <Button variant="outline" className="w-full" data-testid={`button-view-result-${result.id}`}>
                        View Results
                      </Button>
                    </Link>
                  </Card>
                ))}
              </div>
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
                      <h3 className="text-lg font-semibold">{result.assessmentType.toUpperCase()}</h3>
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
