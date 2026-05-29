import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO, BreadcrumbSchema, FAQSchema } from "@/lib/seo";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Gauge,
  Infinity as InfinityIcon,
  Wallet,
  Headphones,
  ShieldCheck,
} from "lucide-react";

const faqs = [
  {
    question: "Does HumanMetrix offer enterprise pricing?",
    answer:
      "Yes. Alongside per-assessment pricing, we offer flat-rate enterprise subscriptions designed for organisations assessing candidates at volume, so costs stay predictable as you scale.",
  },
  {
    question: "Can HumanMetrix handle high candidate volumes?",
    answer:
      "HumanMetrix runs on elastic cloud infrastructure designed to scale to large candidate volumes, with API and webhook integration so high-volume assessment can be automated end to end.",
  },
  {
    question: "What support do enterprise customers receive?",
    answer:
      "Enterprise customers receive dedicated onboarding and a direct line to our team. We can discuss service-level expectations and data-residency requirements as part of the agreement.",
  },
];

export default function Enterprise() {
  const CALENDLY_URL = "https://calendly.com/hello-humanmetrix/30min";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Enterprise & High-Volume Assessment - HumanMetrix"
        description="Enterprise assessment from HumanMetrix: flat-rate subscriptions, high-volume candidate handling, elastic-scale infrastructure, API automation and dedicated onboarding for large employers and BPOs."
        canonical="/enterprise"
        keywords="enterprise assessment, high volume hiring, flat rate subscription, bulk candidate testing, scalable assessment, BPO recruitment, enterprise pricing, SLA"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Enterprise", url: "/enterprise" },
        ]}
      />
      <FAQSchema faqs={faqs} />
      <Navigation />

      <main className="flex-grow py-8 md:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/">
            <Button variant="ghost" className="mb-4 md:mb-6" data-testid="button-back-home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <div className="mb-8 md:mb-12">
            <Badge variant="outline" className="mb-3 md:mb-4">
              <Building2 className="mr-1.5 h-3 w-3 md:h-4 md:w-4 inline" />
              Enterprise
            </Badge>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4" data-testid="text-page-title">
              Assessment at Enterprise Scale
            </h1>
            <p className="text-base md:text-xl text-muted-foreground">
              For organisations hiring at volume, HumanMetrix offers predictable enterprise pricing, infrastructure
              that scales with demand and the automation to assess thousands of candidates without adding manual
              overhead.
            </p>
          </div>

          <div className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <Card className="p-5 md:p-8">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4">
                  <Wallet className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h2 className="text-lg md:text-xl font-semibold mb-2">Flat-rate subscriptions</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Move from per-assessment pricing to a flat-rate enterprise subscription, so budgeting stays
                  predictable however many candidates you assess.
                </p>
              </Card>

              <Card className="p-5 md:p-8">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4">
                  <Gauge className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h2 className="text-lg md:text-xl font-semibold mb-2">High-volume handling</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Assess large candidate pools — ideal for high-growth employers and BPOs running continuous,
                  large-scale hiring campaigns.
                </p>
              </Card>

              <Card className="p-5 md:p-8">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4">
                  <InfinityIcon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h2 className="text-lg md:text-xl font-semibold mb-2">Elastic infrastructure</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Built on elastic cloud infrastructure that scales with demand, with API rate limiting, caching and
                  performance optimisations that keep the experience fast under load.
                </p>
              </Card>

              <Card className="p-5 md:p-8">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4">
                  <Headphones className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h2 className="text-lg md:text-xl font-semibold mb-2">Dedicated onboarding</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Get hands-on onboarding and a direct line to our team, with service-level expectations agreed up
                  front as part of your enterprise agreement.
                </p>
              </Card>
            </div>

            <Card className="p-5 md:p-8">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold mb-2">Enterprise-grade by design</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Volume should never come at the cost of rigour or security. Enterprise customers get the same
                    consistent, golden-set-anchored scoring, regionally normalised benchmarking and data-protection
                    posture described in our{" "}
                    <Link href="/security">
                      <span className="text-primary underline-offset-2 hover:underline" data-testid="link-trust-center">
                        Trust Center
                      </span>
                    </Link>
                    , with role-fit analysis tailored to the positions you hire for most.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-8 bg-primary/5 border-primary/20">
              <h2 className="text-lg md:text-2xl font-semibold mb-2">Let's talk volume</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                Tell us about your hiring volumes and timelines, and we'll put together an enterprise plan that
                fits.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full sm:w-auto" data-testid="button-book-enterprise">
                    Book a Consultation
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <a href="mailto:hello@humanmetrix.co.uk?subject=Enterprise%20Enquiry">
                  <Button variant="outline" className="w-full sm:w-auto" data-testid="button-contact-enterprise">
                    Email Our Team
                  </Button>
                </a>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
