import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();

  const { data: result, isLoading } = useQuery({
    queryKey: ["/api/results", id],
    enabled: isAuthenticated && !!id,
  });

  if (isLoading || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const scores = (result as any).scores || {};
  const totalScore = (result as any).totalScore;
  const hasTotalScore = totalScore !== null && totalScore !== undefined;

  // Transform scores for radar chart
  const radarData = Object.entries(scores).map(([skill, score]) => ({
    skill: skill.replace(/([A-Z])/g, ' $1').trim(), // Add spaces before capital letters
    score: score as number,
    fullMark: 100,
  }));

  // Transform scores for bar chart
  const barData = Object.entries(scores).map(([skill, score]) => ({
    skill: skill.length > 20 ? skill.substring(0, 17) + '...' : skill,
    score: score as number,
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow py-16">
        <div className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/dashboard">
              <Button variant="ghost" data-testid="button-back-to-dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold">
                {(result as any).assessmentType.toUpperCase()} Results
              </h1>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Status: {(result as any).status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Completed on {new Date((result as any).completedAt).toLocaleDateString()}
            </p>
          </div>

          {/* Overall Score - only show for assessments with total scores */}
          {hasTotalScore && (
            <Card className="p-8 mb-8">
              <div className="text-center">
                <h2 className="text-lg font-medium text-muted-foreground mb-2">
                  Overall Score
                </h2>
                <div className="text-6xl font-bold text-primary mb-2">
                  {totalScore}
                </div>
                <p className="text-muted-foreground">out of 100</p>
              </div>
            </Card>
          )}

          {/* Visualizations */}
          {Object.keys(scores).length > 0 && (
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Radar Chart */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6 text-center">Skills Radar</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis 
                      dataKey="skill" 
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 100]}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>

              {/* Bar Chart */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6 text-center">Skills Comparison</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="skill" 
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar 
                      dataKey="score" 
                      fill="hsl(var(--primary))"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* Skill Breakdown */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-6">Skill Breakdown</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(scores).map(([skill, score]: [string, any]) => (
                <Card key={skill} className="p-6">
                  <h3 className="font-semibold mb-3">{skill}</h3>
                  <div className="flex items-end gap-2">
                    <div className="text-3xl font-bold text-primary">
                      {score}
                    </div>
                    <div className="text-muted-foreground mb-1">/100</div>
                  </div>
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Interpretation Guide */}
          <Card className="p-8">
            <h2 className="text-2xl font-semibold mb-4">Score Interpretation</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Badge variant="secondary" className="min-w-[100px] justify-center">
                  80-100
                </Badge>
                <p className="text-muted-foreground">
                  <strong>Excellent:</strong> You demonstrate exceptional proficiency in this area
                </p>
              </div>
              <div className="flex items-start gap-4">
                <Badge variant="secondary" className="min-w-[100px] justify-center">
                  60-79
                </Badge>
                <p className="text-muted-foreground">
                  <strong>Strong:</strong> You show strong capabilities with room for further development
                </p>
              </div>
              <div className="flex items-start gap-4">
                <Badge variant="secondary" className="min-w-[100px] justify-center">
                  40-59
                </Badge>
                <p className="text-muted-foreground">
                  <strong>Developing:</strong> You have foundational skills that can be built upon
                </p>
              </div>
              <div className="flex items-start gap-4">
                <Badge variant="secondary" className="min-w-[100px] justify-center">
                  0-39
                </Badge>
                <p className="text-muted-foreground">
                  <strong>Emerging:</strong> This is an area for focused learning and growth
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
