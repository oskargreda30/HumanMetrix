import { Link } from "wouter";
import { Button } from "@/components/ui/button";
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
  CheckCircle,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

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
  executiveSummary: `TechFlow Solutions Team demonstrates strong foundational capabilities in Trust (78%) and Influence (74%), creating a solid base for client relationships and team cohesion. However, the team faces significant gaps in Innovation (52%) and Foresight (58%), which may limit their ability to anticipate market shifts and develop breakthrough solutions.

The team's current composition is well-suited for executing established processes and maintaining client satisfaction, but lacks the creative problem-solving capacity needed to differentiate in a competitive SaaS market. The moderate Agility score (65%) suggests some capacity for adaptation, but this should be strengthened to support rapid product iteration.

Key recommendation: Your next hire should prioritize Innovation and Foresight capabilities to complement the team's existing strengths and address the strategic gaps that could limit growth.`,
  capabilityGapMatrix: [
    { code: "F", name: "Foresight", capability: "Foresight", currentScore: 58, targetScore: 85, priority: "critical", gapAnalysis: "Critical gap in strategic planning capability. Team struggles to anticipate market changes and plan long-term initiatives." },
    { code: "IN", name: "Innovation", capability: "Innovation", currentScore: 52, targetScore: 85, priority: "critical", gapAnalysis: "Significant innovation deficit limiting product differentiation and creative problem-solving capacity." },
    { code: "AG", name: "Agility", capability: "Agility", currentScore: 65, targetScore: 75, priority: "high", gapAnalysis: "Moderate agility gap affecting team's ability to pivot quickly in response to market feedback." },
    { code: "RE", name: "Resilience", capability: "Resilience", currentScore: 70, targetScore: 75, priority: "medium", gapAnalysis: "Minor resilience gap. Team handles stress reasonably well but could improve recovery from setbacks." },
    { code: "I", name: "Influence", capability: "Influence", currentScore: 74, targetScore: 75, priority: "low", gapAnalysis: "Near target. Strong communication and stakeholder management skills across the team." },
    { code: "T", name: "Trust", capability: "Trust", currentScore: 78, targetScore: 75, priority: "low", gapAnalysis: "Exceeds target. Team demonstrates high reliability and integrity in all interactions." },
  ],
  contextualInsights: [
    {
      title: "Execution-Heavy Culture Masks Innovation Deficit",
      category: "team_dynamics",
      analysis: "Your team's high Trust and Influence scores indicate a well-coordinated execution engine, but the significant Innovation gap (58% vs 85% target) suggests the team has optimized for delivery at the expense of creative problem-solving. The delayed 'product roadmap planning' tasks confirm this pattern — the team excels at building what's defined but struggles to define what should be built next."
    },
    {
      title: "Scaling Will Demand Strategic Foresight Capability",
      category: "future_needs",
      analysis: "As your company moves from product-market fit to scaling, the Foresight gap (52% vs 82% target) becomes increasingly critical. Industry benchmarks show that teams entering growth phases without strong strategic planning capability experience 40% longer decision cycles. Your current challenges around feature prioritization will compound as the product portfolio expands and market dynamics shift."
    },
    {
      title: "Right Hire Could Unlock Team's Strategic Potential",
      category: "post_hire_outlook",
      analysis: "Adding a strategic product thinker with strong Innovation (82-90%) and Foresight (78-85%) scores would fundamentally shift team dynamics. The current overloaded tech lead would be freed from strategic planning, allowing them to focus on technical excellence. The new hire would also model creative problem-solving behaviors, gradually elevating the team's overall Innovation capability through collaboration."
    },
    {
      title: "Single-Point-of-Failure Risk in Creative Problem-Solving",
      category: "strategic_risk",
      analysis: "Your mention of an 'overloaded tech lead' combined with low team-wide Innovation scores reveals a critical succession risk. If this individual departs, the team would lack any meaningful creative and strategic capability. Additionally, the persistent conflict around feature prioritization suggests decision fatigue that, left unaddressed, could lead to team burnout and talent attrition within 12-18 months."
    },
  ],
  idealCandidateProfile: {
    summary: "Your ideal next hire is a strategic product thinker who can bridge the gap between technical execution and market vision. They should excel at identifying emerging opportunities and translating them into actionable initiatives.",
    fitTargets: {
      F: { min: 78, ideal: 85, reasoning: "Critical for addressing Foresight gap and driving strategic planning" },
      I: { min: 65, ideal: 72, reasoning: "Sufficient to collaborate effectively with existing team" },
      T: { min: 62, ideal: 70, reasoning: "Baseline reliability needed for team integration" },
      IN: { min: 82, ideal: 90, reasoning: "Primary capability gap - prioritize strongly" },
      AG: { min: 72, ideal: 80, reasoning: "Important for adapting to changing priorities" },
      RE: { min: 68, ideal: 75, reasoning: "Moderate resilience for handling startup pressures" },
    },
    keyTraits: [
      "Strong strategic thinking and market awareness",
      "Experience driving product innovation in SaaS environments", 
      "Ability to challenge status quo constructively",
      "Comfortable with ambiguity and rapid iteration",
    ],
    interviewFocusAreas: [
      "Ask about times they identified market opportunities others missed",
      "Explore how they balance innovation with practical constraints",
      "Assess their approach to building consensus for new ideas",
    ],
  },
  idealHireProfiles: [
    {
      roleTitle: "Product Strategist",
      priority: 1,
      rationale: "Addresses critical Innovation and Foresight gaps while complementing existing team strengths in Trust and Influence.",
      fitTargets: {
        F: { min: 80, ideal: 88 },
        I: { min: 68, ideal: 75 },
        T: { min: 60, ideal: 68 },
        IN: { min: 85, ideal: 92 },
        AG: { min: 75, ideal: 82 },
        RE: { min: 65, ideal: 72 },
      },
      keyBehaviors: ["Market analysis", "Product vision", "Strategic planning", "Stakeholder management"],
      redFlags: ["Risk-averse mindset", "Preference for established processes only", "Limited cross-functional experience"],
    },
    {
      roleTitle: "Innovation Lead",
      priority: 2,
      rationale: "Specialized focus on creative problem-solving and R&D to drive product differentiation and explore new opportunities.",
      fitTargets: {
        F: { min: 72, ideal: 80 },
        I: { min: 62, ideal: 70 },
        T: { min: 58, ideal: 65 },
        IN: { min: 88, ideal: 95 },
        AG: { min: 80, ideal: 88 },
        RE: { min: 68, ideal: 75 },
      },
      keyBehaviors: ["Design thinking", "Rapid prototyping", "Technical creativity", "Experimentation mindset"],
      redFlags: ["Inability to ship products", "Poor collaboration skills", "Unrealistic timelines"],
    },
  ],
  riskAlerts: [
    { title: "Innovation capability below mission requirements", severity: "critical" },
    { title: "Foresight gap limiting strategic planning", severity: "critical" },
    { title: "Single point of failure on tech lead for creative decisions", severity: "warning" },
    { title: "Agility slightly below target for rapid iteration", severity: "warning" },
  ],
};

const sampleProject = {
  missionStatement: "To revolutionize small business operations through intuitive, AI-powered workflow automation that saves time and reduces errors.",
  currentChallenges: "Struggling to move beyond core feature set. Need to innovate faster while maintaining quality. Feature prioritization causes team friction.",
  hiringPlans: 2,
  teamStage: "growth",
  delayedTasks: "Product roadmap planning, competitive analysis, long-term strategy documentation",
  conflictTopics: "Feature prioritization, resource allocation between maintenance and new features",
  overloadedMember: "Tech lead handles most strategic decisions alongside technical work",
  wishedSkills: "Strategic thinking, market research, product innovation",
};

const sampleMissionAnalysis = {
  summary: "Your mission requires strong Innovation and Foresight to 'revolutionize' operations and stay ahead of competitors with AI-powered solutions. Trust is essential for small business customers who need reliable automation.",
  capabilityPriorities: [
    { code: "IN", name: "Innovation", priority: "critical" as const, reasoning: "Essential for developing breakthrough AI-powered features that differentiate your product" },
    { code: "F", name: "Foresight", priority: "critical" as const, reasoning: "Needed to anticipate market trends and plan strategic product evolution" },
    { code: "AG", name: "Agility", priority: "high" as const, reasoning: "Important for rapid iteration and responding to small business needs" },
    { code: "T", name: "Trust", priority: "high" as const, reasoning: "Critical for small business customers who rely on your automation for operations" },
    { code: "I", name: "Influence", priority: "medium" as const, reasoning: "Helpful for internal alignment and customer communication" },
    { code: "RE", name: "Resilience", priority: "medium" as const, reasoning: "Supports team sustainability during growth phase" },
  ],
};

const sampleTeamMembers = [
  { id: 1, name: "Sarah Chen", role: "Product Manager", fitScores: { F: 62, I: 78, T: 80, IN: 55, AG: 68, RE: 72 } },
  { id: 2, name: "Marcus Johnson", role: "Tech Lead", fitScores: { F: 58, I: 72, T: 82, IN: 60, AG: 70, RE: 75 } },
  { id: 3, name: "Elena Rodriguez", role: "UX Designer", fitScores: { F: 52, I: 74, T: 75, IN: 48, AG: 62, RE: 68 } },
  { id: 4, name: "David Park", role: "Backend Engineer", fitScores: { F: 60, I: 72, T: 78, IN: 45, AG: 60, RE: 65 } },
];

const cumulativeScores = FIT_CAPABILITIES.map(cap => {
  const totalScore = sampleTeamMembers.reduce((sum, member) => {
    return sum + (member.fitScores[cap.code as keyof typeof member.fitScores] || 0);
  }, 0);
  return {
    capability: cap.name,
    code: cap.code,
    score: totalScore,
    maxPossible: sampleTeamMembers.length * 100,
  };
});

export default function EcosystemSampleReport() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/ecosystem-index">
            <Button variant="ghost" className="mb-4" data-testid="button-back-to-ecosystem">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Ecosystem Index
            </Button>
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              Sample Report
            </Badge>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-sample-report-title">
            Team Diagnostic Report: TechFlow Solutions Team
          </h1>
          <p className="text-muted-foreground">
            This is an example report showing what insights you'll receive after completing the Ecosystem Index diagnostic.
          </p>
        </div>

        {/* Report Content - Matching Dashboard Layout */}
        <div className="space-y-8">
          {/* Header with Scores */}
          <div className="flex items-center justify-between pb-4 border-b flex-wrap gap-2">
            <div>
              <h3 className="text-xl font-semibold">Team Diagnostic Report</h3>
              <p className="text-sm text-muted-foreground">
                {sampleTeamMembers.length} team members • Growth Stage
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant={sampleAnalysis.overallHealthScore >= 70 ? "default" : sampleAnalysis.overallHealthScore >= 50 ? "secondary" : "destructive"}>
                Health: {sampleAnalysis.overallHealthScore}%
              </Badge>
              <Badge variant={sampleAnalysis.missionAlignmentScore >= 70 ? "default" : sampleAnalysis.missionAlignmentScore >= 50 ? "secondary" : "destructive"}>
                Mission Fit: {sampleAnalysis.missionAlignmentScore}%
              </Badge>
            </div>
          </div>
          
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
                <p className="text-xs text-muted-foreground">Executive summary analyzing your team's strengths, gaps, and strategic recommendations.</p>
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
                <p className="text-xs text-muted-foreground">Ideal candidate profiles with specific FIT score targets and interview guidance.</p>
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
            
            {/* Deep Dive Insights */}
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

          {/* SECTION 2.5: Candidates Assessed Summary */}
          <div className="bg-muted/30 rounded-lg p-6 border">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Candidates Assessed
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              This analysis is based on FIT assessment scores from {sampleTeamMembers.length} of {sampleTeamMembers.length} team members.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {sampleTeamMembers.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center gap-3 p-3 rounded-lg border bg-background"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                  </div>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                    Assessed
                  </Badge>
                </div>
              ))}
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

          {/* SECTION 4: Mission Alignment Score Explained */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Mission Alignment Score Explained
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Your Mission Fit score of <span className="font-semibold text-foreground">{sampleAnalysis.missionAlignmentScore}%</span> measures 
              how well your team's capabilities align with what your mission requires. Based on your mission statement, 
              we've identified which behavioral skills are most critical for your success.
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

          {/* SECTION 5: Health Score Explained */}
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
                    <p className="text-muted-foreground text-xs mt-2">
                      The average of your team's FIT scores across all 6 capabilities. Higher individual scores mean a stronger foundation.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">30%</span>
                  </div>
                  <div>
                    <p className="font-medium">Capability Coverage</p>
                    <p className="text-muted-foreground text-xs mt-2">
                      Measures whether you have at least one team member meeting the target threshold for each capability. 
                      A team with 100% coverage has someone strong in every area; gaps here indicate blind spots.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">30%</span>
                  </div>
                  <div>
                    <p className="font-medium">Risk & Gap Penalties</p>
                    <p className="text-muted-foreground text-xs mt-2">
                      Deductions for critical gaps, warnings, and risk factors. Critical gaps (where the team is 15+ points below target) 
                      have the heaviest penalty (-8 points each). Warnings (-4 points) and minor risks (-2 points) also reduce the score.
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

          {/* SECTION 6: Capability Gap Analysis - Visual Overview */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Capability Gap Analysis
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Compare your team's current capability levels against what's needed for mission success. 
              The gap score shows how much additional capacity would strengthen each area.
            </p>
            <div className="space-y-2">
              {sampleAnalysis.capabilityGapMatrix.map((item, i) => {
                const capInfo = FIT_CAPABILITIES.find(c => c.code === item.code);
                const gap = Math.max(0, item.targetScore - item.currentScore);
                const gapColor = gap >= 30 ? "text-red-600 dark:text-red-400" : 
                                 gap >= 15 ? "text-amber-600 dark:text-amber-400" : 
                                 "text-green-600 dark:text-green-400";
                
                return (
                  <div key={i} className="bg-muted/30 rounded-lg p-3 border">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-6 w-6 rounded ${capInfo?.color || "bg-gray-500"} flex items-center justify-center`}>
                          <span className="text-white text-[10px] font-bold">{item.code}</span>
                        </div>
                        <span className="text-sm font-medium">{item.capability}</span>
                      </div>
                      <div className={`text-xs font-semibold ${gapColor}`}>
                        {gap > 0 ? `+${gap} gap` : "On target"}
                      </div>
                    </div>
                    
                    {/* Horizontal bar chart */}
                    <div className="relative h-4 bg-muted rounded-full overflow-hidden mb-1">
                      {/* Target marker line */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-foreground/60 z-10"
                        style={{ left: `${item.targetScore}%` }}
                      />
                      {/* Current score bar */}
                      <div 
                        className={`h-full rounded-full transition-all ${capInfo?.color || "bg-primary"}`}
                        style={{ width: `${item.currentScore}%`, opacity: 0.8 }}
                      />
                      {/* Target score indicator (hollow) */}
                      <div 
                        className="absolute top-0 h-full border-2 border-dashed border-foreground/40 rounded-full"
                        style={{ width: `${item.targetScore}%` }}
                      />
                    </div>
                    
                    {/* Legend */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <div className={`h-1.5 w-3 rounded ${capInfo?.color || "bg-primary"}`} style={{ opacity: 0.8 }} />
                          Current: {item.currentScore}
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="h-1.5 w-3 rounded border border-dashed border-foreground/40" />
                          Target: {item.targetScore}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.gapAnalysis}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 7: Team Cumulative Capability Chart */}
          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Team Cumulative Capability Profile
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              This skills chart shows your team's combined scores across all six FIT capabilities. 
              With {sampleTeamMembers.length} team member{sampleTeamMembers.length !== 1 ? 's' : ''}, the maximum possible score for each capability is {sampleTeamMembers.length * 100}.
            </p>
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={cumulativeScores} barCategoryGap="28%" margin={{ top: 5, right: 55, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <YAxis type="category" dataKey="code" width={120} tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <XAxis type="number" domain={[0, sampleTeamMembers.length * 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value} / ${props.payload.maxPossible} (${Math.round((value / props.payload.maxPossible) * 100)}%)`,
                        props.payload.capability
                      ]}
                    />
                    <Bar dataKey="score" fill="#5B8DB8" radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fontSize: 12, fontWeight: 600 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t">
                {cumulativeScores.map((item) => {
                  const capInfo = FIT_CAPABILITIES.find(c => c.code === item.code);
                  const percentage = Math.round((item.score / item.maxPossible) * 100);
                  return (
                    <div key={item.code} className="flex items-center gap-2">
                      <div className={`h-6 w-6 rounded flex-shrink-0 flex items-center justify-center ${capInfo?.color || "bg-gray-500"}`}>
                        <span className="text-white text-xs font-bold">{item.code}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{item.capability}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.score}/{item.maxPossible} ({percentage}%)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 8: Deep Contextual Insights */}
          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Deep Contextual Insights
            </h4>
            <div className="space-y-4">
              {sampleAnalysis.contextualInsights.map((insight, i) => {
                const categoryConfig: Record<string, { label: string; icon: typeof Users; color: string }> = {
                  team_dynamics: { label: 'Team Dynamics', icon: Users, color: 'text-blue-600 dark:text-blue-400' },
                  future_needs: { label: 'Future Needs', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400' },
                  post_hire_outlook: { label: 'Post-Hire Outlook', icon: UserPlus, color: 'text-violet-600 dark:text-violet-400' },
                  strategic_risk: { label: 'Strategic Risk', icon: ShieldAlert, color: 'text-amber-600 dark:text-amber-400' },
                };
                const config = categoryConfig[insight.category];
                const CategoryIcon = config?.icon || Lightbulb;

                return (
                  <div key={i} className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CategoryIcon className={`h-4 w-4 ${config?.color || 'text-amber-500'}`} />
                      <span className="font-medium text-sm">{insight.title}</span>
                      {config && (
                        <Badge variant="outline" className="text-xs ml-auto">
                          {config.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.analysis}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 9: Ideal Candidate Profile */}
          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              Your Ideal Next Hire
            </h4>
            <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm mb-4 whitespace-pre-line">{sampleAnalysis.idealCandidateProfile.summary}</p>
              
              {/* Target FIT Scores with Reasoning */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">Target FIT Score Ranges</p>
                <div className="grid gap-2">
                  {Object.entries(sampleAnalysis.idealCandidateProfile.fitTargets).map(([code, targets]) => {
                    const capInfo = FIT_CAPABILITIES.find(c => c.code === code);
                    return (
                      <div key={code} className="flex items-start gap-3 p-2 bg-background/50 rounded">
                        <div className={`h-6 w-6 rounded ${capInfo?.color || "bg-gray-500"} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white text-xs font-bold">{code}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{capInfo?.name || code}</span>
                            <Badge variant="outline" className="text-xs">
                              {targets.min}-{targets.ideal}%
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{targets.reasoning}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Key Traits */}
              <div>
                <p className="text-xs font-medium text-primary mb-2">Key Traits to Seek</p>
                <ul className="text-sm space-y-1">
                  {sampleAnalysis.idealCandidateProfile.keyTraits.map((trait, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                      <span>{trait}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* SECTION 10: Recommended Hire Profiles */}
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
                        <Badge variant="default" className="text-xs">Priority #{profile.priority}</Badge>
                      </div>
                      <h5 className="font-semibold text-lg">{profile.roleTitle}</h5>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">{profile.rationale}</p>
                  
                  {/* FIT Score Targets */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Target FIT Scores</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(profile.fitTargets).map(([code, targets]) => {
                        const capInfo = FIT_CAPABILITIES.find(c => c.code === code);
                        return (
                          <div key={code} className="flex items-center gap-2 text-sm">
                            <div className={`h-5 w-5 rounded ${capInfo?.color || "bg-gray-500"} flex items-center justify-center`}>
                              <span className="text-white text-[10px] font-bold">{code}</span>
                            </div>
                            <span className="text-muted-foreground">
                              {targets.min}-{targets.ideal}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Key Behaviors & Red Flags */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {profile.keyBehaviors && profile.keyBehaviors.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Look For
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {profile.keyBehaviors.map((behavior, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <span className="text-green-500 mt-1">•</span>
                              {behavior}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {profile.redFlags && profile.redFlags.length > 0 && (
                      <div>
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
              <Link href="/ecosystem-index">
                <Button size="lg" data-testid="button-start-diagnostic-cta">
                  Get Started
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
        </div>
      </div>
    </div>
  );
}
