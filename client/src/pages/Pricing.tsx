import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import B2BPricingCalculator from "@/components/B2BPricingCalculator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Building2, User } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import ContactFormDialog from "@/components/ContactFormDialog";
import { SEO } from "@/lib/seo";
import { useCurrency } from "@/contexts/CurrencyContext";
import { BASE_FEE, ASSESSMENT_PRICES } from "@shared/schema";

export default function Pricing() {
  const [contactOpen, setContactOpen] = useState(false);
  const { formatLocalPrice } = useCurrency();
  
  const platformFee = formatLocalPrice(BASE_FEE);
  const minAssessmentPrice = formatLocalPrice(Math.min(...Object.values(ASSESSMENT_PRICES)));

  const b2cFeatures = [
    "Complete 4 assessments",
    "Instant results and insights",
    "PDF report for your CV",
    "Share results with employers",
    "One-time payment, lifetime access",
  ];

  const b2bFeatures = [
    "Volume-based pricing",
    "Dedicated account manager",
    "ATS integration support",
    "Team analytics dashboard",
    "Priority support",
    "Custom branding options",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a1628]">
      <SEO 
        title="Pricing - HumanMetrix Assessments"
        description="Transparent pricing for HumanMetrix AI assessments. Individual candidates pay per assessment. Enterprise volume pricing available for hiring teams."
        canonical="/pricing"
        keywords="assessment pricing, psychometric test cost, AI assessment pricing, enterprise hiring assessment"
      />
      <Navigation />
      
      <main className="flex-grow py-12 md:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">
              Simple, Transparent Pricing
            </h1>
            <p className="text-base md:text-xl text-blue-100/70 max-w-2xl mx-auto">
              Whether you're a candidate building your profile or an enterprise hiring at scale, we have a plan for you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-16 items-stretch">
            <Card className="bg-white/5 border-cyan-400/20 backdrop-blur-sm flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-5 w-5 text-cyan-400" />
                  <Badge variant="secondary" className="text-xs">For Candidates</Badge>
                </div>
                <CardTitle className="text-2xl text-white">Individual</CardTitle>
                <p className="text-blue-100/60 text-sm">Perfect for job seekers and career development</p>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">{platformFee}</span>
                    <span className="text-blue-100/60">platform fee</span>
                  </div>
                  <p className="text-sm text-blue-100/50 mt-1">
                    + assessments from {minAssessmentPrice} each
                  </p>
                </div>

                <div className="space-y-3 flex-1">
                  {b2cFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-blue-100/80">
                      <CheckCircle className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Link href="/assessments?view=candidate" className="mt-6">
                  <Button 
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                    data-testid="button-get-started-candidate"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-cyan-400/30 backdrop-blur-sm ring-2 ring-cyan-400/20 flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-5 w-5 text-cyan-400" />
                  <Badge className="bg-cyan-500 text-white text-xs">For Employers</Badge>
                </div>
                <CardTitle className="text-2xl text-white">Enterprise</CardTitle>
                <p className="text-blue-100/60 text-sm">Volume pricing for hiring teams</p>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">Custom</span>
                    <span className="text-blue-100/60">pricing</span>
                  </div>
                  <p className="text-sm text-blue-100/50 mt-1">
                    Based on volume and requirements
                  </p>
                </div>

                <div className="space-y-3 flex-1">
                  {b2bFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-blue-100/80">
                      <CheckCircle className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={() => setContactOpen(true)}
                  className="w-full bg-white text-[#0a1628] hover:bg-blue-100 mt-6"
                  data-testid="button-request-demo"
                >
                  Request Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mb-16">
            <h2 className="text-xl md:text-3xl font-bold mb-6 md:mb-8 text-white text-center">
              Estimate Your Enterprise Costs
            </h2>
            <B2BPricingCalculator />
          </div>

          <div className="text-center">
            <p className="text-blue-100/60 text-sm mb-4">
              Need a custom solution? We offer tailored packages for large enterprises.
            </p>
            <Button 
              variant="outline"
              onClick={() => setContactOpen(true)}
              className="border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/10"
              data-testid="button-contact-sales"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
      
      <ContactFormDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        intent="sales"
      />
    </div>
  );
}
