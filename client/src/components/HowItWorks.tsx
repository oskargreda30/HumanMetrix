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
    <section className="relative py-12 md:py-24 bg-[#0a1628] overflow-hidden">
      {/* Animated neural network background decoration - circular pattern extended */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
        <svg className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
            </linearGradient>
            <radialGradient id="nodeGlow1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </radialGradient>
          </defs>
          
          {/* Center hub */}
          <g className="animate-pulse" style={{ animationDuration: '2s' }}>
            <circle cx="50" cy="50" r="3" fill="url(#nodeGlow1)" />
            <circle cx="50" cy="50" r="1.2" fill="#22d3ee" />
          </g>
          
          {/* Inner ring - 6 nodes */}
          <g className="animate-pulse" style={{ animationDuration: '2.8s', animationDelay: '0.2s' }}>
            <circle cx="50" cy="25" r="2" fill="url(#nodeGlow1)" />
            <circle cx="50" cy="25" r="0.8" fill="#3b82f6" />
            <circle cx="71.65" cy="37.5" r="2" fill="url(#nodeGlow1)" />
            <circle cx="71.65" cy="37.5" r="0.8" fill="#3b82f6" />
            <circle cx="71.65" cy="62.5" r="2" fill="url(#nodeGlow1)" />
            <circle cx="71.65" cy="62.5" r="0.8" fill="#3b82f6" />
            <circle cx="50" cy="75" r="2" fill="url(#nodeGlow1)" />
            <circle cx="50" cy="75" r="0.8" fill="#3b82f6" />
            <circle cx="28.35" cy="62.5" r="2" fill="url(#nodeGlow1)" />
            <circle cx="28.35" cy="62.5" r="0.8" fill="#3b82f6" />
            <circle cx="28.35" cy="37.5" r="2" fill="url(#nodeGlow1)" />
            <circle cx="28.35" cy="37.5" r="0.8" fill="#3b82f6" />
          </g>
          
          {/* Outer ring - 8 nodes */}
          <g className="animate-pulse" style={{ animationDuration: '3.2s', animationDelay: '0.4s' }}>
            <circle cx="50" cy="10" r="2" fill="url(#nodeGlow1)" />
            <circle cx="50" cy="10" r="0.8" fill="#22d3ee" />
            <circle cx="79.29" cy="20.71" r="2" fill="url(#nodeGlow1)" />
            <circle cx="79.29" cy="20.71" r="0.8" fill="#22d3ee" />
            <circle cx="90" cy="50" r="2" fill="url(#nodeGlow1)" />
            <circle cx="90" cy="50" r="0.8" fill="#22d3ee" />
            <circle cx="79.29" cy="79.29" r="2" fill="url(#nodeGlow1)" />
            <circle cx="79.29" cy="79.29" r="0.8" fill="#22d3ee" />
            <circle cx="50" cy="90" r="2" fill="url(#nodeGlow1)" />
            <circle cx="50" cy="90" r="0.8" fill="#22d3ee" />
            <circle cx="20.71" cy="79.29" r="2" fill="url(#nodeGlow1)" />
            <circle cx="20.71" cy="79.29" r="0.8" fill="#22d3ee" />
            <circle cx="10" cy="50" r="2" fill="url(#nodeGlow1)" />
            <circle cx="10" cy="50" r="0.8" fill="#22d3ee" />
            <circle cx="20.71" cy="20.71" r="2" fill="url(#nodeGlow1)" />
            <circle cx="20.71" cy="20.71" r="0.8" fill="#22d3ee" />
          </g>
          
          {/* Connections - center to inner ring */}
          <g stroke="url(#lineGradient1)" strokeWidth="0.25" className="animate-pulse" style={{ animationDuration: '3.5s' }}>
            <line x1="50" y1="50" x2="50" y2="25" />
            <line x1="50" y1="50" x2="71.65" y2="37.5" />
            <line x1="50" y1="50" x2="71.65" y2="62.5" />
            <line x1="50" y1="50" x2="50" y2="75" />
            <line x1="50" y1="50" x2="28.35" y2="62.5" />
            <line x1="50" y1="50" x2="28.35" y2="37.5" />
          </g>
          
          {/* Connections - inner ring to outer ring */}
          <g stroke="url(#lineGradient1)" strokeWidth="0.2" className="animate-pulse" style={{ animationDuration: '4s', animationDelay: '0.3s' }}>
            <line x1="50" y1="25" x2="50" y2="10" />
            <line x1="50" y1="25" x2="79.29" y2="20.71" />
            <line x1="71.65" y1="37.5" x2="79.29" y2="20.71" />
            <line x1="71.65" y1="37.5" x2="90" y2="50" />
            <line x1="71.65" y1="62.5" x2="90" y2="50" />
            <line x1="71.65" y1="62.5" x2="79.29" y2="79.29" />
            <line x1="50" y1="75" x2="79.29" y2="79.29" />
            <line x1="50" y1="75" x2="50" y2="90" />
            <line x1="28.35" y1="62.5" x2="50" y2="90" />
            <line x1="28.35" y1="62.5" x2="20.71" y2="79.29" />
            <line x1="28.35" y1="37.5" x2="20.71" y2="79.29" />
            <line x1="28.35" y1="37.5" x2="10" y2="50" />
            <line x1="28.35" y1="37.5" x2="20.71" y2="20.71" />
            <line x1="50" y1="25" x2="20.71" y2="20.71" />
          </g>
        </svg>
      </div>
      
      <div className="relative mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
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
