import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Globe } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import OverviewTab from "@/components/admin/OverviewTab";
import CandidatesTab from "@/components/admin/CandidatesTab";
import CompareTab from "@/components/admin/CompareTab";
import RoleFitTab from "@/components/admin/RoleFitTab";
import GoldenSetTab from "@/components/admin/GoldenSetTab";
import OrganizationsTab from "@/components/admin/OrganizationsTab";
import PlatformStatsTab from "@/components/admin/PlatformStatsTab";
import InvitationsTab from "@/components/admin/InvitationsTab";
import PartnersTab from "@/components/admin/PartnersTab";
import UsageTab from "@/components/admin/UsageTab";
import WidgetTestTab from "@/components/admin/WidgetTestTab";
import ErrorsTab from "@/components/admin/ErrorsTab";
import dashboardBg from "@assets/image_1763608498774.png";

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
      <div className="min-h-screen flex flex-col relative">
        <div className="fixed inset-0 z-0">
          <div 
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: `url(${dashboardBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to bottom, rgba(13, 29, 51, 0.85), rgba(13, 29, 51, 0.75), rgba(13, 29, 51, 0.85))'
          }} />
        </div>
        <Navigation />
        <div className="flex-grow flex items-center justify-center relative z-10">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>You do not have permission to access this page.</CardDescription>
            </CardHeader>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background image with dark overlay */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url(${dashboardBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(13, 29, 51, 0.85), rgba(13, 29, 51, 0.75), rgba(13, 29, 51, 0.85))'
        }} />
      </div>
      <Navigation />
      <main className="flex-grow py-16 relative z-10">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white" data-testid="heading-admin-dashboard">
                {isSuperAdmin ? 'Platform Admin Hub' : 'Admin Dashboard'}
              </h1>
              {isSuperAdmin ? (
                <Badge variant="secondary" className="gap-1.5 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                  <Globe className="h-3 w-3" />
                  Super Admin
                </Badge>
              ) : orgInfo?.organization ? (
                <Badge variant="outline" className="gap-1.5 text-white/80 border-white/30">
                  <Building2 className="h-3 w-3" />
                  {orgInfo.organization.name}
                </Badge>
              ) : null}
            </div>
            <p className="text-white/80">
              {isSuperAdmin 
                ? 'Platform-wide metrics, candidate analytics, and organisation management'
                : 'Candidate analytics, comparisons, and role alignment for your organisation'
              }
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="inline-flex flex-wrap gap-1 h-auto p-1 bg-white/10 border border-white/20 w-auto">
              {isSuperAdmin && (
                <TabsTrigger value="platform" data-testid="tab-platform" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  Platform
                </TabsTrigger>
              )}
              <TabsTrigger value="overview" data-testid="tab-overview" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Overview
              </TabsTrigger>
              <TabsTrigger value="candidates" data-testid="tab-candidates" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Candidates
              </TabsTrigger>
              <TabsTrigger value="compare" data-testid="tab-compare" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Compare
              </TabsTrigger>
              <TabsTrigger value="role-fit" data-testid="tab-role-fit" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Role Fit
              </TabsTrigger>
              <TabsTrigger value="invitations" data-testid="tab-invitations" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Invitations
              </TabsTrigger>
              <TabsTrigger value="organizations" data-testid="tab-organizations" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Organisations
              </TabsTrigger>
              <TabsTrigger value="golden-set" data-testid="tab-golden-set" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Scoring QA
              </TabsTrigger>
              <TabsTrigger value="usage" data-testid="tab-usage" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Usage
              </TabsTrigger>
              {isSuperAdmin && (
                <TabsTrigger value="partners" data-testid="tab-partners" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  B2B Partners
                </TabsTrigger>
              )}
              {isSuperAdmin && (
                <TabsTrigger value="widget-test" data-testid="tab-widget-test" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  Widget Test
                </TabsTrigger>
              )}
              {isSuperAdmin && (
                <TabsTrigger value="errors" data-testid="tab-errors" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  Errors
                </TabsTrigger>
              )}
            </TabsList>

            {isSuperAdmin && (
              <TabsContent value="platform" className="space-y-4">
                <PlatformStatsTab currentUser={user} />
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

            <TabsContent value="invitations" className="space-y-4">
              <InvitationsTab />
            </TabsContent>

            <TabsContent value="organizations" className="space-y-4">
              <OrganizationsTab />
            </TabsContent>

            <TabsContent value="golden-set" className="space-y-4">
              <GoldenSetTab />
            </TabsContent>

            <TabsContent value="usage" className="space-y-4">
              <UsageTab />
            </TabsContent>

            {isSuperAdmin && (
              <TabsContent value="partners" className="space-y-4">
                <PartnersTab />
              </TabsContent>
            )}

            {isSuperAdmin && (
              <TabsContent value="widget-test" className="space-y-4">
                <WidgetTestTab />
              </TabsContent>
            )}

            {isSuperAdmin && (
              <TabsContent value="errors" className="space-y-4">
                <ErrorsTab />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
