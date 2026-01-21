import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import SampleReportsSection from "@/components/SampleReportsSection";
import ResultsPreview from "@/components/ResultsPreview";
import PricingSection from "@/components/PricingSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { SEO, FAQSchema, SoftwareApplicationSchema } from "@/lib/seo";

const candidateFAQs = [
  {
    question: "What is HumanMetrix (Human Metrix)?",
    answer: "HumanMetrix (also known as Human Metrix) is the UK's leading AI-powered psychometric testing platform for recruitment and career development. We measure human metrics through enterprise-grade assessments evaluating behavioral skills, AI literacy, and algorithmic ethics."
  },
  {
    question: "What psychometric tests does HumanMetrix offer?",
    answer: "HumanMetrix offers four pre-employment assessments: FIT Assessment (behavioural skills), AI Readiness Assessment, Prompt Architecture Assessment (GPT-evaluated), and Algorithmic Integrity Quotient (AIQ) for AI ethics. All tests are designed for UK recruitment."
  },
  {
    question: "How much do HumanMetrix psychometric tests cost?",
    answer: "Individual psychometric assessments are priced from £4, with our complete bundle of all four tests available at a discounted rate. You take assessments for free and only pay to unlock your human metrics results."
  },
  {
    question: "Can I use HumanMetrix results on my CV?",
    answer: "Yes! HumanMetrix (Human Metrix) results are designed to be included on your CV. Our professional PDF reports showcase your human metrics in a format trusted by UK recruiters and employers for pre-employment decisions."
  }
];

export default function ForCandidates() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a1628]">
      <SEO 
        title="For Candidates - AI-Powered Career Assessments"
        canonical="/for-candidates" 
        description="HumanMetrix for job seekers: AI-powered psychometric assessments to showcase your skills. Get FIT, AI Readiness, Prompt Architecture & AIQ results for your CV. Stand out to UK employers."
        keywords="career assessment, job seeker tests, CV skills, psychometric tests candidates, AI skills assessment, career development, professional assessment, job application tools"
      />
      <SoftwareApplicationSchema />
      <FAQSchema faqs={candidateFAQs} />
      <Navigation />
      <main className="flex-grow">
        <HeroSection />
        <HowItWorks />
        <SampleReportsSection />
        <ResultsPreview />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
