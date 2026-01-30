import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, FileText, StickyNote, TrendingUp, TrendingDown, AlertTriangle, Download, UserCheck, UserX, HelpCircle, Upload, ClipboardList, Building2, BarChart3, Users, Target, ChevronDown, ChevronUp, Trash2, Eye, User } from "lucide-react";
import { PdfImportModal } from "@/components/PdfImportModal";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkillRadarChart } from "@/components/admin/SkillRadarChart";
import { isSkillBasedAssessment, transformToRadarData, getTopSkills, getGrowthAreas, formatAssessmentType, calculateAverageScore } from "@/lib/assessmentSkills";
import { exportEnhancedCandidatePDF, captureRadarChart } from "@/lib/enhancedPdfExport";
import { getAIQBandInterpretation } from "@/data/aiq-questions";

interface SavedReport {
  id: string;
  reportType: 'role_fit_single' | 'role_fit_multi' | 'comparison' | 'profile_insights' | string;
  title: string;
  candidateIds: string[];
  roleId?: string;
  creditsUsed: number;
  createdAt: string;
  version: number;
  summary: {
    overallFit?: number;
    hasSkillData?: boolean;
    candidateCount: number;
  };
}

export default function PartnerResultsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [showPdfImportModal, setShowPdfImportModal] = useState(false);
  const [showSavedReports, setShowSavedReports] = useState(true);
  const [reportViewerOpen, setReportViewerOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const { toast } = useToast();

  const { data: candidates, isLoading } = useQuery<any[]>({
    queryKey: ['/api/partner/me/candidates'],
  });

  const { data: savedReports, isLoading: reportsLoading } = useQuery<SavedReport[]>({
    queryKey: ['/api/partner/me/analysis-reports'],
  });

  const { data: selectedReportData, isLoading: isLoadingReport } = useQuery<any>({
    queryKey: ['/api/partner/me/analysis-reports', selectedReportId],
    queryFn: async () => {
      const response = await fetch(`/api/partner/me/analysis-reports/${selectedReportId}`);
      if (!response.ok) throw new Error('Failed to fetch report');
      return response.json();
    },
    enabled: !!selectedReportId && reportViewerOpen,
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      return apiRequest('DELETE', `/api/partner/me/analysis-reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner/me/analysis-reports'] });
      toast({ title: "Report deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete report", variant: "destructive" });
    },
  });

  const { data: roles } = useQuery<any[]>({
    queryKey: ['/api/partner/me/roles'],
  });

  const { data: roleAlignment } = useQuery<{
    overallFit: number;
    skillAlignments: Array<{
      skillName: string;
      candidateScore: number;
      requiredScore: number;
      gap: number;
      alignment: string;
    }>;
    strengths: string[];
    gaps: string[];
    recommendations: string;
  }>({
    queryKey: ['/api/partner/me/role-alignment', { 
      candidateId: selectedCandidate?.user?.id || '', 
      jobRoleId: selectedRole || '' 
    }],
    enabled: !!selectedCandidate && !!selectedRole && selectedRole !== "__none__",
  });

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedCandidate(null);
      setSelectedRole(undefined);
      setNewNote("");
    }
  };

  const addNoteMutation = useMutation({
    mutationFn: async ({ userId, note }: { userId: string; note: string }) => {
      return apiRequest('POST', '/api/partner/me/candidates/notes', { userId, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner/me/candidates'] });
      setNewNote("");
      toast({ title: "Note added successfully" });
    },
  });

  const handleExportCandidatePDF = async (candidate: any) => {
    if (!candidate) return;
    
    try {
      const completedResults = candidate.results?.filter(
        (r: any) => r.status === 'completed' && isSkillBasedAssessment(r.assessmentType) && r.scores
      );
      
      const allSkills: Array<{name: string, score: number, assessment: string}> = [];
      completedResults?.forEach((result: any) => {
        const radarData = transformToRadarData(result.scores, result.assessmentType);
        radarData.forEach((skill: any) => {
          allSkills.push({
            name: skill.skill,
            score: skill.score,
            assessment: formatAssessmentType(result.assessmentType)
          });
        });
      });
      
      toast({
        title: "Generating PDF...",
        description: "Please wait while we create your professional report.",
      });

      const averagesRes = await fetch('/api/partner/me/platform-averages');
      const platformAverages = await averagesRes.json();

      let radarChartImages: { fit?: string; aiReadiness?: string } = {};
      
      const fitResult = candidate.results?.find((r: any) => 
        r.assessmentType === 'fit' && r.status === 'completed'
      );
      const aiReadinessResult = candidate.results?.find((r: any) => 
        r.assessmentType === 'ai_readiness' && r.status === 'completed'
      );

      await new Promise(resolve => setTimeout(resolve, 300));

      if (fitResult) {
        const fitChart = await captureRadarChart('pdf-fit-chart');
        if (fitChart) radarChartImages.fit = fitChart;
      }

      if (aiReadinessResult) {
        const aiChart = await captureRadarChart('pdf-ai-readiness-chart');
        if (aiChart) radarChartImages.aiReadiness = aiChart;
      }
      
      const promptArchitectureResult = candidate.results?.find((r: any) => 
        r.assessmentType === 'prompt_architecture' && r.status === 'completed'
      );
      let promptArchitectureData: any[] = [];
      if (promptArchitectureResult) {
        try {
          const promptEvalRes = await fetch(`/api/prompt-evaluations/${promptArchitectureResult.id}`);
          if (promptEvalRes.ok) {
            promptArchitectureData = await promptEvalRes.json();
          }
        } catch (error) {
          console.error('Error fetching prompt architecture data:', error);
        }
      }
      
      if (!platformAverages || 
          typeof platformAverages.totalCandidates !== 'number' ||
          typeof platformAverages.avgScoreAcrossCandidates !== 'number' ||
          !platformAverages.skillAverages) {
        throw new Error('Platform averages data is incomplete');
      }

      const selectedRoleData = selectedRole && selectedRole !== "__none__" 
        ? roles?.find((r: any) => r.id === selectedRole) 
        : null;
      
      const roleComparisonData = (selectedRole && selectedRole !== "__none__" && selectedRoleData && roleAlignment?.overallFit !== undefined) 
        ? { role: selectedRoleData, alignment: roleAlignment } 
        : undefined;
      
      await exportEnhancedCandidatePDF(
        candidate, 
        allSkills, 
        platformAverages, 
        radarChartImages,
        roleComparisonData,
        promptArchitectureData
      );
      
      toast({
        title: "PDF exported successfully",
        description: "Professional candidate report has been downloaded.",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredCandidates = candidates?.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.user.email?.toLowerCase().includes(query) ||
      c.user.firstName?.toLowerCase().includes(query) ||
      c.user.lastName?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-lg">Candidate Results</CardTitle>
              <CardDescription>View completed assessment results for your candidates</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPdfImportModal(true)}
              data-testid="button-import-pdf-results"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import PDF Report
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-candidates"
            />
          </div>
        </CardContent>
      </Card>
      
      <PdfImportModal
        open={showPdfImportModal}
        onOpenChange={setShowPdfImportModal}
        endpoint="/api/partner/import-pdf"
      />

      {savedReports && savedReports.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Saved Analysis Reports</CardTitle>
                <Badge variant="secondary" className="text-xs">{savedReports.length}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSavedReports(!showSavedReports)}
                data-testid="button-toggle-saved-reports"
              >
                {showSavedReports ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <CardDescription>Previously generated reports are cached and can be accessed without additional credits</CardDescription>
          </CardHeader>
          {showSavedReports && (
            <CardContent>
              <div className="space-y-3">
                {savedReports.map((report) => {
                  const getReportIcon = () => {
                    switch (report.reportType) {
                      case 'individual': return <User className="h-4 w-4" />;
                      case 'role_fit_single': return <Target className="h-4 w-4" />;
                      case 'role_fit_multi': return <Users className="h-4 w-4" />;
                      case 'comparison': return <BarChart3 className="h-4 w-4" />;
                      case 'profile_insights': return <FileText className="h-4 w-4" />;
                      case 'assessment': return <ClipboardList className="h-4 w-4" />;
                      default: return <FileText className="h-4 w-4" />;
                    }
                  };
                  
                  const getReportTypeBadge = () => {
                    switch (report.reportType) {
                      case 'individual':
                        return <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 border-indigo-500/30">Individual Report</Badge>;
                      case 'role_fit_single': 
                        return <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">Role Fit</Badge>;
                      case 'role_fit_multi': 
                        return <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30">Multi-Candidate</Badge>;
                      case 'comparison': 
                        return <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">Comparison</Badge>;
                      case 'profile_insights': 
                        return <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-600 border-cyan-500/30">Insights</Badge>;
                      case 'assessment': 
                        return <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">Assessment</Badge>;
                      default: 
                        return <Badge variant="outline" className="text-xs">{report.reportType.replace(/_/g, ' ')}</Badge>;
                    }
                  };

                  return (
                    <div 
                      key={report.id} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover-elevate"
                      data-testid={`report-item-${report.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {getReportIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{report.title}</span>
                            {getReportTypeBadge()}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                            <span>-</span>
                            <span>{report.summary.candidateCount} candidate{report.summary.candidateCount !== 1 ? 's' : ''}</span>
                            {report.summary.overallFit !== undefined && (
                              <>
                                <span>-</span>
                                <span className={
                                  report.summary.overallFit >= 70 ? 'text-green-600' : 
                                  report.summary.overallFit >= 50 ? 'text-amber-600' : 'text-red-600'
                                }>
                                  {report.summary.overallFit}% fit
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{report.creditsUsed} credit{report.creditsUsed !== 1 ? 's' : ''}</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReportId(report.id);
                            setReportViewerOpen(true);
                          }}
                          data-testid={`button-view-report-${report.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteReportMutation.mutate(report.id)}
                          disabled={deleteReportMutation.isPending}
                          data-testid={`button-delete-report-${report.id}`}
                        >
                          {deleteReportMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredCandidates && filteredCandidates.length > 0 ? (
        <div className="grid gap-4">
          {filteredCandidates.map((candidate: any) => (
            <Card key={candidate.user.id} className="hover-elevate" data-testid={`card-candidate-${candidate.user.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {candidate.user.firstName || candidate.user.lastName
                        ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
                        : candidate.user.email || 'No Name'}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <p className="text-sm text-muted-foreground">{candidate.user.email}</p>
                      {candidate.user.resultsRetentionConsent === true ? (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30" data-testid={`badge-consent-opted-in-${candidate.user.id}`}>
                          <UserCheck className="h-3 w-3 mr-1" />
                          Shared
                        </Badge>
                      ) : candidate.user.resultsRetentionConsent === false ? (
                        <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30" data-testid={`badge-consent-opted-out-${candidate.user.id}`}>
                          <UserX className="h-3 w-3 mr-1" />
                          Private
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-500 border-gray-500/30" data-testid={`badge-consent-pending-${candidate.user.id}`}>
                          <HelpCircle className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Dialog open={dialogOpen && selectedCandidate?.user?.id === candidate.user.id} onOpenChange={handleDialogChange}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCandidate(candidate);
                          setDialogOpen(true);
                        }}
                        data-testid={`button-view-details-${candidate.user.id}`}
                      >
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {candidate.user.firstName || candidate.user.lastName
                            ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
                            : 'Candidate Details'}
                        </DialogTitle>
                        <DialogDescription>{candidate.user.email}</DialogDescription>
                      </DialogHeader>

                      <div className="space-y-6">
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Assessment Results ({candidate.results?.length || 0})
                          </h3>
                          {candidate.results && candidate.results.length > 0 ? (
                            <div className="space-y-4">
                              {candidate.results.map((result: any) => (
                                <div key={result.id} className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{formatAssessmentType(result.assessmentType)}</span>
                                    <Badge variant={result.status === 'completed' ? 'default' : 'secondary'}>
                                      {result.status}
                                    </Badge>
                                  </div>
                                  
                                  {result.status === 'completed' && isSkillBasedAssessment(result.assessmentType) && result.scores ? (
                                    <div className="space-y-3">
                                      <SkillRadarChart 
                                        data={transformToRadarData(result.scores, result.assessmentType)}
                                        height={250}
                                        showCard={false}
                                      />
                                      
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-muted/50 rounded-lg">
                                          <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                            <p className="text-xs font-medium text-muted-foreground">Top Strengths</p>
                                          </div>
                                          {getTopSkills(result.scores, result.assessmentType, 2).map((skill) => (
                                            <div key={skill.name} className="flex items-center justify-between text-sm mt-1">
                                              <span>{skill.name}</span>
                                              <Badge variant="outline" className="font-mono text-xs">{skill.score}</Badge>
                                            </div>
                                          ))}
                                        </div>
                                        
                                        <div className="p-3 bg-muted/50 rounded-lg">
                                          <div className="flex items-center gap-2 mb-2">
                                            <TrendingDown className="h-4 w-4 text-amber-600" />
                                            <p className="text-xs font-medium text-muted-foreground">Growth Areas</p>
                                          </div>
                                          {getGrowthAreas(result.scores, result.assessmentType, 2).map((skill) => (
                                            <div key={skill.name} className="flex items-center justify-between text-sm mt-1">
                                              <span>{skill.name}</span>
                                              <Badge variant="outline" className="font-mono text-xs">{skill.score}</Badge>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      
                                      <div className="text-center p-2 bg-primary/5 rounded-lg">
                                        <p className="text-xs text-muted-foreground">Average Score</p>
                                        <p className="text-xl font-bold text-primary">{calculateAverageScore(result.scores)}/100</p>
                                      </div>
                                    </div>
                                  ) : result.assessmentType === 'aiq' && result.totalScore !== null && result.status === 'completed' ? (
                                    (() => {
                                      const aiqBand = getAIQBandInterpretation(result.totalScore);
                                      const getBarColor = (score: number) => {
                                        if (score >= 80) return 'bg-green-600';
                                        if (score >= 60) return 'bg-blue-600';
                                        if (score >= 40) return 'bg-amber-500';
                                        if (score >= 20) return 'bg-orange-500';
                                        return 'bg-red-500';
                                      };
                                      return (
                                        <div className="p-4 bg-muted/30 rounded-lg space-y-3" data-testid={`aiq-result-${result.id}`}>
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium" data-testid="text-aiq-label">AIQ Score</span>
                                            <span className="text-xl font-bold text-primary" data-testid="text-aiq-score">{result.totalScore}%</span>
                                          </div>
                                          
                                          <div className="relative">
                                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                              <span data-testid="text-aiq-min">0</span>
                                              <span>40</span>
                                              <span>80</span>
                                              <span data-testid="text-aiq-max">100</span>
                                            </div>
                                            
                                            <div className="relative" data-testid="container-aiq-progress">
                                              <Progress 
                                                value={Math.min(result.totalScore, 100)} 
                                                className="h-6 relative"
                                                data-testid="progress-aiq-bar"
                                                indicatorClassName={getBarColor(result.totalScore)}
                                              />
                                              
                                              {[20, 40, 60, 80].map((mark) => (
                                                <div 
                                                  key={mark}
                                                  className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/30 pointer-events-none" 
                                                  style={{ left: `${mark}%` }}
                                                />
                                              ))}
                                              
                                              {result.totalScore > 0 && (
                                                <div 
                                                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap pointer-events-none"
                                                  style={{ left: `${Math.min(Math.max(result.totalScore, 8), 92)}%` }}
                                                  data-testid="label-aiq-score-position"
                                                >
                                                  {result.totalScore}%
                                                </div>
                                              )}
                                            </div>
                                            
                                            <div className="text-center mt-2" data-testid="container-aiq-band">
                                              <Badge 
                                                className={`text-xs ${
                                                  result.totalScore >= 80 ? 'bg-green-600' :
                                                  result.totalScore >= 60 ? 'bg-blue-600' :
                                                  result.totalScore >= 40 ? 'bg-amber-500' :
                                                  result.totalScore >= 20 ? 'bg-orange-500' : 'bg-red-500'
                                                }`}
                                                data-testid="badge-aiq-band"
                                              >
                                                {aiqBand.title}
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()
                                  ) : result.totalScore !== null && (
                                    <div className="text-center p-3 bg-muted rounded-lg">
                                      <p className="text-lg font-bold text-primary">
                                        {result.totalScore}%
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No completed assessments</p>
                          )}
                        </div>

                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Biggest Areas to Improve
                          </h3>
                          {(() => {
                            const completedResults = candidate.results?.filter(
                              (r: any) => r.status === 'completed' && isSkillBasedAssessment(r.assessmentType) && r.scores
                            );
                            
                            if (!completedResults || completedResults.length === 0) {
                              return <p className="text-sm text-muted-foreground">No completed assessments to analyze</p>;
                            }

                            const allGrowthAreas: Array<{name: string, score: number, assessment: string}> = [];
                            completedResults.forEach((result: any) => {
                              const growthAreas = getGrowthAreas(result.scores, result.assessmentType, 3);
                              growthAreas.forEach((skill) => {
                                allGrowthAreas.push({
                                  name: skill.name,
                                  score: skill.score,
                                  assessment: formatAssessmentType(result.assessmentType)
                                });
                              });
                            });

                            const sortedGrowthAreas = allGrowthAreas
                              .sort((a, b) => a.score - b.score)
                              .slice(0, 3);

                            return (
                              <div className="space-y-2">
                                {sortedGrowthAreas.map((skill, index) => (
                                  <div key={`${skill.name}-${index}`} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                                    <div>
                                      <span className="font-medium">{skill.name}</span>
                                      <Badge variant="outline" className="ml-2 text-xs">{skill.assessment}</Badge>
                                    </div>
                                    <Badge variant="outline" className="font-mono">{skill.score}</Badge>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>

                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <StickyNote className="h-4 w-4" />
                            Notes
                          </h3>
                          {candidate.notes && candidate.notes.length > 0 ? (
                            <div className="space-y-2 mb-3">
                              {candidate.notes.map((note: any) => (
                                <div key={note.id} className="p-2 bg-muted/50 rounded-lg">
                                  <p className="text-sm">{note.content}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(note.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground mb-3">No notes yet</p>
                          )}
                          <div className="flex gap-2">
                            <Textarea
                              placeholder="Add a note..."
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              className="flex-1"
                              data-testid="textarea-add-note"
                            />
                            <Button
                              size="sm"
                              disabled={!newNote.trim() || addNoteMutation.isPending}
                              onClick={() => addNoteMutation.mutate({ userId: candidate.user.id, note: newNote })}
                              data-testid="button-add-note"
                            >
                              {addNoteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                            </Button>
                          </div>
                        </div>

                        {roles && roles.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-3">Compare to Role</h3>
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                              <SelectTrigger data-testid="select-compare-role">
                                <SelectValue placeholder="Select a role to compare" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">No role comparison</SelectItem>
                                {roles.map((role: any) => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {roleAlignment && selectedRole && selectedRole !== "__none__" && (
                              <div className="mt-4 p-3 bg-muted/30 rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Overall Fit</span>
                                  <Badge className={roleAlignment.overallFit >= 70 ? 'bg-green-600' : roleAlignment.overallFit >= 50 ? 'bg-amber-500' : 'bg-red-500'}>
                                    {roleAlignment.overallFit}%
                                  </Badge>
                                </div>
                                
                                {roleAlignment.strengths.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Strengths</p>
                                    <div className="flex flex-wrap gap-1">
                                      {roleAlignment.strengths.map((s, i) => (
                                        <Badge key={i} variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">{s}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {roleAlignment.gaps.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Gaps</p>
                                    <div className="flex flex-wrap gap-1">
                                      {roleAlignment.gaps.map((g, i) => (
                                        <Badge key={i} variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">{g}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => handleExportCandidatePDF(candidate)}
                          data-testid="button-export-candidate-pdf"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export PDF
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {candidate.results?.map((result: any) => (
                    <Badge 
                      key={result.id} 
                      variant={result.status === 'completed' ? 'default' : 'secondary'}
                      data-testid={`badge-result-${result.id}`}
                    >
                      {formatAssessmentType(result.assessmentType)}
                      {result.totalScore !== null && ` (${result.totalScore}%)`}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium text-muted-foreground">No results yet</p>
            <p className="text-sm text-muted-foreground mt-1">Results will appear here when candidates complete assessments.</p>
            <p className="text-sm text-muted-foreground mt-2">Get started by creating an assessment session via the API or Widget Test Lab.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={reportViewerOpen} onOpenChange={(open) => {
        setReportViewerOpen(open);
        if (!open) setSelectedReportId(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedReportData?.title || 'Report Details'}
            </DialogTitle>
            <DialogDescription>
              Generated on {selectedReportData?.createdAt ? new Date(selectedReportData.createdAt).toLocaleString() : 'N/A'}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingReport ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedReportData ? (
            <div className="space-y-6" id="report-viewer-content">
              {selectedReportData.reportType === 'individual' || selectedReportData.reportType === 'comparison' ? (
                <>
                  {selectedReportData.fitAssessments?.map((fit: any, idx: number) => (
                    <Card key={`fit-${idx}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          FIT Assessment
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm font-medium">Total Score</span>
                          <span className="text-2xl font-bold text-primary">{fit.totalScore}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(fit.scores || {}).map(([skill, score]) => (
                            <div key={skill} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{skill}</span>
                              <span className="font-medium">{score as number}%</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {selectedReportData.aiReadinessAssessments?.map((ai: any, idx: number) => (
                    <Card key={`ai-${idx}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Target className="h-5 w-5 text-primary" />
                          AI Readiness Assessment
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm font-medium">Total Score</span>
                          <span className="text-2xl font-bold text-primary">{ai.totalScore}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(ai.scores || {}).map(([skill, score]) => (
                            <div key={skill} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{skill}</span>
                              <span className="font-medium">{score as number}%</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {selectedReportData.aiqAssessments?.map((aiq: any, idx: number) => (
                    <Card key={`aiq-${idx}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-primary" />
                          AIQ Assessment
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm font-medium">AIQ Score</span>
                          <span className="text-2xl font-bold text-primary">{aiq.totalScore}</span>
                        </div>
                        {aiq.scores?.situational_awareness && (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Situational Awareness</span>
                              <span className="font-medium">{aiq.scores.situational_awareness}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">System Understanding</span>
                              <span className="font-medium">{aiq.scores.system_understanding || 'N/A'}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Ethical Calibration</span>
                              <span className="font-medium">{aiq.scores.ethical_calibration || 'N/A'}%</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {selectedReportData.promptArchitectureAssessments?.map((pa: any, idx: number) => (
                    <Card key={`pa-${idx}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          Prompt Architecture Assessment
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm font-medium">Total Score</span>
                          <span className="text-2xl font-bold text-primary">{pa.totalScore}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : selectedReportData.reportType === 'role_fit_single' || selectedReportData.reportType === 'role_fit_multi' ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Role Fit Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-medium">Overall Fit Score</span>
                      <span className={`text-2xl font-bold ${
                        (selectedReportData.overallFit || 0) >= 70 ? 'text-green-600' :
                        (selectedReportData.overallFit || 0) >= 50 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {selectedReportData.overallFit || 0}%
                      </span>
                    </div>
                    {selectedReportData.analysis && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{selectedReportData.analysis}</p>
                      </div>
                    )}
                    {selectedReportData.skillAlignments && (
                      <div className="mt-4 space-y-2">
                        {selectedReportData.skillAlignments.map((skill: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{skill.skillName}</span>
                            <div className="flex gap-2">
                              <span>Candidate: {skill.candidateScore}%</span>
                              <span className="text-muted-foreground">|</span>
                              <span>Required: {skill.requiredScore}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : selectedReportData.reportType === 'profile_insights' ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Profile Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedReportData.insights ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="whitespace-pre-wrap">{selectedReportData.insights}</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No insights available.</p>
                    )}
                  </CardContent>
                </Card>
              ) : selectedReportData.reportType === 'assessment' ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      Assessment Report
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedReportData.totalScore !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Total Score</span>
                          <span className="text-2xl font-bold text-primary">{selectedReportData.totalScore}%</span>
                        </div>
                      )}
                      {selectedReportData.scores && (
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(selectedReportData.scores).map(([skill, score]) => (
                            <div key={skill} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{skill}</span>
                              <span className="font-medium">{score as number}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Report Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-auto max-h-96">
                      {JSON.stringify(selectedReportData, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load report data.
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReportViewerOpen(false);
                setSelectedReportId(null);
              }}
            >
              Close
            </Button>
            <Button
              onClick={async () => {
                if (!selectedReportData) return;
                setIsExportingPdf(true);
                try {
                  const { jsPDF } = await import('jspdf');
                  const html2canvas = (await import('html2canvas')).default;
                  
                  const element = document.getElementById('report-viewer-content');
                  if (!element) throw new Error('Report content not found');
                  
                  const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                  });
                  
                  const imgData = canvas.toDataURL('image/png');
                  const pdf = new jsPDF('p', 'mm', 'a4');
                  const imgWidth = 210;
                  const imgHeight = (canvas.height * imgWidth) / canvas.width;
                  
                  let heightLeft = imgHeight;
                  let position = 0;
                  
                  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                  heightLeft -= 297;
                  
                  while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= 297;
                  }
                  
                  const fileName = `${selectedReportData.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'report'}_${new Date().toISOString().split('T')[0]}.pdf`;
                  pdf.save(fileName);
                  
                  toast({
                    title: "PDF Downloaded",
                    description: "Your report has been exported successfully.",
                  });
                } catch (error) {
                  console.error('PDF export error:', error);
                  toast({
                    title: "Export Failed",
                    description: "Failed to export report as PDF.",
                    variant: "destructive",
                  });
                } finally {
                  setIsExportingPdf(false);
                }
              }}
              disabled={isExportingPdf || !selectedReportData}
              data-testid="button-download-report-pdf"
            >
              {isExportingPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
