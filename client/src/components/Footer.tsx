import { Link } from "wouter";
import { Mail } from "lucide-react";

export default function Footer() {
  const footerLinks = {
    company: [
      { label: "About Us", href: "/about" },
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Terms & Conditions", href: "/terms" },
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

  return (
    <footer className="border-t border-cyan-400/20 bg-[#0a1628]">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-md bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg font-mono">HM</span>
              </div>
              <span className="font-semibold text-xl text-white">HumanMetrix</span>
            </div>
            <p className="text-sm text-blue-100/60">
              Professional AI assessments for the modern workforce
            </p>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-sm text-blue-100/60 hover:text-cyan-300 transition-colors cursor-pointer" data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Assessment Links */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Assessments</h3>
            <ul className="space-y-3">
              {footerLinks.assessments.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-sm text-blue-100/60 hover:text-cyan-300 transition-colors cursor-pointer" data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-sm text-blue-100/60 hover:text-cyan-300 transition-colors cursor-pointer" data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-3">
              <h4 className="font-medium text-sm text-white">Contact</h4>
              <a
                href="mailto:humanmetrix.sales@gmail.com"
                className="flex items-center gap-2 text-sm text-blue-100/60 hover:text-cyan-300 transition-colors"
                data-testid="link-email"
              >
                <Mail className="h-4 w-4" />
                <span>humanmetrix.sales@gmail.com</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-cyan-400/20 text-center">
          <p className="text-sm text-blue-100/60">
            © {new Date().getFullYear()} HumanMetrix. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
