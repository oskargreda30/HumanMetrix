import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Users, Award, TrendingUp, ArrowRight, Rocket, Brain, Sparkles, Shield } from "lucide-react";
import dashboardBg from "@assets/image_1763608498774.png";
import { SEO } from "@/lib/seo";

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
      <SEO 
        title="About HumanMetrix - AI Psychometric Testing Company UK"
        description="HumanMetrix (Human Metrix) - UK's leading AI psychometric testing platform measuring human metrics for recruitment & career development. Enterprise-grade assessments trusted by employers."
        canonical="/about"
        keywords="HumanMetrix, Human Metrix, psychometric testing company, AI assessment platform, UK HR tech, recruitment technology, psychometric test provider"
      />
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

        {/* Mission Section - Side by Side Cards */}
        <section className="pt-4 md:pt-6 pb-8 md:pb-16">
          <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              {/* Our Mission Card */}
              <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-lg">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Rocket className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <h2 className="text-base md:text-2xl lg:text-3xl font-semibold">Our Mission</h2>
                  </div>
                  <p className="text-xs md:text-base lg:text-lg text-muted-foreground leading-relaxed">
                    In an era where AI is transforming every industry, traditional assessments no longer capture 
                    the full picture of a candidate's potential. HumanMetrix was created to bridge this gap by 
                    evaluating both timeless behavioral competencies and emerging AI literacy skills.
                  </p>
                </CardContent>
              </Card>

              {/* Why HumanMetrix Card */}
              <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-lg">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <h2 className="text-base md:text-2xl lg:text-3xl font-semibold">Why HumanMetrix?</h2>
                  </div>
                  <p className="text-xs md:text-base text-muted-foreground leading-relaxed mb-4">
                    Success in 2025 and beyond requires adaptability, ethical judgment, and the ability to leverage AI tools effectively.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Brain className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs md:text-sm font-medium">Behavioral Competencies</span>
                        <p className="text-[10px] md:text-xs text-muted-foreground">Agency, curiosity, resilience, empathy, and growth mindset</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs md:text-sm font-medium">AI Readiness</span>
                        <p className="text-[10px] md:text-xs text-muted-foreground">From basic prompting to complex reasoning tasks</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs md:text-sm font-medium">Technical AI Skills</span>
                        <p className="text-[10px] md:text-xs text-muted-foreground">Prompt architecture and iterative refinement</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs md:text-sm font-medium">Ethical AI Understanding</span>
                        <p className="text-[10px] md:text-xs text-muted-foreground">Bias, fairness, and responsible deployment</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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

        {/* CTA Section */}
        <section className="py-8 md:py-16">
          <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8 text-center">
            <Link href="/assessments">
              <Button 
                size="lg"
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
                data-testid="button-about-go-to-assessments"
              >
                Go to Assessments
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
