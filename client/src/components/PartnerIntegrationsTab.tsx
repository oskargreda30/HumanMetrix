import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Webhook, Link2, FileSpreadsheet, Plus, Trash2, RefreshCw, Copy, Check, Eye, EyeOff, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";

interface PartnerWebhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  maxRetries: number;
  retryDelaySeconds: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  consecutiveFailures: number;
  lastTriggeredAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  createdAt: string;
}

interface AtsIntegration {
  id: string;
  provider: string;
  name: string;
  baseUrl: string | null;
  credentials: { configured: boolean } | null;
  fieldMapping: Record<string, any> | null;
  syncMode: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

interface ScheduledExport {
  id: string;
  name: string;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  timeOfDay: string;
  timezone: string;
  exportType: string;
  deliveryMethod: string;
  deliveryEmail: string | null;
  deliveryWebhookUrl: string | null;
  isActive: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
}

interface WebhookDeliveryLog {
  id: string;
  eventType: string;
  status: string;
  httpStatus: number | null;
  errorMessage: string | null;
  attemptNumber: number;
  createdAt: string;
  deliveredAt: string | null;
}

const WEBHOOK_EVENTS = [
  { value: "assessment.started", label: "Assessment Started" },
  { value: "assessment.completed", label: "Assessment Completed" },
  { value: "session.created", label: "Session Created" },
  { value: "session.expired", label: "Session Expired" },
  { value: "results.ready", label: "Results Ready" },
];

const ATS_PROVIDERS = [
  { value: "greenhouse", label: "Greenhouse" },
  { value: "lever", label: "Lever" },
  { value: "workday", label: "Workday" },
  { value: "sap_successfactors", label: "SAP SuccessFactors" },
  { value: "oracle_hcm", label: "Oracle HCM" },
  { value: "custom", label: "Custom API" },
];

const SYNC_MODES = [
  { value: "push", label: "Push to ATS" },
  { value: "pull", label: "Pull from ATS" },
  { value: "bidirectional", label: "Bidirectional" },
];

const EXPORT_SCHEDULES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const DELIVERY_METHODS = [
  { value: "email", label: "Email" },
  { value: "sftp", label: "SFTP" },
  { value: "s3", label: "Amazon S3" },
  { value: "webhook", label: "Webhook" },
];

const EXPORT_TYPES = [
  { value: "assessment_results", label: "Assessment Results" },
  { value: "session_summary", label: "Session Summary" },
  { value: "usage_report", label: "Usage Report" },
  { value: "billing_report", label: "Billing Report" },
];

export function PartnerIntegrationsTab() {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState("webhooks");
  
  // Webhook state
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<PartnerWebhook | null>(null);
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    events: [] as string[],
    maxRetries: 3,
    retryDelaySeconds: 60,
  });
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
  const [selectedWebhookForLogs, setSelectedWebhookForLogs] = useState<string | null>(null);

  // ATS state
  const [showAtsDialog, setShowAtsDialog] = useState(false);
  const [showAtsApiKey, setShowAtsApiKey] = useState(false);
  const [atsForm, setAtsForm] = useState({
    provider: "",
    name: "",
    baseUrl: "",
    apiKey: "",
    syncMode: "push",
  });

  // Export state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportForm, setExportForm] = useState({
    name: "",
    frequency: "daily",
    dayOfWeek: 1,
    dayOfMonth: 1,
    timeOfDay: "09:00",
    timezone: "UTC",
    exportType: "assessment_results",
    deliveryMethod: "email",
    deliveryEmail: "",
    deliveryWebhookUrl: "",
  });

  // Queries
  const { data: webhooks, isLoading: webhooksLoading } = useQuery<PartnerWebhook[]>({
    queryKey: ["/api/partner/me/webhooks"],
  });

  const { data: atsIntegrations, isLoading: atsLoading } = useQuery<AtsIntegration[]>({
    queryKey: ["/api/partner/me/ats-integrations"],
  });

  const { data: scheduledExports, isLoading: exportsLoading } = useQuery<ScheduledExport[]>({
    queryKey: ["/api/partner/me/scheduled-exports"],
  });

  const { data: webhookLogs } = useQuery<WebhookDeliveryLog[]>({
    queryKey: ["/api/partner/me/webhooks", selectedWebhookForLogs, "logs"],
    enabled: !!selectedWebhookForLogs,
  });

  // Mutations
  const createWebhookMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/partner/me/webhooks", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/webhooks"] });
      setNewWebhookSecret(data.secret);
      setShowWebhookDialog(false);
      toast({ title: "Webhook created", description: "Save the secret - it won't be shown again." });
    },
    onError: () => {
      toast({ title: "Failed to create webhook", variant: "destructive" });
    },
  });

  const updateWebhookMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/partner/me/webhooks/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/webhooks"] });
      setShowWebhookDialog(false);
      setEditingWebhook(null);
      toast({ title: "Webhook updated" });
    },
    onError: () => {
      toast({ title: "Failed to update webhook", variant: "destructive" });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/partner/me/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/webhooks"] });
      toast({ title: "Webhook deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete webhook", variant: "destructive" });
    },
  });

  // State for test webhook
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);

  const testWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/partner/me/webhooks/${id}/test`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/webhooks"] });
      setTestingWebhookId(null);
      if (data.success) {
        toast({ 
          title: "Test webhook sent", 
          description: `Delivered successfully (HTTP ${data.httpStatus})` 
        });
      } else {
        toast({ 
          title: "Test webhook failed", 
          description: data.message,
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      setTestingWebhookId(null);
      toast({ title: "Failed to test webhook", description: error.message, variant: "destructive" });
    },
  });

  const rotateSecretMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/partner/me/webhooks/${id}/rotate-secret`);
      return response.json();
    },
    onSuccess: (data) => {
      setNewWebhookSecret(data.secret);
      toast({ title: "Secret rotated", description: "Save the new secret - it won't be shown again." });
    },
    onError: () => {
      toast({ title: "Failed to rotate secret", variant: "destructive" });
    },
  });

  const createAtsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/partner/me/ats-integrations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/ats-integrations"] });
      setShowAtsDialog(false);
      toast({ title: "ATS integration created" });
    },
    onError: () => {
      toast({ title: "Failed to create ATS integration", variant: "destructive" });
    },
  });

  const deleteAtsMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/partner/me/ats-integrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/ats-integrations"] });
      toast({ title: "ATS integration deleted" });
    },
  });

  const createExportMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/partner/me/scheduled-exports", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/scheduled-exports"] });
      setShowExportDialog(false);
      toast({ title: "Scheduled export created" });
    },
    onError: () => {
      toast({ title: "Failed to create scheduled export", variant: "destructive" });
    },
  });

  const deleteExportMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/partner/me/scheduled-exports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/scheduled-exports"] });
      toast({ title: "Scheduled export deleted" });
    },
  });

  const handleCopySecret = async (secret: string) => {
    await navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleWebhookSubmit = () => {
    if (!webhookForm.name || !webhookForm.url || webhookForm.events.length === 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    if (editingWebhook) {
      updateWebhookMutation.mutate({
        id: editingWebhook.id,
        data: webhookForm,
      });
    } else {
      createWebhookMutation.mutate(webhookForm);
    }
  };

  const handleAtsSubmit = () => {
    if (!atsForm.provider || !atsForm.name) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    createAtsMutation.mutate({
      provider: atsForm.provider,
      name: atsForm.name,
      baseUrl: atsForm.baseUrl || null,
      credentials: atsForm.apiKey ? { apiKey: atsForm.apiKey } : null,
      syncMode: atsForm.syncMode,
    });
  };

  const handleExportSubmit = () => {
    if (!exportForm.name || !exportForm.deliveryMethod) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    createExportMutation.mutate({
      name: exportForm.name,
      frequency: exportForm.frequency,
      dayOfWeek: exportForm.frequency === "weekly" ? exportForm.dayOfWeek : null,
      dayOfMonth: exportForm.frequency === "monthly" ? exportForm.dayOfMonth : null,
      timeOfDay: exportForm.timeOfDay,
      timezone: exportForm.timezone,
      exportType: exportForm.exportType,
      deliveryMethod: exportForm.deliveryMethod,
      deliveryEmail: exportForm.deliveryMethod === "email" ? exportForm.deliveryEmail : null,
      deliveryWebhookUrl: exportForm.deliveryMethod === "webhook" ? exportForm.deliveryWebhookUrl : null,
    });
  };

  const toggleWebhookEvent = (event: string) => {
    setWebhookForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const openEditWebhook = (webhook: PartnerWebhook) => {
    setEditingWebhook(webhook);
    setWebhookForm({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      maxRetries: webhook.maxRetries,
      retryDelaySeconds: webhook.retryDelaySeconds,
    });
    setShowWebhookDialog(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "retrying":
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Configure webhooks, ATS connections, and scheduled data exports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto">
              <TabsTrigger value="webhooks" className="gap-2" data-testid="subtab-webhooks">
                <Webhook className="h-4 w-4" />
                Webhooks
              </TabsTrigger>
              <TabsTrigger value="ats" className="gap-2" data-testid="subtab-ats">
                <Link2 className="h-4 w-4" />
                ATS
              </TabsTrigger>
              <TabsTrigger value="exports" className="gap-2" data-testid="subtab-exports">
                <FileSpreadsheet className="h-4 w-4" />
                Exports
              </TabsTrigger>
            </TabsList>

            <TabsContent value="webhooks" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Receive real-time notifications when assessment events occur
                </p>
                <Button onClick={() => {
                  setEditingWebhook(null);
                  setWebhookForm({ name: "", url: "", events: [], maxRetries: 3, retryDelaySeconds: 60 });
                  setShowWebhookDialog(true);
                }} data-testid="button-add-webhook">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Webhook
                </Button>
              </div>

              {webhooksLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : webhooks && webhooks.length > 0 ? (
                <div className="space-y-3">
                  {webhooks.map((webhook) => (
                    <Card key={webhook.id} data-testid={`webhook-${webhook.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{webhook.name}</h4>
                              <Badge variant={webhook.isActive ? "default" : "secondary"}>
                                {webhook.isActive ? "Active" : "Inactive"}
                              </Badge>
                              {webhook.consecutiveFailures > 0 && (
                                <Badge variant="destructive">
                                  {webhook.consecutiveFailures} failures
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{webhook.url}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {webhook.events.map((event) => (
                                <Badge key={event} variant="outline" className="text-xs">
                                  {event}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>{webhook.totalDeliveries} deliveries</span>
                              <span>{webhook.successfulDeliveries} successful</span>
                              {webhook.lastTriggeredAt && (
                                <span>Last: {new Date(webhook.lastTriggeredAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTestingWebhookId(webhook.id);
                                testWebhookMutation.mutate(webhook.id);
                              }}
                              disabled={testingWebhookId === webhook.id || !webhook.isActive}
                              data-testid={`button-test-webhook-${webhook.id}`}
                            >
                              {testingWebhookId === webhook.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                              ) : (
                                <Webhook className="h-4 w-4 mr-1.5" />
                              )}
                              Test
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedWebhookForLogs(webhook.id)}
                              data-testid={`button-webhook-logs-${webhook.id}`}
                              title="View delivery logs"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => rotateSecretMutation.mutate(webhook.id)}
                              disabled={rotateSecretMutation.isPending}
                              data-testid={`button-rotate-secret-${webhook.id}`}
                              title="Rotate secret"
                            >
                              <RefreshCw className={`h-4 w-4 ${rotateSecretMutation.isPending ? "animate-spin" : ""}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditWebhook(webhook)}
                              data-testid={`button-edit-webhook-${webhook.id}`}
                            >
                              <Webhook className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                              disabled={deleteWebhookMutation.isPending}
                              data-testid={`button-delete-webhook-${webhook.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No webhooks configured</p>
                    <p className="text-sm">Add a webhook to receive real-time event notifications</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="ats" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Connect to your Applicant Tracking System
                </p>
                <Button onClick={() => {
                  setAtsForm({ provider: "", name: "", baseUrl: "", apiKey: "", syncMode: "push" });
                  setShowAtsDialog(true);
                }} data-testid="button-add-ats">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Integration
                </Button>
              </div>

              {atsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : atsIntegrations && atsIntegrations.length > 0 ? (
                <div className="space-y-3">
                  {atsIntegrations.map((integration) => (
                    <Card key={integration.id} data-testid={`ats-${integration.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{integration.name}</h4>
                              <Badge variant={integration.isActive ? "default" : "secondary"}>
                                {integration.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {ATS_PROVIDERS.find(p => p.value === integration.provider)?.label || integration.provider}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Mode: {integration.syncMode}</span>
                              {integration.credentials?.configured && (
                                <Badge variant="outline" className="text-xs">Credentials configured</Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAtsMutation.mutate(integration.id)}
                            disabled={deleteAtsMutation.isPending}
                            data-testid={`button-delete-ats-${integration.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No ATS integrations configured</p>
                    <p className="text-sm">Connect your ATS to sync candidate data</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="exports" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Schedule automated data exports to your systems
                </p>
                <Button onClick={() => {
                  setExportForm({
                    name: "",
                    frequency: "daily",
                    dayOfWeek: 1,
                    dayOfMonth: 1,
                    timeOfDay: "09:00",
                    timezone: "UTC",
                    exportType: "assessment_results",
                    deliveryMethod: "email",
                    deliveryEmail: "",
                    deliveryWebhookUrl: "",
                  });
                  setShowExportDialog(true);
                }} data-testid="button-add-export">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Export
                </Button>
              </div>

              {exportsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : scheduledExports && scheduledExports.length > 0 ? (
                <div className="space-y-3">
                  {scheduledExports.map((exportConfig) => (
                    <Card key={exportConfig.id} data-testid={`export-${exportConfig.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{exportConfig.name}</h4>
                              <Badge variant={exportConfig.isActive ? "default" : "secondary"}>
                                {exportConfig.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {EXPORT_TYPES.find(t => t.value === exportConfig.exportType)?.label} via{" "}
                              {DELIVERY_METHODS.find(m => m.value === exportConfig.deliveryMethod)?.label}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Frequency: {exportConfig.frequency} at {exportConfig.timeOfDay}</span>
                              {exportConfig.nextRunAt && (
                                <span>Next: {new Date(exportConfig.nextRunAt).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteExportMutation.mutate(exportConfig.id)}
                            disabled={deleteExportMutation.isPending}
                            data-testid={`button-delete-export-${exportConfig.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No scheduled exports configured</p>
                    <p className="text-sm">Set up automated data exports to your systems</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Webhook Dialog */}
      <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingWebhook ? "Edit Webhook" : "Add Webhook"}</DialogTitle>
            <DialogDescription>
              Configure webhook endpoint to receive event notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-name">Name</Label>
              <Input
                id="webhook-name"
                value={webhookForm.name}
                onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                placeholder="My Webhook"
                data-testid="input-webhook-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL</Label>
              <Input
                id="webhook-url"
                value={webhookForm.url}
                onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                placeholder="https://api.example.com/webhook"
                data-testid="input-webhook-url"
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <Badge
                    key={event.value}
                    variant={webhookForm.events.includes(event.value) ? "default" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => toggleWebhookEvent(event.value)}
                    data-testid={`event-${event.value}`}
                  >
                    {event.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-retries">Max Retries</Label>
                <Input
                  id="max-retries"
                  type="number"
                  min={0}
                  max={10}
                  value={webhookForm.maxRetries}
                  onChange={(e) => setWebhookForm({ ...webhookForm, maxRetries: parseInt(e.target.value) || 3 })}
                  data-testid="input-max-retries"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retry-delay">Retry Delay (seconds)</Label>
                <Input
                  id="retry-delay"
                  type="number"
                  min={10}
                  max={3600}
                  value={webhookForm.retryDelaySeconds}
                  onChange={(e) => setWebhookForm({ ...webhookForm, retryDelaySeconds: parseInt(e.target.value) || 60 })}
                  data-testid="input-retry-delay"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWebhookDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleWebhookSubmit}
              disabled={createWebhookMutation.isPending || updateWebhookMutation.isPending}
              data-testid="button-save-webhook"
            >
              {(createWebhookMutation.isPending || updateWebhookMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingWebhook ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Secret Dialog */}
      <Dialog open={!!newWebhookSecret} onOpenChange={() => setNewWebhookSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webhook Secret</DialogTitle>
            <DialogDescription>
              Copy this secret to verify webhook signatures. It won't be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm break-all">
              <code data-testid="text-webhook-secret">
                {showSecret ? newWebhookSecret : "••••••••••••••••••••••••••••••••"}
              </code>
              <Button variant="ghost" size="icon" onClick={() => setShowSecret(!showSecret)}>
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => newWebhookSecret && handleCopySecret(newWebhookSecret)}>
              {copiedSecret ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copiedSecret ? "Copied!" : "Copy Secret"}
            </Button>
            <Button onClick={() => setNewWebhookSecret(null)} data-testid="button-close-secret">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webhook Logs Dialog */}
      <Dialog open={!!selectedWebhookForLogs} onOpenChange={() => setSelectedWebhookForLogs(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delivery Logs</DialogTitle>
            <DialogDescription>Recent webhook delivery attempts</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {webhookLogs && webhookLogs.length > 0 ? (
              webhookLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-3 border rounded-lg text-sm">
                  {getStatusIcon(log.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.eventType}</span>
                      <Badge variant="outline" className="text-xs">
                        {log.status}
                      </Badge>
                      {log.httpStatus && (
                        <Badge variant="outline" className="text-xs">
                          HTTP {log.httpStatus}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()} - Attempt {log.attemptNumber}
                    </p>
                    {log.errorMessage && (
                      <p className="text-xs text-destructive mt-1">{log.errorMessage}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No delivery logs yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ATS Dialog */}
      <Dialog open={showAtsDialog} onOpenChange={setShowAtsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add ATS Integration</DialogTitle>
            <DialogDescription>
              Connect to your Applicant Tracking System
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={atsForm.provider} onValueChange={(v) => setAtsForm({ ...atsForm, provider: v })}>
                <SelectTrigger data-testid="select-ats-provider">
                  <SelectValue placeholder="Select ATS provider" />
                </SelectTrigger>
                <SelectContent>
                  {ATS_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ats-name">Integration Name</Label>
              <Input
                id="ats-name"
                value={atsForm.name}
                onChange={(e) => setAtsForm({ ...atsForm, name: e.target.value })}
                placeholder="Production ATS"
                data-testid="input-ats-name"
              />
            </div>
            {atsForm.provider === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="ats-url">Base URL</Label>
                <Input
                  id="ats-url"
                  value={atsForm.baseUrl}
                  onChange={(e) => setAtsForm({ ...atsForm, baseUrl: e.target.value })}
                  placeholder="https://api.ats.example.com"
                  data-testid="input-ats-url"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="ats-apikey">API Key</Label>
              <div className="relative">
                <Input
                  id="ats-apikey"
                  type={showAtsApiKey ? "text" : "password"}
                  value={atsForm.apiKey}
                  onChange={(e) => setAtsForm({ ...atsForm, apiKey: e.target.value })}
                  placeholder="Enter API key"
                  data-testid="input-ats-apikey"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAtsApiKey(!showAtsApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-toggle-ats-apikey"
                >
                  {showAtsApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sync Mode</Label>
              <Select value={atsForm.syncMode} onValueChange={(v) => setAtsForm({ ...atsForm, syncMode: v })}>
                <SelectTrigger data-testid="select-sync-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYNC_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAtsDialog(false)}>Cancel</Button>
            <Button
              onClick={handleAtsSubmit}
              disabled={createAtsMutation.isPending}
              data-testid="button-save-ats"
            >
              {createAtsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Scheduled Export</DialogTitle>
            <DialogDescription>
              Configure automated data export
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="export-name">Name</Label>
              <Input
                id="export-name"
                value={exportForm.name}
                onChange={(e) => setExportForm({ ...exportForm, name: e.target.value })}
                placeholder="Weekly Results Export"
                data-testid="input-export-name"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Export Type</Label>
                <Select value={exportForm.exportType} onValueChange={(v) => setExportForm({ ...exportForm, exportType: v })}>
                  <SelectTrigger data-testid="select-export-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPORT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={exportForm.frequency} onValueChange={(v) => setExportForm({ ...exportForm, frequency: v })}>
                  <SelectTrigger data-testid="select-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPORT_SCHEDULES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {exportForm.frequency === "weekly" && (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select value={String(exportForm.dayOfWeek)} onValueChange={(v) => setExportForm({ ...exportForm, dayOfWeek: parseInt(v) })}>
                  <SelectTrigger data-testid="select-day-of-week">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="time-of-day">Time of Day</Label>
              <Input
                id="time-of-day"
                type="time"
                value={exportForm.timeOfDay}
                onChange={(e) => setExportForm({ ...exportForm, timeOfDay: e.target.value })}
                data-testid="input-time-of-day"
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery Method</Label>
              <Select value={exportForm.deliveryMethod} onValueChange={(v) => setExportForm({ ...exportForm, deliveryMethod: v })}>
                <SelectTrigger data-testid="select-delivery-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {exportForm.deliveryMethod === "email" && (
              <div className="space-y-2">
                <Label htmlFor="export-email">Email Address</Label>
                <Input
                  id="export-email"
                  type="email"
                  value={exportForm.deliveryEmail}
                  onChange={(e) => setExportForm({ ...exportForm, deliveryEmail: e.target.value })}
                  placeholder="reports@company.com"
                  data-testid="input-export-email"
                />
              </div>
            )}
            {exportForm.deliveryMethod === "webhook" && (
              <div className="space-y-2">
                <Label htmlFor="export-webhook-url">Webhook URL</Label>
                <Input
                  id="export-webhook-url"
                  type="url"
                  value={exportForm.deliveryWebhookUrl}
                  onChange={(e) => setExportForm({ ...exportForm, deliveryWebhookUrl: e.target.value })}
                  placeholder="https://api.company.com/exports"
                  data-testid="input-export-webhook-url"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancel</Button>
            <Button
              onClick={handleExportSubmit}
              disabled={createExportMutation.isPending}
              data-testid="button-save-export"
            >
              {createExportMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
