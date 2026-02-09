import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, FileText, TrendingUp, TrendingDown, BarChart3, Target, User, Award, Brain, Sparkles, ArrowLeft } from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { calculateAverageScore, FIT_SKILLS, AI_READINESS_SKILLS, getSkillAcronym, getAIReadinessScore, normalizeAIReadinessScores } from "@/lib/assessmentSkills";
import { getAIQBandInterpretation } from "@/data/aiq-questions";

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
};

const getPromptArchBandInterpretation = (score: number): { title: string; description: string } => {
  if (score >= 80) return { title: "Expert Prompt Engineer", description: "Demonstrates mastery of prompt engineering across all difficulty levels." };
  if (score >= 70) return { title: "Advanced Prompt Skills", description: "Shows strong prompt engineering capabilities with consistent performance." };
  if (score >= 50) return { title: "Competent Practitioner", description: "Demonstrates solid foundational skills in prompt construction." };
  if (score >= 30) return { title: "Developing Skills", description: "Shows basic understanding of prompt engineering principles." };
  return { title: "Foundational Level", description: "Early stage in prompt engineering development." };
};

export default function PartnerReportView() {
  const params = useParams<{ reportId: string }>();
  const reportId = params.reportId;

  const { data: reportData, isLoading, error } = useQuery<any>({
    queryKey: ['/api/partner/me/analysis-reports', reportId],
    enabled: !!reportId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Report Not Found</h2>
            <p className="text-muted-foreground mb-4">This report could not be loaded. You may need to be logged in to view it.</p>
            <div className="flex gap-2 justify-center">
              <Link href="/partner">
                <Button variant="outline" data-testid="button-back-dashboard">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fitData = reportData.fitAssessments?.[0];
  const aiData = reportData.aiReadinessAssessments?.[0];
  const promptData = reportData.promptArchitectureAssessments?.[0];
  const aiqData = reportData.aiqAssessments?.[0];

  const fitRadarData = fitData ? FIT_SKILLS.map(skill => ({
    skill: getSkillAcronym(skill.displayName),
    fullName: skill.displayName,
    score: fitData.scores?.[skill.key] || 0,
  })) : [];

  const normalizedAIScores = aiData ? normalizeAIReadinessScores(aiData.scores) : {};
  const aiRadarData = aiData ? AI_READINESS_SKILLS.map(skill => ({
    skill: getSkillAcronym(skill.displayName),
    fullName: skill.displayName,
    score: getAIReadinessScore(aiData.scores, skill.displayName),
  })) : [];

  const getAllSkills = () => {
    const skills: Array<{ name: string; score: number; category: string }> = [];
    if (fitData?.scores) {
      Object.entries(fitData.scores).forEach(([name, score]) => {
        skills.push({ name, score: score as number, category: 'FIT' });
      });
    }
    if (aiData?.scores) {
      const normalized = normalizeAIReadinessScores(aiData.scores);
      Object.entries(normalized).forEach(([name, score]) => {
        skills.push({ name, score: score as number, category: 'AI Readiness' });
      });
    }
    return skills;
  };

  const getStrengthsAndWeaknesses = () => {
    const allSkills = getAllSkills();
    const sorted = [...allSkills].sort((a, b) => b.score - a.score);
    return {
      strengths: sorted.slice(0, 3),
      weaknesses: sorted.slice(-3).reverse(),
    };
  };

  const renderIndividualReport = () => (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Assessment Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-4 rounded-lg border bg-card" data-testid="card-fit-score">
              <div className="text-sm text-muted-foreground mb-1">FIT Score</div>
              <div className={`text-2xl font-bold ${fitData ? getScoreColor(calculateAverageScore(fitData.scores)) : 'text-muted-foreground'}`} data-testid="text-fit-score">
                {fitData ? `${calculateAverageScore(fitData.scores)}%` : '-'}
              </div>
            </div>
            <div className="text-center p-4 rounded-lg border bg-card" data-testid="card-ai-readiness-score">
              <div className="text-sm text-muted-foreground mb-1">AI Readiness</div>
              <div className={`text-2xl font-bold ${aiData ? getScoreColor(calculateAverageScore(aiData.scores)) : 'text-muted-foreground'}`} data-testid="text-ai-readiness-score">
                {aiData ? `${calculateAverageScore(aiData.scores)}%` : '-'}
              </div>
            </div>
            <div className="text-center p-4 rounded-lg border bg-card" data-testid="card-prompt-score">
              <div className="text-sm text-muted-foreground mb-1">Prompt Architecture</div>
              <div className={`text-2xl font-bold ${promptData ? getScoreColor(promptData.totalScore) : 'text-muted-foreground'}`} data-testid="text-prompt-score">
                {promptData ? `${promptData.totalScore}%` : '-'}
              </div>
            </div>
            <div className="text-center p-4 rounded-lg border bg-card" data-testid="card-aiq-score">
              <div className="text-sm text-muted-foreground mb-1">AIQ (Ethics)</div>
              <div className={`text-2xl font-bold ${aiqData ? getScoreColor(aiqData.totalScore) : 'text-muted-foreground'}`} data-testid="text-aiq-score">
                {aiqData ? `${aiqData.totalScore}%` : '-'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {(fitData || aiData) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Trait Profile Summary
            </CardTitle>
            <CardDescription>Highest and lowest scoring traits across assessments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="flex items-center gap-2 mb-4 font-semibold text-blue-600">
                  <TrendingUp className="h-4 w-4" />
                  Highest Scoring Traits
                </h4>
                <div className="space-y-3">
                  {getStrengthsAndWeaknesses().strengths.map((skill, i) => (
                    <div key={i} className="flex items-center justify-between gap-1 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20" data-testid={`row-strength-${i}`}>
                      <div>
                        <span className="font-medium" data-testid={`text-strength-name-${i}`}>{skill.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{skill.category}</Badge>
                      </div>
                      <span className="font-bold text-blue-600" data-testid={`text-strength-score-${i}`}>{skill.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="flex items-center gap-2 mb-4 font-semibold text-slate-600 dark:text-slate-400">
                  <TrendingDown className="h-4 w-4" />
                  Lowest Scoring Traits
                </h4>
                <div className="space-y-3">
                  {getStrengthsAndWeaknesses().weaknesses.map((skill, i) => (
                    <div key={i} className="flex items-center justify-between gap-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/20" data-testid={`row-weakness-${i}`}>
                      <div>
                        <span className="font-medium" data-testid={`text-weakness-name-${i}`}>{skill.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{skill.category}</Badge>
                      </div>
                      <span className="font-bold text-slate-600 dark:text-slate-400" data-testid={`text-weakness-score-${i}`}>{skill.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {fitData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              FIT Assessment Details
            </CardTitle>
            <CardDescription>Behavioral trait scores - higher values indicate stronger trait presence</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-72 bg-white dark:bg-gray-900 rounded-lg p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={fitRadarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <Radar dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3" data-testid="list-fit-skills">
                {Object.entries(fitData.scores || {}).map(([skill, score]) => (
                  <div key={skill} className="space-y-1" data-testid={`row-fit-skill-${skill}`}>
                    <div className="flex justify-between gap-1 text-sm">
                      <span data-testid={`text-fit-skill-name-${skill}`}>{skill}</span>
                      <span className={`font-medium ${getScoreColor(score as number)}`} data-testid={`text-fit-skill-score-${skill}`}>{score as number}%</span>
                    </div>
                    <Progress value={score as number} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {aiData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              AI Readiness Assessment Details
            </CardTitle>
            <CardDescription>AI-related capabilities and technical readiness scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-96 bg-white dark:bg-gray-900 rounded-lg p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={aiRadarData} cx="50%" cy="50%" outerRadius="65%">
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <Radar dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto" data-testid="list-ai-skills">
                {Object.entries(normalizedAIScores).map(([skill, score]) => (
                  <div key={skill} className="space-y-1" data-testid={`row-ai-skill-${skill}`}>
                    <div className="flex justify-between gap-1 text-sm">
                      <span className="truncate" data-testid={`text-ai-skill-name-${skill}`}>{skill}</span>
                      <span className={`font-medium ${getScoreColor(score as number)}`} data-testid={`text-ai-skill-score-${skill}`}>{score as number}%</span>
                    </div>
                    <Progress value={score as number} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {promptData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Prompt Architecture Assessment
            </CardTitle>
            <CardDescription>Prompt engineering skills across difficulty levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className={`text-4xl font-bold ${getScoreColor(promptData.totalScore)}`}>
                {promptData.totalScore}%
              </div>
              <div>
                <div className="font-semibold">{getPromptArchBandInterpretation(promptData.totalScore).title}</div>
                <div className="text-sm text-muted-foreground">{getPromptArchBandInterpretation(promptData.totalScore).description}</div>
              </div>
            </div>
            {promptData.scores && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(promptData.scores).map(([level, score]) => (
                  <div key={level} className="text-center p-3 rounded-lg border bg-card">
                    <div className="text-xs text-muted-foreground mb-1">{level}</div>
                    <div className={`text-xl font-bold ${getScoreColor(score as number)}`}>{score as number}%</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {aiqData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              AIQ Assessment (AI Ethics)
            </CardTitle>
            <CardDescription>Algorithmic Integrity Quotient - understanding of AI ethics and responsible AI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className={`text-4xl font-bold ${getScoreColor(aiqData.totalScore)}`}>
                {aiqData.totalScore}%
              </div>
              <div>
                <div className="font-semibold">{getAIQBandInterpretation(aiqData.totalScore).title}</div>
                <div className="text-sm text-muted-foreground">{getAIQBandInterpretation(aiqData.totalScore).description}</div>
              </div>
            </div>
            {aiqData.scores && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(aiqData.scores).map(([key, score]) => (
                  <div key={key} className="text-center p-3 rounded-lg border bg-card">
                    <div className="text-xs text-muted-foreground mb-1">{key.replace(/_/g, ' ')}</div>
                    <div className={`text-xl font-bold ${getScoreColor(score as number)}`}>{score as number}%</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {reportData.aiInsights && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Generated Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap">{reportData.aiInsights}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );

  const renderRoleFitReport = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Role Fit Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className={`text-4xl font-bold ${getScoreColor(reportData.overallFit || 0)}`} data-testid="text-overall-fit">
            {reportData.overallFit || 0}%
          </div>
          <div>
            <div className="font-semibold">Overall Fit Score</div>
            <div className="text-sm text-muted-foreground">
              {(reportData.overallFit || 0) >= 70 ? 'Strong candidate match' :
               (reportData.overallFit || 0) >= 50 ? 'Moderate candidate match' : 'Limited candidate match'}
            </div>
          </div>
        </div>

        {reportData.skillAlignments && reportData.skillAlignments.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold">Skill Alignment</h4>
            {reportData.skillAlignments.map((skill: any, idx: number) => {
              const gap = skill.candidateScore - skill.requiredScore;
              return (
                <div key={idx} className="p-3 rounded-lg border bg-card">
                  <div className="flex justify-between items-center gap-1 mb-2 flex-wrap">
                    <span className="font-medium">{skill.skillName}</span>
                    <Badge variant={gap >= 0 ? "default" : "destructive"}>
                      {gap >= 0 ? `+${gap}%` : `${gap}%`}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-sm flex-wrap">
                    <span>Candidate: <span className={getScoreColor(skill.candidateScore)}>{skill.candidateScore}%</span></span>
                    <span>Required: {skill.requiredScore}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {reportData.analysis && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Analysis
            </h4>
            <p className="text-sm whitespace-pre-wrap">{reportData.analysis}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderProfileInsights = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Profile Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reportData.insights ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="whitespace-pre-wrap">{reportData.insights}</div>
          </div>
        ) : (
          <p className="text-muted-foreground">No insights available.</p>
        )}
      </CardContent>
    </Card>
  );

  const renderGenericReport = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Report Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-auto max-h-[70vh]" data-testid="text-report-raw">
          {JSON.stringify(reportData, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );

  const renderReportContent = () => {
    if (reportData.reportType === 'individual' || reportData.reportType === 'comparison') {
      return renderIndividualReport();
    }
    if (reportData.reportType === 'role_fit_single' || reportData.reportType === 'role_fit_multi') {
      return renderRoleFitReport();
    }
    if (reportData.reportType === 'profile_insights') {
      return renderProfileInsights();
    }
    return renderGenericReport();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-report-title">{reportData.title || 'Report Details'}</h1>
            <p className="text-sm text-muted-foreground" data-testid="text-report-date">
              Generated on {reportData.createdAt ? new Date(reportData.createdAt).toLocaleString() : 'N/A'}
              {reportData.cached && <Badge variant="secondary" className="ml-2 text-xs">Cached</Badge>}
            </p>
          </div>
          <Link href="/partner">
            <Button variant="outline" size="sm" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="space-y-6" data-testid="report-content">
          {renderReportContent()}
        </div>
      </div>
    </div>
  );
}
