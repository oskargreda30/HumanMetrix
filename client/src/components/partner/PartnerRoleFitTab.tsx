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
  candidateIdParam: 'candidateId',
  contextType: 'partner',
};

export default function PartnerRoleFitTab() {
  return (
    <Tabs defaultValue="single" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="single" className="flex items-center gap-2" data-testid="tab-single-candidate">
          <User className="h-4 w-4" />
          Single Candidate
        </TabsTrigger>
        <TabsTrigger value="multi" className="flex items-center gap-2" data-testid="tab-multi-candidate">
          <Users className="h-4 w-4" />
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
