import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function PricingSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pay once, own your results forever. No subscriptions, no hidden fees.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Pricing Breakdown */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-semibold mb-2">How Pricing Works</h3>
                  <p className="text-muted-foreground">
                    Simple, transparent pricing based on what you need
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold font-mono text-primary">£15</span>
                    <span className="text-muted-foreground">base computation fee</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    One-time fee covers platform access and result processing
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="font-medium">Plus per assessment:</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">FIT Assessment (15 questions)</span>
                      <span className="font-mono font-medium">£3.50</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AIQ Assessment (8 questions)</span>
                      <span className="font-mono font-medium">£4.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AI Readiness (21 questions)</span>
                      <span className="font-mono font-medium">£4.50</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prompt Architecture (7 levels)</span>
                      <span className="font-mono font-medium">£5.00</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-muted-foreground">Example: All 4 assessments =</span>
                    <span className="text-2xl font-bold font-mono">£32</span>
                  </div>
                </div>
              </div>

              {/* What's Included */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-semibold mb-2">What's Included</h3>
                  <p className="text-muted-foreground">
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
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm" data-testid={`text-pricing-feature-${index + 1}`}>{feature}</span>
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
