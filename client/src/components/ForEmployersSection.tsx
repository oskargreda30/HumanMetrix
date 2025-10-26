import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Shield, Zap } from "lucide-react";
import employerImage from "@assets/generated_images/Professional_HR_assessment_workspace_ad6dec47.png";

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
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative">
            <img
              src={employerImage}
              alt="Professional assessment workspace"
              className="rounded-2xl shadow-xl w-full"
            />
          </div>

          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block">
                <span className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                  For Employers
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold">
                Find the Right Talent for the AI Age
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                HumanMetrix helps you identify candidates with the skills that matter in an AI-driven workplace. 
                From behavioral traits to AI literacy, our assessments provide the insights you need to build exceptional teams.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold" data-testid={`text-employer-feature-${index + 1}`}>
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground pl-13">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Link href="/for-employers">
                <a data-testid="link-employer-learn-more">
                  <Button size="lg" data-testid="button-employer-learn-more">
                    Learn More About Enterprise Solutions
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
