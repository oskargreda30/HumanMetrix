import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import BasketSheet from "@/components/BasketSheet";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Navigation() {
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

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

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/logout", "POST");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
    <header className="sticky top-0 z-50 w-full border-b border-cyan-400/20 bg-[#0a1628]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0a1628]/80">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover-elevate active-elevate-2 px-2 py-1 rounded-md -ml-2 cursor-pointer" data-testid="link-home">
            <div className="flex items-center gap-1">
              <span className="font-bold text-2xl text-white">Human</span>
              <span className="font-bold text-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">Metrix</span>
            </div>
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
                  <Link href="/assessments">
                    <Button 
                      className="bg-cyan-500 hover:bg-cyan-600 text-white border-0"
                      data-testid="button-get-started"
                    >
                      Get Started
                    </Button>
                  </Link>
                </>
              )
            )}
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
                    <Link href="/assessments">
                      <Button 
                        className="w-full bg-cyan-500 hover:bg-cyan-600 text-white border-0" 
                        onClick={() => setMobileMenuOpen(false)} 
                        data-testid="button-mobile-get-started"
                      >
                        Get Started
                      </Button>
                    </Link>
                  </>
                )
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
