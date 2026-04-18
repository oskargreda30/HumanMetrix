const evaluationProgressMap = new Map<string, { completed: number; total: number }>();

export function updateEvaluationProgress(resultId: string, completed: number, total: number): void {
  evaluationProgressMap.set(resultId, { completed, total });
}

export function getEvaluationProgress(resultId: string): { completed: number; total: number } | null {
  return evaluationProgressMap.get(resultId) || null;
}

export function clearEvaluationProgress(resultId: string): void {
  evaluationProgressMap.delete(resultId);
}
