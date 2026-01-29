import { useState } from "react";
import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Building2,
  Users,
  Target,
  CheckCircle,
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
  Zap,
  RefreshCw,
  Calendar,
  Clock,
  Info,
  Mail,
  MessageSquare,
  FileText,
  AlertTriangle,
  BarChart3
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
  // Calendly URL for booking consultations
  const CALENDLY_URL = "https://calendly.com/hello-humanmetrix/30min";
  
  // State for contact options dialog
  const [showContactDialog, setShowContactDialog] = useState(false);
  
  // Pre-filled enquiry message for email option
  const contactEnquiryMessage = encodeURIComponent("Hi, I'm interested in learning more about The Ecosystem Index team diagnostic service. Please send me pricing information and details about how the assessment works for my team.");
  
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
        name="How to Get Started with The Ecosystem Index"
        description="Learn how to access The Ecosystem Index team diagnostic service"
        steps={[
          { name: "Login to Partner Dashboard", text: "Sign in to your partner account to access the team diagnostic tools" },
          { name: "Contact Our Team", text: "New to HumanMetrix? Get in touch with our team to learn about pricing and setup" }
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
              <Button 
                size="lg" 
                data-testid="button-start-diagnostic"
                onClick={() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Start Team Diagnostic
              </Button>
              <Link href="/ecosystem/sample-report">
                <Button size="lg" variant="outline" data-testid="button-view-sample-report">
                  View Sample Report
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6" data-testid="text-hero-features">
              Team Gap Analysis • Hiring Recommendations • AI-Powered Insights
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {capabilities.map((cap, index) => (
                <Card key={index} className="p-3 md:p-4 text-center hover-elevate" data-testid={`capability-${cap.code}`}>
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${cap.color} mx-auto mb-2 md:mb-3 flex items-center justify-center`}>
                    <span className="text-white font-bold text-xs md:text-sm">{cap.code}</span>
                  </div>
                  <h3 className="font-semibold text-xs md:text-sm mb-1 leading-tight">{cap.name}</h3>
                  <p className="text-xs text-muted-foreground leading-tight hidden sm:block">{cap.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        
        {/* Get Started */}
        <section id="how-it-works" className="py-12 md:py-20 bg-muted/30" data-testid="section-how-it-works">
          <div className="mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-how-it-works-title">Get Started</h2>
              <p className="text-muted-foreground" data-testid="text-how-it-works-description">Login to your partner dashboard or contact us to begin</p>
            </div>

            {/* Login or Contact */}
            <Card className="p-6 md:p-8" data-testid="get-started-card">
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
                    Access your partner dashboard to manage team diagnostics
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
                  <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg mt-4">
                    <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Partner accounts include full access to team diagnostic tools, AI-powered gap analysis, and comprehensive reporting.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
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
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-sample-report-title">Sample Report Preview</h2>
              <p className="text-muted-foreground mb-8" data-testid="text-sample-report-description">See what your team diagnostic reveals</p>
              
              <Card className="p-8 md:p-12 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20" data-testid="sample-report-card">
                <div className="flex flex-col items-center gap-6">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">TechFlow Solutions Team Diagnostic</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Explore a complete sample report with mission alignment analysis, capability gap visualization, 
                      contextual insights, and ideal candidate profiles.
                    </p>
                  </div>
                  <Link href="/ecosystem/sample-report">
                    <Button size="lg" data-testid="button-view-sample-report">
                      <FileText className="mr-2 h-4 w-4" />
                      View Full Sample Report
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Differentiation */}
        <section className="py-12 md:py-20 bg-muted/30" data-testid="section-differentiation">
          <div className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-differentiation-title">Why This Is Different</h2>
              <p className="text-muted-foreground" data-testid="text-differentiation-description">Team diagnostics, not personality labels</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {differentiators.map((group, groupIndex) => (
                <Card key={groupIndex} className={`p-4 md:p-6 ${groupIndex === 0 ? 'bg-muted/50' : 'bg-primary/5 border-primary/20'}`} data-testid={`differentiator-${groupIndex === 0 ? 'traditional' : 'ecosystem'}`}>
                  <h3 className={`font-semibold text-sm md:text-base mb-3 md:mb-4 ${groupIndex === 0 ? 'text-muted-foreground' : 'text-primary'}`}>
                    {group.category}
                  </h3>
                  <ul className="space-y-2 md:space-y-3">
                    {group.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-2" data-testid={`diff-item-${groupIndex}-${itemIndex}`}>
                        {item.problem ? (
                          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-muted-foreground text-xs">—</span>
                          </div>
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={`text-sm md:text-base ${item.problem ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
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
            <Link href="/ecosystem/start">
              <Button size="lg" className="px-8" data-testid="button-final-cta">
                Start Team Diagnostic
              </Button>
            </Link>
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
