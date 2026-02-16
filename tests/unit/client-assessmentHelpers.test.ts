import { describe, it, expect } from 'vitest';
import {
  formatAssessmentName,
  isAllAssessmentsComplete,
} from '@/lib/assessmentHelpers';

describe('formatAssessmentName', () => {
  it('formats fit as FIT', () => {
    expect(formatAssessmentName('fit')).toBe('FIT');
  });

  it('formats ai_readiness as AI Readiness', () => {
    expect(formatAssessmentName('ai_readiness')).toBe('AI Readiness');
  });

  it('formats prompt_architecture as Prompt Architecture', () => {
    expect(formatAssessmentName('prompt_architecture')).toBe('Prompt Architecture');
  });

  it('formats aiq as AIQ', () => {
    expect(formatAssessmentName('aiq')).toBe('AIQ');
  });

  it('uppercases unknown types', () => {
    expect(formatAssessmentName('unknown_type')).toBe('UNKNOWN_TYPE');
  });
});

describe('isAllAssessmentsComplete', () => {
  it('returns true when 4 results are completed', () => {
    const results = [
      { status: 'completed' },
      { status: 'completed' },
      { status: 'completed' },
      { status: 'completed' },
    ];
    expect(isAllAssessmentsComplete(results)).toBe(true);
  });

  it('returns false when only 3 results are completed', () => {
    const results = [
      { status: 'completed' },
      { status: 'completed' },
      { status: 'completed' },
      { status: 'pending' },
    ];
    expect(isAllAssessmentsComplete(results)).toBe(false);
  });

  it('supports custom totalAssessments parameter', () => {
    const results = [
      { status: 'completed' },
      { status: 'completed' },
    ];
    expect(isAllAssessmentsComplete(results, 2)).toBe(true);
    expect(isAllAssessmentsComplete(results, 3)).toBe(false);
  });

  it('returns false with empty array', () => {
    expect(isAllAssessmentsComplete([])).toBe(false);
  });

  it('returns true when completed count exceeds totalAssessments', () => {
    const results = [
      { status: 'completed' },
      { status: 'completed' },
      { status: 'completed' },
      { status: 'completed' },
      { status: 'completed' },
    ];
    expect(isAllAssessmentsComplete(results, 3)).toBe(true);
  });
});
