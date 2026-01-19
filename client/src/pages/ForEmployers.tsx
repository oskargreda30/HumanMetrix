import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Phone,
  Settings,
  Puzzle,
  Send,
  ClipboardCheck,
  CheckCircle,
  X,
  Check,
  ChevronDown,
  Target,
  Award,
  Building2
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import dashboardBg from "@assets/image_1763608498774.png";
import { SEO, FAQSchema } from "@/lib/seo";

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

const howItWorks = [
  {
    step: 1,
    icon: Phone,
    title: "Discovery Call",
    description: "Schedule a consultation to discuss your hiring needs and assessment requirements",
  },
  {
    step: 2,
    icon: Settings,
    title: "Account Setup",
    description: "We create your partner account with custom branding, API access, and billing preferences",
  },
  {
    step: 3,
    icon: Puzzle,
    title: "Integration",
    description: "Choose your method: embed via widget, use the partner portal, or connect to your ATS",
  },
  {
    step: 4,
    icon: Send,
    title: "Invite Candidates",
    description: "Send branded assessment invitations via email, CSV upload, or API integration",
  },
  {
    step: 5,
    icon: ClipboardCheck,
    title: "Assessments Complete",
    description: "Candidates take FIT, AI Readiness, Prompt Architecture, and AIQ tests",
  },
  {
    step: 6,
    icon: CheckCircle,
    title: "Review & Hire",
    description: "Access comprehensive reports, compare candidates, and get AI-powered role fit analysis",
  },
];

const statistics = [
  {
    value: "75%",
    label: "of CVs contain exaggerated claims",
    description: "Our verified assessments provide objective data you can trust",
  },
  {
    value: "3x",
    label: "faster time-to-hire",
    description: "Streamline candidate screening with instant, standardized results",
  },
  {
    value: "40%",
    label: "reduction in bad hires",
    description: "Predict job performance with AI-powered behavioral analysis",
  },
  {
    value: "100%",
    label: "objective evaluation",
    description: "Remove unconscious bias with data-driven hiring decisions",
  },
];

const comparisonData = [
  { feature: "CV screening time", traditional: "5-10 min per CV", humanmetrix: "Instant scoring" },
  { feature: "Objectivity", traditional: "Subjective interpretation", humanmetrix: "AI-standardized evaluation" },
  { feature: "AI literacy assessment", traditional: "Not available", humanmetrix: "4 comprehensive tests" },
  { feature: "Candidate comparison", traditional: "Manual spreadsheets", humanmetrix: "Built-in analytics dashboard" },
  { feature: "Results delivery", traditional: "Days to weeks", humanmetrix: "Immediate PDF reports" },
  { feature: "Bias reduction", traditional: "Training required", humanmetrix: "Built into methodology" },
];

const faqs = [
  {
    question: "How long do the assessments take to complete?",
    answer: "Each of our four assessments takes approximately 14-20 minutes to complete. Candidates can complete them in any order and at their own pace, with results available immediately upon completion.",
  },
  {
    question: "Can I customise the assessments for my organisation?",
    answer: "Yes, enterprise partners can customise the assessment experience with their own branding, logo, and email templates. We also offer role-specific weighting to prioritise skills that matter most for your positions.",
  },
  {
    question: "How do you ensure assessment integrity?",
    answer: "Our assessments use AI-generated questions with no fixed answer keys, making them resistant to gaming. We also track session timing and provide indicators when responses appear inconsistent.",
  },
  {
    question: "What integrations do you support?",
    answer: "We integrate with major ATS platforms including Greenhouse, Lever, Workday, SAP SuccessFactors, and Oracle HCM. We also offer a REST API, custom API connectors, and an embeddable JavaScript widget for any other integrations.",
  },
  {
    question: "Is our candidate data secure?",
    answer: "Absolutely. We use SOC 2 Type II certified infrastructure with bank-level encryption (AES-256), role-based access control, and secure cloud hosting. Candidates can request data deletion at any time.",
  },
  {
    question: "What's included in enterprise pricing?",
    answer: "Enterprise plans include unlimited team members, API access, ATS integrations, custom branding, dedicated account management, and volume discounts. Contact our sales team for a customised quote.",
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
        title="For Employers - Pre-Employment Testing UK"
        description="HumanMetrix for employers: AI-powered candidate assessments, compare human metrics analytics & make data-driven hiring decisions. Pre-employment psychometric testing trusted by UK recruiters."
        canonical="/for-employers"
        keywords="pre-employment testing, candidate assessment, recruitment testing UK, AI hiring tools, psychometric testing employers, HR assessment platform, talent acquisition, hiring analytics"
      />
      <FAQSchema faqs={faqs.map(f => ({ question: f.question, answer: f.answer }))} />
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
      
      {/* For Job Seekers link - top left */}
      <div className="relative z-20 px-4 md:px-6 lg:px-8 pt-2">
        <Link href="/" data-testid="link-for-job-seekers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <span>Looking for job seeker assessments?</span>
          <span className="font-medium underline underline-offset-2">Click here</span>
        </Link>
      </div>
      
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
            <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
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

        {/* Statistics Section */}
        <section className="py-12 md:py-20 bg-muted/30" data-testid="section-statistics">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {statistics.map((stat, index) => (
                <div key={index} className="text-center" data-testid={`stat-${index}`}>
                  <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm md:text-base font-semibold mb-1">
                    {stat.label}
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {stat.description}
                  </p>
                </div>
              ))}
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

        {/* Comparison Table */}
        <section className="py-12 md:py-24 bg-muted/30" data-testid="section-comparison">
          <div className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-2 md:mb-4">
                HumanMetrix vs Traditional Hiring
              </h2>
              <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                See how AI-powered assessments transform your recruitment process
              </p>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="comparison-table">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 text-sm md:text-base font-semibold">Feature</th>
                      <th className="text-left p-4 text-sm md:text-base font-semibold text-muted-foreground">Traditional Hiring</th>
                      <th className="text-left p-4 text-sm md:text-base font-semibold text-primary">HumanMetrix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, index) => (
                      <tr key={index} className="border-b last:border-0" data-testid={`comparison-row-${index}`}>
                        <td className="p-4 text-sm font-medium">{row.feature}</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <X className="h-4 w-4 text-destructive flex-shrink-0" />
                            <span>{row.traditional}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span className="font-medium">{row.humanmetrix}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 md:py-24" data-testid="section-how-it-works">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-16">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-2 md:mb-4" data-testid="text-how-it-works-heading">
                How It Works
              </h2>
              <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-how-it-works-subheading">
                From first contact to hiring decision in six simple steps
              </p>
            </div>

            {/* Desktop: Horizontal timeline */}
            <div className="hidden lg:block" data-testid="timeline-desktop">
              <div className="relative">
                {/* Connecting line */}
                <div className="absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
                
                <div className="grid grid-cols-6 gap-4">
                  {howItWorks.map((item, index) => (
                    <div key={index} className="relative flex flex-col items-center text-center" data-testid={`step-${item.step}`}>
                      {/* Step number circle */}
                      <div className="relative z-10 h-24 w-24 rounded-full bg-background border-2 border-primary/30 flex flex-col items-center justify-center shadow-lg mb-4">
                        <item.icon className="h-8 w-8 text-primary mb-1" />
                        <span className="text-xs font-bold text-primary">Step {item.step}</span>
                      </div>
                      <h3 className="text-sm font-semibold mb-2">{item.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed px-1">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile/Tablet: Vertical timeline */}
            <div className="lg:hidden" data-testid="timeline-mobile">
              <div className="relative">
                {/* Vertical connecting line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20" />
                
                <div className="space-y-6">
                  {howItWorks.map((item, index) => (
                    <div key={index} className="relative flex items-start gap-4" data-testid={`step-mobile-${item.step}`}>
                      {/* Step circle */}
                      <div className="relative z-10 h-12 w-12 flex-shrink-0 rounded-full bg-background border-2 border-primary/30 flex items-center justify-center shadow-md">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-primary">Step {item.step}</span>
                          <h3 className="text-sm font-semibold">{item.title}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-12 md:py-24">
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

        {/* Consulting Services Section */}
        <section className="py-12 md:py-24" data-testid="section-consulting">
          <div className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-12">
              <div className="inline-block mb-4">
                <Badge variant="outline" className="px-3 py-1 text-sm border-primary/40 bg-primary/5">
                  Consulting Services
                </Badge>
              </div>
              <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-2 md:mb-4">
                Strategic Team Consulting
              </h2>
              <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                Go beyond individual assessments with our expert-led team diagnostic services
              </p>
            </div>

            <Card className="p-6 md:p-8 lg:p-10 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-semibold">The Ecosystem Index</h3>
                      <Badge variant="outline" className="text-xs">New Service</Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    A comprehensive team capability diagnostic that maps how skills are distributed across your team, 
                    identifies gaps and concentration risks, and provides actionable recommendations for hiring and development.
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <div>
                        <span className="font-medium">Pre-Consultation Session</span>
                        <p className="text-sm text-muted-foreground">Define goals, scope, and team context with our consultants</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <div>
                        <span className="font-medium">Team FIT Assessment</span>
                        <p className="text-sm text-muted-foreground">All team members complete the FIT behavioral assessment</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <div>
                        <span className="font-medium">AI-Powered Team Analysis</span>
                        <p className="text-sm text-muted-foreground">Comprehensive capability mapping and risk identification</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <div>
                        <span className="font-medium">Post-Consultation Debrief</span>
                        <p className="text-sm text-muted-foreground">Review findings and develop an actionable implementation plan</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link href="/ecosystem-index">
                      <Button size="lg" data-testid="button-ecosystem-index">
                        Learn More About The Ecosystem Index
                        <ChevronDown className="ml-2 h-4 w-4 rotate-[-90deg]" />
                      </Button>
                    </Link>
                    <a href="https://calendly.com/hello-humanmetrix/30min" target="_blank" rel="noopener noreferrer">
                      <Button size="lg" variant="outline" data-testid="button-book-consultation">
                        Book a Consultation
                        <ChevronDown className="ml-2 h-4 w-4 rotate-[-90deg]" />
                      </Button>
                    </a>
                  </div>
                </div>
                
                <div className="hidden md:flex flex-col items-center justify-center p-8 bg-muted/30 rounded-xl">
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { label: "HA", color: "bg-blue-500" },
                      { label: "IC", color: "bg-purple-500" },
                      { label: "RA", color: "bg-green-500" },
                      { label: "EE", color: "bg-rose-500" },
                      { label: "GM", color: "bg-amber-500" },
                      { label: "IA", color: "bg-cyan-500" },
                    ].map((cap, idx) => (
                      <div key={idx} className={`h-12 w-12 rounded-lg ${cap.color} flex items-center justify-center text-white text-xs font-bold shadow-md`}>
                        {cap.label}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Map your team's 6 core capabilities
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 md:py-24 bg-muted/30" data-testid="section-faq">
          <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-2 md:mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to know about getting started with HumanMetrix
              </p>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-3" data-testid="faq-accordion">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`} 
                  className="bg-background rounded-lg border px-4 md:px-6"
                  data-testid={`faq-item-${index}`}
                >
                  <AccordionTrigger className="text-left text-sm md:text-base font-medium py-4 hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
                    <div className="text-2xl font-bold text-primary mb-2">14-20 min</div>
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
