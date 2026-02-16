import { describe, it, expect } from 'vitest';
import {
  FIT_SKILLS,
  FIT_SCORING_MATRIX,
  AI_READINESS_SKILLS,
  AI_READINESS_SCORING_MATRIX,
  applyHybridScoring,
  calculateFITScores,
  calculateAIReadinessScores,
} from '../../server/scoring';

describe('Scoring Module', () => {
  describe('FIT_SKILLS', () => {
    it('has exactly 6 skills', () => {
      expect(FIT_SKILLS).toHaveLength(6);
    });

    it('contains expected skill names', () => {
      expect(FIT_SKILLS).toContain('High Agency');
      expect(FIT_SKILLS).toContain('Intellectual Curiosity');
      expect(FIT_SKILLS).toContain('Resilience');
      expect(FIT_SKILLS).toContain('Empathy & Ethics');
      expect(FIT_SKILLS).toContain('Growth Mindset');
      expect(FIT_SKILLS).toContain('Interpersonal Agility');
    });

    it('is a readonly tuple', () => {
      expect(Array.isArray(FIT_SKILLS)).toBe(true);
    });
  });

  describe('AI_READINESS_SKILLS', () => {
    it('has exactly 9 skills', () => {
      expect(AI_READINESS_SKILLS).toHaveLength(9);
    });

    it('contains expected skill names', () => {
      expect(AI_READINESS_SKILLS).toContain('AI Literacy & Prompt Engineering');
      expect(AI_READINESS_SKILLS).toContain('Technical Fundamentals');
      expect(AI_READINESS_SKILLS).toContain('Data Fluency');
      expect(AI_READINESS_SKILLS).toContain('Critical Thinking & Problem-Solving');
      expect(AI_READINESS_SKILLS).toContain('Adaptability & Continuous Learning');
      expect(AI_READINESS_SKILLS).toContain('Collaboration & Communication');
      expect(AI_READINESS_SKILLS).toContain('Responsible AI & Ethical Awareness');
      expect(AI_READINESS_SKILLS).toContain('Creativity & Innovation');
      expect(AI_READINESS_SKILLS).toContain('Domain Expertise');
    });

    it('is a readonly tuple', () => {
      expect(Array.isArray(AI_READINESS_SKILLS)).toBe(true);
    });
  });

  describe('FIT_SCORING_MATRIX', () => {
    it('has entries for questions 1-15 with options A-D', () => {
      for (let q = 1; q <= 15; q++) {
        for (const opt of ['A', 'B', 'C', 'D']) {
          const key = `${q}-${opt}`;
          expect(FIT_SCORING_MATRIX[key], `Missing matrix entry for ${key}`).toBeDefined();
        }
      }
    });

    it('has correct key format (number-letter)', () => {
      Object.keys(FIT_SCORING_MATRIX).forEach((key) => {
        expect(key).toMatch(/^\d+-[A-D]$/);
      });
    });

    it('all matrix entries map to valid FIT skills', () => {
      const validSkills = new Set(FIT_SKILLS);
      Object.entries(FIT_SCORING_MATRIX).forEach(([key, skills]) => {
        Object.keys(skills).forEach((skill) => {
          expect(validSkills.has(skill as any), `Invalid skill "${skill}" in ${key}`).toBe(true);
        });
      });
    });

    it('all point values are 4', () => {
      Object.entries(FIT_SCORING_MATRIX).forEach(([key, skills]) => {
        Object.entries(skills).forEach(([skill, points]) => {
          expect(points, `${key} -> ${skill} should be 4`).toBe(4);
        });
      });
    });

    it('values are objects mapping skill names to point numbers', () => {
      Object.entries(FIT_SCORING_MATRIX).forEach(([key, value]) => {
        expect(typeof value).toBe('object');
        Object.entries(value).forEach(([skill, points]) => {
          expect(typeof skill).toBe('string');
          expect(typeof points).toBe('number');
        });
      });
    });

    it('has 60 entries total (15 questions x 4 options)', () => {
      expect(Object.keys(FIT_SCORING_MATRIX)).toHaveLength(60);
    });
  });

  describe('AI_READINESS_SCORING_MATRIX', () => {
    it('has entries for questions 1-21 with options A-E', () => {
      for (let q = 1; q <= 21; q++) {
        for (const opt of ['A', 'B', 'C', 'D', 'E']) {
          const key = `${q}-${opt}`;
          expect(AI_READINESS_SCORING_MATRIX[key], `Missing matrix entry for ${key}`).toBeDefined();
        }
      }
    });

    it('has correct key format (number-letter)', () => {
      Object.keys(AI_READINESS_SCORING_MATRIX).forEach((key) => {
        expect(key).toMatch(/^\d+-[A-E]$/);
      });
    });

    it('all matrix entries map to valid AI Readiness skills', () => {
      const validSkills = new Set(AI_READINESS_SKILLS);
      Object.entries(AI_READINESS_SCORING_MATRIX).forEach(([key, skills]) => {
        Object.keys(skills).forEach((skill) => {
          expect(validSkills.has(skill as any), `Invalid skill "${skill}" in ${key}`).toBe(true);
        });
      });
    });

    it('all point values are 4', () => {
      Object.entries(AI_READINESS_SCORING_MATRIX).forEach(([key, skills]) => {
        Object.entries(skills).forEach(([skill, points]) => {
          expect(points, `${key} -> ${skill} should be 4`).toBe(4);
        });
      });
    });

    it('has 105 entries total (21 questions x 5 options)', () => {
      expect(Object.keys(AI_READINESS_SCORING_MATRIX)).toHaveLength(105);
    });

    it('values are objects mapping skill names to point numbers', () => {
      Object.entries(AI_READINESS_SCORING_MATRIX).forEach(([key, value]) => {
        expect(typeof value).toBe('object');
        Object.entries(value).forEach(([skill, points]) => {
          expect(typeof skill).toBe('string');
          expect(typeof points).toBe('number');
        });
      });
    });
  });

  describe('applyHybridScoring()', () => {
    it('uses midpoint when all skills have same percentage (pctRange == 0)', () => {
      const raw = { skillA: 50, skillB: 50, skillC: 50 };
      const result = applyHybridScoring(raw);

      const floor = 50 + Math.pow(50 / 100, 0.5) * 10;
      const ceiling = 50 + Math.pow(50 / 100, 0.25) * 50;
      const midpoint = Math.round((floor + ceiling) / 2);

      expect(result.skillA).toBe(midpoint);
      expect(result.skillB).toBe(midpoint);
      expect(result.skillC).toBe(midpoint);
    });

    it('computes correct floor and ceiling with varying percentages', () => {
      const raw = { skillA: 20, skillB: 80 };
      const result = applyHybridScoring(raw);

      const floor = 50 + Math.pow(20 / 100, 0.5) * 10;
      const ceiling = 50 + Math.pow(80 / 100, 0.25) * 50;

      expect(result.skillA).toBe(Math.round(floor));
      expect(result.skillB).toBe(Math.round(ceiling));
    });

    it('verifies floor formula: 50 + (minRawPct/100)^0.5 * 10', () => {
      const testCases = [
        { min: 0, expected: 50 + Math.pow(0 / 100, 0.5) * 10 },
        { min: 25, expected: 50 + Math.pow(25 / 100, 0.5) * 10 },
        { min: 50, expected: 50 + Math.pow(50 / 100, 0.5) * 10 },
        { min: 100, expected: 50 + Math.pow(100 / 100, 0.5) * 10 },
      ];

      for (const tc of testCases) {
        const raw = { skillA: tc.min, skillB: tc.min + 10 };
        const result = applyHybridScoring(raw);
        expect(result.skillA).toBe(Math.round(tc.expected));
      }
    });

    it('verifies ceiling formula: 50 + (maxRawPct/100)^0.25 * 50', () => {
      const testCases = [
        { max: 10, expected: 50 + Math.pow(10 / 100, 0.25) * 50 },
        { max: 50, expected: 50 + Math.pow(50 / 100, 0.25) * 50 },
        { max: 100, expected: 50 + Math.pow(100 / 100, 0.25) * 50 },
      ];

      for (const tc of testCases) {
        const raw = { skillA: tc.max - 5, skillB: tc.max };
        const result = applyHybridScoring(raw);
        expect(result.skillB).toBe(Math.round(tc.expected));
      }
    });

    it('handles all 0% edge case', () => {
      const raw = { skillA: 0, skillB: 0 };
      const result = applyHybridScoring(raw);

      const floor = 50 + Math.pow(0 / 100, 0.5) * 10;
      const ceiling = 50 + Math.pow(0 / 100, 0.25) * 50;
      const midpoint = Math.round((floor + ceiling) / 2);

      expect(result.skillA).toBe(midpoint);
      expect(result.skillB).toBe(midpoint);
    });

    it('handles all 100% edge case', () => {
      const raw = { skillA: 100, skillB: 100 };
      const result = applyHybridScoring(raw);

      const floor = 50 + Math.pow(100 / 100, 0.5) * 10;
      const ceiling = 50 + Math.pow(100 / 100, 0.25) * 50;
      const midpoint = Math.round((floor + ceiling) / 2);

      expect(result.skillA).toBe(midpoint);
      expect(result.skillB).toBe(midpoint);
    });

    it('handles min=0% max=100% range', () => {
      const raw = { skillA: 0, skillB: 100 };
      const result = applyHybridScoring(raw);

      const floor = 50 + Math.pow(0 / 100, 0.5) * 10;
      const ceiling = 50 + Math.pow(100 / 100, 0.25) * 50;

      expect(result.skillA).toBe(Math.round(floor));
      expect(result.skillB).toBe(Math.round(ceiling));
    });

    it('handles realistic percentages and all scores are within 50-100', () => {
      const raw = {
        'High Agency': 45,
        'Intellectual Curiosity': 60,
        'Resilience': 30,
        'Empathy & Ethics': 75,
        'Growth Mindset': 55,
        'Interpersonal Agility': 40,
      };
      const result = applyHybridScoring(raw);

      Object.values(result).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(50);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('returns scores for all input skills', () => {
      const raw = { a: 10, b: 50, c: 90 };
      const result = applyHybridScoring(raw);
      expect(Object.keys(result)).toEqual(Object.keys(raw));
    });

    it('min raw maps to floor and max raw maps to ceiling', () => {
      const raw = { low: 15, mid: 50, high: 85 };
      const result = applyHybridScoring(raw);

      const floor = 50 + Math.pow(15 / 100, 0.5) * 10;
      const ceiling = 50 + Math.pow(85 / 100, 0.25) * 50;

      expect(result.low).toBe(Math.round(floor));
      expect(result.high).toBe(Math.round(ceiling));
    });

    it('intermediate values scale linearly between floor and ceiling', () => {
      const raw = { low: 20, mid: 60, high: 100 };
      const result = applyHybridScoring(raw);

      const floor = 50 + Math.pow(20 / 100, 0.5) * 10;
      const ceiling = 50 + Math.pow(100 / 100, 0.25) * 50;
      const range = ceiling - floor;
      const relPos = (60 - 20) / (100 - 20);
      const expectedMid = Math.round(floor + relPos * range);

      expect(result.mid).toBe(expectedMid);
    });
  });

  describe('calculateFITScores()', () => {
    it('returns all 6 skills in output with standard answers', () => {
      const answers: Record<string, string> = {};
      for (let i = 1; i <= 15; i++) {
        answers[`q${i}`] = 'a';
      }
      const result = calculateFITScores(answers);

      FIT_SKILLS.forEach((skill) => {
        expect(result[skill]).toBeDefined();
        expect(typeof result[skill]).toBe('number');
      });
    });

    it('normalizes q prefix format to matrix lookup', () => {
      const answers1 = { q1: 'a', q2: 'b' };
      const answers2 = { '1': 'A', '2': 'B' };
      const result1 = calculateFITScores(answers1);
      const result2 = calculateFITScores(answers2);

      expect(result1).toEqual(result2);
    });

    it('normalizes question prefix format', () => {
      const answers1 = { question1: 'a' };
      const answers2 = { q1: 'a' };
      const result1 = calculateFITScores(answers1);
      const result2 = calculateFITScores(answers2);

      expect(result1).toEqual(result2);
    });

    it('handles uppercase and lowercase answers identically', () => {
      const lower = { q1: 'a', q2: 'b' };
      const upper = { q1: 'A', q2: 'B' };
      expect(calculateFITScores(lower)).toEqual(calculateFITScores(upper));
    });

    it('handles empty answers and returns hybrid scored zeros', () => {
      const result = calculateFITScores({});
      FIT_SKILLS.forEach((skill) => {
        expect(result[skill]).toBeDefined();
        expect(typeof result[skill]).toBe('number');
      });
    });

    it('skips invalid/empty answer values without crashing', () => {
      const answers = { q1: '', q2: 'z', q3: 'a' } as any;
      expect(() => calculateFITScores(answers)).not.toThrow();
      const result = calculateFITScores(answers);
      FIT_SKILLS.forEach((skill) => {
        expect(result[skill]).toBeDefined();
      });
    });

    it('produces different scores for different answer patterns', () => {
      const allA: Record<string, string> = {};
      const allB: Record<string, string> = {};
      for (let i = 1; i <= 15; i++) {
        allA[`q${i}`] = 'a';
        allB[`q${i}`] = 'b';
      }
      const resultA = calculateFITScores(allA);
      const resultB = calculateFITScores(allB);
      expect(Object.values(resultA)).not.toEqual(Object.values(resultB));
    });

    it('all scores are between 50 and 100 for valid answers', () => {
      const answers: Record<string, string> = {};
      for (let i = 1; i <= 15; i++) {
        answers[`q${i}`] = ['a', 'b', 'c', 'd'][i % 4];
      }
      const result = calculateFITScores(answers);
      Object.values(result).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(50);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('all same answer letter (all A) produces valid scores', () => {
      const answers: Record<string, string> = {};
      for (let i = 1; i <= 15; i++) {
        answers[`q${i}`] = 'a';
      }
      const result = calculateFITScores(answers);
      Object.values(result).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(50);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('all same answer letter (all D) produces valid scores', () => {
      const answers: Record<string, string> = {};
      for (let i = 1; i <= 15; i++) {
        answers[`q${i}`] = 'd';
      }
      const result = calculateFITScores(answers);
      Object.values(result).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(50);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('partial answers still produce valid output', () => {
      const answers = { q1: 'a', q5: 'c', q10: 'b' };
      const result = calculateFITScores(answers);
      FIT_SKILLS.forEach((skill) => {
        expect(result[skill]).toBeDefined();
        expect(typeof result[skill]).toBe('number');
      });
    });

    it('handles answers with whitespace in values', () => {
      const answers = { q1: ' a ', q2: ' b' };
      const answersClean = { q1: 'a', q2: 'b' };
      const result1 = calculateFITScores(answers);
      const result2 = calculateFITScores(answersClean);
      expect(result1).toEqual(result2);
    });
  });

  describe('calculateAIReadinessScores()', () => {
    it('returns all 9 skills in output with standard answers', () => {
      const answers: Record<string, string> = {};
      for (let i = 1; i <= 21; i++) {
        answers[`q${i}`] = 'a';
      }
      const result = calculateAIReadinessScores(answers);

      AI_READINESS_SKILLS.forEach((skill) => {
        expect(result[skill]).toBeDefined();
        expect(typeof result[skill]).toBe('number');
      });
    });

    it('normalizes q prefix and case', () => {
      const answers1 = { q1: 'a', q2: 'b' };
      const answers2 = { '1': 'A', '2': 'B' };
      const result1 = calculateAIReadinessScores(answers1);
      const result2 = calculateAIReadinessScores(answers2);

      expect(result1).toEqual(result2);
    });

    it('normalizes question prefix format', () => {
      const answers1 = { question1: 'a' };
      const answers2 = { q1: 'a' };
      const result1 = calculateAIReadinessScores(answers1);
      const result2 = calculateAIReadinessScores(answers2);

      expect(result1).toEqual(result2);
    });

    it('all scores are between 50 and 100 for valid answers', () => {
      const answers: Record<string, string> = {};
      const options = ['a', 'b', 'c', 'd', 'e'];
      for (let i = 1; i <= 21; i++) {
        answers[`q${i}`] = options[i % 5];
      }
      const result = calculateAIReadinessScores(answers);
      Object.values(result).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(50);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('handles empty answers', () => {
      const result = calculateAIReadinessScores({});
      AI_READINESS_SKILLS.forEach((skill) => {
        expect(result[skill]).toBeDefined();
      });
    });

    it('handles invalid answers without crashing', () => {
      const answers = { q1: '', q2: 'z', q3: 'a' } as any;
      expect(() => calculateAIReadinessScores(answers)).not.toThrow();
    });

    it('produces different scores for different answer patterns', () => {
      const allA: Record<string, string> = {};
      const allC: Record<string, string> = {};
      for (let i = 1; i <= 21; i++) {
        allA[`q${i}`] = 'a';
        allC[`q${i}`] = 'c';
      }
      const resultA = calculateAIReadinessScores(allA);
      const resultC = calculateAIReadinessScores(allC);
      expect(Object.values(resultA)).not.toEqual(Object.values(resultC));
    });

    it('all same answer letter (all E) produces valid scores', () => {
      const answers: Record<string, string> = {};
      for (let i = 1; i <= 21; i++) {
        answers[`q${i}`] = 'e';
      }
      const result = calculateAIReadinessScores(answers);
      Object.values(result).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(50);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('partial answers still produce valid output', () => {
      const answers = { q1: 'a', q10: 'c', q21: 'e' };
      const result = calculateAIReadinessScores(answers);
      AI_READINESS_SKILLS.forEach((skill) => {
        expect(result[skill]).toBeDefined();
        expect(typeof result[skill]).toBe('number');
      });
    });
  });
});
