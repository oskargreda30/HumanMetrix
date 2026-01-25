import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, User, Calendar, Building2, TrendingUp, Target, Info, Star, Users, MessageSquare, BarChart3, Mail } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";

interface PartnerResultData {
  sessionId: string;
  assessmentType: string;
  externalUserId: string | null;
  externalEmail: string | null;
  completedAt: string;
  createdAt: string;
  organization: { id: string; name: string } | null;
  scores: Record<string, number>;
  overallScore: number;
  percentile: number | null;
  partnerName: string;
}

function getAssessmentLabel(type: string): string {
  const labels: Record<string, string> = {
    'fit': 'FIT Assessment',
    'fit_assessment': 'FIT Assessment',
    'ai_readiness': 'AI Readiness',
    'ai-readiness': 'AI Readiness',
    'aiq': 'Algorithmic Integrity Quotient',
    'algorithmic_integrity_quotient': 'Algorithmic Integrity Quotient',
    'prompt_architecture': 'Prompt Architecture',
    'prompt-architecture': 'Prompt Architecture',
  };
  return labels[type.toLowerCase()] || type;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-primary';
  if (score >= 40) return 'text-yellow-500';
  return 'text-red-500';
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 80) return 'default';
  if (score >= 60) return 'secondary';
  return 'outline';
}

export default function PartnerResult() {
  const [, params] = useRoute("/partner/results/:sessionId");
  const sessionId = params?.sessionId;

  const { data, isLoading, error } = useQuery<PartnerResultData>({
    queryKey: ['/api/partner/me/results', sessionId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/partner/me/results/${sessionId}`);
      return res.json();
    },
    enabled: !!sessionId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="text-destructive mb-4">
              <Target className="h-12 w-12 mx-auto opacity-50" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Unable to Load Results</h1>
            <p className="text-muted-foreground mb-4">
              {(error as Error)?.message || "This result could not be found or you don't have access to view it."}
            </p>
            <Link href="/partner">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasDetailedScores = data.scores && Object.keys(data.scores).length > 0;
  const radarData = hasDetailedScores 
    ? Object.entries(data.scores)
        .filter(([_, score]) => typeof score === 'number')
        .map(([skill, score]) => ({
          skill,
          score,
          fullMark: 100,
        }))
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <Link href="/partner">
            <Button variant="ghost" className="gap-2 mb-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {getAssessmentLabel(data.assessmentType)} Results
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  <span>{data.externalEmail || data.externalUserId || 'Anonymous'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{data.completedAt ? format(new Date(data.completedAt), 'PPP') : 'N/A'}</span>
                </div>
                {data.organization && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    <span>{data.organization.name}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className={`text-4xl font-bold ${getScoreColor(data.overallScore || 0)}`}>
                {data.overallScore || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
              {data.percentile && (
                <Badge variant="outline" className="mt-1">
                  Top {100 - data.percentile}%
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Skill Breakdown
              </CardTitle>
              <CardDescription>Detailed scores for each assessed skill</CardDescription>
            </CardHeader>
            <CardContent>
              {hasDetailedScores ? (
                <div className="space-y-4">
                  {Object.entries(data.scores)
                    .filter(([_, score]) => typeof score === 'number')
                    .map(([skill, score]) => (
                    <div key={skill} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{skill}</span>
                        <Badge variant={getScoreBadgeVariant(score)}>{score}%</Badge>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            score >= 80 ? 'bg-green-500' : 
                            score >= 60 ? 'bg-primary' : 
                            score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No skill breakdown data available.</p>
                  <p className="text-sm mt-1">
                    {data.overallScore 
                      ? `Overall score: ${data.overallScore}%` 
                      : 'Assessment data not fully captured.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {radarData.length >= 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Competency Profile
                </CardTitle>
                <CardDescription>Visual representation of skill distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--muted))" />
                      <PolarAngleAxis 
                        dataKey="skill" 
                        tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                      />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Session ID</div>
                <div className="font-mono text-xs mt-1">{data.sessionId}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Assessment Type</div>
                <div className="mt-1">{getAssessmentLabel(data.assessmentType)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Completed</div>
                <div className="mt-1">
                  {data.completedAt ? format(new Date(data.completedAt), 'PPpp') : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Partner</div>
                <div className="mt-1">{data.partnerName}</div>
              </div>
              {data.organization && (
                <div>
                  <div className="text-muted-foreground">Organization</div>
                  <div className="mt-1">{data.organization.name}</div>
                </div>
              )}
              {data.externalUserId && (
                <div>
                  <div className="text-muted-foreground">External User ID</div>
                  <div className="font-mono text-xs mt-1">{data.externalUserId}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* How to Read This Report Section */}
        <Card className="mt-6" data-testid="section-how-to-read">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-blue-500" />
              <h3 className="text-xl font-bold" data-testid="heading-how-to-read">How to Read This Report</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="guide-overall-score">
                <h4 className="font-semibold mb-2" data-testid="heading-guide-overall-score">Overall Score</h4>
                <p className="text-sm text-muted-foreground" data-testid="text-guide-overall-score">
                  The overall score represents the candidate's aggregated performance across all skill dimensions. 
                  Scores above 70 indicate strong capability, while scores below 50 may warrant development focus.
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="guide-skill-breakdown">
                <h4 className="font-semibold mb-2" data-testid="heading-guide-skill-breakdown">Skill Breakdown</h4>
                <p className="text-sm text-muted-foreground" data-testid="text-guide-skill-breakdown">
                  Individual dimension scores help identify specific strengths and areas for development. 
                  Consider these in context of your role requirements.
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="guide-radar-chart">
                <h4 className="font-semibold mb-2" data-testid="heading-guide-radar-chart">Radar Visualization</h4>
                <p className="text-sm text-muted-foreground" data-testid="text-guide-radar-chart">
                  The radar chart provides a visual overview of the candidate's profile. 
                  A balanced shape indicates well-rounded capabilities across dimensions.
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="guide-percentile">
                <h4 className="font-semibold mb-2" data-testid="heading-guide-percentile">Percentile Ranking</h4>
                <p className="text-sm text-muted-foreground" data-testid="text-guide-percentile">
                  When available, percentile shows how this candidate compares to others who have taken the same assessment.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Additional Services Section */}
        <Card className="mt-6" data-testid="section-additional-services">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold" data-testid="heading-enterprise-services">Enterprise Services</h3>
            </div>
            <p className="text-muted-foreground mb-6" data-testid="text-services-intro">
              Enhance your hiring process with our advanced enterprise solutions:
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-ecosystem">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold" data-testid="heading-service-ecosystem">The Ecosystem Index</h4>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-service-ecosystem">
                  Comprehensive team capability diagnostic that maps skills distribution and identifies gaps
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-cohort">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold" data-testid="heading-service-cohort">Cohort Benchmarking</h4>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-service-cohort">
                  Compare your team's performance against industry benchmarks and peer organizations
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-multi-role">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold" data-testid="heading-service-multi-role">Multi-Candidate Role Fit</h4>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-service-multi-role">
                  Compare multiple candidates against a specific role with ranked recommendations
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-consulting">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold" data-testid="heading-service-consulting">Strategic Consulting</h4>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-service-consulting">
                  Expert-led sessions to interpret results and develop actionable hiring strategies
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-integration">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold" data-testid="heading-service-integration">ATS Integration</h4>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-service-integration">
                  Seamless integration with your existing applicant tracking and HR systems
                </p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-primary/5 rounded-lg flex items-center gap-3" data-testid="container-contact-email">
              <Mail className="h-5 w-5 text-primary" />
              <p className="text-sm" data-testid="text-contact-email">
                Contact us at <a href="mailto:hello@humanmetrix.co.uk" className="font-semibold text-primary underline" data-testid="link-contact-email">hello@humanmetrix.co.uk</a> to discuss your enterprise requirements.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
