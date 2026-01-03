import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, FlaskConical, RefreshCw, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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

export default function SystemSettingsTab() {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const { data: settings, isLoading, refetch } = useQuery<SystemSetting[]>({
    queryKey: ["/api/admin/system-settings"],
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
          onClick={() => refetch()}
          className="gap-2"
          data-testid="button-refresh-settings"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Deployment Settings */}
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

      {/* Environment Info */}
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
              To enable pre-deployment testing, configure your deployment build command in the Publishing tool:
            </p>
            <div className="p-3 rounded bg-black/30 border border-white/10 font-mono text-xs overflow-x-auto">
              <code>./scripts/run-tests-before-deploy.sh && npm run build:no-test</code>
            </div>
            <p>
              The test runner script checks the <code className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-300">SKIP_DEPLOY_TESTS</code> environment 
              variable. Set it to <code className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-300">true</code> to skip tests.
            </p>
            <p className="text-white/60 text-xs">
              Note: This admin toggle updates the database setting. For the toggle to affect deployments, 
              your build script should query this API endpoint to determine whether to run tests.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
