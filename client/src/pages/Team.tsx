import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
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
}

const teamMembers: TeamMember[] = [
  {
    name: "Oskar Greda",
    role: "Founder & CEO",
    photo: oskarPhoto,
    photoPosition: "center",
    bio: "Oskar Greda launched his career in people operations and organisational leadership, building expertise across human resources, recruitment, and operational management. After spending two years in the education sector, he transitioned into the AI and blockchain consultancy, where he progressed through senior HR and leadership roles, including Head of HR and later serving two years as Director & Chief Operations Officer. Oskar's specialises in developing company-wide HR strategies, scaling teams, and driving sustainable organisational growth. He currently serves as Founder and CEO of HumanMetrix, where he focuses on building data-driven, scalable people and performance solutions. Oskar studied Human Resource Management at Leeds Business School, combining strong commercial insight with a people-first approach to leadership and growth."
  },
  {
    name: "Quin van Kerken",
    role: "Co-Founder & Head of Business Development",
    photo: quinPhoto,
    photoPosition: "center",
    bio: "Quin van Kerken's path to the cutting edge of AI and psychometrics began in the high-stakes, precision-driven world of medicine manufacturing; a far cry from the tech world, but the perfect training ground for complex scaling. As a Co-Founder of HumanMetrix, Quin brings a seasoned perspective to the leadership team, drawing on a career spent navigating heavily regulated industries and successfully scaling diverse businesses, including large-scale retail franchises. While the rest of the team focuses on the algorithms, Quin focuses on the architecture of growth. Often self-described as the \"old guy\" on the team, he leverages decades of professional maturity to open doors and navigate corporate boardrooms that younger founders often find inaccessible. His role is to ensure that as HumanMetrix pushes the boundaries of innovation, it does so with the operational rigor and strategic wisdom of a battle-tested entrepreneur."
  },
  {
    name: "Daena McClintock",
    role: "Co-Founder & Head of Technology",
    photo: daenaPhoto,
    photoPosition: "center",
    bio: "Daena McClintock began his career on Wall Street, gaining two years of experience in trading, equity research, and wealth management before transitioning into the tech industry. He has since spent three years as a software engineer at startups across the United States and Europe, where he specializes in developing high-performance web and mobile applications. His technical expertise spans across Blockchain and AI & Machine Learning, allowing him to build sophisticated, data-driven solutions for the modern web. Daena holds degrees in Finance, Economics, and Information Technology from the University of Massachusetts Amherst honors college, where he graduated with Cum Laude honors."
  },
  {
    name: "Reynalyn Rodriguez",
    role: "Content & Socials Manager",
    photo: reynalynPhoto,
    photoPosition: "center",
    bio: "Reynalyn Rodriguez built her career in social media marketing, bringing over two years of experience supporting brands in establishing a strong and consistent digital presence. She specializes in content creation, social media management, and audience engagement for business and professional service brands, with a focus on clear and strategic brand communication. Her work centers on translating brand messaging into engaging content that builds credibility and trust. Reynalyn holds a degree in Mass Communication from the University of Muntinlupa and pursued undergraduate studies in Marketing Management at the Polytechnic University of the Philippines (PUP)."
  },
  {
    name: "Dr Mariana Costa e Silva-Pickett",
    role: "Psychometrics Advisor",
    photo: marianaPhoto,
    photoPosition: "45% 25%",
    photoScale: 3.0,
    bio: "Dr Mariana Costa e Silva-Pickett is a behavioural science researcher specialising in psychometrics. Her academic journey spans applied psychology training and research at the Federal University of Mato Grosso (Brazil) and doctoral/postdoctoral work at City, St George's, University of London (United Kingdom), where she developed and evaluated behavioural and self-efficacy measures and contributed to digital mental health research. She brings deep expertise in test construction, construct validation, reliability and measurement quality, and translating complex outputs into clear recommendations. She is passionate about creating assessments that are scientifically robust, fair, and genuinely useful in practice."
  }
];

function TeamMemberCard({ member }: { member: TeamMember }) {
  const [showBio, setShowBio] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="flex flex-col items-center text-center">
      {/* Circular photo with loading skeleton */}
      <div className="w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden mb-4 border-4 border-primary/20 relative bg-muted">
        {/* Loading skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-pulse rounded-full" />
        )}
        {/* Background image approach for reliable positioning and scaling */}
        <div 
          className={`w-full h-full transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ 
            backgroundImage: `url(${member.photo})`,
            backgroundSize: member.photoScale ? `${member.photoScale * 100}%` : 'cover',
            backgroundPosition: member.photoPosition || 'center center',
            backgroundRepeat: 'no-repeat'
          }}
          role="img"
          aria-label={member.name}
          data-testid={`img-team-${member.name.toLowerCase().replace(/\s+/g, '-')}`}
        />
        {/* Hidden img for loading detection */}
        <img
          src={member.photo}
          alt=""
          className="hidden"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />
      </div>
      
      {/* Name and role - fixed height container for alignment */}
      <div className="h-[4.5rem] md:h-[5rem] flex flex-col justify-start overflow-hidden">
        <h3 className="text-xs md:text-sm font-semibold text-foreground leading-tight line-clamp-2" data-testid={`text-name-${member.name.toLowerCase().replace(/\s+/g, '-')}`}>
          {member.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2" data-testid={`text-role-${member.name.toLowerCase().replace(/\s+/g, '-')}`}>
          {member.role}
        </p>
      </div>
      
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
    <div className="min-h-screen flex flex-col relative">
      <SEO 
        title="Our Team - Meet the HumanMetrix Leadership"
        description="Meet the team behind HumanMetrix - experts in AI, HR, technology, and business development building the future of talent assessment."
        canonical="/team"
        keywords="HumanMetrix team, leadership team, AI assessment experts, HR technology founders, startup team UK"
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

      {/* Navigation */}
      <div className="relative z-10">
        <Navigation />
      </div>

      {/* Main content */}
      <main className="relative z-10 flex-1 container mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-team-heading">
            Meet Our Team
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The people behind HumanMetrix, bringing together expertise in HR, technology, business development, and communications.
          </p>
        </div>

        {/* Team grid - 5 columns on larger screens */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-4 max-w-6xl mx-auto">
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
