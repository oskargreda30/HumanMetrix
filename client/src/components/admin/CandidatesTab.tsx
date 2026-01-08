import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, FileText, StickyNote, TrendingUp, TrendingDown, AlertTriangle, Download, UserCheck, UserX, HelpCircle, MapPin } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkillRadarChart } from "@/components/admin/SkillRadarChart";
import { isSkillBasedAssessment, transformToRadarData, getTopSkills, getGrowthAreas, formatAssessmentType, calculateAverageScore, getSkillAcronym } from "@/lib/assessmentSkills";
import { exportEnhancedCandidatePDF, captureRadarChart } from "@/lib/enhancedPdfExport";
import { getAIQBandInterpretation } from "@/data/aiq-questions";

export default function CandidatesTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const { toast} = useToast();

  const { data: candidates, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/candidates'],
  });

  const { data: roles } = useQuery<any[]>({
    queryKey: ['/api/admin/roles'],
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
    queryKey: ['/api/admin/role-alignment', { 
      userId: selectedCandidate?.user?.id || '', 
      jobRoleId: selectedRole || '' 
    }],
    enabled: !!selectedCandidate && !!selectedRole && selectedRole !== "__none__",
  });

  // Handle dialog open/close and reset state
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
      const res = await fetch('/api/admin/candidates/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, note }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/candidates'] });
      setNewNote("");
      toast({ title: "Note added successfully" });
    },
  });

  const handleExportCandidatePDF = async (candidate: any) => {
    if (!candidate) return;
    
    try {
      // Collect all skills from completed assessments
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

      // Fetch platform averages
      const averagesRes = await fetch('/api/admin/platform-averages');
      const platformAverages = await averagesRes.json();

      // Capture radar charts for FIT and AI Readiness
      let radarChartImages: { fit?: string; aiReadiness?: string } = {};
      
      const fitResult = candidate.results?.find((r: any) => 
        r.assessmentType === 'fit' && r.status === 'completed'
      );
      const aiReadinessResult = candidate.results?.find((r: any) => 
        r.assessmentType === 'ai_readiness' && r.status === 'completed'
      );

      // Wait for charts to fully render
      await new Promise(resolve => setTimeout(resolve, 300));

      if (fitResult) {
        const fitChart = await captureRadarChart('pdf-fit-chart');
        if (fitChart) radarChartImages.fit = fitChart;
      }

      if (aiReadinessResult) {
        const aiChart = await captureRadarChart('pdf-ai-readiness-chart');
        if (aiChart) radarChartImages.aiReadiness = aiChart;
      }
      
      // Fetch Prompt Architecture evaluation data
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
      
      // Validate platform averages
      if (!platformAverages || 
          typeof platformAverages.totalCandidates !== 'number' ||
          typeof platformAverages.avgScoreAcrossCandidates !== 'number' ||
          !platformAverages.skillAverages) {
        throw new Error('Platform averages data is incomplete');
      }

      // Get role data if selected and validate
      const selectedRoleData = selectedRole && selectedRole !== "__none__" 
        ? roles?.find((r: any) => r.id === selectedRole) 
        : null;
      
      // Validate role alignment if provided - only use if query is actually enabled
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
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-candidates"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredCandidates && filteredCandidates.length > 0 ? (
        <div className="grid gap-4">
          {filteredCandidates.map((candidate: any) => (
            <Card 
              key={candidate.user.id} 
              className="hover-elevate cursor-pointer" 
              data-testid={`card-candidate-${candidate.user.id}`}
              onClick={() => {
                setSelectedCandidate(candidate);
                setDialogOpen(true);
              }}
            >
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base truncate">
                        {candidate.user.firstName || candidate.user.lastName
                          ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
                          : 'No Name'}
                      </CardTitle>
                      {candidate.user.resultsRetentionConsent === true ? (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30 shrink-0" data-testid={`badge-consent-opted-in-${candidate.user.id}`}>
                          <UserCheck className="h-3 w-3 mr-1" />
                          Shared
                        </Badge>
                      ) : candidate.user.resultsRetentionConsent === false ? (
                        <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30 shrink-0" data-testid={`badge-consent-opted-out-${candidate.user.id}`}>
                          <UserX className="h-3 w-3 mr-1" />
                          Private
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-500 border-gray-500/30 shrink-0" data-testid={`badge-consent-pending-${candidate.user.id}`}>
                          <HelpCircle className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{candidate.user.email}</p>
                  </div>
                  
                  <Dialog open={dialogOpen && selectedCandidate?.user?.id === candidate.user.id} onOpenChange={handleDialogChange}>
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
                        {/* Assessment Results */}
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
                                          
                                          {/* Horizontal bar with graded band markers */}
                                          <div className="relative">
                                            {/* Band labels */}
                                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                              <span data-testid="text-aiq-min">0</span>
                                              <span>40</span>
                                              <span>80</span>
                                              <span data-testid="text-aiq-max">100</span>
                                            </div>
                                            
                                            {/* Bar using shadcn Progress with graded coloring */}
                                            <div className="relative" data-testid="container-aiq-progress">
                                              <Progress 
                                                value={Math.min(result.totalScore, 100)} 
                                                className="h-6 relative"
                                                data-testid="progress-aiq-bar"
                                                indicatorClassName={getBarColor(result.totalScore)}
                                              />
                                              
                                              {/* Band marker lines */}
                                              {[20, 40, 60, 80].map((mark) => (
                                                <div 
                                                  key={mark}
                                                  className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/30 pointer-events-none" 
                                                  style={{ left: `${mark}%` }}
                                                />
                                              ))}
                                              
                                              {/* Score value label */}
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
                                            
                                            {/* Band interpretation */}
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

                        {/* Biggest Areas to Improve */}
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

                            // Collect all growth areas across all assessments
                            const allGrowthAreas: Array<{name: string, score: number, assessment: string}> = [];
                            completedResults.forEach((result: any) => {
                              const growthAreas = getGrowthAreas(result.scores, result.assessmentType, 3);
                              growthAreas.forEach(area => {
                                allGrowthAreas.push({
                                  name: area.name,
                                  score: area.score,
                                  assessment: formatAssessmentType(result.assessmentType)
                                });
                              });
                            });

                            // Sort by lowest score and take top 5
                            allGrowthAreas.sort((a, b) => a.score - b.score);
                            const topGrowthAreas = allGrowthAreas.slice(0, 5);

                            return (
                              <div className="space-y-2">
                                {topGrowthAreas.map((area, index) => (
                                  <div key={index} className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">{area.name}</p>
                                        <p className="text-xs text-muted-foreground">{area.assessment}</p>
                                      </div>
                                      <Badge variant="outline" className="font-mono text-xs">
                                        {area.score}/100
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Notes */}
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <StickyNote className="h-4 w-4" />
                            Notes
                          </h3>
                          {candidate.notes && candidate.notes.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {candidate.notes.map((note: any) => (
                                <div key={note.id} className="p-3 bg-muted rounded-lg">
                                  <p className="text-sm">{note.note}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(note.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Add a note..."
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              rows={3}
                              data-testid="textarea-new-note"
                            />
                            <Button
                              onClick={() => {
                                if (newNote.trim() && selectedCandidate) {
                                  addNoteMutation.mutate({
                                    userId: selectedCandidate.user.id,
                                    note: newNote.trim(),
                                  });
                                }
                              }}
                              disabled={!newNote.trim() || addNoteMutation.isPending}
                              data-testid="button-add-note"
                            >
                              Add Note
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Job Role Comparison (Optional) */}
                      <div className="mt-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">Job Role Comparison (Optional)</h4>
                          {roleAlignment && (
                            <Badge variant="default">
                              {roleAlignment.overallFit}% Match
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-muted-foreground">
                            Select a role to include comparison in PDF export
                          </label>
                          <Select 
                            value={selectedRole || "__none__"} 
                            onValueChange={(value) => setSelectedRole(value === "__none__" ? undefined : value)}
                          >
                            <SelectTrigger data-testid="select-comparison-role">
                              <SelectValue placeholder="None - export without role comparison" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {roles?.map((role: any) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {roleAlignment && (
                            <p className="text-xs text-muted-foreground mt-2">
                              ✓ Role fit analysis will be included at the bottom of the PDF
                            </p>
                          )}
                        </div>
                      </div>

                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => handleExportCandidatePDF(selectedCandidate)}
                          data-testid="button-export-candidate"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export PDF
                        </Button>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                          Close
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{candidate.user.country || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Assessments: </span>
                    <span className="font-medium">
                      {new Set(candidate.results?.filter((r: any) => r.status === 'completed').map((r: any) => r.assessmentType) || []).size}/4
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No candidates found</p>
          </CardContent>
        </Card>
      )}

      {/* Hidden radar charts for PDF export */}
      {selectedCandidate && (
        <div style={{ position: 'absolute', left: '-9999px', width: '600px', height: '400px' }}>
          {(() => {
            const fitResult = selectedCandidate.results?.find((r: any) => 
              r.assessmentType === 'fit' && r.status === 'completed'
            );
            const aiReadinessResult = selectedCandidate.results?.find((r: any) => 
              r.assessmentType === 'ai_readiness' && r.status === 'completed'
            );

            return (
              <>
                {fitResult && (
                  <div id="pdf-fit-chart" style={{ width: '600px', height: '400px', backgroundColor: 'white', padding: '20px' }}>
                    <SkillRadarChart 
                      data={transformToRadarData(fitResult.scores, fitResult.assessmentType).map(d => ({
                        ...d,
                        skill: getSkillAcronym(d.skill)
                      }))}
                      title="FIT Assessment"
                    />
                  </div>
                )}
                {aiReadinessResult && (
                  <div id="pdf-ai-readiness-chart" style={{ width: '600px', height: '400px', backgroundColor: 'white', padding: '20px' }}>
                    <SkillRadarChart 
                      data={transformToRadarData(aiReadinessResult.scores, aiReadinessResult.assessmentType).map(d => ({
                        ...d,
                        skill: getSkillAcronym(d.skill)
                      }))}
                      title="AI Readiness"
                    />
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
