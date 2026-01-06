import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, User, BarChart3, Download, Award, Brain, Target, TrendingUp, TrendingDown, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { FIT_SKILLS, AI_READINESS_SKILLS, getSkillAcronym } from "@/lib/assessmentSkills";
import SkillsLegend from "@/components/SkillsLegend";

const CHART_COLOR = "#3b82f6";

const renderInsideLabel = (props: any) => {
  const { cx, cy, x, y, value } = props;
  const insideX = cx + (x - cx) * 0.8;
  const insideY = cy + (y - cy) * 0.8;
  
  return (
    <text
      x={insideX}
      y={insideY}
      fill="#374151"
      fontSize={10}
      fontWeight="bold"
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {value}
    </text>
  );
};

interface CandidateData {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  results: Array<{
    id: string;
    assessmentType: string;
    totalScore: number;
    scores: Record<string, number>;
    completedAt: string;
    status: string;
  }>;
}

export default function IndividualReportTab() {
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const { toast } = useToast();

  const { data: candidates, isLoading } = useQuery<CandidateData[]>({
    queryKey: ['/api/admin/candidates'],
  });

  const { data: candidateReport, isLoading: isLoadingReport } = useQuery<any>({
    queryKey: ['individual-report', selectedCandidate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('userIds', selectedCandidate);
      const response = await fetch(`/api/admin/compare?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch candidate report');
      return response.json();
    },
    enabled: !!selectedCandidate,
  });

  const selectedCandidateData = candidates?.find(c => c.user.id === selectedCandidate);

  const getCandidateName = (candidate: CandidateData | undefined) => {
    if (!candidate) return 'Unknown';
    const { firstName, lastName, email } = candidate.user;
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim();
    }
    return email?.split('@')[0] || 'Unknown';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCompletedAssessments = () => {
    if (!selectedCandidateData) return [];
    return selectedCandidateData.results.filter(r => r.status === 'completed');
  };

  const fitData = candidateReport?.fitAssessments?.[0];
  const aiData = candidateReport?.aiReadinessAssessments?.[0];
  const promptData = candidateReport?.promptArchitectureAssessments?.[0];
  const aiqData = candidateReport?.aiqAssessments?.[0];

  const fitRadarData = fitData ? FIT_SKILLS.map(skill => ({
    skill: getSkillAcronym(skill.displayName),
    fullName: skill.displayName,
    score: fitData.scores[skill.key] || 0,
  })) : [];

  const aiRadarData = aiData ? AI_READINESS_SKILLS.map(skill => ({
    skill: getSkillAcronym(skill.displayName),
    fullName: skill.displayName,
    score: aiData.scores[skill.displayName] || aiData.scores[skill.key] || 0,
  })) : [];

  const getAllSkills = () => {
    const skills: Array<{ name: string; score: number; category: string }> = [];
    
    if (fitData) {
      Object.entries(fitData.scores).forEach(([name, score]) => {
        skills.push({ name, score: score as number, category: 'FIT' });
      });
    }
    
    if (aiData) {
      Object.entries(aiData.scores).forEach(([name, score]) => {
        skills.push({ name, score: score as number, category: 'AI Readiness' });
      });
    }
    
    return skills.sort((a, b) => b.score - a.score);
  };

  const getStrengthsAndWeaknesses = () => {
    const skills = getAllSkills();
    return {
      strengths: skills.slice(0, 3),
      weaknesses: skills.slice(-3).reverse(),
    };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Individual Candidate Report
          </CardTitle>
          <CardDescription>
            Select a candidate to view their detailed assessment report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
            <SelectTrigger className="w-full max-w-md" data-testid="select-individual-candidate">
              <SelectValue placeholder="Select a candidate..." />
            </SelectTrigger>
            <SelectContent>
              {candidates?.map((candidate) => (
                <SelectItem key={candidate.user.id} value={candidate.user.id}>
                  {getCandidateName(candidate)} ({candidate.user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      )}

      {selectedCandidate && isLoadingReport && (
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      )}

      {selectedCandidate && candidateReport && selectedCandidateData && (
        <>
          <Card data-testid="card-candidate-overview">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{getCandidateName(selectedCandidateData)}</CardTitle>
                  <CardDescription>{selectedCandidateData.user.email}</CardDescription>
                </div>
                <Badge variant="outline" className="text-sm">
                  {getCompletedAssessments().length} Assessments Completed
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">FIT</span>
                  </div>
                  {fitData ? (
                    <span className={`text-2xl font-bold ${getScoreColor(fitData.scores ? Object.values(fitData.scores).reduce((a: number, b: any) => a + b, 0) / Object.keys(fitData.scores).length : 0)}`}>
                      {Math.round(Object.values(fitData.scores).reduce((a: number, b: any) => a + b, 0) / Object.keys(fitData.scores).length)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not taken</span>
                  )}
                </div>
                
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">AI Readiness</span>
                  </div>
                  {aiData ? (
                    <span className={`text-2xl font-bold ${getScoreColor(Object.values(aiData.scores).reduce((a: number, b: any) => a + b, 0) / Object.keys(aiData.scores).length)}`}>
                      {Math.round(Object.values(aiData.scores).reduce((a: number, b: any) => a + b, 0) / Object.keys(aiData.scores).length)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not taken</span>
                  )}
                </div>
                
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Prompt Arch</span>
                  </div>
                  {promptData ? (
                    <span className={`text-2xl font-bold ${getScoreColor(promptData.totalScore)}`}>
                      {promptData.totalScore}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not taken</span>
                  )}
                </div>
                
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">AIQ</span>
                  </div>
                  {aiqData ? (
                    <span className={`text-2xl font-bold ${getScoreColor(aiqData.totalScore)}`}>
                      {aiqData.totalScore}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not taken</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {(fitData || aiData) && (
            <Card data-testid="card-strengths-weaknesses">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Strengths & Development Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="flex items-center gap-2 mb-4 font-semibold text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      Top Strengths
                    </h4>
                    <div className="space-y-3">
                      {getStrengthsAndWeaknesses().strengths.map((skill, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                          <div>
                            <span className="font-medium">{skill.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">{skill.category}</Badge>
                          </div>
                          <span className="font-bold text-green-600">{skill.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="flex items-center gap-2 mb-4 font-semibold text-amber-600">
                      <TrendingDown className="h-4 w-4" />
                      Development Areas
                    </h4>
                    <div className="space-y-3">
                      {getStrengthsAndWeaknesses().weaknesses.map((skill, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                          <div>
                            <span className="font-medium">{skill.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">{skill.category}</Badge>
                          </div>
                          <span className="font-bold text-amber-600">{skill.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {fitData && (
            <Card data-testid="card-fit-details">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  FIT Assessment Details
                </CardTitle>
                <CardDescription>
                  Behavioral traits and competencies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={fitRadarData} cx="50%" cy="50%" outerRadius="70%">
                        <PolarGrid />
                        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                        <Radar
                          dataKey="score"
                          stroke={CHART_COLOR}
                          fill={CHART_COLOR}
                          fillOpacity={0.5}
                          label={renderInsideLabel}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-3">
                    {Object.entries(fitData.scores).map(([skill, score]) => (
                      <div key={skill} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{skill}</span>
                          <span className={`font-medium ${getScoreColor(score as number)}`}>{score as number}%</span>
                        </div>
                        <Progress value={score as number} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
                <SkillsLegend className="mt-4" />
              </CardContent>
            </Card>
          )}

          {aiData && (
            <Card data-testid="card-ai-details">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  AI Readiness Assessment Details
                </CardTitle>
                <CardDescription>
                  Technical AI competencies and adaptability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={aiRadarData} cx="50%" cy="50%" outerRadius="70%">
                        <PolarGrid />
                        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                        <Radar
                          dataKey="score"
                          stroke={CHART_COLOR}
                          fill={CHART_COLOR}
                          fillOpacity={0.5}
                          label={renderInsideLabel}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-3">
                    {Object.entries(aiData.scores).map(([skill, score]) => (
                      <div key={skill} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="truncate max-w-[200px]">{skill}</span>
                          <span className={`font-medium ${getScoreColor(score as number)}`}>{score as number}%</span>
                        </div>
                        <Progress value={score as number} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
                <SkillsLegend className="mt-4" />
              </CardContent>
            </Card>
          )}

          {promptData && (
            <Card data-testid="card-prompt-details">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  Prompt Architecture Assessment
                </CardTitle>
                <CardDescription>
                  AI prompt engineering capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className={`text-3xl font-bold ${getScoreColor(promptData.totalScore)}`}>
                      {promptData.totalScore}%
                    </div>
                    <div className="text-sm text-muted-foreground">Total Score</div>
                  </div>
                  {promptData.percentile && (
                    <div className="text-center p-4 rounded-lg bg-muted">
                      <div className="text-3xl font-bold text-blue-600">
                        {promptData.percentile}th
                      </div>
                      <div className="text-sm text-muted-foreground">Percentile</div>
                    </div>
                  )}
                </div>
                
                {promptData.levels && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Level Breakdown</h4>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      {promptData.levels.map((level: any) => (
                        <div key={level.level} className="p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Level {level.level}</span>
                            <Badge variant={getScoreBadgeVariant(level.totalScore)}>
                              {level.totalScore}%
                            </Badge>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Clarity</span>
                              <span>{level.scores.clarity}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Structure</span>
                              <span>{level.scores.structure}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Creativity</span>
                              <span>{level.scores.creativity}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {aiqData && (
            <Card data-testid="card-aiq-details">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  AIQ Assessment
                </CardTitle>
                <CardDescription>
                  Algorithmic Integrity Quotient - AI ethics and responsibility
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="text-center p-6 rounded-lg bg-muted">
                    <div className={`text-4xl font-bold ${getScoreColor(aiqData.totalScore)}`}>
                      {aiqData.totalScore}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Overall AIQ Score</div>
                  </div>
                  
                  {aiqData.scores && Object.keys(aiqData.scores).length > 0 && (
                    <div className="flex-1 space-y-3">
                      {Object.entries(aiqData.scores).map(([category, score]) => (
                        <div key={category} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{category}</span>
                            <span className={`font-medium ${getScoreColor(score as number)}`}>{score as number}%</span>
                          </div>
                          <Progress value={score as number} className="h-2" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-assessment-history">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Assessment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getCompletedAssessments().map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <span className="font-medium capitalize">{result.assessmentType.replace(/_/g, ' ')}</span>
                        <p className="text-sm text-muted-foreground">
                          Completed {formatDate(result.completedAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getScoreBadgeVariant(result.totalScore)}>
                      {result.totalScore}%
                    </Badge>
                  </div>
                ))}
                
                {getCompletedAssessments().length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No completed assessments yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedCandidate && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Select a candidate above to view their individual report
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
