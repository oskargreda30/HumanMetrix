import { useState, useEffect } from "react";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
  {
    id: 1,
    quote: "The FIT assessment gave me insights I'd never considered about my working style. It helped me articulate my strengths in interviews and I landed my dream role within weeks.",
    name: "Anonymous #1",
    role: "Marketing Manager",
    rating: 5,
  },
  {
    id: 2,
    quote: "As a recruiter, HumanMetrix has transformed how we evaluate candidates. The AI Readiness scores have been remarkably predictive of on-the-job performance.",
    name: "Anonymous #2",
    role: "Senior Recruiter",
    rating: 5,
  },
  {
    id: 3,
    quote: "I was skeptical about AI assessments, but the Prompt Architecture test genuinely challenged my thinking. The detailed feedback helped me improve my AI collaboration skills.",
    name: "Anonymous #3",
    role: "Product Designer",
    rating: 5,
  },
  {
    id: 4,
    quote: "The AIQ assessment opened my eyes to ethical considerations I hadn't thought about. Essential for anyone working with AI systems in their role.",
    name: "Anonymous #4",
    role: "Data Analyst",
    rating: 5,
  },
  {
    id: 5,
    quote: "Completed all four assessments and shared them with potential employers. It gave me a real edge - employers loved seeing validated AI and behavioural competencies.",
    name: "Anonymous #5",
    role: "Software Engineer",
    rating: 5,
  },
  {
    id: 6,
    quote: "We've integrated HumanMetrix into our hiring pipeline. The comprehensive reports save us hours of screening time while ensuring we find the right cultural fit.",
    name: "Anonymous #6",
    role: "HR Director",
    rating: 5,
  },
];

export default function CTASection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-12 md:py-24 bg-[#0f1f38]">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-600 via-cyan-500 to-blue-500 px-6 py-12 md:px-16 md:py-16">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(white,transparent_85%)]" />
          
          <div className="relative">
            <div className="text-center mb-8">
              <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
                What Our Users Say
              </h2>
              <p className="text-sm md:text-base text-white/80">
                Trusted by professionals and recruiters worldwide
              </p>
            </div>

            <div className="relative max-w-4xl mx-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-12 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full h-10 w-10"
                data-testid="button-testimonial-prev"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div 
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-10 min-h-[200px] md:min-h-[220px] flex flex-col justify-center"
                onMouseEnter={() => setIsAutoPlaying(false)}
                onMouseLeave={() => setIsAutoPlaying(true)}
              >
                <Quote className="h-8 w-8 md:h-10 md:w-10 text-white/40 mb-4 mx-auto" />
                
                <blockquote className="text-center">
                  <p className="text-base md:text-xl lg:text-2xl text-white font-medium leading-relaxed mb-6 transition-opacity duration-500">
                    "{currentTestimonial.quote}"
                  </p>
                  
                  <footer className="flex flex-col items-center gap-2">
                    <div className="flex gap-1">
                      {[...Array(currentTestimonial.rating)].map((_, i) => (
                        <svg
                          key={i}
                          className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 fill-current"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <cite className="not-italic">
                      <span className="text-white font-semibold text-sm md:text-base">
                        {currentTestimonial.name}
                      </span>
                      <span className="text-white/70 text-sm md:text-base"> - {currentTestimonial.role}</span>
                    </cite>
                  </footer>
                </blockquote>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-12 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full h-10 w-10"
                data-testid="button-testimonial-next"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300 ${
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
