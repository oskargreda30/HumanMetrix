import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AssessmentCard from "@/components/AssessmentCard";
import RoadmapSection from "@/components/RoadmapSection";
import B2BPricingCalculator from "@/components/B2BPricingCalculator";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, Code2, Shield, ShoppingCart, Building2, User, CheckCircle, ArrowRight, Users, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { useBasket } from "@/contexts/BasketContext";
import { useState, useEffect } from "react";
import CheckoutModal from "@/components/CheckoutModal";
import ContactFormDialog from "@/components/ContactFormDialog";
import { useSearch } from "wouter";
import { SEO, ProductSchema } from "@/lib/seo";
import { useCurrency } from "@/contexts/CurrencyContext";
import { BASE_FEE, ASSESSMENT_PRICES } from "@shared/schema";

const assessments = [
  {
    id: "fit",
    title: "FIT Assessment",
    description: "Measure 6 core behavioral and workplace skills",
    employerDescription: "Measures candidates across 6 core behavioral and workplace competencies to assess cultural fit and role suitability.",
    questionCount: 15,
    duration: "20 min",
    icon: Brain,
    status: "available" as const,
    price: "£4",
  },
  {
    id: "ai_readiness",
    title: "AI Readiness Assessment",
    description: "Comprehensive evaluation of your ability to work effectively with AI systems, from prompt engineering to ethical AI usage.",
    employerDescription: "Evaluates candidates' ability to work effectively with AI systems, covering prompt engineering, data fluency, and ethical AI usage.",
    questionCount: 21,
    duration: "20 min",
    icon: Sparkles,
    status: "available" as const,
    price: "£5",
  },
  {
    id: "prompt_architecture",
    title: "Prompt Architecture Assessment",
    description: "Test your ability to design effective prompts across 7 progressive difficulty levels, evaluated by an AI model.",
    employerDescription: "Assesses candidates' prompt engineering skills across 7 progressive difficulty levels, with AI-evaluated scoring.",
    questionCount: 7,
    duration: "21 min",
    icon: Code2,
    status: "available" as const,
    price: "£5",
  },
  {
    id: "aiq",
    title: "Algorithmic Integrity Quotient (AIQ)",
    description: "Evaluate your understanding of AI ethics, bias, fairness, and responsible deployment practices.",
    employerDescription: "Measures candidates' understanding of AI ethics, bias, fairness, and responsible deployment practices.",
    questionCount: 8,
    duration: "20 min",
    icon: Shield,
    status: "available" as const,
    price: "£4",
  },
];

const teamAssessments = [
  {
    id: "ecosystem_index",
    title: "The Ecosystem Index",
    description: "AI-powered team diagnostic tool that analyzes mission alignment, capability gaps, and generates ideal candidate profiles based on your team's FIT scores.",
    questionCount: 12,
    duration: "25 min",
    icon: Users,
    status: "available" as const,
    tag: "Team Analysis",
  },
  {
    id: "cohort_benchmarking",
    title: "Cohort Benchmarking",
    description: "Compare candidate performance against industry benchmarks with percentile rankings and peer group analysis.",
    questionCount: 0,
    duration: "Varies",
    icon: BarChart3,
    status: "coming-soon" as const,
    tag: "Team Analysis",
  },
];

export default function Assessments() {
  const { isAuthenticated } = useAuth();
  const { getBasketCount, basketItems } = useBasket();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'employer' | 'candidate'>('employer');
  const { formatLocalPrice } = useCurrency();
  const searchString = useSearch();

  // Check URL parameter for view mode
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const viewParam = params.get('view');
    if (viewParam === 'candidate') {
      setViewMode('candidate');
    }
  }, [searchString]);

  const basketCount = getBasketCount();
  
  // Get localised prices for the pricing text
  const platformFee = formatLocalPrice(BASE_FEE);
  const minAssessmentPrice = formatLocalPrice(Math.min(...Object.values(ASSESSMENT_PRICES)));

  const b2bBenefits = [
    "Objective, AI-powered candidate evaluation",
    "Reduce time-to-hire by up to 40%",
    "Comprehensive skill and behavioral insights",
    "Seamless ATS integration available",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a1628]">
      <SEO 
        title="Psychometric Tests & AI Assessments UK"
        description="HumanMetrix psychometric tests: FIT, AI Readiness, Prompt Architecture & AIQ. Pre-employment assessments with CV-ready results. Online psychometric testing UK trusted."
        canonical="/assessments"
        keywords="psychometric tests UK, AI assessments, pre-employment testing, online psychometric tests, FIT assessment, AI readiness test, prompt engineering test, AIQ assessment, candidate testing"
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
          {/* View Mode Toggle */}
          <div className="flex justify-center mb-6 md:mb-10">
            <div className="inline-flex rounded-lg bg-[#1a2744]/70 p-1 border border-cyan-400/20" data-testid="view-mode-toggle">
              <button
                onClick={() => setViewMode('employer')}
                className={`flex items-center gap-2 px-4 py-2 md:px-6 md:py-2.5 rounded-md text-sm md:text-base font-medium transition-all ${
                  viewMode === 'employer'
                    ? 'bg-cyan-500 text-white shadow-lg'
                    : 'text-blue-100/70 hover:text-white'
                }`}
                data-testid="toggle-employer"
              >
                <Building2 className="h-4 w-4" />
                I'm an Employer
              </button>
              <button
                onClick={() => setViewMode('candidate')}
                className={`flex items-center gap-2 px-4 py-2 md:px-6 md:py-2.5 rounded-md text-sm md:text-base font-medium transition-all ${
                  viewMode === 'candidate'
                    ? 'bg-cyan-500 text-white shadow-lg'
                    : 'text-blue-100/70 hover:text-white'
                }`}
                data-testid="toggle-candidate"
              >
                <User className="h-4 w-4" />
                I'm a Candidate
              </button>
            </div>
          </div>

          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-lg md:text-3xl lg:text-4xl font-bold mb-2 md:mb-4 text-white px-2">
              {viewMode === 'employer' ? 'Enterprise Assessment Suite' : 'Assessment Suite'}
            </h1>
            <p className="text-xs md:text-base lg:text-xl text-blue-100/70 mb-2 px-2">
              {viewMode === 'employer' 
                ? 'AI-powered assessments to identify top talent and reduce hiring risk'
                : 'Please select your assessments below.'
              }
            </p>
            
            {viewMode === 'employer' ? (
              /* B2B Employer View - Benefits list */
              <div className="max-w-2xl mx-auto mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                  {b2bBenefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-blue-100/80">
                      <CheckCircle className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* B2C Candidate View - Login link and pricing */
              <>
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
                
                {/* Pricing info banner - only for candidates */}
                <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-lg p-3 md:p-4 max-w-2xl mx-auto" data-testid="pricing-info-banner">
                  <p className="text-sm md:text-base text-cyan-100 font-medium">
                    <span className="text-cyan-400 font-semibold">{platformFee}</span> one-time platform fee
                    <span className="text-blue-100/60"> + </span>
                    assessments from <span className="text-cyan-400 font-semibold">{minAssessmentPrice}</span> each
                  </p>
                  <p className="text-xs md:text-sm text-blue-100/50 mt-1">
                    Complete assessments for free, pay only to unlock your results
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="mb-12 md:mb-16">
            <h2 className="text-sm md:text-xl lg:text-2xl font-bold mb-4 md:mb-6 text-white">
              {viewMode === 'employer' ? 'Our Assessment Suite' : 'Available Assessments'}
            </h2>
            
            {/* Team Analysis Assessments - Employer view only */}
            {viewMode === 'employer' && (
              <div className="mb-6 md:mb-8">
                <h3 className="text-xs md:text-lg font-semibold mb-3 md:mb-4 text-cyan-400">Team Analysis</h3>
                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                  {teamAssessments.map((assessment) => (
                    <AssessmentCard
                      key={assessment.id}
                      id={assessment.id}
                      title={assessment.title}
                      description={assessment.description}
                      questionCount={assessment.questionCount}
                      duration={assessment.duration}
                      icon={assessment.icon}
                      status={assessment.status}
                      tag={assessment.tag}
                      showPricing={false}
                      hideQuestionCount={true}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Individual Assessments */}
            {viewMode === 'employer' && (
              <h3 className="text-xs md:text-lg font-semibold mb-3 md:mb-4 text-cyan-400">Individual Assessments</h3>
            )}
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {assessments.map((assessment) => (
                <AssessmentCard
                  key={assessment.id}
                  id={assessment.id}
                  title={assessment.title}
                  description={viewMode === 'employer' ? assessment.employerDescription : assessment.description}
                  questionCount={assessment.questionCount}
                  duration={assessment.duration}
                  icon={assessment.icon}
                  price={assessment.price}
                  showPricing={viewMode === 'candidate'}
                />
              ))}
            </div>
            
            {/* CTA Section - different for each view mode */}
            <div className="mt-6 md:mt-8 flex flex-col items-center gap-3">
              {viewMode === 'employer' ? (
                /* B2B CTA - Request Demo */
                <>
                  <Button 
                    size="lg"
                    onClick={() => setContactOpen(true)}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white border-0 gap-2 text-sm md:text-lg"
                    data-testid="button-request-demo"
                  >
                    Request a Demo
                    <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  <p className="text-xs md:text-sm text-blue-100/60">
                    Volume pricing available for enterprise teams
                  </p>
                </>
              ) : (
                /* B2C CTA - Continue to Tests */
                <>
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
                    {platformFee} one-time platform fee + assessments from {minAssessmentPrice} each
                  </p>
                </>
              )}
            </div>
          </div>

          {/* B2B Pricing Calculator - Employer view only */}
          {viewMode === 'employer' && (
            <div className="mb-12 md:mb-16">
              <h2 className="text-sm md:text-xl lg:text-2xl font-bold mb-4 md:mb-6 text-white text-center">
                Estimate Your Costs
              </h2>
              <B2BPricingCalculator />
            </div>
          )}

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
      
      {/* Contact Form Dialog for B2B Demo Requests */}
      <ContactFormDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        intent="demo"
      />
    </div>
  );
}
