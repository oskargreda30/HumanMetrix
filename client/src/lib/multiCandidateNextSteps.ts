interface ComparisonData {
  roleSnapshot: { roleName: string };
  candidateEntries: Array<{
    userId: string;
    userName: string;
    overallFit: number | null;
    fitTier: string;
    skillScores: Array<{
      skillName: string;
      score: number | null;
      requiredScore: number;
      gap: number | null;
      alignment: string;
      criticality: 'critical' | 'standard';
      category: string;
    }>;
  }>;
  summaryInsights: {
    recommendation?: {
      recommendedCandidate: string;
      recommendedUserId?: string;
      fitScore: number;
      fitTier: string;
      reasons: string[];
      criticalSkillAdvantages: string[];
    } | null;
    runnerUp?: {
      name: string;
      fitScore: number;
      advantagesOverTop?: string[];
    } | null;
    commonGaps: string[];
    largestDifferential?: {
      skillName: string;
      topCandidate: string;
      topScore: number;
      bottomCandidate: string;
      bottomScore: number;
      spread?: number;
      criticality?: string;
    } | null;
  };
}

export function generateDynamicNextSteps(comparison: ComparisonData | null | undefined): Array<{ title: string; detail: string }> {
  if (!comparison) return [];
  const rec = comparison.summaryInsights.recommendation;
  const runnerUp = comparison.summaryInsights.runnerUp;
  const topName = rec?.recommendedCandidate || 'the top candidate';
  const roleName = comparison.roleSnapshot.roleName;
  const entries = comparison.candidateEntries;
  const topEntry = entries.find(e => e.userId === rec?.recommendedUserId) || entries[0];
  const criticalGaps = topEntry?.skillScores?.filter(s => s.criticality === 'critical' && s.gap !== null && s.gap! < 0) || [];
  const standardGaps = topEntry?.skillScores?.filter(s => s.criticality === 'standard' && s.gap !== null && s.gap! < 0) || [];
  const topGaps = [...criticalGaps, ...standardGaps].sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0));
  const topStrengths = topEntry?.skillScores?.filter(s => s.gap !== null && s.gap! >= 0).sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0)) || [];
  const commonGaps = comparison.summaryInsights.commonGaps || [];
  const largestDiff = comparison.summaryInsights.largestDifferential;
  const steps: Array<{ title: string; detail: string }> = [];

  if (!topEntry || !roleName) return steps;

  if (criticalGaps.length > 0) {
    const gapNames = criticalGaps.slice(0, 3).map(g => g.skillName).join(', ');
    steps.push({
      title: `Probe Critical Skill Gaps in Interview with ${topName}`,
      detail: `${topName} falls below required levels in ${criticalGaps.length} critical skill${criticalGaps.length > 1 ? 's' : ''}: ${gapNames}. Design behavioral interview questions specifically targeting these areas to determine whether the gap reflects a genuine capability limitation or situational assessment factors.`
    });
  }

  if (runnerUp && runnerUp.advantagesOverTop && runnerUp.advantagesOverTop.length > 0) {
    steps.push({
      title: `Evaluate ${runnerUp.name} as a Strategic Alternative`,
      detail: `${runnerUp.name} (${runnerUp.fitScore}% fit) outperforms ${topName} in: ${runnerUp.advantagesOverTop.slice(0, 3).join('; ')}. Consider whether these specific advantages better serve your team's current needs or if ${topName}'s overall stronger profile is the priority.`
    });
  } else if (runnerUp) {
    steps.push({
      title: `Retain ${runnerUp.name} as a Pipeline Candidate`,
      detail: `${runnerUp.name} scored ${runnerUp.fitScore}% overall fit for ${roleName}. While not the top recommendation, they may be a strong fit for similar or adjacent roles. Keep them in your talent pipeline for upcoming positions.`
    });
  }

  if (topGaps.length > 0) {
    const devAreas = topGaps.slice(0, 3).map(g => `${g.skillName} (${Math.abs(g.gap!)} pts below threshold)`).join(', ');
    steps.push({
      title: `Design a Targeted Development Plan for ${topName}`,
      detail: `If proceeding with ${topName}, prepare a structured onboarding plan that addresses: ${devAreas}. Pair them with mentors strong in these areas and set 30/60/90-day milestones to track improvement.`
    });
  }

  if (topStrengths.length > 0) {
    const strengthNames = topStrengths.slice(0, 3).map(s => `${s.skillName} (+${s.gap} pts)`).join(', ');
    steps.push({
      title: `Leverage ${topName}'s Key Strengths During Onboarding`,
      detail: `${topName} exceeds requirements in: ${strengthNames}. Consider assigning early responsibilities or projects that capitalize on these strengths to accelerate their impact and build confidence in the new role.`
    });
  }

  if (commonGaps.length > 0) {
    steps.push({
      title: `Address Shared Skill Gaps Across Your Candidate Pool`,
      detail: `All candidates showed gaps in: ${commonGaps.slice(0, 3).join(', ')}. This may indicate a broader talent market challenge for ${roleName}. Consider whether your required benchmarks for these skills need revisiting, or whether supplementary training should be part of any hire's onboarding.`
    });
  }

  if (largestDiff && (largestDiff.spread ?? 0) >= 15) {
    steps.push({
      title: `Investigate High Variance in ${largestDiff.skillName}`,
      detail: `There is a ${largestDiff.spread}-point spread between ${largestDiff.topCandidate} (${largestDiff.topScore}%) and ${largestDiff.bottomCandidate} (${largestDiff.bottomScore}%) in ${largestDiff.skillName}${largestDiff.criticality === 'critical' ? ' (a critical skill)' : ''}. Use targeted interview questions to validate this differential and understand each candidate's real-world experience in this area.`
    });
  }

  steps.push({
    title: 'Conduct Reference Checks Aligned to Role Requirements',
    detail: `Focus reference conversations on the specific competencies required for ${roleName}. ${criticalGaps.length > 0 ? `Pay special attention to references that can speak to ${topName}'s abilities in ${criticalGaps[0]?.skillName || 'identified gap areas'}.` : `Validate ${topName}'s assessment strengths through concrete examples from past roles.`}`
  });

  steps.push({
    title: 'Prepare a Competitive Offer',
    detail: `${topName} is your recommended hire for ${roleName} with a ${rec?.fitScore || topEntry?.overallFit || 0}% fit score${rec?.fitTier ? ` (${rec.fitTier} alignment)` : ''}. Move quickly with a competitive offer to secure this candidate before they advance in other processes.`
  });

  return steps;
}
