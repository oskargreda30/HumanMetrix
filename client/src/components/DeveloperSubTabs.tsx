import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Key, Webhook, TestTube, Plus, RefreshCw, Trash2, Shield, Clock, AlertTriangle, Loader2, Info } from "lucide-react";

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
  onCreateKey: () => void;
  onRotateKey: (id: string) => void;
  onRevokeKey: (id: string) => void;
  rotatingKeyId: string | null;
  revokingKeyId: string | null;
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
  onCreateKey,
  onRotateKey,
  onRevokeKey,
  rotatingKeyId,
  revokingKeyId,
}: DeveloperSubTabsProps) {
  const [activeSubTab, setActiveSubTab] = useState("api-keys");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-cyan-500/20">
          <Key className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Developer Hub</h2>
          <p className="text-sm text-foreground/70">API keys, integrations, and testing tools</p>
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
              <Button 
                onClick={onCreateKey}
                className="bg-cyan-600 hover:bg-cyan-700"
                data-testid="button-create-api-key"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Key
              </Button>
            </CardHeader>
            <CardContent>
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
                  <p>No API keys found</p>
                  <p className="text-sm">Create your first API key to get started</p>
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

        <TabsContent value="sandbox" className="space-y-6" data-testid="subpanel-sandbox">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <TestTube className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>Assessment Sandbox</CardTitle>
                    <InfoTooltip content="Test the assessment experience yourself before sending to real candidates. Sandbox tests don't consume credits and results are for preview only." />
                  </div>
                  <CardDescription>
                    Preview our assessment experience before deploying to candidates
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
                      onClick={() => setActiveSubTab('api-keys')}
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
    </div>
  );
}
