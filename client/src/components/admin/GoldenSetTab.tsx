import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, Play, RefreshCw, RotateCcw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GoldenSetResult {
  promptId: string;
  actualScores: {
    clarity: number;
    structure: number;
    contextRelevance: number;
    creativity: number;
    iterativeImprovement: number;
    totalScore: number;
  };
  driftPercentage: number;
  passed: boolean;
  testedAt: string;
  prompt: {
    id: string;
    name: string;
    level: number;
    taskDescription: string;
    promptText: string;
    expectedScores: {
      clarity: number;
      structure: number;
      contextRelevance: number;
      creativity: number;
      iterativeImprovement: number;
      totalScore: number;
    };
  };
}

interface GoldenSetPrompt {
  id: string;
  name: string;
  level: number;
  taskDescription: string;
  promptText: string;
  expectedScores: {
    clarity: number;
    structure: number;
    contextRelevance: number;
    creativity: number;
    iterativeImprovement: number;
    totalScore: number;
  };
}

interface GoldenSetResultsResponse {
  results: GoldenSetResult[];
  untestedPrompts: GoldenSetPrompt[];
  allPrompts: GoldenSetPrompt[];
  totalPrompts: number;
  testedCount: number;
  passedCount: number;
  failedCount: number;
}

interface RunEvaluationResponse {
  results: Array<{
    promptName: string;
    level: number;
    expectedScore: number;
    actualScore: number;
    driftPercentage: number;
    passed: boolean;
  }>;
  overallPassed: boolean;
  testedAt: string;
}

export default function GoldenSetTab() {
  const [lastRunResult, setLastRunResult] = useState<RunEvaluationResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [startedTestedCount, setStartedTestedCount] = useState(0);

  const { data, isLoading, refetch } = useQuery<GoldenSetResultsResponse>({
    queryKey: ["/api/admin/golden-set/results"],
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/golden-set/run");
      return response.json();
    },
    onSuccess: async () => {
      setIsEvaluating(true);
      setStartedTestedCount(data?.testedCount || 0);
      setProgress(0);
      setCurrentPrompt("Starting evaluation...");
    },
  });

  useEffect(() => {
    if (!isEvaluating) {
      return;
    }

    const pollProgress = async () => {
      try {
        const response = await fetch("/api/admin/golden-set/results", { credentials: "include" });
        if (response.ok) {
          const pollData = await response.json();
          const tested = pollData.testedCount || 0;
          const total = pollData.totalPrompts || 10;
          const newlyTested = tested - startedTestedCount;
          const newProgress = Math.round((newlyTested / total) * 100);
          setProgress(Math.min(newProgress, 100));
          
          if (newlyTested < total) {
            setCurrentPrompt(`Evaluating prompt ${newlyTested + 1} of ${total}...`);
          } else {
            setCurrentPrompt("Evaluation complete!");
            setProgress(100);
            setIsEvaluating(false);
            await queryClient.invalidateQueries({ queryKey: ["/api/admin/golden-set/results"] });
            refetch();
          }
        }
      } catch (e) {
        console.error("Error polling progress:", e);
      }
    };

    const interval = setInterval(pollProgress, 2000);
    pollProgress();

    return () => clearInterval(interval);
  }, [isEvaluating, startedTestedCount, refetch]);

  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/golden-set/reset");
      return response.json();
    },
    onSuccess: async () => {
      setLastRunResult(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/golden-set/results"] });
      refetch();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const overallPassed = data?.failedCount === 0 && data?.testedCount > 0;
  const hasResults = data && data.testedCount > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Golden Set Benchmark Monitoring</CardTitle>
            <CardDescription>
              GPT-5 scoring consistency verification using 10 benchmark prompts
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isEvaluating || runMutation.isPending || resetMutation.isPending}
              data-testid="button-refresh-results"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetMutation.mutate()}
              disabled={isEvaluating || runMutation.isPending || resetMutation.isPending}
              data-testid="button-reset-prompts"
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset & Recalibrate
                </>
              )}
            </Button>
            <Button
              onClick={() => runMutation.mutate()}
              disabled={isEvaluating || runMutation.isPending || resetMutation.isPending}
              data-testid="button-run-evaluation"
            >
              {(isEvaluating || runMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Evaluation
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(isEvaluating || runMutation.isPending) && (
            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg" data-testid="progress-container">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Evaluation Progress</span>
                <span className="text-sm font-bold text-primary" data-testid="text-progress-percent">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3 mb-2" />
              <p className="text-sm text-muted-foreground" data-testid="text-current-prompt">
                {currentPrompt || "Starting evaluation..."}
              </p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold" data-testid="text-total-prompts">
                {data?.totalPrompts || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Prompts</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold" data-testid="text-tested-count">
                {data?.testedCount || 0}
              </div>
              <div className="text-sm text-muted-foreground">Tested</div>
            </div>
            <div className="text-center p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-passed-count">
                {data?.passedCount || 0}
              </div>
              <div className="text-sm text-green-600/70 dark:text-green-400/70">Passed</div>
            </div>
            <div className="text-center p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-failed-count">
                {data?.failedCount || 0}
              </div>
              <div className="text-sm text-red-600/70 dark:text-red-400/70">Failed</div>
            </div>
          </div>

          {hasResults && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium">Overall Status:</span>
              {overallPassed ? (
                <Badge className="bg-green-600" data-testid="badge-overall-status">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  All Passing
                </Badge>
              ) : (
                <Badge variant="destructive" data-testid="badge-overall-status">
                  <XCircle className="h-3 w-3 mr-1" />
                  Drift Detected
                </Badge>
              )}
            </div>
          )}

          {!hasResults && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No evaluations have been run yet.</p>
              <p className="text-sm">Click "Run Evaluation" to test GPT-5 scoring consistency.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {hasResults && (
        <Card>
          <CardHeader>
            <CardTitle>Benchmark Results</CardTitle>
            <CardDescription>
              Expected vs actual scores for each benchmark prompt (drift threshold: 2%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Drift %</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Last Tested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.results.map((result) => (
                  <TableRow key={result.promptId} data-testid={`row-result-${result.prompt.name}`}>
                    <TableCell className="font-medium">{result.prompt.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">L{result.prompt.level}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{result.prompt.expectedScores.totalScore}</TableCell>
                    <TableCell className="text-right">{result.actualScores.totalScore}</TableCell>
                    <TableCell className="text-right">
                      <span className={result.driftPercentage > 2 ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
                        {result.driftPercentage.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {result.passed ? (
                        <Badge className="bg-green-600" data-testid={`badge-status-${result.prompt.name}`}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Pass
                        </Badge>
                      ) : (
                        <Badge variant="destructive" data-testid={`badge-status-${result.prompt.name}`}>
                          <XCircle className="h-3 w-3 mr-1" />
                          Fail
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(result.testedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {lastRunResult && runMutation.isSuccess && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Latest Run Results
              {lastRunResult.overallPassed ? (
                <Badge className="bg-green-600">All Pass</Badge>
              ) : (
                <Badge variant="destructive">Drift Detected</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Completed at {new Date(lastRunResult.testedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Drift %</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lastRunResult.results.map((result, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{result.promptName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">L{result.level}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{result.expectedScore}</TableCell>
                    <TableCell className="text-right">{result.actualScore}</TableCell>
                    <TableCell className="text-right">
                      <span className={result.driftPercentage > 2 ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
                        {result.driftPercentage}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {result.passed ? (
                        <Badge className="bg-green-600">Pass</Badge>
                      ) : (
                        <Badge variant="destructive">Fail</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Benchmark Prompts - Show All Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Benchmark Prompts</CardTitle>
          <CardDescription>
            10 benchmark prompts used to verify GPT-5 scoring consistency across difficulty levels 1-7
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.allPrompts?.sort((a, b) => a.level - b.level).map((prompt) => (
              <div 
                key={prompt.id} 
                className="border rounded-lg p-4 space-y-3"
                data-testid={`prompt-card-${prompt.name}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">L{prompt.level}</Badge>
                    <span className="font-semibold">{prompt.name}</span>
                  </div>
                  <Badge variant="secondary">
                    Expected: {prompt.expectedScores.totalScore}
                  </Badge>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Task Description:</div>
                  <p className="text-sm bg-muted p-2 rounded">{prompt.taskDescription}</p>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Sample Response (Prompt Text):</div>
                  <pre className="text-sm bg-muted p-2 rounded whitespace-pre-wrap font-mono text-xs">
                    {prompt.promptText}
                  </pre>
                </div>
                
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Clarity: {prompt.expectedScores.clarity}</span>
                  <span>Structure: {prompt.expectedScores.structure}</span>
                  <span>Context: {prompt.expectedScores.contextRelevance}</span>
                  <span>Creativity: {prompt.expectedScores.creativity}</span>
                  <span>Iterative: {prompt.expectedScores.iterativeImprovement}</span>
                </div>
              </div>
            ))}
            
            {(!data?.allPrompts || data.allPrompts.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No benchmark prompts found.</p>
                <p className="text-sm">Run "Seed Prompts" to initialize the benchmark set.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
