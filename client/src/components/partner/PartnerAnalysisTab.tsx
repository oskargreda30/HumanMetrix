import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Users, User, Target } from "lucide-react";
import { SharedIndividualReport, SharedIndividualReportConfig } from "@/components/shared/SharedIndividualReport";
import PartnerCompareTab from "@/components/partner/PartnerCompareTab";
import PartnerRoleFitTab from "@/components/partner/PartnerRoleFitTab";

const partnerIndividualReportConfig: SharedIndividualReportConfig = {
  candidatesEndpoint: '/api/partner/me/candidates',
  reportEndpoint: '/api/partner/me/compare',
  profileInsightsEndpoint: (candidateId: string) => `/api/partner/me/candidates/${candidateId}/profile-insights`,
  contextType: 'partner',
};

export default function PartnerAnalysisTab() {
  const [subTab, setSubTab] = useState("individual");

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Quick Action Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-3">
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
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="bg-white/10 border border-white/20 h-auto flex-wrap">
          <TabsTrigger value="individual" className="text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
            <User className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Individual Report
          </TabsTrigger>
          <TabsTrigger value="compare" className="text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
            <Users className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Compare Candidates
          </TabsTrigger>
          <TabsTrigger value="role-fit" className="text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
            <Target className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Role Fit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-6">
          <SharedIndividualReport config={partnerIndividualReportConfig} />
        </TabsContent>

        <TabsContent value="compare" className="space-y-6">
          <PartnerCompareTab />
        </TabsContent>

        <TabsContent value="role-fit" className="space-y-6">
          <PartnerRoleFitTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
