import { Link, useLocation } from "wouter";
import { Mail } from "lucide-react";
import { SiLinkedin, SiFacebook, SiInstagram } from "react-icons/si";
import logoSymbol from "@assets/Gemini_Generated_Image_misel3misel3mise-removebg-preview_1762775600899.png";

type FooterLink = {
  label: string;
  href: string;
  isAnchor?: boolean;
};

export default function Footer() {
  const [location, setLocation] = useLocation();
  
  const footerLinks: { company: FooterLink[]; assessments: FooterLink[]; resources: FooterLink[] } = {
    company: [
      { label: "About Us", href: "/about" },
      { label: "How It Works", href: "/#how-it-works", isAnchor: true },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
    assessments: [
      { label: "FIT Assessment", href: "/assessments#fit" },
      { label: "AI Readiness", href: "/assessments#ai-readiness" },
      { label: "Prompt Architecture", href: "/assessments#prompt" },
      { label: "Algorithmic Integrity", href: "/assessments#aiq" },
    ],
    resources: [
      { label: "For Employers", href: "/for-employers" },
      { label: "Pricing", href: "/assessments#pricing" },
    ],
  };

  const handleAnchorClick = (href: string) => {
    const [path, hash] = href.split('#');
    if (location === path || (path === '/' && location === '/')) {
      const element = document.getElementById(hash);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      setLocation(path);
      setTimeout(() => {
        const element = document.getElementById(hash);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  return (
    <footer className="border-t border-cyan-400/20 bg-[#0a1628]">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8 md:py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1 space-y-2 md:space-y-4">
            <div className="flex items-center gap-1">
              <div className="h-8 w-8 md:h-10 md:w-10 flex items-center justify-center -mr-1 mt-1 md:mt-2">
                <img 
                  src={logoSymbol} 
                  alt="HumanMetrix Logo" 
                  className="h-full w-full object-cover scale-[1.8]"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-lg md:text-2xl text-white">Human</span>
                <span className="font-bold text-lg md:text-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">Metrix</span>
              </div>
            </div>
            <p className="text-[11px] md:text-sm text-blue-100/60">
              Professional AI assessments for the modern workforce
            </p>
            <a
              href="https://www.linkedin.com/company/humanmetrix/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-sm text-blue-100/60 hover:text-cyan-300 transition-colors"
              data-testid="link-linkedin"
            >
              <SiLinkedin className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span>Follow us on LinkedIn</span>
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61585522262716"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-sm text-blue-100/60 hover:text-cyan-300 transition-colors"
              data-testid="link-facebook"
            >
              <SiFacebook className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span>Follow us on Facebook</span>
            </a>
            <a
              href="https://www.instagram.com/human_metrix/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-sm text-blue-100/60 hover:text-cyan-300 transition-colors"
              data-testid="link-instagram"
            >
              <SiInstagram className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span>Follow us on Instagram</span>
            </a>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold mb-2 md:mb-4 text-xs md:text-base text-white">Company</h3>
            <ul className="space-y-1.5 md:space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  {link.isAnchor ? (
                    <button
                      onClick={() => handleAnchorClick(link.href)}
                      className="text-[11px] md:text-sm text-blue-100/60 hover:text-cyan-300 transition-colors cursor-pointer text-left"
                      data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link href={link.href}>
                      <span className="text-[11px] md:text-sm text-blue-100/60 hover:text-cyan-300 transition-colors cursor-pointer" data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                        {link.label}
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Assessment Links */}
          <div>
            <h3 className="font-semibold mb-2 md:mb-4 text-xs md:text-base text-white">Assessments</h3>
            <ul className="space-y-1.5 md:space-y-3">
              {footerLinks.assessments.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-[11px] md:text-sm text-blue-100/60 hover:text-cyan-300 transition-colors cursor-pointer" data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="font-semibold mb-2 md:mb-4 text-xs md:text-base text-white">Resources</h3>
            <ul className="space-y-1.5 md:space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-[11px] md:text-sm text-blue-100/60 hover:text-cyan-300 transition-colors cursor-pointer" data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 md:mt-6 space-y-1.5 md:space-y-3">
              <h4 className="font-medium text-[11px] md:text-sm text-white">Contact</h4>
              <a
                href="mailto:hello@humanmetrix.co.uk"
                className="flex items-start gap-1 md:gap-2 text-[11px] md:text-sm text-blue-100/60 hover:text-cyan-300 transition-colors"
                data-testid="link-email"
              >
                <Mail className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0 mt-0.5" />
                <span className="break-words">hello@humanmetrix.co.uk</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 md:mt-12 pt-4 md:pt-8 border-t border-cyan-400/20 text-center">
          <p className="text-[11px] md:text-sm text-blue-100/60">
            © {new Date().getFullYear()} HumanMetrix. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
