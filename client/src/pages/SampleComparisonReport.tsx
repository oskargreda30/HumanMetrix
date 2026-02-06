import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUp, Users, TrendingUp, TrendingDown, Award, Target, FileText, CheckCircle2, AlertCircle, Trophy, BarChart3, Sparkles, ChevronUp, ChevronDown, Star, MessageSquare, Rocket, Mail, Building2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import SkillsLegend from "@/components/SkillsLegend";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
} from "recharts";

const DEMO_CANDIDATES = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    completedDate: "January 15, 2026",
    overallScore: 82,
    rank: 1,
    assessmentsCompleted: { fit: true, aiReadiness: true, promptArchitecture: true, aiq: true },
    fitScores: {
      "High Agency": 85,
      "Intellectual Curiosity": 88,
      "Resilience": 78,
      "Empathy & Ethics": 84,
      "Growth Mindset": 86,
      "Interpersonal Agility": 80,
    },
    aiReadinessScores: {
      "AI Literacy & Prompt Engineering": 82,
      "Technical Fundamentals": 75,
      "Data Fluency": 80,
      "Critical Thinking & Problem-Solving": 85,
      "Adaptability & Continuous Learning": 88,
      "Collaboration & Communication": 78,
      "Responsible AI & Ethical Awareness": 90,
      "Creativity & Innovation": 76,
    },
    strengths: ["Strategic thinking", "Innovation mindset", "Team leadership"],
    areas: ["Technical depth", "Risk tolerance"],
  },
  {
    id: "2",
    name: "Marcus Johnson",
    email: "marcus.j@example.com",
    completedDate: "January 14, 2026",
    overallScore: 76,
    rank: 2,
    assessmentsCompleted: { fit: true, aiReadiness: true, promptArchitecture: true, aiq: true },
    fitScores: {
      "High Agency": 72,
      "Intellectual Curiosity": 78,
      "Resilience": 82,
      "Empathy & Ethics": 75,
      "Growth Mindset": 74,
      "Interpersonal Agility": 76,
    },
    aiReadinessScores: {
      "AI Literacy & Prompt Engineering": 78,
      "Technical Fundamentals": 82,
      "Data Fluency": 74,
      "Critical Thinking & Problem-Solving": 74,
      "Adaptability & Continuous Learning": 76,
      "Collaboration & Communication": 70,
      "Responsible AI & Ethical Awareness": 72,
      "Creativity & Innovation": 68,
    },
    strengths: ["Technical expertise", "Problem solving", "Resilience under pressure"],
    areas: ["Communication", "Strategic vision"],
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.r@example.com",
    completedDate: "January 13, 2026",
    overallScore: 71,
    rank: 3,
    assessmentsCompleted: { fit: true, aiReadiness: true, promptArchitecture: false, aiq: true },
    fitScores: {
      "High Agency": 68,
      "Intellectual Curiosity": 74,
      "Resilience": 72,
      "Empathy & Ethics": 82,
      "Growth Mindset": 70,
      "Interpersonal Agility": 78,
    },
    aiReadinessScores: {
      "AI Literacy & Prompt Engineering": 70,
      "Technical Fundamentals": 65,
      "Data Fluency": 68,
      "Critical Thinking & Problem-Solving": 76,
      "Adaptability & Continuous Learning": 72,
      "Collaboration & Communication": 74,
      "Responsible AI & Ethical Awareness": 85,
      "Creativity & Innovation": 70,
    },
    strengths: ["Collaboration & Communication", "Ethical judgment", "Stakeholder management"],
    areas: ["Technical skills", "Initiative"],
  },
];

const SKILL_ACRONYMS: Record<string, string> = {
  // FIT Skills
  "High Agency": "HA",
  "Intellectual Curiosity": "IC",
  "Resilience": "RE",
  "Empathy & Ethics": "EE",
  "Growth Mindset": "GM",
  "Interpersonal Agility": "IA",
  // AI Readiness Skills (8 official skills)
  "AI Literacy & Prompt Engineering": "AL&PE",
  "Technical Fundamentals": "TF",
  "Data Fluency": "DF",
  "Critical Thinking & Problem-Solving": "CT&PS",
  "Adaptability & Continuous Learning": "ACL",
  "Collaboration & Communication": "CC",
  "Responsible AI & Ethical Awareness": "RAI",
  "Creativity & Innovation": "CI",
};

const CANDIDATE_COLORS = [
  { stroke: "#3b82f6", fill: "#3b82f6" },
  { stroke: "#22c55e", fill: "#22c55e" },
  { stroke: "#f59e0b", fill: "#f59e0b" },
];

const PROMPT_ARCHITECTURE_SCORES = [
  {
    candidateId: "1",
    name: "Sarah Chen",
    totalScore: 78,
    percentile: 82,
    levels: [
      { level: 1, clarity: 16, structure: 17, contextRelevance: 15, creativity: 14, iterativeImprovement: 16 },
      { level: 2, clarity: 15, structure: 16, contextRelevance: 14, creativity: 15, iterativeImprovement: 15 },
      { level: 3, clarity: 14, structure: 15, contextRelevance: 16, creativity: 13, iterativeImprovement: 14 },
    ],
  },
  {
    candidateId: "2",
    name: "Marcus Johnson",
    totalScore: 82,
    percentile: 86,
    levels: [
      { level: 1, clarity: 17, structure: 18, contextRelevance: 16, creativity: 15, iterativeImprovement: 17 },
      { level: 2, clarity: 16, structure: 17, contextRelevance: 15, creativity: 16, iterativeImprovement: 16 },
      { level: 3, clarity: 15, structure: 16, contextRelevance: 17, creativity: 14, iterativeImprovement: 15 },
    ],
  },
  {
    candidateId: "3",
    name: "Emily Rodriguez",
    totalScore: null,
    percentile: null,
    levels: [],
  },
];

const AIQ_SCORES = [
  { candidateId: "1", name: "Sarah Chen", totalScore: 85, completedAt: "2026-01-15" },
  { candidateId: "2", name: "Marcus Johnson", totalScore: 78, completedAt: "2026-01-14" },
  { candidateId: "3", name: "Emily Rodriguez", totalScore: 82, completedAt: "2026-01-13" },
];

const COMBINED_RADAR_DATA = [
  // FIT Skills (6)
  { skill: "HA", fullName: "High Agency", candidate0: 85, candidate1: 72, candidate2: 68 },
  { skill: "IC", fullName: "Intellectual Curiosity", candidate0: 88, candidate1: 78, candidate2: 74 },
  { skill: "RE", fullName: "Resilience", candidate0: 78, candidate1: 82, candidate2: 72 },
  { skill: "EE", fullName: "Empathy & Ethics", candidate0: 84, candidate1: 75, candidate2: 82 },
  { skill: "GM", fullName: "Growth Mindset", candidate0: 86, candidate1: 74, candidate2: 70 },
  { skill: "IA", fullName: "Interpersonal Agility", candidate0: 80, candidate1: 76, candidate2: 78 },
  // AI Readiness Skills (8 official skills)
  { skill: "AL&PE", fullName: "AI Literacy & Prompt Engineering", candidate0: 82, candidate1: 78, candidate2: 70 },
  { skill: "TF", fullName: "Technical Fundamentals", candidate0: 75, candidate1: 82, candidate2: 65 },
  { skill: "DF", fullName: "Data Fluency", candidate0: 80, candidate1: 74, candidate2: 68 },
  { skill: "CT&PS", fullName: "Critical Thinking & Problem-Solving", candidate0: 85, candidate1: 74, candidate2: 76 },
  { skill: "ACL", fullName: "Adaptability & Continuous Learning", candidate0: 88, candidate1: 76, candidate2: 72 },
  { skill: "CC", fullName: "Collaboration & Communication", candidate0: 78, candidate1: 70, candidate2: 74 },
  { skill: "RAI", fullName: "Responsible AI & Ethical Awareness", candidate0: 90, candidate1: 72, candidate2: 85 },
  { skill: "CI", fullName: "Creativity & Innovation", candidate0: 76, candidate1: 68, candidate2: 70 },
];

export default function SampleComparisonReport() {
  const fitRadarData = Object.keys(DEMO_CANDIDATES[0].fitScores).map(skill => ({
    skill: SKILL_ACRONYMS[skill] || skill,
    fullName: skill,
    [DEMO_CANDIDATES[0].name]: DEMO_CANDIDATES[0].fitScores[skill as keyof typeof DEMO_CANDIDATES[0]["fitScores"]],
    [DEMO_CANDIDATES[1].name]: DEMO_CANDIDATES[1].fitScores[skill as keyof typeof DEMO_CANDIDATES[1]["fitScores"]],
    [DEMO_CANDIDATES[2].name]: DEMO_CANDIDATES[2].fitScores[skill as keyof typeof DEMO_CANDIDATES[2]["fitScores"]],
  }));

  const aiRadarData = Object.keys(DEMO_CANDIDATES[0].aiReadinessScores).map(skill => ({
    skill: SKILL_ACRONYMS[skill] || skill,
    fullName: skill,
    [DEMO_CANDIDATES[0].name]: DEMO_CANDIDATES[0].aiReadinessScores[skill as keyof typeof DEMO_CANDIDATES[0]["aiReadinessScores"]],
    [DEMO_CANDIDATES[1].name]: DEMO_CANDIDATES[1].aiReadinessScores[skill as keyof typeof DEMO_CANDIDATES[1]["aiReadinessScores"]],
    [DEMO_CANDIDATES[2].name]: DEMO_CANDIDATES[2].aiReadinessScores[skill as keyof typeof DEMO_CANDIDATES[2]["aiReadinessScores"]],
  }));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1">
        <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 max-w-7xl">
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
                  Candidate Comparison Report
                </h1>
                <p className="text-xs md:text-base text-muted-foreground mt-1">
                  Side-by-side analysis of 3 candidates for Product Manager role
                </p>
              </div>
            </div>
          </div>

          {/* How to Use This Comparison - Matching Dashboard Style */}
          <Card className="mb-8" data-testid="section-comparison-guide">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg" data-testid="heading-comparison-guide">
                <FileText className="h-5 w-5 text-primary" />
                How to Use This Comparison
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                A guide to comparing 3 candidates side-by-side
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <p className="font-medium text-sm">Candidate Overview</p>
                    <p className="text-xs text-muted-foreground">Quick view of each candidate's assessment completion. All 4 assessments should be completed for a complete picture.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="font-medium text-sm">Composite Score</p>
                    <p className="text-xs text-muted-foreground">Weighted average across all assessments. Use the sliders to adjust weights based on role priorities (e.g., higher AI Readiness for tech roles).</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="font-medium text-sm">Skill-by-Skill Breakdown</p>
                    <p className="text-xs text-muted-foreground">Skills charts and tables show each candidate's strengths. Look for the highest scores in skills critical to your role.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <p className="font-medium text-sm">Role Fit Analysis</p>
                    <p className="text-xs text-muted-foreground">For detailed role-specific analysis including cohort benchmarking and hiring recommendations, use the Role Fit tab with individual candidates.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
                  <div>
                    <p className="font-medium text-sm">Read the Recommendations</p>
                    <p className="text-xs text-muted-foreground">Review strengths, development areas, and AI-generated insights for each candidate to inform your final decision.</p>
                  </div>
                </div>
                <div className="flex gap-3 md:col-span-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">?</div>
                  <div>
                    <p className="font-medium text-sm">What Each Assessment Measures</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">FIT:</span> Behavioral traits like resilience, curiosity, ethics (predictors of cultural fit). 
                      <span className="font-medium ml-2">AI Readiness:</span> Technical AI skills including prompt engineering and data fluency. 
                      <span className="font-medium ml-2">Prompt Architecture:</span> Real-world prompt writing ability across difficulty levels. 
                      <span className="font-medium ml-2">AIQ:</span> AI ethics, judgment, and responsible AI awareness.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Candidate Overview & Assessment Status - Matching Dashboard Style */}
          <Card className="mb-6" data-testid="section-overview">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Candidate Overview & Assessment Status
              </CardTitle>
              <CardDescription>
                Contact details, application date, and completion status for each assessment type (FIT, AI Readiness, Prompt Architecture, AIQ)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {DEMO_CANDIDATES.map((candidate, index) => {
                  const totalCompleted = Object.values(candidate.assessmentsCompleted).filter(Boolean).length;
                  return (
                    <Card key={candidate.id} data-testid={`card-candidate-${candidate.id}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{candidate.name}</CardTitle>
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">{candidate.email}</p>
                          <p className="text-xs text-muted-foreground">Applied: {candidate.completedDate}</p>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Assessments Completed</span>
                            <Badge variant="outline">{totalCompleted} / 4</Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <div className={`h-2 w-2 rounded-full ${candidate.assessmentsCompleted.fit ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className={candidate.assessmentsCompleted.fit ? 'text-foreground' : 'text-muted-foreground'}>FIT Assessment</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <div className={`h-2 w-2 rounded-full ${candidate.assessmentsCompleted.aiReadiness ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className={candidate.assessmentsCompleted.aiReadiness ? 'text-foreground' : 'text-muted-foreground'}>AI Readiness</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <div className={`h-2 w-2 rounded-full ${candidate.assessmentsCompleted.promptArchitecture ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className={candidate.assessmentsCompleted.promptArchitecture ? 'text-foreground' : 'text-muted-foreground'}>Prompt Architecture</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <div className={`h-2 w-2 rounded-full ${candidate.assessmentsCompleted.aiq ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className={candidate.assessmentsCompleted.aiq ? 'text-foreground' : 'text-muted-foreground'}>AIQ</span>
                            </div>
                          </div>
                          
                          {totalCompleted < 4 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Recommended Next Steps
                              </p>
                              <div className="space-y-1">
                                {!candidate.assessmentsCompleted.promptArchitecture && (
                                  <p className="text-xs text-muted-foreground">Complete Prompt Architecture for real-world AI skills</p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="pt-3 mt-3 border-t">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">Composite Score</span>
                              <Badge className={candidate.overallScore >= 80 ? 'bg-green-500' : candidate.overallScore >= 70 ? 'bg-blue-500' : 'bg-amber-500'}>
                                {candidate.overallScore}%
                              </Badge>
                            </div>
                            <Progress value={candidate.overallScore} className="h-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Overall Ranking & Composite Score */}
          <Card className="mb-6" data-testid="section-composite-ranking">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Overall Ranking & Composite Score
              </CardTitle>
              <CardDescription>
                Weighted composite score across all completed assessments with configurable weights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h4 className="text-sm font-medium mb-3">Assessment Weight Distribution</h4>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <label className="text-xs text-muted-foreground">FIT (25%)</label>
                      <Progress value={25} className="mt-2 h-2" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">AI Readiness (25%)</label>
                      <Progress value={25} className="mt-2 h-2" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Prompt Arch (25%)</label>
                      <Progress value={25} className="mt-2 h-2" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">AIQ (25%)</label>
                      <Progress value={25} className="mt-2 h-2" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {[...DEMO_CANDIDATES].sort((a, b) => b.overallScore - a.overallScore).map((candidate, idx) => {
                    const rank = idx + 1;
                    const originalIndex = DEMO_CANDIDATES.findIndex(c => c.id === candidate.id);
                    return (
                      <div key={candidate.id} className={`relative overflow-visible rounded-lg border bg-card p-4 ${rank === 1 ? 'border-2 border-primary' : ''}`} data-testid={`ranking-card-${rank}`}>
                        {rank === 1 && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-primary">Top Candidate</Badge>
                          </div>
                        )}
                        <div className="pt-2 text-center">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            {rank === 1 && <Trophy className="h-6 w-6 text-amber-500" />}
                            {rank === 2 && <ChevronUp className="h-6 w-6 text-gray-400" />}
                            {rank === 3 && <ChevronDown className="h-6 w-6 text-gray-500" />}
                            <span className="text-2xl font-bold">#{rank}</span>
                          </div>
                          <p className="font-medium" style={{ color: CANDIDATE_COLORS[originalIndex].stroke }}>
                            {candidate.name}
                          </p>
                          <div className="text-4xl font-bold mt-2" style={{ color: CANDIDATE_COLORS[originalIndex].stroke }} data-testid={`score-${candidate.id}`}>
                            {candidate.overallScore}
                          </div>
                          <p className="text-sm text-muted-foreground">Composite Score</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <p className="text-base font-semibold text-foreground mb-2">Understanding the Scores</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-base text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">Composite Score</strong> is a weighted average across all four assessment types 
                        (FIT, AI Readiness, Prompt Architecture, and AIQ). Use the sliders above to adjust how much each assessment 
                        contributes to the final score. This allows you to prioritize assessments that matter most for your specific role requirements.
                      </p>
                    </div>
                    <div className="border-t pt-3">
                      <p className="text-base text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">Why weighted scoring matters:</strong> Different roles require different skill profiles. 
                        For technical AI roles, you might weight AI Readiness and Prompt Architecture higher. For leadership positions, 
                        FIT (behavioral traits) and AIQ (ethical awareness) may be more important.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills Charts */}
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <Card data-testid="section-fit-comparison">
              <CardHeader>
                <CardTitle className="text-lg">FIT Assessment Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={fitRadarData} margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <YAxis type="category" dataKey="skill" width={120} tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      {DEMO_CANDIDATES.map((candidate, index) => (
                        <Bar
                          key={candidate.id}
                          name={candidate.name}
                          dataKey={candidate.name}
                          fill={CANDIDATE_COLORS[index].fill}
                          radius={[0, 4, 4, 0]}
                          barSize={14}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="section-ai-comparison">
              <CardHeader>
                <CardTitle className="text-lg">AI Readiness Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={aiRadarData} margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <YAxis type="category" dataKey="skill" width={120} tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      {DEMO_CANDIDATES.map((candidate, index) => (
                        <Bar
                          key={candidate.id}
                          name={candidate.name}
                          dataKey={candidate.name}
                          fill={CANDIDATE_COLORS[index].fill}
                          radius={[0, 4, 4, 0]}
                          barSize={14}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Prompt Architecture Comparison */}
          <Card className="mb-6" data-testid="section-prompt-architecture">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Prompt Architecture Comparison
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Progressive difficulty levels (1-3) with dimensional scoring
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Level</th>
                      <th className="text-left p-3 font-medium">Dimension</th>
                      {PROMPT_ARCHITECTURE_SCORES.map((candidate, index) => (
                        <th key={candidate.candidateId} className="text-left p-3 font-medium">
                          <span style={{ color: CANDIDATE_COLORS[index].stroke }}>
                            {candidate.name}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map((level) => {
                      const dimensions = ['clarity', 'structure', 'contextRelevance', 'creativity', 'iterativeImprovement'] as const;
                      const dimensionLabels = {
                        clarity: 'Clarity',
                        structure: 'Structure',
                        contextRelevance: 'Context Relevance',
                        creativity: 'Creativity',
                        iterativeImprovement: 'Iterative Improvement',
                      };

                      return dimensions.map((dimension, dimIndex) => (
                        <tr key={`${level}-${dimension}`} className={dimIndex === 0 ? 'border-t-2' : 'border-t'}>
                          {dimIndex === 0 && (
                            <td className="p-3 font-semibold align-top" rowSpan={5}>
                              Level {level}
                            </td>
                          )}
                          <td className="p-3 text-sm">{dimensionLabels[dimension]}</td>
                          {PROMPT_ARCHITECTURE_SCORES.map((candidate, candIndex) => {
                            if (!candidate.levels.length) {
                              return (
                                <td key={candidate.candidateId} className="p-3">
                                  {dimIndex === 2 && <Badge variant="outline">Not Completed</Badge>}
                                </td>
                              );
                            }
                            const levelData = candidate.levels.find(l => l.level === level);
                            const score = levelData?.[dimension];

                            return (
                              <td key={candidate.candidateId} className="p-3">
                                {score !== undefined ? (
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">{score}/20</span>
                                    <div className="h-2 rounded-full bg-primary/20" style={{ width: '60px' }}>
                                      <div
                                        className="h-full rounded-full bg-primary"
                                        style={{ width: `${(score / 20) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ));
                    })}
                    <tr className="border-t-2 font-semibold bg-muted/30">
                      <td className="p-3" colSpan={2}>Total Score</td>
                      {PROMPT_ARCHITECTURE_SCORES.map((candidate, index) => (
                        <td key={candidate.candidateId} className="p-3">
                          {candidate.totalScore !== null ? (
                            <div className="flex items-center gap-2">
                              <span className="text-lg text-primary">{candidate.totalScore}/100</span>
                              {candidate.percentile && (
                                <Badge variant="secondary">{candidate.percentile}th percentile</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* AIQ Comparison */}
          <Card className="mb-6" data-testid="section-aiq-comparison">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Algorithmic Integrity Quotient (AIQ) Comparison
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Comprehensive AI ethics, bias, fairness, and responsibility assessment
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                {AIQ_SCORES.map((candidate, index) => {
                  const performance = candidate.totalScore >= 80 ? 'Excellent' : candidate.totalScore >= 70 ? 'Good' : 'Developing';
                  const variant = candidate.totalScore >= 80 ? 'default' : candidate.totalScore >= 70 ? 'secondary' : 'outline';
                  
                  return (
                    <div key={candidate.candidateId} className="border-2 rounded-lg bg-card" style={{ borderColor: CANDIDATE_COLORS[index].stroke }} data-testid={`aiq-card-${candidate.candidateId}`}>
                      <div className="text-center p-4 pb-2">
                        <p className="font-medium" style={{ color: CANDIDATE_COLORS[index].stroke }}>
                          {candidate.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Completed {new Date(candidate.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-center p-4 pt-0">
                        <div className="py-6">
                          <div className="text-6xl font-bold mb-2" style={{ color: CANDIDATE_COLORS[index].stroke }} data-testid={`aiq-score-${candidate.candidateId}`}>
                            {candidate.totalScore}
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">out of 100</p>
                          <Badge variant={variant} className="text-sm px-4 py-1">
                            {performance}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                <p className="text-base text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">AIQ Analysis:</strong>{' '}
                  <span style={{ color: CANDIDATE_COLORS[0].stroke }} className="font-medium">Sarah Chen</span> demonstrates 
                  exceptional understanding of AI ethics and algorithmic fairness with a score of 85/100.
                  This is 7 points higher than{' '}
                  <span style={{ color: CANDIDATE_COLORS[1].stroke }} className="font-medium">Marcus Johnson</span> (78/100).
                  Higher AIQ scores indicate better preparedness for responsible AI governance and decision-making in AI-driven environments.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Overall Skills Comparison */}
          <Card className="mb-6" data-testid="section-overall-skills">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Overall Skills Comparison
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Combined view of all skill-based assessments
              </p>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-4">All Skills Combined</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={COMBINED_RADAR_DATA} margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <YAxis type="category" dataKey="skill" width={120} tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    {DEMO_CANDIDATES.map((candidate, index) => (
                      <Bar
                        key={candidate.id}
                        name={candidate.name}
                        dataKey={`candidate${index}`}
                        fill={CANDIDATE_COLORS[index].fill}
                        radius={[0, 4, 4, 0]}
                        barSize={14}
                      />
                    ))}
                    <Legend />
                    <Tooltip />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Score Comparison */}
          <Card className="mb-6" data-testid="section-detailed-scores">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Detailed Score Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Skill</th>
                      {DEMO_CANDIDATES.map((candidate, index) => (
                        <th key={candidate.id} className="text-center py-3 px-2 font-medium">
                          <div className="flex items-center justify-center gap-2">
                            <div 
                              className="h-3 w-3 rounded-full" 
                              style={{ backgroundColor: CANDIDATE_COLORS[index].fill }}
                            />
                            {candidate.name}
                          </div>
                        </th>
                      ))}
                      <th className="text-center py-3 px-2 font-medium">Best</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b bg-muted/30">
                      <td colSpan={5} className="py-2 px-2 font-semibold text-muted-foreground">FIT Assessment</td>
                    </tr>
                    {Object.keys(DEMO_CANDIDATES[0].fitScores).map(skill => {
                      const scores = DEMO_CANDIDATES.map(c => c.fitScores[skill as keyof typeof c.fitScores]);
                      const maxScore = Math.max(...scores);
                      const bestIndex = scores.indexOf(maxScore);
                      return (
                        <tr key={skill} className="border-b">
                          <td className="py-2 px-2">{skill}</td>
                          {DEMO_CANDIDATES.map((candidate, index) => {
                            const score = candidate.fitScores[skill as keyof typeof candidate.fitScores];
                            const isBest = score === maxScore;
                            return (
                              <td key={candidate.id} className="text-center py-2 px-2">
                                <span className={`font-medium ${isBest ? 'text-green-600' : ''}`}>
                                  {score}
                                </span>
                              </td>
                            );
                          })}
                          <td className="text-center py-2 px-2">
                            <Badge variant="outline" className="text-xs">
                              {DEMO_CANDIDATES[bestIndex].name.split(' ')[0]}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-b bg-muted/30">
                      <td colSpan={5} className="py-2 px-2 font-semibold text-muted-foreground">AI Readiness</td>
                    </tr>
                    {Object.keys(DEMO_CANDIDATES[0].aiReadinessScores).map(skill => {
                      const scores = DEMO_CANDIDATES.map(c => c.aiReadinessScores[skill as keyof typeof c.aiReadinessScores] ?? 0);
                      const maxScore = Math.max(...scores);
                      const bestIndex = scores.indexOf(maxScore);
                      return (
                        <tr key={skill} className="border-b">
                          <td className="py-2 px-2">{skill}</td>
                          {DEMO_CANDIDATES.map((candidate, index) => {
                            const score = candidate.aiReadinessScores[skill as keyof typeof candidate.aiReadinessScores];
                            const isBest = score === maxScore;
                            return (
                              <td key={candidate.id} className="text-center py-2 px-2">
                                <span className={`font-medium ${isBest ? 'text-green-600' : ''}`}>
                                  {score}
                                </span>
                              </td>
                            );
                          })}
                          <td className="text-center py-2 px-2">
                            <Badge variant="outline" className="text-xs">
                              {DEMO_CANDIDATES[bestIndex].name.split(' ')[0]}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Strengths & Development Areas */}
          <Card className="mb-6" data-testid="section-strengths-areas">
            <CardHeader>
              <CardTitle>Strengths & Development Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {DEMO_CANDIDATES.map((candidate, index) => (
                  <div key={candidate.id} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: CANDIDATE_COLORS[index].fill }}
                      />
                      <span className="font-medium">{candidate.name}</span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-green-500" /> Strengths
                      </p>
                      <ul className="space-y-1">
                        {candidate.strengths.map((strength, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3 text-amber-500" /> Areas for Growth
                      </p>
                      <ul className="space-y-1">
                        {candidate.areas.map((area, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-amber-500 mt-1">-</span>
                            {area}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hiring Recommendation - Matching Dashboard Style */}
          <Card className="mb-6 border-2 border-green-500" data-testid="section-recommendation">
            <CardHeader className="bg-green-50 dark:bg-green-950/30">
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Trophy className="h-6 w-6" />
                Hiring Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl font-bold">
                      1
                    </div>
                    <div>
                      <div className="text-xl font-bold">Sarah Chen</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-bold text-green-600">82%</span>
                        <Badge className="bg-green-500 text-white">Strong Fit</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Why This Candidate?</h4>
                    <ul className="space-y-2">
                      <li className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Highest composite score across all assessments (82%)</span>
                      </li>
                      <li className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Exceptional intellectual curiosity (88%) and responsible AI understanding (90%)</span>
                      </li>
                      <li className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Strong strategic thinking and innovation mindset</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">Critical Skill Advantages</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        Intellectual Curiosity (+10 vs avg)
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        Responsible AI & Ethical Awareness (+8 vs avg)
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        Adaptability & Continuous Learning (+6 vs avg)
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-l-2 border-gray-200 dark:border-gray-700 pl-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white text-lg font-bold">
                      2
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Runner-Up Alternative</div>
                      <div className="font-bold text-lg">Marcus Johnson</div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-600">76%</span>
                        <Badge variant="outline">Moderate Fit</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold text-muted-foreground mb-2">When to Consider Instead</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-gray-500 mt-1">-</span>
                        <span>If role requires stronger technical expertise</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-500 mt-1">-</span>
                        <span>Higher resilience under pressure (82%)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-500 mt-1">-</span>
                        <span>Consider for more technically-focused PM roles</span>
                      </li>
                    </ul>
                  </div>
                </div>
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
                <div className="p-4 bg-muted/30 rounded-lg relative" data-testid="card-service-cohort">
                  <Badge className="absolute top-2 right-2 bg-amber-500 text-white border-amber-600 text-xs">Coming Soon</Badge>
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

          {/* CTA */}
          <Card data-testid="section-cta">
            <CardContent className="py-6 md:py-8 text-center">
              <h3 className="text-lg md:text-xl font-semibold mb-2">Want to compare your candidates?</h3>
              <p className="text-xs md:text-base text-muted-foreground mb-3 md:mb-4">
                Get detailed comparison reports for your hiring decisions with HumanMetrix assessments.
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
