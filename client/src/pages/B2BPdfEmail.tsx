import { useEffect, useState, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Mail, ArrowRight, TrendingUp, Target, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import SkillsLegend from "@/components/SkillsLegend";
import { normalizeAIReadinessScores } from "@/lib/assessmentSkills";
import { getAIQBandInterpretation } from "@/data/aiq-questions";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface B2BSessionData {
  sessionId: string;
  assessmentType: string;
  email: string;
  partnerName: string;
  scores: Record<string, number>;
  overallScore: number;
  percentile: number | null;
  completedAt: string;
  resultsDeliveryStatus?: string;
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

function generateAnalysis(assessmentType: string, scores: Record<string, number>, totalScore?: number) {
  const sortedSkills = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));
  const strengths = sortedSkills.filter(([_, score]) => (score as number) >= 70);
  const improvements = sortedSkills.filter(([_, score]) => (score as number) < 70);
  
  const analysis = {
    strengths: [] as string[],
    improvements: [] as string[],
    overall: "",
  };
  
  if (strengths.length > 0) {
    analysis.strengths = strengths.slice(0, 3).map(([skill, score]) => 
      `${skill} (${Math.round(score as number)}%)`
    );
  }
  
  if (improvements.length > 0) {
    analysis.improvements = improvements.slice(-3).reverse().map(([skill, score]) => 
      `${skill} (${Math.round(score as number)}%)`
    );
  }
  
  if (assessmentType === 'fit') {
    analysis.overall = "This FIT assessment evaluates core behavioral competencies essential for workplace success and team collaboration.";
  } else if (assessmentType === 'ai_readiness') {
    analysis.overall = "This AI Readiness assessment measures preparedness for AI-enhanced work environments and adaptability to emerging technologies.";
  } else if (assessmentType === 'aiq') {
    analysis.overall = "The Algorithmic Integrity Quotient measures ethical reasoning and decision-making capabilities in AI-related contexts.";
  } else if (assessmentType === 'prompt_architecture') {
    analysis.overall = "This Prompt Architecture assessment evaluates the ability to effectively communicate with and leverage AI systems.";
  }
  
  return analysis;
}

export default function B2BPdfEmail() {
  const [, setLocation] = useLocation();
  const [, routeParams] = useRoute("/b2b-pdf-email/:sessionId");
  const sessionId = routeParams?.sessionId;
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");
  const { toast } = useToast();
  
  const [pdfStatus, setPdfStatus] = useState<'loading' | 'generating' | 'sending' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasTriggeredPdf = useRef(false);

  const { data, isLoading, error } = useQuery<B2BSessionData>({
    queryKey: ['/api/b2b/session-results', sessionId, email],
    queryFn: async () => {
      if (!email) {
        throw new Error('Email required for verification');
      }
      const res = await fetch(`/api/b2b/session-results/${sessionId}?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to load session');
      }
      return res.json();
    },
    enabled: !!sessionId && !!email,
  });

  useEffect(() => {
    if (data && !hasTriggeredPdf.current && pdfStatus === 'loading') {
      hasTriggeredPdf.current = true;
      setPdfStatus('generating');
      
      // Use server-side PDF generation for exact styling match
      const generateAndSendPdf = async () => {
        try {
          setPdfStatus('sending');
          
          // Call server-side PDF generation endpoint
          const res = await apiRequest("POST", `/api/b2b/results/${sessionId}/generate-pdf`, {
            email: data.email,
            sendEmail: true,
          });
          
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to generate and send PDF');
          }
          
          setPdfStatus('success');
          
          toast({
            title: "PDF Sent!",
            description: `Your results PDF has been sent to ${data.email}`,
          });
        } catch (err: any) {
          console.error('Server-side PDF generation error:', err);
          setErrorMessage(err.message || 'Failed to generate or send PDF');
          setPdfStatus('error');
        }
      };
      
      // Small delay to show loading state
      setTimeout(generateAndSendPdf, 500);
    }
  }, [data, pdfStatus, sessionId, toast]);

  if (!sessionId || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-semibold mb-2">Invalid Link</h1>
            <p className="text-muted-foreground">
              This link appears to be invalid or missing required information. Please go back and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-semibold mb-2">Unable to Load</h1>
            <p className="text-muted-foreground">
              {(error as Error).message || 'Failed to load session information.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const hasDetailedScores = data.scores && Object.keys(data.scores).length > 0;
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

  const barData = hasDetailedScores
    ? Object.entries(normalizedScores)
        .filter(([_, score]) => typeof score === 'number')
        .map(([skill, score]) => ({
          skill: skill.length > 20 ? skill.substring(0, 17) + '...' : skill,
          score,
        }))
    : [];

  const analysis = generateAnalysis(data.assessmentType, normalizedScores, data.overallScore);
  const isAIQ = data.assessmentType === 'aiq';
  const aiqBand = isAIQ ? getAIQBandInterpretation(data.overallScore || 0) : null;

  if (pdfStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        
        <Card className="relative max-w-lg w-full p-8 space-y-6 bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">PDF Sent Successfully!</h1>
            <p className="text-slate-600">
              Your {getAssessmentLabel(data.assessmentType)} results have been sent to your email.
            </p>
            
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mt-4">
              <div className="flex items-center gap-3 justify-center">
                <Mail className="h-5 w-5 text-cyan-600" />
                <p className="text-slate-700">
                  Sent to <strong>{data.email}</strong>
                </p>
              </div>
            </div>
            
            <div className="pt-4">
              <Button
                onClick={() => setLocation(`/b2b-results/${sessionId}`)}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
                data-testid="button-continue"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (pdfStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
        
        <Card className="relative max-w-lg w-full p-8 space-y-6 bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Something Went Wrong</h1>
            <p className="text-slate-600">
              {errorMessage || 'We couldn\'t generate or send your PDF. Please try again.'}
            </p>
            
            <div className="pt-4 space-y-2">
              <Button
                onClick={() => {
                  hasTriggeredPdf.current = false;
                  setPdfStatus('loading');
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
                data-testid="button-retry"
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation(`/b2b-results/${sessionId}`)}
                className="w-full"
                data-testid="button-skip"
              >
                Skip for Now
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-medium">
            {pdfStatus === 'loading' && 'Loading your results...'}
            {pdfStatus === 'generating' && 'Generating your PDF report (this may take a moment)...'}
            {pdfStatus === 'sending' && 'Sending to your email...'}
          </span>
        </div>
      </div>

      <div id="b2b-pdf-results-content" data-testid="results-content" className="max-w-4xl mx-auto p-6 pt-20 space-y-6">
        <div data-pdf-section="summary" className="space-y-6 bg-white p-6 rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">{getAssessmentLabel(data.assessmentType)} Results</h1>
              <p className="text-muted-foreground">Completed with {data.partnerName}</p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              Score: {Math.round(data.overallScore)}%
            </Badge>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                How to Read This Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                This comprehensive assessment provides insights into your {data.assessmentType === 'aiq' ? 'ethical reasoning capabilities' : 'skills and competencies'}. 
                Scores above 70% indicate strong performance, while areas below 60% represent development opportunities.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20">
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">Overall Score</p>
                <div className="flex items-center justify-center gap-2">
                  <span className={`text-6xl font-bold ${getScoreColor(data.overallScore)}`}>
                    {Math.round(data.overallScore)}
                  </span>
                  <span className="text-2xl text-muted-foreground">/ 100</span>
                </div>
                {data.percentile && (
                  <Badge variant="secondary" className="mt-4 text-base">
                    {data.percentile}th Percentile
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {isAIQ && aiqBand && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  AIQ Band: {aiqBand.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{aiqBand.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {hasDetailedScores && (
          <div data-pdf-section="visualizations" className="bg-white p-6 rounded-lg grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skills Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis 
                      dataKey="skill" 
                      tick={{ fontSize: 10, fill: 'currentColor' }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.5}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skills Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <YAxis 
                      dataKey="skill" 
                      type="category" 
                      width={100}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip />
                    <Bar 
                      dataKey="score" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        <div data-pdf-section="analysis" className="bg-white p-6 rounded-lg">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Comprehensive Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">{analysis.overall}</p>
              
              {analysis.strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-600 mb-2">Key Strengths</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {analysis.strengths.map((strength, i) => (
                      <li key={i}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {analysis.improvements.length > 0 && (
                <div>
                  <h4 className="font-semibold text-amber-600 mb-2">Development Opportunities</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {analysis.improvements.map((improvement, i) => (
                      <li key={i}>{improvement}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {hasDetailedScores && (
          <div data-pdf-section="legend" className="bg-white p-6 rounded-lg">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skills Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <SkillsLegend />
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Hidden marker for Puppeteer to detect page is fully rendered */}
        <div data-testid="pdf-ready" style={{ display: 'none' }} />
      </div>
    </div>
  );
}
