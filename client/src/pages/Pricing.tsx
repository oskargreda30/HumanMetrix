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
  const [viewMode, setViewMode] = useState<'employer' | 'candidate'>('employer');
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
      
      <main className="flex-grow py-8 md:py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* View Mode Toggle */}
          <div className="flex justify-center mb-6 md:mb-8">
            <div className="inline-flex rounded-lg bg-[#1a2744]/70 p-1 border border-cyan-400/20" data-testid="pricing-view-mode-toggle">
              <button
                onClick={() => setViewMode('employer')}
                className={`flex items-center gap-2 px-4 py-2 md:px-6 md:py-2.5 rounded-md text-sm md:text-base font-medium transition-all ${
                  viewMode === 'employer'
                    ? 'bg-cyan-500 text-white shadow-lg'
                    : 'text-blue-100/70 hover:text-white'
                }`}
                data-testid="pricing-toggle-employer"
              >
                <Building2 className="h-4 w-4" />
                I'm an Employer
              </button>
              <button
                onClick={() => setViewMode('candidate')}
                className={`flex items-center gap-2 px-4 py-2 md:px-6 md:py-2.5 rounded-md text-sm md:text-base font-medium transition-all ${
                  viewMode === 'candidate'
                    ? 'bg-cyan-500 text-white shadow-lg'
                    : 'text-blue-100/70 hover:text-white'
                }`}
                data-testid="pricing-toggle-candidate"
              >
                <User className="h-4 w-4" />
                I'm a Candidate
              </button>
            </div>
          </div>

          <div className="text-center mb-6 md:mb-10">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 text-white">
              {viewMode === 'employer' ? 'Enterprise Pricing' : 'Individual Pricing'}
            </h1>
            <p className="text-base md:text-xl text-blue-100/70 max-w-2xl mx-auto">
              {viewMode === 'employer' 
                ? 'Volume-based pricing for hiring teams. Calculate your costs instantly.'
                : 'Simple, transparent pricing for job seekers building their professional profile.'
              }
            </p>
          </div>

          {viewMode === 'employer' ? (
            <>
              {/* B2B Employer View - Calculator First (Above the Fold) */}
              <div className="mb-10">
                <B2BPricingCalculator />
              </div>

              {/* Enterprise Features Card */}
              <div className="max-w-xl mx-auto mb-10">
                <Card className="bg-white/5 border-cyan-400/30 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-5 w-5 text-cyan-400" />
                      <Badge className="bg-cyan-500 text-white text-xs">Enterprise</Badge>
                    </div>
                    <CardTitle className="text-xl text-white">What's Included</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {b2bFeatures.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-blue-100/80">
                          <CheckCircle className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <Button 
                        onClick={() => setContactOpen(true)}
                        className="w-full bg-white text-[#0a1628] hover:bg-blue-100"
                        data-testid="button-request-demo"
                      >
                        Request Demo
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
            </>
          ) : (
            <>
              {/* B2C Candidate View */}
              <div className="max-w-md mx-auto mb-10">
                <Card className="bg-white/5 border-cyan-400/20 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-5 w-5 text-cyan-400" />
                      <Badge variant="secondary" className="text-xs">For Job Seekers</Badge>
                    </div>
                    <CardTitle className="text-2xl text-white">Individual Assessment</CardTitle>
                    <p className="text-blue-100/60 text-sm">Perfect for job seekers and career development</p>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">{platformFee}</span>
                        <span className="text-blue-100/60">platform fee</span>
                      </div>
                      <p className="text-sm text-blue-100/50 mt-1">
                        + assessments from {minAssessmentPrice} each
                      </p>
                    </div>

                    <div className="space-y-3 mb-6">
                      {b2cFeatures.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-blue-100/80">
                          <CheckCircle className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Link href="/assessments?view=candidate">
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
              </div>

              <div className="text-center">
                <p className="text-blue-100/60 text-sm mb-4">
                  Are you an employer looking to assess multiple candidates?
                </p>
                <Button 
                  variant="outline"
                  onClick={() => setViewMode('employer')}
                  className="border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/10"
                  data-testid="button-switch-to-employer"
                >
                  View Enterprise Pricing
                </Button>
              </div>
            </>
          )}
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
