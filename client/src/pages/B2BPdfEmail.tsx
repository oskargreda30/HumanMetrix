import { useEffect, useState, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Mail, ArrowRight, TrendingUp, Target, AlertTriangle, Brain, Shield, Zap, FileText, Trophy, Users, BarChart3, MessageSquare, Building2, Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import SkillsLegend from "@/components/SkillsLegend";
import { normalizeAIReadinessScores, getSkillAcronym } from "@/lib/assessmentSkills";
import { getAIQBandInterpretation } from "@/data/aiq-questions";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

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
    'aiq': 'Algorithmic Integrity Quotient (AIQ)',
    'algorithmic_integrity_quotient': 'Algorithmic Integrity Quotient (AIQ)',
    'prompt_architecture': 'Prompt Architecture',
    'prompt-architecture': 'Prompt Architecture',
  };
  return labels[type.toLowerCase()] || type;
}

function getAssessmentSubtitle(type: string): string {
  const subtitles: Record<string, string> = {
    'fit': 'Behavioural Skills (15 Questions)',
    'fit_assessment': 'Behavioural Skills (15 Questions)',
    'ai_readiness': 'Technical Competencies (24 Questions)',
    'ai-readiness': 'Technical Competencies (24 Questions)',
    'aiq': 'AI Ethics & Responsible AI (8 Questions)',
    'algorithmic_integrity_quotient': 'AI Ethics & Responsible AI (8 Questions)',
    'prompt_architecture': 'AI Communication Skills (5 Prompts)',
    'prompt-architecture': 'AI Communication Skills (5 Prompts)',
  };
  return subtitles[type.toLowerCase()] || '';
}

function getAssessmentIcon(type: string) {
  const icons: Record<string, any> = {
    'fit': TrendingUp,
    'fit_assessment': TrendingUp,
    'ai_readiness': Brain,
    'ai-readiness': Brain,
    'aiq': Shield,
    'algorithmic_integrity_quotient': Shield,
    'prompt_architecture': Zap,
    'prompt-architecture': Zap,
  };
  return icons[type.toLowerCase()] || TrendingUp;
}

function getAssessmentColor(type: string): { bg: string; text: string; border: string } {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    'fit': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
    'fit_assessment': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
    'ai_readiness': { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' },
    'ai-readiness': { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' },
    'aiq': { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
    'algorithmic_integrity_quotient': { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
    'prompt_architecture': { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
    'prompt-architecture': { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
  };
  return colors[type.toLowerCase()] || { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' };
}

function getWhatItMeasures(type: string): string {
  const descriptions: Record<string, string> = {
    'fit': 'Six core behavioural skills: High Agency, Intellectual Curiosity, Resilience, Empathy & Ethics, Growth Mindset, and Interpersonal Agility.',
    'fit_assessment': 'Six core behavioural skills: High Agency, Intellectual Curiosity, Resilience, Empathy & Ethics, Growth Mindset, and Interpersonal Agility.',
    'ai_readiness': 'Nine technical competencies: AI Literacy, Technical Fundamentals, Data Fluency, Critical Thinking, Adaptability, Collaboration, Responsible AI, Creativity, and Domain Expertise.',
    'ai-readiness': 'Nine technical competencies: AI Literacy, Technical Fundamentals, Data Fluency, Critical Thinking, Adaptability, Collaboration, Responsible AI, Creativity, and Domain Expertise.',
    'aiq': 'AI ethics, bias detection, fairness, transparency, and responsible deployment using graded scoring (0-100%). Options weighted by ethical alignment: Best (100%), Acceptable (65-75%), Suboptimal (30-50%), Poor (0-25%).',
    'algorithmic_integrity_quotient': 'AI ethics, bias detection, fairness, transparency, and responsible deployment using graded scoring (0-100%). Options weighted by ethical alignment: Best (100%), Acceptable (65-75%), Suboptimal (30-50%), Poor (0-25%).',
    'prompt_architecture': 'Five dimensions of AI communication: Clarity, Structure, Context Relevance, Creativity, and Iterative Improvement in prompt design.',
    'prompt-architecture': 'Five dimensions of AI communication: Clarity, Structure, Context Relevance, Creativity, and Iterative Improvement in prompt design.',
  };
  return descriptions[type.toLowerCase()] || 'This assessment evaluates key competencies and skills.';
}

function getWorkplaceImpact(type: string): string {
  const impacts: Record<string, string> = {
    'fit': 'Predicts adaptability, initiative, collaboration quality, and resilience under pressure. High scorers drive innovation and navigate ambiguity effectively.',
    'fit_assessment': 'Predicts adaptability, initiative, collaboration quality, and resilience under pressure. High scorers drive innovation and navigate ambiguity effectively.',
    'ai_readiness': 'Indicates preparedness for AI-enhanced workflows. High scorers can leverage AI tools effectively and adapt to rapidly evolving technical environments.',
    'ai-readiness': 'Indicates preparedness for AI-enhanced workflows. High scorers can leverage AI tools effectively and adapt to rapidly evolving technical environments.',
    'aiq': 'Graded scoring captures nuanced ethical judgment. Identifies candidates who balance ethical imperatives with operational realities, making them valuable for AI governance and deployment oversight roles.',
    'algorithmic_integrity_quotient': 'Graded scoring captures nuanced ethical judgment. Identifies candidates who balance ethical imperatives with operational realities, making them valuable for AI governance and deployment oversight roles.',
    'prompt_architecture': 'Demonstrates ability to communicate effectively with AI systems. Strong performers can extract maximum value from AI tools through precise, well-structured instructions.',
    'prompt-architecture': 'Demonstrates ability to communicate effectively with AI systems. Strong performers can extract maximum value from AI tools through precise, well-structured instructions.',
  };
  return impacts[type.toLowerCase()] || 'This assessment helps identify key strengths and development areas.';
}

function getScoreInterpretation(type: string, score: number): string {
  if (type === 'aiq' || type === 'algorithmic_integrity_quotient') {
    const band = getAIQBandInterpretation(score);
    return band?.description || '';
  }
  
  if (score >= 80) {
    return 'Exceptional performance indicating mastery in this area. Demonstrates strong capabilities that can be leveraged immediately in workplace contexts.';
  } else if (score >= 70) {
    return 'Strong performance showing solid competencies. Well-positioned for success with continued development in specific areas.';
  } else if (score >= 60) {
    return 'Good foundational skills with room for growth. Development focus on specific areas will yield significant improvement.';
  } else if (score >= 50) {
    return 'Developing capabilities with clear opportunities for growth. Targeted development programs recommended.';
  } else {
    return 'Needs substantial development in this area. May underestimate the importance of key competencies. Structured training recommended.';
  }
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-green-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-red-500';
}

function getScoreBgColor(score: number): string {
  if (score >= 75) return 'bg-green-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function B2BPdfEmail() {
  const [, setLocation] = useLocation();
  const [, routeParams] = useRoute("/b2b-pdf-email/:sessionId");
  const sessionId = routeParams?.sessionId;
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");
  const isPdfRender = params.get("pdf") === "true";
  const { toast } = useToast();
  
  const [pdfStatus, setPdfStatus] = useState<'loading' | 'generating' | 'sending' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasTriggeredPdf = useRef(isPdfRender);

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
      
      const generateAndSendPdf = async () => {
        try {
          setPdfStatus('sending');
          
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
  
  const sortedScores = Object.entries(normalizedScores)
    .filter(([_, score]) => typeof score === 'number')
    .sort(([, a], [, b]) => (b as number) - (a as number));
  
  const skillCount = Object.keys(normalizedScores).length;
  const topSkill = sortedScores.length > 0 ? { name: sortedScores[0][0], score: Math.round(sortedScores[0][1] as number) } : { name: 'N/A', score: 0 };

  const isAIQ = data.assessmentType === 'aiq' || data.assessmentType === 'algorithmic_integrity_quotient';
  const aiqBand = isAIQ ? getAIQBandInterpretation(data.overallScore || 0) : null;
  const AssessmentIcon = getAssessmentIcon(data.assessmentType);
  const assessmentColors = getAssessmentColor(data.assessmentType);

  if (pdfStatus === 'success' && !isPdfRender) {
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

  if (pdfStatus === 'error' && !isPdfRender) {
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
    <div className={`min-h-screen ${isPdfRender ? 'bg-white' : 'bg-slate-50 dark:bg-slate-900'}`}>
      {!isPdfRender && (
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
      )}

      <div 
        id="b2b-pdf-results-content" 
        data-testid="results-content" 
        className={`max-w-4xl mx-auto p-6 space-y-6 ${isPdfRender ? 'pt-6' : 'pt-20'}`}
        style={isPdfRender ? { backgroundColor: 'white', color: '#1e293b' } : undefined}
      >
        {/* Header */}
        <div className="avoid-page-break" data-pdf-section="header">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2" style={isPdfRender ? { color: '#1e293b' } : undefined}>
                Partner Assessment Results
              </h1>
              <p className={isPdfRender ? '' : 'text-muted-foreground'} style={isPdfRender ? { color: '#64748b' } : undefined}>
                Results from your assessments with <span className="font-semibold">{data.partnerName}</span>
                {' • '}
                1 assessment unlocked
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics Card */}
        <Card className="avoid-page-break" data-pdf-section="metrics" style={isPdfRender ? { backgroundColor: 'white', border: '1px solid #e2e8f0' } : undefined}>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4" style={isPdfRender ? { color: '#1e293b' } : undefined}>Key Metrics</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg" style={isPdfRender ? { backgroundColor: '#f1f5f9' } : undefined}>
                <div className="text-3xl font-bold mb-1" style={{ color: '#3b82f6' }}>1</div>
                <div className="text-xs" style={isPdfRender ? { color: '#64748b' } : undefined}>Assessments Completed</div>
              </div>
              <div className="text-center p-4 rounded-lg" style={isPdfRender ? { backgroundColor: '#f1f5f9' } : undefined}>
                <div className="text-3xl font-bold mb-1" style={{ color: '#3b82f6' }}>{skillCount}</div>
                <div className="text-xs" style={isPdfRender ? { color: '#64748b' } : undefined}>Skills Assessed</div>
              </div>
              <div className="text-center p-4 rounded-lg" style={isPdfRender ? { backgroundColor: '#f1f5f9' } : undefined}>
                <div className="text-sm font-bold mb-1 px-1 leading-tight" style={{ color: '#3b82f6' }}>{topSkill.name}</div>
                <div className="text-xs" style={isPdfRender ? { color: '#64748b' } : undefined}>Top Skill ({topSkill.score})</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How to Read This Report - on first page after Key Metrics */}
        <Card className="avoid-page-break" data-pdf-section="guide" style={isPdfRender ? { backgroundColor: 'white', border: '1px solid #e2e8f0' } : undefined}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5" style={{ color: '#3b82f6' }} />
              <h3 className="text-lg font-bold" style={isPdfRender ? { color: '#1e293b' } : undefined}>How to Read This Report</h3>
            </div>
            <p className="text-sm mb-4" style={isPdfRender ? { color: '#64748b' } : undefined}>
              A step-by-step guide to understanding your assessment results and how to use them for career growth
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#3b82f6' }}>1</div>
                <div>
                  <p className="font-medium text-sm" style={isPdfRender ? { color: '#1e293b' } : undefined}>Score Interpretation</p>
                  <div className="text-xs flex flex-wrap items-center gap-1 mt-1" style={isPdfRender ? { color: '#64748b' } : undefined}>
                    <span className="px-1 py-0.5 rounded text-white text-[10px]" style={{ backgroundColor: '#22c55e' }}>75%+</span> Strong capability,
                    <span className="px-1 py-0.5 rounded text-white text-[10px]" style={{ backgroundColor: '#f59e0b' }}>50-74%</span> Developing,
                    <span className="px-1 py-0.5 rounded text-white text-[10px]" style={{ backgroundColor: '#ef4444' }}>&lt;50%</span> Growth opportunity
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#3b82f6' }}>2</div>
                <div>
                  <p className="font-medium text-sm" style={isPdfRender ? { color: '#1e293b' } : undefined}>Four Assessment Areas</p>
                  <p className="text-xs" style={isPdfRender ? { color: '#64748b' } : undefined}>Your report covers FIT (behavioral traits), AI Readiness, Prompt Architecture, and AI Ethics (AIQ) - together providing a complete picture of your capabilities.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#3b82f6' }}>3</div>
                <div>
                  <p className="font-medium text-sm" style={isPdfRender ? { color: '#1e293b' } : undefined}>Strengths & Development Areas</p>
                  <p className="text-xs" style={isPdfRender ? { color: '#64748b' } : undefined}>Each section highlights your strengths to leverage in interviews and development areas to focus on for career growth.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#3b82f6' }}>4</div>
                <div>
                  <p className="font-medium text-sm" style={isPdfRender ? { color: '#1e293b' } : undefined}>Using Your Results</p>
                  <p className="text-xs" style={isPdfRender ? { color: '#64748b' } : undefined}>Share your report with potential employers to demonstrate your capabilities, or use insights to guide your professional development plan.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#3b82f6' }}>5</div>
                <div>
                  <p className="font-medium text-sm" style={isPdfRender ? { color: '#1e293b' } : undefined}>Radar Chart Visualization</p>
                  <p className="text-xs" style={isPdfRender ? { color: '#64748b' } : undefined}>The radar chart provides a visual overview of your skills profile, making it easy to identify patterns across dimensions.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#3b82f6' }}>6</div>
                <div>
                  <p className="font-medium text-sm" style={isPdfRender ? { color: '#1e293b' } : undefined}>Individual Skill Scores</p>
                  <p className="text-xs" style={isPdfRender ? { color: '#64748b' } : undefined}>Review detailed scores for each skill to understand your specific competencies and target areas for improvement.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessment Results Card */}
        <Card className="page-break-before avoid-page-break" data-pdf-section="assessment" style={isPdfRender ? { backgroundColor: 'white', border: '1px solid #e2e8f0' } : undefined}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${assessmentColors.bg}`}>
                  <AssessmentIcon className={`h-5 w-5 ${assessmentColors.text}`} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold" style={isPdfRender ? { color: '#1e293b' } : undefined}>{getAssessmentLabel(data.assessmentType)}</h2>
                  <p className="text-sm" style={isPdfRender ? { color: '#64748b' } : undefined}>{getAssessmentSubtitle(data.assessmentType)}</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getScoreColor(data.overallScore)}`}>{Math.round(data.overallScore)}%</div>
                <div className="text-xs" style={isPdfRender ? { color: '#64748b' } : undefined}>
                  {isAIQ && aiqBand ? aiqBand.title : 'Overall Score'}
                </div>
              </div>
            </div>

            {/* What It Measures & Workplace Impact */}
            <div className={`grid md:grid-cols-2 gap-4 mb-6 p-4 rounded-lg border ${assessmentColors.border}`} style={isPdfRender ? { backgroundColor: '#f8fafc' } : undefined}>
              <div>
                <div className={`text-sm font-semibold mb-2 ${assessmentColors.text}`}>What It Measures</div>
                <p className="text-sm" style={isPdfRender ? { color: '#64748b' } : undefined}>{getWhatItMeasures(data.assessmentType)}</p>
              </div>
              <div>
                <div className={`text-sm font-semibold mb-2 ${assessmentColors.text}`}>Workplace Impact</div>
                <p className="text-sm" style={isPdfRender ? { color: '#64748b' } : undefined}>{getWorkplaceImpact(data.assessmentType)}</p>
              </div>
            </div>

            {/* Overall Score Display */}
            <div className="text-center mb-6">
              <div className={`text-6xl font-bold ${getScoreColor(data.overallScore)}`}>{Math.round(data.overallScore)}%</div>
              {data.percentile && (
                <Badge variant="secondary" className="mt-2">
                  {data.percentile}th Percentile
                </Badge>
              )}
            </div>

            {/* Score Interpretation */}
            <div className="p-4 rounded-lg" style={isPdfRender ? { backgroundColor: '#f8fafc' } : undefined}>
              <div className={`text-sm font-semibold mb-2 ${assessmentColors.text}`}>Score Interpretation</div>
              <p className="text-sm" style={isPdfRender ? { color: '#64748b' } : undefined}>
                {getScoreInterpretation(data.assessmentType, data.overallScore)}
              </p>
            </div>

            {/* Skill Scores */}
            {hasDetailedScores && (
              <div className="mt-6">
                <div className="text-sm font-medium mb-3" style={isPdfRender ? { color: '#64748b' } : undefined}>Individual Skill Scores</div>
                <div className="space-y-3">
                  {sortedScores.map(([skill, score], index) => (
                    <div key={skill} className="flex items-center justify-between gap-4" data-testid={`row-skill-${index}`}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge variant="outline" className="text-xs shrink-0" style={isPdfRender ? { borderColor: '#3b82f6', color: '#3b82f6' } : undefined}>
                          {getSkillAcronym(skill)}
                        </Badge>
                        <span className="text-sm truncate" style={isPdfRender ? { color: '#1e293b' } : undefined}>{skill}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-32 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#e2e8f0' }}>
                          <div 
                            className={`h-full ${getScoreBgColor(score as number)}`}
                            style={{ width: `${Math.min(100, score as number)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium w-12 text-right ${getScoreColor(score as number)}`}>
                          {Math.round(score as number)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skills Bar Chart Visualization */}
        {hasDetailedScores && (
          <Card className="page-break-before avoid-page-break" data-pdf-section="radar" style={isPdfRender ? { backgroundColor: 'white', border: '1px solid #e2e8f0' } : undefined}>
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold mb-4 text-center" style={isPdfRender ? { color: '#1e293b' } : undefined}>Skills Overview</h3>
              <div className="flex justify-center">
                <ResponsiveContainer width={400} height={300}>
                  <BarChart layout="vertical" data={sortedScores.map(([skill, score]) => ({
                    skill: getSkillAcronym(skill),
                    score: Math.round(score as number),
                    fullMark: 100
                  }))} margin={{ top: 5, right: 55, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isPdfRender ? '#e2e8f0' : 'hsl(var(--border))'} horizontal={false} />
                    <YAxis type="category" dataKey="skill" width={120} tick={{ fill: isPdfRender ? '#1e293b' : 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: isPdfRender ? '#64748b' : 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <Bar dataKey="score" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fontSize: 12, fontWeight: 600 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Skills Legend */}
        <div data-pdf-section="legend" className="page-break-before">
          <Card style={isPdfRender ? { backgroundColor: 'white', border: '1px solid #e2e8f0' } : undefined}>
            <CardContent className="pt-6">
              <SkillsLegend forPdf={isPdfRender} />
            </CardContent>
          </Card>
        </div>

        {/* Career Development Services */}
        <Card className="page-break-before avoid-page-break" data-pdf-section="services" style={isPdfRender ? { backgroundColor: 'white', border: '1px solid #e2e8f0' } : undefined}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5" style={{ color: '#3b82f6' }} />
              <h3 className="text-lg font-bold" style={isPdfRender ? { color: '#1e293b' } : undefined}>Career Development Services</h3>
            </div>
            <p className="text-sm mb-4" style={isPdfRender ? { color: '#64748b' } : undefined}>
              HumanMetrix offers additional analysis services to support your career journey:
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg" style={isPdfRender ? { backgroundColor: '#f8fafc' } : undefined}>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4" style={{ color: '#3b82f6' }} />
                  <h4 className="font-semibold text-sm" style={isPdfRender ? { color: '#1e293b' } : undefined}>Career Fit Analysis</h4>
                </div>
                <p className="text-xs" style={isPdfRender ? { color: '#64748b' } : undefined}>Discover which roles and industries best match your skills, traits, and working style</p>
              </div>
              <div className="p-4 rounded-lg" style={isPdfRender ? { backgroundColor: '#f8fafc' } : undefined}>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4" style={{ color: '#3b82f6' }} />
                  <h4 className="font-semibold text-sm" style={isPdfRender ? { color: '#1e293b' } : undefined}>Interview Preparation Guide</h4>
                </div>
                <p className="text-xs" style={isPdfRender ? { color: '#64748b' } : undefined}>Customized questions you're likely to face based on your profile, with strategies to highlight your strengths</p>
              </div>
              <div className="p-4 rounded-lg" style={isPdfRender ? { backgroundColor: '#f8fafc' } : undefined}>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4" style={{ color: '#3b82f6' }} />
                  <h4 className="font-semibold text-sm" style={isPdfRender ? { color: '#1e293b' } : undefined}>Work Style Compatibility</h4>
                </div>
                <p className="text-xs" style={isPdfRender ? { color: '#64748b' } : undefined}>Understand how you collaborate and what team environments help you thrive</p>
              </div>
              <div className="p-4 rounded-lg" style={isPdfRender ? { backgroundColor: '#f8fafc' } : undefined}>
                <div className="flex items-center gap-2 mb-2">
                  <Rocket className="h-4 w-4" style={{ color: '#3b82f6' }} />
                  <h4 className="font-semibold text-sm" style={isPdfRender ? { color: '#1e293b' } : undefined}>Career Acceleration Roadmap</h4>
                </div>
                <p className="text-xs" style={isPdfRender ? { color: '#64748b' } : undefined}>Personalized development plan with skills to prioritize for faster career progression</p>
              </div>
              <div className="p-4 rounded-lg" style={isPdfRender ? { backgroundColor: '#f8fafc' } : undefined}>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4" style={{ color: '#3b82f6' }} />
                  <h4 className="font-semibold text-sm" style={isPdfRender ? { color: '#1e293b' } : undefined}>Strengths & Growth Areas</h4>
                </div>
                <p className="text-xs" style={isPdfRender ? { color: '#64748b' } : undefined}>Comprehensive self-awareness report highlighting your competitive advantages and areas for development</p>
              </div>
            </div>
            <div className="mt-6 p-4 rounded-lg flex items-center gap-3" style={isPdfRender ? { backgroundColor: '#eff6ff' } : undefined}>
              <Mail className="h-5 w-5" style={{ color: '#3b82f6' }} />
              <div>
                <p className="text-sm" style={isPdfRender ? { color: '#1e293b' } : undefined}>
                  Contact us at <a href="mailto:hello@humanmetrix.co.uk" className="underline" style={{ color: '#3b82f6' }}>hello@humanmetrix.co.uk</a> to learn more about our career development services.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div data-testid="pdf-ready" style={{ display: 'none' }} />
      </div>
    </div>
  );
}
