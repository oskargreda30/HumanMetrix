import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Streamlined Hiring",
    description: "Send assessment links directly to candidates and receive comprehensive results.",
  },
  {
    icon: TrendingUp,
    title: "Data-Driven Decisions",
    description: "Make informed hiring choices based on objective, AI-powered assessments.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level encryption and compliance with data protection regulations.",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Real-time scoring and detailed analytics available immediately after completion.",
  },
];

export default function ForEmployersSection() {
  return (
    <section className="py-12 md:py-24 bg-[#0f1f38]">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Content */}
          <div className="space-y-6 md:space-y-8">
            <div className="space-y-3 md:space-y-4 text-center">
              <div className="inline-block">
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] md:text-sm font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-400/30">
                  For Employers
                </span>
              </div>
              <h2 className="text-lg md:text-4xl font-semibold text-white px-2">
                Find the Right Talent for the AI Age
              </h2>
              <p className="text-xs md:text-lg text-blue-100/70 leading-relaxed max-w-2xl mx-auto px-2">
                HumanMetrix helps you identify candidates with the skills that matter in an AI-driven workplace. 
                From behavioral traits to AI literacy, our assessments provide the insights you need to build exceptional teams.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
              {features.map((feature, index) => (
                <div key={index} className="space-y-2 p-4 md:p-6 rounded-lg bg-[#1a2744]/50 border border-cyan-400/10">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-4 w-4 md:h-5 md:w-5 text-cyan-400" />
                    </div>
                    <h3 className="text-sm md:text-base font-semibold text-white" data-testid={`text-employer-feature-${index + 1}`}>
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-xs md:text-sm text-blue-100/60">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-4 text-center">
              <Link href="/for-employers">
                <Button 
                  size="sm"
                  className="bg-cyan-500 hover:bg-cyan-600 text-white border-0 text-xs md:text-sm"
                  data-testid="button-employer-learn-more"
                >
                  Learn More About Enterprise Solutions
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
