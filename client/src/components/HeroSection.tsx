import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import networkBg from "@assets/image_1761537286469.png";

export default function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center overflow-hidden">
      {/* Network visualization background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${networkBg})` }}
      />
      
      {/* Navy overlay with gradient for blending */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628]/95 via-[#1a2744]/90 to-[#0a1628]/95" />
      
      <div className="relative mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-12 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block">
                <span className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 backdrop-blur-sm">
                  AI-Powered Assessment Platform
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white">
                Measure What Matters in the{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  AI Era
                </span>
              </h1>
              <p className="text-lg md:text-xl text-blue-100/80 leading-relaxed max-w-3xl mx-auto">
                Professional AI assessments designed for recruitment and career development. 
                Evaluate FIT, AI Readiness, Prompt Architecture, and Algorithmic Integrity with enterprise-grade precision.
              </p>
              <p className="text-base md:text-lg text-blue-100/70 leading-relaxed max-w-3xl mx-auto">
                Get comprehensive insights through three report formats: Individual Assessment Reports for personal development, Candidate Comparison Reports to evaluate multiple candidates side-by-side, and Role Fit Analysis Reports to match candidates with specific positions.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/assessments" data-testid="link-hero-get-started">
                <Button 
                  size="lg" 
                  className="group bg-cyan-500 hover:bg-cyan-600 text-white border-0" 
                  data-testid="button-hero-get-started"
                >
                  Types of Assessments
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="#sample-reports" data-testid="link-hero-sample-reports">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200 backdrop-blur-sm" 
                  data-testid="button-hero-sample-reports"
                >
                  Sample Reports
                </Button>
              </Link>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 pt-4 max-w-4xl mx-auto">
              {[
                {
                  title: "Instant PDF Results",
                  subtitle: "Download your comprehensive reports immediately after completion"
                },
                {
                  title: "CV-Ready Reports",
                  subtitle: "Professional PDFs ready to attach to job applications"
                },
                {
                  title: "Secure Data Storage",
                  subtitle: "Your assessment data is safely encrypted and stored"
                }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-2 text-center">
                  <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-blue-100">{item.title}</div>
                    <div className="text-xs text-blue-100/60">{item.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
