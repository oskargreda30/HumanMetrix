import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, User, Calendar, Building2, TrendingUp, Target, FileText, Star, Users, MessageSquare, BarChart3, Mail, Rocket, Clock, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import SkillsLegend from "@/components/SkillsLegend";
import { normalizeAIReadinessScores } from "@/lib/assessmentSkills";
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
  // Normalize AI Readiness scores to use canonical skill names
  const normalizedScores = data.assessmentType === 'ai_readiness' 
    ? normalizeAIReadinessScores(data.scores) 
    : data.scores;
  const radarData = hasDetailedScores 
    ? Object.entries(normalizedScores)
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
                  {Object.entries(normalizedScores)
                    .filter(([_, score]) => typeof score === 'number')
                    .map(([skill, score]) => (
                    <div key={skill} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{skill}</span>
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

        {/* How to Read This Report */}
        <Card className="mb-8" data-testid="section-how-to-read">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold" data-testid="heading-how-to-read">How to Read This Report</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4" data-testid="text-guide-intro">
              A guide to interpreting candidate assessment data for informed hiring decisions
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <span className="font-medium text-sm">Score Interpretation</span>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-1">
                    <Badge className="bg-green-500 text-white text-[10px] px-1 py-0">75%+</Badge> <span>Strong performer,</span>
                    <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0">50-74%</Badge> <span>Developing,</span>
                    <Badge className="bg-red-500 text-white text-[10px] px-1 py-0">&lt;50%</Badge> <span>Needs attention</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <p className="font-medium text-sm">Radar Charts</p>
                  <p className="text-xs text-muted-foreground">
                    Visual overlays show how candidates compare across each capability dimension at a glance.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <p className="font-medium text-sm">Rankings & Percentiles</p>
                  <p className="text-xs text-muted-foreground">
                    See how each candidate ranks relative to others in the cohort and against broader benchmarks.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                <div>
                  <p className="font-medium text-sm">Strengths & Development Areas</p>
                  <p className="text-xs text-muted-foreground">
                    Each candidate's key strengths and growth areas help you understand their unique value proposition.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Skills Legend */}
        <SkillsLegend className="mb-8" compact data-testid="section-skills-legend" />

        {/* Additional Services Section */}
        <Card className="mb-8" data-testid="section-additional-services">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold text-foreground" data-testid="heading-enterprise-services">Enterprise Services</h3>
            </div>
            <p className="text-muted-foreground mb-6" data-testid="text-services-intro">
              Enhance your hiring process with our advanced enterprise solutions:
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-onboarding">
                <div className="flex items-center gap-2 mb-2">
                  <Rocket className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-foreground" data-testid="heading-service-onboarding">Onboarding Service</h4>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-service-onboarding">
                  Time to Productivity Estimate and Hiring Risk Analysis to optimize your onboarding process
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-interview">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-foreground" data-testid="heading-service-interview">Suggested Interview Questions</h4>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-service-interview">
                  AI-generated questions to dig deeper into assessment results and explore trait gaps
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-ecosystem">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-foreground" data-testid="heading-service-ecosystem">The Ecosystem Index</h4>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-service-ecosystem">
                  Comprehensive team capability diagnostic that maps skills distribution and identifies gaps
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg relative" data-testid="card-service-cohort">
                <Badge className="absolute top-2 right-2 bg-amber-500 text-white border-amber-600 text-xs">Coming Soon</Badge>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-foreground" data-testid="heading-service-cohort">Cohort Benchmarking</h4>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-service-cohort">
                  Compare your team's performance against industry benchmarks and peer organizations
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-multi-role">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-foreground" data-testid="heading-service-multi-role">Multi-Candidate Role Fit</h4>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-service-multi-role">
                  Compare multiple candidates against a specific role with ranked recommendations
                </p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-primary/5 rounded-lg flex items-center gap-3" data-testid="container-contact-email">
              <Mail className="h-5 w-5 text-primary" />
              <p className="text-sm text-foreground" data-testid="text-contact-email">
                Contact us at <a href="mailto:hello@humanmetrix.co.uk" className="font-semibold text-primary underline" data-testid="link-contact-email">hello@humanmetrix.co.uk</a> to discuss your enterprise requirements.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
