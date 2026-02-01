import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Users } from "lucide-react";
import { SharedSingleCandidateRoleFit, SharedRoleFitConfig } from "@/components/shared/SharedSingleCandidateRoleFit";
import MultiCandidateRoleFitTab from "./MultiCandidateRoleFitTab";

// Admin configuration for the shared role fit component
const adminConfig: SharedRoleFitConfig = {
  candidatesEndpoint: '/api/admin/candidates',
  rolesEndpoint: '/api/admin/roles',
  roleAlignmentEndpoint: '/api/admin/role-alignment',
  generateScoresEndpoint: (roleId: string) => `/api/admin/roles/${roleId}/generate-required-scores`,
  analyzeRoleFitEndpoint: '/api/admin/role-alignment',
  candidateIdParam: 'userId',
  contextType: 'admin',
};

export default function RoleFitTab() {
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
        <SharedSingleCandidateRoleFit config={adminConfig} />
      </TabsContent>
      <TabsContent value="multi" className="mt-6 data-[state=inactive]:hidden" forceMount>
        <MultiCandidateRoleFitTab />
      </TabsContent>
    </Tabs>
  );
}
