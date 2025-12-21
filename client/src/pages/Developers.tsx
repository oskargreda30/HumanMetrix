import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, Code2, Puzzle, Zap, Book, ExternalLink } from "lucide-react";
import dashboardBg from "@assets/image_1763608498774.png";

function CodeBlock({ code, language = "javascript" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
        onClick={handleCopy}
        data-testid="button-copy-code"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function EndpointCard({ method, path, description, auth = true }: { method: string; path: string; description: string; auth?: boolean }) {
  const methodColors: Record<string, string> = {
    GET: "bg-green-500/20 text-green-400 border-green-500/30",
    POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    PUT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/50">
      <div className="flex items-center gap-3 mb-2">
        <Badge className={`${methodColors[method]} font-mono text-xs`}>{method}</Badge>
        <code className="text-cyan-400 text-sm font-mono">{path}</code>
        {auth && <Badge variant="outline" className="text-xs border-slate-600">Auth Required</Badge>}
      </div>
      <p className="text-slate-300 text-sm">{description}</p>
    </div>
  );
}

export default function Developers() {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Developer Documentation | HumanMetrix</title>
        <meta name="description" content="Integrate HumanMetrix assessments into your platform with our embeddable widget, JavaScript SDK, and REST API." />
      </Helmet>

      <Navigation />

      <main
        className="flex-1"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(13,29,51,0.92), rgba(13,29,51,0.85), rgba(13,29,51,0.92)), url(${dashboardBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              Developer Documentation
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              B2B Integration Guide
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Embed HumanMetrix assessments into your recruitment platform with our flexible integration options.
            </p>
          </div>

          <Tabs defaultValue="quickstart" className="w-full max-w-5xl mx-auto">
            <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700 mb-8">
              <TabsTrigger value="quickstart" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400" data-testid="tab-quickstart">
                <Zap className="w-4 h-4 mr-2" />
                Quick Start
              </TabsTrigger>
              <TabsTrigger value="widget" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400" data-testid="tab-widget">
                <Puzzle className="w-4 h-4 mr-2" />
                Widget
              </TabsTrigger>
              <TabsTrigger value="sdk" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400" data-testid="tab-sdk">
                <Code2 className="w-4 h-4 mr-2" />
                SDK
              </TabsTrigger>
              <TabsTrigger value="api" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400" data-testid="tab-api">
                <Book className="w-4 h-4 mr-2" />
                API Reference
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quickstart" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-cyan-400" />
                    Getting Started
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Get up and running with HumanMetrix in under 5 minutes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">1. Get Your API Key</h3>
                    <p className="text-slate-300">
                      Contact our sales team to set up a B2B partner account. You'll receive API credentials for both test and live environments.
                    </p>
                    <div className="flex gap-2">
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Test: hm_test_*</Badge>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Live: hm_live_*</Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">2. Choose Your Integration Method</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <Card className="bg-slate-900/50 border-slate-600 hover-elevate cursor-pointer">
                        <CardContent className="p-4">
                          <Puzzle className="w-8 h-8 text-cyan-400 mb-2" />
                          <h4 className="font-semibold text-white mb-1">Widget</h4>
                          <p className="text-sm text-slate-400">Embed a ready-made UI with one script tag</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-900/50 border-slate-600 hover-elevate cursor-pointer">
                        <CardContent className="p-4">
                          <Code2 className="w-8 h-8 text-cyan-400 mb-2" />
                          <h4 className="font-semibold text-white mb-1">SDK</h4>
                          <p className="text-sm text-slate-400">Full control with our JavaScript client</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-900/50 border-slate-600 hover-elevate cursor-pointer">
                        <CardContent className="p-4">
                          <Book className="w-8 h-8 text-cyan-400 mb-2" />
                          <h4 className="font-semibold text-white mb-1">REST API</h4>
                          <p className="text-sm text-slate-400">Direct API access for any platform</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">3. Minimal Widget Example</h3>
                    <CodeBlock code={`<script src="https://your-domain.replit.app/embed/widget.js"></script>
<script>
  HumanMetrixWidget.init({
    apiKey: 'hm_test_your_api_key',
    assessmentType: 'fit',
    candidateId: 'candidate-123',
    onComplete: function(results) {
      console.log('Assessment completed:', results);
    }
  });
</script>`} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="widget" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Puzzle className="w-5 h-5 text-cyan-400" />
                    Embeddable Widget
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Drop-in assessment experience with style isolation via Shadow DOM
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Installation</h3>
                    <p className="text-slate-300">Add the widget script to your page:</p>
                    <CodeBlock code={`<script src="https://your-domain.replit.app/embed/widget.js"></script>`} />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Configuration Options</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-2 px-4 text-slate-300">Option</th>
                            <th className="text-left py-2 px-4 text-slate-300">Type</th>
                            <th className="text-left py-2 px-4 text-slate-300">Required</th>
                            <th className="text-left py-2 px-4 text-slate-300">Description</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-400">
                          <tr className="border-b border-slate-700/50">
                            <td className="py-2 px-4 font-mono text-cyan-400">apiKey</td>
                            <td className="py-2 px-4">string</td>
                            <td className="py-2 px-4">Yes</td>
                            <td className="py-2 px-4">Your partner API key</td>
                          </tr>
                          <tr className="border-b border-slate-700/50">
                            <td className="py-2 px-4 font-mono text-cyan-400">assessmentType</td>
                            <td className="py-2 px-4">string</td>
                            <td className="py-2 px-4">Yes</td>
                            <td className="py-2 px-4">One of: 'fit', 'ai_readiness', 'prompt_architecture', 'aiq'</td>
                          </tr>
                          <tr className="border-b border-slate-700/50">
                            <td className="py-2 px-4 font-mono text-cyan-400">candidateId</td>
                            <td className="py-2 px-4">string</td>
                            <td className="py-2 px-4">Yes</td>
                            <td className="py-2 px-4">Your internal candidate identifier</td>
                          </tr>
                          <tr className="border-b border-slate-700/50">
                            <td className="py-2 px-4 font-mono text-cyan-400">candidateEmail</td>
                            <td className="py-2 px-4">string</td>
                            <td className="py-2 px-4">No</td>
                            <td className="py-2 px-4">Candidate's email for notifications</td>
                          </tr>
                          <tr className="border-b border-slate-700/50">
                            <td className="py-2 px-4 font-mono text-cyan-400">container</td>
                            <td className="py-2 px-4">string</td>
                            <td className="py-2 px-4">No</td>
                            <td className="py-2 px-4">CSS selector for widget container (default: 'body')</td>
                          </tr>
                          <tr className="border-b border-slate-700/50">
                            <td className="py-2 px-4 font-mono text-cyan-400">theme</td>
                            <td className="py-2 px-4">object</td>
                            <td className="py-2 px-4">No</td>
                            <td className="py-2 px-4">Custom theme with primaryColor and fontFamily</td>
                          </tr>
                          <tr className="border-b border-slate-700/50">
                            <td className="py-2 px-4 font-mono text-cyan-400">onComplete</td>
                            <td className="py-2 px-4">function</td>
                            <td className="py-2 px-4">No</td>
                            <td className="py-2 px-4">Callback when assessment completes</td>
                          </tr>
                          <tr className="border-b border-slate-700/50">
                            <td className="py-2 px-4 font-mono text-cyan-400">onProgress</td>
                            <td className="py-2 px-4">function</td>
                            <td className="py-2 px-4">No</td>
                            <td className="py-2 px-4">Callback for progress updates</td>
                          </tr>
                          <tr className="border-b border-slate-700/50">
                            <td className="py-2 px-4 font-mono text-cyan-400">onError</td>
                            <td className="py-2 px-4">function</td>
                            <td className="py-2 px-4">No</td>
                            <td className="py-2 px-4">Error handler callback</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Complete Example</h3>
                    <CodeBlock code={`<!DOCTYPE html>
<html>
<head>
  <title>Candidate Assessment</title>
</head>
<body>
  <div id="assessment-container"></div>
  
  <script src="https://your-domain.replit.app/embed/widget.js"></script>
  <script>
    HumanMetrixWidget.init({
      apiKey: 'hm_live_xxxxxxxxxxxx',
      assessmentType: 'fit',
      candidateId: 'candidate-' + Date.now(),
      candidateEmail: 'candidate@example.com',
      container: '#assessment-container',
      theme: {
        primaryColor: '#0ea5e9',
        fontFamily: 'Inter, sans-serif'
      },
      onComplete: function(results) {
        console.log('Score:', results.score);
        // Redirect or update your UI
        window.location.href = '/thank-you';
      },
      onProgress: function(progress) {
        console.log('Progress:', progress.current + '/' + progress.total);
      },
      onError: function(error) {
        console.error('Widget error:', error);
        alert('Assessment error: ' + error.message);
      }
    });
  </script>
</body>
</html>`} />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Widget Methods</h3>
                    <CodeBlock code={`// Destroy the widget and clean up
HumanMetrixWidget.destroy();`} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sdk" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-cyan-400" />
                    JavaScript SDK
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Full programmatic control for custom assessment experiences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Installation</h3>
                    <p className="text-slate-300">Via CDN:</p>
                    <CodeBlock code={`<script src="https://your-domain.replit.app/embed/sdk.js"></script>`} />
                    <p className="text-slate-300">Via npm:</p>
                    <CodeBlock code={`npm install @humanmetrix/sdk`} />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Initialisation</h3>
                    <CodeBlock code={`// Browser (CDN)
const client = new HumanMetrix.Client({
  apiKey: 'hm_live_xxxxxxxxxxxx',
  environment: 'production' // or 'sandbox'
});

// Node.js / ES Modules
import { Client } from '@humanmetrix/sdk';
const client = new Client({ apiKey: 'hm_live_xxxxxxxxxxxx' });`} />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Creating a Session</h3>
                    <CodeBlock code={`const session = await client.createSession({
  assessmentType: 'fit',
  candidateId: 'your-internal-id',
  candidateEmail: 'candidate@example.com',
  metadata: {
    jobRole: 'Software Engineer',
    department: 'Engineering'
  }
});

console.log('Session ID:', session.sessionId);
console.log('Expires:', session.expiresAt);`} />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Launching the Assessment</h3>
                    <CodeBlock code={`// Launch in a modal overlay
client.launchWidget({
  sessionId: session.sessionId,
  container: '#assessment-container', // optional
  theme: {
    primaryColor: '#0ea5e9'
  }
});

// Listen for completion
client.on('complete', (results) => {
  console.log('Assessment completed:', results);
});

client.on('progress', (data) => {
  console.log(\`Question \${data.current} of \${data.total}\`);
});`} />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Retrieving Results</h3>
                    <CodeBlock code={`// Get results by session ID
const results = await client.getResults(session.sessionId);

console.log('Overall Score:', results.overallScore);
console.log('Completed At:', results.completedAt);
console.log('Breakdown:', results.breakdown);

// Get results by candidate ID (all assessments)
const allResults = await client.getCandidateResults('candidate-123');`} />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Error Handling</h3>
                    <CodeBlock code={`try {
  const session = await client.createSession({...});
} catch (error) {
  if (error.code === 'RATE_LIMITED') {
    console.log('Please wait before retrying');
  } else if (error.code === 'INVALID_API_KEY') {
    console.log('Check your API credentials');
  } else {
    console.error('Unexpected error:', error.message);
  }
}`} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Book className="w-5 h-5 text-cyan-400" />
                    REST API Reference
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Direct HTTP access for server-to-server integration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Authentication</h3>
                    <p className="text-slate-300">
                      Include your API key in the <code className="bg-slate-900 px-2 py-1 rounded text-cyan-400">X-API-Key</code> header:
                    </p>
                    <CodeBlock code={`curl -X POST https://your-domain.replit.app/api/partner/sessions \\
  -H "X-API-Key: hm_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"assessmentType": "fit", "candidateId": "123"}'`} />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Base URL</h3>
                    <div className="flex gap-2">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Production</Badge>
                      <code className="text-slate-300">https://your-domain.replit.app</code>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Endpoints</h3>
                    <div className="space-y-3">
                      <EndpointCard
                        method="POST"
                        path="/api/partner/sessions"
                        description="Create a new assessment session for a candidate"
                      />
                      <EndpointCard
                        method="GET"
                        path="/api/partner/sessions/:sessionId"
                        description="Get session status and metadata"
                      />
                      <EndpointCard
                        method="GET"
                        path="/api/partner/sessions/:sessionId/results"
                        description="Retrieve assessment results (only available after completion)"
                      />
                      <EndpointCard
                        method="GET"
                        path="/api/partner/candidates/:candidateId/results"
                        description="Get all results for a specific candidate"
                      />
                      <EndpointCard
                        method="GET"
                        path="/api/partner/usage"
                        description="Retrieve usage statistics and billing information"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Create Session Request</h3>
                    <CodeBlock code={`POST /api/partner/sessions
Content-Type: application/json
X-API-Key: hm_live_xxxxxxxxxxxx

{
  "assessmentType": "fit",      // Required: fit | ai_readiness | prompt_architecture | aiq
  "candidateId": "your-id-123", // Required: Your internal candidate identifier
  "candidateEmail": "candidate@example.com", // Optional
  "candidateName": "John Smith",             // Optional
  "expiresInMinutes": 1440,                  // Optional: Session validity (default: 1440)
  "metadata": {                              // Optional: Custom metadata
    "jobRole": "Software Engineer",
    "department": "Engineering",
    "applicationId": "app-456"
  }
}`} />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Create Session Response</h3>
                    <CodeBlock code={`{
  "sessionId": "sess_abc123def456",
  "assessmentType": "fit",
  "status": "pending",
  "widgetUrl": "https://your-domain.replit.app/embed/assess?session=sess_abc123def456",
  "expiresAt": "2025-01-15T12:00:00Z",
  "createdAt": "2025-01-14T12:00:00Z"
}`} />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Results Response</h3>
                    <CodeBlock code={`{
  "sessionId": "sess_abc123def456",
  "status": "completed",
  "candidateId": "your-id-123",
  "assessmentType": "fit",
  "overallScore": 78,
  "completedAt": "2025-01-14T14:30:00Z",
  "breakdown": {
    "adaptability": 82,
    "collaboration": 75,
    "innovation": 80,
    "leadership": 74
  },
  "percentile": 72,
  "interpretation": "Strong candidate with above-average behavioural competencies..."
}`} />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Error Responses</h3>
                    <CodeBlock code={`// 401 Unauthorized
{
  "error": "Invalid or expired API key",
  "code": "INVALID_API_KEY"
}

// 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "retryAfter": 60
}

// 404 Not Found
{
  "error": "Session not found",
  "code": "SESSION_NOT_FOUND"
}`} />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Rate Limits</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-2 px-4 text-slate-300">Plan</th>
                            <th className="text-left py-2 px-4 text-slate-300">Requests/Minute</th>
                            <th className="text-left py-2 px-4 text-slate-300">Sessions/Day</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-400">
                          <tr className="border-b border-slate-700/50">
                            <td className="py-2 px-4">Standard</td>
                            <td className="py-2 px-4">100</td>
                            <td className="py-2 px-4">1,000</td>
                          </tr>
                          <tr className="border-b border-slate-700/50">
                            <td className="py-2 px-4">Enterprise</td>
                            <td className="py-2 px-4">1,000</td>
                            <td className="py-2 px-4">Unlimited</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Webhooks (Coming Soon)</h3>
                    <p className="text-slate-300">
                      Configure webhook endpoints to receive real-time notifications when assessments are completed.
                    </p>
                    <CodeBlock code={`// Webhook payload
{
  "event": "assessment.completed",
  "timestamp": "2025-01-14T14:30:00Z",
  "data": {
    "sessionId": "sess_abc123def456",
    "candidateId": "your-id-123",
    "assessmentType": "fit",
    "score": 78
  }
}`} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-12 text-center">
            <Card className="bg-slate-800/50 border-slate-700 max-w-2xl mx-auto">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-white mb-4">Need Help?</h3>
                <p className="text-slate-300 mb-6">
                  Our developer support team is here to help you integrate HumanMetrix into your platform.
                </p>
                <div className="flex gap-4 justify-center">
                  <a href="mailto:support@humanmetrix.co.uk">
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" data-testid="button-contact-support">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Contact Support
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
