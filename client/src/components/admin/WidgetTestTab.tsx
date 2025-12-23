import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Play, RefreshCw, Code2, Puzzle, Copy, Check, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Partner {
  id: number;
  name: string;
  companyName: string;
  email: string;
  isActive: boolean;
}

interface ApiKey {
  id: number;
  keyPrefix: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt: string | null;
}

interface TestSession {
  sessionId: string;
  assessmentType: string;
  status: string;
  widgetUrl: string;
  expiresAt: string;
}

export default function WidgetTestTab() {
  const { toast } = useToast();
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [assessmentType, setAssessmentType] = useState<string>("fit");
  const [testEmail, setTestEmail] = useState<string>("test@example.com");
  const [currentSession, setCurrentSession] = useState<TestSession | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [widgetTheme, setWidgetTheme] = useState<string>("light");
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  const { data: partners, isLoading: partnersLoading } = useQuery<Partner[]>({
    queryKey: ["/api/admin/partners"],
  });

  const { data: apiKeys, isLoading: keysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/admin/partners", selectedPartnerId, "keys"],
    enabled: !!selectedPartnerId,
  });

  const createTestSessionMutation = useMutation({
    mutationFn: async (data: { partnerId: string; apiKeyId: string; assessmentType: string; email: string }) => {
      const response = await apiRequest("POST", "/api/admin/widget-test/session", data);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSession(data);
      toast({
        title: "Test Session Created",
        description: `Session ID: ${data.sessionId}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Session",
        description: error.message || "Could not create test session",
        variant: "destructive",
      });
    },
  });

  const loadWidget = () => {
    if (!currentSession || !widgetContainerRef.current) return;

    const container = widgetContainerRef.current;
    container.innerHTML = `
      <div class="flex items-center justify-center p-8 text-slate-400">
        <div class="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full mr-3"></div>
        Loading widget...
      </div>
    `;

    (window as any).HM_BASE_URL = window.location.origin;

    const initWidget = () => {
      if ((window as any).HumanMetrix) {
        container.innerHTML = '';
        (window as any).HumanMetrix.init({
          sessionId: currentSession.sessionId,
          container: container,
          theme: widgetTheme,
          onComplete: (result: any) => {
            toast({
              title: "Assessment Completed",
              description: `Score: ${result.totalScore || "N/A"}%`,
            });
          },
          onError: (error: any) => {
            toast({
              title: "Widget Error",
              description: error.message,
              variant: "destructive",
            });
          },
        });
      }
    };

    if ((window as any).HumanMetrix) {
      initWidget();
    } else {
      const existingScript = document.querySelector('script[src*="widget.js"]');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement("script");
      script.src = "/embed/widget.js?" + Date.now();
      script.onload = initWidget;
      document.head.appendChild(script);
    }
  };

  useEffect(() => {
    if (currentSession && widgetContainerRef.current) {
      loadWidget();
    }
  }, [currentSession, widgetTheme]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const widgetEmbedCode = currentSession
    ? `<script src="${window.location.origin}/embed/widget.js" 
        data-session-id="${currentSession.sessionId}"
        data-theme="${widgetTheme}"></script>
<div id="humanmetrix-widget"></div>`
    : "";

  const sdkCode = currentSession
    ? `<script src="${window.location.origin}/embed/sdk.js"></script>
<script>
  const client = new HumanMetrix.Client({
    apiKey: 'YOUR_API_KEY',
    baseUrl: '${window.location.origin}',
    debug: true
  });
  
  // Use existing session
  client.launchWidget('${currentSession.sessionId}', '#container', {
    theme: '${widgetTheme}',
    onComplete: (result) => console.log('Completed:', result),
    onError: (err) => console.error('Error:', err)
  });
</script>`
    : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-white">Widget & SDK Test Lab</h2>
        <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
          Super Admin Only
        </Badge>
      </div>
      <p className="text-white/70 text-sm">
        Test the embeddable widget and JavaScript SDK with real partner accounts
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Puzzle className="w-5 h-5 text-cyan-400" />
                Test Configuration
              </CardTitle>
              <CardDescription className="text-slate-400">
                Select a partner and create a test session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Partner Account</Label>
                <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white" data-testid="select-widget-partner">
                    <SelectValue placeholder="Select a partner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {partnersLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : partners?.length ? (
                      partners.filter(p => p.isActive).map((partner) => (
                        <SelectItem key={partner.id} value={partner.id.toString()}>
                          {partner.companyName || partner.name} ({partner.email})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No partners available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedPartnerId && (
                <div className="space-y-2">
                  <Label className="text-slate-300">API Key</Label>
                  <Select value={selectedKeyId} onValueChange={setSelectedKeyId}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white" data-testid="select-widget-api-key">
                      <SelectValue placeholder="Select an API key..." />
                    </SelectTrigger>
                    <SelectContent>
                      {keysLoading ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : apiKeys?.length ? (
                        apiKeys.filter(k => k.isActive).map((key) => (
                          <SelectItem key={key.id} value={key.id.toString()}>
                            {key.keyPrefix}*** ({key.permissions.join(", ")})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No API keys available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-slate-300">Assessment Type</Label>
                <Select value={assessmentType} onValueChange={setAssessmentType}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white" data-testid="select-widget-assessment-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fit">FIT (Behavioural)</SelectItem>
                    <SelectItem value="ai_readiness">AI Readiness</SelectItem>
                    <SelectItem value="prompt_architecture">Prompt Architecture</SelectItem>
                    <SelectItem value="aiq">AIQ (Ethics)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Test Email</Label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="bg-slate-900/50 border-slate-600 text-white"
                  placeholder="test@example.com"
                  data-testid="input-widget-test-email"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Widget Theme</Label>
                <Select value={widgetTheme} onValueChange={setWidgetTheme}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white" data-testid="select-widget-theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() =>
                  createTestSessionMutation.mutate({
                    partnerId: selectedPartnerId,
                    apiKeyId: selectedKeyId,
                    assessmentType,
                    email: testEmail,
                  })
                }
                disabled={!selectedPartnerId || !selectedKeyId || createTestSessionMutation.isPending}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
                data-testid="button-create-widget-session"
              >
                {createTestSessionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Session...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Create Test Session
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {currentSession && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-cyan-400" />
                  Session Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Session ID:</span>
                    <p className="text-white font-mono text-xs break-all">{currentSession.sessionId}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Status:</span>
                    <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30">
                      {currentSession.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-400">Type:</span>
                    <p className="text-white">{currentSession.assessmentType}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Expires:</span>
                    <p className="text-white text-xs">{new Date(currentSession.expiresAt).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadWidget()}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    data-testid="button-reload-widget-tab"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload Widget
                  </Button>
                  <a href={currentSession.widgetUrl} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      data-testid="button-open-external-tab"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open External
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {currentSession && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Embed Code</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="widget">
                  <TabsList className="bg-slate-900/50">
                    <TabsTrigger value="widget">Widget</TabsTrigger>
                    <TabsTrigger value="sdk">SDK</TabsTrigger>
                  </TabsList>
                  <TabsContent value="widget" className="mt-4">
                    <div className="relative">
                      <pre className="bg-slate-900 p-4 rounded-lg text-xs text-slate-300 overflow-x-auto">
                        {widgetEmbedCode}
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 text-slate-400 hover:text-white"
                        onClick={() => copyToClipboard(widgetEmbedCode, "widget")}
                        data-testid="button-copy-widget-code-tab"
                      >
                        {copiedCode === "widget" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="sdk" className="mt-4">
                    <div className="relative">
                      <pre className="bg-slate-900 p-4 rounded-lg text-xs text-slate-300 overflow-x-auto">
                        {sdkCode}
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 text-slate-400 hover:text-white"
                        onClick={() => copyToClipboard(sdkCode, "sdk")}
                        data-testid="button-copy-sdk-code-tab"
                      >
                        {copiedCode === "sdk" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card className="bg-slate-800/50 border-slate-700 sticky top-4">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Puzzle className="w-5 h-5 text-cyan-400" />
                Widget Preview
              </CardTitle>
              <CardDescription className="text-slate-400">
                {currentSession
                  ? "Interactive widget loaded below"
                  : "Create a test session to see the widget"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                ref={widgetContainerRef}
                className="min-h-[400px] bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center"
                data-testid="widget-preview-container-tab"
              >
                {!currentSession && (
                  <div className="text-center text-slate-500 p-8">
                    <Puzzle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a partner and create a test session</p>
                    <p className="text-sm mt-2">The widget will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
