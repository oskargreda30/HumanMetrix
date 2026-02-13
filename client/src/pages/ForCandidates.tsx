import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { 
  FileText, 
  TrendingUp, 
  Award, 
  Briefcase, 
  CheckCircle,
  Target,
  Sparkles,
  Clock,
  ChevronDown,
  ArrowRight,
  Star,
  Users,
  BarChart3
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import dashboardBg from "@assets/image_1763608498774.png";
import { SEO, FAQSchema, SoftwareApplicationSchema } from "@/lib/seo";
import { useCurrency } from "@/contexts/CurrencyContext";

const benefits = [
  {
    icon: FileText,
    title: "CV-Ready Reports",
    description: "Professional PDF reports showcase your verified skills to employers. Stand out with objective, data-backed credentials.",
  },
  {
    icon: TrendingUp,
    title: "Benchmark Your Skills",
    description: "See how you compare against other candidates with percentile rankings across all four assessment dimensions.",
  },
  {
    icon: Award,
    title: "Verified Credentials",
    description: "Our AI-powered assessments provide objective proof of your capabilities that employers trust.",
  },
  {
    icon: Briefcase,
    title: "Career Insights",
    description: "Understand your strengths and areas for development to guide your professional growth.",
  },
  {
    icon: Target,
    title: "Role Alignment",
    description: "Discover which roles match your skill profile and where you'll thrive in AI-forward organizations.",
  },
  {
    icon: Sparkles,
    title: "AI Literacy Proof",
    description: "Demonstrate your readiness for the AI era with assessments covering prompt engineering and algorithmic ethics.",
  },
];

const assessments = [
  {
    name: "FIT Assessment",
    description: "Measure your behavioral competencies across key workplace dimensions",
    duration: "20 min",
  },
  {
    name: "AI Readiness",
    description: "Evaluate your preparedness for AI-integrated work environments",
    duration: "20 min",
  },
  {
    name: "Prompt Architecture",
    description: "Test your ability to effectively communicate with AI systems",
    duration: "21 min",
  },
  {
    name: "Algorithmic Integrity (AIQ)",
    description: "Assess your understanding of AI ethics and responsible AI use",
    duration: "20 min",
  },
];

const howItWorks = [
  {
    step: 1,
    icon: Users,
    title: "Create Account",
    description: "Sign up for free with your email address",
  },
  {
    step: 2,
    icon: Clock,
    title: "Take Assessments",
    description: "Complete four comprehensive tests at your own pace",
  },
  {
    step: 3,
    icon: BarChart3,
    title: "Get Your Results",
    description: "Unlock detailed reports with your scores and insights",
  },
  {
    step: 4,
    icon: FileText,
    title: "Share with Employers",
    description: "Download CV-ready PDFs to showcase your verified skills",
  },
];

const faqs = [
  {
    question: "How long do the assessments take to complete?",
    answer: "Each of our four assessments takes between 14-20 minutes to complete. You can complete them in any order and at your own pace, with results available immediately upon completion.",
  },
  {
    question: "Are the assessments free to take?",
    answer: "Yes, you can take all four assessments completely free of charge. You only pay a one-time fee to unlock your results and download your professional PDF reports.",
  },
  {
    question: "How much does it cost to unlock my results?",
    answer: "Individual assessments are priced from £4 each, with our complete bundle of all four tests available at a discounted rate. This is a one-time payment - no subscriptions.",
  },
  {
    question: "Can I retake the assessments?",
    answer: "Yes, you can retake assessments if you want to improve your scores. Each retake will generate new questions so you're always being assessed fairly.",
  },
  {
    question: "How do I add my results to my CV?",
    answer: "Once you unlock your results, you can download professional PDF reports designed to be included with job applications. Many candidates include their HumanMetrix scores directly on their CV.",
  },
  {
    question: "Do employers recognize HumanMetrix assessments?",
    answer: "Yes! Many UK employers use HumanMetrix to assess candidates. Having your results ready shows initiative and gives employers verified, objective data about your skills.",
  },
];

export default function ForCandidates() {
  const { formatLocalPrice } = useCurrency();
  const [openFaq, setOpenFaq] = useState<string | undefined>(undefined);

  return (
    <div className="min-h-screen flex flex-col relative">
      <SEO 
        title="For Candidates - AI-Powered Career Assessments"
        canonical="/for-candidates" 
        description="HumanMetrix for job seekers: AI-powered psychometric assessments to showcase your skills. Get FIT, AI Readiness, Prompt Architecture & AIQ results for your CV. Stand out to UK employers."
        keywords="career assessment, job seeker tests, CV skills, psychometric tests candidates, AI skills assessment, career development, professional assessment, job application tools"
      />
      <SoftwareApplicationSchema />
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
      
      {/* For Employers link - left aligned, compact */}
      <div className="relative z-20 flex justify-start px-4 md:px-6 lg:px-8 pt-1.5 md:pt-2">
        <Link href="/" data-testid="link-for-employers" className="inline-flex items-center gap-1 text-[10px] md:text-xs bg-primary/10 hover:bg-primary/20 px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-primary/20 text-muted-foreground hover:text-foreground transition-all">
          <span className="hidden sm:inline">Hiring for your organization?</span>
          <span className="font-semibold text-primary">For Employers →</span>
        </Link>
      </div>
      
      <main className="flex-grow relative z-10">
        {/* Hero Section */}
        <section className="py-12 md:py-24">
          <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8 text-center">
            <div className="inline-block mb-4 md:mb-6">
              <span className="inline-flex items-center rounded-full px-3 py-1 md:px-4 md:py-1.5 text-xs md:text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                For Job Seekers
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 md:mb-6">
              Your Next Role Demands More Than a Resume
            </h1>
            <p className="text-sm md:text-base lg:text-xl text-muted-foreground leading-relaxed mb-6 md:mb-8">
              Stand out from the crowd with verified, AI-powered assessments. Showcase your behavioral skills, 
              AI literacy, and ethical reasoning to employers who are hiring for the future.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
              <Link href="/assessments?view=candidate">
                <Button size="lg" data-testid="button-start-assessments">
                  Start Assessments
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/assessments?view=candidate">
                <Button size="lg" variant="outline" data-testid="button-view-pricing">
                  View Pricing
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs md:text-sm text-muted-foreground italic">
              Tests from {formatLocalPrice(400)} (plus one-time {formatLocalPrice(1500)} computation price)
            </p>
          </div>
        </section>

        {/* Four Assessments */}
        <section className="py-12 md:py-20 bg-muted/30" data-testid="section-assessments">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-2 md:mb-4">
                Four Assessments, One Complete Profile
              </h2>
              <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                Comprehensive evaluation across the skills that matter most in modern workplaces
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {assessments.map((assessment, index) => (
                <Card key={index} className="p-4 md:p-6 hover-elevate transition-all" data-testid={`assessment-card-${index}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{assessment.duration}</span>
                  </div>
                  <h3 className="text-sm md:text-base lg:text-lg font-semibold mb-2">{assessment.name}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {assessment.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-12 md:py-24">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-16">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-2 md:mb-4">
                Why Take HumanMetrix Assessments?
              </h2>
              <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                Give yourself the competitive edge in today's job market
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              {benefits.map((benefit, index) => (
                <Card key={index} className="p-4 md:p-6 hover-elevate transition-all">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <h3 className="text-sm md:text-base lg:text-lg font-semibold">{benefit.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 md:py-24 bg-muted/30" data-testid="section-how-it-works">
          <div className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-16">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-2 md:mb-4">
                How It Works
              </h2>
              <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                Get your verified results in four simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 md:gap-8">
              {howItWorks.map((step, index) => (
                <div key={index} className="text-center" data-testid={`step-${step.step}`}>
                  <div className="relative mx-auto mb-4">
                    <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-background border-2 border-primary/30 flex flex-col items-center justify-center shadow-lg mx-auto">
                      <step.icon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sample Reports CTA */}
        <section className="py-12 md:py-24">
          <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8 text-center">
            <Star className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-4">
              See What You'll Get
            </h2>
            <p className="text-sm md:text-base lg:text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              View sample assessment reports to see the detailed insights and professional 
              presentation you'll receive after completing your assessments.
            </p>
            <Link href="/#sample-reports">
              <Button size="lg" variant="outline" data-testid="button-view-sample-reports">
                View Sample Reports
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 md:py-24 bg-muted/30" data-testid="section-faqs">
          <div className="mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-2 md:mb-4">
                Frequently Asked Questions
              </h2>
            </div>

            <Accordion type="single" collapsible value={openFaq} onValueChange={setOpenFaq}>
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`} data-testid={`faq-${index}`}>
                  <AccordionTrigger className="text-left text-sm md:text-base">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-12 md:py-24">
          <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8 text-center">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-4">
              Ready to Stand Out?
            </h2>
            <p className="text-sm md:text-base lg:text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join thousands of candidates who have enhanced their job applications 
              with verified HumanMetrix assessment results.
            </p>
            <Link href="/assessments?view=candidate">
              <Button size="lg" data-testid="button-get-started-cta">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
