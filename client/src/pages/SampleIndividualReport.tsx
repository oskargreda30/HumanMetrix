import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, AlertTriangle, User, Calendar, FileText, Target, MessageSquare, Users, Rocket, Star, Mail } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getSkillAcronym } from "@/lib/assessmentSkills";
import { getAIQBandInterpretation } from "@/data/aiq-questions";
import SkillsLegend from "@/components/SkillsLegend";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const DEMO_CANDIDATE = {
  name: "Demo Candidate 1",
  email: "demo.candidate1@example.com",
  completedDate: "January 15, 2026",
};

const MOCK_FIT_SCORES = {
  "High Agency": 78,
  "Intellectual Curiosity": 85,
  "Resilience": 68,
  "Empathy & Ethics": 88,
  "Growth Mindset": 81,
  "Interpersonal Agility": 76,
};

const MOCK_AI_READINESS_SCORES = {
  "AI Literacy & Prompting": 82,
  "Technical Fluency": 68,
  "Critical Thinking": 79,
  "Adaptive Learning": 85,
  "Responsible AI": 91,
  "Creative Innovation": 74,
  "Cross-functional Collaboration": 77,
};

const MOCK_PROMPT_SCORES = {
  clarity: 78,
  structure: 82,
  contextRelevance: 75,
  creativity: 71,
  iterativeImprovement: 80,
};
const MOCK_PROMPT_TOTAL = 77;

const MOCK_AIQ_SCORE = 74;

function generateMockAnalysis(assessmentType: string, scores: Record<string, number>, totalScore?: number) {
  const sortedSkills = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));
  const strengths = sortedSkills.filter(([_, score]) => (score as number) >= 70);
  const improvements = sortedSkills.filter(([_, score]) => (score as number) < 70);
  
  const analysis = {
    strengths: [] as string[],
    improvements: [] as string[],
    overall: "",
  };

  switch (assessmentType) {
    case "fit":
      analysis.overall = "This FIT assessment evaluates core behavioral competencies essential for workplace success and team collaboration.";
      
      if (strengths.length > 0) {
        strengths.forEach(([skill, score]) => {
          if (skill === "High Agency") {
            analysis.strengths.push(`Demonstrates strong **High Agency** (${score}/100): Takes initiative, drives outcomes independently, and shows proactive problem-solving abilities.`);
          } else if (skill === "Intellectual Curiosity") {
            analysis.strengths.push(`Exhibits excellent **Intellectual Curiosity** (${score}/100): Shows eagerness to learn, asks thoughtful questions, and seeks to understand complex concepts.`);
          } else if (skill === "Resilience") {
            analysis.strengths.push(`Shows robust **Resilience** (${score}/100): Bounces back from setbacks, maintains composure under pressure, and adapts to changing circumstances.`);
          } else if (skill === "Empathy & Ethics") {
            analysis.strengths.push(`Displays strong **Empathy & Ethics** (${score}/100): Considers others' perspectives, makes ethical decisions, and demonstrates social awareness.`);
          } else if (skill === "Growth Mindset") {
            analysis.strengths.push(`Possesses a strong **Growth Mindset** (${score}/100): Views challenges as opportunities, embraces feedback, and believes in continuous improvement.`);
          } else if (skill === "Interpersonal Agility") {
            analysis.strengths.push(`Excels in **Interpersonal Agility** (${score}/100): Builds relationships effectively, adapts communication style, and collaborates seamlessly across diverse teams.`);
          }
        });
      }
      
      if (improvements.length > 0) {
        improvements.forEach(([skill, score]) => {
          if (skill === "Resilience") {
            analysis.improvements.push(`**Resilience** (${score}/100): Focus on stress management techniques, reframing setbacks as learning opportunities, and maintaining motivation through challenges.`);
          } else if (skill === "High Agency") {
            analysis.improvements.push(`**High Agency** (${score}/100): Develop greater initiative-taking behaviors, practice leading projects independently, and strengthen decision-making confidence.`);
          } else if (skill === "Intellectual Curiosity") {
            analysis.improvements.push(`**Intellectual Curiosity** (${score}/100): Cultivate deeper questioning habits, explore cross-disciplinary knowledge, and engage more actively with complex problems.`);
          } else if (skill === "Empathy & Ethics") {
            analysis.improvements.push(`**Empathy & Ethics** (${score}/100): Practice active listening, consider multiple perspectives in decision-making, and strengthen ethical reasoning in ambiguous situations.`);
          } else if (skill === "Growth Mindset") {
            analysis.improvements.push(`**Growth Mindset** (${score}/100): Embrace challenges as learning opportunities, seek constructive feedback, and develop persistence through difficulties.`);
          } else if (skill === "Interpersonal Agility") {
            analysis.improvements.push(`**Interpersonal Agility** (${score}/100): Expand comfort with diverse communication styles, practice adaptability in team dynamics, and build broader relationship networks.`);
          }
        });
      }
      break;

    case "ai_readiness":
      analysis.overall = "This AI Readiness assessment measures capabilities critical for effective collaboration with AI systems and thriving in AI-augmented environments.";
      
      strengths.forEach(([skill, score]) => {
        analysis.strengths.push(`Strong **${skill}** (${score}/100): Shows proficiency in this important AI readiness dimension.`);
      });
      
      improvements.forEach(([skill, score]) => {
        analysis.improvements.push(`**${skill}** (${score}/100): This area would benefit from targeted development and practical experience.`);
      });
      break;

    case "prompt_architecture":
      analysis.overall = `This Prompt Architecture assessment evaluates prompt design skills across progressive difficulty levels. Overall score: **${totalScore}/100**. Prompts are evaluated on five equal dimensions (20% each): Clarity, Structure, Context Relevance, Creativity, and Iterative Improvement.`;
      analysis.strengths.push(`**Solid prompt engineering foundation**: Can create effective prompts with good structure and clarity for most use cases.`);
      analysis.strengths.push(`**Good contextual awareness**: Demonstrates understanding of how to provide relevant context to AI systems.`);
      analysis.improvements.push(`**Advanced techniques**: Explore iterative refinement strategies and more sophisticated prompt patterns.`);
      break;

    case "aiq":
      const aiqScore = totalScore || 0;
      const bandInterpretation = getAIQBandInterpretation(aiqScore);
      
      analysis.overall = `This Algorithmic Integrity Quotient (AIQ) assessment evaluates ethical reasoning in AI scenarios using graded scoring. Score: **${aiqScore}/100** - **${bandInterpretation.title}** (${bandInterpretation.range}). ${bandInterpretation.description}`;
      analysis.strengths.push(`**Strong ethical foundation**: Shows sound judgment balancing ethical imperatives with operational realities.`);
      analysis.strengths.push(`**Practical ethics awareness**: Understands core principles of responsible AI deployment.`);
      analysis.improvements.push(`**Advanced ethical reasoning**: Consider exploring more complex ethical frameworks and edge cases in AI decision-making.`);
      break;
  }
  
  return analysis;
}

export default function SampleIndividualReport() {
  const fitRadarData = Object.entries(MOCK_FIT_SCORES).map(([skill, score]) => ({
    skill: getSkillAcronym(skill),
    fullName: skill,
    score,
    fullMark: 100,
  }));

  const fitBarData = Object.entries(MOCK_FIT_SCORES).map(([skill, score]) => ({
    skill: skill.length > 15 ? skill.substring(0, 12) + '...' : skill,
    score,
  }));

  const aiRadarData = Object.entries(MOCK_AI_READINESS_SCORES).map(([skill, score]) => ({
    skill: getSkillAcronym(skill),
    fullName: skill,
    score,
    fullMark: 100,
  }));

  const aiBarData = Object.entries(MOCK_AI_READINESS_SCORES).map(([skill, score]) => ({
    skill: skill.length > 15 ? skill.substring(0, 12) + '...' : skill,
    score,
  }));

  const fitAnalysis = generateMockAnalysis("fit", MOCK_FIT_SCORES);
  const aiAnalysis = generateMockAnalysis("ai_readiness", MOCK_AI_READINESS_SCORES);
  const promptAnalysis = generateMockAnalysis("prompt_architecture", MOCK_PROMPT_SCORES, MOCK_PROMPT_TOTAL);
  const aiqAnalysis = generateMockAnalysis("aiq", {}, MOCK_AIQ_SCORE);

  const aiqBand = getAIQBandInterpretation(MOCK_AIQ_SCORE);
  const getAIQBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-600';
    if (score >= 60) return 'bg-blue-600';
    if (score >= 40) return 'bg-amber-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow py-8 md:py-16">
        <div className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8">
          <div className="mb-6">
            <Link href="/#sample-reports">
              <Button variant="ghost" data-testid="button-back-to-samples">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sample Reports
              </Button>
            </Link>
          </div>

          <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b pb-4 mb-8 -mx-4 px-4 md:-mx-6 md:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <Badge variant="secondary" className="mb-2" data-testid="badge-sample-report">Sample Report</Badge>
                <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-sample-report-title">
                  Individual Candidate Report
                </h1>
                <div className="flex items-center gap-4 text-muted-foreground mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span data-testid="text-candidate-name">{DEMO_CANDIDATE.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span data-testid="text-completed-date">{DEMO_CANDIDATE.completedDate}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How to Read This Report */}
          <Card className="mb-8" data-testid="section-how-to-read">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold" data-testid="heading-how-to-read">How to Read This Report</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4" data-testid="text-guide-intro">
                A step-by-step guide to understanding your assessment results and how to use them for career growth
              </p>
              <div className="grid gap-4 md:grid-cols-2">
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
              </div>
            </div>
          </Card>

          <section className="mb-12" data-testid="section-fit-assessment">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold" data-testid="heading-fit-assessment">FIT Assessment</h2>
                <p className="text-muted-foreground text-sm" data-testid="text-fit-subtitle">Behavioral competencies for workplace success</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-center" data-testid="heading-fit-radar">Skills Radar</h3>
                <div data-testid="chart-fit-radar">
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={fitRadarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis 
                      dataKey="skill" 
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 100]}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-center" data-testid="heading-fit-breakdown">Skills Breakdown</h3>
                <div className="space-y-4" data-testid="container-fit-skills">
                  {Object.entries(MOCK_FIT_SCORES).map(([skill, score]) => (
                    <div key={skill} className="space-y-2" data-testid={`fit-skill-${skill.toLowerCase().replace(/\s+/g, '-')}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium" data-testid={`text-fit-skill-name-${skill.toLowerCase().replace(/\s+/g, '-')}`}>{skill}</span>
                        <Badge variant={score >= 80 ? "default" : score >= 60 ? "secondary" : "outline"} data-testid={`badge-fit-score-${skill.toLowerCase().replace(/\s+/g, '-')}`}>
                          {score}%
                        </Badge>
                      </div>
                      <Progress value={score} className="h-2" data-testid={`progress-fit-${skill.toLowerCase().replace(/\s+/g, '-')}`} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4" data-testid="heading-fit-analysis">Analysis</h3>
              <div className="mb-4 p-4 bg-muted/50 rounded-lg" data-testid="text-fit-overview">
                <p className="text-foreground leading-relaxed">{fitAnalysis.overall}</p>
              </div>
              
              {fitAnalysis.strengths.length > 0 && (
                <div className="mb-4" data-testid="container-fit-strengths">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold" data-testid="heading-fit-strengths">Key Strengths</h4>
                  </div>
                  <div className="space-y-2">
                    {fitAnalysis.strengths.map((strength, index) => (
                      <div key={index} className="p-3 bg-primary/5 rounded-lg border-l-4 border-primary" data-testid={`fit-strength-${index}`}>
                        <p className="text-sm text-foreground leading-relaxed"
                           dangerouslySetInnerHTML={{ __html: strength.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fitAnalysis.improvements.length > 0 && (
                <div data-testid="container-fit-improvements">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <h4 className="font-semibold" data-testid="heading-fit-improvements">Areas for Development</h4>
                  </div>
                  <div className="space-y-2">
                    {fitAnalysis.improvements.map((improvement, index) => (
                      <div key={index} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-500" data-testid={`fit-improvement-${index}`}>
                        <p className="text-sm text-foreground leading-relaxed"
                           dangerouslySetInnerHTML={{ __html: improvement.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </section>

          <section className="mb-12" data-testid="section-ai-readiness">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold" data-testid="heading-ai-readiness-assessment">AI Readiness Assessment</h2>
                <p className="text-muted-foreground text-sm" data-testid="text-ai-subtitle">Capabilities for AI-augmented work</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-center" data-testid="heading-ai-radar">Skills Radar</h3>
                <div data-testid="chart-ai-radar">
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={aiRadarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis 
                      dataKey="skill" 
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 100]}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#06b6d4"
                      fill="#06b6d4"
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-center" data-testid="heading-ai-breakdown">Skills Breakdown</h3>
                <div className="space-y-3" data-testid="container-ai-skills">
                  {Object.entries(MOCK_AI_READINESS_SCORES).map(([skill, score]) => (
                    <div key={skill} className="space-y-1" data-testid={`ai-skill-${skill.toLowerCase().replace(/\s+/g, '-')}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-xs" data-testid={`text-ai-skill-name-${skill.toLowerCase().replace(/\s+/g, '-')}`}>{skill}</span>
                        <Badge variant={score >= 80 ? "default" : score >= 60 ? "secondary" : "outline"} data-testid={`badge-ai-score-${skill.toLowerCase().replace(/\s+/g, '-')}`}>
                          {score}%
                        </Badge>
                      </div>
                      <Progress value={score} className="h-2" data-testid={`progress-ai-${skill.toLowerCase().replace(/\s+/g, '-')}`} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4" data-testid="heading-ai-analysis">Analysis</h3>
              <div className="mb-4 p-4 bg-muted/50 rounded-lg" data-testid="text-ai-overview">
                <p className="text-foreground leading-relaxed">{aiAnalysis.overall}</p>
              </div>
              
              {aiAnalysis.strengths.length > 0 && (
                <div className="mb-4" data-testid="container-ai-strengths">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-cyan-500" />
                    <h4 className="font-semibold" data-testid="heading-ai-strengths">Key Strengths</h4>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2">
                    {aiAnalysis.strengths.slice(0, 4).map((strength, index) => (
                      <div key={index} className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border-l-4 border-cyan-500" data-testid={`ai-strength-${index}`}>
                        <p className="text-sm text-foreground leading-relaxed"
                           dangerouslySetInnerHTML={{ __html: strength.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiAnalysis.improvements.length > 0 && (
                <div data-testid="container-ai-improvements">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <h4 className="font-semibold" data-testid="heading-ai-improvements">Areas for Development</h4>
                  </div>
                  <div className="space-y-2">
                    {aiAnalysis.improvements.map((improvement, index) => (
                      <div key={index} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-500" data-testid={`ai-improvement-${index}`}>
                        <p className="text-sm text-foreground leading-relaxed"
                           dangerouslySetInnerHTML={{ __html: improvement.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </section>

          <section className="mb-12" data-testid="section-prompt-architecture">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold" data-testid="heading-prompt-architecture-assessment">Prompt Architecture Assessment</h2>
                <p className="text-muted-foreground text-sm" data-testid="text-prompt-subtitle">AI prompt design and engineering skills</p>
              </div>
            </div>

            <Card className="p-8 mb-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-muted-foreground mb-2" data-testid="label-prompt-score">Overall Score</h3>
                <div className="text-6xl font-bold text-violet-500 mb-2" data-testid="text-prompt-score">{MOCK_PROMPT_TOTAL}</div>
                <p className="text-muted-foreground">out of 100</p>
              </div>
            </Card>

            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4" data-testid="heading-prompt-dimensions">Dimension Scores</h3>
              <div className="grid md:grid-cols-5 gap-4" data-testid="container-prompt-dimensions">
                {[
                  { name: "Clarity", score: MOCK_PROMPT_SCORES.clarity },
                  { name: "Structure", score: MOCK_PROMPT_SCORES.structure },
                  { name: "Context", score: MOCK_PROMPT_SCORES.contextRelevance },
                  { name: "Creativity", score: MOCK_PROMPT_SCORES.creativity },
                  { name: "Iteration", score: MOCK_PROMPT_SCORES.iterativeImprovement },
                ].map((dim) => (
                  <div key={dim.name} className="text-center p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg" data-testid={`dimension-${dim.name.toLowerCase()}`}>
                    <div className="text-2xl font-bold text-violet-600 dark:text-violet-400" data-testid={`score-${dim.name.toLowerCase()}`}>{dim.score}%</div>
                    <div className="text-sm text-muted-foreground">{dim.name}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4" data-testid="heading-prompt-analysis">Analysis</h3>
              <div className="mb-4 p-4 bg-muted/50 rounded-lg" data-testid="text-prompt-overview">
                <p className="text-foreground leading-relaxed"
                   dangerouslySetInnerHTML={{ __html: promptAnalysis.overall.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div data-testid="container-prompt-strengths">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-violet-500" />
                    <h4 className="font-semibold" data-testid="heading-prompt-strengths">Strengths</h4>
                  </div>
                  <div className="space-y-2">
                    {promptAnalysis.strengths.map((strength, index) => (
                      <div key={index} className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border-l-4 border-violet-500" data-testid={`prompt-strength-${index}`}>
                        <p className="text-sm text-foreground leading-relaxed"
                           dangerouslySetInnerHTML={{ __html: strength.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div data-testid="container-prompt-improvements">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <h4 className="font-semibold" data-testid="heading-prompt-improvements">Development Areas</h4>
                  </div>
                  <div className="space-y-2">
                    {promptAnalysis.improvements.slice(0, 2).map((improvement, index) => (
                      <div key={index} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-500" data-testid={`prompt-improvement-${index}`}>
                        <p className="text-sm text-foreground leading-relaxed"
                           dangerouslySetInnerHTML={{ __html: improvement.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </section>

          <section className="mb-12" data-testid="section-aiq">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold" data-testid="heading-aiq-assessment">Algorithmic Integrity Quotient (AIQ)</h2>
                <p className="text-muted-foreground text-sm" data-testid="text-aiq-subtitle">Ethical reasoning in AI scenarios</p>
              </div>
            </div>

            <Card className="p-8 mb-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-muted-foreground mb-2" data-testid="label-aiq-score">Overall Score</h3>
                <div className="text-6xl font-bold text-emerald-500 mb-2" data-testid="text-aiq-score">{MOCK_AIQ_SCORE}</div>
                <p className="text-muted-foreground">out of 100</p>
              </div>

              <div className="space-y-6" data-testid="container-aiq-progress">
                <div className="flex justify-between text-xs text-muted-foreground" data-testid="container-aiq-scale">
                  <span data-testid="aiq-scale-0">0</span>
                  <span data-testid="aiq-scale-20">20</span>
                  <span data-testid="aiq-scale-40">40</span>
                  <span data-testid="aiq-scale-60">60</span>
                  <span data-testid="aiq-scale-80">80</span>
                  <span data-testid="aiq-scale-100">100</span>
                </div>
                
                <div className="relative">
                  <Progress 
                    value={MOCK_AIQ_SCORE} 
                    className="h-8"
                    indicatorClassName={getAIQBarColor(MOCK_AIQ_SCORE)}
                    data-testid="progress-aiq-score"
                  />
                  
                  {[20, 40, 60, 80].map((mark) => (
                    <div 
                      key={mark}
                      className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/30 pointer-events-none" 
                      style={{ left: `${mark}%` }}
                    />
                  ))}
                  
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-1 rounded text-sm font-bold whitespace-nowrap pointer-events-none"
                    style={{ left: `${Math.min(Math.max(MOCK_AIQ_SCORE, 8), 92)}%` }}
                    data-testid="badge-aiq-score-indicator"
                  >
                    {MOCK_AIQ_SCORE}%
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <Badge className="text-sm px-4 py-1 bg-emerald-600" data-testid="badge-aiq-band">
                    {aiqBand.title}
                  </Badge>
                  <p className="text-muted-foreground text-sm max-w-2xl mx-auto" data-testid="text-aiq-band-description">
                    {aiqBand.description}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4" data-testid="heading-aiq-analysis">Analysis</h3>
              <div className="mb-4 p-4 bg-muted/50 rounded-lg" data-testid="text-aiq-overview">
                <p className="text-foreground leading-relaxed"
                   dangerouslySetInnerHTML={{ __html: aiqAnalysis.overall.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div data-testid="container-aiq-strengths">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <h4 className="font-semibold" data-testid="heading-aiq-strengths">Strengths</h4>
                  </div>
                  <div className="space-y-2">
                    {aiqAnalysis.strengths.map((strength, index) => (
                      <div key={index} className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-l-4 border-emerald-500" data-testid={`aiq-strength-${index}`}>
                        <p className="text-sm text-foreground leading-relaxed"
                           dangerouslySetInnerHTML={{ __html: strength.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div data-testid="container-aiq-improvements">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <h4 className="font-semibold" data-testid="heading-aiq-improvements">Development Areas</h4>
                  </div>
                  <div className="space-y-2">
                    {aiqAnalysis.improvements.map((improvement, index) => (
                      <div key={index} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-500" data-testid={`aiq-improvement-${index}`}>
                        <p className="text-sm text-foreground leading-relaxed"
                           dangerouslySetInnerHTML={{ __html: improvement.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Skills Legend */}
          <section className="mb-8">
            <SkillsLegend compact data-testid="section-skills-legend" />
          </section>

          {/* Additional Services Section */}
          <section className="mb-8" data-testid="section-additional-services">
            <Card>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold" data-testid="heading-career-services">Career Development Services</h3>
                </div>
                <p className="text-muted-foreground mb-6" data-testid="text-services-intro">
                  HumanMetrix offers additional analysis services to support your career journey:
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-career-fit">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold" data-testid="heading-service-career-fit">Career Fit Analysis</h4>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-service-career-fit">
                      Discover which roles and industries best match your skills, traits, and working style
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-interview-prep">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold" data-testid="heading-service-interview-prep">Interview Preparation Guide</h4>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-service-interview-prep">
                      Customized questions you're likely to face based on your profile, with strategies to highlight your strengths
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-work-style">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold" data-testid="heading-service-work-style">Work Style Compatibility</h4>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-service-work-style">
                      Understand how you collaborate and what team environments help you thrive
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-career-roadmap">
                    <div className="flex items-center gap-2 mb-2">
                      <Rocket className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold" data-testid="heading-service-career-roadmap">Career Acceleration Roadmap</h4>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-service-career-roadmap">
                      Personalized development plan with skills to prioritize for faster career progression
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-strengths-growth">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold" data-testid="heading-service-strengths-growth">Strengths & Growth Areas</h4>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-service-strengths-growth">
                      Comprehensive self-awareness report highlighting your competitive advantages and areas for development
                    </p>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-primary/5 rounded-lg flex items-center gap-3" data-testid="container-contact-email">
                  <Mail className="h-5 w-5 text-primary" />
                  <p className="text-sm" data-testid="text-contact-email">
                    Contact us at <a href="mailto:hello@humanmetrix.co.uk" className="font-semibold text-primary underline" data-testid="link-contact-email">hello@humanmetrix.co.uk</a> for more information about these services.
                  </p>
                </div>
              </div>
            </Card>
          </section>

          <div className="text-center py-8 border-t" data-testid="container-footer-cta">
            <p className="text-muted-foreground mb-4" data-testid="text-sample-report-description">
              This is a sample report showing what your complete assessment results will look like.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
              <Button size="lg" variant="secondary" disabled className="opacity-50 cursor-not-allowed" data-testid="button-role-fit-disabled">
                <Target className="mr-2 h-4 w-4" />
                AI Role Fit Analysis
              </Button>
              <Link href="/#sample-reports">
                <Button size="lg" data-testid="button-back-to-samples">
                  Back to Sample Reports
                </Button>
              </Link>
              <Link href="/assessments">
                <Button size="lg" variant="outline" data-testid="button-start-assessments">
                  Start Your Assessment
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-3" data-testid="text-role-fit-note">
              AI Role Fit Analysis powered by OpenAI is available with real candidate data in the Partner Dashboard
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
