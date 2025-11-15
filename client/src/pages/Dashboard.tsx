import { Link, useLocation } from "wouter";
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
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: availableData, isLoading: assessmentsLoading } = useQuery<{assessments: any[], requiredAssessmentTypes: string[]}>({
    queryKey: ["/api/available-assessments"],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale
  });

  const { data: purchasesWithResults, isLoading: purchasesLoading } = useQuery<any[]>({
    queryKey: ["/api/purchases-with-results"],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale
  });

  const availableAssessments = availableData?.assessments || [];
  const requiredAssessmentTypes = availableData?.requiredAssessmentTypes || [];

  // Handle payment cancellation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");

    if (payment === "cancelled") {
      toast({
        title: "Payment Cancelled",
        description: "You can unlock your results anytime from your dashboard.",
      });
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [toast]);

  if (assessmentsLoading || purchasesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Filter purchases with completed results
  const purchasesWithCompletedResults = (purchasesWithResults || []).filter(
    (purchase: any) => purchase.completedCount > 0
  );

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

          {/* Completed Purchases (Batches) */}
          {purchasesWithCompletedResults.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">Your Results</h2>
              <div className="space-y-6">
                {purchasesWithCompletedResults.map((purchase: any, index: number) => (
                  <Card key={purchase.id} className="p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {purchase.allItemsCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-blue-500" />
                          )}
                          <h3 className="text-lg font-semibold">
                            Purchase #{purchasesWithCompletedResults.length - index}
                          </h3>
                          {purchase.allItemsCompleted && (
                            <Badge variant="secondary">All Complete</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {purchase.completedCount} of {purchase.totalCount} assessments completed
                          {purchase.completedAt && (
                            <span className="ml-2">• {format(new Date(purchase.completedAt), 'MMM d, yyyy')}</span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(purchase.results || [])
                            .filter((r: any) => r.status === 'completed')
                            .map((result: any) => (
                              <Badge key={result.id} variant="outline">
                                {formatAssessmentName(result.assessmentType)}
                              </Badge>
                            ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {purchase.allItemsCompleted && purchase.resultsAccessPaid && (
                          <>
                            <Link href={`/my-results?purchaseId=${purchase.id}`}>
                              <Button className="gap-2 w-full" data-testid={`button-view-results-${purchase.id}`}>
                                <FileText className="h-4 w-4" />
                                View Results
                              </Button>
                            </Link>
                            <Badge variant="secondary" className="text-xs justify-center">
                              ✓ Results Already Paid
                            </Badge>
                          </>
                        )}
                        {purchase.allItemsCompleted && !purchase.resultsAccessPaid && (
                          <>
                            <Link href="/my-results">
                              <Button variant="default" className="gap-2 w-full" data-testid={`button-unlock-results-${purchase.id}`}>
                                <FileText className="h-4 w-4" />
                                Unlock Results
                              </Button>
                            </Link>
                            <Badge variant="outline" className="text-xs justify-center border-orange-500 text-orange-600 dark:text-orange-400">
                              💳 Payment Required
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
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
