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
    <section className="py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started with professional AI assessments in four simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-border -z-10" />
              )}

              <div className="text-center space-y-4">
                <div className="mx-auto h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center relative">
                  <step.icon className="h-10 w-10 text-primary" />
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2" data-testid={`text-step-${index + 1}-title`}>
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground" data-testid={`text-step-${index + 1}-description`}>
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
