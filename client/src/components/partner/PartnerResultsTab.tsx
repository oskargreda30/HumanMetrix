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
  const { toast } = useToast();

  const { data: candidates, isLoading } = useQuery<any[]>({
    queryKey: ['/api/partner/me/candidates'],
  });

  const { data: savedReports, isLoading: reportsLoading } = useQuery<SavedReport[]>({
    queryKey: ['/api/partner/me/analysis-reports'],
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
      toast({
        title: "Generating PDF...",
        description: "Please wait while we capture your report.",
      });

      const { exportResultsPDF } = await import('@/lib/pdfScreenCapture');
      const candidateName = candidate.user.firstName || candidate.user.lastName
        ? `${candidate.user.firstName || ''}_${candidate.user.lastName || ''}`.trim()
        : candidate.user.email.split('@')[0];
      const filename = `${candidateName}_Assessment_Report.pdf`;

      await exportResultsPDF({
        elementId: 'partner-candidate-report-content',
        filename,
      });
      
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
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    
    // Search by name
    const firstName = c.user.firstName?.toLowerCase() || '';
    const lastName = c.user.lastName?.toLowerCase() || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const email = c.user.email?.toLowerCase() || '';
    
    // Check user info
    if (firstName.includes(query) || lastName.includes(query) || fullName.includes(query) || email.includes(query)) {
      return true;
    }
    
    // Search through assessment types and statuses
    if (c.results && Array.isArray(c.results)) {
      for (const result of c.results) {
        const assessmentType = result.assessmentType?.toLowerCase() || '';
        const formattedType = formatAssessmentType(result.assessmentType)?.toLowerCase() || '';
        const status = result.status?.toLowerCase() || '';
        
        if (assessmentType.includes(query) || formattedType.includes(query) || status.includes(query)) {
          return true;
        }
        
        // Search through skill names
        if (result.scores && typeof result.scores === 'object') {
          for (const skillName of Object.keys(result.scores)) {
            if (skillName.toLowerCase().includes(query)) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  });

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Quick Action Summary Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-3">
        <Card 
          className="cursor-pointer hover-elevate" 
          onClick={() => {
            const section = document.getElementById('candidates-list-section');
            section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          data-testid="card-summary-candidates"
        >
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-bold">{candidates?.filter((c: any) => c.results?.some((r: any) => r.status === 'completed')).length || 0}</p>
                <p className="text-xs md:text-sm text-muted-foreground">Candidates with Results</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover-elevate" 
          onClick={() => {
            const section = document.getElementById('saved-reports-section');
            section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (!showSavedReports) setShowSavedReports(true);
          }}
          data-testid="card-summary-reports"
        >
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-bold">{savedReports?.length || 0}</p>
                <p className="text-xs md:text-sm text-muted-foreground">Saved Analysis Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover-elevate"
          onClick={() => setShowPdfImportModal(true)}
          data-testid="card-import-pdf"
        >
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Upload className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm md:text-base font-semibold">Import PDF</p>
                <p className="text-xs md:text-sm text-muted-foreground">Upload external reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Card - Compact */}
      <Card>
        <CardContent className="p-2 md:p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 md:pl-9 text-xs md:text-sm h-8 md:h-9"
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
        <Card id="saved-reports-section">
          <CardHeader className="pb-1 md:pb-1.5 p-2 md:p-3">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-1 md:gap-1.5">
                <BarChart3 className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                <CardTitle className="text-xs md:text-sm">Saved Analysis Reports</CardTitle>
                <Badge variant="secondary" className="text-[9px] md:text-[10px]">{savedReports.length}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSavedReports(!showSavedReports)}
                data-testid="button-toggle-saved-reports"
                className="h-6 w-6 md:h-7 md:w-7 p-0"
              >
                {showSavedReports ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
            <CardDescription className="text-[9px] md:text-xs">Cached reports accessible without credits</CardDescription>
          </CardHeader>
          {showSavedReports && (
            <CardContent className="p-2 md:p-3 pt-0">
              <div className="space-y-1.5 md:space-y-2">
                {savedReports.map((report) => {
                  const getReportIcon = () => {
                    switch (report.reportType) {
                      case 'individual': return <User className="h-3 w-3" />;
                      case 'role_fit_single': return <Target className="h-3 w-3" />;
                      case 'role_fit_multi': return <Users className="h-3 w-3" />;
                      case 'comparison': return <BarChart3 className="h-3 w-3" />;
                      case 'profile_insights': return <FileText className="h-3 w-3" />;
                      case 'assessment': return <ClipboardList className="h-3 w-3" />;
                      default: return <FileText className="h-3 w-3" />;
                    }
                  };
                  
                  const getReportTypeBadge = () => {
                    switch (report.reportType) {
                      case 'individual':
                        return <Badge variant="outline" className="text-[9px] md:text-[10px] bg-indigo-500/10 text-indigo-600 border-indigo-500/30">Individual</Badge>;
                      case 'role_fit_single': 
                        return <Badge variant="outline" className="text-[9px] md:text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">Role Fit</Badge>;
                      case 'role_fit_multi': 
                        return <Badge variant="outline" className="text-[9px] md:text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/30">Multi</Badge>;
                      case 'comparison': 
                        return <Badge variant="outline" className="text-[9px] md:text-[10px] bg-green-500/10 text-green-600 border-green-500/30">Compare</Badge>;
                      case 'profile_insights': 
                        return <Badge variant="outline" className="text-[9px] md:text-[10px] bg-cyan-500/10 text-cyan-600 border-cyan-500/30">Insights</Badge>;
                      case 'assessment': 
                        return <Badge variant="outline" className="text-[9px] md:text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">Assessment</Badge>;
                      default: 
                        return <Badge variant="outline" className="text-[9px] md:text-[10px]">{report.reportType.replace(/_/g, ' ')}</Badge>;
                    }
                  };

                  return (
                    <div 
                      key={report.id} 
                      className="flex items-center justify-between p-2 bg-muted/30 rounded-md hover-elevate"
                      data-testid={`report-item-${report.id}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="p-1.5 bg-primary/10 rounded-md">
                          {getReportIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-xs truncate">{report.title}</span>
                            {getReportTypeBadge()}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span>{new Date(report.createdAt).toLocaleString()}</span>
                            <span>·</span>
                            <span>{report.summary.candidateCount}</span>
                            {report.summary.overallFit !== undefined && (
                              <>
                                <span>·</span>
                                <span className={
                                  report.summary.overallFit >= 70 ? 'text-green-600' : 
                                  report.summary.overallFit >= 50 ? 'text-amber-600' : 'text-red-600'
                                }>
                                  {report.summary.overallFit}%
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 md:h-7 text-[10px] md:text-xs px-2"
                          onClick={() => {
                            window.open(`/partner/report/${report.id}`, '_blank');
                          }}
                          data-testid={`button-view-report-${report.id}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 md:h-7 md:w-7"
                          onClick={() => deleteReportMutation.mutate(report.id)}
                          disabled={deleteReportMutation.isPending}
                          data-testid={`button-delete-report-${report.id}`}
                        >
                          {deleteReportMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
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
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredCandidates && filteredCandidates.length > 0 ? (
        <div id="candidates-list-section" className="grid gap-3">
          {filteredCandidates.map((candidate: any) => (
            <Card key={candidate.user.id} className="hover-elevate" data-testid={`card-candidate-${candidate.user.id}`}>
              <CardHeader className="p-3 md:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm md:text-base truncate">
                      {candidate.user.firstName || candidate.user.lastName
                        ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
                        : candidate.user.email || 'No Name'}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[10px] md:text-xs text-muted-foreground truncate">{candidate.user.email}</p>
                      {candidate.user.resultsRetentionConsent === true ? (
                        <Badge variant="outline" className="text-[9px] md:text-[10px] bg-green-500/10 text-green-600 border-green-500/30" data-testid={`badge-consent-opted-in-${candidate.user.id}`}>
                          <UserCheck className="h-2.5 w-2.5 mr-0.5" />
                          Shared
                        </Badge>
                      ) : candidate.user.resultsRetentionConsent === false ? (
                        <Badge variant="outline" className="text-[9px] md:text-[10px] bg-red-500/10 text-red-600 border-red-500/30" data-testid={`badge-consent-opted-out-${candidate.user.id}`}>
                          <UserX className="h-2.5 w-2.5 mr-0.5" />
                          Private
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] md:text-[10px] bg-gray-500/10 text-gray-500 border-gray-500/30" data-testid={`badge-consent-pending-${candidate.user.id}`}>
                          <HelpCircle className="h-2.5 w-2.5 mr-0.5" />
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
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedCandidate(candidate);
                          setDialogOpen(true);
                        }}
                        data-testid={`button-view-details-${candidate.user.id}`}
                      >
                        Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <div id="partner-candidate-report-content">
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
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

    </div>
  );
}
