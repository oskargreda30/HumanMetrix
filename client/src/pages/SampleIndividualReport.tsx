import { useState } from "react";
import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUp, Download, Loader2, FileText, TrendingUp, Brain, Shield, Zap, Star, Target, Users, MessageSquare, Rocket, Send } from "lucide-react";
import SkillsLegend from "@/components/SkillsLegend";
import { getSkillAcronym } from "@/lib/assessmentSkills";
import { getAIQBandInterpretation } from "@/data/aiq-questions";
import { exportResultsPDF } from "@/lib/pdfScreenCapture";
import {
  RadarChart,
  Radar,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import dashboardBg from "@assets/image_1763608498774.png";

const MOCK_FIT_SCORES: Record<string, number> = {
  "High Agency": 85,
  "Intellectual Curiosity": 88,
  "Resilience": 72,
  "Empathy & Ethics": 84,
  "Growth Mindset": 86,
  "Interpersonal Agility": 79,
};

const MOCK_AI_READINESS_SCORES: Record<string, number> = {
  "AI Literacy & Prompt Engineering": 82,
  "Technical Fundamentals": 75,
  "Data Fluency": 80,
  "Critical Thinking & Problem-Solving": 85,
  "Adaptability & Continuous Learning": 88,
  "Collaboration & Communication": 78,
  "Responsible AI & Ethical Awareness": 90,
  "Creativity & Innovation": 76,
  "Domain Expertise": 84,
};

const MOCK_PROMPT_TOTAL = 75;
const MOCK_PROMPT_PERCENTILE = 72;

const MOCK_AIQ_SCORE = 78;

export default function SampleIndividualReport() {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await exportResultsPDF({
        elementId: "sample-report-individual",
        filename: "humanmetrix-individual-report-sample.pdf",
      });
    } catch (e) {
      console.error("PDF generation failed", e);
    } finally {
      setDownloading(false);
    }
  };

  const fitSorted = Object.entries(MOCK_FIT_SCORES).sort(([, a], [, b]) => b - a);
  const aiSorted = Object.entries(MOCK_AI_READINESS_SCORES).sort(([, a], [, b]) => b - a);
  const fitAvg = Math.round(Object.values(MOCK_FIT_SCORES).reduce((s, v) => s + v, 0) / Object.values(MOCK_FIT_SCORES).length);
  const aiAvg = Math.round(Object.values(MOCK_AI_READINESS_SCORES).reduce((s, v) => s + v, 0) / Object.values(MOCK_AI_READINESS_SCORES).length);

  const allSkillScores = [...Object.entries(MOCK_FIT_SCORES), ...Object.entries(MOCK_AI_READINESS_SCORES)];
  const topSkill = allSkillScores.reduce((best, [name, score]) => score > best.score ? { name, score } : best, { name: "N/A", score: 0 });
  const assessmentScores = [fitAvg, aiAvg, MOCK_PROMPT_TOTAL, MOCK_AIQ_SCORE];
  const overallAvg = Math.round(assessmentScores.reduce((s, v) => s + v, 0) / assessmentScores.length);

  const aiqBand = getAIQBandInterpretation(MOCK_AIQ_SCORE);
  const skillCount = Object.keys(MOCK_FIT_SCORES).length + Object.keys(MOCK_AI_READINESS_SCORES).length;

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url(${dashboardBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(13, 29, 51, 0.85), rgba(13, 29, 51, 0.75), rgba(13, 29, 51, 0.85))",
          }}
        />
      </div>

      <Navigation />

      <main className="flex-grow py-16 relative z-10">
        <div id="sample-report-individual" className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/#sample-reports">
              <Button variant="ghost" className="mb-4 text-white hover:text-white hover:bg-white/10" data-testid="button-back-to-samples">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sample Reports
              </Button>
            </Link>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <Badge variant="secondary" className="mb-2" data-testid="badge-sample-report">Sample Report</Badge>
                <h1 className="text-2xl md:text-3xl font-bold text-white" data-testid="text-sample-report-title">
                  My Assessment Results
                </h1>
                <p className="text-white/80 mt-1">
                  Comprehensive report for Demo Candidate &mdash; January 15, 2026
                </p>
              </div>
              <Button
                onClick={handleDownloadPDF}
                disabled={downloading}
                size="lg"
                className="gap-2"
                data-testid="button-download-pdf"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloading ? "Generating..." : "Download PDF"}
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <Card className="p-4 md:p-6 mb-8" data-testid="card-key-metrics">
            <h2 className="text-base md:text-lg font-semibold mb-4">Key Metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <div className="text-center p-3 md:p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">4</div>
                <div className="text-xs text-muted-foreground">Assessments Completed</div>
              </div>
              <div className="text-center p-3 md:p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{skillCount}</div>
                <div className="text-xs text-muted-foreground">Skills Assessed</div>
              </div>
              <div className="text-center p-3 md:p-4 bg-muted/30 rounded-lg">
                <div className="text-sm font-bold text-primary mb-1 px-1 leading-tight">{topSkill.name}</div>
                <div className="text-xs text-muted-foreground">Top Skill ({topSkill.score})</div>
              </div>
            </div>
          </Card>

          {/* How to Read This Report */}
          <Card className="mb-8" data-testid="section-how-to-read">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">How to Read This Report</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                A step-by-step guide to understanding your assessment results and how to use them for career growth
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <span className="font-medium text-sm">Score Interpretation</span>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-1">
                      <Badge className="bg-green-500 text-white text-[10px] px-1 py-0">75%+</Badge> <span>Strong capability,</span>
                      <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0">50-74%</Badge> <span>Developing,</span>
                      <Badge className="bg-red-500 text-white text-[10px] px-1 py-0">&lt;50%</Badge> <span>Growth opportunity</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="font-medium text-sm">Four Assessment Areas</p>
                    <p className="text-xs text-muted-foreground">
                      Your report covers FIT (behavioral traits), AI Readiness, Prompt Architecture, and AI Ethics (AIQ) - together providing a complete picture of your capabilities.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="font-medium text-sm">Strengths & Development Areas</p>
                    <p className="text-xs text-muted-foreground">
                      Each section highlights your strengths to leverage in interviews and development areas to focus on for career growth.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <p className="font-medium text-sm">Using Your Results</p>
                    <p className="text-xs text-muted-foreground">
                      Share your report with potential employers to demonstrate your capabilities, or use insights to guide your professional development plan.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
                  <div>
                    <p className="font-medium text-sm">Radar Chart Visualization</p>
                    <p className="text-xs text-muted-foreground">
                      The radar chart provides a visual overview of your skills profile, making it easy to identify patterns across dimensions.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">6</div>
                  <div>
                    <p className="font-medium text-sm">Individual Skill Scores</p>
                    <p className="text-xs text-muted-foreground">
                      Review detailed scores for each skill to understand your specific competencies and target areas for improvement.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* FIT Assessment */}
          <Card className="p-6 mb-6" data-testid="card-fit-results">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">FIT Assessment</h2>
                  <p className="text-sm text-muted-foreground">Behavioural Skills (15 Questions)</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-500">{fitAvg}/100</div>
                <div className="text-xs text-muted-foreground">FIT Score</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Strong behavioural competencies including adaptability, curiosity, and interpersonal skills.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-6 p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
              <div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">What It Measures</div>
                <p className="text-sm text-muted-foreground">Six core behavioural skills: High Agency, Intellectual Curiosity, Resilience, Empathy & Ethics, Growth Mindset, and Interpersonal Agility.</p>
              </div>
              <div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">Workplace Impact</div>
                <p className="text-sm text-muted-foreground">Predicts adaptability, initiative, collaboration quality, and resilience under pressure. High scorers drive innovation and navigate ambiguity effectively.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={fitSorted.map(([skill, score]) => ({ skill: getSkillAcronym(skill), score, fullMark: 100 }))}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="skill" tick={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 500 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <Radar name="FIT Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground mb-3">Individual Skill Scores</div>
                {fitSorted.map(([skill, score], index) => (
                  <div key={skill} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0" data-testid={`row-fit-skill-${index}`}>
                    <span className="text-sm">{skill}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${score}%` }} />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* AI Readiness Assessment */}
          <Card className="p-6 mb-6" data-testid="card-ai-readiness-results">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Brain className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">AI Readiness Assessment</h2>
                  <p className="text-sm text-muted-foreground">Technical AI Skills (21 Questions)</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-500">{aiAvg}/100</div>
                <div className="text-xs text-muted-foreground">AI Readiness Score</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Strong AI literacy with ability to leverage AI tools for productivity multiplication.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-6 p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
              <div>
                <div className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">What It Measures</div>
                <p className="text-sm text-muted-foreground">Nine AI-specific competencies: AI Literacy & Prompt Engineering, Technical Fundamentals, Data Fluency, Critical Thinking & Problem-Solving, Adaptability & Continuous Learning, Collaboration & Communication, Responsible AI & Ethical Awareness, Creativity & Innovation, and Domain Expertise.</p>
              </div>
              <div>
                <div className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">Workplace Impact</div>
                <p className="text-sm text-muted-foreground">Determines ability to leverage AI tools for productivity gains, make sound AI-assisted decisions, and integrate AI responsibly into workflows. High scorers multiply their output through effective AI collaboration.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="h-80 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={aiSorted.map(([skill, score]) => ({ skill: getSkillAcronym(skill), score, fullMark: 100 }))}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="skill" tick={{ fill: "hsl(var(--foreground))", fontSize: 10, fontWeight: 500 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <Radar name="AI Readiness" dataKey="score" stroke="#a855f7" fill="#a855f7" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground mb-3">Individual Skill Scores</div>
                {aiSorted.map(([skill, score], index) => (
                  <div key={skill} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0" data-testid={`row-ai-skill-${index}`}>
                    <span className="text-sm truncate mr-2">{skill}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${score}%` }} />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Prompt Architecture Assessment */}
          <Card className="p-6 mb-6" data-testid="card-prompt-arch-results">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Zap className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Prompt Architecture Assessment</h2>
                  <p className="text-sm text-muted-foreground">AI Prompt Engineering (7 Levels)</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-amber-500">{MOCK_PROMPT_TOTAL}/100</div>
                <div className="text-xs text-muted-foreground">Overall Score</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Strong prompt engineering skills; capable of designing effective AI interactions.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-6 p-4 bg-amber-500/5 rounded-lg border border-amber-500/20">
              <div>
                <div className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">What It Measures</div>
                <p className="text-sm text-muted-foreground">Prompt engineering expertise across five equal dimensions (20% each): Clarity, Structure, Context Relevance, Creativity, and Iterative Improvement. Progressive difficulty levels test real-world prompting skills.</p>
              </div>
              <div>
                <div className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">Workplace Impact</div>
                <p className="text-sm text-muted-foreground">Directly correlates with AI productivity. Skilled prompt engineers extract 3-5x more value from AI tools, solve complex problems faster, and produce higher-quality AI-assisted outputs.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl md:text-4xl font-bold text-amber-500 mb-1" data-testid="text-prompt-score">{MOCK_PROMPT_TOTAL}</div>
                <div className="text-sm text-muted-foreground">Total Score</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl md:text-4xl font-bold text-amber-500 mb-1" data-testid="text-prompt-percentile">{MOCK_PROMPT_PERCENTILE}%</div>
                <div className="text-sm text-muted-foreground">Percentile</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg">
                <Badge variant="default" className="mb-2">Competent</Badge>
                <div className="text-sm text-muted-foreground">Performance</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-center border-t pt-3">
              <span className="font-medium">Assessed Dimensions:</span> Clarity (20%) &bull; Structure (20%) &bull; Context Relevance (20%) &bull; Creativity (20%) &bull; Iterative Improvement (20%)
            </div>
          </Card>

          {/* AIQ Assessment */}
          <Card className="p-6 mb-6" data-testid="card-aiq-results">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Shield className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Algorithmic Integrity Quotient (AIQ)</h2>
                  <p className="text-sm text-muted-foreground">AI Ethics & Responsible AI (8 Questions)</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-500">{MOCK_AIQ_SCORE}%</div>
                <div className="text-xs text-muted-foreground">{aiqBand.title}</div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-6 p-4 bg-green-500/5 rounded-lg border border-green-500/20">
              <div>
                <div className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">What It Measures</div>
                <p className="text-sm text-muted-foreground">AI ethics, bias detection, fairness, transparency, and responsible deployment using graded scoring (0-100%). Options weighted by ethical alignment: Best (100%), Acceptable (65-75%), Suboptimal (30-50%), Poor (0-25%).</p>
              </div>
              <div>
                <div className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">Workplace Impact</div>
                <p className="text-sm text-muted-foreground">Graded scoring captures nuanced ethical judgment. Identifies candidates who balance ethical imperatives with operational realities, making them valuable for AI governance and deployment oversight roles.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg">
                <div className="text-3xl md:text-5xl font-bold text-green-500 mb-2" data-testid="text-aiq-score">{MOCK_AIQ_SCORE}%</div>
                <div className="text-lg font-medium mb-1">{aiqBand.title}</div>
                <div className="text-sm text-muted-foreground text-center">Band: {aiqBand.range}</div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Score Interpretation</div>
                  <p className="text-sm leading-relaxed">{aiqBand.description}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Skills Legend */}
          <SkillsLegend className="mb-8" compact data-testid="section-skills-legend" />

          {/* Bottom actions */}
          <div className="flex justify-end gap-3 mb-8" data-testid="container-bottom-actions">
            <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} data-testid="button-back-to-top">
              <ArrowUp className="mr-2 h-4 w-4" />
              Back to Top
            </Button>
            <Button onClick={handleDownloadPDF} disabled={downloading} data-testid="button-export-pdf-bottom">
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {downloading ? "Generating..." : "Download PDF"}
            </Button>
          </div>

          {/* Career Development Services */}
          <Card className="mb-8" data-testid="section-additional-services">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-bold">Career Development Services</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                HumanMetrix offers additional analysis services to support your career journey:
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">Career Fit Analysis</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Discover which roles and industries best match your skills, traits, and working style</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">Interview Preparation Guide</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Customized questions you're likely to face based on your profile, with strategies to highlight your strengths</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">Work Style Compatibility</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Understand how you collaborate and what team environments help you thrive</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">Career Acceleration Roadmap</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Personalized development plan with skills to prioritize for faster career progression</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">Strengths & Growth Areas</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Comprehensive self-awareness report highlighting your competitive advantages and areas for development</p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-primary/5 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
                  <p className="text-sm">Interested in any of these services? Get in touch and we'll help you take the next step.</p>
                </div>
                <Button asChild data-testid="button-contact-enquiry">
                  <a href={`mailto:hello@humanmetrix.co.uk?subject=${encodeURIComponent("Career Development Services Enquiry")}&body=${encodeURIComponent("Hi HumanMetrix,\n\nI've completed my assessments and I'm interested in learning more about your career development services.\n\nPlease let me know what options are available.\n\nThank you")}`}>
                    <Send className="mr-2 h-4 w-4" />
                    Send Enquiry
                  </a>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
