import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, FileText, TrendingUp, TrendingDown, BarChart3, Target, User, Award,
  Brain, Sparkles, ArrowLeft, Calendar, Shield, Lightbulb, BookOpen, Users, AlertCircle, Download,
  Rocket, MessageSquare, Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";
import { calculateAverageScore, FIT_SKILLS, AI_READINESS_SKILLS, getSkillAcronym, getAIReadinessScore, normalizeAIReadinessScores } from "@/lib/assessmentSkills";
import { getAIQBandInterpretation } from "@/data/aiq-questions";
import { HowToReadReport, type ReportType } from "@/components/shared/HowToReadReport";
import SkillsLegend from "@/components/SkillsLegend";
import { EnquiryModal } from "@/components/EnquiryModal";
import hmLogoPath from "@assets/Gemini_Generated_Image_misel3misel3mise-removebg-preview_1762775600899.png";

const CHART_COLORS = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6', '#ec4899'];

const getScoreColor = (score: number) => {
  if (score >= 75) return 'text-green-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
};

const getPromptArchBandInterpretation = (score: number): { title: string; description: string } => {
  if (score >= 80) return { title: "Expert Prompt Engineer", description: "Demonstrates mastery of prompt engineering across all difficulty levels." };
  if (score >= 70) return { title: "Advanced Prompt Skills", description: "Shows strong prompt engineering capabilities with consistent performance." };
  if (score >= 50) return { title: "Competent Practitioner", description: "Demonstrates solid foundational skills in prompt construction." };
  if (score >= 30) return { title: "Developing Skills", description: "Shows basic understanding of prompt engineering principles." };
  return { title: "Foundational Level", description: "Early stage in prompt engineering development." };
};

function getHowToReadReportType(reportType: string): ReportType {
  if (reportType === 'comparison') return 'comparison';
  if (reportType === 'role_fit_single') return 'rolefit';
  if (reportType === 'role_fit_multi') return 'rolefit_multi';
  return 'individual';
}

const SECTION_ICONS: Record<string, { color: string; icon: any }> = {
  'ROLE SUITABILITY': { color: 'text-blue-600 dark:text-blue-400', icon: Target },
  'OPTIMAL ENVIRONMENT': { color: 'text-teal-600 dark:text-teal-400', icon: Users },
  'KEY STRENGTHS': { color: 'text-green-600 dark:text-green-400', icon: TrendingUp },
  'DEVELOPMENT FOCUS': { color: 'text-amber-600 dark:text-amber-400', icon: Target },
  'OVERALL ASSESSMENT AND RECOMMENDATION': { color: 'text-purple-600 dark:text-purple-400', icon: Award },
  'KEY DIFFERENTIATORS': { color: 'text-blue-600 dark:text-blue-400', icon: TrendingUp },
  'COMPLEMENTARY STRENGTHS': { color: 'text-green-600 dark:text-green-400', icon: Award },
  'HIRING CONSIDERATION': { color: 'text-purple-600 dark:text-purple-400', icon: Sparkles },
};

function MarkdownContent({ text, testId }: { text: string; testId?: string }) {
  const paragraphs = text.split('\n\n').filter(p => p.trim());

  const renderInlineFormatting = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      const boldMatch = part.match(/^\*\*(.+)\*\*$/);
      if (boldMatch) {
        return <strong key={i} className="font-semibold text-foreground">{boldMatch[1]}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const parsedSections: Array<{ heading: string; content: string; color: string; icon: any }> = [];
  let currentSection: { heading: string; content: string; color: string; icon: any } | null = null;

  for (const para of paragraphs) {
    const headingMatch = para.match(/^\*\*([A-Z][A-Z\s&]+(?:AND\s+[A-Z]+)?)\*\*[:\s]*([\s\S]*)/);
    if (headingMatch) {
      if (currentSection) parsedSections.push(currentSection);
      const headingKey = headingMatch[1].trim();
      const sectionMeta = SECTION_ICONS[headingKey] || { color: 'text-primary', icon: Sparkles };
      currentSection = {
        heading: headingKey,
        content: headingMatch[2].trim(),
        color: sectionMeta.color,
        icon: sectionMeta.icon,
      };
    } else if (currentSection) {
      currentSection.content += '\n\n' + para;
    } else {
      const headingOnlyMatch = para.match(/^\*\*(.+?)\*\*\s*$/);
      if (headingOnlyMatch) {
        if (currentSection) parsedSections.push(currentSection);
        const headingKey = headingOnlyMatch[1].trim();
        const sectionMeta = SECTION_ICONS[headingKey] || { color: 'text-primary', icon: Sparkles };
        currentSection = {
          heading: headingKey,
          content: '',
          color: sectionMeta.color,
          icon: sectionMeta.icon,
        };
      } else {
        if (currentSection) parsedSections.push(currentSection);
        currentSection = null;
        parsedSections.push({ heading: '', content: para, color: '', icon: null });
      }
    }
  }
  if (currentSection) parsedSections.push(currentSection);

  if (parsedSections.length === 0) {
    return (
      <div data-testid={testId} className="prose prose-sm max-w-none dark:prose-invert">
        <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid={testId}>
      {parsedSections.map((section, idx) => {
        if (section.heading && section.icon) {
          const IconComponent = section.icon;
          const lines = section.content.split('\n').filter(l => l.trim());
          const hasBullets = lines.some(l => /^\s*[-•]\s/.test(l));

          return (
            <div key={idx} className="p-4 rounded-lg bg-muted/30 border">
              <h4 className={`text-sm font-bold ${section.color} uppercase tracking-wide mb-3 flex items-center gap-2`}>
                <IconComponent className="h-4 w-4" />
                {section.heading}
              </h4>
              {hasBullets ? (
                <ul className="space-y-1.5">
                  {lines.map((line, i) => {
                    const cleanLine = line.replace(/^\s*[-•]\s*/, '').trim();
                    if (!cleanLine) return null;
                    return (
                      <li key={i} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                        <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${section.color.split(' ').map(c => c.replace('text-', 'bg-')).join(' ')}`} />
                        {renderInlineFormatting(cleanLine)}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="space-y-2">
                  {lines.map((line, i) => (
                    <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                      {renderInlineFormatting(line.trim())}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        }

        const lines = section.content.split('\n').filter(l => l.trim());
        const hasBullets = lines.some(l => /^\s*[-•]\s/.test(l));

        if (hasBullets) {
          return (
            <ul key={idx} className="space-y-1.5 pl-1">
              {lines.map((line, i) => {
                const cleanLine = line.replace(/^\s*[-•]\s*/, '').trim();
                if (!cleanLine) return null;
                return (
                  <li key={i} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 bg-primary" />
                    {renderInlineFormatting(cleanLine)}
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
            {renderInlineFormatting(section.content)}
          </p>
        );
      })}
    </div>
  );
}

function ReportHeader({ title, createdAt, reportType, cached, onExportPDF, isExporting }: { title: string; createdAt?: string; reportType?: string; cached?: boolean; onExportPDF?: () => void; isExporting?: boolean }) {
  const reportTypeLabels: Record<string, string> = {
    individual: 'Individual Assessment Report',
    comparison: 'Candidate Comparison Report',
    role_fit_single: 'Role Fit Analysis',
    role_fit_multi: 'Multi-Candidate Role Fit',
    profile_insights: 'Profile Insights Report',
    compare_insights: 'Comparison Insights Report',
    assessment: 'Assessment Report',
  };

  const typeLabel = reportType ? reportTypeLabels[reportType] || 'Analysis Report' : 'Analysis Report';

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <img src={hmLogoPath} alt="HumanMetrix" className="h-10 w-10" data-testid="img-report-logo" />
        <div>
          <h2 className="text-sm font-medium text-primary tracking-wide uppercase" data-testid="text-report-brand">HumanMetrix</h2>
          <p className="text-xs text-muted-foreground">{typeLabel}</p>
        </div>
      </div>
      <Separator className="mb-4" />
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" data-testid="text-report-title">
            {title || 'Report Details'}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid="text-report-date">
              <Calendar className="h-3.5 w-3.5" />
              Generated on {createdAt ? new Date(createdAt).toLocaleString() : 'N/A'}
            </div>
            {cached && <Badge variant="secondary" className="text-xs">Saved Report</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onExportPDF && (
            <Button
              size="sm"
              onClick={onExportPDF}
              disabled={isExporting}
              data-testid="button-export-pdf-top"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  Export PDF
                </>
              )}
            </Button>
          )}
          <Link href="/partner">
            <Button variant="outline" size="sm" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function CandidateAssessmentSection({ candidateData, candidateIndex, candidateName, color, renderAfterOverview }: {
  candidateData: { fitData: any; aiData: any; promptData: any; aiqData: any };
  candidateIndex: number;
  candidateName: string;
  color: string;
  renderAfterOverview?: React.ReactNode;
}) {
  const { fitData, aiData, promptData, aiqData } = candidateData;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-lg font-semibold" data-testid={`text-candidate-name-${candidateIndex}`}>{candidateName}</h3>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Assessment Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-4 rounded-lg border bg-card" data-testid={`card-fit-score-${candidateIndex}`}>
              <div className="text-sm text-muted-foreground mb-1">FIT Score</div>
              <div className={`text-2xl font-bold ${fitData ? getScoreColor(calculateAverageScore(fitData.scores)) : 'text-muted-foreground'}`}>
                {fitData ? `${calculateAverageScore(fitData.scores)}%` : '-'}
              </div>
            </div>
            <div className="text-center p-4 rounded-lg border bg-card" data-testid={`card-ai-readiness-score-${candidateIndex}`}>
              <div className="text-sm text-muted-foreground mb-1">AI Readiness</div>
              <div className={`text-2xl font-bold ${aiData ? getScoreColor(calculateAverageScore(aiData.scores)) : 'text-muted-foreground'}`}>
                {aiData ? `${calculateAverageScore(aiData.scores)}%` : '-'}
              </div>
            </div>
            <div className="text-center p-4 rounded-lg border bg-card" data-testid={`card-prompt-score-${candidateIndex}`}>
              <div className="text-sm text-muted-foreground mb-1">Prompt Architecture</div>
              <div className={`text-2xl font-bold ${promptData ? getScoreColor(promptData.totalScore) : 'text-muted-foreground'}`}>
                {promptData ? `${promptData.totalScore}%` : '-'}
              </div>
            </div>
            <div className="text-center p-4 rounded-lg border bg-card" data-testid={`card-aiq-score-${candidateIndex}`}>
              <div className="text-sm text-muted-foreground mb-1">AIQ (Ethics)</div>
              <div className={`text-2xl font-bold ${aiqData ? getScoreColor(aiqData.totalScore) : 'text-muted-foreground'}`}>
                {aiqData ? `${aiqData.totalScore}%` : '-'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {renderAfterOverview}

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
                <div className="space-y-3" data-testid={`list-strengths-${candidateIndex}`}>
                  {getStrengthsAndWeaknesses().strengths.map((skill, i) => (
                    <div key={i} className="flex items-center justify-between gap-1 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20" data-testid={`row-strength-${candidateIndex}-${i}`}>
                      <div>
                        <span className="font-medium" data-testid={`text-strength-name-${candidateIndex}-${i}`}>{skill.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{skill.category}</Badge>
                      </div>
                      <span className="font-bold text-blue-600" data-testid={`text-strength-score-${candidateIndex}-${i}`}>{skill.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="flex items-center gap-2 mb-4 font-semibold text-slate-600 dark:text-slate-400">
                  <TrendingDown className="h-4 w-4" />
                  Lowest Scoring Traits
                </h4>
                <div className="space-y-3" data-testid={`list-weaknesses-${candidateIndex}`}>
                  {getStrengthsAndWeaknesses().weaknesses.map((skill, i) => (
                    <div key={i} className="flex items-center justify-between gap-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/20" data-testid={`row-weakness-${candidateIndex}-${i}`}>
                      <div>
                        <span className="font-medium" data-testid={`text-weakness-name-${candidateIndex}-${i}`}>{skill.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{skill.category}</Badge>
                      </div>
                      <span className="font-bold text-slate-600 dark:text-slate-400" data-testid={`text-weakness-score-${candidateIndex}-${i}`}>{skill.score}%</span>
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
                    <Radar dataKey="score" stroke={color} fill={color} fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3" data-testid={`list-fit-skills-${candidateIndex}`}>
                {Object.entries(fitData.scores || {}).map(([skill, score]) => (
                  <div key={skill} className="space-y-1" data-testid={`row-fit-skill-${candidateIndex}-${skill}`}>
                    <div className="flex justify-between gap-1 text-sm">
                      <span data-testid={`text-fit-skill-name-${candidateIndex}-${skill}`}>{skill}</span>
                      <span className={`font-medium ${getScoreColor(score as number)}`} data-testid={`text-fit-skill-score-${candidateIndex}-${skill}`}>{score as number}%</span>
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
                    <Radar dataKey="score" stroke={color} fill={color} fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto" data-testid={`list-ai-skills-${candidateIndex}`}>
                {Object.entries(normalizedAIScores).map(([skill, score]) => (
                  <div key={skill} className="space-y-1" data-testid={`row-ai-skill-${candidateIndex}-${skill}`}>
                    <div className="flex justify-between gap-1 text-sm">
                      <span className="truncate" data-testid={`text-ai-skill-name-${candidateIndex}-${skill}`}>{skill}</span>
                      <span className={`font-medium ${getScoreColor(score as number)}`} data-testid={`text-ai-skill-score-${candidateIndex}-${skill}`}>{score as number}%</span>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid={`grid-prompt-levels-${candidateIndex}`}>
                {Object.entries(promptData.scores).map(([level, score]) => (
                  <div key={level} className="text-center p-3 rounded-lg border bg-card" data-testid={`card-prompt-level-${candidateIndex}-${level}`}>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid={`grid-aiq-categories-${candidateIndex}`}>
                {Object.entries(aiqData.scores).map(([key, score]) => (
                  <div key={key} className="text-center p-3 rounded-lg border bg-card" data-testid={`card-aiq-category-${candidateIndex}-${key}`}>
                    <div className="text-xs text-muted-foreground mb-1">{key.replace(/_/g, ' ')}</div>
                    <div className={`text-xl font-bold ${getScoreColor(score as number)}`}>{score as number}%</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function IndividualReportContent({ reportData }: { reportData: any }) {
  const fitData = reportData.fitAssessments?.[0];
  const aiData = reportData.aiReadinessAssessments?.[0];
  const promptData = reportData.promptArchitectureAssessments?.[0];
  const aiqData = reportData.aiqAssessments?.[0];

  const candidateName = reportData.title?.replace('Individual Report: ', '') || 'Candidate';

  return (
    <>
      <CandidateAssessmentSection
        candidateData={{ fitData, aiData, promptData, aiqData }}
        candidateIndex={0}
        candidateName={candidateName}
        color={CHART_COLORS[0]}
        renderAfterOverview={<HowToReadReport reportType="individual" />}
      />

      {reportData.aiInsights && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Generated Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MarkdownContent text={reportData.aiInsights} testId="text-ai-insights" />
          </CardContent>
        </Card>
      )}
    </>
  );
}

function ComparisonReportContent({ reportData }: { reportData: any }) {
  const candidateCount = Math.max(
    reportData.fitAssessments?.length || 0,
    reportData.aiReadinessAssessments?.length || 0,
    reportData.promptArchitectureAssessments?.length || 0,
    reportData.aiqAssessments?.length || 0,
    reportData.averageScores?.length || 0,
    2
  );

  const extractCandidateNames = (): string[] => {
    const titleMatch = reportData.title?.match(/Candidate Comparison:\s*(.+)/i);
    if (titleMatch) {
      const parsed = titleMatch[1].split(',').map((n: string) => n.trim()).filter((n: string) => n.length > 0);
      if (parsed.length >= candidateCount) return parsed.slice(0, candidateCount);
      while (parsed.length < candidateCount) {
        parsed.push(`Candidate ${parsed.length + 1}`);
      }
      return parsed;
    }
    return Array.from({ length: candidateCount }, (_, i) => `Candidate ${i + 1}`);
  };

  const candidateNames = extractCandidateNames();

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Comparison Overview
          </CardTitle>
          <CardDescription>Side-by-side assessment scores for all candidates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-comparison-overview">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Assessment</th>
                  {candidateNames.map((name: string, idx: number) => (
                    <th key={idx} className="text-center py-3 px-3 font-medium" data-testid={`th-candidate-${idx}`}>
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[idx] || '#666' }} />
                        <span>{name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 pr-4 font-medium">FIT Score</td>
                  {Array.from({ length: candidateCount }, (_, idx) => {
                    const fitData = reportData.fitAssessments?.[idx];
                    const score = fitData ? calculateAverageScore(fitData.scores) : null;
                    return (
                      <td key={idx} className="text-center py-3 px-3" data-testid={`cell-fit-${idx}`}>
                        <span className={`text-xl font-bold ${score !== null ? getScoreColor(score) : 'text-muted-foreground'}`}>
                          {score !== null ? `${score}%` : '-'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b">
                  <td className="py-3 pr-4 font-medium">AI Readiness</td>
                  {Array.from({ length: candidateCount }, (_, idx) => {
                    const aiData = reportData.aiReadinessAssessments?.[idx];
                    const score = aiData ? calculateAverageScore(aiData.scores) : null;
                    return (
                      <td key={idx} className="text-center py-3 px-3" data-testid={`cell-ai-${idx}`}>
                        <span className={`text-xl font-bold ${score !== null ? getScoreColor(score) : 'text-muted-foreground'}`}>
                          {score !== null ? `${score}%` : '-'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b">
                  <td className="py-3 pr-4 font-medium">Prompt Architecture</td>
                  {Array.from({ length: candidateCount }, (_, idx) => {
                    const promptData = reportData.promptArchitectureAssessments?.[idx];
                    const score = promptData?.totalScore ?? null;
                    return (
                      <td key={idx} className="text-center py-3 px-3" data-testid={`cell-prompt-${idx}`}>
                        <span className={`text-xl font-bold ${score !== null ? getScoreColor(score) : 'text-muted-foreground'}`}>
                          {score !== null ? `${score}%` : '-'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">AIQ (Ethics)</td>
                  {Array.from({ length: candidateCount }, (_, idx) => {
                    const aiqData = reportData.aiqAssessments?.[idx];
                    const score = aiqData?.totalScore ?? null;
                    return (
                      <td key={idx} className="text-center py-3 px-3" data-testid={`cell-aiq-${idx}`}>
                        <span className={`text-xl font-bold ${score !== null ? getScoreColor(score) : 'text-muted-foreground'}`}>
                          {score !== null ? `${score}%` : '-'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                {reportData.averageScores && (
                  <tr className="border-t-2 border-primary/20">
                    <td className="py-3 pr-4 font-semibold">Overall Average</td>
                    {reportData.averageScores.map((avg: number, idx: number) => (
                      <td key={idx} className="text-center py-3 px-3" data-testid={`cell-avg-${idx}`}>
                        <span className={`text-2xl font-bold ${getScoreColor(avg)}`}>{avg}%</span>
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>


      {reportData.fitAssessments?.some((a: any) => a !== null) && (
        <Card data-testid="section-fit-comparison">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              FIT Assessment Comparison
            </CardTitle>
            <CardDescription>Behavioral skills assessment (6 core competencies)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div>
                <h3 className="font-semibold mb-4">Combined Comparison</h3>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg overflow-visible">
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={FIT_SKILLS.map(skill => {
                      const dataPoint: any = { skill: getSkillAcronym(skill.displayName) };
                      for (let i = 0; i < candidateCount; i++) {
                        const fitData = reportData.fitAssessments?.[i];
                        if (fitData) dataPoint[`candidate${i}`] = fitData.scores[skill.key] || 0;
                      }
                      return dataPoint;
                    })}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} />
                      <RechartsTooltip />
                      {candidateNames.map((_: string, idx: number) => {
                        if (!reportData.fitAssessments?.[idx]) return null;
                        return (
                          <Radar key={idx} name={candidateNames[idx]} dataKey={`candidate${idx}`}
                            stroke={CHART_COLORS[idx]} fill={CHART_COLORS[idx]} fillOpacity={0.15} strokeWidth={2} />
                        );
                      })}
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Individual Assessments</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  {Array.from({ length: candidateCount }, (_, idx) => {
                    const fitData = reportData.fitAssessments?.[idx];
                    if (!fitData) {
                      return (
                        <div key={idx} className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/20">
                          <AlertCircle className="h-8 w-8 mb-2 text-muted-foreground opacity-50" />
                          <p className="text-sm font-medium">{candidateNames[idx]}</p>
                          <Badge variant="outline" className="mt-2">Not Completed</Badge>
                        </div>
                      );
                    }
                    const barData = FIT_SKILLS.map(skill => ({
                      skill: getSkillAcronym(skill.displayName),
                      fullName: skill.displayName,
                      score: fitData.scores[skill.key] || 0,
                    })).sort((a, b) => b.score - a.score);
                    return (
                      <div key={idx} className="space-y-3">
                        <div className="text-center">
                          <p className="font-medium" style={{ color: CHART_COLORS[idx] }}>{candidateNames[idx]}</p>
                          <p className="text-xs text-muted-foreground">Avg: {calculateAverageScore(fitData.scores)}%</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-3 rounded-lg overflow-visible" data-testid={`chart-fit-individual-${idx}`}>
                          <ResponsiveContainer width="100%" height={barData.length * 40 + 40}>
                            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 40, left: 5, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                              <YAxis type="category" dataKey="skill" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} width={40} />
                              <RechartsTooltip formatter={(value: number) => [`${value}%`, 'Score']}
                                labelFormatter={(label: string) => barData.find(d => d.skill === label)?.fullName || label} />
                              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                                {barData.map((entry, i) => (
                                  <Cell key={i} fill={`hsl(210, 60%, ${65 - (entry.score / 100) * 25}%)`} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {reportData.aiReadinessAssessments?.some((a: any) => a !== null) && (
        <Card data-testid="section-ai-readiness-comparison">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Readiness Comparison
            </CardTitle>
            <CardDescription>Technical AI capabilities assessment (9 skills)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div>
                <h3 className="font-semibold mb-4">Combined Comparison</h3>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg overflow-visible">
                  <ResponsiveContainer width="100%" height={500}>
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={AI_READINESS_SKILLS.map(skill => {
                      const dataPoint: any = { skill: getSkillAcronym(skill.displayName) };
                      for (let i = 0; i < candidateCount; i++) {
                        const aiData = reportData.aiReadinessAssessments?.[i];
                        if (aiData) dataPoint[`candidate${i}`] = getAIReadinessScore(aiData.scores, skill.key);
                      }
                      return dataPoint;
                    })}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} />
                      <RechartsTooltip />
                      {candidateNames.map((_: string, idx: number) => {
                        if (!reportData.aiReadinessAssessments?.[idx]) return null;
                        return (
                          <Radar key={idx} name={candidateNames[idx]} dataKey={`candidate${idx}`}
                            stroke={CHART_COLORS[idx]} fill={CHART_COLORS[idx]} fillOpacity={0.15} strokeWidth={2} />
                        );
                      })}
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Individual Assessments</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  {Array.from({ length: candidateCount }, (_, idx) => {
                    const aiData = reportData.aiReadinessAssessments?.[idx];
                    if (!aiData) {
                      return (
                        <div key={idx} className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/20">
                          <AlertCircle className="h-8 w-8 mb-2 text-muted-foreground opacity-50" />
                          <p className="text-sm font-medium">{candidateNames[idx]}</p>
                          <Badge variant="outline" className="mt-2">Not Completed</Badge>
                        </div>
                      );
                    }
                    const barData = AI_READINESS_SKILLS.map(skill => ({
                      skill: getSkillAcronym(skill.displayName),
                      fullName: skill.displayName,
                      score: getAIReadinessScore(aiData.scores, skill.key),
                    })).sort((a, b) => b.score - a.score);
                    return (
                      <div key={idx} className="space-y-3">
                        <div className="text-center">
                          <p className="font-medium" style={{ color: CHART_COLORS[idx] }}>{candidateNames[idx]}</p>
                          <p className="text-xs text-muted-foreground">Avg: {calculateAverageScore(aiData.scores)}%</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-3 rounded-lg overflow-visible" data-testid={`chart-ai-individual-${idx}`}>
                          <ResponsiveContainer width="100%" height={barData.length * 40 + 40}>
                            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 40, left: 5, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                              <YAxis type="category" dataKey="skill" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} width={55} />
                              <RechartsTooltip formatter={(value: number) => [`${value}%`, 'Score']}
                                labelFormatter={(label: string) => barData.find(d => d.skill === label)?.fullName || label} />
                              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                                {barData.map((entry, i) => (
                                  <Cell key={i} fill={`hsl(270, 50%, ${65 - (entry.score / 100) * 25}%)`} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {reportData.promptArchitectureAssessments?.some((a: any) => a !== null) && (
        <Card data-testid="section-prompt-comparison">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Prompt Architecture Comparison
            </CardTitle>
            <CardDescription>Progressive difficulty levels with dimensional scoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${candidateCount}, 1fr)` }}>
              {Array.from({ length: candidateCount }, (_, idx) => {
                const promptData = reportData.promptArchitectureAssessments?.[idx];
                return (
                  <div key={idx} className="text-center p-4 rounded-lg border bg-card">
                    <p className="font-medium mb-1" style={{ color: CHART_COLORS[idx] }}>{candidateNames[idx]}</p>
                    {promptData ? (
                      <>
                        <div className={`text-3xl font-bold ${getScoreColor(promptData.totalScore)}`}>{promptData.totalScore}%</div>
                        <div className="text-xs text-muted-foreground mt-1">{getPromptArchBandInterpretation(promptData.totalScore).title}</div>
                      </>
                    ) : (
                      <Badge variant="outline">Not Completed</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {reportData.aiqAssessments?.some((a: any) => a !== null) && (
        <Card data-testid="section-aiq-comparison">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              AIQ (Ethics) Comparison
            </CardTitle>
            <CardDescription>Algorithmic Integrity Quotient scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${candidateCount}, 1fr)` }}>
              {Array.from({ length: candidateCount }, (_, idx) => {
                const aiqData = reportData.aiqAssessments?.[idx];
                return (
                  <div key={idx} className="text-center p-4 rounded-lg border bg-card">
                    <p className="font-medium mb-1" style={{ color: CHART_COLORS[idx] }}>{candidateNames[idx]}</p>
                    {aiqData ? (
                      <>
                        <div className={`text-3xl font-bold ${getScoreColor(aiqData.totalScore)}`}>{aiqData.totalScore}%</div>
                        <div className="text-xs text-muted-foreground mt-1">{getAIQBandInterpretation(aiqData.totalScore).title}</div>
                      </>
                    ) : (
                      <Badge variant="outline">Not Completed</Badge>
                    )}
                  </div>
                );
              })}
            </div>
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
            <MarkdownContent text={reportData.aiInsights} testId="text-ai-insights" />
          </CardContent>
        </Card>
      )}
    </>
  );
}

function SkillAlignmentCard({ skill, idx }: { skill: any; idx: number }) {
  const gap = skill.candidateScore - skill.requiredScore;
  return (
    <div className="p-4 rounded-lg border bg-card" data-testid={`row-skill-alignment-${idx}`}>
      <div className="flex justify-between items-center gap-1 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-medium">{skill.skillName}</span>
          {skill.criticality === 'critical' && (
            <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0">Critical</Badge>
          )}
        </div>
        <Badge variant={gap >= 0 ? "default" : "destructive"}>
          {gap >= 0 ? `+${gap}%` : `${gap}%`} gap
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Candidate Score</div>
          <div className="flex items-center gap-2">
            <Progress value={skill.candidateScore} className="h-2 flex-1" />
            <span className={`text-sm font-medium ${getScoreColor(skill.candidateScore)}`}>
              {skill.candidateScore}%
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Required Score</div>
          <div className="flex items-center gap-2">
            <Progress value={skill.requiredScore} className="h-2 flex-1" />
            <span className="text-sm font-medium text-muted-foreground">
              {skill.requiredScore}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleFitReportContent({ reportData }: { reportData: any }) {
  const strengths = reportData.strengths || [];
  const gaps = reportData.gaps || [];

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Role Fit Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4" data-testid="container-overall-fit">
            <div className="relative h-20 w-20 flex-shrink-0">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-muted/20"
                />
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  strokeWidth="3"
                  strokeDasharray={`${reportData.overallFit || 0}, 100`}
                  className={
                    (reportData.overallFit || 0) >= 75 ? 'stroke-green-500' :
                    (reportData.overallFit || 0) >= 50 ? 'stroke-amber-500' : 'stroke-red-500'
                  }
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${getScoreColor(reportData.overallFit || 0)}`} data-testid="text-overall-fit">
                  {reportData.overallFit || 0}%
                </span>
              </div>
            </div>
            <div>
              <div className="font-semibold text-lg">Overall Fit Score</div>
              <div className="text-sm text-muted-foreground">
                {(reportData.overallFit || 0) >= 75 ? 'Strong candidate match - excellent alignment with role requirements' :
                 (reportData.overallFit || 0) >= 50 ? 'Moderate candidate match - some areas may need development' :
                 'Limited candidate match - significant gaps identified'}
              </div>
            </div>
          </div>

          {reportData.dataCoverage && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30" data-testid="container-data-coverage">
              <Shield className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Data Coverage: {reportData.dataCoverage.percentage}%</span>
                <span className="text-muted-foreground ml-2">
                  ({reportData.dataCoverage.assessedSkillCount}/{reportData.dataCoverage.totalRequiredSkills} skills assessed)
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg border bg-card" data-testid="card-rolefit-overall">
              <div className="text-xs text-muted-foreground mb-1">Overall Fit</div>
              <div className={`text-2xl font-bold ${getScoreColor(reportData.overallFit || 0)}`}>
                {reportData.overallFit || 0}%
              </div>
            </div>
            {reportData.promptArchitectureScore !== undefined && (
              <div className="text-center p-3 rounded-lg border bg-card" data-testid="card-rolefit-prompt">
                <div className="text-xs text-muted-foreground mb-1">Prompt Arch.</div>
                <div className={`text-2xl font-bold ${getScoreColor(reportData.promptArchitectureScore)}`}>
                  {reportData.promptArchitectureScore}%
                </div>
              </div>
            )}
            {reportData.aiqScore !== undefined && (
              <div className="text-center p-3 rounded-lg border bg-card" data-testid="card-rolefit-aiq">
                <div className="text-xs text-muted-foreground mb-1">AIQ Score</div>
                <div className={`text-2xl font-bold ${getScoreColor(reportData.aiqScore)}`}>
                  {reportData.aiqScore}%
                </div>
              </div>
            )}
            <div className="text-center p-3 rounded-lg border bg-card" data-testid="card-rolefit-gaps-count">
              <div className="text-xs text-muted-foreground mb-1">Skill Gaps</div>
              <div className={`text-2xl font-bold ${gaps.length > 3 ? 'text-red-600' : gaps.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {gaps.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {(strengths.length > 0 || gaps.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Strengths & Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {strengths.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 mb-3 font-semibold text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    Key Strengths
                  </h4>
                  <div className="space-y-2" data-testid="list-strengths">
                    {strengths.map((s: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20" data-testid={`row-strength-${i}`}>
                        <TrendingUp className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span className="text-sm font-medium">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {gaps.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 mb-3 font-semibold text-amber-600">
                    <TrendingDown className="h-4 w-4" />
                    Key Gaps
                  </h4>
                  <div className="space-y-2" data-testid="list-skill-gaps">
                    {gaps.map((g: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20" data-testid={`row-gap-${i}`}>
                        <TrendingDown className="h-3 w-3 text-amber-600 flex-shrink-0" />
                        <span className="text-sm font-medium">{g}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {reportData.fitSkillAlignments && reportData.fitSkillAlignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              FIT Skill Alignment
            </CardTitle>
            <CardDescription>Behavioral trait scores vs. role requirements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="list-fit-skill-alignments">
              {reportData.fitSkillAlignments.map((skill: any, idx: number) => (
                <SkillAlignmentCard key={idx} skill={skill} idx={idx} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {reportData.aiReadinessSkillAlignments && reportData.aiReadinessSkillAlignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              AI Readiness Skill Alignment
            </CardTitle>
            <CardDescription>AI capability scores vs. role requirements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="list-air-skill-alignments">
              {reportData.aiReadinessSkillAlignments.map((skill: any, idx: number) => (
                <SkillAlignmentCard key={idx} skill={skill} idx={(reportData.fitSkillAlignments?.length || 0) + idx} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {reportData.promptRoleFitAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Prompt Architecture Analysis
            </CardTitle>
            {reportData.promptArchitectureScore !== undefined && (
              <CardDescription>Score: {reportData.promptArchitectureScore}% - {getPromptArchBandInterpretation(reportData.promptArchitectureScore).title}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <MarkdownContent text={reportData.promptRoleFitAnalysis} testId="text-prompt-role-fit" />
          </CardContent>
        </Card>
      )}

      {reportData.aiqRoleFitAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              AIQ (Ethics) Analysis
            </CardTitle>
            {reportData.aiqScore !== undefined && (
              <CardDescription>Score: {reportData.aiqScore}% - {getAIQBandInterpretation(reportData.aiqScore).title}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <MarkdownContent text={reportData.aiqRoleFitAnalysis} testId="text-aiq-role-fit" />
          </CardContent>
        </Card>
      )}

      {reportData.nextSteps && reportData.nextSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Recommended Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="list-next-steps">
              {reportData.nextSteps.map((step: string, idx: number) => (
                <div key={idx} className="flex gap-3 p-3 rounded-lg bg-muted/30" data-testid={`row-next-step-${idx}`}>
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <p className="text-sm">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {reportData.finalRecommendation && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Final Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MarkdownContent text={reportData.finalRecommendation} testId="text-final-recommendation" />
          </CardContent>
        </Card>
      )}
    </>
  );
}

function ProfileInsightsContent({ reportData }: { reportData: any }) {
  const candidateName = reportData.candidateName || reportData.title?.replace('Profile Insights: ', '') || 'Candidate';

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {candidateName}
          </CardTitle>
          <CardDescription>
            AI-generated profile analysis
            {reportData.generatedAt && (
              <span className="ml-2 text-xs">
                Generated {new Date(reportData.generatedAt).toLocaleDateString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Profile Insights
          </CardTitle>
          <CardDescription>AI-generated analysis of candidate profile and potential</CardDescription>
        </CardHeader>
        <CardContent>
          {reportData.insights ? (
            <MarkdownContent text={reportData.insights} testId="text-profile-insights" />
          ) : (
            <p className="text-muted-foreground" data-testid="text-no-insights">No insights available.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function CompareInsightsContent({ reportData }: { reportData: any }) {
  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Candidate Comparison Insights
          </CardTitle>
          <CardDescription>
            AI-generated comparison of {reportData.candidateCount || 2} candidates
            {reportData.generatedAt && (
              <span className="ml-2 text-xs">
                Generated {new Date(reportData.generatedAt).toLocaleDateString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.insights ? (
            <MarkdownContent text={reportData.insights} testId="text-compare-insights" />
          ) : (
            <p className="text-muted-foreground" data-testid="text-no-insights">No insights available.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function GenericReportContent({ reportData }: { reportData: any }) {
  const displayData = { ...reportData };
  delete displayData.id;
  delete displayData.partnerId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Report Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-auto max-h-[70vh]" data-testid="text-report-raw">
          {JSON.stringify(displayData, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

function ReportDisclaimer() {
  return (
    <div className="mt-8 mb-4 p-4 bg-muted/30 rounded-lg border" data-testid="section-disclaimer">
      <p className="text-xs text-muted-foreground text-center">
        <strong>Disclaimer:</strong> This report is generated using AI-powered assessment technology by HumanMetrix.
        Results should be used as one input among several in making hiring or development decisions.
        Scores reflect responses at the time of assessment and may change over time.
        For questions about this report, contact{' '}
        <a href="mailto:hello@humanmetrix.co.uk" className="text-primary underline">hello@humanmetrix.co.uk</a>
      </p>
    </div>
  );
}

export default function PartnerReportView() {
  const params = useParams<{ reportId: string }>();
  const reportId = params.reportId;
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);

  const { data: reportData, isLoading, error } = useQuery<any>({
    queryKey: ['/api/partner/me/analysis-reports', reportId],
    enabled: !!reportId,
  });

  const handleExportPDF = async () => {
    if (!reportData || isExporting) return;
    setIsExporting(true);
    try {
      const reportType = reportData.reportType || 'individual';

      if (reportType === 'individual') {
        const { exportIndividualReportPDF } = await import('@/lib/pdfExport');
        const candidateName = reportData.title?.replace('Individual Report: ', '') || 'Candidate';
        const nameParts = candidateName.split(' ');
        await exportIndividualReportPDF({
          candidate: {
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: reportData.candidateEmail || 'candidate@email.com',
          },
          fitAssessment: reportData.fitAssessments?.[0] || null,
          aiReadinessAssessment: reportData.aiReadinessAssessments?.[0] || null,
          promptArchitectureAssessment: reportData.promptArchitectureAssessments?.[0] || null,
          aiqAssessment: reportData.aiqAssessments?.[0] || null,
          aiInsights: reportData.aiInsights || null,
        });
        toast({ title: "PDF Exported", description: "Individual report PDF has been downloaded." });
      } else if (reportType === 'comparison') {
        const { exportComparisonPDF } = await import('@/lib/pdfExport');
        const candidateCount = Math.max(
          reportData.fitAssessments?.length || 0,
          reportData.aiReadinessAssessments?.length || 0,
          reportData.promptArchitectureAssessments?.length || 0,
          reportData.aiqAssessments?.length || 0,
          2
        );
        const titleMatch = reportData.title?.match(/Candidate Comparison:\s*(.+)/i);
        const candidateNames = titleMatch
          ? titleMatch[1].split(',').map((n: string) => n.trim()).filter((n: string) => n.length > 0)
          : [];
        const candidates = Array.from({ length: candidateCount }, (_, i) => ({
          user: {
            firstName: candidateNames[i]?.split(' ')[0] || `Candidate`,
            lastName: candidateNames[i]?.split(' ').slice(1).join(' ') || `${i + 1}`,
            email: `candidate${i + 1}@email.com`,
          },
        }));
        const fitAssessments = reportData.fitAssessments || [];
        const aiReadinessAssessments = reportData.aiReadinessAssessments || [];
        const promptArchitectureAssessments = reportData.promptArchitectureAssessments || [];
        const aiqAssessments = reportData.aiqAssessments || [];
        const skillComparison = reportData.skillComparison || [];
        const averageScores = reportData.averageScores || candidates.map(() => 0);
        await exportComparisonPDF({
          candidates,
          fitAssessments,
          aiReadinessAssessments,
          promptArchitectureAssessments,
          aiqAssessments,
          skillComparison,
          averageScores,
        });
        toast({ title: "PDF Exported", description: "Comparison report PDF has been downloaded." });
      } else if (reportType === 'role_fit_single') {
        const { exportRoleFitPDF } = await import('@/lib/pdfExport');
        const candidateName = reportData.candidateName || reportData.title?.replace(/Role Fit.*?:\s*/i, '') || 'Candidate';
        const nameParts = candidateName.split(' ');
        await exportRoleFitPDF({
          candidate: {
            user: {
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              email: reportData.candidateEmail || 'candidate@email.com',
            },
            results: [],
          },
          role: {
            name: reportData.roleName || reportData.role?.name || reportData.roleSnapshot?.roleName || 'Target Role',
            description: reportData.roleDescription || reportData.role?.description || '',
          },
          criticalSkillNames: reportData.criticalSkillNames || [],
          alignment: {
            overallFit: reportData.overallFit ?? null,
            fitSkillAlignments: reportData.fitSkillAlignments || reportData.skillAlignments?.filter((s: any) => s.assessmentType === 'fit') || null,
            aiReadinessSkillAlignments: reportData.aiReadinessSkillAlignments || reportData.skillAlignments?.filter((s: any) => s.assessmentType === 'ai_readiness') || null,
            strengths: reportData.strengths || [],
            gaps: reportData.gaps || [],
            cohortBenchmarks: reportData.cohortBenchmarks || null,
            interviewQuestions: reportData.interviewQuestions || null,
            roleFlexibility: reportData.roleFlexibility || [],
            recommendations: reportData.recommendations || '',
            riskFlags: reportData.riskFlags || [],
            finalRecommendation: reportData.finalRecommendation || '',
            nextSteps: reportData.nextSteps || [],
            dataCoverage: reportData.dataCoverage || null,
          },
          fitAssessment: reportData.fitAssessments?.[0] || null,
          aiReadinessAssessment: reportData.aiReadinessAssessments?.[0] || null,
          promptArchitectureAssessment: reportData.promptArchitectureAssessments?.[0] || null,
          aiqAssessment: reportData.aiqAssessments?.[0] || null,
        });
        toast({ title: "PDF Exported", description: "Role fit report PDF has been downloaded." });
      } else if (reportType === 'role_fit_multi') {
        const { exportMultiCandidateComparisonPDF } = await import('@/lib/pdfExport');
        await exportMultiCandidateComparisonPDF({
          roleSnapshot: reportData.roleSnapshot || { roleId: '', roleName: 'Target Role', requiredSkillScores: {} },
          candidateEntries: reportData.candidateEntries || [],
          summaryInsights: reportData.summaryInsights || {
            topPerformer: { userId: '', userName: 'N/A', overallFit: 0 },
            averageFit: 0,
            fitDistribution: { strong: 0, moderate: 0, developmentNeeded: 0 },
            commonStrengths: [],
            commonGaps: [],
            keyDifferentiators: [],
          },
          criticalSkillNames: reportData.criticalSkillNames || [],
          aiInsights: reportData.aiInsights || null,
        });
        toast({ title: "PDF Exported", description: "Multi-candidate role fit PDF has been downloaded." });
      } else {
        toast({ title: "Export Not Available", description: "PDF export is not available for this report type.", variant: "destructive" });
        setIsExporting(false);
        return;
      }
    } catch (err) {
      console.error('PDF export error:', err);
      toast({ title: "Export Failed", description: "Failed to generate PDF. Please try again.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

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

  const reportType = reportData.reportType || 'individual';
  const howToReadType = getHowToReadReportType(reportType);
  const isIndividual = reportType === 'individual';
  const isComparison = reportType === 'comparison';
  const isRoleFit = reportType === 'role_fit_single' || reportType === 'role_fit_multi';
  const isProfileInsights = reportType === 'profile_insights';
  const isCompareInsights = reportType === 'compare_insights';

  const cleanTitle = (reportData.title || 'Report Details').replace(/for\s+undefined/gi, '').replace(/\s{2,}/g, ' ').trim();

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-8">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <ReportHeader
          title={cleanTitle}
          createdAt={reportData.createdAt}
          reportType={reportType}
          cached={reportData.cached}
          onExportPDF={(isIndividual || isComparison || isRoleFit) ? handleExportPDF : undefined}
          isExporting={isExporting}
        />

        {(isComparison || isRoleFit) && <HowToReadReport reportType={howToReadType} />}

        <div className="space-y-6" data-testid="report-content">
          {isIndividual && <IndividualReportContent reportData={reportData} />}
          {isComparison && <ComparisonReportContent reportData={reportData} />}
          {isRoleFit && <RoleFitReportContent reportData={reportData} />}
          {isProfileInsights && <ProfileInsightsContent reportData={reportData} />}
          {isCompareInsights && <CompareInsightsContent reportData={reportData} />}
          {!isIndividual && !isComparison && !isRoleFit && !isProfileInsights && !isCompareInsights && (
            <GenericReportContent reportData={reportData} />
          )}
        </div>

        {(isIndividual || isComparison || isRoleFit) && (
          <div className="mt-8">
            <SkillsLegend />
          </div>
        )}

        <div className="mt-8">
          <Card className="border-primary/20 bg-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-white" />
                Enterprise Services
              </CardTitle>
              <p className="text-sm text-white/80">
                Enhance your hiring decisions with premium services
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                    <Rocket className="h-4 w-4 text-white" />
                    Onboarding Service
                  </h4>
                  <p className="text-sm text-white/70">
                    Time to Productivity Estimate and Hiring Risk Analysis to optimize your onboarding process
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                    <MessageSquare className="h-4 w-4 text-white" />
                    Suggested Interview Questions
                  </h4>
                  <p className="text-sm text-white/70">
                    AI-generated questions to dig deeper into assessment results and explore trait gaps
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                    <Users className="h-4 w-4 text-white" />
                    Team Composition Fit
                  </h4>
                  <p className="text-sm text-white/70">
                    Analysis of how this candidate would complement your existing team dynamics
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                    <Clock className="h-4 w-4 text-white" />
                    Time to Productivity Estimate
                  </h4>
                  <p className="text-sm text-white/70">
                    Projected onboarding timeline based on skill readiness and learning agility
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                    <BarChart3 className="h-4 w-4 text-white" />
                    Candidate Comparison Tool
                  </h4>
                  <p className="text-sm text-white/70">
                    Compare multiple candidates side-by-side across all assessment dimensions with visual analytics
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium flex items-center gap-2 text-white">
                      <TrendingUp className="h-4 w-4 text-white shrink-0" />
                      Cohort Benchmarking
                    </h4>
                    <Badge className="bg-amber-500 text-white border-amber-600 text-xs shrink-0">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-white/70">
                    Compare candidate performance against industry benchmarks and peer organizations
                  </p>
                </div>
              </div>
              <div className="mt-4 text-center">
                <Button 
                  variant="outline" 
                  className="border-white text-white"
                  onClick={() => setShowEnquiryModal(true)}
                  data-testid="button-contact-team-analysis"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Speak to the Team
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <ReportDisclaimer />

        {(isIndividual || isComparison || isRoleFit) && (
          <div className="flex justify-end gap-2 mt-4 mb-4">
            <Button
              onClick={handleExportPDF}
              disabled={isExporting}
              data-testid="button-export-pdf-bottom"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export as PDF
                </>
              )}
            </Button>
          </div>
        )}

        <div className="text-center mt-4 mb-8">
          <p className="text-xs text-muted-foreground">
            Powered by HumanMetrix AI Assessment Platform
          </p>
        </div>
      </div>

      <EnquiryModal 
        open={showEnquiryModal} 
        onOpenChange={setShowEnquiryModal}
        context="Analysis Report - Enterprise Services"
      />
    </div>
  );
}
