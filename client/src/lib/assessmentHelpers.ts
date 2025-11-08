// Helper functions for assessment display and formatting

export function formatAssessmentName(assessmentType: string): string {
  switch (assessmentType) {
    case 'fit':
      return 'FIT';
    case 'ai_readiness':
      return 'AI Readiness';
    case 'prompt_architecture':
      return 'Prompt Architecture';
    case 'aiq':
      return 'AIQ';
    default:
      return assessmentType.toUpperCase();
  }
}

export function isAllAssessmentsComplete(results: any[], totalAssessments: number = 4): boolean {
  const completedCount = results.filter((r: any) => r.status === 'completed').length;
  return completedCount >= totalAssessments;
}
