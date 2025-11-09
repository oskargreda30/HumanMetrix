import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, CheckCircle2, FileText } from "lucide-react";
import { exportEnhancedCandidatePDF, captureRadarChart } from "@/lib/enhancedPdfExport";
import { useToast } from "@/hooks/use-toast";
import { formatAssessmentName } from "@/lib/assessmentHelpers";
import { ResultsPaymentGate } from "@/components/ResultsPaymentGate";
import { format } from "date-fns";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

export default function MyResults() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Check if user has paid for results access
  const { data: purchases } = useQuery<any[]>({
    queryKey: ["/api/purchases"],
    enabled: isAuthenticated,
  });

  const hasPaidForResults = Array.isArray(purchases) ? purchases.some((p: any) => p.resultsAccessPaid === true) : undefined;

  // Fetch all user results - ALWAYS fetch to check completion status
  const { data: allResults, isLoading } = useQuery<any[]>({
    queryKey: ["/api/results"],
    enabled: isAuthenticated,
  });

  // Find Prompt Architecture result for later fetching
  const promptArchResult = allResults?.find((r: any) => r.assessmentType === 'prompt_architecture');

  if (isLoading || !allResults) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completedResults = allResults.filter((r: any) => r.status === 'completed');
  const allAssessmentsCompleted = completedResults.length === 4;

  // FIRST: Check if all assessments are completed (before showing payment gate)
  if (!allAssessmentsCompleted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow flex items-center justify-center p-4">
          <Card className="p-12 text-center max-w-md">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">
              {completedResults.length === 0 ? 'No Results Yet' : 'Assessments In Progress'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {completedResults.length === 0 
                ? 'Complete your assessments to view your comprehensive results.' 
                : `You've completed ${completedResults.length} of 4 assessments. Complete all assessments to view your results.`
              }
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

  // SECOND: Show payment gate if user hasn't paid for results access
  if (hasPaidForResults === false) {
    return <ResultsPaymentGate />;
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

      // Fetch Prompt Architecture evaluations if needed
      let promptArchData: any[] = [];
      if (promptArchResult?.id) {
        try {
          const res = await fetch(`/api/prompt-evaluations/${promptArchResult.id}`);
          if (res.ok) {
            promptArchData = await res.json();
          }
        } catch (error) {
          console.error('Error fetching prompt evaluations:', error);
        }
      }

      // Wait for charts to render with retry mechanism
      const waitForElement = async (id: string, maxRetries = 10): Promise<boolean> => {
        for (let i = 0; i < maxRetries; i++) {
          const element = document.getElementById(id);
          if (element && element.querySelector('svg')) {
            return true;
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        return false;
      };

      // Wait for both charts to be ready
      const fitReady = await waitForElement('fit-radar-chart-pdf');
      const aiReady = await waitForElement('ai-readiness-radar-chart-pdf');
      
      console.log('FIT chart ready:', fitReady);
      console.log('AI chart ready:', aiReady);

      // Capture radar charts with retry
      let fitChart = null;
      let aiReadinessChart = null;
      
      if (fitReady) {
        for (let i = 0; i < 3; i++) {
          fitChart = await captureRadarChart('fit-radar-chart-pdf');
          if (fitChart) break;
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      if (aiReady) {
        for (let i = 0; i < 3; i++) {
          aiReadinessChart = await captureRadarChart('ai-readiness-radar-chart-pdf');
          if (aiReadinessChart) break;
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      console.log('Captured FIT chart:', !!fitChart);
      console.log('Captured AI chart:', !!aiReadinessChart);
      console.log('Prompt arch data length:', promptArchData.length);
      
      const radarChartImages: any = {};
      if (fitChart) radarChartImages.fit = fitChart;
      if (aiReadinessChart) radarChartImages.aiReadiness = aiReadinessChart;

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
        radarChartImages,
        undefined,
        promptArchData
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
      
      {/* Hidden radar charts for PDF export */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '400px', height: '400px' }}>
        {/* FIT Assessment Radar */}
        {(() => {
          const fitResult = completedResults.find((r: any) => r.assessmentType === 'fit');
          if (!fitResult || !fitResult.scores) return null;
          
          const fitData = Object.entries(fitResult.scores).map(([skill, score]) => ({
            skill: skill.length > 20 ? skill.substring(0, 18) + '...' : skill,
            score: score as number,
          }));
          
          return (
            <div id="fit-radar-chart-pdf" style={{ width: '400px', height: '400px', background: 'white' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={fitData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: '#000', fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#666' }} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          );
        })()}
        
        {/* AI Readiness Radar */}
        {(() => {
          const aiResult = completedResults.find((r: any) => r.assessmentType === 'ai_readiness');
          if (!aiResult || !aiResult.scores) return null;
          
          const aiData = Object.entries(aiResult.scores).map(([skill, score]) => ({
            skill: skill.length > 20 ? skill.substring(0, 18) + '...' : skill,
            score: score as number,
          }));
          
          return (
            <div id="ai-readiness-radar-chart-pdf" style={{ width: '400px', height: '400px', background: 'white' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={aiData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: '#000', fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#666' }} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
