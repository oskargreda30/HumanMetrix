import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import SampleReportsSection from "@/components/SampleReportsSection";
import ForEmployersSection from "@/components/ForEmployersSection";
import ResultsPreview from "@/components/ResultsPreview";
import PricingSection from "@/components/PricingSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { SEO, FAQSchema } from "@/lib/seo";

const homeFAQs = [
  {
    question: "What is HumanMetrix?",
    answer: "HumanMetrix is a professional AI-powered assessment platform for recruitment and career development. We offer enterprise-grade assessments measuring behavioral skills, AI literacy, and algorithmic ethics."
  },
  {
    question: "What assessments do you offer?",
    answer: "We offer four key assessments: FIT Assessment (behavioral skills), AI Readiness Assessment, Prompt Architecture Assessment (GPT-evaluated), and Algorithmic Integrity Quotient (AIQ) for AI ethics."
  },
  {
    question: "How much do assessments cost?",
    answer: "Individual assessments are priced from £19.99, with our complete bundle of all four assessments available at a discounted rate. You take assessments for free and only pay to unlock your results."
  },
  {
    question: "Can I use my results on my CV?",
    answer: "Yes! HumanMetrix results are designed to be included on your CV. Our professional PDF reports showcase your skills in a format that impresses recruiters and employers."
  }
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a1628]">
      <SEO canonical="/" />
      <FAQSchema faqs={homeFAQs} />
      <Navigation />
      <main className="flex-grow">
        <HeroSection />
        <HowItWorks />
        <SampleReportsSection />
        <ForEmployersSection />
        <ResultsPreview />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
