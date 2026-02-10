import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, BarChart3, ChevronDown, ChevronUp, Trash2, Eye, User, Target, Users, FileText, ClipboardList } from "lucide-react";
import { PdfImportModal } from "@/components/PdfImportModal";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

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
  const [showPdfImportModal, setShowPdfImportModal] = useState(false);
  const [showSavedReports, setShowSavedReports] = useState(true);
  const { toast } = useToast();

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

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Quick Action Summary Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
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


    </div>
  );
}
