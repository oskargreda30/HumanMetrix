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
  Handshake,
  Palette,
  Code2,
  Coins,
  Layers,
  Boxes,
} from "lucide-react";

const faqs = [
  {
    question: "Can I white-label HumanMetrix assessments?",
    answer:
      "Yes. HumanMetrix supports white-label and embedded delivery so agencies and platforms can offer assessments under their own brand, integrated into their existing hiring flow.",
  },
  {
    question: "How do partners earn from HumanMetrix?",
    answer:
      "Our channel-partner programme supports revenue-share and reseller arrangements with tiered partner billing, so agencies and consultancies can build assessment into their own commercial offer.",
  },
  {
    question: "How do partners integrate assessments?",
    answer:
      "Partners can embed assessments with our JavaScript widget and SDK, automate flows through the REST API with scoped API-key authentication, and receive webhook notifications when candidates complete assessments.",
  },
];

export default function Partnerships() {
  const CALENDLY_URL = "https://calendly.com/hello-humanmetrix/30min";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Partnerships & White-Label - Channel Partner Programme"
        description="Partner with HumanMetrix: white-label assessments, revenue-share and reseller arrangements, tiered partner billing and full API access for recruitment agencies, consultancies and HR-tech platforms."
        canonical="/partnerships"
        keywords="partnerships, white-label assessments, channel partner, revenue share, reseller, recruitment agency, HR tech integration, partner API"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Partnerships", url: "/partnerships" },
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
              <Handshake className="mr-1.5 h-3 w-3 md:h-4 md:w-4 inline" />
              Partnerships
            </Badge>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4" data-testid="text-page-title">
              Partner With HumanMetrix
            </h1>
            <p className="text-base md:text-xl text-muted-foreground">
              Build AI-powered assessment into your own offering. Whether you're a recruitment agency, a
              consultancy or an HR-tech platform, our partner programme lets you deliver HumanMetrix assessments
              under your brand, on your terms.
            </p>
          </div>

          <div className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <Card className="p-5 md:p-8">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4">
                  <Palette className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h2 className="text-lg md:text-xl font-semibold mb-2">White-label delivery</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Offer assessments under your own brand. Embed them into your existing candidate experience so the
                  flow feels native to your product or service.
                </p>
              </Card>

              <Card className="p-5 md:p-8">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4">
                  <Coins className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h2 className="text-lg md:text-xl font-semibold mb-2">Revenue share &amp; reselling</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Our channel programme supports revenue-share and reseller arrangements with tiered partner
                  billing, so you can build assessment into your own commercial model.
                </p>
              </Card>

              <Card className="p-5 md:p-8">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4">
                  <Code2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h2 className="text-lg md:text-xl font-semibold mb-2">API &amp; widget integration</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Embed with our JavaScript widget and SDK, automate through the REST API with scoped API keys, and
                  receive webhook notifications when candidates finish.
                </p>
              </Card>

              <Card className="p-5 md:p-8">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4">
                  <Layers className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h2 className="text-lg md:text-xl font-semibold mb-2">A partner dashboard built for hiring</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Manage candidates, run multi-candidate comparisons and AI role-fit analysis, track your hiring
                  pipeline and oversee billing — all from one place.
                </p>
              </Card>
            </div>

            <Card className="p-5 md:p-8">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Boxes className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold mb-2">Fits your tech stack</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    HumanMetrix is designed to slot into the tools agencies already use. Our REST API and webhooks
                    let you bridge sourcing and assessment data into your wider hiring workflow, so candidate
                    results flow to where your team already works rather than living in a silo.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-8 bg-primary/5 border-primary/20">
              <h2 className="text-lg md:text-2xl font-semibold mb-2">Become a partner</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                Tell us about your business and how you'd like to work with HumanMetrix. We'll help you find the
                right partnership model.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="mailto:hello@humanmetrix.co.uk?subject=Partnership%20Enquiry">
                  <Button className="w-full sm:w-auto" data-testid="button-contact-partnerships">
                    Talk to Our Team
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <Link href="/developers">
                  <Button variant="outline" className="w-full sm:w-auto" data-testid="button-developer-docs">
                    Explore Developer Docs
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
