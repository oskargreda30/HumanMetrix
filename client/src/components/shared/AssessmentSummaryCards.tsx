import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Brain, Target, CheckCircle2 } from "lucide-react";

export interface AssessmentScores {
  fitScore: number | null;
  aiReadinessScore: number | null;
  promptArchScore: number | null;
  aiqScore: number | null;
}

interface AssessmentSummaryCardsProps {
  scores: AssessmentScores;
  title?: string;
  subtitle?: string;
}

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-red-600';
  if (score >= 75) return 'text-green-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export function AssessmentSummaryCards({ 
  scores, 
  title = "Assessment Summary",
  subtitle = "All 4 assessment types for this candidate"
}: AssessmentSummaryCardsProps) {
  return (
    <Card data-testid="section-assessment-summary">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg text-center" data-testid="card-fit-score">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">FIT Assessment</span>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(scores.fitScore)}`} data-testid="text-fit-score">
              {scores.fitScore !== null ? `${scores.fitScore}%` : 'N/A'}
            </p>
          </div>
          
          <div className="p-4 bg-muted/30 rounded-lg text-center" data-testid="card-ai-score">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-cyan-500" />
              <span className="text-sm font-medium">AI Readiness</span>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(scores.aiReadinessScore)}`} data-testid="text-ai-score">
              {scores.aiReadinessScore !== null ? `${scores.aiReadinessScore}%` : 'N/A'}
            </p>
          </div>
          
          <div className="p-4 bg-muted/30 rounded-lg text-center" data-testid="card-prompt-score">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Prompt Arch.</span>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(scores.promptArchScore)}`} data-testid="text-prompt-score">
              {scores.promptArchScore !== null ? `${scores.promptArchScore}%` : 'N/A'}
            </p>
          </div>
          
          <div className="p-4 bg-muted/30 rounded-lg text-center" data-testid="card-aiq-score">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">AIQ (Ethics)</span>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(scores.aiqScore)}`} data-testid="text-aiq-score">
              {scores.aiqScore !== null ? `${scores.aiqScore}%` : 'N/A'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
