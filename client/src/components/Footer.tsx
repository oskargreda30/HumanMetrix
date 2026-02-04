import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Mail, MessageSquare, Loader2, Send, X } from "lucide-react";
import { SiLinkedin, SiFacebook, SiInstagram } from "react-icons/si";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isValidEmail, isValidName } from "@/lib/validation";
import logoSymbol from "@assets/Gemini_Generated_Image_misel3misel3mise-removebg-preview_1762775600899.png";

type FooterLink = {
  label: string;
  href: string;
  isAnchor?: boolean;
};

export default function Footer() {
  const [location, setLocation] = useLocation();
  const [showContactForm, setShowContactForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const { toast } = useToast();
  
  const footerLinks: { company: FooterLink[]; resources: FooterLink[] } = {
    company: [
      { label: "About Us", href: "/about" },
      { label: "Our Team", href: "/team" },
      { label: "How It Works", href: "/#how-it-works", isAnchor: true },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "EULA", href: "/eula" },
    ],
    resources: [
      { label: "For Candidates", href: "/for-candidates" },
      { label: "Pricing", href: "/pricing" },
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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }
    
    if (!isValidName(formData.name)) {
      toast({
        title: "Invalid name",
        description: "Please enter a valid name",
        variant: "destructive"
      });
      return;
    }
    
    if (!isValidEmail(formData.email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/general-enquiry", formData);
      toast({
        title: "Message sent",
        description: "Thank you for contacting us. We'll get back to you soon."
      });
      setShowContactForm(false);
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error: any) {
      toast({
        title: "Failed to send",
        description: error.message || "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <footer className="relative z-20 border-t border-cyan-400/20 bg-[#0a1628]">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8 md:py-12 lg:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-1 space-y-3 md:space-y-4">
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
              <p className="text-xs md:text-sm text-blue-100/60">
                Professional AI assessments for the modern workforce
              </p>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="font-semibold mb-3 md:mb-4 text-sm md:text-base text-white">Company</h3>
              <ul className="space-y-2 md:space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.href}>
                    {link.isAnchor ? (
                      <button
                        onClick={() => handleAnchorClick(link.href)}
                        className="text-xs md:text-sm text-blue-100/60 hover:text-cyan-300 transition-colors cursor-pointer text-left"
                        data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {link.label}
                      </button>
                    ) : (
                      <Link href={link.href}>
                        <span className="text-xs md:text-sm text-blue-100/60 hover:text-cyan-300 transition-colors cursor-pointer" data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                          {link.label}
                        </span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Careers Section with Follow + Contact on mobile */}
            <div className="col-span-2 md:col-span-1">
              <h3 className="font-semibold mb-3 md:mb-4 text-sm md:text-base text-white">Careers</h3>
              <p className="text-xs md:text-sm text-blue-100/60 leading-relaxed mb-3">
                We're always on the lookout for talented, driven individuals. If you share our passion for innovation, send us your CV — we believe in creating roles for the right people.
              </p>
              <a
                href="mailto:hello@humanmetrix.co.uk?subject=Career Opportunity"
                className="inline-flex items-center gap-2 text-xs md:text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                data-testid="link-careers-email"
              >
                <Mail className="h-4 w-4 md:h-4 md:w-4 flex-shrink-0" />
                <span>Send your CV</span>
              </a>
              
              {/* Follow section - shown under careers on mobile */}
              <div className="mt-5 md:hidden">
                <h4 className="font-semibold mb-3 text-sm text-white">Follow Us</h4>
                <div className="space-y-2">
                  <a
                    href="https://www.linkedin.com/company/humanmetrix/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-100/60 hover:text-cyan-300 transition-colors"
                    data-testid="link-linkedin-mobile"
                  >
                    <SiLinkedin className="h-4 w-4 flex-shrink-0" />
                    <span>Follow us on LinkedIn</span>
                  </a>
                  <a
                    href="https://www.facebook.com/profile.php?id=61585522262716"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-100/60 hover:text-cyan-300 transition-colors"
                    data-testid="link-facebook-mobile"
                  >
                    <SiFacebook className="h-4 w-4 flex-shrink-0" />
                    <span>Follow us on Facebook</span>
                  </a>
                </div>
              </div>
              
              {/* Contact section - shown under follow on mobile */}
              <div className="mt-5 md:hidden">
                <h4 className="font-semibold mb-3 text-sm text-white">Contact</h4>
                <div className="space-y-2">
                  <a
                    href="mailto:hello@humanmetrix.co.uk"
                    className="flex items-center gap-2 text-xs text-blue-100/60 hover:text-cyan-300 transition-colors"
                    data-testid="link-email-mobile"
                  >
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span>hello@humanmetrix.co.uk</span>
                  </a>
                  <button
                    onClick={() => setShowContactForm(true)}
                    className="flex items-center gap-2 text-xs text-blue-100/60 hover:text-cyan-300 transition-colors cursor-pointer"
                    data-testid="button-contact-form-mobile"
                  >
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    <span>Contact Form</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Resources Links - desktop view includes follow and contact */}
            <div className="hidden md:block">
              <h3 className="font-semibold mb-4 text-base text-white">Resources</h3>
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
              
              {/* Follow section - desktop */}
              <div className="mt-6 space-y-3">
                <h4 className="font-medium text-sm text-white">Follow Us</h4>
                <a
                  href="https://www.linkedin.com/company/humanmetrix/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-100/60 hover:text-cyan-300 transition-colors"
                  data-testid="link-linkedin"
                >
                  <SiLinkedin className="h-4 w-4 flex-shrink-0" />
                  <span>Follow us on LinkedIn</span>
                </a>
                <a
                  href="https://www.facebook.com/profile.php?id=61585522262716"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-100/60 hover:text-cyan-300 transition-colors"
                  data-testid="link-facebook"
                >
                  <SiFacebook className="h-4 w-4 flex-shrink-0" />
                  <span>Follow us on Facebook</span>
                </a>
              </div>
              
              <div className="mt-6 space-y-3">
                <h4 className="font-medium text-sm text-white">Contact</h4>
                <a
                  href="mailto:hello@humanmetrix.co.uk"
                  className="flex items-start gap-2 text-sm text-blue-100/60 hover:text-cyan-300 transition-colors"
                  data-testid="link-email"
                >
                  <Mail className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span className="break-words">hello@humanmetrix.co.uk</span>
                </a>
                <button
                  onClick={() => setShowContactForm(true)}
                  className="flex items-start gap-2 text-sm text-blue-100/60 hover:text-cyan-300 transition-colors cursor-pointer"
                  data-testid="button-contact-form"
                >
                  <MessageSquare className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Contact Form</span>
                </button>
              </div>
            </div>
            
            {/* Resources Links - mobile only (just the links without contact/follow) */}
            <div className="md:hidden">
              <h3 className="font-semibold mb-3 text-sm text-white">Resources</h3>
              <ul className="space-y-2">
                {footerLinks.resources.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>
                      <span className="text-xs text-blue-100/60 hover:text-cyan-300 transition-colors cursor-pointer" data-testid={`link-footer-mobile-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                        {link.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 md:mt-12 pt-4 md:pt-8 border-t border-cyan-400/20 text-center">
            <p className="text-[11px] md:text-sm text-blue-100/60">
              © {new Date().getFullYear()} HumanMetrix. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Contact Form Dialog */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Contact Us
            </DialogTitle>
            <DialogDescription>
              Send us a message and we'll get back to you as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-contact-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                data-testid="input-contact-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-subject">Subject</Label>
              <Input
                id="contact-subject"
                placeholder="What's this about?"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                data-testid="input-contact-subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                placeholder="Your message..."
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                data-testid="input-contact-message"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowContactForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                data-testid="button-send-contact"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
