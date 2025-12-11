import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Play, RefreshCw } from "lucide-react";
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
    expectedScores: {
      totalScore: number;
    };
  };
}

interface GoldenSetPrompt {
  id: string;
  name: string;
  level: number;
  expectedScores: {
    totalScore: number;
  };
}

interface GoldenSetResultsResponse {
  results: GoldenSetResult[];
  untestedPrompts: GoldenSetPrompt[];
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

  const { data, isLoading, refetch } = useQuery<GoldenSetResultsResponse>({
    queryKey: ["/api/admin/golden-set/results"],
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/golden-set/run");
      return response.json() as Promise<RunEvaluationResponse>;
    },
    onSuccess: (result) => {
      setLastRunResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/golden-set/results"] });
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
              GPT-4o scoring consistency verification using 10 benchmark prompts
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={runMutation.isPending}
              data-testid="button-refresh-results"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              data-testid="button-run-evaluation"
            >
              {runMutation.isPending ? (
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
              <p className="text-sm">Click "Run Evaluation" to test GPT-4o scoring consistency.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {hasResults && (
        <Card>
          <CardHeader>
            <CardTitle>Benchmark Results</CardTitle>
            <CardDescription>
              Expected vs actual scores for each benchmark prompt (drift threshold: 10%)
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
                      <span className={result.driftPercentage > 10 ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
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
                      <span className={result.driftPercentage > 10 ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
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
    </div>
  );
}
