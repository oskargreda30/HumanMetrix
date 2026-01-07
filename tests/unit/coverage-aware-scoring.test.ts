/**
 * Coverage-Aware Scoring Tests
 * 
 * Tests the coverage-aware scoring logic that:
 * 1. Does NOT penalize candidates for missing assessments
 * 2. Marks missing skills as 'not_assessed' with null scores
 * 3. Only includes assessed skills in weighted averages
 * 4. Calculates coverage percentage accurately
 * 5. Flags candidates with <40% coverage as insufficient
 */

import { describe, it, expect } from 'vitest';

interface SkillAlignment {
  skillName: string;
  candidateScore: number | null;
  requiredScore: number;
  gap: number | null;
  alignment: 'excellent' | 'good' | 'fair' | 'poor' | 'not_assessed';
  criticality: 'critical' | 'important' | 'nice-to-have';
  dataAvailable: boolean;
}

interface DataCoverage {
  percentage: number;
  assessedSkillCount: number;
  totalRequiredSkills: number;
  missingAssessments: string[];
  hasSufficientData: boolean;
}

function calculateAlignment(
  candidateScore: number | null, 
  requiredScore: number
): { gap: number | null; alignment: string; dataAvailable: boolean } {
  if (candidateScore === null || candidateScore === undefined) {
    return { gap: null, alignment: 'not_assessed', dataAvailable: false };
  }
  
  const gap = requiredScore - candidateScore;
  let alignment: string;
  if (gap <= -10) alignment = 'excellent';
  else if (gap <= 0) alignment = 'good';
  else if (gap <= 15) alignment = 'fair';
  else alignment = 'poor';
  
  return { gap, alignment, dataAvailable: true };
}

function calculateWeightedFitScore(alignments: SkillAlignment[]): number {
  const getWeight = (criticality: string): number => {
    if (criticality === 'critical') return 2.0;
    if (criticality === 'important') return 1.5;
    return 1.0;
  };
  
  let weightedTotal = 0;
  let weightSum = 0;
  let criticalGaps = 0;
  let assessedCriticalSkills = 0;
  
  alignments.forEach(skill => {
    const isCritical = skill.criticality === 'critical';
    
    if (skill.dataAvailable && skill.candidateScore !== null) {
      const weight = getWeight(skill.criticality);
      if (isCritical) assessedCriticalSkills++;
      
      const matchPercent = skill.candidateScore >= skill.requiredScore
        ? 100
        : (skill.candidateScore / skill.requiredScore) * 100;
      
      weightedTotal += matchPercent * weight;
      weightSum += weight;
      
      if (isCritical && skill.candidateScore < skill.requiredScore) {
        criticalGaps++;
      }
    }
  });
  
  if (weightSum === 0) return 0;
  
  let overallFit = weightedTotal / weightSum;
  
  if (criticalGaps > 0 && assessedCriticalSkills > 0) {
    const criticalPenalty = criticalGaps * 0.10;
    overallFit = overallFit * (1 - Math.min(criticalPenalty, 0.5));
  }
  
  return Math.round(overallFit);
}

function calculateDataCoverage(
  assessedSkillCount: number, 
  totalRequiredSkills: number,
  missingAssessments: string[]
): DataCoverage {
  // Use floor to be conservative - don't round up (e.g. 39.6% should not become 40%)
  const percentage = totalRequiredSkills > 0 
    ? Math.floor((assessedSkillCount / totalRequiredSkills) * 100) 
    : 0;
    
  return {
    percentage,
    assessedSkillCount,
    totalRequiredSkills,
    missingAssessments,
    hasSufficientData: percentage >= 40
  };
}

describe('Coverage-Aware Scoring Logic', () => {
  
  describe('Skill Alignment Calculation', () => {
    it('should mark skills with no data as not_assessed', () => {
      const result = calculateAlignment(null, 72);
      expect(result.alignment).toBe('not_assessed');
      expect(result.gap).toBeNull();
      expect(result.dataAvailable).toBe(false);
    });
    
    it('should correctly align skills with data', () => {
      const excellentResult = calculateAlignment(87, 72);
      expect(excellentResult.alignment).toBe('excellent');
      expect(excellentResult.gap).toBe(-15);
      expect(excellentResult.dataAvailable).toBe(true);
      
      const goodResult = calculateAlignment(75, 72);
      expect(goodResult.alignment).toBe('good');
      expect(goodResult.gap).toBe(-3);
      
      const fairResult = calculateAlignment(62, 72);
      expect(fairResult.alignment).toBe('fair');
      expect(fairResult.gap).toBe(10);
      
      const poorResult = calculateAlignment(50, 72);
      expect(poorResult.alignment).toBe('poor');
      expect(poorResult.gap).toBe(22);
    });
  });
  
  describe('Weighted Fit Score Calculation', () => {
    it('should calculate fit score only from assessed skills (not treat missing as 0)', () => {
      const alignments: SkillAlignment[] = [
        { skillName: 'Leadership', candidateScore: 82, requiredScore: 72, gap: -10, alignment: 'excellent', criticality: 'critical', dataAvailable: true },
        { skillName: 'Communication', candidateScore: 76, requiredScore: 68, gap: -8, alignment: 'good', criticality: 'important', dataAvailable: true },
        { skillName: 'Technical Knowledge', candidateScore: null, requiredScore: 78, gap: null, alignment: 'not_assessed', criticality: 'critical', dataAvailable: false },
        { skillName: 'Problem Solving', candidateScore: null, requiredScore: 71, gap: null, alignment: 'not_assessed', criticality: 'important', dataAvailable: false },
      ];
      
      const fitScore = calculateWeightedFitScore(alignments);
      
      expect(fitScore).toBeGreaterThan(90);
      
      const wrongFitScore = calculateWeightedFitScore([
        { skillName: 'Leadership', candidateScore: 82, requiredScore: 72, gap: -10, alignment: 'excellent', criticality: 'critical', dataAvailable: true },
        { skillName: 'Communication', candidateScore: 76, requiredScore: 68, gap: -8, alignment: 'good', criticality: 'important', dataAvailable: true },
        { skillName: 'Technical Knowledge', candidateScore: 0, requiredScore: 78, gap: 78, alignment: 'poor', criticality: 'critical', dataAvailable: true },
        { skillName: 'Problem Solving', candidateScore: 0, requiredScore: 71, gap: 71, alignment: 'poor', criticality: 'important', dataAvailable: true },
      ]);
      
      expect(fitScore).toBeGreaterThan(wrongFitScore);
    });
    
    it('should return 0 for candidates with no assessed skills', () => {
      const alignments: SkillAlignment[] = [
        { skillName: 'Leadership', candidateScore: null, requiredScore: 72, gap: null, alignment: 'not_assessed', criticality: 'critical', dataAvailable: false },
        { skillName: 'Communication', candidateScore: null, requiredScore: 68, gap: null, alignment: 'not_assessed', criticality: 'important', dataAvailable: false },
      ];
      
      const fitScore = calculateWeightedFitScore(alignments);
      expect(fitScore).toBe(0);
    });
    
    it('should only apply critical gap penalty for assessed critical skills', () => {
      const withGap: SkillAlignment[] = [
        { skillName: 'Leadership', candidateScore: 50, requiredScore: 72, gap: 22, alignment: 'poor', criticality: 'critical', dataAvailable: true },
      ];
      
      const withoutGap: SkillAlignment[] = [
        { skillName: 'Leadership', candidateScore: null, requiredScore: 72, gap: null, alignment: 'not_assessed', criticality: 'critical', dataAvailable: false },
      ];
      
      const scoreWithGap = calculateWeightedFitScore(withGap);
      const scoreWithoutData = calculateWeightedFitScore(withoutGap);
      
      expect(scoreWithGap).toBeGreaterThan(0);
      expect(scoreWithGap).toBeLessThan(70);
      expect(scoreWithoutData).toBe(0);
    });
  });
  
  describe('Data Coverage Calculation', () => {
    it('should calculate correct coverage percentage', () => {
      const coverage = calculateDataCoverage(4, 10, []);
      expect(coverage.percentage).toBe(40);
      expect(coverage.hasSufficientData).toBe(true);
      
      const lowCoverage = calculateDataCoverage(3, 10, ['FIT Assessment']);
      expect(lowCoverage.percentage).toBe(30);
      expect(lowCoverage.hasSufficientData).toBe(false);
    });
    
    it('should handle full coverage', () => {
      const coverage = calculateDataCoverage(8, 8, []);
      expect(coverage.percentage).toBe(100);
      expect(coverage.hasSufficientData).toBe(true);
      expect(coverage.missingAssessments).toEqual([]);
    });
    
    it('should handle zero coverage', () => {
      const coverage = calculateDataCoverage(0, 8, ['FIT Assessment', 'AI Readiness Assessment']);
      expect(coverage.percentage).toBe(0);
      expect(coverage.hasSufficientData).toBe(false);
      expect(coverage.missingAssessments.length).toBe(2);
    });
    
    it('should handle edge case of no required skills', () => {
      const coverage = calculateDataCoverage(0, 0, []);
      expect(coverage.percentage).toBe(0);
    });
  });
  
  describe('Multi-Candidate Comparison with Mixed Coverage', () => {
    interface CandidateData {
      id: string;
      name: string;
      alignments: SkillAlignment[];
      dataCoverage: DataCoverage;
    }
    
    function rankCandidates(candidates: CandidateData[]): { 
      comparable: CandidateData[]; 
      insufficientData: CandidateData[] 
    } {
      const comparable = candidates.filter(c => c.dataCoverage.hasSufficientData);
      const insufficientData = candidates.filter(c => !c.dataCoverage.hasSufficientData);
      
      comparable.sort((a, b) => {
        const scoreA = calculateWeightedFitScore(a.alignments);
        const scoreB = calculateWeightedFitScore(b.alignments);
        return scoreB - scoreA;
      });
      
      return { comparable, insufficientData };
    }
    
    it('should separate candidates by sufficient coverage', () => {
      const candidates: CandidateData[] = [
        {
          id: '1',
          name: 'Alice',
          alignments: [
            { skillName: 'A', candidateScore: 80, requiredScore: 70, gap: -10, alignment: 'excellent', criticality: 'critical', dataAvailable: true },
            { skillName: 'B', candidateScore: 75, requiredScore: 70, gap: -5, alignment: 'good', criticality: 'important', dataAvailable: true },
          ],
          dataCoverage: { percentage: 100, assessedSkillCount: 2, totalRequiredSkills: 2, missingAssessments: [], hasSufficientData: true }
        },
        {
          id: '2',
          name: 'Bob',
          alignments: [
            { skillName: 'A', candidateScore: null, requiredScore: 70, gap: null, alignment: 'not_assessed', criticality: 'critical', dataAvailable: false },
            { skillName: 'B', candidateScore: null, requiredScore: 70, gap: null, alignment: 'not_assessed', criticality: 'important', dataAvailable: false },
          ],
          dataCoverage: { percentage: 0, assessedSkillCount: 0, totalRequiredSkills: 2, missingAssessments: ['FIT', 'AI Readiness'], hasSufficientData: false }
        },
        {
          id: '3',
          name: 'Carol',
          alignments: [
            { skillName: 'A', candidateScore: 65, requiredScore: 70, gap: 5, alignment: 'fair', criticality: 'critical', dataAvailable: true },
            { skillName: 'B', candidateScore: null, requiredScore: 70, gap: null, alignment: 'not_assessed', criticality: 'important', dataAvailable: false },
          ],
          dataCoverage: { percentage: 50, assessedSkillCount: 1, totalRequiredSkills: 2, missingAssessments: ['AI Readiness'], hasSufficientData: true }
        },
      ];
      
      const { comparable, insufficientData } = rankCandidates(candidates);
      
      expect(comparable.length).toBe(2);
      expect(insufficientData.length).toBe(1);
      expect(insufficientData[0].name).toBe('Bob');
      expect(comparable[0].name).toBe('Alice');
    });
    
    it('should rank comparable candidates by fit score', () => {
      const candidates: CandidateData[] = [
        {
          id: '1',
          name: 'Lower Score',
          alignments: [
            { skillName: 'A', candidateScore: 60, requiredScore: 70, gap: 10, alignment: 'fair', criticality: 'critical', dataAvailable: true },
          ],
          dataCoverage: { percentage: 50, assessedSkillCount: 1, totalRequiredSkills: 2, missingAssessments: [], hasSufficientData: true }
        },
        {
          id: '2',
          name: 'Higher Score',
          alignments: [
            { skillName: 'A', candidateScore: 85, requiredScore: 70, gap: -15, alignment: 'excellent', criticality: 'critical', dataAvailable: true },
          ],
          dataCoverage: { percentage: 50, assessedSkillCount: 1, totalRequiredSkills: 2, missingAssessments: [], hasSufficientData: true }
        },
      ];
      
      const { comparable } = rankCandidates(candidates);
      expect(comparable[0].name).toBe('Higher Score');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle abandoned assessments (in_progress status) as not having data', () => {
      const result = calculateAlignment(undefined as any, 72);
      expect(result.dataAvailable).toBe(false);
      expect(result.alignment).toBe('not_assessed');
    });
    
    it('should handle single candidate with partial coverage', () => {
      const alignments: SkillAlignment[] = [
        { skillName: 'Leadership', candidateScore: 82, requiredScore: 72, gap: -10, alignment: 'excellent', criticality: 'critical', dataAvailable: true },
        { skillName: 'Communication', candidateScore: null, requiredScore: 68, gap: null, alignment: 'not_assessed', criticality: 'important', dataAvailable: false },
        { skillName: 'Technical Knowledge', candidateScore: null, requiredScore: 78, gap: null, alignment: 'not_assessed', criticality: 'critical', dataAvailable: false },
        { skillName: 'Problem Solving', candidateScore: 76, requiredScore: 71, gap: -5, alignment: 'good', criticality: 'important', dataAvailable: true },
      ];
      
      const fitScore = calculateWeightedFitScore(alignments);
      const coverage = calculateDataCoverage(2, 4, ['AI Readiness']);
      
      expect(fitScore).toBeGreaterThan(80);
      expect(coverage.percentage).toBe(50);
      expect(coverage.hasSufficientData).toBe(true);
    });
    
    it('should not apply critical gap penalty when critical skill data is missing', () => {
      const alignmentsWithMissingCritical: SkillAlignment[] = [
        { skillName: 'Non-Critical Skill', candidateScore: 90, requiredScore: 70, gap: -20, alignment: 'excellent', criticality: 'important', dataAvailable: true },
        { skillName: 'Critical Skill', candidateScore: null, requiredScore: 80, gap: null, alignment: 'not_assessed', criticality: 'critical', dataAvailable: false },
      ];
      
      const alignmentsWithAssessedCritical: SkillAlignment[] = [
        { skillName: 'Non-Critical Skill', candidateScore: 90, requiredScore: 70, gap: -20, alignment: 'excellent', criticality: 'important', dataAvailable: true },
        { skillName: 'Critical Skill', candidateScore: 50, requiredScore: 80, gap: 30, alignment: 'poor', criticality: 'critical', dataAvailable: true },
      ];
      
      const scoreMissingCritical = calculateWeightedFitScore(alignmentsWithMissingCritical);
      const scoreFailedCritical = calculateWeightedFitScore(alignmentsWithAssessedCritical);
      
      expect(scoreMissingCritical).toBeGreaterThan(scoreFailedCritical);
    });
  });
  
  describe('Zero Required Skills Edge Case', () => {
    function hasSufficientData(
      totalRequiredSkills: number, 
      assessedSkillCount: number, 
      dataCoverage: number
    ): boolean {
      return totalRequiredSkills > 0 && assessedSkillCount > 0 && dataCoverage >= 40;
    }
    
    it('should treat zero required skills as insufficient data', () => {
      const result = hasSufficientData(0, 0, 0);
      expect(result).toBe(false);
    });
    
    it('should treat zero assessed skills as insufficient even with 100% coverage', () => {
      const result = hasSufficientData(0, 0, 100);
      expect(result).toBe(false);
    });
    
    it('should require at least one assessed skill for sufficient data', () => {
      const withAssessed = hasSufficientData(5, 2, 40);
      expect(withAssessed).toBe(true);
      
      const withoutAssessed = hasSufficientData(5, 0, 0);
      expect(withoutAssessed).toBe(false);
    });
    
    it('should mark coverage as insufficient when role has no requirements configured', () => {
      const coverage = calculateDataCoverage(0, 0, []);
      expect(coverage.percentage).toBe(0);
      
      const hasSufficient = hasSufficientData(
        coverage.totalRequiredSkills, 
        coverage.assessedSkillCount, 
        coverage.percentage
      );
      expect(hasSufficient).toBe(false);
    });
  });
});
