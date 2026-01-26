import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Play, Code2, Puzzle, Copy, Check, ExternalLink, Layers } from "lucide-react";
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
  environment: 'test' | 'live';
}

interface TestSession {
  sessionId: string;
  assessmentType: string;
  assessmentTypes?: string[];
  status: string;
  widgetUrl: string;
  expiresAt: string;
}

const ASSESSMENT_TYPES = [
  { id: "fit", label: "FIT (Behavioural)", description: "6 core behavioral skills" },
  { id: "ai_readiness", label: "AI Readiness", description: "9 AI collaboration skills" },
  { id: "prompt_architecture", label: "Prompt Architecture", description: "7-level prompt mastery" },
  { id: "aiq", label: "AIQ (Ethics)", description: "4 ethical AI dimensions" },
];

export default function WidgetTestTab() {
  const { toast } = useToast();
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [selectedAssessmentTypes, setSelectedAssessmentTypes] = useState<string[]>(["fit"]);
  const [testEmail, setTestEmail] = useState<string>("");
  const [externalUserId, setExternalUserId] = useState<string>("");
  const [metadataJson, setMetadataJson] = useState<string>('{\n  "jobRole": "Software Engineer",\n  "department": "Engineering"\n}');
  const [metadataError, setMetadataError] = useState<string>("");
  const [currentSession, setCurrentSession] = useState<TestSession | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [widgetTheme, setWidgetTheme] = useState<string>("light");
  const [iframeLoading, setIframeLoading] = useState(false);
  
  const isMultiAssessment = selectedAssessmentTypes.length > 1;
  
  const toggleAssessmentType = (typeId: string) => {
    setSelectedAssessmentTypes(prev => {
      if (prev.includes(typeId)) {
        // Don't allow removing the last one
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== typeId);
      }
      return [...prev, typeId];
    });
  };

  const { data: partners, isLoading: partnersLoading } = useQuery<Partner[]>({
    queryKey: ["/api/admin/partners"],
  });

  const { data: apiKeys, isLoading: keysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/admin/partners", selectedPartnerId, "keys"],
    enabled: !!selectedPartnerId,
  });

  const validateMetadata = (json: string): Record<string, any> | null => {
    if (!json.trim()) return {};
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setMetadataError("Metadata must be a JSON object");
        return null;
      }
      setMetadataError("");
      return parsed;
    } catch {
      setMetadataError("Invalid JSON format");
      return null;
    }
  };

  const createTestSessionMutation = useMutation({
    mutationFn: async (data: { partnerId: string; apiKeyId: string; assessmentType: string; assessmentTypes?: string[]; email?: string; externalUserId?: string; metadata?: Record<string, any> }) => {
      const response = await apiRequest("POST", "/api/admin/widget-test/session", data);
      return response.json();
    },
    onSuccess: (data) => {
      setIframeLoading(true); // Start showing loading indicator for iframe
      setCurrentSession({
        ...data,
        assessmentTypes: selectedAssessmentTypes,
      });
      const typeCount = selectedAssessmentTypes.length;
      toast({
        title: "Test Session Created",
        description: typeCount > 1 
          ? `Multi-assessment session with ${typeCount} assessments` 
          : `Session ID: ${data.sessionId}`,
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

  const getEmbedUrl = () => {
    if (!currentSession) return "";
    // For multi-assessment, use the types parameter
    const typesParam = currentSession.assessmentTypes && currentSession.assessmentTypes.length > 1
      ? `&types=${currentSession.assessmentTypes.join(",")}`
      : "";
    return `/embed/assessment?session=${currentSession.sessionId}&theme=${widgetTheme}${typesParam}`;
  };

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
                        apiKeys.map((key) => (
                          <SelectItem key={key.id} value={key.id.toString()}>
                            <span className="flex items-center gap-2">
                              <span className={!key.isActive ? "text-slate-400" : ""}>
                                {key.keyPrefix}*** 
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                key.environment === 'live' 
                                  ? 'bg-orange-500/20 text-orange-300' 
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}>
                                {key.environment}
                              </span>
                              {!key.isActive && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                                  deactivated
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No API keys available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Assessment Types</Label>
                  {isMultiAssessment && (
                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">
                      <Layers className="w-3 h-3 mr-1" />
                      Multi-Assessment: {selectedAssessmentTypes.length} selected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Select one or more assessments. Multiple assessments will run in sequence.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ASSESSMENT_TYPES.map((type) => (
                    <div
                      key={type.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAssessmentTypes.includes(type.id)
                          ? 'bg-cyan-500/10 border-cyan-500/50'
                          : 'bg-slate-900/50 border-slate-600 hover:border-slate-500'
                      }`}
                      onClick={() => toggleAssessmentType(type.id)}
                      data-testid={`checkbox-assessment-${type.id}`}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={selectedAssessmentTypes.includes(type.id)}
                          onCheckedChange={() => toggleAssessmentType(type.id)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className={`text-sm font-medium ${
                            selectedAssessmentTypes.includes(type.id) ? 'text-cyan-300' : 'text-slate-300'
                          }`}>
                            {type.label}
                          </p>
                          <p className="text-xs text-slate-500">{type.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedAssessmentTypes.length > 1 && (
                  <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-blue-300">
                      Order: {selectedAssessmentTypes.map(t => ASSESSMENT_TYPES.find(at => at.id === t)?.label.split(" ")[0]).join(" → ")}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">External User ID (optional)</Label>
                <Input
                  type="text"
                  value={externalUserId}
                  onChange={(e) => setExternalUserId(e.target.value)}
                  className="bg-slate-900/50 border-slate-600 text-white"
                  placeholder="candidate-123 or applicant-abc"
                  data-testid="input-widget-external-user-id"
                />
                <p className="text-xs text-slate-500">Your internal identifier for this candidate</p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Email (optional)</Label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="bg-slate-900/50 border-slate-600 text-white"
                  placeholder="candidate@example.com"
                  data-testid="input-widget-test-email"
                />
                <p className="text-xs text-slate-500">
                  {testEmail ? "Candidate will receive results at this email" : "Leave empty to prompt test-taker for their email (recommended for live testing)"}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Custom Metadata (JSON)</Label>
                <textarea
                  value={metadataJson}
                  onChange={(e) => {
                    setMetadataJson(e.target.value);
                    validateMetadata(e.target.value);
                  }}
                  className="w-full h-28 bg-slate-900/50 border border-slate-600 text-white rounded-md p-3 font-mono text-sm resize-none"
                  placeholder='{"jobRole": "Engineer", "department": "Tech"}'
                  data-testid="input-widget-metadata"
                />
                {metadataError && (
                  <p className="text-xs text-red-400">{metadataError}</p>
                )}
                <p className="text-xs text-slate-500">Custom key-value pairs to store with this session</p>
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
                onClick={() => {
                  const metadata = validateMetadata(metadataJson);
                  if (metadata === null) return;
                  createTestSessionMutation.mutate({
                    partnerId: selectedPartnerId,
                    apiKeyId: selectedKeyId,
                    assessmentType: selectedAssessmentTypes[0], // Primary type for session
                    assessmentTypes: selectedAssessmentTypes,
                    email: testEmail || undefined,
                    externalUserId: externalUserId || undefined,
                    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
                  });
                }}
                disabled={!selectedPartnerId || !selectedKeyId || selectedAssessmentTypes.length === 0 || createTestSessionMutation.isPending || !!metadataError}
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
                    {isMultiAssessment ? <Layers className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {isMultiAssessment ? `Create Multi-Assessment (${selectedAssessmentTypes.length})` : 'Create Test Session'}
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
                  <div className="col-span-2">
                    <span className="text-slate-400">Assessment Types:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(currentSession.assessmentTypes || [currentSession.assessmentType]).map((type, idx) => (
                        <Badge 
                          key={type} 
                          className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                        >
                          {idx + 1}. {ASSESSMENT_TYPES.find(t => t.id === type)?.label || type}
                        </Badge>
                      ))}
                    </div>
                    {currentSession.assessmentTypes && currentSession.assessmentTypes.length > 1 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Assessments will run in sequence (uses {currentSession.assessmentTypes.length} credits total)
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400">Expires:</span>
                    <p className="text-white text-xs">{new Date(currentSession.expiresAt).toLocaleString()}</p>
                  </div>
                </div>

                <a href={getEmbedUrl()} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    data-testid="button-open-external-tab"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                </a>
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
              {currentSession ? (
                <div className="relative">
                  {iframeLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white rounded-lg border border-slate-700 z-10">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">Loading assessment...</p>
                      </div>
                    </div>
                  )}
                  <iframe
                    src={getEmbedUrl()}
                    className="w-full min-h-[500px] bg-white rounded-lg border border-slate-700"
                    data-testid="widget-preview-iframe"
                    title="Assessment Widget Preview"
                    onLoad={() => setIframeLoading(false)}
                  />
                </div>
              ) : (
                <div
                  className="min-h-[400px] bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center"
                  data-testid="widget-preview-container-tab"
                >
                  <div className="text-center text-slate-500 p-8">
                    <Puzzle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a partner and create a test session</p>
                    <p className="text-sm mt-2">The widget will appear here</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
