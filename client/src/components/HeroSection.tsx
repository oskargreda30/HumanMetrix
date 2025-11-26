import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import networkBg from "@assets/image_1761537286469.png";

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false); // Start hidden for animation
  const [scrollY, setScrollY] = useState(0);
  // Initialize with media query value to prevent flash of animated content
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  const heroRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    // Intersection Observer for scroll-triggered animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    // Separate observer for the cards section - adjusted for mobile
    const cardsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCardsVisible(true);
          } else {
            setCardsVisible(false); // Reset when scrolling away
          }
        });
      },
      { 
        threshold: 0.1, // Lower threshold for mobile
        rootMargin: '0px 0px -50px 0px' // Less aggressive for smaller screens
      }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    if (cardsRef.current) {
      cardsObserver.observe(cardsRef.current);
    }

    // Fallback: If cards are already in view on page load (common on mobile),
    // trigger animation after a short delay
    const checkInitialVisibility = setTimeout(() => {
      if (cardsRef.current) {
        const rect = cardsRef.current.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 0;
        if (isInView && !cardsVisible) {
          setCardsVisible(true);
        }
      }
    }, 500); // Small delay to let page settle

    // Parallax scroll effect (only if no reduced motion preference)
    const handleScroll = () => {
      if (!prefersReducedMotion) {
        setScrollY(window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      clearTimeout(checkInitialVisibility);
      if (heroRef.current) {
        observer.unobserve(heroRef.current);
      }
      if (cardsRef.current) {
        cardsObserver.unobserve(cardsRef.current);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [prefersReducedMotion, cardsVisible]);

  // Helper function to conditionally apply animation classes
  const getAnimationClass = (baseClasses: string, animatedClasses: string) => {
    return prefersReducedMotion 
      ? baseClasses 
      : `${baseClasses} ${animatedClasses}`;
  };

  return (
    <section ref={heroRef} className="relative min-h-[calc(100vh-4rem)] flex items-center overflow-hidden">
      {/* Network visualization background with parallax */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-100"
        style={{ 
          backgroundImage: `url(${networkBg})`,
          transform: prefersReducedMotion ? 'none' : `translateY(${scrollY * 0.5}px)`
        }}
      />
      
      {/* Navy overlay with gradient for blending - subtle parallax */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-[#0a1628]/95 via-[#1a2744]/90 to-[#0a1628]/95 transition-transform duration-100"
        style={{ transform: prefersReducedMotion ? 'none' : `translateY(${scrollY * 0.3}px)` }}
      />
      
      <div className="relative mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-12 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Content */}
          <div className="space-y-6 md:space-y-10">
            <div className="space-y-5 md:space-y-5">
              {/* Badge - Fade in first */}
              <div 
                className={getAnimationClass(
                  'inline-block',
                  `transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`
                )}
              >
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs md:text-sm font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 backdrop-blur-sm">
                  AI-Powered Assessment Platform
                </span>
              </div>
              
              {/* Headline - Fade in second with delay */}
              <h1 
                className={getAnimationClass(
                  'text-2xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight px-2',
                  `transition-all duration-700 delay-150 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`
                )}
              >
                Your Next Role Demands More Than a Resume.
              </h1>
              
              {/* Subheadline - Fade in third with delay */}
              <p 
                className={getAnimationClass(
                  'text-sm md:text-lg lg:text-xl text-blue-100/80 leading-relaxed max-w-3xl mx-auto px-3 mt-4',
                  `transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`
                )}
              >
                Stand out from the crowd. Our one-time use assessment tool equips you a CV-attachable report on your FIT, AI Readiness, Prompt Architecture, and Algorithmic Integrity to help you land your next role!
              </p>
            </div>

            {/* CTA Buttons with fade-in animation */}
            <div 
              className={getAnimationClass(
                'flex flex-col items-center gap-3 px-3 pt-4',
                `transition-all duration-700 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`
              )}
            >
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/assessments" data-testid="link-hero-get-started">
                  <Button 
                    size="sm"
                    className={getAnimationClass(
                      'group relative bg-cyan-500 hover:bg-cyan-600 text-white border-0 w-full sm:w-auto overflow-hidden shadow-lg hover:shadow-cyan-500/50 text-sm md:text-base',
                      'transition-all duration-300'
                    )}
                    data-testid="button-hero-get-started"
                  >
                    {/* Pulse animation for main CTA - only if not reduced motion */}
                    {!prefersReducedMotion && (
                      <span className="absolute inset-0 rounded-md animate-pulse bg-cyan-400/20"></span>
                    )}
                    <span className="relative flex items-center">
                      Our Assessments
                      <ArrowRight className={getAnimationClass('ml-1.5 h-4 w-4', 'transition-transform group-hover:translate-x-1')} />
                    </span>
                  </Button>
                </Link>
                <Button 
                  size="sm"
                  onClick={() => {
                    const element = document.getElementById('sample-reports');
                    element?.scrollIntoView({ 
                      behavior: prefersReducedMotion ? 'auto' : 'smooth', 
                      block: 'start' 
                    });
                  }}
                  className={getAnimationClass(
                    'group relative bg-cyan-500 hover:bg-cyan-600 text-white border-0 w-full sm:w-auto overflow-hidden shadow-lg hover:shadow-cyan-500/50 text-sm md:text-base',
                    'transition-all duration-300'
                  )}
                  data-testid="button-hero-sample-reports"
                >
                  <span className="relative flex items-center">
                    Sample Reports
                    <ArrowRight className={getAnimationClass('ml-1.5 h-4 w-4', 'transition-transform group-hover:translate-x-1')} />
                  </span>
                </Button>
              </div>
              
              {/* Pricing disclosure */}
              <p className="text-xs md:text-sm text-blue-100/60 italic">
                Tests from £3.50 (plus one-time £15 computation price)
              </p>
            </div>

            {/* Why use HumanMetrix - Scroll-triggered animation */}
            <div 
              ref={cardsRef}
              className="text-center max-w-4xl mx-auto mt-8 px-2"
            >
              <p className={getAnimationClass(
                'text-base md:text-xl text-cyan-300 font-semibold mb-6',
                `transition-all duration-700 ${cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`
              )}>
                Why use HumanMetrix:
              </p>
              
              {/* Three cards - slide in on scroll */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: "Stop Competing Against Fake CV Claims",
                    description: "As AI writes more resumes, our verified report provides the trust and accountability hiring managers want to see.",
                    delay: 0
                  },
                  {
                    title: "AI is the New Digital Literacy",
                    description: "Whether you're in marketing, finance, or operations, AI Readiness is non-negotiable.",
                    delay: 200
                  },
                  {
                    title: "Up to 75% of qualified applicants are rejected by ATS",
                    description: "Our report will provide a comprehensive report to increase your chances of your CV being reviewed by a human.",
                    delay: 400
                  }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className={getAnimationClass(
                      'flex flex-col items-start gap-2 p-4 rounded-md bg-cyan-500/5 border border-cyan-400/20 backdrop-blur-sm',
                      `transition-all duration-700 ${cardsVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`
                    )}
                    style={prefersReducedMotion ? {} : { 
                      transitionDelay: cardsVisible ? `${item.delay}ms` : '0ms' 
                    }}
                  >
                    <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                    <div className="text-left space-y-1.5">
                      <p className="text-xs md:text-sm font-semibold text-blue-100">
                        {item.title}
                      </p>
                      <p className="text-[10px] md:text-xs text-blue-100/70 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Cards with staggered slide-up animation */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 max-w-4xl mx-auto px-3">
              {[
                {
                  title: "Instant PDF Results",
                  subtitle: "Download reports immediately",
                  delay: "delay-700"
                },
                {
                  title: "CV-Ready Reports",
                  subtitle: "Professional PDFs for job applications",
                  delay: "delay-1000"
                },
                {
                  title: "Secure Data Storage",
                  subtitle: "Safely encrypted and stored",
                  delay: "delay-1000"
                }
              ].map((item, i) => (
                <div 
                  key={i} 
                  className={getAnimationClass(
                    'flex flex-col items-center gap-1 text-center px-2',
                    `transition-all duration-700 ${item.delay} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`
                  )}
                >
                  <CheckCircle2 className="h-3 w-3 md:h-5 md:w-5 text-cyan-400 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <div className="text-[10px] md:text-sm font-medium text-blue-100">{item.title}</div>
                    <div className="text-[9px] md:text-xs text-blue-100/60 leading-tight">{item.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
