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
  Clock 
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
                <a>
                  <Button size="lg" variant="outline" data-testid="button-view-assessments">
                    View Assessments
                  </Button>
                </a>
              </Link>
              <Link href="/#sample-reports">
                <a>
                  <Button size="lg" variant="outline" data-testid="button-view-sample-reports">
                    View Sample Reports
                  </Button>
                </a>
              </Link>
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
                    Email us at info@humanmetrix.co.uk
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
