import { useState } from "react";
import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  RefreshCw,
  Calendar,
  Clock,
  Info,
  Mail,
  MessageSquare
} from "lucide-react";
import dashboardBg from "@assets/image_1763608498774.png";
import { SEO, ServiceSchema, HowToSchema } from "@/lib/seo";

const capabilities = [
  { code: "HA", name: "High Agency", color: "bg-blue-500", description: "Drive and self-direction" },
  { code: "IC", name: "Intellectual Curiosity", color: "bg-purple-500", description: "Learning and exploration" },
  { code: "RA", name: "Resilience", color: "bg-green-500", description: "Adaptability under pressure" },
  { code: "EE", name: "Empathy & Ethics", color: "bg-rose-500", description: "Interpersonal awareness" },
  { code: "GM", name: "Growth Mindset", color: "bg-amber-500", description: "Continuous improvement" },
  { code: "IA", name: "Interpersonal Agility", color: "bg-cyan-500", description: "Social navigation" },
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
  // Auth state for gating sections 2-6
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Calendly URL for booking consultations
  const CALENDLY_URL = "https://calendly.com/hello-humanmetrix/30min";
  
  // State for contact options dialog
  const [showContactDialog, setShowContactDialog] = useState(false);
  
  // Pre-filled enquiry message for email option
  const contactEnquiryMessage = encodeURIComponent("Hi, I'm interested in learning more about The Ecosystem Index team diagnostic service. Please send me pricing information and details about how the assessment works for my team.");
  
  // Login prompt overlay for locked sections
  const LoginOverlay = () => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
      <div className="text-center p-6 max-w-sm">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h4 className="font-semibold mb-2">Login Required</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Sign in to access the team diagnostic workflow
        </p>
        <Link href="/login">
          <Button data-testid="button-login-to-continue">
            Login to Continue
          </Button>
        </Link>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen flex flex-col relative">
      <SEO 
        title="The Ecosystem Index - Team Capability Diagnostic"
        description="Diagnose how human capabilities are distributed across your team. Identify capability gaps, overload risks, and get actionable hiring recommendations. Team diagnostic tool for modern HR."
        canonical="/ecosystem-index"
        keywords="team diagnostic, capability assessment, team analysis, HR analytics, workforce planning, team composition, hiring recommendations, team capability mapping"
      />
      <ServiceSchema 
        name="The Ecosystem Index - Team Capability Diagnostic"
        description="Team-level diagnostic tool that maps capability distribution, identifies gaps and risks, and provides actionable recommendations for hiring and team design."
        url="/ecosystem-index"
      />
      <HowToSchema 
        name="How to Diagnose Your Team's Capability Distribution"
        description="Use The Ecosystem Index consulting service to analyze your team's capability distribution and get actionable insights"
        steps={[
          { name: "Login or Create Account", text: "Sign in to your account or create a new one to get started" },
          { name: "Define Mission & Ethos", text: "Share your company mission statement for AI-powered analysis" },
          { name: "Define Organization Context", text: "Enter your company details, industry, and team information" },
          { name: "Add Team Members", text: "Upload existing HumanMetrix reports or send assessment invitations" },
          { name: "Team FIT Assessment", text: "Team members complete the FIT behavioral assessment" },
          { name: "Schedule Consultation & Generate Report", text: "Book your pre-consultation to begin the team diagnostic process and receive your comprehensive report" }
        ]}
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
            
            {/* Book Consultation with Recommended Banner */}
            <div className="mt-8 inline-flex flex-col items-center">
              <div className="relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-amber-500 text-white text-xs font-semibold rounded-full whitespace-nowrap">
                  Recommended
                </span>
                <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="default" className="mt-2 bg-primary hover:bg-primary/90" data-testid="button-book-consultation-hero">
                    <Calendar className="mr-2 h-4 w-4" />
                    Book a Consultation
                  </Button>
                </a>
              </div>
            </div>
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

        
        {/* How It Works - Step by Step */}
        <section className="py-12 md:py-20 bg-muted/30" data-testid="section-how-it-works">
          <div className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-how-it-works-title">How It Works</h2>
              <p className="text-muted-foreground" data-testid="text-how-it-works-description">Six simple steps to team clarity</p>
            </div>

            {/* Step 1: Login or Create Account */}
            <div className="mb-12" data-testid="step-1-container">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-step-1-title">Login or Create Account</h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-step-1-description">Sign in to get started or create a new account</p>
                </div>
              </div>
              
              <Card className="p-6 md:p-8" data-testid="step-1-form">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Existing Account Login */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Already have an account?</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input id="login-email" type="email" placeholder="your@company.com" data-testid="input-login-email" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <Input id="login-password" type="password" placeholder="••••••••" data-testid="input-login-password" />
                      </div>
                      <Button className="w-full" data-testid="button-login">
                        Sign In
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Partner accounts will have organization details pre-filled
                    </p>
                  </div>
                  
                  {/* Divider */}
                  <div className="hidden md:block w-px bg-border" />
                  <div className="md:hidden border-t" />
                  
                  {/* Contact the Team */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">New to HumanMetrix?</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Get in touch with our team to learn more about the Ecosystem Index and how it can help your organization.
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setShowContactDialog(true)}
                      data-testid="button-contact-team"
                    >
                      Contact the Team
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Step 2: Mission Statement / Company Ethos */}
            <div className="mb-12" data-testid="step-2-container">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-step-2-title">Define Your Mission & Ethos</h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-step-2-description">Help our AI understand your organizational culture</p>
                </div>
              </div>
              
              <div className="relative">
                {!authLoading && !isAuthenticated && <LoginOverlay />}
                <Card className="p-6 md:p-8" data-testid="step-2-form">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg mb-4">
                    <Brain className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">AI-Powered Analysis</p>
                      <p className="text-sm text-muted-foreground">
                        Our AI model will evaluate your mission statement and company ethos to extract insights about 
                        how your organization works, what capabilities you prioritize, and what your team may need to succeed.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mission">Mission Statement or Company Ethos</Label>
                    <Textarea 
                      id="mission" 
                      placeholder="Paste your company's mission statement, core values, cultural manifesto, or guiding principles here. The more context you provide, the better our AI can tailor recommendations to your organization..."
                      className="min-h-[150px]"
                      data-testid="textarea-mission"
                    />
                    <p className="text-xs text-muted-foreground">
                      Examples: Company mission, vision statement, core values, employee handbook excerpts, or team charter
                    </p>
                  </div>
                </div>
              </Card>
              </div>
            </div>

            {/* Step 3: Define Organization Context */}
            <div className="mb-12" data-testid="step-3-container">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-step-3-title">Define Organization Context</h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-step-3-description">Tell us about your company and team</p>
                </div>
              </div>
              
              <div className="relative">
                {!authLoading && !isAuthenticated && <LoginOverlay />}
                <Card className="p-6 md:p-8" data-testid="step-3-form">
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
                </div>
              </Card>
              </div>
            </div>

            {/* Step 4: Add Team Members */}
            <div className="mb-12" data-testid="step-4-container">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-step-4-title">Add Team Members</h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-step-4-description">Upload reports or invite team members</p>
                </div>
              </div>
              
              <div className="relative">
                {!authLoading && !isAuthenticated && <LoginOverlay />}
                <Card className="p-6 md:p-8" data-testid="step-4-form">
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
            </div>

            {/* Step 5: FIT Assessment */}
            <div className="mb-12" data-testid="step-5-container">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  5
                </div>
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-step-5-title">Team FIT Assessment</h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-step-5-description">Team members complete the FIT behavioral assessment</p>
                </div>
              </div>
              
              <div className="relative">
                {!authLoading && !isAuthenticated && <LoginOverlay />}
                <Card className="p-6 md:p-8" data-testid="step-5-form">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Heart className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold mb-2">FIT Assessment</h4>
                      <p className="text-muted-foreground mb-4">
                        The FIT Assessment measures 6 core behavioral capabilities that drive team performance 
                        and collaboration effectiveness.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {[
                          { code: "HA", name: "High Agency", color: "bg-blue-500" },
                          { code: "IC", name: "Intellectual Curiosity", color: "bg-purple-500" },
                          { code: "RA", name: "Resilience", color: "bg-green-500" },
                          { code: "EE", name: "Empathy & Ethics", color: "bg-rose-500" },
                          { code: "GM", name: "Growth Mindset", color: "bg-amber-500" },
                          { code: "IA", name: "Interpersonal Agility", color: "bg-cyan-500" },
                        ].map((cap, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <div className={`h-3 w-3 rounded ${cap.color}`} />
                            <span className="text-muted-foreground">{cap.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg md:w-40">
                    <span className="text-2xl font-bold text-primary">~15</span>
                    <span className="text-xs text-muted-foreground text-center">minutes per team member</span>
                  </div>
                </div>
              </Card>
              </div>
            </div>

            {/* Step 6: Export Results */}
            <div data-testid="step-6-container">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  6
                </div>
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-step-6-title">Export Results</h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-step-6-description">Generate a comprehensive team diagnostic report</p>
                </div>
              </div>
              
              <div className="relative">
                {!authLoading && !isAuthenticated && <LoginOverlay />}
                <Card className="p-6 md:p-8" data-testid="step-6-payment">
                <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
                  <Button 
                    size="lg" 
                    className="w-full" 
                    data-testid="button-generate-report"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                  
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>Comprehensive team analysis</span>
                  </div>
                </div>
              </Card>
              </div>
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
      
      {/* Contact Options Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How would you like to connect?</DialogTitle>
            <DialogDescription>
              Choose the option that works best for you
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Option 1: Email/Contact Form */}
            <a 
              href={`mailto:hello@humanmetrix.co.uk?subject=Ecosystem%20Index%20Enquiry&body=${contactEnquiryMessage}`}
              className="block"
              onClick={() => setShowContactDialog(false)}
            >
              <Card className="p-4 hover-elevate cursor-pointer transition-all">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Get Pricing & Info by Email</h4>
                    <p className="text-sm text-muted-foreground">
                      Send us an email and we'll reply with detailed pricing and information about The Ecosystem Index.
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground mt-2" />
                </div>
              </Card>
            </a>
            
            {/* Option 2: Book Consultation */}
            <a 
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              onClick={() => setShowContactDialog(false)}
            >
              <Card className="p-4 hover-elevate cursor-pointer transition-all">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">Book a Consultation</h4>
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-0">Recommended</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Schedule a 30-minute call with our team to discuss your needs and get personalized guidance.
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground mt-2" />
                </div>
              </Card>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
