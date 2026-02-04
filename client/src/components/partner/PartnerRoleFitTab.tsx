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
      <div className="flex justify-center mb-6">
        <TabsList className="inline-flex h-12 items-center justify-center rounded-full bg-slate-800/90 p-1.5 shadow-lg border border-slate-700/50 backdrop-blur-sm">
          <TabsTrigger 
            value="single" 
            className="inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-slate-300 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-slate-700/50" 
            data-testid="tab-single-candidate"
          >
            <User className="h-4 w-4" />
            Single Candidate
          </TabsTrigger>
          <TabsTrigger 
            value="multi" 
            className="inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-slate-300 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-slate-700/50" 
            data-testid="tab-multi-candidate"
          >
            <Users className="h-4 w-4" />
            Multiple Candidates
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="single" className="mt-6 data-[state=inactive]:hidden" forceMount>
        <SharedSingleCandidateRoleFit config={partnerConfig} />
      </TabsContent>
      <TabsContent value="multi" className="mt-6 data-[state=inactive]:hidden" forceMount>
        <PartnerMultiCandidateRoleFitTab />
      </TabsContent>
    </Tabs>
  );
}
