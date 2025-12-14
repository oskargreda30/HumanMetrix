import { useState, useEffect, useRef } from "react";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
  {
    id: 1,
    quote: "The FIT assessment gave me insights I'd never considered about my working style. It helped me articulate my strengths in interviews and I landed my dream role within weeks.",
    name: "Anonymous",
    role: "Marketing Manager",
    rating: 5,
  },
  {
    id: 2,
    quote: "As a recruiter, HumanMetrix has transformed how we evaluate candidates. The AI Readiness scores have been remarkably predictive of on-the-job performance.",
    name: "Anonymous",
    role: "Senior Recruiter",
    rating: 5,
  },
  {
    id: 3,
    quote: "I was skeptical about AI assessments, but the Prompt Architecture test genuinely challenged my thinking. The detailed feedback helped me improve my AI collaboration skills.",
    name: "Anonymous",
    role: "Product Designer",
    rating: 5,
  },
  {
    id: 4,
    quote: "The AIQ assessment opened my eyes to ethical considerations I hadn't thought about. Essential for anyone working with AI systems in their role.",
    name: "Anonymous",
    role: "Data Analyst",
    rating: 5,
  },
  {
    id: 5,
    quote: "Completed all four assessments and shared them with potential employers. It gave me a real edge - employers loved seeing validated AI and behavioural competencies.",
    name: "Anonymous",
    role: "Software Engineer",
    rating: 5,
  },
  {
    id: 6,
    quote: "We've integrated HumanMetrix into our hiring pipeline. The comprehensive reports save us hours of screening time while ensuring we find the right cultural fit.",
    name: "Anonymous",
    role: "HR Director",
    rating: 5,
  },
];

export default function CTASection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      goToNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, currentIndex]);

  const goToPrevious = () => {
    if (isAnimating) return;
    setIsAutoPlaying(false);
    setSlideDirection('right');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
      setIsAnimating(false);
    }, 300);
  };

  const goToNext = () => {
    if (isAnimating) return;
    setSlideDirection('left');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
      setIsAnimating(false);
    }, 300);
  };

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentIndex) return;
    setIsAutoPlaying(false);
    setSlideDirection(index > currentIndex ? 'left' : 'right');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsAnimating(false);
    }, 300);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-6 md:py-12 bg-[#0f1f38]">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-600 via-cyan-500 to-blue-500 px-4 py-5 md:px-10 md:py-8">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(white,transparent_85%)]" />
          
          <div className="relative">
            <div className="text-center mb-4">
              <h2 className="text-sm md:text-xl lg:text-2xl font-bold text-white mb-0.5">
                What Our Users Say
              </h2>
              <p className="text-[10px] md:text-xs text-white/80">
                Trusted by professionals and recruiters worldwide
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 md:gap-4 max-w-3xl mx-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="flex-shrink-0 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full h-8 w-8"
                data-testid="button-testimonial-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div 
                ref={containerRef}
                className="flex-1 overflow-hidden rounded-xl"
                onMouseEnter={() => setIsAutoPlaying(false)}
                onMouseLeave={() => setIsAutoPlaying(true)}
              >
                <div 
                  className={`bg-white/10 backdrop-blur-sm p-3 md:p-5 min-h-[140px] md:min-h-[160px] flex flex-col justify-center transition-transform duration-300 ease-in-out ${
                    isAnimating 
                      ? slideDirection === 'left' 
                        ? '-translate-x-full opacity-0' 
                        : 'translate-x-full opacity-0'
                      : 'translate-x-0 opacity-100'
                  }`}
                >
                  <Quote className="h-4 w-4 md:h-6 md:w-6 text-white/40 mb-2 mx-auto" />
                  
                  <blockquote className="text-center">
                    <p className="text-[11px] md:text-sm lg:text-base text-white font-medium leading-relaxed mb-2">
                      "{currentTestimonial.quote}"
                    </p>
                    
                    <footer className="flex flex-col items-center gap-0.5">
                      <div className="flex gap-0.5">
                        {[...Array(currentTestimonial.rating)].map((_, i) => (
                          <svg
                            key={i}
                            className="w-2.5 h-2.5 md:w-3 md:h-3 text-yellow-400 fill-current"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <cite className="not-italic">
                        <span className="text-white font-semibold text-[10px] md:text-xs">
                          {currentTestimonial.name}
                        </span>
                        <span className="text-white/70 text-[10px] md:text-xs"> - {currentTestimonial.role}</span>
                      </cite>
                    </footer>
                  </blockquote>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setIsAutoPlaying(false); goToNext(); }}
                className="flex-shrink-0 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full h-8 w-8"
                data-testid="button-testimonial-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex justify-center gap-1.5 mt-3">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? "bg-white scale-125"
                      : "bg-white/40 hover:bg-white/60"
                  }`}
                  data-testid={`button-testimonial-dot-${index}`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
