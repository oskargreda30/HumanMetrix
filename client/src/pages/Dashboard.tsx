import { Link, useLocation, Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TermsConsentModal } from "@/components/TermsConsentModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, CheckCircle2, Clock, FileText, Brain, Sparkles, Code, Scale, Timer, Key, X } from "lucide-react";
import { format } from "date-fns";
import { formatAssessmentName } from "@/lib/assessmentHelpers";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import dashboardBg from "@assets/image_1763608498774.png";

// Assessment metadata
const getAssessmentMetadata = (type: string) => {
  const metadata: Record<string, { icon: any; description: string; questions: number; minutes: number; iconBg: string }> = {
    'fit': {
      icon: Brain,
      description: 'Assess behavioral and workplace skills',
      questions: 15,
      minutes: 20,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'ai_readiness': {
      icon: Sparkles,
      description: 'Evaluate AI integration readiness',
      questions: 21,
      minutes: 20,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'ai-readiness': {
      icon: Sparkles,
      description: 'Evaluate AI integration readiness',
      questions: 21,
      minutes: 20,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'prompt_architecture': {
      icon: Code,
      description: 'Test AI prompt engineering skills',
      questions: 7,
      minutes: 14,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'prompt-architecture': {
      icon: Code,
      description: 'Test AI prompt engineering skills',
      questions: 7,
      minutes: 14,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'prompt': {
      icon: Code,
      description: 'Test AI prompt engineering skills',
      questions: 7,
      minutes: 14,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    'aiq': {
      icon: Scale,
      description: 'Assess ethical AI decision-making',
      questions: 8,
      minutes: 20,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    }
  };
  return metadata[type] || metadata['fit'];
};

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Redirect based on role
  if (!authLoading && user) {
    // Super admins always go to admin dashboard (Platform Admin Hub)
    if (user.role === 'super_admin') {
      return <Redirect to="/admin/dashboard" />;
    }
    
    // Partner admins go directly to Partner Dashboard
    if (user.role === 'partner_admin') {
      return <Redirect to="/partner" />;
    }
    
    // Organization admins go to Admin Dashboard
    if (user.role === 'organization_admin') {
      return <Redirect to="/admin/dashboard" />;
    }
  }
  
  // Terms consent modal - show for candidates who haven't accepted terms
  const showTermsModal = user?.role === 'candidate' && user?.termsAccepted !== true;
  const [hasAcceptedInSession, setHasAcceptedInSession] = useState(false);
  
  // Change password state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      setPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });
  
  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };
  
  // Remove assessment state and mutation
  const [assessmentToRemove, setAssessmentToRemove] = useState<{ id: string; name: string } | null>(null);
  
  const removeAssessmentMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("DELETE", `/api/purchase-items/${itemId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Assessment Removed",
        description: "The assessment has been removed from your dashboard.",
      });
      setAssessmentToRemove(null);
      queryClient.invalidateQueries({ queryKey: ["/api/available-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases-with-results"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove assessment",
        variant: "destructive",
      });
      setAssessmentToRemove(null);
    },
  });

  const { data: availableData, isLoading: assessmentsLoading, refetch: refetchAssessments } = useQuery<{assessments: any[], requiredAssessmentTypes: string[]}>({
    queryKey: ["/api/available-assessments"],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale
  });

  const { data: purchasesWithResults, isLoading: purchasesLoading, refetch: refetchPurchases } = useQuery<any[]>({
    queryKey: ["/api/purchases-with-results"],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale
  });
  
  // Force refetch when returning from Purchase page with refresh flag
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refresh = params.get("refresh");
    
    if (refresh) {
      // Force refetch of data
      refetchAssessments();
      refetchPurchases();
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [refetchAssessments, refetchPurchases]);

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
      {/* Terms consent modal for first-time candidates */}
      <TermsConsentModal
        open={showTermsModal && !hasAcceptedInSession}
        onAccept={() => {
          setHasAcceptedInSession(true);
        }}
      />
      
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
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-white">My Dashboard</h1>
              <p className="text-white/80">
                Welcome back, {user?.firstName || 'there'}!
              </p>
            </div>
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 text-white border-white/50 hover:bg-white/10" data-testid="button-change-password">
                  <Key className="h-4 w-4" />
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Enter your current password and choose a new one.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      data-testid="input-current-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      data-testid="input-new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      data-testid="input-confirm-password"
                    />
                  </div>
                  <Button 
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                    className="w-full"
                    data-testid="button-submit-password-change"
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      "Change Password"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Available Assessments */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-white">Available Assessments</h2>
            {availableAssessments && availableAssessments.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableAssessments.map((assessment: any) => {
                  const metadata = getAssessmentMetadata(assessment.assessmentType);
                  const AssessmentIcon = metadata.icon;
                  const isInProgress = assessment.status === 'in_progress';
                  const isPendingEvaluation = assessment.status === 'pending_evaluation';
                  // Can only remove if: canRemove flag is true AND not in progress/processing
                  const canRemove = assessment.canRemove && !isInProgress && !isPendingEvaluation;
                  
                  // Determine badge style and text
                  let badgeClass = 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
                  let badgeText = 'Ready';
                  if (isPendingEvaluation) {
                    badgeClass = 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
                    badgeText = 'Processing Results...';
                  } else if (isInProgress) {
                    badgeClass = 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
                    badgeText = 'In Progress';
                  }
                  
                  return (
                    <Card 
                      key={assessment.purchaseItemId} 
                      className="hover-elevate active-elevate-2 transition-all border-2 relative group"
                    >
                      <div className="p-4">
                        {/* Remove assessment button - subtle icon inside card, only show if canRemove and not in progress/processing */}
                        {canRemove && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setAssessmentToRemove({
                                id: assessment.purchaseItemId,
                                name: formatAssessmentName(assessment.assessmentType)
                              });
                            }}
                            className="absolute top-2 right-2 p-1 rounded text-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                            data-testid={`button-remove-${assessment.assessmentType}`}
                            aria-label={`Remove ${formatAssessmentName(assessment.assessmentType)} assessment`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <div className="flex items-start gap-3 mb-4">
                          <div className={`p-2.5 rounded-xl ${metadata.iconBg} text-white shadow-lg flex-shrink-0`}>
                            <AssessmentIcon className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-1 flex-wrap">
                              <Badge 
                                variant="secondary" 
                                className={`flex-shrink-0 text-xs ${badgeClass}`}
                              >
                                {isPendingEvaluation && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                {badgeText}
                              </Badge>
                              <h3 className="text-lg font-bold leading-tight">{formatAssessmentName(assessment.assessmentType)}</h3>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{metadata.description}</p>
                        <div className="flex items-center gap-4 mb-4 pb-4 border-b">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 rounded-md bg-muted">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{metadata.questions}</div>
                              <div className="text-xs text-muted-foreground">questions</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 rounded-md bg-muted">
                              <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{metadata.minutes}</div>
                              <div className="text-xs text-muted-foreground">minutes</div>
                            </div>
                          </div>
                        </div>
                        <Link href={`/assessment/${assessment.purchaseItemId}`}>
                          <Button className="w-full" data-testid={`button-start-${assessment.assessmentType}`}>
                            {isInProgress ? 'Continue Assessment' : 'Start Assessment'}
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
                  <Button data-testid="button-browse-assessments">Browse More Assessments</Button>
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
      
      {/* Remove Assessment Confirmation Dialog */}
      <AlertDialog open={!!assessmentToRemove} onOpenChange={(open) => !open && setAssessmentToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {assessmentToRemove?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => assessmentToRemove && removeAssessmentMutation.mutate(assessmentToRemove.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove"
            >
              {removeAssessmentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Yes, Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
