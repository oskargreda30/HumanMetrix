import { FileText, Users, Target, UsersRound, Download, Eye, User, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

const reports = [
  {
    icon: FileText,
    title: "Individual Report",
    description: "Comprehensive analysis of all 4 assessments with detailed skill breakdowns, performance levels, and personalized recommendations",
    link: "/sample-report/individual",
    testId: "individual",
    comingSoon: false,
    category: "individual" as const,
  },
  {
    icon: User,
    title: "Individual Candidate Report",
    description: "Detailed single-candidate assessment report with AI-powered profile insights, trait analysis, and enterprise hiring recommendations",
    link: "/sample-report/b2b-individual",
    testId: "b2b-individual",
    comingSoon: false,
    category: "employer" as const,
  },
  {
    icon: Users,
    title: "Candidate Comparison Report",
    description: "Side-by-side comparison of multiple candidates across all assessments with visual charts and performance indicators",
    link: "/sample-report/comparison",
    testId: "comparison",
    comingSoon: false,
    category: "employer" as const,
  },
  {
    icon: Target,
    title: "Role Fit Report",
    description: "AI-powered role alignment analysis showing skill match, strengths, development areas, and hiring recommendations",
    link: "/sample-report/role-fit",
    testId: "rolefit",
    comingSoon: false,
    category: "employer" as const,
  },
  {
    icon: UsersRound,
    title: "Multiple Candidate Role Fit Report",
    description: "Compare multiple candidates against a specific role with cohort benchmarking and ranked recommendations",
    link: "/sample-report/multi-role-fit",
    testId: "multi-rolefit",
    comingSoon: false,
    category: "employer" as const,
  },
  {
    icon: Network,
    title: "Ecosystem Index Report",
    description: "AI-powered team capability diagnostic with gap analysis, ideal candidate profiles, and deep dive insights",
    link: "/ecosystem/sample-report",
    testId: "ecosystem",
    comingSoon: false,
    category: "employer" as const,
  },
];

export default function SampleReportsSection() {
  const [, setLocation] = useLocation();

  return (
    <section id="sample-reports" className="py-12 md:py-24 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-2 md:mb-4" data-testid="text-sample-reports-heading">
            View Sample Reports
          </h2>
          <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-sample-reports-subheading">
            Explore our comprehensive assessment reports with real examples
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {reports.map((report, index) => (
            <Card 
              key={index} 
              className={`relative p-4 md:p-6 flex flex-col items-center bg-white ${report.comingSoon ? 'opacity-70' : 'hover-elevate'}`}
              data-testid={`card-report-${report.testId}`}
            >
              <Badge 
                variant="secondary"
                className={`absolute top-3 left-3 text-[10px] font-medium ${
                  report.category === 'individual' 
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                    : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}
                data-testid={`badge-category-${report.testId}`}
              >
                {report.category === 'individual' ? 'For Job Seekers' : 'For Employers'}
              </Badge>
              <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-primary/10 flex items-center justify-center mt-8">
                <report.icon className="h-6 w-6 md:h-7 md:w-7 text-primary" data-testid={`icon-report-${report.testId}`} />
              </div>
              <h3 className="text-sm md:text-base font-semibold text-center mt-4" data-testid={`text-report-${report.testId}-title`}>
                {report.title}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground text-center mt-2 flex-grow">
                {report.description}
              </p>
              <div className="w-full mt-4">
                {report.comingSoon ? (
                  <Button 
                    size="default"
                    disabled
                    variant="secondary"
                    className="w-full"
                    data-testid={`button-download-${report.testId}`}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Coming Soon
                  </Button>
                ) : (
                  <Button 
                    size="default"
                    className="w-full"
                    onClick={() => setLocation(report.link)}
                    data-testid={`button-view-${report.testId}`}
                  >
                    <Eye className="mr-1.5 h-4 w-4" />
                    View Sample
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
