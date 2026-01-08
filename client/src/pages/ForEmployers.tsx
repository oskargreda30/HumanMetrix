import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import ContactFormDialog from "@/components/ContactFormDialog";
import { 
  Users, 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3, 
  FileCheck, 
  Mail, 
  Clock,
  Headset,
  ClipboardCheck,
  Send,
  BadgeCheck,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import dashboardBg from "@assets/image_1763608498774.png";
import { SEO } from "@/lib/seo";

const features = [
  {
    icon: Users,
    title: "Scalable Candidate Assessment",
    description: "Send assessment links to unlimited candidates. Track completion status and access results in real-time from your dashboard.",
  },
  {
    icon: BarChart3,
    title: "Comprehensive Analytics",
    description: "Compare candidates side-by-side with detailed skill breakdowns. Identify top performers at a glance with percentile rankings.",
  },
  {
    icon: FileCheck,
    title: "Standardized Evaluation",
    description: "Remove bias with objective, AI-powered scoring. Every candidate is evaluated using the same rigorous methodology.",
  },
  {
    icon: Mail,
    title: "Automated Workflows",
    description: "Send invitations, track progress, and receive notifications automatically. Focus on decision-making, not administration.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level encryption, GDPR compliance, and role-based access control. Your candidate data is protected at every step.",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Candidates receive results immediately upon completion. No waiting for manual grading or processing delays.",
  },
];

const journeySteps = [
  {
    step: 1,
    icon: Headset,
    title: "Discovery Call",
    description: "Schedule a personalized demo to understand your hiring challenges and assessment needs.",
  },
  {
    step: 2,
    icon: ClipboardCheck,
    title: "Guided Onboarding",
    description: "We set up your partner account, configure role requirements, and provide integration support.",
  },
  {
    step: 3,
    icon: Send,
    title: "Invite Candidates",
    description: "Send branded assessment invitations via CSV upload, manual entry, or API integration.",
  },
  {
    step: 4,
    icon: Users,
    title: "Assessments Complete",
    description: "Candidates complete FIT, AI Readiness, Prompt Architecture, and AIQ assessments.",
  },
  {
    step: 5,
    icon: BarChart3,
    title: "Review Analytics",
    description: "Access multi-candidate comparison, role fit analysis, and cohort benchmarking.",
  },
  {
    step: 6,
    icon: BadgeCheck,
    title: "Make Decisions",
    description: "Download comprehensive PDF reports and leverage AI recommendations to hire the best.",
  },
];

const useCases = [
  {
    title: "Tech Recruitment",
    description: "Identify candidates who can effectively leverage AI tools and think critically about algorithmic systems.",
  },
  {
    title: "Graduate Programs",
    description: "Assess behavioral competencies and AI readiness for entry-level positions in AI-forward organizations.",
  },
  {
    title: "Leadership Development",
    description: "Evaluate existing teams on AI literacy and behavioral skills to inform training and development initiatives.",
  },
  {
    title: "Internal Mobility",
    description: "Make data-driven decisions about role transitions by understanding each employee's skill profile.",
  },
];

export default function ForEmployers() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogIntent, setDialogIntent] = useState<'demo' | 'sales'>('demo');

  const openDialog = (intent: 'demo' | 'sales') => {
    setDialogIntent(intent);
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <SEO 
        title="For Employers - Pre-Employment Testing UK | HumanMetrix"
        description="HumanMetrix for employers: AI candidate assessments, compare human metrics analytics & make data-driven hiring decisions. UK trusted."
        canonical="/for-employers"
      />
      {/* Background image with light grey overlay */}
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
      <ContactFormDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        intent={dialogIntent}
      />
      <main className="flex-grow relative z-10">
        {/* Hero Section */}
        <section className="py-12 md:py-24">
          <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8 text-center">
            <div className="inline-block mb-4 md:mb-6">
              <span className="inline-flex items-center rounded-full px-3 py-1 md:px-4 md:py-1.5 text-xs md:text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                For Employers
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 md:mb-6">
              Hire for the AI Era
            </h1>
            <p className="text-sm md:text-base lg:text-xl text-muted-foreground leading-relaxed mb-6 md:mb-8">
              Make better hiring decisions with objective, AI-powered assessments that measure both 
              behavioral competencies and AI literacy. Find candidates who will thrive in your organization.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => openDialog('demo')}
                data-testid="button-request-demo"
              >
                Request Demo
              </Button>
              <Link href="/assessments">
                <Button size="lg" variant="outline" data-testid="button-view-assessments">
                  View Assessments
                </Button>
              </Link>
              <Link href="/#sample-reports">
                <Button size="lg" variant="outline" data-testid="button-view-sample-reports">
                  View Sample Reports
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-12 md:py-24 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-16">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-2 md:mb-4">
                How HumanMetrix Works
              </h2>
              <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                From first contact to confident hiring decisions in six simple steps
              </p>
            </div>

            {/* Desktop: Horizontal Journey with Arrows */}
            <div className="hidden lg:block">
              <div className="flex items-start justify-between gap-2">
                {journeySteps.map((step, index) => (
                  <div key={step.step} className="flex items-start flex-1" data-testid={`journey-step-desktop-${step.step}`}>
                    {/* Step Card */}
                    <div className="flex flex-col items-center text-center flex-1">
                      {/* Step Number Badge */}
                      <div className="relative mb-4">
                        <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                          <step.icon className="h-7 w-7 text-primary" />
                        </div>
                        <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                          {step.step}
                        </div>
                      </div>
                      {/* Step Content */}
                      <h3 className="text-sm font-semibold mb-2">{step.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed px-1">
                        {step.description}
                      </p>
                    </div>
                    {/* Arrow Connector (not after last step) */}
                    {index < journeySteps.length - 1 && (
                      <div className="flex items-center justify-center pt-6 px-1">
                        <ArrowRight className="h-6 w-6 text-primary/50" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tablet: 2x3 Grid */}
            <div className="hidden md:grid lg:hidden grid-cols-3 gap-6">
              {journeySteps.map((step) => (
                <Card key={step.step} className="p-4 text-center relative overflow-visible" data-testid={`journey-step-${step.step}`}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {step.step}
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 mt-2">
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold mb-2">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </Card>
              ))}
            </div>

            {/* Mobile: Vertical Timeline */}
            <div className="md:hidden space-y-4">
              {journeySteps.map((step, index) => (
                <div key={step.step} className="flex gap-4" data-testid={`journey-step-mobile-${step.step}`}>
                  {/* Timeline Line and Dot */}
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center flex-shrink-0">
                      {step.step}
                    </div>
                    {index < journeySteps.length - 1 && (
                      <div className="w-0.5 h-full bg-primary/20 mt-2 min-h-[40px]" />
                    )}
                  </div>
                  {/* Step Content */}
                  <Card className="flex-1 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <step.icon className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold">{step.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </Card>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center mt-10">
              <Button 
                size="lg" 
                onClick={() => openDialog('demo')}
                data-testid="button-how-it-works-cta"
              >
                Request a Demo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-12 md:py-24">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-16">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-2 md:mb-4">
                Everything You Need to Make Better Hires
              </h2>
              <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                Purpose-built for modern recruitment teams
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="p-4 md:p-6 hover-elevate transition-all">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <h3 className="text-sm md:text-base lg:text-lg font-semibold">{feature.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-12 md:py-24 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-16">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-2 md:mb-4">
                Built for Your Use Case
              </h2>
              <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                From recruitment to internal development, HumanMetrix adapts to your needs
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
              {useCases.map((useCase, index) => (
                <Card key={index} className="p-4 md:p-6">
                  <h3 className="text-sm md:text-base lg:text-lg font-semibold mb-1 md:mb-2">{useCase.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {useCase.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Preview */}
        <section className="py-12 md:py-24">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <Card className="p-6 md:p-8 lg:p-12">
                <div className="text-center mb-6 md:mb-8">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-2 md:mb-4">Simple, Transparent Pricing</h2>
                  <p className="text-muted-foreground">
                    Enterprise plans available for teams of 10+ candidates per month
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-8">
                  <div className="text-center">
                    <Clock className="h-8 w-8 text-primary mx-auto mb-3" />
                    <div className="text-2xl font-bold text-primary mb-2">20-30 min</div>
                    <div className="text-sm text-muted-foreground">Per assessment</div>
                  </div>
                  <div className="text-center">
                    <Users className="h-8 w-8 text-primary mx-auto mb-3" />
                    <div className="text-2xl font-bold text-primary mb-2">Unlimited</div>
                    <div className="text-sm text-muted-foreground">Candidates</div>
                  </div>
                  <div className="text-center">
                    <Zap className="h-8 w-8 text-primary mx-auto mb-3" />
                    <div className="text-2xl font-bold text-primary mb-2">Instant</div>
                    <div className="text-sm text-muted-foreground">Results</div>
                  </div>
                </div>

                <div className="text-center">
                  <Button 
                    size="lg" 
                    onClick={() => openDialog('sales')}
                    data-testid="button-contact-sales"
                  >
                    Contact Sales for Enterprise Pricing
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4">
                    Email us at hello@humanmetrix.co.uk
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
