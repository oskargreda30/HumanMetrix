import { CheckSquare, CreditCard, ClipboardCheck, Download } from "lucide-react";

const steps = [
  {
    icon: CheckSquare,
    title: "Select Assessments",
    description: "Choose from our range of AI-focused assessments tailored to your needs and career goals.",
  },
  {
    icon: CreditCard,
    title: "Secure Payment",
    description: "Pay once with our transparent pricing: £15 base fee plus £3.50-£6.50 per assessment.",
  },
  {
    icon: ClipboardCheck,
    title: "Complete Tests",
    description: "Take assessments at your own pace with our intuitive interface and real-time AI evaluation.",
  },
  {
    icon: Download,
    title: "Download Results",
    description: "Get professional PDF reports with detailed breakdowns, perfect for your CV or employer review.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-12 md:py-24 bg-[#0a1628]">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-lg md:text-3xl lg:text-4xl font-semibold mb-2 md:mb-4 text-white">How It Works</h2>
          <p className="text-xs md:text-base lg:text-lg text-blue-100/70 max-w-2xl mx-auto px-2">
            Get started with professional AI assessments in four simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-cyan-400/20 -z-10" />
              )}

              <div className="text-center space-y-2 md:space-y-4">
                <div className="mx-auto h-16 w-16 md:h-24 md:w-24 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center relative">
                  <step.icon className="h-6 w-6 md:h-10 md:w-10 text-cyan-400" />
                  <div className="absolute -top-2 -right-2 h-6 w-6 md:h-8 md:w-8 rounded-full bg-cyan-500 text-white flex items-center justify-center text-[10px] md:text-sm font-bold">
                    {index + 1}
                  </div>
                </div>
                <div className="px-2">
                  <h3 className="text-sm md:text-lg lg:text-xl font-semibold mb-1 md:mb-2 text-white" data-testid={`text-step-${index + 1}-title`}>
                    {step.title}
                  </h3>
                  <p className="text-xs md:text-sm text-blue-100/60 leading-relaxed" data-testid={`text-step-${index + 1}-description`}>
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
