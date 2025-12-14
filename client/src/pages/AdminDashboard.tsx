import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import OverviewTab from "@/components/admin/OverviewTab";
import CandidatesTab from "@/components/admin/CandidatesTab";
import CompareTab from "@/components/admin/CompareTab";
import RoleFitTab from "@/components/admin/RoleFitTab";
import GoldenSetTab from "@/components/admin/GoldenSetTab";
import OrganizationsTab from "@/components/admin/OrganizationsTab";

export default function AdminDashboard() {
  const { user, isLoading: userLoading } = useUser();
  const [activeTab, setActiveTab] = useState("overview");

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-user" />
      </div>
    );
  }

  const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
  const isSuperAdmin = user?.role === 'super_admin';

  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-admin-dashboard">
          Admin Intelligence Hub
        </h1>
        <p className="text-muted-foreground">
          Comprehensive candidate analytics, comparisons, and role alignment
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${isSuperAdmin ? 'grid-cols-6' : 'grid-cols-5'} lg:w-auto lg:inline-grid`}>
          <TabsTrigger value="overview" data-testid="tab-overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="candidates" data-testid="tab-candidates">
            Candidates
          </TabsTrigger>
          <TabsTrigger value="compare" data-testid="tab-compare">
            Compare
          </TabsTrigger>
          <TabsTrigger value="role-fit" data-testid="tab-role-fit">
            Role Fit
          </TabsTrigger>
          <TabsTrigger value="golden-set" data-testid="tab-golden-set">
            Scoring QA
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="organizations" data-testid="tab-organizations">
              Organisations
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="candidates" className="space-y-4">
          <CandidatesTab />
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          <CompareTab />
        </TabsContent>

        <TabsContent value="role-fit" className="space-y-4">
          <RoleFitTab />
        </TabsContent>

        <TabsContent value="golden-set" className="space-y-4">
          <GoldenSetTab />
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="organizations" className="space-y-4">
            <OrganizationsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
