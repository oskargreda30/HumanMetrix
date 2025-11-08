import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, CheckCircle2, FileText } from "lucide-react";
import { exportEnhancedCandidatePDF } from "@/lib/enhancedPdfExport";
import { useToast } from "@/hooks/use-toast";
import { formatAssessmentName } from "@/lib/assessmentHelpers";
import { ResultsPaymentGate } from "@/components/ResultsPaymentGate";
import { format } from "date-fns";

export default function MyResults() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Check if user has paid for results access
  const { data: purchases } = useQuery<any[]>({
    queryKey: ["/api/purchases"],
    enabled: isAuthenticated,
  });

  const hasPaidForResults = Array.isArray(purchases) ? purchases.some((p: any) => p.resultsAccessPaid === true) : undefined;

  // Fetch all user results
  const { data: allResults, isLoading } = useQuery<any[]>({
    queryKey: ["/api/results"],
    enabled: isAuthenticated && hasPaidForResults !== false,
  });

  // Show payment gate if user hasn't paid for results access
  if (hasPaidForResults === false) {
    return <ResultsPaymentGate />;
  }

  if (isLoading || !allResults) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completedResults = allResults.filter((r: any) => r.status === 'completed');

  if (completedResults.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow flex items-center justify-center p-4">
          <Card className="p-12 text-center max-w-md">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">No Results Yet</h2>
            <p className="text-muted-foreground mb-6">
              Complete your assessments to view your comprehensive results.
            </p>
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Calculate aggregate statistics
  const totalAssessments = completedResults.length;
  const allScores: number[] = [];
  
  completedResults.forEach((result: any) => {
    if (result.totalScore !== null && result.totalScore !== undefined) {
      allScores.push(result.totalScore);
    }
  });

  const averageScore = allScores.length > 0 
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) 
    : null;

  const handleDownloadPDF = async () => {
    if (!user || !completedResults) {
      toast({
        title: "Error",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we prepare your comprehensive report...",
      });

      // Prepare candidate data
      const candidateData = {
        user: {
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          email: user.email,
        },
        results: completedResults,
      };

      // Prepare skill data from all completed assessments
      const skillData: any[] = [];
      completedResults.forEach((r: any) => {
        const scores = r.scores || {};
        Object.entries(scores).forEach(([skillName, score]) => {
          skillData.push({
            name: skillName,
            score: score as number,
            assessment: formatAssessmentName(r.assessmentType),
          });
        });
      });

      // Platform averages (simplified)
      const platformAverages = {
        totalCandidates: 1,
        avgScoreAcrossCandidates: 0,
        skillAverages: {},
      };

      await exportEnhancedCandidatePDF(
        candidateData,
        skillData,
        platformAverages,
        undefined,
        undefined
      );

      toast({
        title: "Success",
        description: "Your comprehensive report has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/dashboard">
              <Button variant="ghost" className="mb-4" data-testid="button-back-to-dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">My Assessment Results</h1>
                <p className="text-muted-foreground">
                  Comprehensive report for {user?.firstName} {user?.lastName}
                </p>
              </div>
              <Button 
                onClick={handleDownloadPDF}
                size="lg"
                className="gap-2"
                data-testid="button-download-comprehensive-pdf"
              >
                <Download className="h-4 w-4" />
                Download Full Report
              </Button>
            </div>
          </div>

          {/* Summary Card */}
          <Card className="p-8 mb-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">{totalAssessments}</div>
                <div className="text-sm text-muted-foreground">Assessments Completed</div>
              </div>
              {averageScore && (
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">{averageScore}/100</div>
                  <div className="text-sm text-muted-foreground">Average Score</div>
                </div>
              )}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <div className="text-sm text-muted-foreground">All Complete</div>
              </div>
            </div>
          </Card>

          {/* Individual Assessment Results */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Assessment Breakdown</h2>
            
            <div className="grid gap-6">
              {completedResults.map((result: any) => {
                const hasScore = result.totalScore !== null && result.totalScore !== undefined;
                
                return (
                  <Card key={result.id} className="p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">
                            {formatAssessmentName(result.assessmentType)}
                          </h3>
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Complete
                          </Badge>
                        </div>
                        {result.completedAt && (
                          <p className="text-sm text-muted-foreground">
                            Completed on {format(new Date(result.completedAt), 'MMMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {hasScore && (
                          <div className="text-center">
                            <div className="text-3xl font-bold text-primary">
                              {result.totalScore}
                            </div>
                            <div className="text-xs text-muted-foreground">/ 100</div>
                          </div>
                        )}
                        <Link href={`/results/${result.id}`}>
                          <Button variant="outline" data-testid={`button-view-details-${result.id}`}>
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Show top skills if available */}
                    {result.scores && Object.keys(result.scores).length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-3">Top Skills:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(result.scores)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .slice(0, 5)
                            .map(([skill, score]) => (
                              <Badge key={skill} variant="secondary">
                                {skill}: {score as number}/100
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
