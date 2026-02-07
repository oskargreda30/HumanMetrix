import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Mail, MessageSquare, Loader2, Send, X, Bug, Upload, Image } from "lucide-react";
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
  const [showBugReport, setShowBugReport] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBugSubmitting, setIsBugSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [bugData, setBugData] = useState({
    title: "",
    description: "",
    reporterName: "",
    reporterEmail: "",
  });
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
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

  const addScreenshotFiles = (newFiles: File[]) => {
    const validFiles: File[] = [];
    for (const file of newFiles) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: `"${file.name}" is not an image file. Only PNG, JPG, GIF are accepted.`,
          variant: "destructive"
        });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `"${file.name}" exceeds the 10MB limit.`,
          variant: "destructive"
        });
        continue;
      }
      validFiles.push(file);
    }

    if (screenshotFiles.length + validFiles.length > 10) {
      toast({
        title: "Too many files",
        description: "You can upload a maximum of 10 screenshots.",
        variant: "destructive"
      });
      validFiles.splice(10 - screenshotFiles.length);
    }

    if (validFiles.length === 0) return;

    setScreenshotFiles(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setScreenshotPreviews(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeScreenshot = (index: number) => {
    setScreenshotFiles(prev => prev.filter((_, i) => i !== index));
    setScreenshotPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) addScreenshotFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) addScreenshotFiles(files);
  };

  const handleBugSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bugData.title || !bugData.description || !bugData.reporterName || !bugData.reporterEmail) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }
    
    if (!isValidName(bugData.reporterName)) {
      toast({
        title: "Invalid name",
        description: "Please enter a valid name",
        variant: "destructive"
      });
      return;
    }
    
    if (!isValidEmail(bugData.reporterEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    if (screenshotFiles.length === 0) {
      toast({
        title: "Screenshot required",
        description: "Please attach at least one screenshot of the issue",
        variant: "destructive"
      });
      return;
    }

    setIsBugSubmitting(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('title', bugData.title);
      formDataObj.append('description', bugData.description);
      formDataObj.append('reporterName', bugData.reporterName);
      formDataObj.append('reporterEmail', bugData.reporterEmail);
      screenshotFiles.forEach(file => {
        formDataObj.append('screenshots', file);
      });

      const csrfToken = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('csrf_token='))?.split('=')[1];
      const response = await fetch('/api/bug-reports', {
        method: 'POST',
        body: formDataObj,
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to submit bug report');
      }

      toast({
        title: "Bug report submitted",
        description: "Thank you for reporting this issue. Our team has been notified."
      });
      setShowBugReport(false);
      setBugData({ title: "", description: "", reporterName: "", reporterEmail: "" });
      setScreenshotFiles([]);
      setScreenshotPreviews([]);
    } catch (error: any) {
      toast({
        title: "Failed to submit",
        description: error.message || "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsBugSubmitting(false);
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
                  <button
                    onClick={() => setShowBugReport(true)}
                    className="flex items-center gap-2 text-xs text-blue-100/60 hover:text-cyan-300 transition-colors cursor-pointer"
                    data-testid="button-report-bug-mobile"
                  >
                    <Bug className="h-4 w-4 flex-shrink-0" />
                    <span>Report a Bug</span>
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
                <button
                  onClick={() => setShowBugReport(true)}
                  className="flex items-start gap-2 text-sm text-blue-100/60 hover:text-cyan-300 transition-colors cursor-pointer"
                  data-testid="button-report-bug"
                >
                  <Bug className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Report a Bug</span>
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

      {/* Bug Report Dialog */}
      <Dialog open={showBugReport} onOpenChange={(open) => {
        setShowBugReport(open);
        if (!open) {
          setBugData({ title: "", description: "", reporterName: "", reporterEmail: "" });
          setScreenshotFiles([]);
          setScreenshotPreviews([]);
          setIsDragging(false);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-red-500" />
              Report a Bug
            </DialogTitle>
            <DialogDescription>
              Found something that isn't working right? Let us know and we'll fix it as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBugSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bug-name">Your Name</Label>
                <Input
                  id="bug-name"
                  placeholder="Your name"
                  value={bugData.reporterName}
                  onChange={(e) => setBugData(prev => ({ ...prev, reporterName: e.target.value }))}
                  data-testid="input-bug-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bug-email">Your Email</Label>
                <Input
                  id="bug-email"
                  type="email"
                  placeholder="you@example.com"
                  value={bugData.reporterEmail}
                  onChange={(e) => setBugData(prev => ({ ...prev, reporterEmail: e.target.value }))}
                  data-testid="input-bug-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bug-title">Bug Title</Label>
              <Input
                id="bug-title"
                placeholder="Brief summary of the issue"
                value={bugData.title}
                onChange={(e) => setBugData(prev => ({ ...prev, title: e.target.value }))}
                data-testid="input-bug-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bug-description">Description</Label>
              <Textarea
                id="bug-description"
                placeholder="What happened? What did you expect? Steps to reproduce..."
                rows={4}
                value={bugData.description}
                onChange={(e) => setBugData(prev => ({ ...prev, description: e.target.value }))}
                data-testid="input-bug-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Screenshots <span className="text-red-500">*</span> <span className="text-xs text-muted-foreground ml-1">({screenshotFiles.length}/10)</span></Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleScreenshotChange}
                className="hidden"
                data-testid="input-bug-screenshot"
              />
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full border-2 border-dashed rounded-md transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                {screenshotPreviews.length > 0 ? (
                  <div className="p-3">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {screenshotPreviews.map((preview, index) => (
                        <div
                          key={index}
                          className="relative group aspect-video border border-border rounded-md overflow-visible bg-muted"
                          data-testid={`img-bug-screenshot-preview-${index}`}
                        >
                          <img
                            src={preview}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-full object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => removeScreenshot(index)}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center z-10"
                            data-testid={`button-remove-screenshot-${index}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {screenshotFiles.length < 10 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        data-testid="button-add-more-screenshots"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Add more screenshots</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 py-8 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    data-testid="button-upload-screenshot"
                  >
                    <Upload className="h-6 w-6" />
                    <span className="text-sm">Click or drag images here to upload</span>
                    <span className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB each (max 10)</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBugReport(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isBugSubmitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                data-testid="button-submit-bug"
              >
                {isBugSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Bug className="h-4 w-4 mr-2" />
                )}
                {isBugSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
