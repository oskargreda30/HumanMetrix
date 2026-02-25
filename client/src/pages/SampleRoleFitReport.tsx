import { useState } from "react";
import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUp, Target, CheckCircle2, AlertCircle, AlertTriangle, TrendingUp, Brain, MessageSquare, Users, FileText, BarChart3, Trophy, Star, Mail, Building2, Download, Loader2 } from "lucide-react";
import SkillsLegend from "@/components/SkillsLegend";
import { CriticalSkillsAnalysis } from "@/components/shared/CriticalSkillsAnalysis";
import { CohortBenchmarking, type AssessmentBenchmark } from "@/components/shared/CohortBenchmarking";
import { exportRoleFitPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";

const DEMO_CANDIDATE = {
  name: "Sarah Chen",
  email: "sarah.chen@example.com",
  completedDate: "January 15, 2026",
};

const DEMO_ROLE = {
  name: "Product Manager",
  department: "Product",
  level: "Senior",
  description: "Lead product strategy and execution for AI-powered features, working cross-functionally with engineering, design, and business teams.",
};

const SKILL_ALIGNMENTS = [
  { skillName: "High Agency", candidateScore: 85, requiredScore: 80, gap: 5, alignment: "exceeds", criticality: "critical" },
  { skillName: "Intellectual Curiosity", candidateScore: 88, requiredScore: 85, gap: 3, alignment: "exceeds", criticality: "critical" },
  { skillName: "Resilience", candidateScore: 78, requiredScore: 75, gap: 3, alignment: "meets", criticality: "standard" },
  { skillName: "Empathy & Ethics", candidateScore: 84, requiredScore: 80, gap: 4, alignment: "exceeds", criticality: "standard" },
  { skillName: "Growth Mindset", candidateScore: 86, requiredScore: 85, gap: 1, alignment: "meets", criticality: "critical" },
  { skillName: "Interpersonal Agility", candidateScore: 80, requiredScore: 85, gap: -5, alignment: "gap", criticality: "standard" },
];

const AI_SKILL_ALIGNMENTS = [
  { skillName: "AI Literacy & Prompt Engineering", candidateScore: 82, requiredScore: 80, gap: 2, alignment: "meets", criticality: "critical" },
  { skillName: "Technical Fundamentals", candidateScore: 75, requiredScore: 70, gap: 5, alignment: "exceeds", criticality: "standard" },
  { skillName: "Data Fluency", candidateScore: 78, requiredScore: 75, gap: 3, alignment: "exceeds", criticality: "standard" },
  { skillName: "Critical Thinking & Problem-Solving", candidateScore: 85, requiredScore: 80, gap: 5, alignment: "exceeds", criticality: "critical" },
  { skillName: "Adaptability & Continuous Learning", candidateScore: 88, requiredScore: 85, gap: 3, alignment: "exceeds", criticality: "standard" },
  { skillName: "Collaboration & Communication", candidateScore: 80, requiredScore: 75, gap: 5, alignment: "exceeds", criticality: "standard" },
  { skillName: "Responsible AI & Ethical Awareness", candidateScore: 90, requiredScore: 85, gap: 5, alignment: "exceeds", criticality: "critical" },
  { skillName: "Creativity & Innovation", candidateScore: 76, requiredScore: 70, gap: 6, alignment: "exceeds", criticality: "standard" },
];

const INTERVIEW_QUESTIONS = [
  {
    question: "Tell me about a time when you had to influence stakeholders without direct authority. How did you approach it?",
    purpose: "Assess interpersonal agility and influence skills in cross-functional settings",
    targetSkill: "Interpersonal Agility",
  },
  {
    question: "Describe a situation where you had to make a product decision with incomplete data. What was your process?",
    purpose: "Evaluate decision-making under uncertainty and intellectual curiosity",
    targetSkill: "Intellectual Curiosity",
  },
  {
    question: "How do you approach ethical considerations when designing AI-powered features?",
    purpose: "Assess responsible AI mindset and ethical decision-making framework",
    targetSkill: "Responsible AI & Ethical Awareness",
  },
  {
    question: "Share an example of a product initiative that failed. What did you learn and how did you apply those lessons?",
    purpose: "Evaluate resilience, growth mindset, and learning orientation",
    targetSkill: "Growth Mindset",
  },
];

const ROLE_FLEXIBILITY = [
  { roleName: "Product Manager (AI)", fitScore: 87, coverageLabel: "High" },
  { roleName: "Technical Product Manager", fitScore: 82, coverageLabel: "High" },
  { roleName: "Product Owner", fitScore: 78, coverageLabel: "Medium" },
  { roleName: "Program Manager", fitScore: 74, coverageLabel: "Medium" },
];

const COHORT_BENCHMARKS: AssessmentBenchmark[] = [
  { assessmentType: "FIT Assessment (Behavioral)", skillsCompared: "6 skills", avgPercentile: 69, position: "above" },
  { assessmentType: "AI Readiness Assessment", skillsCompared: "8 skills", avgPercentile: 73, position: "above" },
  { assessmentType: "Prompt Architecture", skillsCompared: "1 composite score", avgPercentile: 90, position: "above" },
  { assessmentType: "Artificial Intelligence Quotient (AIQ)", skillsCompared: "1 composite score", avgPercentile: 89, position: "above" },
];

const DEMO_PROMPT_ROLE_FIT_ANALYSIS = `Sarah Chen's Prompt Architecture assessment reveals a candidate in the top 10% of our platform cohort, with a composite score that significantly exceeds the threshold for AI-augmented product management roles.

Her responses demonstrate sophisticated prompt construction techniques — she consistently applies chain-of-thought reasoning, uses role-assignment framing, and iterates on ambiguous outputs with precision. In particular, her ability to constrain AI output format while preserving contextual flexibility shows advanced prompt engineering intuition.

For the Product Manager (AI) role, this capability directly translates to faster prototyping of AI-assisted features, more accurate requirements communication with engineering teams, and higher-quality AI-generated research synthesis. We assess her prompt engineering capability as a durable competitive advantage rather than a surface-level skill.`;

const DEMO_AIQ_ROLE_FIT_ANALYSIS = `Sarah Chen's Artificial Intelligence Quotient (AIQ) score places her in the top 11% of assessed candidates, reflecting a mature and nuanced understanding of AI ethics, limitations, and organizational governance.

Her responses demonstrate a balanced appreciation for AI's transformational potential alongside an informed awareness of its failure modes — including hallucination risks, data bias, and over-reliance patterns. She correctly identifies scenarios where human oversight is non-negotiable and articulates structured frameworks for AI deployment decisions.

In the context of the Product Manager (AI) role, this ethical grounding is particularly valuable: she will be positioned to make high-stakes decisions about which AI capabilities to expose to end users and how to communicate uncertainty. Her AIQ profile suggests she will serve as a responsible steward of AI adoption within the product organization.`;

const DEMO_NEXT_STEPS = [
  "Proceed to final-stage behavioral interview focused on stakeholder influence and cross-functional leadership scenarios",
  "Assign a technical take-home task that requires designing an AI-assisted product feature end-to-end, including prompt design and output evaluation",
  "Conduct a structured reference check with at least one prior engineering partner to validate Human-AI Collaboration scores",
  "If selected, design a 90-day onboarding plan with targeted coaching on Data Fluency and Technical Fundamentals to close the identified gaps",
  "Share this report with the hiring panel and use the Critical Skills Analysis section as the interview question framework",
];

const DEMO_FINAL_RECOMMENDATION = `COHORT CONTEXT:
Sarah Chen ranks in the 84th percentile across all assessed candidates on the HumanMetrix platform. She performs above average in every assessment category — placing in the top 31% on FIT behavioral skills, top 27% on AI Readiness, top 10% on Prompt Architecture, and top 11% on AIQ. This is a consistently high-performing profile across all four dimensions.

HIRING RECOMMENDATION:
Sarah Chen is recommended for progression to the final interview stage for the Product Manager (AI) role. Her overall fit score of 84% reflects strong alignment with the behavioral and technical requirements of the position. The two identified development areas (Data Fluency and Technical Fundamentals) are addressable through structured onboarding and do not represent blockers to role success.

CRITICAL SKILLS ANALYSIS:
Sarah exceeds requirements in the highest-criticality skills: High Agency, Growth Mindset, and AI Literacy & Prompt Engineering — the three competencies most predictive of success in AI-adjacent product leadership. Her 5-point gap in Data Fluency is the only meaningful risk factor, and her strong AI Literacy score (88/80) suggests she has the self-awareness and technical vocabulary to close this gap rapidly with targeted support.

ALTERNATIVE ROLE INSIGHT:
Given her exceptional prompt engineering results, Sarah would also be well-positioned for a Technical Product Manager role or an AI Product Strategy function should the primary role not progress. Her cohort benchmarks remain strong across all role variants evaluated in this report.`;

export default function SampleRoleFitReport() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const criticalSkillNames = [...SKILL_ALIGNMENTS, ...AI_SKILL_ALIGNMENTS]
        .filter(s => s.criticality === "critical")
        .map(s => s.skillName);

      const strengths = [...SKILL_ALIGNMENTS, ...AI_SKILL_ALIGNMENTS]
        .filter(s => s.alignment === "exceeds")
        .map(s => `${s.skillName} (${s.candidateScore}/${s.requiredScore})`);

      const gaps = [...SKILL_ALIGNMENTS, ...AI_SKILL_ALIGNMENTS]
        .filter(s => s.alignment === "gap")
        .map(s => `${s.skillName} (${s.candidateScore}/${s.requiredScore})`);

      await exportRoleFitPDF({
        candidate: {
          user: {
            firstName: "Sarah",
            lastName: "Chen",
            email: DEMO_CANDIDATE.email,
          },
          results: [],
        },
        role: {
          name: DEMO_ROLE.name,
          description: DEMO_ROLE.description,
        },
        criticalSkillNames,
        alignment: {
          overallFit: overallFitScore,
          fitSkillAlignments: SKILL_ALIGNMENTS,
          aiReadinessSkillAlignments: AI_SKILL_ALIGNMENTS,
          strengths,
          gaps,
          interviewQuestions: INTERVIEW_QUESTIONS,
          roleFlexibility: ROLE_FLEXIBILITY.map((r, i) => ({
            roleId: String(i),
            roleName: r.roleName,
            fitScore: r.fitScore,
            coverageLabel: r.coverageLabel as "High" | "Medium" | "Limited",
          })),
          cohortBenchmarks: {
            fit: { percentile: 69, totalCandidates: 500, skillCount: 6, avgScore: 82 },
            ai_readiness: { percentile: 73, totalCandidates: 500, skillCount: 8, avgScore: 81 },
            prompt_architecture: { percentile: 90, totalCandidates: 500, avgScore: 84 },
            aiq: { percentile: 89, totalCandidates: 500, avgScore: 84 },
          },
          promptRoleFitAnalysis: DEMO_PROMPT_ROLE_FIT_ANALYSIS,
          aiqRoleFitAnalysis: DEMO_AIQ_ROLE_FIT_ANALYSIS,
          nextSteps: DEMO_NEXT_STEPS,
          finalRecommendation: DEMO_FINAL_RECOMMENDATION,
        },
      });

      toast({
        title: "PDF exported successfully",
        description: "Your role fit analysis has been downloaded.",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error instanceof Error ? error.message : String(error), error);
      toast({
        title: "Export failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getAlignmentIcon = (alignment: string) => {
    if (alignment === "exceeds") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (alignment === "meets") return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  };

  const getAlignmentBadge = (alignment: string) => {
    if (alignment === "exceeds") return <Badge variant="default" className="bg-green-500">Exceeds</Badge>;
    if (alignment === "meets") return <Badge variant="secondary">Meets</Badge>;
    return <Badge variant="outline" className="text-amber-600 border-amber-600">Gap</Badge>;
  };

  const getCriticalityBadge = (criticality: string) => {
    if (criticality === "critical") return <Badge variant="destructive" className="text-xs">Critical</Badge>;
    return <Badge variant="outline" className="text-xs">Standard</Badge>;
  };

  const overallFitScore = 84;

  const allCriticalSkills = [...SKILL_ALIGNMENTS, ...AI_SKILL_ALIGNMENTS].filter(s => s.criticality === "critical");
  const criticalSkillsMet = allCriticalSkills.filter(s => s.candidateScore >= s.requiredScore).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1">
        <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 max-w-6xl">
          <div className="mb-4 md:mb-6">
            <Link href="/#sample-reports">
              <Button variant="ghost" size="sm" className="mb-2 md:mb-4 text-xs md:text-sm" data-testid="button-back">
                <ArrowLeft className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                Back to Sample Reports
              </Button>
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1 md:mb-2">
                  <Badge variant="outline" className="text-primary border-primary text-[10px] md:text-xs">
                    Sample Report
                  </Badge>
                </div>
                <h1 className="text-lg md:text-3xl font-bold" data-testid="text-page-title">
                  Role Fit Analysis Report
                </h1>
                <p className="text-xs md:text-base text-muted-foreground mt-1">
                  {DEMO_CANDIDATE.name} for {DEMO_ROLE.name} position
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting}
                data-testid="button-export-pdf"
                className="self-start md:self-auto"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isExporting ? "Generating..." : "Export PDF"}
              </Button>
            </div>
          </div>

          {/* How to Read This Report */}
          <Card className="mb-8" data-testid="section-how-to-read">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg" data-testid="heading-how-to-read">
                <FileText className="h-5 w-5 text-primary" />
                How to Read This Report
              </CardTitle>
              <p className="text-sm text-muted-foreground" data-testid="text-guide-intro">
                A step-by-step guide to understanding this role fit analysis for the {DEMO_ROLE.name} role
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <span className="font-medium text-sm">Role Alignment Tiers</span>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-1">
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">75%+</Badge> <span>High alignment,</span>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">50-74%</Badge> <span>Moderate,</span>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">&lt;50%</Badge> <span>Development needed</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="font-medium text-sm">Skill Criticality</p>
                    <p className="text-xs text-muted-foreground">
                      Skills are prioritised based on how essential they are for success in this role. Focus on critical skills first when evaluating candidates.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="font-medium text-sm">Understanding Trait Scores</p>
                    <p className="text-xs text-muted-foreground">FIT and AI Readiness are <strong>trait-based</strong>. Higher scores indicate stronger trait presence - whether beneficial depends on role requirements.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <p className="font-medium text-sm">Prompt Architecture Scores</p>
                    <p className="text-xs text-muted-foreground">Measures <strong>AI prompt engineering</strong> ability across 7 progressive levels - from basic prompts to advanced multi-agent orchestration.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
                  <div>
                    <p className="font-medium text-sm">AIQ (Algorithmic Integrity Quotient)</p>
                    <p className="text-xs text-muted-foreground">Assesses <strong>ethical AI decision-making</strong> - how candidates balance efficiency, fairness, and transparency in AI-driven scenarios.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">6</div>
                  <div>
                    <p className="font-medium text-sm">Gap Analysis</p>
                    <p className="text-xs text-muted-foreground">Gaps show difference between candidate score and role requirement, helping identify where development may be needed.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hiring Recommendation - Dashboard Style with Trophy */}
          <Card className="mb-6 border-2 border-green-500" data-testid="section-recommendation">
            <CardHeader className="bg-green-50 dark:bg-green-950/30">
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Trophy className="h-6 w-6" />
                Hiring Recommendation
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                For <span className="font-semibold">{DEMO_ROLE.level} {DEMO_ROLE.name}</span> position in {DEMO_ROLE.department}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl font-bold">
                      1
                    </div>
                    <div>
                      <div className="text-xl font-bold">{DEMO_CANDIDATE.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-bold text-green-600">{overallFitScore}%</span>
                        <Badge className="bg-green-500 text-white">Strong Fit</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Why This Candidate?</h4>
                    <ul className="space-y-2">
                      <li className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Strong alignment with role requirements across all assessment dimensions</span>
                      </li>
                      <li className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Exceptional intellectual curiosity (88%) and responsible AI understanding (90%)</span>
                      </li>
                      <li className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Meets or exceeds {criticalSkillsMet} of {allCriticalSkills.length} critical skill requirements</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">Critical Skill Advantages</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        Responsible AI (+5 vs req)
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        Critical Thinking (+5 vs req)
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        High Agency (+5 vs req)
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-l-2 border-gray-200 dark:border-gray-700 pl-6">
                  <h4 className="font-semibold text-muted-foreground mb-3">Development Areas to Address</h4>
                  
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <h4 className="font-medium text-sm text-amber-700 dark:text-amber-400 mb-2">
                      Gap Identified
                    </h4>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="font-medium">Interpersonal Agility</p>
                        <p className="text-xs text-muted-foreground">Score: 80 | Required: 85 | Gap: -5</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      This minor gap can be validated during interview with stakeholder management scenarios.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Recommended Next Steps</h4>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      {(() => {
                        const allSkills = [...SKILL_ALIGNMENTS, ...AI_SKILL_ALIGNMENTS];
                        const gaps = allSkills.filter(s => s.gap < 0);
                        const strengths = allSkills.filter(s => s.gap > 0).sort((a, b) => b.gap - a.gap);
                        const steps: Array<{ title: string; detail: string }> = [];

                        if (gaps.length > 0) {
                          const gapNames = gaps.map(g => g.skillName).join(', ');
                          steps.push({
                            title: `Probe ${gaps[0].skillName} Gap in Interview with ${DEMO_CANDIDATE.name}`,
                            detail: `${DEMO_CANDIDATE.name} scores ${Math.abs(gaps[0].gap)} points below the required level in ${gapNames}. Design behavioral interview questions targeting stakeholder management scenarios to determine whether this reflects a genuine capability limitation or situational assessment factors.`
                          });
                        }

                        if (strengths.length > 0) {
                          const strengthNames = strengths.slice(0, 3).map(s => `${s.skillName} (+${s.gap} pts)`).join(', ');
                          steps.push({
                            title: `Leverage ${DEMO_CANDIDATE.name}'s Key Strengths During Onboarding`,
                            detail: `${DEMO_CANDIDATE.name} exceeds requirements in: ${strengthNames}. Consider assigning early responsibilities or projects that capitalize on these strengths to accelerate impact and build confidence in the ${DEMO_ROLE.name} role.`
                          });
                        }

                        if (gaps.length > 0) {
                          const devAreas = gaps.map(g => `${g.skillName} (${Math.abs(g.gap)} pts below threshold)`).join(', ');
                          steps.push({
                            title: `Design a Targeted Development Plan for ${DEMO_CANDIDATE.name}`,
                            detail: `If proceeding with ${DEMO_CANDIDATE.name}, prepare a structured onboarding plan that addresses: ${devAreas}. Pair them with mentors strong in these areas and set 30/60/90-day milestones to track improvement.`
                          });
                        }

                        steps.push({
                          title: 'Conduct Reference Checks Aligned to Role Requirements',
                          detail: `Focus reference conversations on the specific competencies required for ${DEMO_ROLE.name}. ${gaps.length > 0 ? `Pay special attention to references that can speak to ${DEMO_CANDIDATE.name}'s abilities in ${gaps[0].skillName}.` : `Validate ${DEMO_CANDIDATE.name}'s assessment strengths through concrete examples from past roles.`}`
                        });

                        return steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-medium mt-0.5">
                              {i + 1}
                            </span>
                            <div>
                              <div className="text-sm font-medium text-foreground">{step.title}</div>
                              <div className="text-sm text-muted-foreground mt-0.5">{step.detail}</div>
                            </div>
                          </li>
                        ));
                      })()}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Critical Skills Dashboard - Dashboard Style */}
          <Card className="mb-6 border-2 border-red-200 dark:border-red-800" data-testid="section-critical-skills">
            <CardHeader className="bg-red-50 dark:bg-red-950/30">
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-6 w-6" />
                Critical Skills Dashboard
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Must-have skills for this role. Candidates must meet thresholds (60+) on these skills to be considered.
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold bg-muted/50">Critical Skill</th>
                      <th className="text-center p-3 font-semibold bg-muted/50">Required</th>
                      <th className="text-center p-3 font-semibold bg-green-50 dark:bg-green-950/30">
                        <div className="flex flex-col items-center gap-1">
                          <span>{DEMO_CANDIDATE.name.split(' ')[0]}</span>
                          <Badge className="bg-green-600 text-white text-xs">Candidate</Badge>
                        </div>
                      </th>
                      <th className="text-center p-3 font-semibold bg-muted/50">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCriticalSkills.map((skill, idx) => {
                      const meetsThreshold = skill.candidateScore >= 60;
                      const meetsRequired = skill.candidateScore >= skill.requiredScore;
                      return (
                        <tr key={skill.skillName} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                          <td className="p-3 font-medium">{skill.skillName}</td>
                          <td className="text-center p-3">
                            <Badge variant="outline" className="text-red-600 border-red-300">{skill.requiredScore}+</Badge>
                          </td>
                          <td className="text-center p-3 bg-green-50/50 dark:bg-green-950/20">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`font-bold text-lg ${meetsRequired ? 'text-green-600' : meetsThreshold ? 'text-amber-600' : 'text-red-600'}`}>
                                {skill.candidateScore}
                              </span>
                            </div>
                          </td>
                          <td className="text-center p-3">
                            {meetsRequired ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                            ) : meetsThreshold ? (
                              <AlertCircle className="h-5 w-5 text-amber-500 mx-auto" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-red-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-semibold">
                      <td className="p-3">Critical Skills Met</td>
                      <td className="text-center p-3">—</td>
                      <td className="text-center p-3 bg-green-50/50 dark:bg-green-950/20">
                        <span className="text-lg font-bold text-green-600">
                          {criticalSkillsMet}/{allCriticalSkills.length}
                        </span>
                        {criticalSkillsMet === allCriticalSkills.length && (
                          <Badge className="ml-2 bg-green-600 text-white">All Met</Badge>
                        )}
                      </td>
                      <td className="text-center p-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Meets or exceeds required score</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span>Above 60 but below required</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span>Below minimum threshold (60)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Analytics */}
          <Card className="mb-6" data-testid="section-advanced-analytics">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Advanced Analytics
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Deep-dive metrics to help you understand candidate strengths beyond overall fit scores
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Skill Dominance Count
                  </h4>
                  <p className="text-sm text-muted-foreground">How many skills does this candidate lead in vs role requirements?</p>
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <span className="font-medium">{DEMO_CANDIDATE.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-green-600">9</span>
                      <span className="text-sm text-muted-foreground">/ 11 skills above requirement</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    Score Consistency
                  </h4>
                  <p className="text-sm text-muted-foreground">How consistent are the scores across all skills?</p>
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <span className="font-medium">{DEMO_CANDIDATE.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-blue-600">87%</span>
                      <Badge variant="secondary" className="text-xs">Very Consistent</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic">Low variance indicates reliable performance across competencies.</p>
                </div>

                <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Critical Gap Ratio
                  </h4>
                  <p className="text-sm text-muted-foreground">Proportion of critical skills with gaps</p>
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <span className="font-medium">{DEMO_CANDIDATE.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-green-600">0%</span>
                      <Badge className="bg-green-500 text-white text-xs">Low Risk</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    Largest Differential
                  </h4>
                  <p className="text-sm text-muted-foreground">Greatest variance from role requirement</p>
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div>
                      <span className="font-medium">Responsible AI</span>
                      <Badge variant="outline" className="ml-2 text-xs text-red-600 border-red-300">Critical</Badge>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-green-600">+5</span>
                      <span className="text-sm text-muted-foreground ml-1">points above required</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skill-by-Skill Analysis Table */}
          <Card className="mb-6" data-testid="section-skill-analysis">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Skill-by-Skill Analysis
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete breakdown of candidate performance against role requirements
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-semibold">Skill</th>
                      <th className="text-center p-3 font-semibold">Criticality</th>
                      <th className="text-center p-3 font-semibold">Required</th>
                      <th className="text-center p-3 font-semibold">Score</th>
                      <th className="text-center p-3 font-semibold">Gap</th>
                      <th className="text-center p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b bg-muted/30">
                      <td colSpan={6} className="p-2 font-semibold text-muted-foreground">FIT Assessment</td>
                    </tr>
                    {SKILL_ALIGNMENTS.map((skill, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-3 font-medium">{skill.skillName}</td>
                        <td className="text-center p-3">{getCriticalityBadge(skill.criticality)}</td>
                        <td className="text-center p-3">{skill.requiredScore}</td>
                        <td className="text-center p-3">
                          <span className={`font-bold ${skill.candidateScore >= skill.requiredScore ? 'text-green-600' : 'text-amber-600'}`}>
                            {skill.candidateScore}
                          </span>
                        </td>
                        <td className="text-center p-3">
                          <span className={skill.gap >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {skill.gap > 0 ? '+' : ''}{skill.gap}
                          </span>
                        </td>
                        <td className="text-center p-3">{getAlignmentBadge(skill.alignment)}</td>
                      </tr>
                    ))}
                    <tr className="border-b bg-muted/30">
                      <td colSpan={6} className="p-2 font-semibold text-muted-foreground">AI Readiness</td>
                    </tr>
                    {AI_SKILL_ALIGNMENTS.map((skill, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-3 font-medium">{skill.skillName}</td>
                        <td className="text-center p-3">{getCriticalityBadge(skill.criticality)}</td>
                        <td className="text-center p-3">{skill.requiredScore}</td>
                        <td className="text-center p-3">
                          <span className={`font-bold ${skill.candidateScore >= skill.requiredScore ? 'text-green-600' : 'text-amber-600'}`}>
                            {skill.candidateScore}
                          </span>
                        </td>
                        <td className="text-center p-3">
                          <span className={skill.gap >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {skill.gap > 0 ? '+' : ''}{skill.gap}
                          </span>
                        </td>
                        <td className="text-center p-3">{getAlignmentBadge(skill.alignment)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Critical Skills Analysis - using shared component */}
          <div className="mb-6">
            <CriticalSkillsAnalysis 
              skills={[...SKILL_ALIGNMENTS, ...AI_SKILL_ALIGNMENTS].map(s => ({
                skillName: s.skillName,
                candidateScore: s.candidateScore,
                requiredScore: s.requiredScore,
                gap: s.gap,
                criticality: s.criticality,
              }))}
              candidateName={DEMO_CANDIDATE.name}
            />
          </div>

          {/* Cohort Benchmarking - using shared component */}
          <div className="mb-6">
            <CohortBenchmarking
              overallPosition={4}
              assessments={COHORT_BENCHMARKS}
            />
          </div>

          <Card className="mb-6" data-testid="section-role-flexibility">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Alternative Role Fit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Based on the candidate's profile, here are other roles they may be well-suited for:
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {ROLE_FLEXIBILITY.map((role, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{role.roleName}</p>
                      <p className="text-xs text-muted-foreground">Coverage: {role.coverageLabel}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${role.fitScore >= 80 ? 'text-green-600' : 'text-blue-600'}`}>
                        {role.fitScore}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skills Legend */}
          <SkillsLegend className="mb-8" compact data-testid="section-skills-legend" />

          {/* Additional Services Section */}
          <Card className="mb-8" data-testid="section-additional-services">
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
                <div className="p-4 pt-6 bg-muted/30 rounded-lg relative" data-testid="card-service-cohort">
                  <Badge className="absolute -top-2 right-2 bg-amber-500 text-white border-amber-600 text-xs">Coming Soon</Badge>
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

          <Card data-testid="section-cta">
            <CardContent className="py-6 md:py-8 text-center">
              <h3 className="text-lg md:text-xl font-semibold mb-2">Ready to assess your candidates?</h3>
              <p className="text-xs md:text-base text-muted-foreground mb-3 md:mb-4">
                Get detailed role fit analysis for data-driven hiring decisions with HumanMetrix assessments.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-center flex-wrap">
                <Button size="default" variant="secondary" className="text-xs md:text-sm" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} data-testid="button-back-to-top">
                  <ArrowUp className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                  Back to Top
                </Button>
                <Link href="/#sample-reports">
                  <Button size="default" className="text-xs md:text-sm" data-testid="button-back-to-samples">
                    Back to Sample Reports
                  </Button>
                </Link>
                <Link href="/assessments">
                  <Button size="default" variant="outline" className="text-xs md:text-sm" data-testid="button-view-assessments">
                    View Assessments
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
