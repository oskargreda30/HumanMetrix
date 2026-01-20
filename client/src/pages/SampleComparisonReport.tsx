import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Users, TrendingUp, TrendingDown, Minus, Award, Target } from "lucide-react";
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

  const handleDownloadPDF = async () => {
    toast({
      title: "Generating PDF...",
      description: "Your comparison report is being prepared.",
    });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "PDF Ready",
      description: "In the full version, this would download the comparison report PDF.",
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 70) return "secondary";
    return "outline";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Award className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Award className="h-5 w-5 text-gray-400" />;
    return <Award className="h-5 w-5 text-amber-700" />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
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

          <Card className="mb-6" data-testid="section-overview">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Candidate Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {DEMO_CANDIDATES.map((candidate, index) => (
                  <div 
                    key={candidate.id}
                    className="p-4 rounded-lg border bg-muted/30"
                    data-testid={`card-candidate-${candidate.id}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {getRankIcon(candidate.rank)}
                      <div>
                        <p className="font-semibold">{candidate.name}</p>
                        <p className="text-xs text-muted-foreground">Rank #{candidate.rank}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Overall Score</span>
                        <Badge variant={getScoreBadge(candidate.overallScore)} className={getScoreColor(candidate.overallScore)}>
                          {candidate.overallScore}%
                        </Badge>
                      </div>
                      <Progress value={candidate.overallScore} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Completed: {candidate.completedDate}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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
                            <span className="text-green-500 mt-1">+</span>
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

          <Card className="mb-6" data-testid="section-recommendation">
            <CardHeader>
              <CardTitle>Hiring Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <p className="font-medium text-green-800 dark:text-green-200 mb-2">
                  Top Recommendation: Sarah Chen
                </p>
                <p className="text-sm text-muted-foreground">
                  Based on the comprehensive assessment across FIT and AI Readiness dimensions, 
                  Sarah Chen emerges as the strongest candidate with an overall score of 82%. 
                  She demonstrates exceptional intellectual curiosity (88%) and responsible AI understanding (90%), 
                  making her well-suited for the Product Manager role in an AI-driven environment.
                </p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium">Second Choice: Marcus Johnson</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Strong technical background and resilience. Consider for more technically-focused PM roles.
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium">Third Choice: Emily Rodriguez</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Excellent collaboration skills and ethical judgment. May need additional technical development.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
