import type { QuestionLocale, FITQuestion, AIReadinessQuestion, AIQQuestion } from './types';
import { FIT_QUESTIONS_DEFAULT } from './fit-default';
import { FIT_QUESTIONS_SEA } from './fit-sea';
import { AI_READINESS_QUESTIONS_DEFAULT } from './ai-readiness-default';
import { AI_READINESS_QUESTIONS_SEA } from './ai-readiness-sea';
import { AIQ_QUESTIONS_DEFAULT } from './aiq-default';
import { AIQ_QUESTIONS_SEA } from './aiq-sea';

export * from './types';

export function getFITQuestions(locale: QuestionLocale): FITQuestion[] {
  return locale === 'sea' ? FIT_QUESTIONS_SEA : FIT_QUESTIONS_DEFAULT;
}

export function getAIReadinessQuestions(locale: QuestionLocale): AIReadinessQuestion[] {
  return locale === 'sea' ? AI_READINESS_QUESTIONS_SEA : AI_READINESS_QUESTIONS_DEFAULT;
}

export function getAIQQuestions(locale: QuestionLocale): AIQQuestion[] {
  return locale === 'sea' ? AIQ_QUESTIONS_SEA : AIQ_QUESTIONS_DEFAULT;
}

export function getQuestionsForAssessment(
  assessmentType: string,
  locale: QuestionLocale
): FITQuestion[] | AIReadinessQuestion[] | AIQQuestion[] | null {
  switch (assessmentType.toLowerCase()) {
    case 'fit':
      return getFITQuestions(locale);
    case 'ai-readiness':
    case 'aireadiness':
      return getAIReadinessQuestions(locale);
    case 'aiq':
      return getAIQQuestions(locale);
    default:
      return null;
  }
}

export { FIT_QUESTIONS_DEFAULT, FIT_QUESTIONS_SEA };
export { AI_READINESS_QUESTIONS_DEFAULT, AI_READINESS_QUESTIONS_SEA };
export { AIQ_QUESTIONS_DEFAULT, AIQ_QUESTIONS_SEA };
