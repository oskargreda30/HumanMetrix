import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-8 py-16 md:px-16 md:py-24 text-center">
          {/* Decorative elements */}
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(white,transparent_85%)]" />
          
          <div className="relative space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground">
                Ready to Showcase Your AI Skills?
              </h2>
              <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto">
                Join thousands of professionals who have validated their skills with HumanMetrix assessments
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/assessments">
                <a data-testid="link-cta-get-started">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="group bg-background text-foreground hover:bg-background/90"
                    data-testid="button-cta-get-started"
                  >
                    Get Started Now
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </a>
              </Link>
              <Link href="/for-employers">
                <a data-testid="link-cta-employers">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
                    data-testid="button-cta-employers"
                  >
                    Learn About Enterprise
                  </Button>
                </a>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
