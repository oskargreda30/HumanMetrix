import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Users, TrendingUp, TrendingDown, Award, Target, FileText, CheckCircle2, AlertCircle, Trophy } from "lucide-react";
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
      "AI Literacy": 82,
      "Technical Fluency": 75,
      "Critical Thinking": 85,
      "Adaptive Learning": 88,
      "Responsible AI": 90,
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
      "AI Literacy": 78,
      "Technical Fluency": 82,
      "Critical Thinking": 74,
      "Adaptive Learning": 76,
      "Responsible AI": 72,
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
      "AI Literacy": 70,
      "Technical Fluency": 65,
      "Critical Thinking": 76,
      "Adaptive Learning": 72,
      "Responsible AI": 85,
    },
    strengths: ["Collaboration", "Ethical judgment", "Stakeholder management"],
    areas: ["Technical skills", "Initiative"],
  },
];

const SKILL_ACRONYMS: Record<string, string> = {
  "High Agency": "HA",
  "Intellectual Curiosity": "IC",
  "Resilience": "RE",
  "Empathy & Ethics": "EE",
  "Growth Mindset": "GM",
  "Interpersonal Agility": "IA",
  "AI Literacy": "AL",
  "Technical Fluency": "TF",
  "Critical Thinking": "CT",
  "Adaptive Learning": "AD",
  "Responsible AI": "RA",
};

const CANDIDATE_COLORS = [
  { stroke: "#3b82f6", fill: "#3b82f6" },
  { stroke: "#22c55e", fill: "#22c55e" },
  { stroke: "#f59e0b", fill: "#f59e0b" },
];

export default function SampleComparisonReport() {
  const { toast } = useToast();

  const handleDownloadPDF = () => {
    window.open('/sample-reports/comparison-sample.pdf', '_blank');
    toast({
      title: "Downloading PDF",
      description: "Your comparison report PDF is being downloaded.",
    });
  };

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
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-6">
            <Link href="/#sample-reports">
              <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sample Reports
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
                  Candidate Comparison Report
                </h1>
                <p className="text-muted-foreground mt-1">
                  Side-by-side analysis of 3 candidates for Product Manager role
                </p>
              </div>
              <Button onClick={handleDownloadPDF} data-testid="button-download-pdf">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>

          {/* How to Use This Comparison - Matching Dashboard Style */}
          <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" data-testid="section-guide">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
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
                    <p className="text-xs text-muted-foreground">Radar charts and tables show each candidate's strengths. Look for the highest scores in skills critical to your role.</p>
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

          {/* Radar Charts */}
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <Card data-testid="section-fit-comparison">
              <CardHeader>
                <CardTitle className="text-lg">FIT Assessment Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={fitRadarData}>
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
                      {DEMO_CANDIDATES.map((candidate, index) => (
                        <Radar
                          key={candidate.id}
                          name={candidate.name}
                          dataKey={candidate.name}
                          stroke={CANDIDATE_COLORS[index].stroke}
                          fill={CANDIDATE_COLORS[index].fill}
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
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
                    <RadarChart data={aiRadarData}>
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
                      {DEMO_CANDIDATES.map((candidate, index) => (
                        <Radar
                          key={candidate.id}
                          name={candidate.name}
                          dataKey={candidate.name}
                          stroke={CANDIDATE_COLORS[index].stroke}
                          fill={CANDIDATE_COLORS[index].fill}
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

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
                      const scores = DEMO_CANDIDATES.map(c => c.aiReadinessScores[skill as keyof typeof c.aiReadinessScores]);
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
                        Responsible AI (+8 vs avg)
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        Adaptive Learning (+6 vs avg)
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

          {/* CTA */}
          <Card data-testid="section-cta">
            <CardContent className="py-8 text-center">
              <h3 className="text-xl font-semibold mb-2">Want to compare your candidates?</h3>
              <p className="text-muted-foreground mb-4">
                Get detailed comparison reports for your hiring decisions with HumanMetrix assessments.
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
