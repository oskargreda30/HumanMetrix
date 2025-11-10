import { FileText, Users, Target, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const reports = [
  {
    icon: FileText,
    title: "Individual Report",
    description: "Comprehensive analysis of all 4 assessments with detailed skill breakdowns, performance levels, and personalized recommendations",
    link: "/sample-reports/individual-sample.pdf",
    testId: "individual",
  },
  {
    icon: Users,
    title: "Comparison Report",
    description: "Side-by-side comparison of multiple candidates across all assessments with visual charts and performance indicators",
    link: "/sample-reports/comparison-sample.pdf",
    testId: "comparison",
  },
  {
    icon: Target,
    title: "Role Fit Report",
    description: "AI-powered role alignment analysis showing skill match, strengths, development areas, and hiring recommendations",
    link: "/sample-reports/rolefit-sample.pdf",
    testId: "rolefit",
  },
];

export default function SampleReportsSection() {
  return (
    <section id="sample-reports" className="relative py-12 md:py-24 bg-[#0a1628] overflow-hidden">
      {/* Neural network background decoration */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <svg className="absolute top-0 left-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Connection lines - different pattern */}
          <line x1="5%" y1="15%" x2="25%" y2="35%" stroke="currentColor" strokeWidth="1" className="text-cyan-400" />
          <line x1="25%" y1="35%" x2="45%" y2="25%" stroke="currentColor" strokeWidth="1" className="text-cyan-400" />
          <line x1="45%" y1="25%" x2="65%" y2="45%" stroke="currentColor" strokeWidth="1" className="text-cyan-400" />
          <line x1="65%" y1="45%" x2="85%" y2="30%" stroke="currentColor" strokeWidth="1" className="text-cyan-400" />
          <line x1="20%" y1="65%" x2="40%" y2="75%" stroke="currentColor" strokeWidth="1" className="text-cyan-400" />
          <line x1="40%" y1="75%" x2="60%" y2="65%" stroke="currentColor" strokeWidth="1" className="text-cyan-400" />
          <line x1="60%" y1="65%" x2="80%" y2="80%" stroke="currentColor" strokeWidth="1" className="text-cyan-400" />
          
          {/* Nodes */}
          <circle cx="5%" cy="15%" r="4" fill="currentColor" className="text-cyan-400" />
          <circle cx="25%" cy="35%" r="5" fill="currentColor" className="text-cyan-400" />
          <circle cx="45%" cy="25%" r="6" fill="currentColor" className="text-cyan-400" />
          <circle cx="65%" cy="45%" r="5" fill="currentColor" className="text-cyan-400" />
          <circle cx="85%" cy="30%" r="4" fill="currentColor" className="text-cyan-400" />
          <circle cx="20%" cy="65%" r="4" fill="currentColor" className="text-cyan-400" />
          <circle cx="40%" cy="75%" r="5" fill="currentColor" className="text-cyan-400" />
          <circle cx="60%" cy="65%" r="6" fill="currentColor" className="text-cyan-400" />
          <circle cx="80%" cy="80%" r="5" fill="currentColor" className="text-cyan-400" />
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {reports.map((report, index) => (
            <div 
              key={index} 
              className="rounded-xl bg-[#1a2744]/50 border border-cyan-400/10 p-4 md:p-6 flex flex-col items-center justify-center space-y-3 md:space-y-4 hover-elevate"
              data-testid={`card-report-${report.testId}`}
            >
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <report.icon className="h-5 w-5 md:h-6 md:w-6 text-cyan-400" data-testid={`icon-report-${report.testId}`} />
              </div>
              <h3 className="text-sm md:text-lg font-semibold text-white text-center" data-testid={`text-report-${report.testId}-title`}>
                {report.title}
              </h3>
              <a href={report.link} download data-testid={`link-download-${report.testId}`} className="w-full">
                <Button 
                  size="sm"
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white border-0 text-xs"
                  data-testid={`button-download-${report.testId}`}
                >
                  <Download className="mr-1.5 h-3 w-3" />
                  Download Sample
                </Button>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
