import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, User, Target, Sparkles } from "lucide-react";
import { SharedIndividualReport, SharedIndividualReportConfig } from "@/components/shared/SharedIndividualReport";
import PartnerCompareTab from "@/components/partner/PartnerCompareTab";
import PartnerRoleFitTab from "@/components/partner/PartnerRoleFitTab";

const partnerIndividualReportConfig: SharedIndividualReportConfig = {
  candidatesEndpoint: '/api/partner/me/candidates',
  reportEndpoint: '/api/partner/me/compare',
  profileInsightsEndpoint: (candidateId: string) => `/api/partner/me/candidates/${candidateId}/profile-insights`,
  contextType: 'partner',
};

interface PartnerAnalysisTabProps {
  creditsRemaining?: number;
  onNavigateToEcosystem?: () => void;
}

export default function PartnerAnalysisTab({ creditsRemaining, onNavigateToEcosystem }: PartnerAnalysisTabProps) {
  const [subTab, setSubTab] = useState<string | null>(null);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Quick Action Cards - 4 columns on desktop */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-4">
        <Card 
          className={`cursor-pointer hover-elevate ${subTab === 'individual' ? 'border-primary ring-1 ring-primary' : ''}`}
          onClick={() => setSubTab('individual')}
          data-testid="card-individual-report"
        >
          <CardContent className="p-4 md:p-6 text-center">
            <User className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold text-sm md:text-base">Individual Report</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Deep dive into a single candidate's results</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover-elevate ${subTab === 'compare' ? 'border-primary ring-1 ring-primary' : ''}`}
          onClick={() => setSubTab('compare')}
          data-testid="card-compare-candidates"
        >
          <CardContent className="p-4 md:p-6 text-center">
            <Users className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold text-sm md:text-base">Compare Candidates</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Side-by-side comparison of multiple candidates</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover-elevate ${subTab === 'role-fit' ? 'border-primary ring-1 ring-primary' : ''}`}
          onClick={() => setSubTab('role-fit')}
          data-testid="card-role-fit"
        >
          <CardContent className="p-4 md:p-6 text-center">
            <Target className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold text-sm md:text-base">Role Fit Analysis</h3>
            <p className="text-xs md:text-sm text-muted-foreground">AI-powered job-candidate matching</p>
          </CardContent>
        </Card>
        {/* Jump to Team Analysis - different color */}
        <Card 
          className="cursor-pointer hover-elevate bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/30"
          onClick={() => onNavigateToEcosystem?.()}
          data-testid="card-team-analysis"
        >
          <CardContent className="p-4 md:p-6 text-center">
            <Sparkles className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-violet-600" />
            <h3 className="font-semibold text-sm md:text-base text-violet-700 dark:text-violet-400">Jump to Team Analysis</h3>
            <p className="text-xs md:text-sm text-muted-foreground">AI-powered team diagnostics</p>
          </CardContent>
        </Card>
      </div>

      {/* Content based on selected card */}
      {subTab === 'individual' && (
        <div className="space-y-6">
          <SharedIndividualReport config={partnerIndividualReportConfig} />
        </div>
      )}

      {subTab === 'compare' && (
        <div className="space-y-6">
          <PartnerCompareTab />
        </div>
      )}

      {subTab === 'role-fit' && (
        <div className="space-y-6">
          <PartnerRoleFitTab />
        </div>
      )}
    </div>
  );
}
