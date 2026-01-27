import { useState, useMemo, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Key, Webhook, TestTube, Plus, RefreshCw, Trash2, Shield, Clock, AlertTriangle, Loader2, Info, Lock, CreditCard, Code, Copy, Check, Play, ExternalLink, FileJson, Eye } from "lucide-react";

// Lazy load Swagger UI for better performance
const SwaggerUI = lazy(() => import("swagger-ui-react"));
import "swagger-ui-react/swagger-ui.css";

// Helper component for info tooltips - accessible with keyboard
function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="More information"
        >
          <Info className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-muted-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface ApiKey {
  id: string;
  name: string;
  environment: string;
  keyPrefix: string;
  keyHint: string;
  displayKey: string;
  permissions: string[];
  rateLimit: number;
  lastUsedAt: string | null;
  createdAt: string;
  organisationId: string | null;
}

interface ApiKeysData {
  hasPartnerAccount: boolean;
  apiKeys: ApiKey[];
}

interface DeveloperSubTabsProps {
  apiKeys: ApiKeysData | undefined;
  apiKeysLoading: boolean;
  onCreateTestKey: () => void;
  onCreateLiveKey: () => void;
  onRotateKey: (id: string) => void;
  onRevokeKey: (id: string) => void;
  rotatingKeyId: string | null;
  revokingKeyId: string | null;
  creatingKeyType: 'test' | 'live' | null;
  newKeyData: { fullKey: string; environment: string } | null;
  onClearNewKey: () => void;
  onReactivateKey: () => void;
  billingType?: string;
  hasCardOnFile?: boolean;
  onAddPaymentMethod?: () => void;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function DeveloperSubTabs({
  apiKeys,
  apiKeysLoading,
  onCreateTestKey,
  onCreateLiveKey,
  onRotateKey,
  onRevokeKey,
  rotatingKeyId,
  revokingKeyId,
  creatingKeyType,
  newKeyData,
  onClearNewKey,
  onReactivateKey,
  billingType,
  hasCardOnFile,
  onAddPaymentMethod,
}: DeveloperSubTabsProps) {
  const [activeSubTab, setActiveSubTab] = useState("api-keys");
  const [sandboxSubTab, setSandboxSubTab] = useState("widget");
  const [widgetTheme, setWidgetTheme] = useState<'dark' | 'light'>('dark');
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>(['fit']);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [showWidgetPreview, setShowWidgetPreview] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);

  const isSubscriptionBilling = billingType === 'subscription';
  const canCreateLiveKey = !isSubscriptionBilling || hasCardOnFile === true;

  // Get a test API key for the widget sandbox
  const testApiKey = useMemo(() => {
    if (!apiKeys?.apiKeys) return null;
    const testKey = apiKeys.apiKeys.find(k => k.environment === 'test');
    return testKey?.displayKey || null;
  }, [apiKeys]);

  // Toggle assessment selection
  const toggleAssessment = (type: string) => {
    setSelectedAssessments(prev => {
      if (prev.includes(type)) {
        // Don't allow deselecting the last one
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      }
      return [...prev, type];
    });
  };

  // Generate widget code snippet
  const widgetCodeSnippet = useMemo(() => {
    const apiKeyPlaceholder = testApiKey || 'hm_test_YOUR_API_KEY';
    const assessmentTypesArray = selectedAssessments.map(t => `'${t}'`).join(', ');
    const isSingleAssessment = selectedAssessments.length === 1;
    
    return `<!-- Add this script to your page -->
<script src="${window.location.origin}/embed/widget.js"></script>

<!-- Initialize the widget -->
<script>
  HumanMetrixWidget.init({
    apiKey: '${apiKeyPlaceholder}',
    ${isSingleAssessment 
      ? `assessmentType: '${selectedAssessments[0]}'`
      : `assessmentTypes: [${assessmentTypesArray}]`},
    theme: '${widgetTheme}',
    candidateEmail: 'candidate@example.com', // optional
    onComplete: function(results) {
      console.log('Assessment completed:', results);
      // Handle completion - results include scores${!isSingleAssessment ? `
      // For multi-assessment widgets, this fires after ALL assessments complete` : ''}
    },
    onError: function(error) {
      console.error('Error:', error);
    }
  });
</script>`;
  }, [testApiKey, selectedAssessments, widgetTheme]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-cyan-500/20">
          <Key className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Developer Hub</h2>
          <p className="text-sm text-white/70">API keys, integrations, and testing tools</p>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="api-keys" data-testid="subtab-api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="integrations" data-testid="subtab-integrations" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="sandbox" data-testid="subtab-sandbox" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Sandbox
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-6" data-testid="subpanel-api-keys">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>API Keys</CardTitle>
                  <InfoTooltip content="API keys authenticate your applications with HumanMetrix. Use 'test' keys for development (no charges) and 'live' keys for production. Rotate keys periodically for security." />
                </div>
                <CardDescription>Manage your API keys for accessing the HumanMetrix API</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={onCreateTestKey}
                  variant="outline"
                  disabled={creatingKeyType !== null}
                  data-testid="button-create-test-key"
                >
                  {creatingKeyType === 'test' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                  Create Test Key
                </Button>
                {canCreateLiveKey ? (
                  <Button 
                    onClick={onCreateLiveKey}
                    className="bg-cyan-600 hover:bg-cyan-700"
                    disabled={creatingKeyType !== null}
                    data-testid="button-create-live-key"
                  >
                    {creatingKeyType === 'live' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    Create Live Key
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>
                        <Button 
                          className="bg-slate-600 cursor-not-allowed"
                          disabled
                          data-testid="button-create-live-key-disabled"
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Create Live Key
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">Add a payment method to create live API keys. Subscription accounts require a card on file for production access.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isSubscriptionBilling && !hasCardOnFile && (
                <div className="mb-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      Payment method required for live keys
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Subscription accounts must have a payment method on file before creating live API keys.
                    </p>
                    {onAddPaymentMethod && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-2"
                        onClick={onAddPaymentMethod}
                        data-testid="button-add-payment-method-cta"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Add Payment Method
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {apiKeysLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : apiKeys?.apiKeys && apiKeys.apiKeys.length > 0 ? (
                <div className="space-y-4">
                  {apiKeys.apiKeys.map((key) => (
                    <div 
                      key={key.id} 
                      className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                      data-testid={`api-key-row-${key.id}`}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{key.name}</span>
                          <Badge 
                            variant={key.environment === 'live' ? 'default' : 'secondary'}
                            className={key.environment === 'live' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
                          >
                            {key.environment}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                          <Key className="h-3 w-3" />
                          <span>{key.displayKey}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Created: {formatDate(key.createdAt)}</span>
                          {key.lastUsedAt && (
                            <span>Last used: {formatDate(key.lastUsedAt)}</span>
                          )}
                          <span>Rate limit: {key.rateLimit}/min</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRotateKey(key.id)}
                          disabled={rotatingKeyId === key.id}
                          data-testid={`button-rotate-key-${key.id}`}
                        >
                          {rotatingKeyId === key.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          <span className="ml-1.5">Rotate</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onRevokeKey(key.id)}
                          disabled={revokingKeyId === key.id}
                          data-testid={`button-revoke-key-${key.id}`}
                        >
                          {revokingKeyId === key.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="ml-1.5">Revoke</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No API keys yet</p>
                  <p className="text-sm mt-1">API keys let you integrate HumanMetrix into your applications.</p>
                  <div className="flex gap-2 justify-center mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={onCreateTestKey}
                      disabled={creatingKeyType !== null}
                    >
                      Create Test Key
                    </Button>
                    {canCreateLiveKey ? (
                      <Button 
                        size="sm"
                        className="bg-cyan-600 hover:bg-cyan-700"
                        onClick={onCreateLiveKey}
                        disabled={creatingKeyType !== null}
                      >
                        Create Live Key
                      </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0}>
                            <Button 
                              size="sm"
                              className="bg-slate-600 cursor-not-allowed"
                              disabled
                            >
                              <Lock className="h-4 w-4 mr-1" />
                              Create Live Key
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">Add a payment method to create live API keys.</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-cyan-500" />
                Security Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Keep your API keys secure:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Never share your API keys or commit them to version control</li>
                <li>Use test keys during development and live keys only in production</li>
                <li>Rotate your keys regularly and immediately if you suspect they may be compromised</li>
                <li>Use environment-specific keys for different deployment environments</li>
                <li>Consider creating separate keys for each integration or application</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4" data-testid="subpanel-integrations">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <Webhook className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <CardTitle>Integrations</CardTitle>
                  <CardDescription>
                    Webhooks, ATS connections, and scheduled exports
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Webhook className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Webhook notifications, ATS integrations (Greenhouse, Lever, Workday, and more), 
                  and scheduled CSV exports are currently in development.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground">Webhooks</span>
                  <span className="px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground">ATS Sync</span>
                  <span className="px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground">Scheduled Exports</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sandbox" className="space-y-4" data-testid="subpanel-sandbox">
          {/* Nested Sandbox Tabs */}
          <Tabs value={sandboxSubTab} onValueChange={setSandboxSubTab} className="w-full">
            <TabsList className="inline-flex h-11 items-center justify-center rounded-lg bg-muted/50 p-1 mb-4">
              <TabsTrigger 
                value="widget" 
                data-testid="sandbox-subtab-widget" 
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Code className="h-4 w-4" />
                Widget Sandbox
              </TabsTrigger>
              <TabsTrigger 
                value="api" 
                data-testid="sandbox-subtab-api" 
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <FileJson className="h-4 w-4" />
                API Sandbox
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                data-testid="sandbox-subtab-preview" 
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Eye className="h-4 w-4" />
                Assessment Preview
              </TabsTrigger>
            </TabsList>

            {/* Widget Sandbox Tab */}
            <TabsContent value="widget" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10">
                      <Code className="h-5 w-5 text-cyan-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>Widget Sandbox</CardTitle>
                        <InfoTooltip content="Test the embeddable widget with your API key before deploying to your website. Uses test mode - no credits consumed." />
                      </div>
                      <CardDescription>
                        Preview and test the embeddable assessment widget
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Configuration Section */}
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Assessment Types</label>
                        <Badge variant="outline" className="text-xs">
                          {selectedAssessments.length} selected
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select multiple assessments to run them in sequence. Each assessment uses 1 credit.
                      </p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {[
                          { id: 'fit', label: 'FIT - Behavioural Assessment', desc: '6 core skills' },
                          { id: 'ai_readiness', label: 'AI Readiness', desc: '9 AI skills' },
                          { id: 'prompt_architecture', label: 'Prompt Architecture', desc: '7 levels' },
                          { id: 'aiq', label: 'AIQ - Ethics & Integrity', desc: '4 dimensions' },
                        ].map(assessment => (
                          <button
                            key={assessment.id}
                            type="button"
                            onClick={() => toggleAssessment(assessment.id)}
                            className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                              selectedAssessments.includes(assessment.id)
                                ? 'border-cyan-500 bg-cyan-500/10'
                                : 'border-border hover:border-muted-foreground/50'
                            }`}
                            data-testid={`checkbox-assessment-${assessment.id}`}
                          >
                            <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center ${
                              selectedAssessments.includes(assessment.id)
                                ? 'bg-cyan-500 border-cyan-500'
                                : 'border-muted-foreground/50'
                            }`}>
                              {selectedAssessments.includes(assessment.id) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{assessment.label}</p>
                              <p className="text-xs text-muted-foreground">{assessment.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      {selectedAssessments.length > 1 && (
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <p className="text-sm text-blue-400">
                            <strong>Multi-assessment mode:</strong> Candidates will complete assessments in order. 
                            After each assessment, they'll see a brief completion screen before the next one loads automatically.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Theme</label>
                      <Select value={widgetTheme} onValueChange={(v) => setWidgetTheme(v as 'dark' | 'light')}>
                        <SelectTrigger data-testid="select-widget-theme">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* API Key Status */}
                  {!testApiKey ? (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          Test API key required
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Create a test API key to use the widget sandbox. Test keys don't consume credits.
                        </p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => {
                            setActiveSubTab('api-keys');
                            onCreateTestKey();
                          }}
                          disabled={creatingKeyType !== null}
                          data-testid="button-create-test-key-widget"
                        >
                          {creatingKeyType === 'test' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                          Create Test Key
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          Test API key ready
                        </p>
                        <p className="text-xs text-muted-foreground font-mono mt-1">{testApiKey}</p>
                      </div>
                    </div>
                  )}

                  {/* Code Snippet */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Integration Code</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(widgetCodeSnippet)}
                        data-testid="button-copy-widget-code"
                      >
                        {copiedSnippet ? (
                          <>
                            <Check className="h-4 w-4 mr-1.5 text-green-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1.5" />
                            Copy Code
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 text-xs overflow-x-auto font-mono">
                      <code data-testid="code-widget-snippet">{widgetCodeSnippet}</code>
                    </pre>
                  </div>

                  {/* Preview Button */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => {
                        if (!showWidgetPreview) {
                          setIframeLoading(true);
                        }
                        setShowWidgetPreview(!showWidgetPreview);
                      }}
                      disabled={!testApiKey}
                      className="bg-cyan-600 hover:bg-cyan-700"
                      data-testid="button-toggle-widget-preview"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {showWidgetPreview ? 'Hide Preview' : 'Launch Widget Preview'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(`/embed/assessment?demo=true&types=${selectedAssessments.join(',')}&theme=${widgetTheme}`, '_blank')}
                      data-testid="button-open-fullscreen-preview"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>

                  {/* Live Preview */}
                  {showWidgetPreview && testApiKey && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Live Preview</label>
                        <Badge variant="outline" className="text-xs">Test Mode - No credits consumed</Badge>
                      </div>
                      <div 
                        className={`relative rounded-lg border-2 overflow-hidden ${widgetTheme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}
                        style={{ height: '650px' }}
                        data-testid="widget-preview-container"
                      >
                        {iframeLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-800/90 z-10">
                            <div className="text-center">
                              <Loader2 className="h-8 w-8 animate-spin text-cyan-500 mx-auto mb-2" />
                              <p className="text-slate-400 text-sm">Loading widget...</p>
                            </div>
                          </div>
                        )}
                        <iframe
                          src={`/embed/assessment?demo=true&types=${selectedAssessments.join(',')}&theme=${widgetTheme}`}
                          className="w-full h-full border-0"
                          title="Widget Preview"
                          data-testid="widget-preview-iframe"
                          onLoad={() => setIframeLoading(false)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        This is a demo preview. In production, the widget will create real assessment sessions.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Sandbox Tab */}
            <TabsContent value="api" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <FileJson className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>API Sandbox</CardTitle>
                        <InfoTooltip content="Interactive API documentation with Swagger UI. Test API endpoints directly from your browser using your test API key." />
                      </div>
                      <CardDescription>
                        Explore and test the HumanMetrix Partner API
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!testApiKey ? (
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          Test API key required for API testing
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Create a test API key to try out API endpoints. Test keys don't consume credits.
                        </p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => {
                            setActiveSubTab('api-keys');
                            onCreateTestKey();
                          }}
                          disabled={creatingKeyType !== null}
                          data-testid="button-create-test-key-api"
                        >
                          {creatingKeyType === 'test' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                          Create Test Key
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            Ready to test API endpoints
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            Use your test key: {testApiKey}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-lg border overflow-hidden bg-white" style={{ minHeight: '600px' }}>
                        <Suspense fallback={
                          <div className="flex items-center justify-center py-20">
                            <div className="text-center">
                              <Loader2 className="h-8 w-8 animate-spin text-cyan-500 mx-auto mb-2" />
                              <p className="text-muted-foreground text-sm">Loading API documentation...</p>
                            </div>
                          </div>
                        }>
                          <SwaggerUI 
                            url="/api/partner/openapi.json"
                            docExpansion="list"
                            defaultModelsExpandDepth={-1}
                            tryItOutEnabled={true}
                          />
                        </Suspense>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Use "Authorize" button above to set your API key, then click "Try it out" on any endpoint.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Assessment Preview Tab */}
            <TabsContent value="preview" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Eye className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>Assessment Preview</CardTitle>
                        <InfoTooltip content="Preview each assessment type to understand the candidate experience. These are samples only - no scores recorded." />
                      </div>
                      <CardDescription>
                        See sample questions from each assessment type
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-6">
                    Get a sneak peek at each assessment type to understand the candidate experience. 
                    These are preview samples only - no scores will be recorded.
                  </p>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-2 border-dashed hover-elevate">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-cyan-500/10 text-cyan-600 border-cyan-500/30">FIT</Badge>
                          <Badge variant="outline" className="text-xs">40 questions</Badge>
                        </div>
                        <CardTitle className="text-lg mt-2">Behavioural FIT Assessment</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Measures workplace behaviour patterns and cultural fit across adaptability, 
                          collaboration, initiative, and other key competencies.
                        </p>
                        <div className="p-3 rounded-lg bg-muted/50 border">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Sample Question:</p>
                          <p className="text-sm">
                            "When facing a challenging deadline, I typically..."
                          </p>
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <p>A. Work independently to maximize focus</p>
                            <p>B. Collaborate with team members for support</p>
                            <p>C. Break tasks into smaller manageable steps</p>
                            <p>D. Communicate proactively about progress</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>~15 minutes to complete</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-dashed hover-elevate">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/30">AI Readiness</Badge>
                          <Badge variant="outline" className="text-xs">30 questions</Badge>
                        </div>
                        <CardTitle className="text-lg mt-2">AI Readiness Assessment</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Evaluates preparedness for AI-driven work environments, measuring adaptability 
                          to AI tools and comfort with AI-augmented workflows.
                        </p>
                        <div className="p-3 rounded-lg bg-muted/50 border">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Sample Question:</p>
                          <p className="text-sm">
                            "When a new AI tool is introduced at work, I..."
                          </p>
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <p>A. Immediately explore its capabilities</p>
                            <p>B. Wait for training before trying it</p>
                            <p>C. Prefer sticking to familiar methods</p>
                            <p>D. Research reviews and best practices first</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>~12 minutes to complete</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-dashed hover-elevate">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30">Prompt Architecture</Badge>
                          <Badge variant="outline" className="text-xs">7 levels</Badge>
                        </div>
                        <CardTitle className="text-lg mt-2">Prompt Architecture Assessment</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Tests ability to craft effective AI prompts through progressively challenging 
                          scenarios, from basic instructions to complex multi-step tasks.
                        </p>
                        <div className="p-3 rounded-lg bg-muted/50 border">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Sample Scenario:</p>
                          <p className="text-sm mb-2">
                            <span className="font-medium">Level 1 - Basic Instruction:</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            "You're a marketing manager. Write a prompt that asks an AI to create 
                            3 subject lines for an email campaign about a summer sale."
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>~25 minutes to complete (2 min per level)</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-dashed hover-elevate">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">AIQ</Badge>
                          <Badge variant="outline" className="text-xs">15 questions</Badge>
                        </div>
                        <CardTitle className="text-lg mt-2">Algorithmic Integrity Quotient</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Measures understanding of AI ethics, bias awareness, and responsible AI usage. 
                          Assesses critical thinking about AI limitations and implications.
                        </p>
                        <div className="p-3 rounded-lg bg-muted/50 border">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Sample Question:</p>
                          <p className="text-sm">
                            "When an AI system makes a decision that seems unfair, I would..."
                          </p>
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <p>A. Trust the AI's judgement without question</p>
                            <p>B. Question the training data and methodology</p>
                            <p>C. Escalate to a human decision-maker</p>
                            <p>D. Document the issue for review</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>~10 minutes to complete</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Ready to deploy assessments?</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          These previews show the format only. To send real assessments to candidates, 
                          create an API key and use our SDK or API to create assessment sessions.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3"
                          onClick={() => {
                            setActiveSubTab('api-keys');
                            setTimeout(() => {
                              document.querySelector('[data-value="api-keys"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 50);
                          }}
                          data-testid="button-sandbox-to-api"
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Set up API Keys
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
