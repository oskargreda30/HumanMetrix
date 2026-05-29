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
  ShieldCheck,
  Lock,
  Server,
  KeyRound,
  FileCheck,
  Globe,
  UserCheck,
} from "lucide-react";

const faqs = [
  {
    question: "Is HumanMetrix GDPR compliant?",
    answer:
      "HumanMetrix is built to support GDPR compliance. We collect only the data needed to deliver and score assessments, candidate results are gated behind explicit consent for sharing, and personal data is handled in line with data-protection principles.",
  },
  {
    question: "How is candidate data protected?",
    answer:
      "Data is encrypted in transit using TLS and stored on managed infrastructure that encrypts data at rest. Access is protected with session-based authentication and CSRF protection, and sensitive values are kept out of application logs.",
  },
  {
    question: "Does HumanMetrix support data residency requirements?",
    answer:
      "We operate on managed cloud infrastructure and can discuss data-residency and regional hosting needs with enterprise customers as part of onboarding.",
  },
];

export default function Security() {
  const CALENDLY_URL = "https://calendly.com/hello-humanmetrix/30min";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Trust Center - Security, Privacy & Compliance"
        description="HumanMetrix Trust Center: data protection aligned with GDPR and POPIA, encryption in transit and at rest, access controls, data residency and responsible AI. How we keep candidate and partner data secure."
        canonical="/security"
        keywords="security, data protection, GDPR, POPIA, encryption, data residency, privacy, compliance, trust center, responsible AI"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Trust Center", url: "/security" },
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
              <ShieldCheck className="mr-1.5 h-3 w-3 md:h-4 md:w-4 inline" />
              Trust Center
            </Badge>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4" data-testid="text-page-title">
              Security, Privacy &amp; Compliance
            </h1>
            <p className="text-base md:text-xl text-muted-foreground">
              Assessment data is sensitive. HumanMetrix is built to protect candidate and partner information at
              every stage — with encryption, strong access controls, data-protection-by-design and a responsible
              approach to AI.
            </p>
          </div>

          <div className="space-y-6 md:space-y-8">
            <Card className="p-5 md:p-8">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileCheck className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold mb-2">Data protection &amp; privacy</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    HumanMetrix is built to support GDPR compliance and is designed to align with POPIA for South
                    African operations. We practise data minimisation — collecting only what is needed to deliver
                    and score assessments — and candidate results are gated behind explicit consent before they can
                    be shared. Our Privacy Policy sets out exactly what we collect and why.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-8">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Lock className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold mb-2">Encryption</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    All traffic is encrypted in transit using TLS/HTTPS. Data is stored on managed cloud
                    infrastructure that encrypts data at rest. Sensitive fields are never exposed in client code, and
                    application logging is sanitised to keep credentials and personal data out of logs.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-8">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <KeyRound className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold mb-2">Access &amp; authentication</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Accounts are protected with session-based authentication and CSRF protection, with role-based
                    access separating candidate, partner and administrator capabilities. Partner API access is
                    authenticated with scoped API keys that can be managed and revoked from the partner dashboard.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-8">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Server className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold mb-2">Infrastructure &amp; data residency</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    HumanMetrix runs on managed, elastic cloud infrastructure with a managed PostgreSQL database and
                    object storage for report assets. For enterprise customers with specific data-residency or
                    regional-hosting requirements, we can discuss appropriate arrangements during onboarding.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-8">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold mb-2">Regionally normalised benchmarking</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Fair assessment means relevant comparison. Benchmarking, currency and Purchasing Power Parity
                    pricing adapt by country, so candidates are evaluated against appropriate peer cohorts rather
                    than a single global default — an important part of equitable, defensible hiring decisions.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-8">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold mb-2">Responsible AI</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    AI scoring is anchored to a benchmarked golden set for consistency, and our Algorithmic
                    Integrity Quotient keeps bias awareness, fairness and responsible deployment central to the
                    product. We treat the same standards we assess candidates against as standards for how we build.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-8 bg-primary/5 border-primary/20">
              <h2 className="text-lg md:text-2xl font-semibold mb-2">Security or compliance questions?</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                We're happy to walk procurement, security and legal teams through our data-protection posture and
                answer due-diligence questionnaires.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="mailto:hello@humanmetrix.co.uk?subject=Security%20%26%20Compliance%20Enquiry">
                  <Button className="w-full sm:w-auto" data-testid="button-contact-security">
                    Contact Us
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <Link href="/privacy">
                  <Button variant="outline" className="w-full sm:w-auto" data-testid="button-privacy-policy">
                    Read our Privacy Policy
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
