import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Globe } from "lucide-react";
import OverviewTab from "@/components/admin/OverviewTab";
import CandidatesTab from "@/components/admin/CandidatesTab";
import CompareTab from "@/components/admin/CompareTab";
import RoleFitTab from "@/components/admin/RoleFitTab";
import GoldenSetTab from "@/components/admin/GoldenSetTab";
import OrganizationsTab from "@/components/admin/OrganizationsTab";
import PlatformStatsTab from "@/components/admin/PlatformStatsTab";

export default function AdminDashboard() {
  const { user, isLoading: userLoading } = useUser();
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: orgInfo } = useQuery<{ isSuperAdmin: boolean; organization: any }>({
    queryKey: ["/api/admin/my-organization"],
    enabled: !!user,
  });

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
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold" data-testid="heading-admin-dashboard">
            {isSuperAdmin ? 'Platform Admin Hub' : 'Organisation Dashboard'}
          </h1>
          {isSuperAdmin ? (
            <Badge variant="secondary" className="gap-1.5">
              <Globe className="h-3 w-3" />
              Super Admin
            </Badge>
          ) : orgInfo?.organization ? (
            <Badge variant="outline" className="gap-1.5">
              <Building2 className="h-3 w-3" />
              {orgInfo.organization.name}
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground">
          {isSuperAdmin 
            ? 'Platform-wide metrics, candidate analytics, and organisation management'
            : 'Candidate analytics, comparisons, and role alignment for your organisation'
          }
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${isSuperAdmin ? 'grid-cols-7' : 'grid-cols-5'} lg:w-auto lg:inline-grid`}>
          {isSuperAdmin && (
            <TabsTrigger value="platform" data-testid="tab-platform">
              Platform
            </TabsTrigger>
          )}
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

        {isSuperAdmin && (
          <TabsContent value="platform" className="space-y-4">
            <PlatformStatsTab />
          </TabsContent>
        )}

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
