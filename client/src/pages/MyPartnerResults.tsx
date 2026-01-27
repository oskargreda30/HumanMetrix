import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle2, FileText, Brain, Shield, Zap, Lock, TrendingUp } from "lucide-react";
import { formatAssessmentName } from "@/lib/assessmentHelpers";
import { format } from "date-fns";
import { transformToRadarData, isSkillBasedAssessment, getSkillAcronym } from "@/lib/assessmentSkills";
import { getAIQBandInterpretation } from "@/data/aiq-questions";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import dashboardBg from "@assets/image_1763608498774.png";

export default function MyPartnerResults() {
  const { isAuthenticated } = useAuth();
  const [, params] = useRoute("/my-partner-results/:invitationId");
  const invitationId = params?.invitationId;

  // Fetch partner testing series
  const { data: partnerTestingSeries, isLoading } = useQuery<any[]>({
    queryKey: ["/api/partner-testing-series"],
    enabled: isAuthenticated,
  });

  // Find the specific series by invitation ID
  const series = partnerTestingSeries?.find((s: any) => s.id === invitationId);

  // Get unlocked results for this series
  const unlockedResults = series?.results?.filter((r: any) => 
    r.status === 'completed' && (r.isUnlocked || series.resultsUnlocked)
  ) || [];

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundImage: `url(${dashboardBg})`, backgroundSize: 'cover' }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!series) {
    return (
      <div 
        className="min-h-screen"
        style={{ backgroundImage: `url(${dashboardBg})`, backgroundSize: 'cover' }}
      >
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Results Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested assessment results could not be found.
            </p>
            <Link href="/dashboard">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundImage: `url(${dashboardBg})`, backgroundSize: 'cover' }}
    >
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Assessment Results</h1>
          <p className="text-muted-foreground">
            Results from your assessments with <span className="font-semibold">{series.partnerName}</span>
          </p>
        </div>

        {/* Results List */}
        <div className="space-y-6">
          {unlockedResults.length === 0 ? (
            <Card className="p-8 text-center">
              <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No Unlocked Results</h2>
              <p className="text-muted-foreground">
                Purchase access to view your detailed results.
              </p>
            </Card>
          ) : (
            unlockedResults.map((result: any) => (
              <ResultCard 
                key={result.id} 
                result={result} 
              />
            ))
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ResultCard({ result }: { result: any }) {
  const scores = result.scores || {};
  const hasScores = Object.keys(scores).length > 0;
  const isSkillBased = isSkillBasedAssessment(result.assessmentType);

  // Transform scores for radar chart
  const radarData = isSkillBased && hasScores ? transformToRadarData(result.assessmentType, scores) : [];

  // Get icon based on assessment type
  const getIcon = () => {
    switch (result.assessmentType) {
      case 'fit':
        return Brain;
      case 'ai_readiness':
        return Zap;
      case 'prompt_architecture':
        return FileText;
      case 'aiq':
        return Shield;
      default:
        return FileText;
    }
  };

  const Icon = getIcon();
  
  // Get AIQ band interpretation if applicable
  const aiqBand = result.assessmentType === 'aiq' && result.totalScore !== null 
    ? getAIQBandInterpretation(result.totalScore) 
    : null;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{formatAssessmentName(result.assessmentType)}</h2>
            {result.completedAt && (
              <p className="text-sm text-muted-foreground">
                Completed on {format(new Date(result.completedAt), 'MMMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Score Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
          <p className="text-5xl font-bold text-cyan-600 dark:text-cyan-400">
            {result.totalScore}%
          </p>
          <Badge variant="secondary" className="mt-2">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        </div>
        {result.percentile && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Percentile Ranking</p>
            <p className="text-5xl font-bold text-emerald-600 dark:text-emerald-400">
              {result.percentile}%
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              Better than {result.percentile}% of candidates
            </p>
          </div>
        )}
      </div>

      {/* AIQ Band Interpretation */}
      {aiqBand && (
        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <h3 className="font-semibold mb-2 text-purple-700 dark:text-purple-300">
            AIQ Assessment Band: {aiqBand.range} - {aiqBand.title}
          </h3>
          <p className="text-sm text-purple-600 dark:text-purple-400">
            {aiqBand.description}
          </p>
        </div>
      )}

      {/* Skill Breakdown with Radar Chart */}
      {isSkillBased && hasScores && radarData.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Skill Breakdown</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div id={`radar-chart-${result.id}`} className="h-80 bg-card rounded-lg p-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="skill" 
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                    tickFormatter={(value) => getSkillAcronym(value) || value.substring(0, 3)}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10 }}
                    tickCount={6}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Skills List */}
            <div className="space-y-3">
              {Object.entries(scores).map(([skill, score]) => (
                <div key={skill} className="flex items-center gap-4">
                  <div className="w-40 text-sm font-medium truncate" title={skill}>
                    {skill}
                  </div>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Number(score)}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm font-semibold text-right">
                    {Number(score).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Individual Skill Scores as Progress Bars (for non-skill-based or when no radar chart) */}
      {hasScores && !isSkillBased && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Detailed Scores</h3>
          <div className="space-y-3">
            {Object.entries(scores).map(([skill, score]) => (
              <div key={skill} className="flex items-center gap-4">
                <div className="w-40 text-sm font-medium truncate" title={skill}>
                  {skill}
                </div>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Number(score)}%` }}
                  />
                </div>
                <div className="w-12 text-sm font-semibold text-right">
                  {Number(score).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
