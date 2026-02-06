import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PromptArchitectureResultsProps {
  scores: Record<string, number>;
  totalScore: number;
  evaluations: any[];
}

export function PromptArchitectureResults({ scores, totalScore, evaluations }: PromptArchitectureResultsProps) {
  // Transform overall scores for radar chart
  const radarData = [
    { dimension: "Clarity (20%)", score: scores["Clarity"] || 0, weight: 20 },
    { dimension: "Structure (20%)", score: scores["Structure"] || 0, weight: 20 },
    { dimension: "Context (20%)", score: scores["Context Relevance"] || 0, weight: 20 },
    { dimension: "Creativity (20%)", score: scores["Creativity"] || 0, weight: 20 },
    { dimension: "Iterative (20%)", score: scores["Iterative Improvement"] || 0, weight: 20 },
  ];

  // Sort evaluations by level
  const sortedEvaluations = (evaluations || []).sort((a, b) => a.level - b.level);

  // Find strongest and weakest areas
  const dimensionScores = [
    { name: "Clarity", score: scores["Clarity"] || 0 },
    { name: "Structure", score: scores["Structure"] || 0 },
    { name: "Context Relevance", score: scores["Context Relevance"] || 0 },
    { name: "Creativity", score: scores["Creativity"] || 0 },
    { name: "Iterative Improvement", score: scores["Iterative Improvement"] || 0 },
  ];

  const strengths = dimensionScores.filter(d => d.score >= 14).sort((a, b) => b.score - a.score);
  const improvements = dimensionScores.filter(d => d.score < 14).sort((a, b) => a.score - b.score);

  return (
    <div className="space-y-8">
      {/* Overall Performance */}
      <Card className="p-8">
        <h2 className="text-2xl font-semibold mb-6">Overall Performance</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Total Score */}
          <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">Overall Score</div>
            <div className="text-6xl font-bold text-primary mb-2">{totalScore || 0}</div>
            <div className="text-muted-foreground">out of 100</div>
            <Badge variant={(totalScore || 0) >= 80 ? "default" : (totalScore || 0) >= 65 ? "secondary" : "outline"} className="mt-4">
              {(totalScore || 0) >= 80 ? "Excellent" : (totalScore || 0) >= 65 ? "Strong" : (totalScore || 0) >= 50 ? "Good" : "Developing"}
            </Badge>
          </div>

          {/* Bar Chart */}
          <div>
            <h3 className="text-center font-semibold mb-4">Dimension Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart layout="vertical" data={radarData} barCategoryGap="28%" margin={{ top: 5, right: 55, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <YAxis 
                  type="category" 
                  dataKey="dimension" 
                  width={130} 
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500 }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <XAxis 
                  type="number" 
                  domain={[0, 20]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <Tooltip />
                <Bar
                  name="Score"
                  dataKey="score"
                  fill="#4A7193"
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                  label={{ position: 'right', fontSize: 12, fontWeight: 600 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dimension Details */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {radarData.map((dim) => (
            <Card key={dim.dimension} className="p-4">
              <div className="text-xs text-muted-foreground mb-1">{dim.dimension.split(' (')[0]}</div>
              <div className="text-2xl font-bold text-primary">{dim.score}/20</div>
              <div className="text-xs text-muted-foreground mt-1">Weight: {dim.weight}%</div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Strengths & Development Areas */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        {strengths.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">Key Strengths</h3>
            </div>
            <div className="space-y-3">
              {strengths.map((strength) => (
                <div key={strength.name} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border-l-4 border-primary">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">{strength.name}</div>
                    <div className="text-sm text-muted-foreground">Score: {strength.score}/20 - Demonstrates strong proficiency</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Areas for Development */}
        {improvements.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="text-xl font-semibold">Development Opportunities</h3>
            </div>
            <div className="space-y-3">
              {improvements.map((improvement) => (
                <div key={improvement.name} className="flex items-start gap-3 p-3 bg-amber-500/5 rounded-lg border-l-4 border-amber-500">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">{improvement.name}</div>
                    <div className="text-sm text-muted-foreground">Score: {improvement.score}/20 - Room for improvement</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Per-Level Detailed Breakdown */}
      <Card className="p-8">
        <h2 className="text-2xl font-semibold mb-6">Level-by-Level Analysis</h2>
        <p className="text-muted-foreground mb-6">
          Each level was evaluated across five dimensions with specific weightings that contribute to your overall score.
        </p>

        <div className="space-y-6">
          {sortedEvaluations.map((evaluation) => (
            <Card key={evaluation.level} className="p-6 bg-muted/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Level {evaluation.level}</h3>
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {evaluation.totalScore}/100
                </Badge>
              </div>

              {/* Dimension Scores for This Level */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                <div className="p-3 bg-background rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Clarity</div>
                  <div className="text-lg font-bold text-primary">{evaluation.clarity || 0}/20</div>
                  <div className="text-xs text-muted-foreground">20%</div>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Structure</div>
                  <div className="text-lg font-bold text-primary">{evaluation.structure || 0}/20</div>
                  <div className="text-xs text-muted-foreground">20%</div>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Context</div>
                  <div className="text-lg font-bold text-primary">{evaluation.contextRelevance || 0}/20</div>
                  <div className="text-xs text-muted-foreground">20%</div>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Creativity</div>
                  <div className="text-lg font-bold text-primary">{evaluation.creativity || 0}/20</div>
                  <div className="text-xs text-muted-foreground">20%</div>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Iterative</div>
                  <div className="text-lg font-bold text-primary">{evaluation.iterativeImprovement || 0}/20</div>
                  <div className="text-xs text-muted-foreground">20%</div>
                </div>
              </div>

              {/* AI Feedback */}
              {evaluation.feedback && (
                <div className="p-4 bg-background rounded-lg border border-border">
                  <div className="text-sm font-semibold mb-2">Expert Feedback & Recommendations:</div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {evaluation.feedback}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </Card>

      {/* Evaluation Methodology */}
      <Card className="p-8 bg-muted/20">
        <h2 className="text-2xl font-semibold mb-4">Evaluation Methodology</h2>
        <p className="text-foreground mb-4">
          This assessment uses an AI model to evaluate your prompt engineering skills across seven progressive difficulty levels.
          Each prompt you wrote was scored on five key dimensions:
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 bg-background rounded-lg">
            <div className="font-semibold mb-2">Clarity (20% weight)</div>
            <p className="text-sm text-muted-foreground">
              How clear, specific, and unambiguous your instructions are. High scores indicate precise, easy-to-follow prompts.
            </p>
          </div>
          <div className="p-4 bg-background rounded-lg">
            <div className="font-semibold mb-2">Structure (20% weight)</div>
            <p className="text-sm text-muted-foreground">
              Organization and logical flow of your prompt. Well-structured prompts guide AI systems effectively.
            </p>
          </div>
          <div className="p-4 bg-background rounded-lg">
            <div className="font-semibold mb-2">Context Relevance (20% weight)</div>
            <p className="text-sm text-muted-foreground">
              How well you provide necessary background information and examples to achieve the desired outcome.
            </p>
          </div>
          <div className="p-4 bg-background rounded-lg">
            <div className="font-semibold mb-2">Creativity (20% weight)</div>
            <p className="text-sm text-muted-foreground">
              Innovation in problem-solving approaches and effectiveness of unconventional techniques.
            </p>
          </div>
          <div className="p-4 bg-background rounded-lg">
            <div className="font-semibold mb-2">Iterative Improvement (20% weight)</div>
            <p className="text-sm text-muted-foreground">
              Your ability to refine and improve prompts through iteration and feedback incorporation.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
