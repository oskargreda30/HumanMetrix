import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users, BarChart3, AlertCircle, Download, Award, Brain, Target, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";
import html2canvas from "html2canvas";
import { exportComparisonPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";
import { FIT_SKILLS, AI_READINESS_SKILLS } from "@/lib/assessmentSkills";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))",
];

interface ComparisonData {
  radarData: Array<any>;
  skillComparison: Array<{ skillName: string; scores: Array<number | null> }>;
  averageScores: Array<number>;
  hasSkillData: boolean;
  fitAssessments: Array<{ scores: Record<string, number>; completedAt: Date } | null>;
  aiReadinessAssessments: Array<{ scores: Record<string, number>; completedAt: Date } | null>;
  promptArchitectureAssessments: Array<{
    levels: Array<{
      level: number;
      scores: { clarity: number; structure: number; contextRelevance: number; creativity: number; iterativeImprovement: number };
      totalScore: number;
      feedback: string;
    }>;
    totalScore: number;
    percentile: number;
    completedAt: Date;
  } | null>;
  aiqAssessments: Array<{ totalScore: number; scores: Record<string, number>; completedAt: Date } | null>;
}

export default function CompareTab() {
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: candidates, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/candidates'],
  });

  const { data: comparison, isLoading: isComparing } = useQuery<ComparisonData>({
    queryKey: ['compare', selectedCandidates],
    queryFn: async () => {
      const params = new URLSearchParams();
      selectedCandidates.forEach(id => params.append('userIds', id));
      const response = await fetch(`/api/admin/compare?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch comparison');
      return response.json();
    },
    enabled: selectedCandidates.length >= 2,
  });

  const toggleCandidate = (userId: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : prev.length < 3
        ? [...prev, userId]
        : prev
    );
  };

  const selectedCandidateData = candidates?.filter((c) =>
    selectedCandidates.includes(c.user.id)
  );

  const handleExportPDF = async () => {
    if (!comparison || !selectedCandidateData) return;
    
    try {
      toast({
        title: "Generating PDF...",
        description: "Capturing charts and preparing your report...",
      });

      // Wait for charts to render
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capture radar chart images
      const fitChartImages: (string | null)[] = [];
      const aiChartImages: (string | null)[] = [];

      for (let i = 0; i < selectedCandidateData.length; i++) {
        // Capture FIT radar chart
        if (comparison.fitAssessments?.[i]) {
          try {
            const element = document.getElementById(`pdf-comparison-fit-${i}`);
            if (element) {
              const canvas = await html2canvas(element, {
                backgroundColor: '#ffffff',
                scale: 2,
              });
              fitChartImages.push(canvas.toDataURL('image/png'));
            } else {
              fitChartImages.push(null);
            }
          } catch (err) {
            console.error('Error capturing FIT chart:', err);
            fitChartImages.push(null);
          }
        } else {
          fitChartImages.push(null);
        }

        // Capture AI Readiness radar chart
        if (comparison.aiReadinessAssessments?.[i]) {
          try {
            const element = document.getElementById(`pdf-comparison-ai-${i}`);
            if (element) {
              const canvas = await html2canvas(element, {
                backgroundColor: '#ffffff',
                scale: 2,
              });
              aiChartImages.push(canvas.toDataURL('image/png'));
            } else {
              aiChartImages.push(null);
            }
          } catch (err) {
            console.error('Error capturing AI chart:', err);
            aiChartImages.push(null);
          }
        } else {
          aiChartImages.push(null);
        }
      }
      
      // Capture combined radar charts
      let fitCombinedChartImage: string | null = null;
      let aiCombinedChartImage: string | null = null;
      
      // Capture overlapping FIT chart if any candidates have it
      if (comparison.fitAssessments?.some(a => a !== null)) {
        try {
          const element = document.getElementById('pdf-comparison-fit-overlapping');
          if (element) {
            const canvas = await html2canvas(element, {
              backgroundColor: '#ffffff',
              scale: 2,
            });
            fitCombinedChartImage = canvas.toDataURL('image/png');
          }
        } catch (err) {
          console.error('Error capturing overlapping FIT chart:', err);
        }
      }
      
      // Capture overlapping AI Readiness chart if any candidates have it
      if (comparison.aiReadinessAssessments?.some(a => a !== null)) {
        try {
          const element = document.getElementById('pdf-comparison-ai-overlapping');
          if (element) {
            const canvas = await html2canvas(element, {
              backgroundColor: '#ffffff',
              scale: 2,
            });
            aiCombinedChartImage = canvas.toDataURL('image/png');
          }
        } catch (err) {
          console.error('Error capturing overlapping AI chart:', err);
        }
      }

      await exportComparisonPDF({
        candidates: selectedCandidateData,
        skillComparison: comparison.skillComparison,
        averageScores: comparison.averageScores,
        fitAssessments: comparison.fitAssessments || [],
        aiReadinessAssessments: comparison.aiReadinessAssessments || [],
        promptArchitectureAssessments: comparison.promptArchitectureAssessments || [],
        aiqAssessments: comparison.aiqAssessments || [],
        fitChartImages,
        aiChartImages,
        fitCombinedChartImage,
        aiCombinedChartImage,
      });
      
      toast({
        title: "PDF exported successfully",
        description: "Your comparison report has been downloaded.",
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

  const getCandidateName = (candidate: any) => {
    return candidate.user.firstName || candidate.user.lastName
      ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
      : candidate.user.email;
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', variant: 'default' as const };
    if (score >= 60) return { label: 'Good', variant: 'secondary' as const };
    if (score >= 40) return { label: 'Fair', variant: 'outline' as const };
    return { label: 'Developing', variant: 'outline' as const };
  };

  return (
    <div className="h-full overflow-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Candidates to Compare</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select 2-3 candidates to view side-by-side comparison
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : candidates && candidates.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {candidates.map((candidate: any) => (
                <div
                  key={candidate.user.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedCandidates.includes(candidate.user.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover-elevate'
                  }`}
                  onClick={() => toggleCandidate(candidate.user.id)}
                  data-testid={`checkbox-candidate-${candidate.user.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedCandidates.includes(candidate.user.id)}
                      disabled={
                        !selectedCandidates.includes(candidate.user.id) &&
                        selectedCandidates.length >= 3
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {candidate.user.firstName || candidate.user.lastName
                          ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
                          : 'No Name'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {candidate.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {candidate.results?.length || 0} assessments
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No candidates available</p>
          )}
        </CardContent>
      </Card>

      {selectedCandidates.length >= 2 && (
        <>
          {isComparing ? (
            <Card>
              <CardContent className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : comparison ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {selectedCandidateData?.map((candidate: any, index: number) => {
                  const fitCompleted = comparison.fitAssessments?.[index] !== null;
                  const aiReadinessCompleted = comparison.aiReadinessAssessments?.[index] !== null;
                  const promptCompleted = comparison.promptArchitectureAssessments?.[index] !== null;
                  const aiqCompleted = comparison.aiqAssessments?.[index] !== null;
                  const totalCompleted = [fitCompleted, aiReadinessCompleted, promptCompleted, aiqCompleted].filter(Boolean).length;

                  return (
                    <Card key={candidate.user.id} data-testid={`summary-card-${index}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{getCandidateName(candidate)}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Assessments Completed</span>
                            <Badge variant="outline">{totalCompleted} / 4</Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <div className={`h-2 w-2 rounded-full ${fitCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className={fitCompleted ? 'text-foreground' : 'text-muted-foreground'}>FIT Assessment</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <div className={`h-2 w-2 rounded-full ${aiReadinessCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className={aiReadinessCompleted ? 'text-foreground' : 'text-muted-foreground'}>AI Readiness</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <div className={`h-2 w-2 rounded-full ${promptCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className={promptCompleted ? 'text-foreground' : 'text-muted-foreground'}>Prompt Architecture</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <div className={`h-2 w-2 rounded-full ${aiqCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className={aiqCompleted ? 'text-foreground' : 'text-muted-foreground'}>AIQ</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* FIT Assessment Comparison */}
              {comparison.fitAssessments?.some(a => a !== null) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      FIT Assessment Comparison
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Behavioral skills assessment (6 core competencies)
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {/* Overlapping Radar Chart */}
                      <div>
                        <h3 className="font-semibold mb-4">Combined Comparison</h3>
                        <div id="pdf-comparison-fit-overlapping" className="bg-white p-4 rounded-lg">
                          <ResponsiveContainer width="100%" height={400}>
                            <RadarChart data={(() => {
                              // Merge all candidate FIT data into one dataset using user IDs as keys
                              return FIT_SKILLS.map(skill => {
                                const dataPoint: any = { skill: skill.displayName };
                                selectedCandidateData?.forEach((candidate: any, index: number) => {
                                  const fitData = comparison.fitAssessments?.[index];
                                  if (fitData) {
                                    // Use user.id as key to avoid collisions with duplicate names
                                    dataPoint[candidate.user.id] = fitData.scores[skill.key] || 0;
                                  }
                                });
                                return dataPoint;
                              });
                            })()}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                              <PolarRadiusAxis angle={90} domain={[0, 100]} />
                              {selectedCandidateData?.map((candidate: any, index: number) => {
                                if (!comparison.fitAssessments?.[index]) return null;
                                return (
                                  <Radar
                                    key={candidate.user.id}
                                    name={getCandidateName(candidate)}
                                    dataKey={candidate.user.id}
                                    stroke={CHART_COLORS[index]}
                                    fill={CHART_COLORS[index]}
                                    fillOpacity={0.3}
                                    strokeWidth={2}
                                  />
                                );
                              })}
                              <Legend />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Individual Charts */}
                      <div>
                        <h3 className="font-semibold mb-4">Individual Assessments</h3>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {selectedCandidateData?.map((candidate: any, index: number) => {
                            const fitData = comparison.fitAssessments?.[index];
                            
                            if (!fitData) {
                              return (
                                <div key={candidate.user.id} className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/20">
                                  <AlertCircle className="h-8 w-8 mb-2 text-muted-foreground opacity-50" />
                                  <p className="text-sm font-medium">{getCandidateName(candidate)}</p>
                                  <Badge variant="outline" className="mt-2">Not Completed</Badge>
                                </div>
                              );
                            }

                            const radarData = FIT_SKILLS.map(skill => ({
                              skill: skill.displayName,
                              score: fitData.scores[skill.key] || 0,
                            }));

                            return (
                              <div key={candidate.user.id} className="space-y-4">
                                <div className="text-center">
                                  <p className="font-medium" style={{ color: CHART_COLORS[index] }}>
                                    {getCandidateName(candidate)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Completed {new Date(fitData.completedAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div id={`pdf-comparison-fit-${index}`} className="bg-white p-4 rounded-lg">
                                  <ResponsiveContainer width="100%" height={300}>
                                    <RadarChart data={radarData}>
                                      <PolarGrid />
                                      <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} />
                                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                                      <Radar
                                        dataKey="score"
                                        stroke={CHART_COLORS[index]}
                                        fill={CHART_COLORS[index]}
                                        fillOpacity={0.5}
                                      />
                                    </RadarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Readiness Comparison */}
              {comparison.aiReadinessAssessments?.some(a => a !== null) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI Readiness Comparison
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Technical AI capabilities assessment (9 skills)
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {/* Overlapping Radar Chart */}
                      <div>
                        <h3 className="font-semibold mb-4">Combined Comparison</h3>
                        <div id="pdf-comparison-ai-overlapping" className="bg-white p-4 rounded-lg">
                          <ResponsiveContainer width="100%" height={400}>
                            <RadarChart data={(() => {
                              // Merge all candidate AI Readiness data into one dataset using user IDs as keys
                              return AI_READINESS_SKILLS.map(skill => {
                                const dataPoint: any = { skill: skill.displayName };
                                selectedCandidateData?.forEach((candidate: any, index: number) => {
                                  const aiData = comparison.aiReadinessAssessments?.[index];
                                  if (aiData) {
                                    // Use user.id as key to avoid collisions with duplicate names
                                    dataPoint[candidate.user.id] = aiData.scores[skill.key] || 0;
                                  }
                                });
                                return dataPoint;
                              });
                            })()}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} />
                              <PolarRadiusAxis angle={90} domain={[0, 100]} />
                              {selectedCandidateData?.map((candidate: any, index: number) => {
                                if (!comparison.aiReadinessAssessments?.[index]) return null;
                                return (
                                  <Radar
                                    key={candidate.user.id}
                                    name={getCandidateName(candidate)}
                                    dataKey={candidate.user.id}
                                    stroke={CHART_COLORS[index]}
                                    fill={CHART_COLORS[index]}
                                    fillOpacity={0.3}
                                    strokeWidth={2}
                                  />
                                );
                              })}
                              <Legend />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Individual Charts */}
                      <div>
                        <h3 className="font-semibold mb-4">Individual Assessments</h3>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {selectedCandidateData?.map((candidate: any, index: number) => {
                            const aiReadinessData = comparison.aiReadinessAssessments?.[index];
                            
                            if (!aiReadinessData) {
                              return (
                                <div key={candidate.user.id} className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/20">
                                  <AlertCircle className="h-8 w-8 mb-2 text-muted-foreground opacity-50" />
                                  <p className="text-sm font-medium">{getCandidateName(candidate)}</p>
                                  <Badge variant="outline" className="mt-2">Not Completed</Badge>
                                </div>
                              );
                            }

                            const radarData = AI_READINESS_SKILLS.map(skill => ({
                              skill: skill.displayName,
                              score: aiReadinessData.scores[skill.key] || 0,
                            }));

                            return (
                              <div key={candidate.user.id} className="space-y-4">
                                <div className="text-center">
                                  <p className="font-medium" style={{ color: CHART_COLORS[index] }}>
                                    {getCandidateName(candidate)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Completed {new Date(aiReadinessData.completedAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div id={`pdf-comparison-ai-${index}`} className="bg-white p-4 rounded-lg">
                                  <ResponsiveContainer width="100%" height={300}>
                                    <RadarChart data={radarData}>
                                      <PolarGrid />
                                      <PolarAngleAxis dataKey="skill" tick={{ fontSize: 9 }} />
                                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                                      <Radar
                                        dataKey="score"
                                        stroke={CHART_COLORS[index]}
                                        fill={CHART_COLORS[index]}
                                        fillOpacity={0.5}
                                      />
                                    </RadarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Prompt Architecture Comparison */}
              {comparison.promptArchitectureAssessments?.some(a => a !== null) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Prompt Architecture Comparison
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Progressive difficulty levels (1-7) with dimensional scoring
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium">Level</th>
                            <th className="text-left p-3 font-medium">Dimension</th>
                            {selectedCandidateData?.map((candidate: any, index: number) => (
                              <th key={candidate.user.id} className="text-left p-3 font-medium">
                                <span style={{ color: CHART_COLORS[index] }}>
                                  {getCandidateName(candidate)}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[1, 2, 3, 4, 5, 6, 7].map((level) => {
                            const dimensions = ['clarity', 'structure', 'contextRelevance', 'creativity', 'iterativeImprovement'];
                            const dimensionLabels = {
                              clarity: 'Clarity',
                              structure: 'Structure',
                              contextRelevance: 'Context Relevance',
                              creativity: 'Creativity',
                              iterativeImprovement: 'Iterative Improvement',
                            };

                            return dimensions.map((dimension, dimIndex) => (
                              <tr key={`${level}-${dimension}`} className={dimIndex === 0 ? 'border-t-2' : 'border-t'}>
                                {dimIndex === 0 && (
                                  <td className="p-3 font-semibold align-top" rowSpan={5}>
                                    Level {level}
                                  </td>
                                )}
                                <td className="p-3 text-sm">{dimensionLabels[dimension as keyof typeof dimensionLabels]}</td>
                                {selectedCandidateData?.map((candidate: any, candIndex: number) => {
                                  const promptData = comparison.promptArchitectureAssessments?.[candIndex];
                                  
                                  if (!promptData) {
                                    return (
                                      <td key={candidate.user.id} className="p-3">
                                        {dimIndex === 2 && <Badge variant="outline">Not Completed</Badge>}
                                      </td>
                                    );
                                  }

                                  const levelData = promptData.levels.find(l => l.level === level);
                                  const score = levelData?.scores?.[dimension as keyof typeof levelData.scores];

                                  return (
                                    <td key={candidate.user.id} className="p-3">
                                      {score !== undefined ? (
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold">{score}/20</span>
                                          <div 
                                            className="h-2 rounded-full bg-primary/20"
                                            style={{ width: '60px' }}
                                          >
                                            <div
                                              className="h-full rounded-full bg-primary"
                                              style={{ width: `${(score / 20) * 100}%` }}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground text-sm">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ));
                          })}
                          <tr className="border-t-2 font-semibold bg-muted/30">
                            <td className="p-3" colSpan={2}>Total Score</td>
                            {selectedCandidateData?.map((candidate: any, index: number) => {
                              const promptData = comparison.promptArchitectureAssessments?.[index];
                              return (
                                <td key={candidate.user.id} className="p-3">
                                  {promptData ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg text-primary">{promptData.totalScore}/100</span>
                                      {promptData.percentile && (
                                        <Badge variant="secondary">{promptData.percentile}th percentile</Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AIQ Comparison */}
              {comparison.aiqAssessments?.some(a => a !== null) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Algorithmic Integrity Quotient (AIQ) Comparison
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Comprehensive AI ethics, bias, fairness, and responsibility assessment
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {selectedCandidateData?.map((candidate: any, index: number) => {
                        const aiqData = comparison.aiqAssessments?.[index];
                        
                        if (!aiqData) {
                          return (
                            <div key={candidate.user.id} className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/20">
                              <AlertCircle className="h-8 w-8 mb-2 text-muted-foreground opacity-50" />
                              <p className="text-sm font-medium">{getCandidateName(candidate)}</p>
                              <Badge variant="outline" className="mt-2">Not Completed</Badge>
                            </div>
                          );
                        }

                        const performance = getPerformanceLevel(aiqData.totalScore);

                        return (
                          <Card key={candidate.user.id} className="border-2" style={{ borderColor: CHART_COLORS[index] }}>
                            <CardHeader className="text-center pb-2">
                              <p className="font-medium" style={{ color: CHART_COLORS[index] }}>
                                {getCandidateName(candidate)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Completed {new Date(aiqData.completedAt).toLocaleDateString()}
                              </p>
                            </CardHeader>
                            <CardContent className="text-center">
                              <div className="py-6">
                                <div className="text-6xl font-bold mb-2" style={{ color: CHART_COLORS[index] }}>
                                  {aiqData.totalScore}
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">out of 100</p>
                                <Badge variant={performance.variant} className="text-sm px-4 py-1">
                                  {performance.label}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Overall Skill Comparison */}
              {comparison.hasSkillData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Overall Skills Comparison
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Combined view of all skill-based assessments
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {/* Skills Radar Chart */}
                      {comparison.radarData && comparison.radarData.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-4">All Skills Combined</h3>
                          <ResponsiveContainer width="100%" height={400}>
                            <RadarChart data={comparison.radarData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="skill" />
                              <PolarRadiusAxis angle={90} domain={[0, 100]} />
                              {selectedCandidateData?.map((candidate: any, index: number) => (
                                <Radar
                                  key={candidate.user.id}
                                  name={getCandidateName(candidate)}
                                  dataKey={`candidate${index}`}
                                  stroke={CHART_COLORS[index]}
                                  fill={CHART_COLORS[index]}
                                  fillOpacity={0.3}
                                />
                              ))}
                              <Legend />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Skill-by-Skill Comparison Table */}
                      <div>
                        <h3 className="font-semibold mb-4">Skill-by-Skill Breakdown</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-3 font-medium">Skill</th>
                                {selectedCandidateData?.map((candidate: any, index: number) => (
                                  <th key={candidate.user.id} className="text-left p-3 font-medium">
                                    <span style={{ color: CHART_COLORS[index] }}>
                                      {getCandidateName(candidate)}
                                    </span>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {comparison.skillComparison?.map((row: any) => (
                                <tr key={row.skillName} className="border-b">
                                  <td className="p-3 font-medium">{row.skillName}</td>
                                  {row.scores.map((score: number | null, index: number) => (
                                    <td key={index} className="p-3">
                                      {score !== null ? (
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg font-semibold">{score}/100</span>
                                          <Badge
                                            variant={
                                              score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'outline'
                                            }
                                          >
                                            {score >= 80 ? 'Strong' : score >= 60 ? 'Good' : 'Developing'}
                                          </Badge>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">N/A</span>
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                              <tr className="border-t-2 font-semibold bg-muted/30">
                                <td className="p-3">Average Skill Score</td>
                                {comparison.averageScores?.map((avg: number, index: number) => (
                                  <td key={index} className="p-3">
                                    <span className="text-lg text-primary">{avg}/100</span>
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Export Button */}
                      <div className="flex justify-end">
                        <Button 
                          onClick={handleExportPDF}
                          data-testid="button-export-comparison"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export as PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!comparison.hasSkillData && (
                <Card>
                  <CardContent className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Skill-Based Assessments</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      The selected candidates have not completed any skill-based assessments (FIT, AI Readiness, or AIQ). 
                      Skill comparisons require at least one candidate to have completed a skill-based assessment.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </>
      )}

      {selectedCandidates.length === 1 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Select at least one more candidate to view comparison
            </p>
          </CardContent>
        </Card>
      )}

      {/* Hidden radar charts for PDF export */}
      {comparison && selectedCandidates.length >= 2 && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          {/* FIT radar charts */}
          {comparison.fitAssessments?.map((fitData, index) => {
            if (!fitData) return null;
            
            const radarData = FIT_SKILLS.map(skill => ({
              skill: skill.displayName,
              score: fitData.scores[skill.key] || 0,
            }));

            return (
              <div 
                key={`fit-${index}`}
                id={`pdf-comparison-fit-${index}`}
                style={{ width: '500px', height: '400px', backgroundColor: 'white', padding: '20px' }}
              >
                <h3 style={{ textAlign: 'center', marginBottom: '10px', color: CHART_COLORS[index] }}>
                  {getCandidateName(selectedCandidateData?.[index])} - FIT
                </h3>
                <ResponsiveContainer width="100%" height="90%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      dataKey="score"
                      stroke={CHART_COLORS[index]}
                      fill={CHART_COLORS[index]}
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            );
          })}

          {/* AI Readiness radar charts */}
          {comparison.aiReadinessAssessments?.map((aiData, index) => {
            if (!aiData) return null;
            
            const radarData = AI_READINESS_SKILLS.map(skill => ({
              skill: skill.displayName,
              score: aiData.scores[skill.key] || 0,
            }));

            return (
              <div 
                key={`ai-${index}`}
                id={`pdf-comparison-ai-${index}`}
                style={{ width: '500px', height: '400px', backgroundColor: 'white', padding: '20px' }}
              >
                <h3 style={{ textAlign: 'center', marginBottom: '10px', color: CHART_COLORS[index] }}>
                  {getCandidateName(selectedCandidateData?.[index])} - AI Readiness
                </h3>
                <ResponsiveContainer width="100%" height="90%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 9 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      dataKey="score"
                      stroke={CHART_COLORS[index]}
                      fill={CHART_COLORS[index]}
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
