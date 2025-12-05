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
import { SEO, ProductSchema } from "@/lib/seo";

const assessments = [
  {
    id: "fit",
    title: "FIT Assessment",
    description: "Measure 6 core behavioral and workplace skills",
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
      <SEO 
        title="Psychometric Tests & AI Assessments UK - HumanMetrix"
        description="HumanMetrix psychometric tests: FIT, AI Readiness, Prompt Architecture & AIQ. Pre-employment assessments with CV-ready results. UK trusted."
        canonical="/assessments"
      />
      {assessments.map((a) => (
        <ProductSchema 
          key={a.id}
          name={a.title}
          description={a.description}
          price={parseFloat(a.price.replace('£', ''))}
          url={`/assessments#${a.id}`}
        />
      ))}
      <Navigation />
      <main className="flex-grow py-8 md:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-lg md:text-3xl lg:text-4xl font-bold mb-2 md:mb-4 text-white px-2">
              Assessment Suite
            </h1>
            <p className="text-xs md:text-base lg:text-xl text-blue-100/70 mb-2 px-2">
              Please select your assessments below.
            </p>
            <p className="text-xs md:text-sm text-blue-100/50 mb-3 md:mb-6 px-2">
              Already have an account?{' '}
              {isAuthenticated ? (
                <Link href="/dashboard" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                  Go to dashboard
                </Link>
              ) : (
                <Link href="/login" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                  Log in here
                </Link>
              )}
            </p>
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
            <div className="mt-6 md:mt-8 flex flex-col items-center gap-3">
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
              <p className="text-xs md:text-sm text-blue-100/60 italic">
                £15 one-time platform fee + assessments from £3.50 each
              </p>
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
