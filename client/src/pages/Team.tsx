import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

import oskarPhoto from "@assets/team_top_left_1767040454957.png";
import daenaPhoto from "@assets/team_top_right_1767040454956.png";
import reynalynPhoto from "@assets/team_bottom_left_1767040454956.png";
import quinPhoto from "@assets/team_bottom_right_1767040454955.png";

interface TeamMember {
  name: string;
  role: string;
  photo: string;
  bio: string;
  photoPosition: string;
}

const teamMembers: TeamMember[] = [
  {
    name: "Oskar Greda",
    role: "Founder & CEO",
    photo: oskarPhoto,
    photoPosition: "72% 28%",
    bio: "Oskar Greda launched his career in people operations and organisational leadership, building expertise across human resources, recruitment, and operational management. After spending two years in the education sector, he transitioned into the AI and blockchain consultancy, where he progressed through senior HR and leadership roles, including Head of HR and later serving two years as Director & Chief Operations Officer. Oskar's specialises in developing company-wide HR strategies, scaling teams, and driving sustainable organisational growth. He currently serves as Founder and CEO of HumanMetrix, where he focuses on building data-driven, scalable people and performance solutions. Oskar studied Human Resource Management at Leeds Business School, combining strong commercial insight with a people-first approach to leadership and growth."
  },
  {
    name: "Quin van Kerken",
    role: "Co-Founder & Head of Business Development",
    photo: quinPhoto,
    photoPosition: "28% 22%",
    bio: "Quin van Kerken's path to the cutting edge of AI and psychometrics began in the high-stakes, precision-driven world of medicine manufacturing; a far cry from the tech world, but the perfect training ground for complex scaling. As a Co-Founder of HumanMetrix, Quin brings a seasoned perspective to the leadership team, drawing on a career spent navigating heavily regulated industries and successfully scaling diverse businesses, including large-scale retail franchises. While the rest of the team focuses on the algorithms, Quin focuses on the architecture of growth. Often self-described as the \"old guy\" on the team, he leverages decades of professional maturity to open doors and navigate corporate boardrooms that younger founders often find inaccessible. His role is to ensure that as HumanMetrix pushes the boundaries of innovation, it does so with the operational rigor and strategic wisdom of a battle-tested entrepreneur."
  },
  {
    name: "Daena McClintock",
    role: "Co-Founder & Head of Technology",
    photo: daenaPhoto,
    photoPosition: "55% 32%",
    bio: "Daena McClintock began his career on Wall Street, gaining two years of experience in trading, equity research, and wealth management before transitioning into the tech industry. He has since spent three years as a software engineer at startups across the United States and Europe, where he specializes in developing high-performance web and mobile applications. His technical expertise spans across Blockchain and AI & Machine Learning, allowing him to build sophisticated, data-driven solutions for the modern web. Daena holds degrees in Finance, Economics, and Information Technology from the University of Massachusetts Amherst honors college, where he graduated with Cum Laude honors."
  },
  {
    name: "Reynalyn Rodriguez",
    role: "Content & Socials Manager",
    photo: reynalynPhoto,
    photoPosition: "62% 28%",
    bio: "Reynalyn Rodriguez built her career in social media marketing, bringing over two years of experience supporting brands in establishing a strong and consistent digital presence. She specializes in content creation, social media management, and audience engagement for business and professional service brands, with a focus on clear and strategic brand communication. Her work centers on translating brand messaging into engaging content that builds credibility and trust. Reynalyn holds a degree in Mass Communication from the University of Muntinlupa and pursued undergraduate studies in Marketing Management at the Polytechnic University of the Philippines (PUP)."
  }
];

function TeamMemberCard({ member }: { member: TeamMember }) {
  const [showBio, setShowBio] = useState(false);

  return (
    <div className="flex flex-col items-center text-center">
      {/* Circular photo */}
      <div className="w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden mb-4 border-4 border-primary/20">
        <img
          src={member.photo}
          alt={member.name}
          className="w-full h-full object-cover"
          style={{ objectPosition: member.photoPosition }}
          data-testid={`img-team-${member.name.toLowerCase().replace(/\s+/g, '-')}`}
        />
      </div>
      
      {/* Name and role */}
      <h3 className="text-lg font-semibold text-foreground" data-testid={`text-name-${member.name.toLowerCase().replace(/\s+/g, '-')}`}>
        {member.name}
      </h3>
      <p className="text-sm text-muted-foreground mb-2" data-testid={`text-role-${member.name.toLowerCase().replace(/\s+/g, '-')}`}>
        {member.role}
      </p>
      
      {/* Bio link with hover tooltip */}
      <div className="relative">
        <button
          className="text-sm text-primary hover:underline cursor-pointer"
          onMouseEnter={() => setShowBio(true)}
          onMouseLeave={() => setShowBio(false)}
          onFocus={() => setShowBio(true)}
          onBlur={() => setShowBio(false)}
          data-testid={`link-bio-${member.name.toLowerCase().replace(/\s+/g, '-')}`}
        >
          Bio
        </button>
        
        {/* Bio tooltip */}
        <div
          className={`absolute z-50 w-80 md:w-96 p-4 bg-card border rounded-lg shadow-lg text-left transition-all duration-200 ${
            showBio ? 'opacity-100 visible' : 'opacity-0 invisible'
          }`}
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px'
          }}
        >
          <p className="text-sm text-muted-foreground leading-relaxed">
            {member.bio}
          </p>
          {/* Arrow pointing down */}
          <div
            className="absolute w-3 h-3 bg-card border-r border-b rotate-45"
            style={{
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function Team() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Our Team | HumanMetrix</title>
        <meta name="description" content="Meet the team behind HumanMetrix - experts in AI, HR, technology, and business development building the future of talent assessment." />
      </Helmet>

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-team-heading">
            Meet Our Team
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The people behind HumanMetrix, bringing together expertise in HR, technology, business development, and communications.
          </p>
        </div>

        {/* Team grid - 4 columns on larger screens */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6 max-w-5xl mx-auto">
          {teamMembers.map((member) => (
            <TeamMemberCard key={member.name} member={member} />
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
