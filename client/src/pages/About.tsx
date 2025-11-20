import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Target, Users, Award, TrendingUp } from "lucide-react";
import dashboardBg from "@assets/image_1763608498774.png";

const values = [
  {
    icon: Target,
    title: "Precision & Accuracy",
    description: "Our AI-powered assessments are designed with rigorous scientific methodology to ensure reliable, valid results that employers and professionals can trust.",
  },
  {
    icon: Users,
    title: "Human-Centric AI",
    description: "We believe AI should augment human potential, not replace it. Our assessments measure the skills needed to thrive alongside AI technology.",
  },
  {
    icon: Award,
    title: "Professional Standards",
    description: "Every assessment meets enterprise-grade quality standards with results suitable for professional contexts, from recruitment to career development.",
  },
  {
    icon: TrendingUp,
    title: "Continuous Innovation",
    description: "As AI evolves, so do we. Our platform continuously updates to reflect the latest developments in AI capabilities and workplace requirements.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background image with light grey overlay */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url(${dashboardBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(241, 245, 249, 0.92), rgba(248, 250, 252, 0.88), rgba(241, 245, 249, 0.92))'
        }} />
      </div>
      <Navigation />
      <main className="flex-grow relative z-10">
        {/* Hero Section */}
        <section className="py-12 md:py-24">
          <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8 text-center">
            <h1 className="text-lg md:text-4xl lg:text-5xl font-bold tracking-tight mb-3 md:mb-6 px-2">
              About HumanMetrix
            </h1>
            <p className="text-xs md:text-base lg:text-xl text-muted-foreground leading-relaxed px-2">
              We're building the future of professional assessment for an AI-driven world. 
              HumanMetrix helps organizations and individuals measure what truly matters: 
              the ability to work effectively with AI while maintaining essential human skills.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="pt-4 md:pt-6 pb-8 md:pb-12">
          <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8">
            <div className="space-y-6 md:space-y-12">
              <div>
                <h2 className="text-sm md:text-2xl lg:text-3xl font-semibold mb-2 md:mb-4">Our Mission</h2>
                <p className="text-xs md:text-base lg:text-lg text-muted-foreground leading-relaxed">
                  In an era where AI is transforming every industry, traditional assessments no longer capture 
                  the full picture of a candidate's potential. HumanMetrix was created to bridge this gap by 
                  evaluating both timeless behavioral competencies and emerging AI literacy skills.
                </p>
              </div>

              <div>
                <h2 className="text-sm md:text-2xl lg:text-3xl font-semibold mb-2 md:mb-4">Why HumanMetrix?</h2>
                <p className="text-xs md:text-base lg:text-lg text-muted-foreground leading-relaxed mb-3 md:mb-6">
                  The workplace is evolving rapidly. Success in 2025 and beyond requires more than technical 
                  knowledge—it demands adaptability, ethical judgment, and the ability to leverage AI tools 
                  effectively. Our comprehensive assessment suite measures:
                </p>
                <ul className="space-y-2 md:space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2 md:gap-3">
                    <span className="h-4 w-4 md:h-6 md:w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-[10px] md:text-sm">✓</span>
                    </span>
                    <span className="text-xs md:text-sm"><strong>Behavioral Competencies:</strong> Core skills like agency, curiosity, resilience, empathy, growth mindset, and interpersonal agility</span>
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <span className="h-4 w-4 md:h-6 md:w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-[10px] md:text-sm">✓</span>
                    </span>
                    <span className="text-xs md:text-sm"><strong>AI Readiness:</strong> Ability to work with AI systems, from basic prompting to complex reasoning tasks</span>
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <span className="h-4 w-4 md:h-6 md:w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-[10px] md:text-sm">✓</span>
                    </span>
                    <span className="text-xs md:text-sm"><strong>Technical AI Skills:</strong> Prompt architecture, iterative refinement, and debugging AI outputs</span>
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <span className="h-4 w-4 md:h-6 md:w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-[10px] md:text-sm">✓</span>
                    </span>
                    <span className="text-xs md:text-sm"><strong>Ethical AI Understanding:</strong> Knowledge of bias, fairness, transparency, and responsible deployment</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-12 md:py-24 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-16 space-y-2 md:space-y-4">
              <h2 className="text-sm md:text-2xl lg:text-3xl font-semibold">Our Values</h2>
              <p className="text-xs md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
                The principles that guide everything we do
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-8">
              {values.map((value, index) => (
                <div key={index} className="space-y-2 md:space-y-4 p-4 md:p-6">
                  <div className="flex items-center gap-2 md:gap-4">
                    <div className="h-8 w-8 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <value.icon className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                    </div>
                    <h3 className="text-sm md:text-lg lg:text-xl font-semibold">{value.title}</h3>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-12 md:py-24">
          <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8 text-center space-y-3 md:space-y-6">
            <h2 className="text-sm md:text-2xl lg:text-3xl font-semibold px-2">Built by Assessment Experts</h2>
            <p className="text-xs md:text-base lg:text-lg text-muted-foreground leading-relaxed px-2">
              Our team combines expertise in organizational psychology, AI research, and enterprise software 
              to create assessments that are scientifically rigorous, technologically advanced, and practically useful. 
              Every question, scoring rubric, and evaluation methodology is designed by specialists who understand 
              both human behavior and artificial intelligence.
            </p>
          </div>
        </section>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
