import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { SEO } from "@/lib/seo";

import oskarPhoto from "@assets/image_1767042160343.png";
import daenaPhoto from "@assets/image_1767042182791.png";
import quinPhoto from "@assets/image_1767042222400.png";
import reynalynPhoto from "@assets/image_1767042236125.png";
import marianaPhoto from "@assets/ChatGPT_Image_Feb_4,_2026,_04_05_01_AM_1770177910667.png";
import dashboardBg from "@assets/image_1763608498774.png";

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

function TeamMemberCard({ member }: { member: TeamMember }) {
  const [open, setOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const slug = member.name.toLowerCase().replace(/\s+/g, "-");

  return (
    <>
      <div className="flex flex-col items-center text-center">
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl p-0 overflow-hidden gap-0"
          data-testid={`dialog-bio-${slug}`}
        >
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
              <div>
                <h2 className="text-xl font-semibold text-foreground leading-tight">
                  {member.name}
                </h2>
                <p className="text-sm text-primary font-medium mt-1">{member.role}</p>
              </div>
            </div>
          </div>

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

export default function Team() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <SEO
        title="Our Team - Meet the HumanMetrix Leadership"
        description="Meet the team behind HumanMetrix - experts in AI, HR, technology, and business development building the future of talent assessment."
        canonical="/team"
        keywords="HumanMetrix team, leadership team, AI assessment experts, HR technology founders, startup team"
      />

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

      <div className="relative z-10">
        <Navigation />
      </div>

      <main className="relative z-10 flex-1 container mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-10 md:mb-16 space-y-2 md:space-y-4">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold" data-testid="text-team-heading">
            Meet Our Team
          </h1>
          <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
            The people behind HumanMetrix — bringing together expertise in HR, technology, business development, and psychometrics.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-6 max-w-6xl mx-auto">
          {teamMembers.map((member) => (
            <TeamMemberCard key={member.name} member={member} />
          ))}
        </div>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
