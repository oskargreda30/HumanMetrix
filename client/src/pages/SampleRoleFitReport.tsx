import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Target, CheckCircle2, AlertCircle, AlertTriangle, TrendingUp, Award, Brain, MessageSquare, Users, FileText, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";

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
  { skillName: "Resilience", candidateScore: 78, requiredScore: 75, gap: 3, alignment: "meets", criticality: "important" },
  { skillName: "Empathy & Ethics", candidateScore: 84, requiredScore: 80, gap: 4, alignment: "exceeds", criticality: "important" },
  { skillName: "Growth Mindset", candidateScore: 86, requiredScore: 85, gap: 1, alignment: "meets", criticality: "critical" },
  { skillName: "Interpersonal Agility", candidateScore: 80, requiredScore: 85, gap: -5, alignment: "gap", criticality: "important" },
];

const AI_SKILL_ALIGNMENTS = [
  { skillName: "AI Literacy", candidateScore: 82, requiredScore: 80, gap: 2, alignment: "meets", criticality: "critical" },
  { skillName: "Technical Fluency", candidateScore: 75, requiredScore: 70, gap: 5, alignment: "exceeds", criticality: "important" },
  { skillName: "Critical Thinking", candidateScore: 85, requiredScore: 80, gap: 5, alignment: "exceeds", criticality: "critical" },
  { skillName: "Adaptive Learning", candidateScore: 88, requiredScore: 85, gap: 3, alignment: "exceeds", criticality: "important" },
  { skillName: "Responsible AI", candidateScore: 90, requiredScore: 85, gap: 5, alignment: "exceeds", criticality: "critical" },
];

const COHORT_BENCHMARKS = {
  overall: { percentile: 87, totalCandidates: 156, position: "Top 13%" },
  fit: { percentile: 82, totalCandidates: 156, avgScore: 76 },
  ai_readiness: { percentile: 91, totalCandidates: 156, avgScore: 72 },
};

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
    targetSkill: "Responsible AI",
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

export default function SampleRoleFitReport() {
  const { toast } = useToast();

  const handleDownloadPDF = async () => {
    toast({
      title: "Generating PDF...",
      description: "Your role fit report is being prepared.",
    });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "PDF Ready",
      description: "In the full version, this would download the role fit report PDF.",
    });
  };

  const radarData = SKILL_ALIGNMENTS.map(skill => ({
    skill: skill.skillName.split(' ').map(w => w[0]).join(''),
    fullName: skill.skillName,
    candidate: skill.candidateScore,
    required: skill.requiredScore,
  }));

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
    if (criticality === "important") return <Badge variant="secondary" className="text-xs">Important</Badge>;
    return <Badge variant="outline" className="text-xs">Nice to Have</Badge>;
  };

  const overallFitScore = 84;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-6">
            <Link href="/for-employers">
              <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to For Employers
              </Button>
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-primary border-primary">
                    Sample Report
                  </Badge>
                </div>
                <h1 className="text-3xl font-bold" data-testid="text-page-title">
                  Role Fit Analysis Report
                </h1>
                <p className="text-muted-foreground mt-1">
                  {DEMO_CANDIDATE.name} for {DEMO_ROLE.name} position
                </p>
              </div>
              <Button onClick={handleDownloadPDF} data-testid="button-download-pdf">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 mb-6">
            <Card data-testid="card-candidate-info">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Candidate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{DEMO_CANDIDATE.name}</p>
                <p className="text-sm text-muted-foreground">{DEMO_CANDIDATE.email}</p>
                <p className="text-xs text-muted-foreground mt-1">Completed: {DEMO_CANDIDATE.completedDate}</p>
              </CardContent>
            </Card>

            <Card data-testid="card-role-info">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Target Role</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{DEMO_ROLE.name}</p>
                <p className="text-sm text-muted-foreground">{DEMO_ROLE.department} - {DEMO_ROLE.level}</p>
              </CardContent>
            </Card>

            <Card data-testid="card-fit-score">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overall Fit Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-green-600">{overallFitScore}%</div>
                  <Badge variant="default" className="bg-green-500">Strong Fit</Badge>
                </div>
                <Progress value={overallFitScore} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <Card data-testid="section-radar-chart">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Skill Alignment Visualization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis 
                        dataKey="skill" 
                        tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                      />
                      <PolarRadiusAxis 
                        angle={30} 
                        domain={[0, 100]}
                        tick={false}
                        axisLine={false}
                      />
                      <Radar
                        name="Required"
                        dataKey="required"
                        stroke="#94a3b8"
                        fill="#94a3b8"
                        fillOpacity={0.2}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                      <Radar
                        name="Candidate"
                        dataKey="candidate"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="section-cohort-benchmarks">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Cohort Benchmarks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Overall Ranking</span>
                    <Badge variant="default" className="bg-green-500">{COHORT_BENCHMARKS.overall.position}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Performs better than {COHORT_BENCHMARKS.overall.percentile}% of {COHORT_BENCHMARKS.overall.totalCandidates} candidates assessed for similar roles.
                  </p>
                </div>
                
                <div className="grid gap-3">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">FIT Assessment</p>
                      <p className="text-xs text-muted-foreground">Cohort avg: {COHORT_BENCHMARKS.fit.avgScore}%</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600">Top {100 - COHORT_BENCHMARKS.fit.percentile}%</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">AI Readiness</p>
                      <p className="text-xs text-muted-foreground">Cohort avg: {COHORT_BENCHMARKS.ai_readiness.avgScore}%</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">Top {100 - COHORT_BENCHMARKS.ai_readiness.percentile}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6" data-testid="section-skill-alignment">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Detailed Skill Alignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">FIT Assessment Skills</h4>
                  <div className="space-y-3">
                    {SKILL_ALIGNMENTS.map((skill, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                        <div className="flex-shrink-0">
                          {getAlignmentIcon(skill.alignment)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{skill.skillName}</span>
                            {getCriticalityBadge(skill.criticality)}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Required: {skill.requiredScore}</span>
                            <span>Candidate: {skill.candidateScore}</span>
                            <span className={skill.gap >= 0 ? "text-green-600" : "text-amber-600"}>
                              Gap: {skill.gap >= 0 ? "+" : ""}{skill.gap}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {getAlignmentBadge(skill.alignment)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">AI Readiness Skills</h4>
                  <div className="space-y-3">
                    {AI_SKILL_ALIGNMENTS.map((skill, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                        <div className="flex-shrink-0">
                          {getAlignmentIcon(skill.alignment)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{skill.skillName}</span>
                            {getCriticalityBadge(skill.criticality)}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Required: {skill.requiredScore}</span>
                            <span>Candidate: {skill.candidateScore}</span>
                            <span className={skill.gap >= 0 ? "text-green-600" : "text-amber-600"}>
                              Gap: {skill.gap >= 0 ? "+" : ""}{skill.gap}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {getAlignmentBadge(skill.alignment)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6" data-testid="section-interview-questions">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Suggested Interview Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                These questions are tailored to probe areas where additional validation would strengthen the hiring decision.
              </p>
              <div className="space-y-4">
                {INTERVIEW_QUESTIONS.map((item, index) => (
                  <div key={index} className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
                    <p className="font-medium mb-2">"{item.question}"</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline">{item.targetSkill}</Badge>
                      <span className="text-muted-foreground">{item.purpose}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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

          <Card className="mb-6" data-testid="section-recommendation">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Final Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800 mb-4">
                <p className="font-medium text-green-800 dark:text-green-200 mb-2">
                  Strong Recommendation: Proceed to Interview
                </p>
                <p className="text-sm text-muted-foreground">
                  Sarah Chen demonstrates strong alignment with the Product Manager role requirements, 
                  particularly excelling in intellectual curiosity, responsible AI mindset, and growth orientation. 
                  The minor gap in interpersonal agility (-5 points) is offset by strengths in other critical areas 
                  and can be further validated during the interview process.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 text-sm">Recommended Next Steps:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Schedule behavioral interview focusing on stakeholder management scenarios</li>
                  <li>Include a cross-functional collaboration exercise in the interview loop</li>
                  <li>Consider pairing with a mentor strong in interpersonal skills if hired</li>
                  <li>Validate AI product experience through portfolio review</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="section-cta">
            <CardContent className="py-8 text-center">
              <h3 className="text-xl font-semibold mb-2">Ready to assess your candidates?</h3>
              <p className="text-muted-foreground mb-4">
                Get detailed role fit analysis for data-driven hiring decisions with HumanMetrix assessments.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/for-employers">
                  <Button data-testid="button-learn-more">
                    Learn More
                  </Button>
                </Link>
                <Link href="/assessments">
                  <Button variant="outline" data-testid="button-view-assessments">
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
