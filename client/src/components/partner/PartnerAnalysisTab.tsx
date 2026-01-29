import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Candidate Analysis</h2>
        <p className="text-sm text-white/70">
          View individual reports, compare candidates, and analyze role fit
        </p>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="bg-white/10 border border-white/20">
          <TabsTrigger value="individual" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
            <User className="h-4 w-4 mr-2" />
            Individual Report
          </TabsTrigger>
          <TabsTrigger value="compare" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
            <Users className="h-4 w-4 mr-2" />
            Compare Candidates
          </TabsTrigger>
          <TabsTrigger value="role-fit" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
            <Target className="h-4 w-4 mr-2" />
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
