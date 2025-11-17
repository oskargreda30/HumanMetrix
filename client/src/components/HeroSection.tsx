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
  const [scrollY, setScrollY] = useState(0);
  // Initialize with media query value to prevent flash of animated content
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  const heroRef = useRef<HTMLElement>(null);

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

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    // Parallax scroll effect (only if no reduced motion preference)
    const handleScroll = () => {
      if (!prefersReducedMotion) {
        setScrollY(window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      if (heroRef.current) {
        observer.unobserve(heroRef.current);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [prefersReducedMotion]);

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
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] md:text-sm font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 backdrop-blur-sm">
                  AI-Powered Assessment Platform
                </span>
              </div>
              
              {/* Headline - Fade in second with delay */}
              <h1 
                className={getAnimationClass(
                  'text-xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight px-2',
                  `transition-all duration-700 delay-150 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`
                )}
              >
                Your Next Role Demands More Than a Resume.
              </h1>
              
              {/* Subheadline - Fade in third with delay */}
              <p 
                className={getAnimationClass(
                  'text-[10px] md:text-lg lg:text-xl text-blue-100/80 leading-relaxed max-w-3xl mx-auto px-3 mt-4',
                  `transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`
                )}
              >
                Stand out from the crowd. Our one-time use assessment tool equips you a CV-attachable report on your FIT, AI Readiness, Prompt Architecture, and Algorithmic Integrity to help you land your next role!
              </p>
              {/* Why use HumanMetrix - Hover to reveal branches */}
              <div 
                className={getAnimationClass(
                  'group text-center max-w-2xl mx-auto mt-6 px-2',
                  `transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`
                )}
              >
                <p className="text-sm md:text-xl text-cyan-300 font-semibold cursor-default inline-block">
                  <span className="group/trigger inline-block">
                    Why use HumanMetrix:
                    
                    {/* Three branches that appear on hover of text only */}
                    <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-4xl mt-6 opacity-0 invisible group-hover/trigger:opacity-100 group-hover/trigger:visible transition-all duration-500 z-10">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2">
                        {[
                          {
                            title: "Stop Competing Against Fake CV Claims",
                            description: "As AI writes more resumes, our verified report provides the trust and accountability hiring managers want to see."
                          },
                          {
                            title: "AI is the New Digital Literacy",
                            description: "Whether you're in marketing, finance, or operations, AI Readiness is non-negotiable."
                          },
                          {
                            title: "Up to 75% of qualified applicants are rejected by ATS",
                            description: "Our report will provide a comprehensive report to increase your chances of your CV being reviewed by a human."
                          }
                        ].map((item, idx) => (
                          <div 
                            key={idx}
                            className="flex flex-col items-start gap-2 p-4 rounded-md bg-cyan-500/5 border border-cyan-400/20 backdrop-blur-sm"
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
                  </span>
                </p>
              </div>
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
                      'group relative bg-cyan-500 hover:bg-cyan-600 text-white border-0 w-full sm:w-auto overflow-hidden shadow-lg hover:shadow-cyan-500/50 text-xs',
                      'transition-all duration-300'
                    )}
                    data-testid="button-hero-get-started"
                  >
                    {/* Pulse animation for main CTA - only if not reduced motion */}
                    {!prefersReducedMotion && (
                      <span className="absolute inset-0 rounded-md animate-pulse bg-cyan-400/20"></span>
                    )}
                    <span className="relative flex items-center">
                      Types of Assessments
                      <ArrowRight className={getAnimationClass('ml-1.5 h-3 w-3', 'transition-transform group-hover:translate-x-1')} />
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
                    'group relative bg-cyan-500 hover:bg-cyan-600 text-white border-0 w-full sm:w-auto overflow-hidden shadow-lg hover:shadow-cyan-500/50 text-xs',
                    'transition-all duration-300'
                  )}
                  data-testid="button-hero-sample-reports"
                >
                  <span className="relative flex items-center">
                    Sample Reports
                    <ArrowRight className={getAnimationClass('ml-1.5 h-3 w-3', 'transition-transform group-hover:translate-x-1')} />
                  </span>
                </Button>
              </div>
              
              {/* Pricing disclosure */}
              <p className="text-[10px] md:text-xs text-blue-100/60 italic">
                Tests from £3.50 (plus computation price)
              </p>
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
