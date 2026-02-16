import { describe, it, expect } from 'vitest';
import {
  getFITQuestions,
  getAIReadinessQuestions,
  getAIQQuestions,
  getQuestionsForAssessment,
  FIT_QUESTIONS_DEFAULT,
  FIT_QUESTIONS_SEA,
  AI_READINESS_QUESTIONS_DEFAULT,
  AI_READINESS_QUESTIONS_SEA,
  AIQ_QUESTIONS_DEFAULT,
  AIQ_QUESTIONS_SEA,
} from '@shared/questions/index';
import type {
  BaseOption,
  FITQuestion,
  AIReadinessQuestion,
  AIQQuestion,
  AIQOption,
  PromptArchitectureLevel,
  LocalizedQuestions,
  QuestionLocale,
} from '@shared/questions/types';

describe('shared/questions/types.ts', () => {
  it('exports QuestionLocale type', () => {
    const locale: QuestionLocale = 'default';
    expect(locale).toBe('default');
  });

  it('exports BaseOption interface shape', () => {
    const option: BaseOption = { value: 'A', text: 'Test' };
    expect(option).toHaveProperty('value');
    expect(option).toHaveProperty('text');
  });

  it('exports FITQuestion interface shape', () => {
    const q: FITQuestion = { id: '1', text: 'Test', options: [{ value: 'A', text: 'Opt' }] };
    expect(q).toHaveProperty('id');
    expect(q).toHaveProperty('text');
    expect(q).toHaveProperty('options');
  });

  it('exports AIReadinessQuestion interface shape', () => {
    const q: AIReadinessQuestion = { id: '1', text: 'Test', options: [{ value: 'A', text: 'Opt' }] };
    expect(q).toHaveProperty('id');
    expect(q).toHaveProperty('text');
    expect(q).toHaveProperty('options');
  });

  it('exports AIQOption interface with score', () => {
    const opt: AIQOption = { value: 'A', text: 'Test', score: 100 };
    expect(opt).toHaveProperty('score');
    expect(opt.score).toBe(100);
  });

  it('exports AIQQuestion interface shape', () => {
    const q: AIQQuestion = { id: '1', text: 'Test', options: [{ value: 'A', text: 'Opt', score: 50 }] };
    expect(q).toHaveProperty('id');
    expect(q.options[0]).toHaveProperty('score');
  });

  it('exports PromptArchitectureLevel interface shape', () => {
    const level: PromptArchitectureLevel = {
      level: 1,
      title: 'Title',
      description: 'Desc',
      task: 'Task',
      hints: ['hint1'],
      evaluationCriteria: ['criteria1'],
    };
    expect(level).toHaveProperty('level');
    expect(level).toHaveProperty('hints');
    expect(level).toHaveProperty('evaluationCriteria');
  });

  it('exports LocalizedQuestions interface shape', () => {
    const lq: LocalizedQuestions = {
      fit: [],
      aiReadiness: [],
      aiq: [],
      promptArchitecture: [],
    };
    expect(lq).toHaveProperty('fit');
    expect(lq).toHaveProperty('aiReadiness');
    expect(lq).toHaveProperty('aiq');
    expect(lq).toHaveProperty('promptArchitecture');
  });
});

describe('shared/questions - FIT_QUESTIONS_DEFAULT', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(FIT_QUESTIONS_DEFAULT)).toBe(true);
    expect(FIT_QUESTIONS_DEFAULT.length).toBeGreaterThan(0);
  });

  it('has 15 questions', () => {
    expect(FIT_QUESTIONS_DEFAULT).toHaveLength(15);
  });

  it('each question has id, text, and options', () => {
    FIT_QUESTIONS_DEFAULT.forEach((q) => {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('text');
      expect(q).toHaveProperty('options');
      expect(typeof q.id).toBe('string');
      expect(typeof q.text).toBe('string');
      expect(Array.isArray(q.options)).toBe(true);
    });
  });

  it('each option has value and text', () => {
    FIT_QUESTIONS_DEFAULT.forEach((q) => {
      q.options.forEach((opt) => {
        expect(opt).toHaveProperty('value');
        expect(opt).toHaveProperty('text');
        expect(typeof opt.value).toBe('string');
        expect(typeof opt.text).toBe('string');
      });
    });
  });

  it('each question has 4 options', () => {
    FIT_QUESTIONS_DEFAULT.forEach((q) => {
      expect(q.options).toHaveLength(4);
    });
  });
});

describe('shared/questions - FIT_QUESTIONS_SEA', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(FIT_QUESTIONS_SEA)).toBe(true);
    expect(FIT_QUESTIONS_SEA.length).toBeGreaterThan(0);
  });

  it('has 15 questions', () => {
    expect(FIT_QUESTIONS_SEA).toHaveLength(15);
  });

  it('each question has id, text, and options with value and text', () => {
    FIT_QUESTIONS_SEA.forEach((q) => {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('text');
      expect(Array.isArray(q.options)).toBe(true);
      q.options.forEach((opt) => {
        expect(opt).toHaveProperty('value');
        expect(opt).toHaveProperty('text');
      });
    });
  });
});

describe('shared/questions - AI_READINESS_QUESTIONS_DEFAULT', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(AI_READINESS_QUESTIONS_DEFAULT)).toBe(true);
    expect(AI_READINESS_QUESTIONS_DEFAULT.length).toBeGreaterThan(0);
  });

  it('has 21 questions', () => {
    expect(AI_READINESS_QUESTIONS_DEFAULT).toHaveLength(21);
  });

  it('each question has id, text, and options', () => {
    AI_READINESS_QUESTIONS_DEFAULT.forEach((q) => {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('text');
      expect(Array.isArray(q.options)).toBe(true);
    });
  });

  it('each question has 5 options (A-E)', () => {
    AI_READINESS_QUESTIONS_DEFAULT.forEach((q) => {
      expect(q.options).toHaveLength(5);
      const values = q.options.map((o) => o.value);
      expect(values).toContain('A');
      expect(values).toContain('B');
      expect(values).toContain('C');
      expect(values).toContain('D');
      expect(values).toContain('E');
    });
  });
});

describe('shared/questions - AI_READINESS_QUESTIONS_SEA', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(AI_READINESS_QUESTIONS_SEA)).toBe(true);
    expect(AI_READINESS_QUESTIONS_SEA.length).toBeGreaterThan(0);
  });

  it('has 21 questions', () => {
    expect(AI_READINESS_QUESTIONS_SEA).toHaveLength(21);
  });

  it('each question has id, text, and options with value and text', () => {
    AI_READINESS_QUESTIONS_SEA.forEach((q) => {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('text');
      q.options.forEach((opt) => {
        expect(opt).toHaveProperty('value');
        expect(opt).toHaveProperty('text');
      });
    });
  });
});

describe('shared/questions - AIQ_QUESTIONS_DEFAULT', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(AIQ_QUESTIONS_DEFAULT)).toBe(true);
    expect(AIQ_QUESTIONS_DEFAULT.length).toBeGreaterThan(0);
  });

  it('has 8 questions', () => {
    expect(AIQ_QUESTIONS_DEFAULT).toHaveLength(8);
  });

  it('each question has id, text, and options with score', () => {
    AIQ_QUESTIONS_DEFAULT.forEach((q) => {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('text');
      expect(Array.isArray(q.options)).toBe(true);
      q.options.forEach((opt) => {
        expect(opt).toHaveProperty('value');
        expect(opt).toHaveProperty('text');
        expect(opt).toHaveProperty('score');
        expect(typeof opt.score).toBe('number');
      });
    });
  });

  it('each question has 4 options', () => {
    AIQ_QUESTIONS_DEFAULT.forEach((q) => {
      expect(q.options).toHaveLength(4);
    });
  });
});

describe('shared/questions - AIQ_QUESTIONS_SEA', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(AIQ_QUESTIONS_SEA)).toBe(true);
    expect(AIQ_QUESTIONS_SEA.length).toBeGreaterThan(0);
  });

  it('has 8 questions', () => {
    expect(AIQ_QUESTIONS_SEA).toHaveLength(8);
  });

  it('each question has id, text, and options with score', () => {
    AIQ_QUESTIONS_SEA.forEach((q) => {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('text');
      q.options.forEach((opt) => {
        expect(opt).toHaveProperty('value');
        expect(opt).toHaveProperty('text');
        expect(opt).toHaveProperty('score');
        expect(typeof opt.score).toBe('number');
      });
    });
  });
});

describe('shared/questions/index.ts - getFITQuestions', () => {
  it('returns default questions for "default" locale', () => {
    const result = getFITQuestions('default');
    expect(result).toBe(FIT_QUESTIONS_DEFAULT);
  });

  it('returns SEA questions for "sea" locale', () => {
    const result = getFITQuestions('sea');
    expect(result).toBe(FIT_QUESTIONS_SEA);
  });
});

describe('shared/questions/index.ts - getAIReadinessQuestions', () => {
  it('returns default questions for "default" locale', () => {
    const result = getAIReadinessQuestions('default');
    expect(result).toBe(AI_READINESS_QUESTIONS_DEFAULT);
  });

  it('returns SEA questions for "sea" locale', () => {
    const result = getAIReadinessQuestions('sea');
    expect(result).toBe(AI_READINESS_QUESTIONS_SEA);
  });
});

describe('shared/questions/index.ts - getAIQQuestions', () => {
  it('returns default questions for "default" locale', () => {
    const result = getAIQQuestions('default');
    expect(result).toBe(AIQ_QUESTIONS_DEFAULT);
  });

  it('returns SEA questions for "sea" locale', () => {
    const result = getAIQQuestions('sea');
    expect(result).toBe(AIQ_QUESTIONS_SEA);
  });
});

describe('shared/questions/index.ts - getQuestionsForAssessment', () => {
  it('returns FIT questions for "fit" type', () => {
    const result = getQuestionsForAssessment('fit', 'default');
    expect(result).toBe(FIT_QUESTIONS_DEFAULT);
  });

  it('returns FIT questions case-insensitively', () => {
    const result = getQuestionsForAssessment('FIT', 'default');
    expect(result).toBe(FIT_QUESTIONS_DEFAULT);
  });

  it('returns AI Readiness questions for "ai-readiness" type', () => {
    const result = getQuestionsForAssessment('ai-readiness', 'default');
    expect(result).toBe(AI_READINESS_QUESTIONS_DEFAULT);
  });

  it('returns AI Readiness questions for "aireadiness" type', () => {
    const result = getQuestionsForAssessment('aireadiness', 'default');
    expect(result).toBe(AI_READINESS_QUESTIONS_DEFAULT);
  });

  it('returns AIQ questions for "aiq" type', () => {
    const result = getQuestionsForAssessment('aiq', 'default');
    expect(result).toBe(AIQ_QUESTIONS_DEFAULT);
  });

  it('returns SEA FIT questions for "fit" type with "sea" locale', () => {
    const result = getQuestionsForAssessment('fit', 'sea');
    expect(result).toBe(FIT_QUESTIONS_SEA);
  });

  it('returns SEA AI Readiness questions for "ai-readiness" with "sea" locale', () => {
    const result = getQuestionsForAssessment('ai-readiness', 'sea');
    expect(result).toBe(AI_READINESS_QUESTIONS_SEA);
  });

  it('returns SEA AIQ questions for "aiq" with "sea" locale', () => {
    const result = getQuestionsForAssessment('aiq', 'sea');
    expect(result).toBe(AIQ_QUESTIONS_SEA);
  });

  it('returns null for unknown assessment type', () => {
    const result = getQuestionsForAssessment('unknown', 'default');
    expect(result).toBeNull();
  });

  it('returns null for empty string assessment type', () => {
    const result = getQuestionsForAssessment('', 'default');
    expect(result).toBeNull();
  });
});
