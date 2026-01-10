import { FileText, Users, Target, UsersRound, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const reports = [
  {
    icon: FileText,
    title: "Individual Report",
    description: "Comprehensive analysis of all 4 assessments with detailed skill breakdowns, performance levels, and personalized recommendations",
    link: "/sample-reports/individual-sample.pdf",
    downloadName: "Individual_Candidate_Report_Example_HumanMetrix.pdf",
    testId: "individual",
    comingSoon: false,
  },
  {
    icon: Users,
    title: "Candidate Comparison Report",
    description: "Side-by-side comparison of multiple candidates across all assessments with visual charts and performance indicators",
    link: "/sample-reports/comparison-sample.pdf",
    downloadName: "Candidate_Comparison_Example_Report_HumanMetrix.pdf",
    testId: "comparison",
    comingSoon: false,
  },
  {
    icon: Target,
    title: "Role Fit Report",
    description: "AI-powered role alignment analysis showing skill match, strengths, development areas, and hiring recommendations",
    link: "/sample-reports/rolefit-sample.pdf",
    downloadName: "Role_Fit_Example_Report_HumanMetrix.pdf",
    testId: "rolefit",
    comingSoon: false,
  },
  {
    icon: UsersRound,
    title: "Multiple Candidate Role Fit Report",
    description: "Compare multiple candidates against a specific role with cohort benchmarking and ranked recommendations",
    link: "",
    downloadName: "",
    testId: "multi-rolefit",
    comingSoon: true,
  },
];

export default function SampleReportsSection() {
  return (
    <section id="sample-reports" className="relative py-12 md:py-24 bg-[#0a1628] overflow-hidden">
      {/* Animated neural network background decoration - circular pattern extended */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
        <svg className="absolute -top-1/4 -left-[5%] w-[150%] h-[150%]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
            </linearGradient>
            <radialGradient id="nodeGlow2">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </radialGradient>
          </defs>
          
          {/* Center hub */}
          <g className="animate-pulse" style={{ animationDuration: '2s' }}>
            <circle cx="50" cy="50" r="3" fill="url(#nodeGlow2)" />
            <circle cx="50" cy="50" r="1.2" fill="#22d3ee" />
          </g>
          
          {/* Inner ring - 6 nodes */}
          <g className="animate-pulse" style={{ animationDuration: '2.8s', animationDelay: '0.2s' }}>
            <circle cx="50" cy="25" r="2" fill="url(#nodeGlow2)" />
            <circle cx="50" cy="25" r="0.8" fill="#3b82f6" />
            <circle cx="71.65" cy="37.5" r="2" fill="url(#nodeGlow2)" />
            <circle cx="71.65" cy="37.5" r="0.8" fill="#3b82f6" />
            <circle cx="71.65" cy="62.5" r="2" fill="url(#nodeGlow2)" />
            <circle cx="71.65" cy="62.5" r="0.8" fill="#3b82f6" />
            <circle cx="50" cy="75" r="2" fill="url(#nodeGlow2)" />
            <circle cx="50" cy="75" r="0.8" fill="#3b82f6" />
            <circle cx="28.35" cy="62.5" r="2" fill="url(#nodeGlow2)" />
            <circle cx="28.35" cy="62.5" r="0.8" fill="#3b82f6" />
            <circle cx="28.35" cy="37.5" r="2" fill="url(#nodeGlow2)" />
            <circle cx="28.35" cy="37.5" r="0.8" fill="#3b82f6" />
          </g>
          
          {/* Outer ring - 8 nodes */}
          <g className="animate-pulse" style={{ animationDuration: '3.2s', animationDelay: '0.4s' }}>
            <circle cx="50" cy="10" r="2" fill="url(#nodeGlow2)" />
            <circle cx="50" cy="10" r="0.8" fill="#22d3ee" />
            <circle cx="79.29" cy="20.71" r="2" fill="url(#nodeGlow2)" />
            <circle cx="79.29" cy="20.71" r="0.8" fill="#22d3ee" />
            <circle cx="90" cy="50" r="2" fill="url(#nodeGlow2)" />
            <circle cx="90" cy="50" r="0.8" fill="#22d3ee" />
            <circle cx="79.29" cy="79.29" r="2" fill="url(#nodeGlow2)" />
            <circle cx="79.29" cy="79.29" r="0.8" fill="#22d3ee" />
            <circle cx="50" cy="90" r="2" fill="url(#nodeGlow2)" />
            <circle cx="50" cy="90" r="0.8" fill="#22d3ee" />
            <circle cx="20.71" cy="79.29" r="2" fill="url(#nodeGlow2)" />
            <circle cx="20.71" cy="79.29" r="0.8" fill="#22d3ee" />
            <circle cx="10" cy="50" r="2" fill="url(#nodeGlow2)" />
            <circle cx="10" cy="50" r="0.8" fill="#22d3ee" />
            <circle cx="20.71" cy="20.71" r="2" fill="url(#nodeGlow2)" />
            <circle cx="20.71" cy="20.71" r="0.8" fill="#22d3ee" />
          </g>
          
          {/* Connections - center to inner ring */}
          <g stroke="url(#lineGradient2)" strokeWidth="0.25" className="animate-pulse" style={{ animationDuration: '3.5s' }}>
            <line x1="50" y1="50" x2="50" y2="25" />
            <line x1="50" y1="50" x2="71.65" y2="37.5" />
            <line x1="50" y1="50" x2="71.65" y2="62.5" />
            <line x1="50" y1="50" x2="50" y2="75" />
            <line x1="50" y1="50" x2="28.35" y2="62.5" />
            <line x1="50" y1="50" x2="28.35" y2="37.5" />
          </g>
          
          {/* Connections - inner ring to outer ring */}
          <g stroke="url(#lineGradient2)" strokeWidth="0.2" className="animate-pulse" style={{ animationDuration: '4s', animationDelay: '0.3s' }}>
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
          <h2 className="text-lg md:text-3xl lg:text-4xl font-semibold mb-2 md:mb-4 text-white" data-testid="text-sample-reports-heading">
            View Sample Reports
          </h2>
          <p className="text-xs md:text-base lg:text-lg text-blue-100/70 max-w-2xl mx-auto px-2" data-testid="text-sample-reports-subheading">
            Explore our comprehensive assessment reports with real examples
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {reports.map((report, index) => (
            <div 
              key={index} 
              className={`relative rounded-xl bg-[#1a2744]/50 border border-cyan-400/10 p-4 md:p-6 flex flex-col items-center justify-center space-y-3 md:space-y-4 ${report.comingSoon ? 'opacity-80' : 'hover-elevate'}`}
              data-testid={`card-report-${report.testId}`}
            >
              {report.comingSoon && (
                <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full" data-testid={`badge-coming-soon-${report.testId}`}>
                  Coming Soon
                </div>
              )}
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <report.icon className="h-5 w-5 md:h-6 md:w-6 text-cyan-400" data-testid={`icon-report-${report.testId}`} />
              </div>
              <h3 className="text-sm md:text-lg font-semibold text-white text-center" data-testid={`text-report-${report.testId}-title`}>
                {report.title}
              </h3>
              {report.comingSoon ? (
                <Button 
                  size="sm"
                  disabled
                  className="w-full bg-gray-500/50 text-gray-300 border-0 text-xs cursor-not-allowed"
                  data-testid={`button-download-${report.testId}`}
                >
                  <Download className="mr-1.5 h-3 w-3" />
                  Coming Soon
                </Button>
              ) : (
                <a href={report.link} download={report.downloadName} data-testid={`link-download-${report.testId}`} className="w-full">
                  <Button 
                    size="sm"
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white border-0 text-xs"
                    data-testid={`button-download-${report.testId}`}
                  >
                    <Download className="mr-1.5 h-3 w-3" />
                    Download Sample
                  </Button>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
