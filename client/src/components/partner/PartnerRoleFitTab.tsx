import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Users } from "lucide-react";
import { SharedSingleCandidateRoleFit, SharedRoleFitConfig } from "@/components/shared/SharedSingleCandidateRoleFit";
import PartnerMultiCandidateRoleFitTab from "./PartnerMultiCandidateRoleFitTab";

// Partner configuration for the shared role fit component
const partnerConfig: SharedRoleFitConfig = {
  candidatesEndpoint: '/api/partner/me/candidates',
  rolesEndpoint: '/api/partner/me/roles',
  roleAlignmentEndpoint: '/api/partner/me/role-alignment',
  generateScoresEndpoint: (roleId: string) => `/api/partner/me/roles/${roleId}/generate-required-scores`,
  analyzeRoleFitEndpoint: '/api/partner/me/role-alignment',
  analyzePromptRoleFitEndpoint: '/api/partner/me/analyze-prompt-role-fit',
  analyzeAiqRoleFitEndpoint: '/api/partner/me/analyze-aiq-role-fit',
  candidateIdParam: 'candidateId',
  contextType: 'partner',
};

export default function PartnerRoleFitTab() {
  return (
    <Tabs defaultValue="single" className="w-full">
      <TabsList className="grid w-full max-w-lg mx-auto grid-cols-2">
        <TabsTrigger value="single" className="flex items-center gap-2 py-3 text-base" data-testid="tab-single-candidate">
          <User className="h-5 w-5" />
          Single Candidate
        </TabsTrigger>
        <TabsTrigger value="multi" className="flex items-center gap-2 py-3 text-base" data-testid="tab-multi-candidate">
          <Users className="h-5 w-5" />
          Multiple Candidates
        </TabsTrigger>
      </TabsList>
      <TabsContent value="single" className="mt-6 data-[state=inactive]:hidden" forceMount>
        <SharedSingleCandidateRoleFit config={partnerConfig} />
      </TabsContent>
      <TabsContent value="multi" className="mt-6 data-[state=inactive]:hidden" forceMount>
        <PartnerMultiCandidateRoleFitTab />
      </TabsContent>
    </Tabs>
  );
}
