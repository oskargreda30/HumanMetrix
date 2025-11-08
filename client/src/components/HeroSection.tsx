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
      
      <div className="relative mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-10 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Content */}
          <div className="space-y-8 md:space-y-10">
            <div className="space-y-4 md:space-y-5">
              <div className="inline-block">
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs md:text-sm font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 backdrop-blur-sm">
                  AI-Powered Assessment Platform
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
                Your Next Role Demands More Than a Resume.
              </h1>
              <p className="text-sm md:text-lg lg:text-xl text-blue-100/80 leading-relaxed max-w-3xl mx-auto px-2 mt-4">
                Stand out from the crowd. Our one-time use assessment tool will provide you a CV-attachable report on your FIT, AI Readiness, Prompt Architecture, and Algorithmic Integrity. Attach it to your job application and increase your chances at landing your next role!
              </p>
              <div className="text-left max-w-2xl mx-auto space-y-2 mt-6">
                <p className="text-sm md:text-base text-blue-100/70 font-medium mb-3">
                  Why use HumanMetrix:
                </p>
                <ul className="space-y-2 md:space-y-2.5 text-xs md:text-sm text-blue-100/70">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span><strong className="text-blue-100">Stop Competing Against Fake CV Claims.</strong> As AI writes more resumes, our verified report provides the trust and accountability hiring managers want to see.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span><strong className="text-blue-100">AI is the New Digital Literacy.</strong> Whether you're in marketing, finance, or operations, AI Readiness is non-negotiable.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span><strong className="text-blue-100">Up to 75% of qualified applicants are rejected by Applicant Tracking Systems (ATS).</strong> Our report will provide a comprehensive report to increase your chances of your CV being reviewed by a human.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center px-2 pt-2">
              <Link href="/assessments" data-testid="link-hero-get-started">
                <Button 
                  className="group bg-cyan-500 hover:bg-cyan-600 text-white border-0 w-full sm:w-auto" 
                  data-testid="button-hero-get-started"
                >
                  Types of Assessments
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Button 
                onClick={() => {
                  const element = document.getElementById('sample-reports');
                  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                variant="outline" 
                className="border-cyan-400/50 bg-cyan-500/5 text-white hover:bg-cyan-500/20 hover:border-cyan-400/70 backdrop-blur-sm w-full sm:w-auto" 
                data-testid="button-hero-sample-reports"
              >
                Sample Reports
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 max-w-4xl mx-auto">
              {[
                {
                  title: "Instant PDF Results",
                  subtitle: "Download reports immediately"
                },
                {
                  title: "CV-Ready Reports",
                  subtitle: "Professional PDFs for job applications"
                },
                {
                  title: "Secure Data Storage",
                  subtitle: "Safely encrypted and stored"
                }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 text-center px-2">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-cyan-400 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <div className="text-xs md:text-sm font-medium text-blue-100">{item.title}</div>
                    <div className="text-xs text-blue-100/60 leading-tight">{item.subtitle}</div>
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
