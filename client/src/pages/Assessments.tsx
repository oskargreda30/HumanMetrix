import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AssessmentCard from "@/components/AssessmentCard";
import RoadmapSection from "@/components/RoadmapSection";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, Code2, Shield, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { useBasket } from "@/contexts/BasketContext";
import { useState } from "react";
import CheckoutModal from "@/components/CheckoutModal";

const assessments = [
  {
    id: "fit",
    title: "FIT Assessment",
    description: "Measure 6 core behavioral skills: High Agency, Intellectual Curiosity, Resilience, Empathy & Ethics, Growth Mindset, and Interpersonal Agility.",
    questionCount: 15,
    duration: "20 min",
    icon: Brain,
    status: "available" as const,
    price: "£3.50",
  },
  {
    id: "ai_readiness",
    title: "AI Readiness Assessment",
    description: "Comprehensive evaluation of your ability to work effectively with AI systems, from prompt engineering to ethical AI usage.",
    questionCount: 21,
    duration: "30 min",
    icon: Sparkles,
    status: "available" as const,
    price: "£4.50",
  },
  {
    id: "prompt_architecture",
    title: "Prompt Architecture Assessment",
    description: "Test your ability to design effective prompts across 7 progressive difficulty levels, evaluated by an AI model.",
    questionCount: 7,
    duration: "14 min",
    icon: Code2,
    status: "available" as const,
    price: "£5.00",
  },
  {
    id: "aiq",
    title: "Algorithmic Integrity Quotient (AIQ)",
    description: "Evaluate your understanding of AI ethics, bias, fairness, and responsible deployment practices.",
    questionCount: 8,
    duration: "20 min",
    icon: Shield,
    status: "available" as const,
    price: "£4.00",
  },
];

export default function Assessments() {
  const { isAuthenticated } = useAuth();
  const { getBasketCount, basketItems } = useBasket();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const basketCount = getBasketCount();

  return (
    <div className="min-h-screen flex flex-col bg-[#0a1628]">
      <Navigation />
      <main className="flex-grow py-8 md:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-lg md:text-3xl lg:text-4xl font-bold mb-2 md:mb-4 text-white px-2">
              AI Assessment Platform
            </h1>
            <p className="text-xs md:text-base lg:text-xl text-blue-100/70 mb-3 md:mb-6 px-2">
              Professional assessments starting at £3.50 per test (£15 one-time computation fee, then add as many as you want)
            </p>
            {isAuthenticated ? (
              <div className="flex gap-4 justify-center">
                <Link href="/dashboard">
                  <Button size="sm" className="text-xs md:text-sm" data-testid="button-go-to-dashboard">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex gap-4 justify-center">
                <Link href="/login">
                  <Button 
                    size="sm"
                    variant="outline"
                    className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/10 text-xs md:text-sm"
                    data-testid="button-login-to-dashboard"
                  >
                    Login to Access Dashboard
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="mb-12 md:mb-16">
            <h2 className="text-sm md:text-xl lg:text-2xl font-bold mb-4 md:mb-6 text-white">Available Assessments</h2>
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {assessments.map((assessment) => (
                <AssessmentCard
                  key={assessment.id}
                  id={assessment.id}
                  title={assessment.title}
                  description={assessment.description}
                  questionCount={assessment.questionCount}
                  duration={assessment.duration}
                  icon={assessment.icon}
                  price={assessment.price}
                />
              ))}
            </div>
            
            {/* Checkout Button */}
            <div className="mt-6 md:mt-8 flex justify-center">
              <Button 
                size="lg"
                onClick={() => setCheckoutOpen(true)}
                className="bg-cyan-500 hover:bg-cyan-600 text-white border-0 gap-2 text-sm md:text-lg"
                data-testid="button-view-basket-checkout"
              >
                <ShoppingCart className="h-4 w-4 md:h-6 md:w-6" />
                Continue to Tests
                {basketCount > 0 && (
                  <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {basketCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Roadmap Section */}
          <RoadmapSection />
        </div>
      </main>
      <Footer />
      
      {/* Checkout Modal */}
      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        basketItems={basketItems}
      />
    </div>
  );
}
