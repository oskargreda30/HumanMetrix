import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function PricingSection() {
  return (
    <section className="py-24 bg-[#0a1628]">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-white">
            Transparent Pricing
          </h2>
          <p className="text-lg text-blue-100/70 max-w-2xl mx-auto">
            Pay once, own your results forever. No subscriptions, no hidden fees.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="p-8 md:p-12 bg-[#1a2744]/50 border-cyan-400/20">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Pricing Breakdown */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-semibold mb-2 text-white">How Pricing Works</h3>
                  <p className="text-blue-100/60">
                    Simple, transparent pricing based on what you need
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold font-mono text-cyan-400">£15</span>
                    <span className="text-blue-100/60">base computation fee</span>
                  </div>
                  <div className="text-sm text-blue-100/60">
                    One-time fee covers platform access and result processing
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-cyan-400/20">
                  <div className="font-medium text-white">Plus per assessment:</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-100/60">FIT Assessment (15 questions)</span>
                      <span className="font-mono font-medium text-white">£3.50</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-100/60">AIQ Assessment (8 questions)</span>
                      <span className="font-mono font-medium text-white">£4.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-100/60">AI Readiness (21 questions)</span>
                      <span className="font-mono font-medium text-white">£4.50</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-100/60">Prompt Architecture (7 levels)</span>
                      <span className="font-mono font-medium text-white">£5.00</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-cyan-400/20">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-blue-100/60">Example: All 4 assessments =</span>
                    <span className="text-2xl font-bold font-mono text-cyan-400">£32</span>
                  </div>
                </div>
              </div>

              {/* What's Included */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-semibold mb-2 text-white">What's Included</h3>
                  <p className="text-blue-100/60">
                    Everything you need for professional results
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    "Instant access to all selected assessments",
                    "AI-powered evaluation and scoring",
                    "Detailed skill breakdown by category",
                    "Professional PDF report download",
                    "Percentile rankings and benchmarks",
                    "Results suitable for CV inclusion",
                    "Lifetime access to your results",
                    "Email delivery of completion certificate",
                  ].map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-blue-100/70" data-testid={`text-pricing-feature-${index + 1}`}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
