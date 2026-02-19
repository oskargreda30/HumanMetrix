import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, FileText, TrendingUp, Target, User, Award,
  Sparkles, ArrowLeft, Calendar, Users
} from "lucide-react";
import { AdditionalServicesSection } from "@/components/shared/AdditionalServicesSection";
import hmLogoPath from "@assets/Gemini_Generated_Image_misel3misel3mise-removebg-preview_1762775600899.png";
import { SharedIndividualReport } from "@/components/shared/SharedIndividualReport";
import { SharedCompareTab } from "@/components/shared/SharedCompareTab";
import { SharedSingleCandidateRoleFit } from "@/components/shared/SharedSingleCandidateRoleFit";
import PartnerMultiCandidateRoleFitTab from "@/components/partner/PartnerMultiCandidateRoleFitTab";

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

function ReportHeader({ title, createdAt, reportType, cached }: { title: string; createdAt?: string; reportType?: string; cached?: boolean }) {
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
          <Link href="/partner?tab=results">
            <Button variant="outline" size="sm" data-testid="button-back-results">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Saved Results
            </Button>
          </Link>
        </div>
      </div>
    </div>
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
  const { data: reportData, isLoading, error } = useQuery<any>({
    queryKey: ['/api/partner/me/analysis-reports', reportId],
    enabled: !!reportId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
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
  const isIndividual = reportType === 'individual';
  const isComparison = reportType === 'comparison';
  const isRoleFit = reportType === 'role_fit_single' || reportType === 'role_fit_multi';
  const isProfileInsights = reportType === 'profile_insights';
  const isCompareInsights = reportType === 'compare_insights';

  const cleanTitle = (reportData.title || 'Report Details').replace(/for\s+undefined/gi, '').replace(/\s{2,}/g, ' ').trim();

  return (
    <div className="min-h-screen bg-white text-foreground pt-16 md:pt-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <ReportHeader
          title={cleanTitle}
          createdAt={reportData.createdAt}
          reportType={reportType}
          cached={reportData.cached}
        />

        <div className="space-y-6" data-testid="report-content">
          {isIndividual && (
            <SharedIndividualReport
              config={{
                reportEndpoint: '',
                candidatesEndpoint: '',
                profileInsightsEndpoint: '',
                contextType: 'partner',
              }}
              staticData={{
                candidateReport: {
                  fitAssessments: reportData.fitAssessments,
                  aiReadinessAssessments: reportData.aiReadinessAssessments,
                  promptArchitectureAssessments: reportData.promptArchitectureAssessments,
                  aiqAssessments: reportData.aiqAssessments,
                  aiInsights: reportData.aiInsights,
                  generatedAt: reportData.createdAt,
                  cached: reportData.cached,
                },
                candidateName: reportData.title?.replace('Individual Report: ', '') || 'Candidate',
                candidateEmail: reportData.candidateEmail || '',
              }}
            />
          )}

          {isComparison && (() => {
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
                id: `static-${i}`,
                email: `candidate${i + 1}@email.com`,
                firstName: candidateNames[i]?.split(' ')[0] || `Candidate`,
                lastName: candidateNames[i]?.split(' ').slice(1).join(' ') || `${i + 1}`,
              },
              results: [],
            }));

            return (
              <SharedCompareTab
                config={{
                  candidatesEndpoint: '',
                  rolesEndpoint: '',
                  compareEndpoint: '',
                  contextType: 'partner',
                }}
                staticData={{
                  comparison: {
                    radarData: reportData.radarData || [],
                    skillComparison: reportData.skillComparison || [],
                    averageScores: reportData.averageScores || [],
                    hasSkillData: !!(reportData.fitAssessments?.some((a: any) => a) || reportData.aiReadinessAssessments?.some((a: any) => a)),
                    fitAssessments: reportData.fitAssessments || [],
                    aiReadinessAssessments: reportData.aiReadinessAssessments || [],
                    promptArchitectureAssessments: reportData.promptArchitectureAssessments || [],
                    aiqAssessments: reportData.aiqAssessments || [],
                    aiInsights: reportData.aiInsights || null,
                  },
                  candidates,
                }}
              />
            );
          })()}

          {reportType === 'role_fit_single' && (
            <SharedSingleCandidateRoleFit
              config={{
                candidatesEndpoint: '',
                rolesEndpoint: '',
                roleAlignmentEndpoint: '',
                generateScoresEndpoint: () => '',
                analyzeRoleFitEndpoint: '',
                candidateIdParam: 'candidateId',
                contextType: 'partner',
              }}
              staticData={{
                alignment: {
                  overallFit: reportData.overallFit ?? null,
                  fitSkillAlignments: reportData.fitSkillAlignments || reportData.skillAlignments?.filter((s: any) => s.assessmentType === 'fit') || null,
                  aiReadinessSkillAlignments: reportData.aiReadinessSkillAlignments || reportData.skillAlignments?.filter((s: any) => s.assessmentType === 'ai_readiness') || null,
                  strengths: reportData.strengths || [],
                  gaps: reportData.gaps || [],
                  cohortBenchmarks: reportData.cohortBenchmarks || null,
                  interviewQuestions: reportData.interviewQuestions || null,
                  roleFlexibility: reportData.roleFlexibility || [],
                  finalRecommendation: reportData.finalRecommendation || '',
                  nextSteps: reportData.nextSteps || [],
                  dataCoverage: reportData.dataCoverage || null,
                  promptRoleFitAnalysis: reportData.promptRoleFitAnalysis || null,
                  aiqRoleFitAnalysis: reportData.aiqRoleFitAnalysis || null,
                },
                candidateData: {
                  user: {
                    id: 'static',
                    email: reportData.candidateEmail || '',
                    firstName: (reportData.candidateName || reportData.title?.replace(/Role Fit.*?:\s*/i, '') || 'Candidate').split(' ')[0],
                    lastName: (reportData.candidateName || reportData.title?.replace(/Role Fit.*?:\s*/i, '') || '').split(' ').slice(1).join(' '),
                  },
                },
                roleData: {
                  id: reportData.roleId || '',
                  name: reportData.roleName || reportData.role?.name || reportData.roleSnapshot?.roleName || 'Target Role',
                  description: reportData.roleDescription || reportData.role?.description || '',
                  requiredSkillScores: reportData.roleSnapshot?.requiredSkillScores || {},
                },
              }}
            />
          )}

          {reportType === 'role_fit_multi' && (
            <PartnerMultiCandidateRoleFitTab
              staticData={{
                comparison: {
                  id: reportData.id || '',
                  jobRoleId: reportData.jobRoleId || reportData.roleId || '',
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
                  createdAt: reportData.createdAt,
                  cached: reportData.cached,
                } as any,
              }}
            />
          )}

          {isProfileInsights && <ProfileInsightsContent reportData={reportData} />}
          {isCompareInsights && <CompareInsightsContent reportData={reportData} />}
          {!isIndividual && !isComparison && !isRoleFit && !isProfileInsights && !isCompareInsights && (
            <GenericReportContent reportData={reportData} />
          )}
        </div>

        {(isProfileInsights || isCompareInsights) && (
          <div className="mt-8">
            <AdditionalServicesSection />
          </div>
        )}

        <ReportDisclaimer />

        <div className="text-center mt-4 mb-8">
          <p className="text-xs text-muted-foreground">
            Powered by HumanMetrix AI Assessment Platform
          </p>
        </div>
      </div>
    </div>
  );
}
