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
    <section id="sample-reports" className="py-24 bg-[#0a1628]">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-white" data-testid="text-sample-reports-heading">
            View Sample Reports
          </h2>
          <p className="text-lg text-blue-100/70 max-w-2xl mx-auto" data-testid="text-sample-reports-subheading">
            Explore our comprehensive assessment reports with real examples
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reports.map((report, index) => (
            <div 
              key={index} 
              className="rounded-xl bg-[#1a2744]/50 border border-cyan-400/10 p-6 space-y-6 hover-elevate"
              data-testid={`card-report-${report.testId}`}
            >
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <report.icon className="h-6 w-6 text-cyan-400" data-testid={`icon-report-${report.testId}`} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-white" data-testid={`text-report-${report.testId}-title`}>
                    {report.title}
                  </h3>
                  <p className="text-sm text-blue-100/60" data-testid={`text-report-${report.testId}-description`}>
                    {report.description}
                  </p>
                </div>
              </div>

              <a href={report.link} download data-testid={`link-download-${report.testId}`}>
                <Button 
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white border-0"
                  data-testid={`button-download-${report.testId}`}
                >
                  <Download className="mr-2 h-4 w-4" />
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
