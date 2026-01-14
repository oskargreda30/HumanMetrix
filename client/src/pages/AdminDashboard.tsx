import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Globe } from "lucide-react";
import { Redirect } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import OverviewTab from "@/components/admin/OverviewTab";
import CandidatesTab from "@/components/admin/CandidatesTab";
import CompareTab from "@/components/admin/CompareTab";
import IndividualReportTab from "@/components/admin/IndividualReportTab";
import RoleFitTab from "@/components/admin/RoleFitTab";
import GoldenSetTab from "@/components/admin/GoldenSetTab";
import OrganizationsTab from "@/components/admin/OrganizationsTab";
import PlatformStatsTab from "@/components/admin/PlatformStatsTab";
import InvitationsTab from "@/components/admin/InvitationsTab";
import PartnersTab from "@/components/admin/PartnersTab";
import UsageTab from "@/components/admin/UsageTab";
import WidgetTestTab from "@/components/admin/WidgetTestTab";
import HealthTab from "@/components/admin/HealthTab";
import BillingTab from "@/components/admin/BillingTab";
import AnalyticsTab from "@/components/admin/AnalyticsTab";
import SystemSettingsTab from "@/components/admin/SystemSettingsTab";
import AccountingTab from "@/components/admin/AccountingTab";
import dashboardBg from "@assets/image_1763608498774.png";

export default function AdminDashboard() {
  const { user, isLoading: userLoading } = useUser();
  const [activeTab, setActiveTab] = useState("overview");
  const [analyticsSubTab, setAnalyticsSubTab] = useState("platform");
  const [partnersSubTab, setPartnersSubTab] = useState("accounts"); // Default to accounts for super admins
  const [analysisSubTab, setAnalysisSubTab] = useState("individual");
  
  const { data: orgInfo } = useQuery<{ isSuperAdmin: boolean; organization: any }>({
    queryKey: ["/api/admin/my-organization"],
    enabled: !!user,
  });
  
  const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'organization_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  
  // Set default partnersSubTab based on role - super admins get "accounts", others get "organisations"
  useEffect(() => {
    if (user && !isSuperAdmin && partnersSubTab === 'accounts') {
      setPartnersSubTab('organisations');
    }
  }, [user, isSuperAdmin, partnersSubTab]);

  // Loading state
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a1628]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-4" data-testid="loader-user" />
          <p className="text-blue-100/70">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  // Redirect partner_admin role to Partner Dashboard
  if (user?.role === 'partner_admin') {
    return <Redirect to="/partner-dashboard" />;
  }

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
              <TabsTrigger value="overview" data-testid="tab-overview" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Overview
              </TabsTrigger>
              <TabsTrigger value="candidates" data-testid="tab-candidates" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Candidates
              </TabsTrigger>
              <TabsTrigger value="analysis" data-testid="tab-analysis" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Analysis
              </TabsTrigger>
              <TabsTrigger value="invitations" data-testid="tab-invitations" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Invitations
              </TabsTrigger>
              <TabsTrigger value="golden-set" data-testid="tab-golden-set" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Scoring QA
              </TabsTrigger>
              <TabsTrigger value="partners" data-testid="tab-partners" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                {isSuperAdmin ? 'B2B Partners' : 'Organisations'}
              </TabsTrigger>
              {isSuperAdmin && (
                <TabsTrigger value="analytics" data-testid="tab-analytics" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  Analytics
                </TabsTrigger>
              )}
              {isSuperAdmin && (
                <TabsTrigger value="billing" data-testid="tab-billing" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  Billing
                </TabsTrigger>
              )}
              {isSuperAdmin && (
                <TabsTrigger value="accounting" data-testid="tab-accounting" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  Accounting
                </TabsTrigger>
              )}
              {isSuperAdmin && (
                <TabsTrigger value="health" data-testid="tab-health" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  Health
                </TabsTrigger>
              )}
              {isSuperAdmin && (
                <TabsTrigger value="settings" data-testid="tab-settings" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  Settings
                </TabsTrigger>
              )}
              {isSuperAdmin && (
                <TabsTrigger value="widget-test" data-testid="tab-widget-test" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  Widget Test
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <OverviewTab />
            </TabsContent>

            <TabsContent value="candidates" className="space-y-4">
              <CandidatesTab />
            </TabsContent>

            {/* Analysis tab - consolidates Individual Report + Compare Candidates + Role Fit */}
            <TabsContent value="analysis" className="space-y-4">
              <Tabs value={analysisSubTab} onValueChange={setAnalysisSubTab}>
                <TabsList className="bg-white/5 border border-white/10">
                  <TabsTrigger value="individual" data-testid="subtab-individual" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70">
                    Individual Report
                  </TabsTrigger>
                  <TabsTrigger value="compare" data-testid="subtab-compare" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70">
                    Compare Candidates
                  </TabsTrigger>
                  <TabsTrigger value="role-fit" data-testid="subtab-role-fit" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70">
                    Role Fit
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="individual" className="mt-4 data-[state=inactive]:hidden" forceMount>
                  <IndividualReportTab />
                </TabsContent>
                <TabsContent value="compare" className="mt-4 data-[state=inactive]:hidden" forceMount>
                  <CompareTab />
                </TabsContent>
                <TabsContent value="role-fit" className="mt-4 data-[state=inactive]:hidden" forceMount>
                  <RoleFitTab />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="invitations" className="space-y-4">
              <InvitationsTab />
            </TabsContent>

            <TabsContent value="golden-set" className="space-y-4">
              <GoldenSetTab />
            </TabsContent>

            {/* Partners/Organisations tab - consolidates Partners + Usage + Organisations */}
            {/* Available to all admins, but Accounts sub-tab only visible to super admins */}
            <TabsContent value="partners" className="space-y-4">
              <Tabs value={partnersSubTab} onValueChange={setPartnersSubTab}>
                <TabsList className="bg-white/5 border border-white/10">
                  {isSuperAdmin && (
                    <TabsTrigger value="accounts" data-testid="subtab-accounts" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70">
                      Accounts
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="organisations" data-testid="subtab-organisations" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70">
                    Organisations
                  </TabsTrigger>
                  <TabsTrigger value="usage" data-testid="subtab-usage" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70">
                    Usage
                  </TabsTrigger>
                </TabsList>
                {isSuperAdmin && (
                  <TabsContent value="accounts" className="mt-4">
                    <PartnersTab />
                  </TabsContent>
                )}
                <TabsContent value="organisations" className="mt-4">
                  <OrganizationsTab />
                </TabsContent>
                <TabsContent value="usage" className="mt-4">
                  <UsageTab />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Analytics tab - consolidates Platform + Analytics */}
            {isSuperAdmin && (
              <TabsContent value="analytics" className="space-y-4">
                <Tabs value={analyticsSubTab} onValueChange={setAnalyticsSubTab}>
                  <TabsList className="bg-white/5 border border-white/10">
                    <TabsTrigger value="platform" data-testid="subtab-platform" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70">
                      Platform
                    </TabsTrigger>
                    <TabsTrigger value="trends" data-testid="subtab-trends" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70">
                      Trends
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="platform" className="mt-4">
                    <PlatformStatsTab currentUser={user} />
                  </TabsContent>
                  <TabsContent value="trends" className="mt-4">
                    <AnalyticsTab />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            )}

            {isSuperAdmin && (
              <TabsContent value="widget-test" className="space-y-4">
                <WidgetTestTab />
              </TabsContent>
            )}

            {isSuperAdmin && (
              <TabsContent value="billing" className="space-y-4">
                <BillingTab />
              </TabsContent>
            )}

            {isSuperAdmin && (
              <TabsContent value="accounting" className="space-y-4">
                <AccountingTab />
              </TabsContent>
            )}

            {isSuperAdmin && (
              <TabsContent value="health" className="space-y-4">
                <HealthTab />
              </TabsContent>
            )}

            {isSuperAdmin && (
              <TabsContent value="settings" className="space-y-4">
                <SystemSettingsTab />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
