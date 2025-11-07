import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import BasketSheet from "@/components/BasketSheet";
import logoUrl from "@assets/generated_images/HM_tech_monogram_transparent_3a953400.png";

export default function Navigation() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About Us" },
    { href: "/assessments", label: "Assessments" },
    { href: "/for-employers", label: "For Employers" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-cyan-400/20 bg-[#0a1628]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0a1628]/80">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 hover-elevate active-elevate-2 px-2 py-1 rounded-md -ml-2 cursor-pointer" data-testid="link-home">
            <img 
              src={logoUrl} 
              alt="HumanMetrix" 
              className="h-8 w-8 object-contain"
            />
            <span className="font-semibold text-xl hidden sm:inline-block text-white">HumanMetrix</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.href) 
                    ? "text-cyan-300" 
                    : "text-blue-100/70 hover:text-cyan-300"
                }`}
                data-testid={`link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-2">
            <BasketSheet />
            <Link href="/login">
              <Button 
                variant="ghost" 
                className="text-blue-100/70 hover:text-cyan-300 hover:bg-cyan-500/10"
                data-testid="button-login"
              >
                Login
              </Button>
            </Link>
            <Link href="/assessments">
              <Button 
                className="bg-cyan-500 hover:bg-cyan-600 text-white border-0"
                data-testid="button-get-started"
              >
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button and Basket */}
          <div className="md:hidden flex items-center gap-2">
            <BasketSheet />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-cyan-400/20 bg-[#0a1628]">
          <nav className="flex flex-col gap-4 p-4">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.href) ? "text-cyan-300" : "text-blue-100/70"
                }`}
                onClick={() => setMobileMenuOpen(false)}
                data-testid={`link-mobile-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-cyan-400/20">
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
              <Link href="/assessments">
                <Button 
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white border-0" 
                  onClick={() => setMobileMenuOpen(false)} 
                  data-testid="button-mobile-get-started"
                >
                  Get Started
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
