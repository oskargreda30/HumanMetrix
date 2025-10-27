import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import ForEmployersSection from "@/components/ForEmployersSection";
import ResultsPreview from "@/components/ResultsPreview";
import PricingSection from "@/components/PricingSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a1628]">
      <Navigation />
      <main className="flex-grow">
        <HeroSection />
        <HowItWorks />
        <ForEmployersSection />
        <ResultsPreview />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
