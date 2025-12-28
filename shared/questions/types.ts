import type { QuestionLocale } from '../currencies';

export interface BaseOption {
  value: string;
  text: string;
}

export interface FITQuestion {
  id: string;
  text: string;
  options: BaseOption[];
}

export interface AIReadinessQuestion {
  id: string;
  text: string;
  options: BaseOption[];
}

export interface AIQOption extends BaseOption {
  score: number;
}

export interface AIQQuestion {
  id: string;
  text: string;
  options: AIQOption[];
}

export interface PromptArchitectureLevel {
  level: number;
  title: string;
  description: string;
  task: string;
  hints: string[];
  evaluationCriteria: string[];
}

export interface LocalizedQuestions {
  fit: FITQuestion[];
  aiReadiness: AIReadinessQuestion[];
  aiq: AIQQuestion[];
  promptArchitecture: PromptArchitectureLevel[];
}

export { QuestionLocale };
