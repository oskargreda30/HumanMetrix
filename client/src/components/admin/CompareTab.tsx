import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users, BarChart3, AlertCircle, Download } from "lucide-react";
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
import { exportComparisonPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))",
];

export default function CompareTab() {
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: candidates, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/candidates'],
  });

  const { data: comparison, isLoading: isComparing } = useQuery<{
    radarData: Array<any>;
    skillComparison: Array<{ skillName: string; scores: Array<number | null> }>;
    averageScores: Array<number>;
    hasSkillData: boolean;
  }>({
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
      await exportComparisonPDF({
        candidates: selectedCandidateData,
        skillComparison: comparison.skillComparison,
        averageScores: comparison.averageScores,
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

  return (
    <div className="space-y-6">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Comparison Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isComparing ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : comparison && !comparison.hasSkillData ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Skill-Based Assessments</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  The selected candidates have not completed any skill-based assessments (FIT, AI Readiness, or AIQ). 
                  Skill comparisons require at least one candidate to have completed a skill-based assessment.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Skills Radar Chart */}
                {comparison?.radarData && comparison.radarData.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-4">Skills Comparison</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart data={comparison.radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="skill" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        {selectedCandidateData?.map((candidate: any, index: number) => (
                          <Radar
                            key={candidate.user.id}
                            name={`${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim() || candidate.user.email}
                            dataKey={`candidate${index}`}
                            stroke={`hsl(var(--chart-${index + 1}))`}
                            fill={`hsl(var(--chart-${index + 1}))`}
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
                  <h3 className="font-semibold mb-4">Skill-by-Skill Comparison</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Skill</th>
                          {selectedCandidateData?.map((candidate: any) => (
                            <th key={candidate.user.id} className="text-left p-3 font-medium">
                              {candidate.user.firstName || candidate.user.lastName
                                ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
                                : candidate.user.email}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparison?.skillComparison?.map((row: any) => (
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
                          {comparison?.averageScores?.map((avg: number, index: number) => (
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
            )}
          </CardContent>
        </Card>
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
    </div>
  );
}
