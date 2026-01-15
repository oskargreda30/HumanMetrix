/**
 * Unit Tests for Scoring Module
 * 
 * Tests the FIT, AI Readiness, and hybrid scoring algorithms
 * to ensure consistency and correctness of the scoring formulas.
 */

import { describe, it, expect } from 'vitest';
import {
  applyHybridScoring,
  calculateFITScores,
  calculateAIReadinessScores,
  FIT_SKILLS,
  AI_READINESS_SKILLS,
  FIT_SCORING_MATRIX,
  AI_READINESS_SCORING_MATRIX,
} from '../../server/scoring';

describe('Scoring Module', () => {
  describe('applyHybridScoring', () => {
    it('should apply the locked hybrid scoring formula correctly', () => {
      // Test case: rawPercentages with known values
      // Floor = 50 + (minRawPct/100)^0.5 × 10
      // Ceiling = 50 + (maxRawPct/100)^0.25 × 50
      const rawPercentages = {
        'Skill A': 25, // min
        'Skill B': 50,
        'Skill C': 100, // max
      };

      const result = applyHybridScoring(rawPercentages);

      // Floor = 50 + (25/100)^0.5 × 10 = 50 + 0.5 × 10 = 55
      // Ceiling = 50 + (100/100)^0.25 × 50 = 50 + 1 × 50 = 100
      // Score range = 100 - 55 = 45
      
      // Skill A (25%): relativePosition = 0, score = 55 + 0 × 45 = 55
      expect(result['Skill A']).toBe(55);
      
      // Skill C (100%): relativePosition = 1, score = 55 + 1 × 45 = 100
      expect(result['Skill C']).toBe(100);
      
      // Skill B (50%): relativePosition = (50-25)/(100-25) = 0.333...
      // score = 55 + 0.333 × 45 = 55 + 15 = 70
      expect(result['Skill B']).toBe(70);
    });

    it('should handle equal raw percentages (all same score)', () => {
      const rawPercentages = {
        'Skill A': 50,
        'Skill B': 50,
        'Skill C': 50,
      };

      const result = applyHybridScoring(rawPercentages);

      // When all skills have same raw score, use midpoint
      // Floor = 50 + (50/100)^0.5 × 10 = 50 + 0.707 × 10 ≈ 57.07
      // Ceiling = 50 + (50/100)^0.25 × 50 = 50 + 0.841 × 50 ≈ 92.04
      // Midpoint = (57.07 + 92.04) / 2 ≈ 74.5 -> rounds to 75
      
      // All skills should have the same normalized score
      expect(result['Skill A']).toBe(result['Skill B']);
      expect(result['Skill B']).toBe(result['Skill C']);
    });

    it('should handle edge case of 0% minimum raw percentage', () => {
      const rawPercentages = {
        'Skill A': 0, // min
        'Skill B': 100, // max
      };

      const result = applyHybridScoring(rawPercentages);

      // Floor = 50 + (0/100)^0.5 × 10 = 50 + 0 = 50
      // Ceiling = 50 + (100/100)^0.25 × 50 = 50 + 50 = 100
      expect(result['Skill A']).toBe(50);
      expect(result['Skill B']).toBe(100);
    });

    it('should handle edge case of 100% minimum raw percentage', () => {
      const rawPercentages = {
        'Skill A': 100,
        'Skill B': 100,
      };

      const result = applyHybridScoring(rawPercentages);

      // Floor = 50 + (100/100)^0.5 × 10 = 50 + 10 = 60
      // Ceiling = 50 + (100/100)^0.25 × 50 = 50 + 50 = 100
      // Midpoint = (60 + 100) / 2 = 80
      expect(result['Skill A']).toBe(80);
      expect(result['Skill B']).toBe(80);
    });

    it('should return rounded integer scores', () => {
      const rawPercentages = {
        'Skill A': 33.33,
        'Skill B': 66.67,
      };

      const result = applyHybridScoring(rawPercentages);

      expect(Number.isInteger(result['Skill A'])).toBe(true);
      expect(Number.isInteger(result['Skill B'])).toBe(true);
    });
  });

  describe('FIT Scoring Matrix Integrity', () => {
    it('should have exactly 6 skills defined', () => {
      expect(FIT_SKILLS.length).toBe(6);
    });

    it('should have all skills represented in the matrix', () => {
      const skillCounts: Record<string, number> = {};
      FIT_SKILLS.forEach(skill => { skillCounts[skill] = 0; });

      Object.values(FIT_SCORING_MATRIX).forEach(skillPoints => {
        Object.keys(skillPoints).forEach(skill => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      });

      // Each skill should appear at least once
      FIT_SKILLS.forEach(skill => {
        expect(skillCounts[skill]).toBeGreaterThan(0);
      });
    });

    it('should have positive total skill mappings', () => {
      let totalMappings = 0;
      Object.values(FIT_SCORING_MATRIX).forEach(skillPoints => {
        totalMappings += Object.keys(skillPoints).length;
      });
      expect(totalMappings).toBeGreaterThan(0);
    });

    it('should have all skill points equal to 4', () => {
      Object.values(FIT_SCORING_MATRIX).forEach(skillPoints => {
        Object.values(skillPoints).forEach(points => {
          expect(points).toBe(4);
        });
      });
    });
  });

  describe('AI Readiness Scoring Matrix Integrity', () => {
    it('should have exactly 9 skills defined', () => {
      expect(AI_READINESS_SKILLS.length).toBe(9);
    });

    it('should have all skills represented in the matrix', () => {
      const skillCounts: Record<string, number> = {};
      AI_READINESS_SKILLS.forEach(skill => { skillCounts[skill] = 0; });

      Object.values(AI_READINESS_SCORING_MATRIX).forEach(skillPoints => {
        Object.keys(skillPoints).forEach(skill => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      });

      // Each skill should appear at least once
      AI_READINESS_SKILLS.forEach(skill => {
        expect(skillCounts[skill]).toBeGreaterThan(0);
      });
    });

    it('should have positive total skill mappings across all questions', () => {
      let totalMappings = 0;
      Object.values(AI_READINESS_SCORING_MATRIX).forEach(skillPoints => {
        totalMappings += Object.keys(skillPoints).length;
      });
      expect(totalMappings).toBeGreaterThan(0);
    });

    it('should have all skill points equal to 4', () => {
      Object.values(AI_READINESS_SCORING_MATRIX).forEach(skillPoints => {
        Object.values(skillPoints).forEach(points => {
          expect(points).toBe(4);
        });
      });
    });
  });

  describe('calculateFITScores', () => {
    it('should calculate scores for valid answers', () => {
      // Answer all questions with option A
      const answers: Record<string, string> = {};
      for (let i = 1; i <= 15; i++) {
        answers[`q${i}`] = 'a';
      }

      const result = calculateFITScores(answers);

      // Should return scores for all 6 skills
      expect(Object.keys(result).length).toBe(6);
      FIT_SKILLS.forEach(skill => {
        expect(result[skill]).toBeDefined();
        expect(result[skill]).toBeGreaterThanOrEqual(50);
        expect(result[skill]).toBeLessThanOrEqual(100);
      });
    });

    it('should handle normalized question formats', () => {
      // Test various question ID formats
      const answers: Record<string, string> = {
        'q1': 'a',
        'Q2': 'B',
        'question3': 'c',
        'QUESTION4': 'D',
        '5': 'a',
      };

      const result = calculateFITScores(answers);

      // Should not throw and should return valid scores
      expect(Object.keys(result).length).toBe(6);
    });

    it('should return valid scores for empty answers', () => {
      const answers: Record<string, string> = {};
      const result = calculateFITScores(answers);

      // Should still return 6 skills (all with base scores)
      expect(Object.keys(result).length).toBe(6);
    });

    it('should handle mixed case answers', () => {
      const answers: Record<string, string> = {
        'q1': 'A',
        'q2': 'b',
        'q3': 'C',
        'q4': 'd',
      };

      const result = calculateFITScores(answers);
      expect(Object.keys(result).length).toBe(6);
    });
  });

  describe('calculateAIReadinessScores', () => {
    it('should calculate scores for valid answers', () => {
      // Answer first 23 questions with option A (all questions that exist)
      const answers: Record<string, string> = {};
      for (let i = 1; i <= 23; i++) {
        answers[`q${i}`] = 'a';
      }

      const result = calculateAIReadinessScores(answers);

      // Should return scores for all 9 skills
      expect(Object.keys(result).length).toBe(9);
      AI_READINESS_SKILLS.forEach(skill => {
        expect(result[skill]).toBeDefined();
        expect(result[skill]).toBeGreaterThanOrEqual(50);
        expect(result[skill]).toBeLessThanOrEqual(100);
      });
    });

    it('should return valid scores for empty answers', () => {
      const answers: Record<string, string> = {};
      const result = calculateAIReadinessScores(answers);

      // Should still return 9 skills
      expect(Object.keys(result).length).toBe(9);
    });
  });

  describe('Score Bounds Validation', () => {
    it('should never produce scores below 50', () => {
      // Test with lowest possible raw percentages
      const rawPercentages: Record<string, number> = {};
      FIT_SKILLS.forEach(skill => { rawPercentages[skill] = 0; });

      const result = applyHybridScoring(rawPercentages);

      Object.values(result).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(50);
      });
    });

    it('should never produce scores above 100', () => {
      // Test with highest possible raw percentages
      const rawPercentages: Record<string, number> = {};
      FIT_SKILLS.forEach(skill => { rawPercentages[skill] = 100; });

      const result = applyHybridScoring(rawPercentages);

      Object.values(result).forEach(score => {
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should maintain score differentiation with varied inputs', () => {
      const rawPercentages = {
        'Low Skill': 10,
        'Medium Skill': 50,
        'High Skill': 90,
      };

      const result = applyHybridScoring(rawPercentages);

      // Scores should be properly ordered
      expect(result['Low Skill']).toBeLessThan(result['Medium Skill']);
      expect(result['Medium Skill']).toBeLessThan(result['High Skill']);
    });
  });

  describe('Regression Tests', () => {
    it('should produce consistent scores for known input (regression guard)', () => {
      // This is a regression test - if the formula changes, this will fail
      const rawPercentages = {
        'Skill A': 0,
        'Skill B': 25,
        'Skill C': 50,
        'Skill D': 75,
        'Skill E': 100,
      };

      const result = applyHybridScoring(rawPercentages);

      // Floor = 50 + 0^0.5 × 10 = 50
      // Ceiling = 50 + 1^0.25 × 50 = 100
      // Range = 50
      expect(result['Skill A']).toBe(50);  // 0% -> floor
      expect(result['Skill E']).toBe(100); // 100% -> ceiling
      
      // Skill C (50%): relativePosition = 0.5, score = 50 + 0.5 × 50 = 75
      expect(result['Skill C']).toBe(75);
    });
  });
});
