import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Target, 
  Heart, 
  Brain, 
  BarChart3, 
  Users,
  Star,
  UserPlus,
  Lightbulb,
  AlertTriangle,
  FileText,
  HelpCircle,
  Calendar,
  MessageSquare,
  Clock,
  TrendingUp,
  DollarSign,
  ShieldAlert,
} from "lucide-react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from "recharts";

const CALENDLY_URL = "https://calendly.com/hello-humanmetrix/30min";

const FIT_CAPABILITIES = [
  { code: "F", name: "Foresight", color: "bg-blue-500", description: "Strategic thinking and future planning" },
  { code: "I", name: "Influence", color: "bg-purple-500", description: "Communication and persuasion" },
  { code: "T", name: "Trust", color: "bg-green-500", description: "Reliability and integrity" },
  { code: "IN", name: "Innovation", color: "bg-orange-500", description: "Creativity and problem-solving" },
  { code: "AG", name: "Agility", color: "bg-cyan-500", description: "Adaptability and flexibility" },
  { code: "RE", name: "Resilience", color: "bg-red-500", description: "Stress management and recovery" },
];

const sampleAnalysis = {
  missionAlignmentScore: 72,
  overallHealthScore: 68,
  executiveSummary: `TechFlow Solutions demonstrates strong foundational capabilities in Trust (78%) and Influence (74%), creating a solid base for client relationships and team cohesion. However, the team faces significant gaps in Innovation (52%) and Foresight (58%), which may limit their ability to anticipate market shifts and develop breakthrough solutions.

The team's current composition is well-suited for executing established processes and maintaining client satisfaction, but lacks the creative problem-solving capacity needed to differentiate in a competitive SaaS market. The moderate Agility score (65%) suggests some capacity for adaptation, but this should be strengthened to support rapid product iteration.

Key recommendation: Your next hire should prioritize Innovation and Foresight capabilities to complement the team's existing strengths and address the strategic gaps that could limit growth.`,
  capabilityGapMatrix: [
    { code: "F", name: "Foresight", currentScore: 58, targetScore: 85, priority: "critical" },
    { code: "IN", name: "Innovation", currentScore: 52, targetScore: 85, priority: "critical" },
    { code: "AG", name: "Agility", currentScore: 65, targetScore: 75, priority: "high" },
    { code: "RE", name: "Resilience", currentScore: 70, targetScore: 75, priority: "medium" },
    { code: "I", name: "Influence", currentScore: 74, targetScore: 75, priority: "low" },
    { code: "T", name: "Trust", currentScore: 78, targetScore: 75, priority: "low" },
  ],
  contextualInsights: [
    "Your delayed tasks around 'product roadmap planning' directly correlate with the team's Innovation and Foresight gaps. Consider redistributing strategic planning responsibilities or bringing in external expertise.",
    "The conflict around 'feature prioritization' reflects competing priorities between client demands (high Trust) and innovation needs (low Innovation). A structured prioritization framework could help bridge this tension.",
    "Your mention of an 'overloaded tech lead' suggests over-reliance on a single individual for creative problem-solving. This creates a bottleneck and succession risk.",
  ],
  idealCandidateProfile: {
    summary: "Your ideal next hire is a strategic product thinker who can bridge the gap between technical execution and market vision. They should excel at identifying emerging opportunities and translating them into actionable initiatives.",
    keyTraits: [
      "Strong strategic thinking and market awareness",
      "Experience driving product innovation in SaaS environments", 
      "Ability to challenge status quo constructively",
      "Comfortable with ambiguity and rapid iteration",
    ],
    targetScores: {
      F: 82,
      I: 70,
      T: 68,
      IN: 88,
      AG: 78,
      RE: 72,
    },
    interviewFocus: [
      "Ask about times they identified market opportunities others missed",
      "Explore how they balance innovation with practical constraints",
      "Assess their approach to building consensus for new ideas",
    ],
  },
  idealHireProfiles: [
    {
      title: "Product Strategist",
      priority: "high",
      rationale: "Addresses critical Innovation and Foresight gaps while complementing existing team strengths",
      targetScores: { F: 85, I: 72, T: 65, IN: 90, AG: 78, RE: 70 },
      keyTraits: ["Market analysis", "Product vision", "Strategic planning", "Stakeholder management"],
      redFlags: ["Risk-averse mindset", "Preference for established processes only", "Limited cross-functional experience"],
    },
    {
      title: "Innovation Lead",
      priority: "medium",
      rationale: "Specialized focus on creative problem-solving and R&D to drive product differentiation",
      targetScores: { F: 78, I: 68, T: 62, IN: 95, AG: 85, RE: 72 },
      keyTraits: ["Design thinking", "Rapid prototyping", "Technical creativity", "Experimentation mindset"],
      redFlags: ["Inability to ship products", "Poor collaboration skills", "Unrealistic timelines"],
    },
  ],
  riskAlerts: [
    {
      title: "Single Point of Failure",
      description: "Tech lead carries disproportionate responsibility for strategic decisions",
      severity: "critical",
      recommendation: "Distribute decision-making and hire for strategic capabilities",
    },
    {
      title: "Innovation Bottleneck",
      description: "Team lacks capacity for breakthrough thinking needed for market differentiation",
      severity: "warning",
      recommendation: "Prioritize Innovation capability in next hire",
    },
  ],
};

const sampleProject = {
  missionStatement: "Revolutionize how mid-market companies manage their customer relationships through AI-powered insights and automation.",
  teamStage: "growth_stage",
  currentChallenges: "Struggling to differentiate from competitors, product roadmap feels reactive rather than proactive, key team members are stretched thin.",
  hiringPlans: 2,
  delayedTasks: "Product roadmap planning, competitive analysis, new feature ideation",
  conflictTopics: "Feature prioritization, resource allocation between maintenance and innovation",
  overloadedMember: "Tech lead handles both technical architecture and product strategy",
  wishedSkills: "Product vision, market research, innovation leadership",
};

const sampleMissionAnalysis = {
  summary: "Your mission to revolutionize CRM through AI requires strong Innovation and Foresight capabilities to identify breakthrough opportunities and anticipate market evolution.",
  capabilityPriorities: [
    { code: "IN", name: "Innovation", priority: "critical" as const, reasoning: "AI-powered solutions require creative problem-solving and breakthrough thinking" },
    { code: "F", name: "Foresight", priority: "critical" as const, reasoning: "Revolutionizing an industry requires anticipating future market needs" },
    { code: "AG", name: "Agility", priority: "high" as const, reasoning: "Mid-market focus requires rapid adaptation to diverse customer needs" },
    { code: "I", name: "Influence", priority: "medium" as const, reasoning: "Selling AI solutions requires strong communication and trust-building" },
    { code: "T", name: "Trust", priority: "medium" as const, reasoning: "B2B relationships depend on reliability and follow-through" },
    { code: "RE", name: "Resilience", priority: "low" as const, reasoning: "Growth stage requires stress management but less critical than innovation" },
  ],
};

const sampleTeamMembers = [
  { name: "Alex Chen", role: "Tech Lead", fitScores: { F: 62, I: 78, T: 85, IN: 55, AG: 70, RE: 75 } },
  { name: "Sarah Kim", role: "Product Manager", fitScores: { F: 58, I: 82, T: 80, IN: 48, AG: 68, RE: 72 } },
  { name: "Marcus Johnson", role: "Senior Developer", fitScores: { F: 52, I: 65, T: 75, IN: 52, AG: 58, RE: 65 } },
  { name: "Priya Patel", role: "UX Designer", fitScores: { F: 60, I: 72, T: 72, IN: 55, AG: 65, RE: 68 } },
];

export default function EcosystemSampleReport() {
  const cumulativeScores = FIT_CAPABILITIES.map(cap => {
    const totalScore = sampleTeamMembers.reduce((sum, member) => {
      return sum + (member.fitScores[cap.code as keyof typeof member.fitScores] || 0);
    }, 0);
    return {
      code: cap.code,
      capability: cap.name,
      score: totalScore,
      maxPossible: sampleTeamMembers.length * 100,
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <Link href="/ecosystem-index">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Ecosystem Index
            </Button>
          </Link>
          
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              Sample Report
            </Badge>
          </div>
          
          <h1 className="text-3xl font-bold mb-2" data-testid="text-sample-report-title">
            Team Diagnostic Report: TechFlow Solutions
          </h1>
          <p className="text-muted-foreground">
            This is an example report showing what insights you'll receive after completing the Ecosystem Index diagnostic.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">TechFlow Solutions</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">4 team members • Growth Stage</p>
              </div>
              <div className="flex gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{sampleAnalysis.missionAlignmentScore}%</div>
                  <div className="text-xs text-muted-foreground">Mission Fit</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{sampleAnalysis.overallHealthScore}%</div>
                  <div className="text-xs text-muted-foreground">Health Score</div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            
            {/* SECTION 1: How to Read This Report */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-slate-600" />
                How to Read This Report
              </h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-sm">
                <div className="space-y-1">
                  <p className="font-medium flex items-center gap-2">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    Your Context
                  </p>
                  <p className="text-xs text-muted-foreground">Summary of the mission, team details, and insights you provided during setup.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium flex items-center gap-2">
                    <Brain className="h-3 w-3 text-muted-foreground" />
                    Strategic Assessment
                  </p>
                  <p className="text-xs text-muted-foreground">AI-generated executive summary analyzing your team's strengths, gaps, and strategic recommendations.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium flex items-center gap-2">
                    <Target className="h-3 w-3 text-muted-foreground" />
                    Mission Alignment
                  </p>
                  <p className="text-xs text-muted-foreground">How well your team's capabilities match what your mission requires for success.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium flex items-center gap-2">
                    <Heart className="h-3 w-3 text-muted-foreground" />
                    Health Score
                  </p>
                  <p className="text-xs text-muted-foreground">Overall team capability coverage, balance, and risk exposure assessment.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium flex items-center gap-2">
                    <BarChart3 className="h-3 w-3 text-muted-foreground" />
                    Gap Analysis
                  </p>
                  <p className="text-xs text-muted-foreground">Visual comparison of current team capabilities vs. what your mission requires.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium flex items-center gap-2">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    Hiring Recommendations
                  </p>
                  <p className="text-xs text-muted-foreground">AI-generated ideal candidate profiles with specific FIT score targets and interview guidance.</p>
                </div>
              </div>
            </div>

            {/* SECTION 2: Your Context */}
            <div className="bg-muted/30 rounded-lg p-6 border">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Your Context
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mission Statement</p>
                  <p className="text-sm">{sampleProject.missionStatement}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Team Stage</p>
                  <p className="text-sm capitalize">Growth Stage</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Challenges</p>
                  <p className="text-sm">{sampleProject.currentChallenges}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Planned Hires</p>
                  <p className="text-sm">{sampleProject.hiringPlans} new team members</p>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t">
                <h5 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Deep Dive Insights
                </h5>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delayed Tasks</p>
                    <p className="text-sm">{sampleProject.delayedTasks}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conflict Topics</p>
                    <p className="text-sm">{sampleProject.conflictTopics}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overloaded Team Members</p>
                    <p className="text-sm">{sampleProject.overloadedMember}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Skills Wished For</p>
                    <p className="text-sm">{sampleProject.wishedSkills}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: Strategic Assessment */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/20">
              <h4 className="font-semibold mb-4 flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-primary" />
                Strategic Assessment
              </h4>
              <div className="prose prose-sm max-w-none text-muted-foreground">
                {sampleAnalysis.executiveSummary.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="mb-3 last:mb-0 leading-relaxed">{paragraph}</p>
                ))}
              </div>
            </div>

            {/* SECTION 4: Mission Alignment */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                Mission Alignment Score Explained
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Your Mission Fit score of <span className="font-semibold text-foreground">{sampleAnalysis.missionAlignmentScore}%</span> measures 
                how well your team's capabilities align with what your mission requires.
              </p>
              
              <div className="mb-4 p-3 bg-white/50 dark:bg-black/20 rounded-md">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Mission Analysis</p>
                <p className="text-sm">{sampleMissionAnalysis.summary}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Why These Capabilities Matter for Your Mission
                </p>
                <div className="grid gap-2">
                  {sampleMissionAnalysis.capabilityPriorities
                    .sort((a, b) => {
                      const order = { critical: 0, high: 1, medium: 2, low: 3 };
                      return order[a.priority] - order[b.priority];
                    })
                    .slice(0, 4)
                    .map((cap, i) => {
                      const capInfo = FIT_CAPABILITIES.find(c => c.code === cap.code);
                      const priorityColors = {
                        critical: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
                        high: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
                        medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
                        low: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200",
                      };
                      return (
                        <div key={i} className="flex items-start gap-3 p-2 rounded-md bg-white/30 dark:bg-black/10">
                          <div className={`h-6 w-6 rounded flex-shrink-0 flex items-center justify-center ${capInfo?.color || "bg-gray-500"}`}>
                            <span className="text-white text-xs font-bold">{cap.code}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{cap.name}</span>
                              <Badge className={`text-xs ${priorityColors[cap.priority]}`} variant="outline">
                                {cap.priority} priority
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{cap.reasoning}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* SECTION 5: Health Score */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Heart className="h-4 w-4 text-green-600" />
                Health Score Explained
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Your Team Health Score of <span className="font-semibold text-foreground">{sampleAnalysis.overallHealthScore}%</span> is a 
                composite metric that tells you how well-equipped your team is to achieve your mission. Think of it as a "readiness rating" 
                that combines capability strength, coverage breadth, and risk exposure into a single number.
              </p>
              
              <div className="mb-4 p-4 bg-white/50 dark:bg-black/20 rounded-md">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">How It's Calculated</p>
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">40%</span>
                    </div>
                    <div>
                      <p className="font-medium">Capability Strength</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        The average of your team's FIT scores across all 8 capabilities. Higher individual scores mean a stronger foundation. 
                        For this team, the average capability score is around 68%, contributing positively to the overall health.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">30%</span>
                    </div>
                    <div>
                      <p className="font-medium">Capability Coverage</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Measures whether you have at least one team member meeting the target threshold for each capability. 
                        A team with 100% coverage has someone strong in every area; gaps here indicate blind spots. 
                        This team has good coverage in Focus and Tenacity but gaps in Influence and Collaboration.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">30%</span>
                    </div>
                    <div>
                      <p className="font-medium">Risk & Gap Penalties</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Deductions for critical gaps, warnings, and risk factors. Critical gaps (where the team is 15+ points below target) 
                        have the heaviest penalty (-8 points each). Warnings (-4 points) and minor risks (-2 points) also reduce the score. 
                        This team has 2 critical gaps pulling the score down.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4 p-4 bg-white/50 dark:bg-black/20 rounded-md">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">What the Score Means</p>
                <div className="grid gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-12 rounded-full bg-green-500"></div>
                    <span><strong>80-100%:</strong> Excellent — Team is well-balanced and mission-ready with minimal gaps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-12 rounded-full bg-emerald-500"></div>
                    <span><strong>65-79%:</strong> Good — Solid foundation with some areas needing attention</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-12 rounded-full bg-amber-500"></div>
                    <span><strong>50-64%:</strong> Fair — Notable gaps that could impact mission success</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-12 rounded-full bg-red-500"></div>
                    <span><strong>Below 50%:</strong> Needs Attention — Significant capability gaps requiring immediate action</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Factors Affecting Your Score
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  These are the specific issues identified that are reducing your team's health score:
                </p>
                <div className="space-y-2">
                  {sampleAnalysis.riskAlerts.map((alert, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        alert.severity === "critical" ? "text-red-500" : "text-amber-500"
                      }`} />
                      <div>
                        <span className="text-foreground">{alert.title}</span>
                        {alert.severity === "critical" && (
                          <span className="text-xs text-red-500 ml-2">(-8 points)</span>
                        )}
                        {alert.severity === "warning" && (
                          <span className="text-xs text-amber-500 ml-2">(-4 points)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 6: Capability Gap Analysis */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Capability Gap Analysis
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Compare your team's current capability levels against what's needed for mission success.
              </p>
              <div className="space-y-4">
                {sampleAnalysis.capabilityGapMatrix.map((item, i) => {
                  const capInfo = FIT_CAPABILITIES.find(c => c.code === item.code);
                  const gap = item.targetScore - item.currentScore;
                  return (
                    <div key={i} className="p-4 bg-muted/30 rounded-lg border">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`h-8 w-8 rounded flex-shrink-0 flex items-center justify-center ${capInfo?.color || "bg-gray-500"}`}>
                          <span className="text-white text-sm font-bold">{item.code}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{item.name}</span>
                            <Badge variant={item.priority === "critical" ? "destructive" : item.priority === "high" ? "default" : "secondary"}>
                              {item.priority} priority
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-semibold">{item.currentScore}%</div>
                          <div className="text-xs text-muted-foreground">Current</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-primary">{item.targetScore}%</div>
                          <div className="text-xs text-muted-foreground">Target</div>
                        </div>
                        <div>
                          <div className={`text-lg font-semibold ${gap > 20 ? "text-red-600" : gap > 10 ? "text-amber-600" : "text-green-600"}`}>
                            {gap > 0 ? `+${gap}` : gap}%
                          </div>
                          <div className="text-xs text-muted-foreground">Gap</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 7: Radar Chart */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Team Cumulative Capability Profile
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                This radar chart shows your team's combined scores across all six FIT capabilities.
              </p>
              <div className="bg-muted/30 rounded-lg p-4 border">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={cumulativeScores} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis 
                        dataKey="code" 
                        tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                      />
                      <PolarRadiusAxis 
                        angle={30} 
                        domain={[0, sampleTeamMembers.length * 100]}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        tickCount={5}
                      />
                      <Radar
                        name="Team Score"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* SECTION 8: Deep Insights */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Deep Contextual Insights
              </h4>
              <div className="space-y-3">
                {sampleAnalysis.contextualInsights.map((insight, i) => (
                  <div key={i} className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 9: Ideal Candidate */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                Your Ideal Next Hire
              </h4>
              <div className="p-5 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm mb-4">{sampleAnalysis.idealCandidateProfile.summary}</p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Key Traits</p>
                    <ul className="text-sm space-y-1">
                      {sampleAnalysis.idealCandidateProfile.keyTraits.map((trait, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          {trait}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Target FIT Scores</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(sampleAnalysis.idealCandidateProfile.targetScores).map(([code, score]) => {
                        const capInfo = FIT_CAPABILITIES.find(c => c.code === code);
                        return (
                          <Badge key={code} variant="outline" className="text-xs">
                            <span className={`inline-block h-2 w-2 rounded-full mr-1 ${capInfo?.color || "bg-gray-500"}`}></span>
                            {code}: {score}%
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Interview Focus Areas</p>
                  <ul className="text-sm space-y-1">
                    {sampleAnalysis.idealCandidateProfile.interviewFocus.map((focus, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground mt-1">•</span>
                        {focus}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* SECTION 10: Hire Profiles */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Recommended Hire Profiles
              </h4>
              <div className="grid gap-4">
                {sampleAnalysis.idealHireProfiles.map((profile, i) => (
                  <div key={i} className="p-5 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-semibold">{profile.title}</h5>
                          <Badge variant={profile.priority === "high" ? "default" : "secondary"}>
                            {profile.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{profile.rationale}</p>
                      </div>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Key Traits</p>
                        <div className="flex flex-wrap gap-1">
                          {profile.keyTraits.map((trait, j) => (
                            <Badge key={j} variant="outline" className="text-xs">{trait}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Target Scores</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(profile.targetScores).map(([code, score]) => {
                            const capInfo = FIT_CAPABILITIES.find(c => c.code === code);
                            return (
                              <Badge key={code} variant="outline" className="text-xs">
                                <span className={`inline-block h-2 w-2 rounded-full mr-1 ${capInfo?.color || "bg-gray-500"}`}></span>
                                {code}: {score}%
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {profile.redFlags && profile.redFlags.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Red Flags
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {profile.redFlags.map((flag, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <span className="text-red-500 mt-1">•</span>
                              {flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 11: Additional Services */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Star className="h-4 w-4 text-slate-600" />
                Additional Services on Request
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Enhance your team diagnostic with these optional services:
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Interview Questions</p>
                    <p className="text-xs text-muted-foreground">Custom questions based on identified gaps</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Team Composition</p>
                    <p className="text-xs text-muted-foreground">Optimal team structure recommendations</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Time to Productivity</p>
                    <p className="text-xs text-muted-foreground">Onboarding timeline estimates</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Risk Analysis</p>
                    <p className="text-xs text-muted-foreground">Detailed succession and key-person risk</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Development Costs</p>
                    <p className="text-xs text-muted-foreground">Investment needed to close gaps</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Benchmarking</p>
                    <p className="text-xs text-muted-foreground">Compare against industry standards</p>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 12: Schedule Consultation */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-8 border border-primary/20 text-center">
              <Calendar className="h-10 w-10 text-primary mx-auto mb-4" />
              <h4 className="font-semibold text-xl mb-2">Ready to Get Your Own Report?</h4>
              <p className="text-sm text-muted-foreground mb-6 max-w-lg mx-auto">
                Start your team diagnostic now or schedule a consultation with our experts to discuss 
                your specific needs and how we can help optimize your team.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/ecosystem/start">
                  <Button size="lg" data-testid="button-start-diagnostic-cta">
                    Start Your Diagnostic
                  </Button>
                </Link>
                <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" data-testid="button-schedule-consultation">
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Consultation
                  </Button>
                </a>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
