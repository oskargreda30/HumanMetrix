import { useState } from "react";
import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Target, Users, Award, TrendingUp, ArrowRight, Rocket, Brain, Sparkles, Shield, X } from "lucide-react";
import dashboardBg from "@assets/image_1763608498774.png";
import { SEO } from "@/lib/seo";

import oskarPhoto from "@assets/image_1767042160343.png";
import daenaPhoto from "@assets/image_1767042182791.png";
import quinPhoto from "@assets/image_1767042222400.png";
import reynalynPhoto from "@assets/image_1767042236125.png";
import marianaPhoto from "@assets/ChatGPT_Image_Feb_4,_2026,_04_05_01_AM_1770177910667.png";

interface TeamMember {
  name: string;
  role: string;
  photo: string;
  bio: string;
  photoPosition: string;
  photoScale?: number;
  photoRotation?: number;
}

const teamMembers: TeamMember[] = [
  {
    name: "Oskar Greda",
    role: "Founder & CEO",
    photo: oskarPhoto,
    photoPosition: "center",
    bio: "Oskar Greda launched his career in people operations and organisational leadership, building expertise across human resources, recruitment, and operational management. After spending two years in the education sector, he transitioned into the AI and blockchain consultancy, where he progressed through senior HR and leadership roles, including Head of HR and later serving two years as Director & Chief Operations Officer. Oskar's specialises in developing company-wide HR strategies, scaling teams, and driving sustainable organisational growth. He currently serves as Founder and CEO of HumanMetrix, where he focuses on building data-driven, scalable people and performance solutions. Oskar studied Human Resource Management at Leeds Business School, combining strong commercial insight with a people-first approach to leadership and growth.",
  },
  {
    name: "Quin van Kerken",
    role: "Co-Founder & Head of Business Development",
    photo: quinPhoto,
    photoPosition: "center",
    bio: "Quin van Kerken's path to the cutting edge of AI and psychometrics began in the high-stakes, precision-driven world of medicine manufacturing; a far cry from the tech world, but the perfect training ground for complex scaling. As a Co-Founder of HumanMetrix, Quin brings a seasoned perspective to the leadership team, drawing on a career spent navigating heavily regulated industries and successfully scaling diverse businesses, including large-scale retail franchises. While the rest of the team focuses on the algorithms, Quin focuses on the architecture of growth. Often self-described as the \"old guy\" on the team, he leverages decades of professional maturity to open doors and navigate corporate boardrooms that younger founders often find inaccessible. His role is to ensure that as HumanMetrix pushes the boundaries of innovation, it does so with the operational rigor and strategic wisdom of a battle-tested entrepreneur.",
  },
  {
    name: "Daena McClintock",
    role: "Co-Founder & Head of Technology",
    photo: daenaPhoto,
    photoPosition: "center",
    bio: "Daena McClintock began his career on Wall Street, gaining two years of experience in trading, equity research, and wealth management before transitioning into the tech industry. He has since spent three years as a software engineer at startups across the United States and Europe, where he specializes in developing high-performance web and mobile applications. His technical expertise spans across Blockchain and AI & Machine Learning, allowing him to build sophisticated, data-driven solutions for the modern web. Daena holds degrees in Finance, Economics, and Information Technology from the University of Massachusetts Amherst honors college, where he graduated with Cum Laude honors.",
  },
  {
    name: "Reynalyn Rodriguez",
    role: "Content & Socials Manager",
    photo: reynalynPhoto,
    photoPosition: "center",
    bio: "Reynalyn Rodriguez built her career in social media marketing, bringing over two years of experience supporting brands in establishing a strong and consistent digital presence. She specializes in content creation, social media management, and audience engagement for business and professional service brands, with a focus on clear and strategic brand communication. Her work centers on translating brand messaging into engaging content that builds credibility and trust. Reynalyn holds a degree in Mass Communication from the University of Muntinlupa and pursued undergraduate studies in Marketing Management at the Polytechnic University of the Philippines (PUP).",
  },
  {
    name: "Dr Mariana Costa e Silva-Pickett",
    role: "Psychometrics Advisor",
    photo: marianaPhoto,
    photoPosition: "50% 22%",
    photoScale: 2.8,
    photoRotation: -8,
    bio: "Dr Mariana Costa e Silva-Pickett is a behavioural science researcher specialising in psychometrics. Her academic journey spans applied psychology training and research at the Federal University of Mato Grosso (Brazil) and doctoral/postdoctoral work at City, St George's, University of London (United Kingdom), where she developed and evaluated behavioural and self-efficacy measures and contributed to digital mental health research. She brings deep expertise in test construction, construct validation, reliability and measurement quality, and translating complex outputs into clear recommendations. She is passionate about creating assessments that are scientifically robust, fair, and genuinely useful in practice.",
  },
];

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

function TeamMemberCard({ member }: { member: TeamMember }) {
  const [open, setOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const slug = member.name.toLowerCase().replace(/\s+/g, "-");

  return (
    <>
      <div className="flex flex-col items-center text-center">
        {/* Circular photo */}
        <button
          className="w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden mb-4 border-2 border-border relative bg-muted flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary hover-elevate"
          onClick={() => setOpen(true)}
          aria-label={`View ${member.name}'s bio`}
          data-testid={`button-bio-open-${slug}`}
        >
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-pulse rounded-full" />
          )}
          <div
            className={`w-full h-full transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            style={{
              backgroundImage: `url(${member.photo})`,
              backgroundSize: member.photoScale ? `${member.photoScale * 100}%` : "cover",
              backgroundPosition: member.photoPosition || "center center",
              backgroundRepeat: "no-repeat",
              transform: member.photoRotation ? `rotate(${member.photoRotation}deg)` : undefined,
            }}
            role="img"
            aria-label={member.name}
            data-testid={`img-team-${slug}`}
          />
          <img
            src={member.photo}
            alt=""
            className="hidden"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />
        </button>

        {/* Name and role */}
        <div className="mb-3">
          <h3
            className="text-sm font-semibold text-foreground leading-tight"
            data-testid={`text-name-${slug}`}
          >
            {member.name}
          </h3>
          <p
            className="text-xs text-muted-foreground mt-1 leading-snug"
            data-testid={`text-role-${slug}`}
          >
            {member.role}
          </p>
        </div>

        <button
          className="text-xs text-primary hover:underline font-medium"
          onClick={() => setOpen(true)}
          data-testid={`link-bio-${slug}`}
        >
          Read bio
        </button>
      </div>

      {/* Professional Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl p-0 overflow-hidden gap-0"
          data-testid={`dialog-bio-${slug}`}
        >
          {/* Header strip with gradient */}
          <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-8 pt-8 pb-6 border-b border-border/50">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
              data-testid={`button-bio-close-${slug}`}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-6">
              {/* Photo */}
              <div
                className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 flex-shrink-0 bg-muted"
                style={{
                  backgroundImage: `url(${member.photo})`,
                  backgroundSize: member.photoScale ? `${member.photoScale * 100}%` : "cover",
                  backgroundPosition: member.photoPosition || "center center",
                  backgroundRepeat: "no-repeat",
                  transform: member.photoRotation ? `rotate(${member.photoRotation}deg)` : undefined,
                }}
              />
              {/* Name + role */}
              <div>
                <h2 className="text-xl font-semibold text-foreground leading-tight">
                  {member.name}
                </h2>
                <p className="text-sm text-primary font-medium mt-1">{member.role}</p>
              </div>
            </div>
          </div>

          {/* Bio body */}
          <div className="px-8 py-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {member.bio}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function About() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <SEO
        title="About HumanMetrix - AI Psychometric Testing Company"
        description="HumanMetrix - leading AI psychometric testing platform measuring human metrics for recruitment & career development. Enterprise-grade assessments trusted by employers."
        canonical="/about"
        keywords="HumanMetrix, psychometric testing company, AI assessment platform, HR technology, recruitment technology, psychometric test provider"
      />

      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url(${dashboardBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(241, 245, 249, 0.92), rgba(248, 250, 252, 0.88), rgba(241, 245, 249, 0.92))",
          }}
        />
      </div>

      <Navigation />

      <main className="flex-grow relative z-10">
        {/* Hero */}
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

        {/* Mission — side by side cards */}
        <section className="pt-4 md:pt-6 pb-8 md:pb-16">
          <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
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
                    {[
                      { icon: Brain, label: "Behavioral Competencies", desc: "Agency, curiosity, resilience, empathy, and growth mindset" },
                      { icon: Sparkles, label: "AI Readiness", desc: "From basic prompting to complex reasoning tasks" },
                      { icon: Target, label: "Technical AI Skills", desc: "Prompt architecture and iterative refinement" },
                      { icon: Shield, label: "Ethical AI Understanding", desc: "Bias, fairness, and responsible deployment" },
                    ].map(({ icon: Icon, label, desc }) => (
                      <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs md:text-sm font-medium">{label}</span>
                          <p className="text-[10px] md:text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Values */}
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
          <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
            <div className="text-center mb-10 md:mb-16 space-y-2 md:space-y-4">
              <h2 className="text-sm md:text-2xl lg:text-3xl font-semibold">Meet Our Team</h2>
              <p className="text-xs md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
                The people behind HumanMetrix — bringing together expertise in HR, technology, business development, and psychometrics.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-6">
              {teamMembers.map((member) => (
                <TeamMemberCard key={member.name} member={member} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
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
