import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, FlaskConical, RefreshCw, Shield, AlertTriangle, CheckCircle2, Mail, Database, Briefcase } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import gmailLogo from "@assets/gmail_1769166926907.png";
import sendgridLogo from "@assets/sendgrid_1769166926908.png";

type SystemSetting = {
  id: string;
  key: string;
  value: any;
  description: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

const SETTING_KEYS = {
  RUN_TESTS_BEFORE_DEPLOY: "run_tests_before_deploy",
};

type EmailProviderData = {
  provider: 'gmail' | 'sendgrid';
  gmailConfigured: boolean;
  sendgridConfigured: boolean;
};

export default function SystemSettingsTab() {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  // Check if we're in development (localhost or replit.dev)
  const isDevelopment = typeof window !== 'undefined' && 
    (window.location.hostname.includes('localhost') || 
     window.location.hostname.includes('replit.dev'));

  const { data: settings, isLoading, refetch } = useQuery<SystemSetting[]>({
    queryKey: ["/api/admin/system-settings"],
  });

  const { data: emailProviderData, isLoading: emailProviderLoading } = useQuery<EmailProviderData>({
    queryKey: ["/api/admin/email-provider"],
  });

  const { data: rolesStatus, isLoading: rolesStatusLoading, refetch: refetchRolesStatus } = useQuery<{ count: number; predefinedCount: number }>({
    queryKey: ["/api/admin/roles/status"],
  });

  const seedRolesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/roles/seed");
    },
    onSuccess: async (response) => {
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles/status"] });
      toast({
        title: "Roles Seeded Successfully",
        description: `Created ${data.created} new roles, skipped ${data.skipped} existing roles.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Seeding Failed",
        description: error.message || "Failed to seed job roles.",
        variant: "destructive",
      });
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: any; description?: string }) => {
      return apiRequest("PUT", `/api/admin/system-settings/${key}`, { value, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-settings"] });
      toast({
        title: "Setting Updated",
        description: "The system setting has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update the setting.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUpdating(null);
    },
  });


  const getSettingValue = (key: string, defaultValue: any = false): any => {
    const setting = settings?.find(s => s.key === key);
    return setting?.value ?? defaultValue;
  };

  const getSettingUpdatedAt = (key: string): string | null => {
    const setting = settings?.find(s => s.key === key);
    return setting?.updatedAt ?? null;
  };

  const handleToggle = async (key: string, newValue: boolean, description: string) => {
    setIsUpdating(key);
    updateSettingMutation.mutate({ key, value: newValue, description });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" data-testid="loader-settings" />
      </div>
    );
  }

  const runTestsEnabled = getSettingValue(SETTING_KEYS.RUN_TESTS_BEFORE_DEPLOY, true);
  const runTestsUpdatedAt = getSettingUpdatedAt(SETTING_KEYS.RUN_TESTS_BEFORE_DEPLOY);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-cyan-400" />
            System Settings
          </h2>
          <p className="text-white/70 mt-1">
            Configure platform-wide settings and deployment options
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/system-settings"] });
            refetch();
            toast({ title: "Data refreshed", description: "Settings have been reloaded" });
          }}
          disabled={isLoading}
          className="gap-2 border-white/30 text-white hover:bg-white/10 hover:text-white"
          data-testid="button-refresh-settings"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Deployment Settings - Only show in production */}
      {isDevelopment ? (
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-cyan-400" />
              Deployment Testing
            </CardTitle>
            <CardDescription className="text-white/70">
              This setting can only be changed in production
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-amber-300 font-medium mb-1">Production Only</h4>
                  <p className="text-white/70 text-sm">
                    The deployment test toggle must be changed in the production admin dashboard 
                    because the build process reads from the production database.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-cyan-400" />
            Deployment Testing
          </CardTitle>
          <CardDescription className="text-white/70">
            Configure how tests are run before production deployments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Run Tests Before Deploy Toggle */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Label htmlFor="run-tests-toggle" className="text-white font-medium text-base cursor-pointer">
                  Run Tests Before Deployment
                </Label>
                <Badge 
                  variant="outline" 
                  className={runTestsEnabled 
                    ? "bg-green-500/20 text-green-300 border-green-500/30" 
                    : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  }
                >
                  {runTestsEnabled ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Enabled
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Disabled
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-white/60 text-sm">
                When enabled, all unit and integration tests will run before each production deployment. 
                If any test fails, the deployment will be blocked.
              </p>
              {runTestsUpdatedAt && (
                <p className="text-white/40 text-xs mt-2">
                  Last updated: {format(new Date(runTestsUpdatedAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
            </div>
            <div className="flex items-center">
              {isUpdating === SETTING_KEYS.RUN_TESTS_BEFORE_DEPLOY ? (
                <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
              ) : (
                <Switch
                  id="run-tests-toggle"
                  checked={runTestsEnabled}
                  onCheckedChange={(checked) => handleToggle(
                    SETTING_KEYS.RUN_TESTS_BEFORE_DEPLOY,
                    checked,
                    "Controls whether unit and integration tests run before production deployments"
                  )}
                  data-testid="switch-run-tests-before-deploy"
                />
              )}
            </div>
          </div>

          {/* Information Card */}
          <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-cyan-300 font-medium mb-1">How it works</h4>
                <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
                  <li>When enabled, the build process runs the complete test suite first</li>
                  <li>Tests include unit tests (scoring, email, billing) and integration tests (auth, CSRF, API)</li>
                  <li>If any test fails, the build exits with an error code, blocking deployment</li>
                  <li>You can temporarily disable this for emergency hotfixes, but re-enable after</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Warning when disabled */}
          {!runTestsEnabled && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-amber-300 font-medium mb-1">Tests are currently disabled</h4>
                  <p className="text-white/70 text-sm">
                    Deployments will proceed without running tests. This increases the risk of deploying 
                    broken code to production. Consider re-enabling tests after any emergency hotfixes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Email Provider Settings */}
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Mail className="h-5 w-5 text-cyan-400" />
            Email Provider
          </CardTitle>
          <CardDescription className="text-white/70">
            Email delivery configuration (automatic failover)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {emailProviderLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SendGrid - Primary */}
                <div
                  className="relative p-6 rounded-lg border-2 border-cyan-500 bg-cyan-500/10"
                  data-testid="status-sendgrid-primary"
                >
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <img src={sendgridLogo} alt="SendGrid" className="h-12 w-12 object-contain" />
                    <div className="text-center">
                      <h4 className="text-white font-medium">SendGrid</h4>
                      <p className="text-white/60 text-sm mt-1">Via API (Replit Integration)</p>
                    </div>
                    <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                      Primary
                    </Badge>
                  </div>
                </div>

                {/* Gmail - Fallback */}
                <div
                  className={`relative p-6 rounded-lg border-2 border-white/20 bg-white/5 ${!emailProviderData?.gmailConfigured ? 'opacity-50' : ''}`}
                  data-testid="status-gmail-fallback"
                >
                  <div className="flex flex-col items-center gap-3">
                    <img src={gmailLogo} alt="Gmail" className="h-12 w-12 object-contain" />
                    <div className="text-center">
                      <h4 className="text-white font-medium">Gmail</h4>
                      <p className="text-white/60 text-sm mt-1">Via SMTP (App Password)</p>
                    </div>
                    {emailProviderData?.gmailConfigured ? (
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                        Fallback Ready
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                        Not Configured
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Info about email delivery */}
              <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-cyan-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-cyan-300 font-medium mb-1">Automatic Failover</h4>
                    <p className="text-white/70 text-sm">
                      All transactional emails are sent via <strong className="text-white">SendGrid</strong> (Replit Integration). 
                      If SendGrid is unavailable, the system automatically falls back to <strong className="text-white">Gmail</strong> SMTP 
                      {emailProviderData?.gmailConfigured 
                        ? ' (configured and ready).' 
                        : ' (requires GMAIL_USER and GMAIL_APP_PASSWORD secrets to enable).'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Database Setup */}
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-cyan-400" />
            Database Setup
          </CardTitle>
          <CardDescription className="text-white/70">
            Seed predefined job roles and manage database initialization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Job Roles Status */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Briefcase className="h-5 w-5 text-cyan-400" />
                <span className="text-white font-medium text-base">Job Roles</span>
                {rolesStatusLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white/50" />
                ) : (
                  <Badge 
                    variant="outline" 
                    className={rolesStatus?.count && rolesStatus.count >= rolesStatus.predefinedCount
                      ? "bg-green-500/20 text-green-300 border-green-500/30" 
                      : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    }
                  >
                    {rolesStatus?.count ?? 0} / {rolesStatus?.predefinedCount ?? 48} roles
                  </Badge>
                )}
              </div>
              <p className="text-white/60 text-sm">
                Seed the 48 predefined job roles used for Role Fit analysis. 
                Safe to run multiple times - existing roles will be skipped.
              </p>
            </div>
            <Button
              onClick={() => seedRolesMutation.mutate()}
              disabled={seedRolesMutation.isPending}
              className="gap-2"
              data-testid="button-seed-roles"
            >
              {seedRolesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  Seed Roles
                </>
              )}
            </Button>
          </div>

          {/* Info Card */}
          <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-cyan-300 font-medium mb-1">When to use</h4>
                <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
                  <li>After initial production deployment to populate job roles</li>
                  <li>When new predefined roles are added in updates</li>
                  <li>If production database was reset or migrated</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Info - Only show in production */}
      {!isDevelopment && (
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-lg">Environment Configuration</CardTitle>
          <CardDescription className="text-white/70">
            How to configure testing in your deployment workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-white/80 text-sm">
            <p>
              The toggle above <strong className="text-white">directly controls</strong> whether tests run during deployment. 
              The setting is stored in the database and read by the build script during publishing.
            </p>
            <div className="p-3 rounded bg-black/30 border border-white/10 font-mono text-xs overflow-x-auto">
              <code>./scripts/run-tests-before-deploy.sh && npm run build</code>
            </div>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
