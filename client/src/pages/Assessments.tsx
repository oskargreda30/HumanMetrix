import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AssessmentCard from "@/components/AssessmentCard";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, Code2, Shield, Network, Languages } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
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
  },
  {
    id: "ai-readiness",
    title: "AI Readiness Assessment",
    description: "Comprehensive evaluation of your ability to work effectively with AI systems, from prompt engineering to ethical AI usage.",
    questionCount: 21,
    duration: "30 min",
    icon: Sparkles,
    status: "available" as const,
  },
  {
    id: "prompt-architecture",
    title: "Prompt Architecture Assessment",
    description: "Test your ability to design effective prompts across 7 progressive difficulty levels, evaluated by GPT-5.",
    questionCount: 7,
    duration: "25 min",
    icon: Code2,
    status: "available" as const,
  },
  {
    id: "aiq",
    title: "Algorithmic Integrity Quotient (AIQ)",
    description: "Evaluate your understanding of AI ethics, bias, fairness, and responsible deployment practices.",
    questionCount: 8,
    duration: "20 min",
    icon: Shield,
    status: "available" as const,
  },
  {
    id: "logic-flow",
    title: "Logic Flow Assessment",
    description: "Coming soon: Advanced assessment of logical reasoning and systematic problem-solving abilities.",
    questionCount: 12,
    duration: "25 min",
    icon: Network,
    status: "coming-soon" as const,
  },
  {
    id: "ai-translator",
    title: "AI Output Translator",
    description: "Coming soon: Test your ability to interpret, refine, and communicate AI-generated content effectively.",
    questionCount: 10,
    duration: "20 min",
    icon: Languages,
    status: "coming-soon" as const,
  },
];

export default function Assessments() {
  const { isAuthenticated } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);

  const availableAssessments = assessments.filter((a) => a.status === "available");
  const comingSoon = assessments.filter((a) => a.status === "coming-soon");

  const handlePurchaseClick = (assessmentId: string) => {
    setSelectedAssessmentId(assessmentId);
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a1628]">
      <Navigation />
      <main className="flex-grow py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-white">
              AI Assessment Platform
            </h1>
            <p className="text-xl text-blue-100/70 mb-6">
              Professional assessments starting at just £0.01 per test
            </p>
            <p className="text-sm text-cyan-400 mb-6">
              £0.02 base fee + £0.01 per assessment
            </p>
            {isAuthenticated && (
              <div className="flex gap-4 justify-center">
                <Link href="/dashboard">
                  <Button size="lg" data-testid="button-go-to-dashboard">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-white">Available Assessments</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {availableAssessments.map((assessment) => (
                <AssessmentCard
                  key={assessment.id}
                  id={assessment.id}
                  title={assessment.title}
                  description={assessment.description}
                  questionCount={assessment.questionCount}
                  duration={assessment.duration}
                  icon={assessment.icon}
                  price="£0.01"
                  onSelect={() => handlePurchaseClick(assessment.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">Coming Soon</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {comingSoon.map((assessment) => (
                <AssessmentCard
                  key={assessment.id}
                  title={assessment.title}
                  description={assessment.description}
                  questionCount={assessment.questionCount}
                  duration={assessment.duration}
                  icon={assessment.icon}
                  comingSoon={true}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      
      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        preselectedAssessmentId={selectedAssessmentId}
      />
    </div>
  );
}
