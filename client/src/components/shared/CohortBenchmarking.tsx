import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export interface AssessmentBenchmark {
  assessmentType: string;
  skillsCompared: string;
  avgPercentile: number;
  position: 'above' | 'below' | 'average';
}

export interface CohortBenchmarkingProps {
  overallPosition: number;
  totalCandidates?: number;
  assessments: AssessmentBenchmark[];
}

function getPositionBadge(position: 'above' | 'below' | 'average') {
  switch (position) {
    case 'above':
      return <Badge className="bg-green-500 text-white">Above Avg</Badge>;
    case 'below':
      return <Badge className="bg-red-500 text-white">Below Avg</Badge>;
    case 'average':
      return <Badge className="bg-amber-500 text-white">Average</Badge>;
  }
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  // Handle 11th, 12th, 13th specially (they use "th")
  if (v >= 11 && v <= 13) {
    return n + "th";
  }
  return n + (s[v % 10] || s[0]);
}

function getOverallPositionBadgeColor(position: number, totalCandidates?: number): string {
  // If we know the total, calculate percentile ranking
  if (totalCandidates && totalCandidates > 0) {
    const percentile = ((totalCandidates - position + 1) / totalCandidates) * 100;
    if (percentile >= 75) return "bg-green-500";
    if (percentile >= 50) return "bg-amber-500";
    return "bg-red-500";
  }
  // Without total, use position-based heuristics
  if (position <= 5) return "bg-green-500";
  if (position <= 10) return "bg-amber-500";
  return "bg-red-500";
}

export function CohortBenchmarking({ 
  overallPosition, 
  totalCandidates,
  assessments 
}: CohortBenchmarkingProps) {
  return (
    <Card data-testid="section-cohort-benchmarking">
      <CardHeader className="bg-muted/30">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Users className="h-5 w-5 text-primary" />
          Cohort Benchmarking
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Candidate's performance compared to other candidates in the cohort
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Overall Position Box */}
        <div className="mb-6 p-4 border rounded-lg" data-testid="container-overall-position">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-lg">Overall Cohort Position</h4>
              <p className="text-sm text-muted-foreground">
                Based on comparison with {totalCandidates ? `${totalCandidates} ` : ''}other candidates in the cohort
              </p>
            </div>
            <Badge className={`${getOverallPositionBadgeColor(overallPosition, totalCandidates)} text-white text-lg px-4 py-1`} data-testid="badge-overall-position">
              {getOrdinalSuffix(overallPosition)}
            </Badge>
          </div>
        </div>

        {/* Assessment Breakdown Table */}
        <div className="overflow-x-auto" data-testid="table-assessment-breakdown">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Assessment Type</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Skills Compared</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Avg Percentile</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Position</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((assessment, index) => (
                <tr key={index} className="border-b" data-testid={`row-assessment-${index}`}>
                  <td className="py-3 px-4 font-medium">{assessment.assessmentType}</td>
                  <td className="py-3 px-4 text-muted-foreground">{assessment.skillsCompared}</td>
                  <td className="py-3 px-4 font-semibold">{getOrdinalSuffix(assessment.avgPercentile)}</td>
                  <td className="py-3 px-4">{getPositionBadge(assessment.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
