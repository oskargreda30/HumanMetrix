import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User, Mail, Calendar, ArrowRight } from "lucide-react";
import { useState } from "react";
import BasketSheet from "@/components/BasketSheet";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useBasket } from "@/contexts/BasketContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import logoSymbol from "@assets/Gemini_Generated_Image_misel3misel3mise-removebg-preview_1762775600899.png";

interface NavigationProps {
  assessmentMode?: boolean; // When true, hides Dashboard/Logout buttons and navigation
}

export default function Navigation({ assessmentMode = false }: NavigationProps) {
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const { clearBasket } = useBasket();

  // Check if user is invitation-only (from backend auth response)
  const isInvitationOnly = (user as any)?.isInvitationOnly;
  
  // Calendly URL and pre-filled enquiry message
  const CALENDLY_URL = "https://calendly.com/hello-humanmetrix/30min";
  const contactEnquiryMessage = encodeURIComponent("Hi, I'm interested in learning more about HumanMetrix assessments and how they can help my organization. Please send me more information.");

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About Us" },
    { href: "/assessments", label: "Assessments" },
    { href: "/pricing", label: "Pricing" },
    { href: "/for-candidates", label: "For Candidates" },
    { href: "/developers", label: "Developers" },
    { href: "/articles", label: "Articles" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const handleLinkClick = (href: string) => {
    // Close mobile menu
    setMobileMenuOpen(false);
    
    // If clicking same page, scroll to top
    if (location === href) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Navigate to new page
    navigate(href);
    
    // For hash links, scroll after navigation
    if (href.includes('#')) {
      setTimeout(() => {
        const id = href.split('#')[1];
        const element = document.getElementById(id);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      // Scroll to top for regular page navigation
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout");
      return res;
    },
    onSuccess: async () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      clearBasket(); // Clear basket on logout
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
      navigate("/");
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0a1628]">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - Non-clickable during assessment mode */}
          {assessmentMode ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md -ml-2" data-testid="logo-static">
              <div className="h-10 w-10 flex items-center justify-center -mr-1 mt-2">
                <img 
                  src={logoSymbol} 
                  alt="HumanMetrix Logo" 
                  className="h-full w-full object-cover scale-[1.8]"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-2xl text-white">Human</span>
                <span className="font-bold text-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">Metrix</span>
              </div>
            </div>
          ) : (
            <Link href="/" className="flex items-center gap-1 hover-elevate active-elevate-2 px-2 py-1 rounded-md -ml-2 cursor-pointer" data-testid="link-home" onClick={() => handleLinkClick("/")}>
              <div className="h-10 w-10 flex items-center justify-center -mr-1 mt-2">
                <img 
                  src={logoSymbol} 
                  alt="HumanMetrix Logo" 
                  className="h-full w-full object-cover scale-[1.8]"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-2xl text-white">Human</span>
                <span className="font-bold text-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">Metrix</span>
              </div>
            </Link>
          )}

          {/* Desktop Navigation - Show for all users except candidates */}
          {(!isAuthenticated || user?.role === 'super_admin' || user?.role === 'organization_admin' || user?.role === 'partner_admin') && (
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href} 
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick(link.href);
                  }}
                  className={`text-sm font-medium transition-colors cursor-pointer ${
                    isActive(link.href) 
                      ? "text-cyan-300" 
                      : "text-blue-100/70 hover:text-cyan-300"
                  }`}
                  data-testid={`link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          )}

          {/* CTA Button - Hidden in assessment mode */}
          {!assessmentMode && (
            <div className="hidden md:flex items-center gap-2">
              {!isLoading && (
                isAuthenticated ? (
                  <>
                    <Link href="/dashboard">
                      <Button 
                        variant="ghost" 
                        className="text-blue-100/70 hover:text-cyan-300 hover:bg-cyan-500/10"
                        data-testid="button-dashboard"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Dashboard
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      className="text-blue-100/70 hover:text-cyan-300 hover:bg-cyan-500/10"
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isPending}
                      data-testid="button-logout"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button 
                        variant="ghost" 
                        className="text-blue-100/70 hover:text-cyan-300 hover:bg-cyan-500/10"
                        data-testid="button-login"
                      >
                        Login
                      </Button>
                    </Link>
                    <Button 
                        className="bg-cyan-500 hover:bg-cyan-600 text-white border-0"
                        onClick={() => setShowContactDialog(true)}
                        data-testid="button-contact-us"
                      >
                        Contact Us
                      </Button>
                  </>
                )
              )}
            </div>
          )}

          {/* Mobile Menu Button - Hidden in assessment mode */}
          {!assessmentMode && (
            <div className="md:hidden flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-cyan-300 hover:text-white hover:bg-cyan-500/20"
                data-testid="button-mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu - Hidden in assessment mode */}
      {mobileMenuOpen && !assessmentMode && (
        <div className="md:hidden border-t border-cyan-400/20 bg-[#0a1628]/90 backdrop-blur-sm">
          <nav className="flex flex-col gap-4 p-4">
            {/* Show nav links for all users except candidates */}
            {(!isAuthenticated || user?.role === 'super_admin' || user?.role === 'organization_admin' || user?.role === 'partner_admin') && navLinks.map((link) => (
              <a
                key={link.href} 
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(link.href);
                }}
                className={`text-sm font-medium transition-colors cursor-pointer ${
                  isActive(link.href) ? "text-cyan-300" : "text-blue-100/70"
                }`}
                data-testid={`link-mobile-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-cyan-400/20">
              {!isLoading && (
                isAuthenticated ? (
                  <>
                    <Link href="/dashboard">
                      <Button 
                        variant="ghost" 
                        className="w-full text-blue-100/70 hover:text-cyan-300 hover:bg-cyan-500/10" 
                        onClick={() => setMobileMenuOpen(false)} 
                        data-testid="button-mobile-dashboard"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Dashboard
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      className="w-full text-blue-100/70 hover:text-cyan-300 hover:bg-cyan-500/10" 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logoutMutation.mutate();
                      }}
                      disabled={logoutMutation.isPending}
                      data-testid="button-mobile-logout"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button 
                        variant="ghost" 
                        className="w-full text-blue-100/70 hover:text-cyan-300 hover:bg-cyan-500/10" 
                        onClick={() => setMobileMenuOpen(false)} 
                        data-testid="button-mobile-login"
                      >
                        Login
                      </Button>
                    </Link>
                    <Button 
                        className="w-full bg-cyan-500 hover:bg-cyan-600 text-white border-0" 
                        onClick={() => { setMobileMenuOpen(false); setShowContactDialog(true); }} 
                        data-testid="button-mobile-contact-us"
                      >
                        Contact Us
                      </Button>
                  </>
                )
              )}
            </div>
          </nav>
        </div>
      )}
      
      {/* Contact Options Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How would you like to connect?</DialogTitle>
            <DialogDescription>
              Choose the option that works best for you
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Option 1: Email Enquiry */}
            <a 
              href={`mailto:hello@humanmetrix.co.uk?subject=General%20Enquiry&body=${contactEnquiryMessage}`}
              className="block"
              onClick={() => setShowContactDialog(false)}
            >
              <Card className="p-4 hover-elevate cursor-pointer transition-all">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Send an Enquiry</h4>
                    <p className="text-sm text-muted-foreground">
                      Email us with your questions and we'll get back to you promptly.
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground mt-2" />
                </div>
              </Card>
            </a>
            
            {/* Option 2: Book Consultation */}
            <a 
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              onClick={() => setShowContactDialog(false)}
            >
              <Card className="p-4 hover-elevate cursor-pointer transition-all">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">Book a Call</h4>
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-0">Recommended</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Schedule a 30-minute call to discuss your needs with our team.
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground mt-2" />
                </div>
              </Card>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
