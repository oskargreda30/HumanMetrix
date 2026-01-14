import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Building2,
  Users,
  FileText,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  Upload,
  Send,
  ArrowRight,
  Sparkles,
  Scale,
  TrendingUp,
  Shield,
  UserPlus,
  Download,
  Lightbulb,
  Network,
  Puzzle,
  Eye,
  Brain,
  Heart,
  Zap,
  RefreshCw
} from "lucide-react";
import dashboardBg from "@assets/image_1763608498774.png";
import { SEO } from "@/lib/seo";

const capabilities = [
  { code: "HA", name: "High Agency", color: "bg-blue-500", description: "Drive and self-direction" },
  { code: "IC", name: "Intellectual Curiosity", color: "bg-purple-500", description: "Learning and exploration" },
  { code: "RA", name: "Resilience", color: "bg-green-500", description: "Adaptability under pressure" },
  { code: "EE", name: "Empathy & Ethics", color: "bg-rose-500", description: "Interpersonal awareness" },
  { code: "GM", name: "Growth Mindset", color: "bg-amber-500", description: "Continuous improvement" },
  { code: "IA", name: "Interpersonal Agility", color: "bg-cyan-500", description: "Social navigation" },
];

const problems = [
  "Talented teams still struggle and underperform",
  "Hiring \"more of the same\" doesn't fix team gaps",
  "Personality and role tests don't diagnose system-level issues",
];

const solutions = [
  "Analyze team capability distribution across 6 core dimensions",
  "Reveal gaps, overload risks, and imbalance patterns",
  "Enable targeted hiring and team design decisions",
];

const analysisFeatures = [
  { icon: Network, title: "Capability Coverage Mapping", description: "Visualize how capabilities are distributed across your team members" },
  { icon: AlertTriangle, title: "Concentration & Overload Detection", description: "Identify where too few people carry critical capabilities" },
  { icon: Scale, title: "Imbalance Pattern Analysis", description: "Detect mismatches like high execution but low ethics awareness" },
  { icon: Target, title: "Goal Alignment Assessment", description: "Compare your team against profiles optimized for innovation, stability, or speed" },
  { icon: UserPlus, title: "Complement Hire Simulation", description: "Model ideal new hires to fill capability gaps" },
];

const deliverables = [
  { icon: BarChart3, title: "Team Capability Map", description: "Distribution view, not averages" },
  { icon: AlertTriangle, title: "Overload & Bottleneck Alerts", description: "Critical concentration risks" },
  { icon: Shield, title: "Risk & Imbalance Analysis", description: "System-level vulnerabilities" },
  { icon: Target, title: "Goal Alignment Score", description: "Fit for your objectives" },
  { icon: UserPlus, title: "Ideal Complement Profiles", description: "Who you should hire next" },
  { icon: Download, title: "Downloadable Report", description: "Share with stakeholders" },
];

const differentiators = [
  { 
    category: "Traditional Approach",
    items: [
      { label: "Personality tests", problem: true },
      { label: "Role-based models", problem: true },
      { label: "Individual labels", problem: true },
      { label: "Static trait assessments", problem: true },
    ]
  },
  {
    category: "Ecosystem Index",
    items: [
      { label: "Scenario-based behavioral measurement", problem: false },
      { label: "Team-system diagnostics", problem: false },
      { label: "Designed for AI-era work", problem: false },
      { label: "Actionable hiring recommendations", problem: false },
    ]
  }
];

export default function EcosystemIndex() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <SEO 
        title="The Ecosystem Index - Team Capability Diagnostic | HumanMetrix"
        description="Diagnose how human capabilities are distributed across your team. Identify gaps, overload risks, and get actionable hiring recommendations."
        canonical="/ecosystem-index"
      />
      
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url(${dashboardBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(241, 245, 249, 0.92), rgba(248, 250, 252, 0.88), rgba(241, 245, 249, 0.92))'
        }} />
      </div>
      
      <Navigation />
      
      <main className="flex-grow relative z-10">
        {/* Hero Section */}
        <section className="py-16 md:py-24" data-testid="section-hero">
          <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8 text-center">
            <div className="inline-block mb-4 md:mb-6">
              <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary border-primary/20">
                Team Diagnostic
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 md:mb-6" data-testid="text-hero-headline">
              The Ecosystem Index
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-4 max-w-3xl mx-auto" data-testid="text-hero-tagline">
              Design teams that actually work.
            </p>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl mx-auto" data-testid="text-hero-description">
              Teams don't fail because of the wrong personalities. They fail because critical human 
              capabilities are unevenly distributed. The Ecosystem Index diagnoses how capabilities 
              are distributed across your team and shows you how to rebalance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" data-testid="button-start-diagnostic">
                Start Team Diagnostic
              </Button>
              <Button size="lg" variant="outline" data-testid="button-view-sample-report">
                View Sample Report
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-6" data-testid="text-hero-features">
              Scenario-based assessment • Team-level insights • Modern work ready
            </p>
          </div>
        </section>

        {/* Capabilities Overview */}
        <section className="py-12 md:py-16 bg-muted/30" data-testid="section-capabilities">
          <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-xl md:text-2xl font-semibold mb-2" data-testid="text-capabilities-title">Six Core Capabilities We Measure</h2>
              <p className="text-muted-foreground" data-testid="text-capabilities-description">Complementary capabilities that make teams succeed</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {capabilities.map((cap, index) => (
                <Card key={index} className="p-4 text-center hover-elevate" data-testid={`capability-${cap.code}`}>
                  <div className={`w-12 h-12 rounded-full ${cap.color} mx-auto mb-3 flex items-center justify-center`}>
                    <span className="text-white font-bold text-sm">{cap.code}</span>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{cap.name}</h3>
                  <p className="text-xs text-muted-foreground">{cap.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Problem → Solution */}
        <section className="py-12 md:py-20" data-testid="section-problem-solution">
          <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-semibold">The Problem</h2>
                </div>
                <ul className="space-y-3">
                  {problems.map((problem, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-destructive text-sm font-medium">{index + 1}</span>
                      </div>
                      <span className="text-muted-foreground">{problem}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Lightbulb className="h-5 w-5 text-green-600" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-semibold">The Solution</h2>
                </div>
                <ul className="space-y-3">
                  {solutions.map((solution, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-foreground">{solution}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works - Step by Step */}
        <section className="py-12 md:py-20 bg-muted/30" data-testid="section-how-it-works">
          <div className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-how-it-works-title">How It Works</h2>
              <p className="text-muted-foreground" data-testid="text-how-it-works-description">Four simple steps to team clarity</p>
            </div>

            {/* Step 1: Define Organization Context */}
            <div className="mb-12" data-testid="step-1-container">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-step-1-title">Define Organization Context</h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-step-1-description">Tell us about your company and team</p>
                </div>
              </div>
              
              <Card className="p-6 md:p-8" data-testid="step-1-form">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input id="company-name" placeholder="Acme Corporation" data-testid="input-company-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-size">Company Size</Label>
                    <Select>
                      <SelectTrigger id="company-size" data-testid="select-company-size">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="501-1000">501-1000 employees</SelectItem>
                        <SelectItem value="1000+">1000+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select>
                      <SelectTrigger id="industry" data-testid="select-industry">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="finance">Finance & Banking</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="retail">Retail & E-commerce</SelectItem>
                        <SelectItem value="consulting">Consulting</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sub-industry">Sub-Industry (Optional)</Label>
                    <Input id="sub-industry" placeholder="e.g., SaaS, Fintech" data-testid="input-sub-industry" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team-type">Team Type</Label>
                    <Select>
                      <SelectTrigger id="team-type" data-testid="select-team-type">
                        <SelectValue placeholder="Select team type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="engineering">Engineering</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                        <SelectItem value="leadership">Leadership/Executive</SelectItem>
                        <SelectItem value="cross-functional">Cross-functional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="work-mode">Work Mode</Label>
                    <Select>
                      <SelectTrigger id="work-mode" data-testid="select-work-mode">
                        <SelectValue placeholder="Select work mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Fully Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="onsite">On-site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="mission">Mission Statement or Company Ethos (Optional)</Label>
                    <Textarea 
                      id="mission" 
                      placeholder="Paste your company's mission statement, values, or cultural ethos here..."
                      className="min-h-[100px]"
                      data-testid="textarea-mission"
                    />
                    <p className="text-xs text-muted-foreground">
                      This helps us understand your organizational priorities and tailor recommendations
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Step 2: Add Team Members */}
            <div className="mb-12" data-testid="step-2-container">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-step-2-title">Add Team Members</h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-step-2-description">Upload reports or invite team members</p>
                </div>
              </div>
              
              <Card className="p-6 md:p-8" data-testid="step-2-form">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover-elevate cursor-pointer" data-testid="upload-reports-area">
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h4 className="font-medium mb-1" data-testid="text-upload-title">Upload Existing Reports</h4>
                    <p className="text-sm text-muted-foreground mb-3" data-testid="text-upload-description">
                      Drag & drop HumanMetrix PDF reports
                    </p>
                    <Button variant="outline" size="sm" data-testid="button-upload-reports">
                      Browse Files
                    </Button>
                  </div>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover-elevate cursor-pointer" data-testid="send-invites-area">
                    <Send className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h4 className="font-medium mb-1" data-testid="text-invite-title">Send Assessment Links</h4>
                    <p className="text-sm text-muted-foreground mb-3" data-testid="text-invite-description">
                      Invite team members to complete assessments
                    </p>
                    <Button variant="outline" size="sm" data-testid="button-send-invites">
                      Invite Team
                    </Button>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-muted/50 rounded-lg" data-testid="team-count-indicator">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span data-testid="text-team-count">0 team members added</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Step 3: Generate Report */}
            <div className="mb-12" data-testid="step-3-container">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-step-3-title">Generate Team Report</h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-step-3-description">Our AI analyzes team-level patterns</p>
                </div>
              </div>
              
              <Card className="p-6 md:p-8 text-center" data-testid="step-3-generate">
                <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
                <h4 className="text-lg font-semibold mb-2" data-testid="text-step-3-card-title">Ready to Analyze</h4>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto" data-testid="text-step-3-card-description">
                  Once you've added your team members, our system will analyze capability patterns 
                  and generate your comprehensive team report.
                </p>
                <Button size="lg" data-testid="button-generate-report">
                  Generate Team Report
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Card>
            </div>

            {/* Step 4: Take Action */}
            <div data-testid="step-4-container">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-step-4-title">Take Action</h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-step-4-description">Use insights to hire, rebalance, or develop</p>
                </div>
              </div>
              
              <Card className="p-6 md:p-8" data-testid="step-4-action">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4" data-testid="action-hire">
                    <UserPlus className="h-8 w-8 text-primary mx-auto mb-3" />
                    <h4 className="font-semibold mb-1" data-testid="text-action-hire-title">Hire Strategically</h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-action-hire-description">
                      Use complement profiles to find the right new team members
                    </p>
                  </div>
                  <div className="text-center p-4" data-testid="action-rebalance">
                    <RefreshCw className="h-8 w-8 text-primary mx-auto mb-3" />
                    <h4 className="font-semibold mb-1" data-testid="text-action-rebalance-title">Rebalance Teams</h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-action-rebalance-description">
                      Redistribute capabilities across existing teams
                    </p>
                  </div>
                  <div className="text-center p-4" data-testid="action-develop">
                    <TrendingUp className="h-8 w-8 text-primary mx-auto mb-3" />
                    <h4 className="font-semibold mb-1" data-testid="text-action-develop-title">Develop Talent</h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-action-develop-description">
                      Target training to address capability gaps
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* What the Analysis Does */}
        <section className="py-12 md:py-20" data-testid="section-analysis">
          <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-analysis-title">What the Analysis Does</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-analysis-description">
                Behind the scenes, our system performs comprehensive team-level diagnostics
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analysisFeatures.map((feature, index) => (
                <Card key={index} className="p-6 hover-elevate" data-testid={`analysis-feature-${index}`}>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* What You Receive */}
        <section className="py-12 md:py-20 bg-muted/30" data-testid="section-deliverables">
          <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-deliverables-title">What You Receive</h2>
              <p className="text-muted-foreground" data-testid="text-deliverables-description">Actionable insights, not abstract scores</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {deliverables.map((item, index) => (
                <Card key={index} className="p-5 flex items-start gap-4" data-testid={`deliverable-${index}`}>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Sample Report Preview */}
        <section className="py-12 md:py-20" data-testid="section-sample-report">
          <div className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-sample-report-title">Sample Report Preview</h2>
              <p className="text-muted-foreground" data-testid="text-sample-report-description">See what your team diagnostic reveals</p>
            </div>
            
            <Card className="p-6 md:p-8 overflow-hidden" data-testid="sample-report-card">
              {/* Mock Team Header */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b" data-testid="sample-report-header">
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-sample-team-name">Acme Engineering Team</h3>
                  <p className="text-sm text-muted-foreground">8 team members • Technology • Hybrid</p>
                </div>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200" data-testid="badge-imbalance-status">
                  Moderate Imbalance Detected
                </Badge>
              </div>
              
              {/* Capability Distribution */}
              <div className="mb-8" data-testid="sample-capability-distribution">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Team Capability Distribution
                </h4>
                <div className="space-y-3">
                  {capabilities.map((cap, index) => {
                    const values = [75, 45, 60, 30, 85, 55];
                    const value = values[index];
                    return (
                      <div key={cap.code} className="flex items-center gap-3" data-testid={`capability-bar-${cap.code}`}>
                        <div className="w-20 text-sm font-medium">{cap.code}</div>
                        <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                          <div 
                            className={`h-full ${cap.color} rounded-full flex items-center justify-end pr-2`}
                            style={{ width: `${value}%` }}
                          >
                            <span className="text-xs text-white font-medium">{value}%</span>
                          </div>
                        </div>
                        <div className="w-24 text-xs text-muted-foreground">{cap.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Risk Alerts */}
              <div className="grid md:grid-cols-2 gap-4 mb-8" data-testid="sample-risk-alerts">
                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg" data-testid="alert-capability-gap">
                  <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Capability Gap Detected
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <strong>Empathy & Ethics (EE)</strong> is critically underrepresented. 
                    Only 1 of 8 team members shows strength in this area.
                  </p>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg" data-testid="alert-overload-risk">
                  <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Overload Risk
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <strong>Growth Mindset (GM)</strong> is concentrated in 2 team members 
                    who may be overloaded with change initiatives.
                  </p>
                </div>
              </div>

              {/* Ideal Hire Profile */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg" data-testid="sample-ideal-hire">
                <div className="flex items-center gap-2 font-semibold mb-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Recommended Complement Hire
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  To balance this team, prioritize candidates who demonstrate:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-rose-100 text-rose-700 border-rose-200" data-testid="badge-recommend-ee">High EE (Empathy & Ethics)</Badge>
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200" data-testid="badge-recommend-ic">Strong IC (Intellectual Curiosity)</Badge>
                  <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200" data-testid="badge-recommend-ia">Solid IA (Interpersonal Agility)</Badge>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Differentiation */}
        <section className="py-12 md:py-20 bg-muted/30" data-testid="section-differentiation">
          <div className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-differentiation-title">Why This Is Different</h2>
              <p className="text-muted-foreground" data-testid="text-differentiation-description">Team diagnostics, not personality labels</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {differentiators.map((group, groupIndex) => (
                <Card key={groupIndex} className={`p-6 ${groupIndex === 0 ? 'bg-muted/50' : 'bg-primary/5 border-primary/20'}`} data-testid={`differentiator-${groupIndex === 0 ? 'traditional' : 'ecosystem'}`}>
                  <h3 className={`font-semibold mb-4 ${groupIndex === 0 ? 'text-muted-foreground' : 'text-primary'}`}>
                    {group.category}
                  </h3>
                  <ul className="space-y-3">
                    {group.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-center gap-2" data-testid={`diff-item-${groupIndex}-${itemIndex}`}>
                        {item.problem ? (
                          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-muted-foreground text-xs">—</span>
                          </div>
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        )}
                        <span className={item.problem ? 'text-muted-foreground' : 'text-foreground font-medium'}>
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground" data-testid="text-privacy-note">
                Privacy-first: Team-level insights by default. Individual data only with consent.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 md:py-24" data-testid="section-final-cta">
          <div className="mx-auto max-w-3xl px-4 md:px-6 lg:px-8 text-center">
            <Eye className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-semibold mb-4" data-testid="text-cta-title">
              See the Hidden Gaps in Your Team
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto" data-testid="text-cta-description">
              Stop guessing why talented teams underperform. Get clear visibility into 
              capability distribution and actionable recommendations.
            </p>
            <Button size="lg" className="px-8" data-testid="button-final-cta">
              Start Team Diagnostic
            </Button>
            <p className="text-xs text-muted-foreground mt-4" data-testid="text-cta-disclaimer">
              Early access • No commitment required
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
