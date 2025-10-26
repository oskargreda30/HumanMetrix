import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import heroImage from "@assets/generated_images/AI_neural_network_hero_visual_802374e8.png";

export default function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      
      <div className="relative mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-12 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block">
                <span className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                  AI-Powered Assessment Platform
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                Measure What Matters in the{" "}
                <span className="text-primary">AI Era</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
                Professional AI assessments designed for recruitment and career development. 
                Evaluate FIT, AI Readiness, Prompt Architecture, and Algorithmic Integrity with enterprise-grade precision.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/assessments">
                <a data-testid="link-hero-get-started">
                  <Button size="lg" className="group" data-testid="button-hero-get-started">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </a>
              </Link>
              <Link href="/about">
                <a data-testid="link-hero-learn-more">
                  <Button size="lg" variant="outline" data-testid="button-hero-learn-more">
                    Learn More
                  </Button>
                </a>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 pt-4">
              {[
                "Trusted by 1,000+ professionals",
                "Enterprise-grade security",
                "CV-ready results"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Image */}
          <div className="relative lg:h-[600px] h-[400px]">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent z-10 rounded-2xl" />
            <img
              src={heroImage}
              alt="AI Assessment Visualization"
              className="w-full h-full object-cover rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
