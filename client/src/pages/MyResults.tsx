import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, CheckCircle2, FileText, TrendingUp, Brain, Shield, Zap } from "lucide-react";
import { exportEnhancedCandidatePDF, captureRadarChart } from "@/lib/enhancedPdfExport";
import { useToast } from "@/hooks/use-toast";
import { formatAssessmentName } from "@/lib/assessmentHelpers";
import { ResultsPaymentGate } from "@/components/ResultsPaymentGate";
import { ResultsRetentionConsentDialog } from "@/components/ResultsRetentionConsentDialog";
import { format } from "date-fns";
import { transformToRadarData, isSkillBasedAssessment, formatAssessmentType, getSkillAcronym, FIT_SKILLS, AI_READINESS_SKILLS } from "@/lib/assessmentSkills";
import { getAIQBandInterpretation } from "@/data/aiq-questions";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import dashboardBg from "@assets/image_1763608498774.png";

export default function MyResults() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [consentHandled, setConsentHandled] = useState(false);

  // Check if viewing a specific purchase batch
  const urlParams = new URLSearchParams(window.location.search);
  const purchaseId = urlParams.get('purchaseId');

  // Fetch purchase batches with results
  const { data: purchaseBatches, isLoading: batchesLoading } = useQuery<any[]>({
    queryKey: ["/api/purchases-with-results"],
    enabled: isAuthenticated,
  });

  // Find the specific purchase batch if purchaseId is provided
  // Convert p.id to string for comparison since URL params are always strings
  const selectedBatch = purchaseId 
    ? purchaseBatches?.find((p: any) => String(p.id) === purchaseId)
    : null;

  // Check if user has paid for results access
  const { data: purchases, isLoading: purchasesLoading } = useQuery<any[]>({
    queryKey: ["/api/purchases"],
    enabled: isAuthenticated,
  });

  // User has paid if there are NO unpaid purchases (prevents showing unpaid results from new purchases)
  // IMPORTANT: Default to false (requiring payment) if purchases hasn't loaded yet - prevents payment bypass
  const hasPaidForResults = Array.isArray(purchases) && purchases.length > 0
    ? !purchases.some((p: any) => p.resultsAccessPaid === false)
    : false; // Default to requiring payment when data not loaded

  // Fetch all user results - ALWAYS fetch to check completion status
  const { data: allResults, isLoading: resultsLoading } = useQuery<any[]>({
    queryKey: ["/api/results"],
    enabled: isAuthenticated,
  });

  // Fetch required assessment types
  const { data: availableData, isLoading: assessmentsLoading } = useQuery<{assessments: any[], requiredAssessmentTypes: string[]}>({
    queryKey: ["/api/available-assessments"],
    enabled: isAuthenticated,
  });

  const requiredAssessmentTypes = availableData?.requiredAssessmentTypes || [];

  // Find Prompt Architecture result for later fetching
  const promptArchResult = allResults?.find((r: any) => r.assessmentType === 'prompt_architecture');

  // Pre-calculate values needed for useEffect (must be before any conditional returns)
  const completedResultsForEffect = allResults?.filter((r: any) => r.status === 'completed') || [];
  const uniqueTypesForEffect = new Set(completedResultsForEffect.map((r: any) => r.assessmentType));
  const allAssessmentsCompletedForEffect = selectedBatch 
    ? selectedBatch?.allItemsCompleted
    : (requiredAssessmentTypes.length > 0 && requiredAssessmentTypes.every(type => uniqueTypesForEffect.has(type)));
  const needsPaymentForEffect = selectedBatch 
    ? !selectedBatch?.resultsAccessPaid 
    : !hasPaidForResults;
  const needsConsentResponseForEffect = user?.resultsRetentionConsent === undefined || user?.resultsRetentionConsent === null;

  // useEffect must be called BEFORE any conditional returns (React Rules of Hooks)
  useEffect(() => {
    if (needsConsentResponseForEffect && !consentHandled && !needsPaymentForEffect && allAssessmentsCompletedForEffect) {
      setShowConsentDialog(true);
    }
  }, [needsConsentResponseForEffect, consentHandled, needsPaymentForEffect, allAssessmentsCompletedForEffect]);

  if (resultsLoading || assessmentsLoading || batchesLoading || purchasesLoading || !allResults) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Handle invalid purchaseId - redirect to dashboard
  if (purchaseId && !selectedBatch) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow flex items-center justify-center p-4">
          <Card className="p-12 text-center max-w-md">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Purchase Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The requested purchase batch could not be found or you don't have access to it.
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

  // Filter results by purchase batch if specified
  let completedResults = allResults.filter((r: any) => r.status === 'completed');
  
  if (selectedBatch) {
    // Get result IDs from this batch (defensive: handle missing results array)
    const batchResultIds = (selectedBatch.results || []).map((r: any) => r.id);
    completedResults = completedResults.filter((r: any) => batchResultIds.includes(r.id));
  }
  
  // Check if all REQUIRED assessment types are completed
  // When viewing a specific batch, only check if THAT batch is complete
  const uniqueAssessmentTypes = new Set(completedResults.map((r: any) => r.assessmentType));
  const allAssessmentsCompleted = selectedBatch 
    ? selectedBatch.allItemsCompleted  // For batch view, use batch completion status
    : (requiredAssessmentTypes.length > 0 && requiredAssessmentTypes.every(type => uniqueAssessmentTypes.has(type)));

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
                : `You've completed ${uniqueAssessmentTypes.size} of ${requiredAssessmentTypes.length} required assessments. Complete all assessments to view your results.`
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
  // For batch view, check if THAT batch is paid
  // For global view, require payment if ANY purchase is unpaid (all-or-nothing approach)
  const needsPayment = selectedBatch 
    ? !selectedBatch.resultsAccessPaid 
    : !hasPaidForResults; // Show payment gate if not all purchases are paid
    
  if (needsPayment) {
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

      // Fetch full candidate data (same format as admin uses)
      const candidateRes = await fetch('/api/my-candidate-data', {
        credentials: 'include',
      });
      if (!candidateRes.ok) {
        throw new Error('Failed to fetch candidate data');
      }
      const candidate = await candidateRes.json();

      // Fetch platform averages from API (same as admin dashboard)
      const averagesRes = await fetch('/api/admin/platform-averages', {
        credentials: 'include',
      });
      const platformAverages = averagesRes.ok ? await averagesRes.json() : {
        totalCandidates: 1,
        avgScoreAcrossCandidates: 0,
        skillAverages: {},
      };

      // Fetch Prompt Architecture evaluations if needed (from the selected batch only)
      let promptArchData: any[] = [];
      // Find Prompt Architecture result from THIS batch only
      const batchPromptArchResult = completedResults.find((r: any) => r.assessmentType === 'prompt_architecture');
      if (batchPromptArchResult?.id) {
        try {
          const res = await fetch(`/api/prompt-evaluations/${batchPromptArchResult.id}`, {
            credentials: 'include',
          });
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
      
      const radarChartImages: any = {};
      if (fitChart) radarChartImages.fit = fitChart;
      if (aiReadinessChart) radarChartImages.aiReadiness = aiReadinessChart;

      // CRITICAL FIX: Filter candidate results to only include results from the selected batch
      // completedResults is already filtered by batch on lines 103-108
      const batchResultIds = new Set(completedResults.map((r: any) => r.id));
      
      // Filter candidate.results to only include results from this batch
      const filteredCandidate = {
        ...candidate,
        results: candidate.results?.filter((r: any) => batchResultIds.has(r.id)) || []
      };

      // Prepare skill data using proper transformation (matching admin logic)
      // Now using filtered results from the selected batch only
      const completedResultsForPDF = filteredCandidate.results?.filter(
        (r: any) => r.status === 'completed' && isSkillBasedAssessment(r.assessmentType) && r.scores
      );
      
      const allSkills: Array<{name: string, score: number, assessment: string}> = [];
      completedResultsForPDF?.forEach((result: any) => {
        const radarData = transformToRadarData(result.scores, result.assessmentType);
        radarData.forEach((skill: any) => {
          allSkills.push({
            name: skill.skill,
            score: skill.score,
            assessment: formatAssessmentType(result.assessmentType)
          });
        });
      });

      await exportEnhancedCandidatePDF(
        filteredCandidate,
        allSkills,
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
    <div className="min-h-screen flex flex-col relative">
      {/* Background image with dark overlay */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url(${dashboardBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(13, 29, 51, 0.85), rgba(13, 29, 51, 0.75), rgba(13, 29, 51, 0.85))'
        }} />
      </div>
      <Navigation />
      <main className="flex-grow py-16 relative z-10">
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/dashboard">
              <Button variant="ghost" className="mb-4 text-white hover:text-white hover:bg-white/10" data-testid="button-back-to-dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-white">
                  {selectedBatch ? 'Purchase Batch Results' : 'My Assessment Results'}
                </h1>
                <p className="text-white/80">
                  {selectedBatch ? (
                    <>
                      Viewing results from purchase on {format(new Date(selectedBatch.createdAt), 'MMM d, yyyy')}
                      {' • '}
                      {selectedBatch.completedCount} of {selectedBatch.totalCount} assessments completed
                    </>
                  ) : (
                    <>Comprehensive report for {user?.firstName} {user?.lastName}</>
                  )}
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
            <div className="grid md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">{uniqueAssessmentTypes.size}</div>
                <div className="text-sm text-muted-foreground">Assessments Completed</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <div className="text-sm text-muted-foreground">All Complete</div>
              </div>
            </div>
          </Card>

          {/* FIT Assessment Results */}
          {(() => {
            const fitResult = completedResults.find((r: any) => r.assessmentType === 'fit');
            if (!fitResult?.scores) return null;

            const sortedScores = Object.entries(fitResult.scores)
              .sort(([, a], [, b]) => (b as number) - (a as number));

            return (
              <Card className="p-6 mb-6" data-testid="card-fit-results">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">FIT Assessment</h2>
                    <p className="text-sm text-muted-foreground">Behavioural skills evaluation</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Radar Chart */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={sortedScores.map(([skill, score]) => ({
                        skill: getSkillAcronym(skill),
                        score: score as number,
                        fullMark: 100
                      }))}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="skill" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name="Score"
                          dataKey="score"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.4}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Skill Scores Table */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground mb-3">Individual Skill Scores</div>
                    {sortedScores.map(([skill, score], index) => (
                      <div key={skill} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0" data-testid={`row-fit-skill-${index}`}>
                        <span className="text-sm">{skill}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{score as number}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* AI Readiness Results */}
          {(() => {
            const aiResult = completedResults.find((r: any) => r.assessmentType === 'ai_readiness');
            if (!aiResult?.scores) return null;

            const sortedScores = Object.entries(aiResult.scores)
              .sort(([, a], [, b]) => (b as number) - (a as number));

            return (
              <Card className="p-6 mb-6" data-testid="card-ai-readiness-results">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Brain className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">AI Readiness Assessment</h2>
                    <p className="text-sm text-muted-foreground">Technical AI skills evaluation</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Radar Chart */}
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={sortedScores.map(([skill, score]) => ({
                        skill: getSkillAcronym(skill),
                        score: score as number,
                        fullMark: 100
                      }))}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="skill" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name="Score"
                          dataKey="score"
                          stroke="#8b5cf6"
                          fill="#8b5cf6"
                          fillOpacity={0.4}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Skill Scores Table */}
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground mb-3">Individual Skill Scores</div>
                    {sortedScores.map(([skill, score], index) => (
                      <div key={skill} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0" data-testid={`row-ai-skill-${index}`}>
                        <span className="text-sm truncate mr-2">{skill}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 rounded-full transition-all"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{score as number}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* AIQ Results */}
          {(() => {
            const aiqResult = completedResults.find((r: any) => r.assessmentType === 'aiq');
            if (!aiqResult?.scores) return null;

            const aiqScore = aiqResult.scores['Algorithmic Integrity'] || aiqResult.totalScore || 0;
            const bandInfo = getAIQBandInterpretation(aiqScore);

            return (
              <Card className="p-6 mb-6" data-testid="card-aiq-results">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Shield className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Algorithmic Integrity Quotient (AIQ)</h2>
                    <p className="text-sm text-muted-foreground">AI ethics and responsible AI evaluation</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Score Display */}
                  <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg">
                    <div className="text-5xl font-bold text-green-500 mb-2" data-testid="text-aiq-score">{aiqScore}</div>
                    <div className="text-lg font-medium mb-1">{bandInfo.title}</div>
                    <div className="text-sm text-muted-foreground text-center">out of 100</div>
                  </div>

                  {/* Band Interpretation */}
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Score Interpretation</div>
                      <p className="text-sm leading-relaxed">{bandInfo.description}</p>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Band Range ({bandInfo.range})</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${aiqScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{aiqScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* Prompt Architecture Results */}
          {(() => {
            const promptResult = completedResults.find((r: any) => r.assessmentType === 'prompt_architecture');
            if (!promptResult) return null;

            const totalScore = promptResult.totalScore || 0;
            const percentile = promptResult.percentile || 0;

            return (
              <Card className="p-6 mb-6" data-testid="card-prompt-arch-results">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Zap className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Prompt Architecture Assessment</h2>
                    <p className="text-sm text-muted-foreground">AI prompt engineering evaluation</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {/* Total Score */}
                  <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-4xl font-bold text-amber-500 mb-1" data-testid="text-prompt-score">{totalScore}</div>
                    <div className="text-sm text-muted-foreground">Total Score</div>
                  </div>

                  {/* Percentile */}
                  <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-4xl font-bold text-amber-500 mb-1" data-testid="text-prompt-percentile">{percentile}%</div>
                    <div className="text-sm text-muted-foreground">Percentile</div>
                  </div>

                  {/* Status */}
                  <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg">
                    <Badge 
                      variant={totalScore >= 70 ? "default" : totalScore >= 50 ? "secondary" : "outline"}
                      className="mb-2"
                    >
                      {totalScore >= 70 ? "Excellent" : totalScore >= 50 ? "Competent" : "Developing"}
                    </Badge>
                    <div className="text-sm text-muted-foreground">Performance</div>
                  </div>
                </div>
              </Card>
            );
          })()}
        </div>
      </main>
      
      {/* Hidden radar charts for PDF export */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '400px', height: '400px' }}>
        {/* FIT Assessment Radar */}
        {(() => {
          const fitResult = completedResults.find((r: any) => r.assessmentType === 'fit');
          if (!fitResult || !fitResult.scores) return null;
          
          const fitData = Object.entries(fitResult.scores).map(([skill, score]) => ({
            skill: getSkillAcronym(skill),
            score: score as number,
          }));
          
          return (
            <div id="fit-radar-chart-pdf" style={{ width: '400px', height: '400px', background: 'white' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={fitData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: '#000', fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
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
            skill: getSkillAcronym(skill),
            score: score as number,
          }));
          
          return (
            <div id="ai-readiness-radar-chart-pdf" style={{ width: '400px', height: '400px', background: 'white' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={aiData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: '#000', fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
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
      <div className="relative z-10">
        <Footer />
      </div>
      
      <ResultsRetentionConsentDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        onComplete={() => {
          setConsentHandled(true);
        }}
      />
    </div>
  );
}
