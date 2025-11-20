import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Clock, FileText, Brain, Sparkles, Code, Scale, Timer } from "lucide-react";
import { format } from "date-fns";
import { formatAssessmentName } from "@/lib/assessmentHelpers";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import dashboardBg from "@assets/image_1763608498774.png";

// Assessment metadata
const getAssessmentMetadata = (type: string) => {
  const metadata: Record<string, { icon: any; description: string; questions: number; minutes: number; iconBg: string }> = {
    'fit': {
      icon: Brain,
      description: 'Measure behavioral competencies and workplace skills',
      questions: 30,
      minutes: 20,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'ai_readiness': {
      icon: Sparkles,
      description: 'Evaluate your preparedness for AI integration',
      questions: 20,
      minutes: 15,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'ai-readiness': {
      icon: Sparkles,
      description: 'Evaluate your preparedness for AI integration',
      questions: 20,
      minutes: 15,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'prompt_architecture': {
      icon: Code,
      description: 'Test your AI prompt engineering abilities',
      questions: 5,
      minutes: 14,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'prompt-architecture': {
      icon: Code,
      description: 'Test your AI prompt engineering abilities',
      questions: 5,
      minutes: 14,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'prompt': {
      icon: Code,
      description: 'Test your AI prompt engineering abilities',
      questions: 5,
      minutes: 14,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'aiq': {
      icon: Scale,
      description: 'Assess ethical AI decision-making skills',
      questions: 8,
      minutes: 20,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    }
  };
  return metadata[type] || metadata['fit'];
};

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
    <div className="min-h-screen flex flex-col relative">
      {/* Background image */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${dashboardBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      <Navigation />
      <main className="flex-grow py-16 relative z-10">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-white">My Dashboard</h1>
            <p className="text-white/80">
              Welcome back, {user?.firstName || 'there'}!
            </p>
          </div>

          {/* Available Assessments */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-white">Available Assessments</h2>
            {availableAssessments && availableAssessments.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableAssessments.map((assessment: any) => {
                  const metadata = getAssessmentMetadata(assessment.assessmentType);
                  const AssessmentIcon = metadata.icon;
                  return (
                    <Card 
                      key={assessment.purchaseItemId} 
                      className="overflow-hidden hover-elevate active-elevate-2 transition-all border-2"
                    >
                      <div className="p-6">
                        <div className="flex items-start gap-4 mb-6">
                          <div className={`p-3 rounded-xl ${metadata.iconBg} text-white shadow-lg flex-shrink-0`}>
                            <AssessmentIcon className="h-7 w-7" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="text-xl font-bold leading-tight">{formatAssessmentName(assessment.assessmentType)}</h3>
                              <Badge variant="secondary" className="flex-shrink-0 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                Ready
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{metadata.description}</p>
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 rounded-md bg-muted">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-semibold">{metadata.questions}</div>
                              <div className="text-xs text-muted-foreground">questions</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 rounded-md bg-muted">
                              <Timer className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-semibold">{metadata.minutes}</div>
                              <div className="text-xs text-muted-foreground">minutes</div>
                            </div>
                          </div>
                        </div>
                        <Link href={`/assessment/${assessment.purchaseItemId}`}>
                          <Button className="w-full" size="lg" data-testid={`button-start-${assessment.assessmentType}`}>
                            Start Assessment
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No assessments available. Get started with a testing series.
                </p>
                <Link href="/assessments">
                  <Button data-testid="button-browse-assessments">Browse Assessments</Button>
                </Link>
              </Card>
            )}
          </section>

          {/* Completed Testing Series (Batches) */}
          {purchasesWithCompletedResults.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-white">Your Results</h2>
              <div className="space-y-6">
                {purchasesWithCompletedResults.map((purchase: any, index: number) => {
                  const progressPercentage = Math.round((purchase.completedCount / purchase.totalCount) * 100);
                  return (
                    <Card key={purchase.id} className="p-6 hover-elevate transition-all">
                      <div className="flex flex-col md:flex-row items-start gap-6">
                        {/* Progress Circle */}
                        <div className="flex-shrink-0">
                          <div 
                            className="relative w-20 h-20" 
                            role="img" 
                            aria-label={`${purchase.completedCount} of ${purchase.totalCount} assessments completed, ${progressPercentage}% complete${purchase.allItemsCompleted ? ', all assessments finished' : ''}`}
                          >
                            <svg className="w-20 h-20 transform -rotate-90" aria-hidden="true">
                              <circle
                                cx="40"
                                cy="40"
                                r="36"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="none"
                                className="text-muted/20"
                              />
                              <circle
                                cx="40"
                                cy="40"
                                r="36"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 36}`}
                                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progressPercentage / 100)}`}
                                className={purchase.allItemsCompleted ? "text-green-500" : "text-blue-500"}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                              <span className="text-lg font-bold">{progressPercentage}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-2">
                            {purchase.allItemsCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <Clock className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-semibold">
                                  Testing Series #{purchasesWithCompletedResults.length - index}
                                </h3>
                                {purchase.allItemsCompleted && (
                                  <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                    All Complete
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">
                            <span className="font-medium">{purchase.completedCount} of {purchase.totalCount}</span> assessments completed
                            {purchase.completedAt && (
                              <span className="ml-2">• {format(new Date(purchase.completedAt), 'MMM d, yyyy')}</span>
                            )}
                          </p>

                          {/* Completed Assessments with Icons */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {(purchase.results || [])
                              .filter((r: any) => r.status === 'completed')
                              .map((result: any) => {
                                const metadata = getAssessmentMetadata(result.assessmentType);
                                const ResultIcon = metadata.icon;
                                return (
                                  <Badge key={result.id} variant="outline" className="gap-1.5 py-1">
                                    <ResultIcon className="h-3 w-3" />
                                    {formatAssessmentName(result.assessmentType)}
                                  </Badge>
                                );
                              })}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 md:w-48">
                          {purchase.allItemsCompleted && purchase.resultsAccessPaid && (
                            <>
                              <Link href={`/my-results?purchaseId=${purchase.id}`}>
                                <Button className="gap-2 w-full" data-testid={`button-view-results-${purchase.id}`}>
                                  <FileText className="h-4 w-4" />
                                  View Results
                                </Button>
                              </Link>
                              <div className="text-center">
                                <Badge variant="secondary" className="text-xs">
                                  ✓ Unlocked
                                </Badge>
                              </div>
                            </>
                          )}
                          {purchase.allItemsCompleted && !purchase.resultsAccessPaid && (
                            <>
                              <Link href={`/my-results?purchaseId=${purchase.id}`}>
                                <Button variant="default" className="gap-2 w-full" data-testid={`button-unlock-results-${purchase.id}`}>
                                  <FileText className="h-4 w-4" />
                                  Unlock Results
                                </Button>
                              </Link>
                              <div className="text-center">
                                <Badge variant="outline" className="text-xs border-orange-500 text-orange-600 dark:text-orange-400">
                                  Payment Required
                                </Badge>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
