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
      {/* Animated neural network background decoration */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <svg className="absolute top-0 left-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
            </linearGradient>
            <radialGradient id="nodeGlow">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </radialGradient>
          </defs>
          
          {/* Layer 1 - Input nodes (left) */}
          <g className="animate-pulse" style={{ animationDuration: '3s' }}>
            <circle cx="8%" cy="15%" r="8" fill="url(#nodeGlow)" />
            <circle cx="8%" cy="15%" r="4" fill="#22d3ee" />
            <circle cx="8%" cy="35%" r="8" fill="url(#nodeGlow)" />
            <circle cx="8%" cy="35%" r="4" fill="#22d3ee" />
            <circle cx="8%" cy="55%" r="8" fill="url(#nodeGlow)" />
            <circle cx="8%" cy="55%" r="4" fill="#22d3ee" />
            <circle cx="8%" cy="75%" r="8" fill="url(#nodeGlow)" />
            <circle cx="8%" cy="75%" r="4" fill="#22d3ee" />
          </g>
          
          {/* Layer 2 - Hidden layer 1 */}
          <g className="animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }}>
            <circle cx="30%" cy="10%" r="8" fill="url(#nodeGlow)" />
            <circle cx="30%" cy="10%" r="4" fill="#3b82f6" />
            <circle cx="30%" cy="28%" r="8" fill="url(#nodeGlow)" />
            <circle cx="30%" cy="28%" r="4" fill="#3b82f6" />
            <circle cx="30%" cy="46%" r="8" fill="url(#nodeGlow)" />
            <circle cx="30%" cy="46%" r="4" fill="#3b82f6" />
            <circle cx="30%" cy="64%" r="8" fill="url(#nodeGlow)" />
            <circle cx="30%" cy="64%" r="4" fill="#3b82f6" />
            <circle cx="30%" cy="82%" r="8" fill="url(#nodeGlow)" />
            <circle cx="30%" cy="82%" r="4" fill="#3b82f6" />
          </g>
          
          {/* Layer 3 - Hidden layer 2 */}
          <g className="animate-pulse" style={{ animationDuration: '2.8s', animationDelay: '0.6s' }}>
            <circle cx="52%" cy="18%" r="8" fill="url(#nodeGlow)" />
            <circle cx="52%" cy="18%" r="4" fill="#22d3ee" />
            <circle cx="52%" cy="38%" r="8" fill="url(#nodeGlow)" />
            <circle cx="52%" cy="38%" r="4" fill="#22d3ee" />
            <circle cx="52%" cy="58%" r="8" fill="url(#nodeGlow)" />
            <circle cx="52%" cy="58%" r="4" fill="#22d3ee" />
            <circle cx="52%" cy="78%" r="8" fill="url(#nodeGlow)" />
            <circle cx="52%" cy="78%" r="4" fill="#22d3ee" />
          </g>
          
          {/* Layer 4 - Hidden layer 3 */}
          <g className="animate-pulse" style={{ animationDuration: '2.3s', animationDelay: '0.9s' }}>
            <circle cx="74%" cy="12%" r="8" fill="url(#nodeGlow)" />
            <circle cx="74%" cy="12%" r="4" fill="#3b82f6" />
            <circle cx="74%" cy="32%" r="8" fill="url(#nodeGlow)" />
            <circle cx="74%" cy="32%" r="4" fill="#3b82f6" />
            <circle cx="74%" cy="52%" r="8" fill="url(#nodeGlow)" />
            <circle cx="74%" cy="52%" r="4" fill="#3b82f6" />
            <circle cx="74%" cy="72%" r="8" fill="url(#nodeGlow)" />
            <circle cx="74%" cy="72%" r="4" fill="#3b82f6" />
            <circle cx="74%" cy="88%" r="8" fill="url(#nodeGlow)" />
            <circle cx="74%" cy="88%" r="4" fill="#3b82f6" />
          </g>
          
          {/* Layer 5 - Output nodes (right) */}
          <g className="animate-pulse" style={{ animationDuration: '3.2s', animationDelay: '1.2s' }}>
            <circle cx="92%" cy="25%" r="8" fill="url(#nodeGlow)" />
            <circle cx="92%" cy="25%" r="4" fill="#22d3ee" />
            <circle cx="92%" cy="50%" r="8" fill="url(#nodeGlow)" />
            <circle cx="92%" cy="50%" r="4" fill="#22d3ee" />
            <circle cx="92%" cy="75%" r="8" fill="url(#nodeGlow)" />
            <circle cx="92%" cy="75%" r="4" fill="#22d3ee" />
          </g>
          
          {/* Connections - Layer 1 to Layer 2 */}
          <g stroke="url(#lineGradient1)" strokeWidth="1" className="animate-pulse" style={{ animationDuration: '4s' }}>
            <line x1="8%" y1="15%" x2="30%" y2="10%" />
            <line x1="8%" y1="15%" x2="30%" y2="28%" />
            <line x1="8%" y1="35%" x2="30%" y2="28%" />
            <line x1="8%" y1="35%" x2="30%" y2="46%" />
            <line x1="8%" y1="55%" x2="30%" y2="46%" />
            <line x1="8%" y1="55%" x2="30%" y2="64%" />
            <line x1="8%" y1="75%" x2="30%" y2="64%" />
            <line x1="8%" y1="75%" x2="30%" y2="82%" />
          </g>
          
          {/* Connections - Layer 2 to Layer 3 */}
          <g stroke="url(#lineGradient1)" strokeWidth="1" className="animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
            <line x1="30%" y1="10%" x2="52%" y2="18%" />
            <line x1="30%" y1="28%" x2="52%" y2="18%" />
            <line x1="30%" y1="28%" x2="52%" y2="38%" />
            <line x1="30%" y1="46%" x2="52%" y2="38%" />
            <line x1="30%" y1="46%" x2="52%" y2="58%" />
            <line x1="30%" y1="64%" x2="52%" y2="58%" />
            <line x1="30%" y1="64%" x2="52%" y2="78%" />
            <line x1="30%" y1="82%" x2="52%" y2="78%" />
          </g>
          
          {/* Connections - Layer 3 to Layer 4 */}
          <g stroke="url(#lineGradient1)" strokeWidth="1" className="animate-pulse" style={{ animationDuration: '3.8s', animationDelay: '1s' }}>
            <line x1="52%" y1="18%" x2="74%" y2="12%" />
            <line x1="52%" y1="18%" x2="74%" y2="32%" />
            <line x1="52%" y1="38%" x2="74%" y2="32%" />
            <line x1="52%" y1="38%" x2="74%" y2="52%" />
            <line x1="52%" y1="58%" x2="74%" y2="52%" />
            <line x1="52%" y1="58%" x2="74%" y2="72%" />
            <line x1="52%" y1="78%" x2="74%" y2="72%" />
            <line x1="52%" y1="78%" x2="74%" y2="88%" />
          </g>
          
          {/* Connections - Layer 4 to Layer 5 */}
          <g stroke="url(#lineGradient1)" strokeWidth="1" className="animate-pulse" style={{ animationDuration: '4.2s', animationDelay: '1.5s' }}>
            <line x1="74%" y1="12%" x2="92%" y2="25%" />
            <line x1="74%" y1="32%" x2="92%" y2="25%" />
            <line x1="74%" y1="32%" x2="92%" y2="50%" />
            <line x1="74%" y1="52%" x2="92%" y2="50%" />
            <line x1="74%" y1="52%" x2="92%" y2="75%" />
            <line x1="74%" y1="72%" x2="92%" y2="75%" />
            <line x1="74%" y1="88%" x2="92%" y2="75%" />
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
