import { describe, it, expect } from 'vitest';
import {
  FIT_SKILL_NAMES,
  FIT_SKILL_CODES,
  FIT_SKILLS_ARRAY,
  AI_READINESS_SKILL_NAMES,
  AI_READINESS_SKILL_CODES,
  AI_READINESS_SKILLS_ARRAY,
  AIQ_SKILL_NAMES,
  AIQ_SKILL_CODES,
  AIQ_SKILLS_ARRAY,
  PROMPT_ARCHITECTURE_SKILL_NAMES,
  PROMPT_ARCHITECTURE_SKILL_CODES,
  PROMPT_ARCHITECTURE_SKILLS_ARRAY,
  LEGACY_TO_CANONICAL_AI_READINESS,
  isValidFitSkill,
  isValidAIReadinessSkill,
  isValidAIQSkill,
  isValidPromptArchitectureSkill,
  getSkillCode,
  normalizeAIReadinessScores,
  normalizeAIReadinessSkillName,
} from '@shared/skillNames';

describe('shared/skillNames', () => {
  describe('FIT_SKILL_NAMES', () => {
    it('has 6 skills', () => {
      expect(Object.keys(FIT_SKILL_NAMES)).toHaveLength(6);
    });

    it('has expected skill names', () => {
      expect(FIT_SKILL_NAMES.HIGH_AGENCY).toBe('High Agency');
      expect(FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY).toBe('Intellectual Curiosity');
      expect(FIT_SKILL_NAMES.RESILIENCE).toBe('Resilience');
      expect(FIT_SKILL_NAMES.EMPATHY_ETHICS).toBe('Empathy & Ethics');
      expect(FIT_SKILL_NAMES.GROWTH_MINDSET).toBe('Growth Mindset');
      expect(FIT_SKILL_NAMES.INTERPERSONAL_AGILITY).toBe('Interpersonal Agility');
    });
  });

  describe('FIT_SKILL_CODES', () => {
    it('maps each FIT skill to a code', () => {
      expect(FIT_SKILL_CODES['High Agency']).toBe('HA');
      expect(FIT_SKILL_CODES['Intellectual Curiosity']).toBe('IC');
      expect(FIT_SKILL_CODES['Resilience']).toBe('RA');
      expect(FIT_SKILL_CODES['Empathy & Ethics']).toBe('EE');
      expect(FIT_SKILL_CODES['Growth Mindset']).toBe('GM');
      expect(FIT_SKILL_CODES['Interpersonal Agility']).toBe('IA');
    });
  });

  describe('AI_READINESS_SKILL_NAMES', () => {
    it('has 9 skills', () => {
      expect(Object.keys(AI_READINESS_SKILL_NAMES)).toHaveLength(9);
    });

    it('has expected skill names', () => {
      expect(AI_READINESS_SKILL_NAMES.AI_LITERACY).toBe('AI Literacy & Prompt Engineering');
      expect(AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS).toBe('Technical Fundamentals');
      expect(AI_READINESS_SKILL_NAMES.DATA_FLUENCY).toBe('Data Fluency');
      expect(AI_READINESS_SKILL_NAMES.CRITICAL_THINKING).toBe('Critical Thinking & Problem-Solving');
      expect(AI_READINESS_SKILL_NAMES.ADAPTABILITY).toBe('Adaptability & Continuous Learning');
      expect(AI_READINESS_SKILL_NAMES.COLLABORATION).toBe('Collaboration & Communication');
      expect(AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI).toBe('Responsible AI & Ethical Awareness');
      expect(AI_READINESS_SKILL_NAMES.CREATIVITY).toBe('Creativity & Innovation');
      expect(AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE).toBe('Domain Expertise');
    });
  });

  describe('AI_READINESS_SKILL_CODES', () => {
    it('maps each AI Readiness skill to a code', () => {
      expect(AI_READINESS_SKILL_CODES['AI Literacy & Prompt Engineering']).toBe('AL/PE');
      expect(AI_READINESS_SKILL_CODES['Technical Fundamentals']).toBe('TF');
      expect(AI_READINESS_SKILL_CODES['Data Fluency']).toBe('DF');
      expect(AI_READINESS_SKILL_CODES['Critical Thinking & Problem-Solving']).toBe('CT/PS');
      expect(AI_READINESS_SKILL_CODES['Adaptability & Continuous Learning']).toBe('ACL');
      expect(AI_READINESS_SKILL_CODES['Collaboration & Communication']).toBe('CC');
      expect(AI_READINESS_SKILL_CODES['Responsible AI & Ethical Awareness']).toBe('RAI');
      expect(AI_READINESS_SKILL_CODES['Creativity & Innovation']).toBe('CI');
      expect(AI_READINESS_SKILL_CODES['Domain Expertise']).toBe('DE');
    });
  });

  describe('AIQ_SKILL_NAMES', () => {
    it('has 4 skills', () => {
      expect(Object.keys(AIQ_SKILL_NAMES)).toHaveLength(4);
    });

    it('has expected skill names', () => {
      expect(AIQ_SKILL_NAMES.TRANSPARENCY).toBe('Transparency');
      expect(AIQ_SKILL_NAMES.ACCOUNTABILITY).toBe('Accountability');
      expect(AIQ_SKILL_NAMES.BIAS_AWARENESS).toBe('Bias Awareness');
      expect(AIQ_SKILL_NAMES.PRIVACY_SENSITIVITY).toBe('Privacy Sensitivity');
    });
  });

  describe('PROMPT_ARCHITECTURE_SKILL_NAMES', () => {
    it('has 4 skills', () => {
      expect(Object.keys(PROMPT_ARCHITECTURE_SKILL_NAMES)).toHaveLength(4);
    });

    it('has expected skill names', () => {
      expect(PROMPT_ARCHITECTURE_SKILL_NAMES.CLARITY).toBe('Clarity');
      expect(PROMPT_ARCHITECTURE_SKILL_NAMES.CONTEXT_SETTING).toBe('Context Setting');
      expect(PROMPT_ARCHITECTURE_SKILL_NAMES.OUTPUT_FORMATTING).toBe('Output Formatting');
      expect(PROMPT_ARCHITECTURE_SKILL_NAMES.CONSTRAINT_DEFINITION).toBe('Constraint Definition');
    });
  });

  describe('getSkillCode()', () => {
    it('returns code for FIT skills', () => {
      expect(getSkillCode('High Agency')).toBe('HA');
      expect(getSkillCode('Resilience')).toBe('RA');
    });

    it('returns code for AI Readiness skills', () => {
      expect(getSkillCode('AI Literacy & Prompt Engineering')).toBe('AL/PE');
      expect(getSkillCode('Technical Fundamentals')).toBe('TF');
    });

    it('returns code for AIQ skills', () => {
      expect(getSkillCode('Transparency')).toBe('T');
      expect(getSkillCode('Bias Awareness')).toBe('BA');
    });

    it('returns code for Prompt Architecture skills', () => {
      expect(getSkillCode('Clarity')).toBe('CL');
      expect(getSkillCode('Context Setting')).toBe('CS');
    });

    it('returns code for legacy skill names', () => {
      expect(getSkillCode('AI Literacy')).toBe('AL/PE');
      expect(getSkillCode('Technical Fluency')).toBe('TF');
      expect(getSkillCode('Domain Fluency')).toBe('DF');
      expect(getSkillCode('Critical Thinking')).toBe('CT/PS');
      expect(getSkillCode('Adaptive Learning')).toBe('ACL');
      expect(getSkillCode('Collaboration')).toBe('CC');
      expect(getSkillCode('Cross-functional Collaboration')).toBe('CC');
      expect(getSkillCode('Responsible AI')).toBe('RAI');
      expect(getSkillCode('Creative Innovation')).toBe('CI');
    });

    it('returns skill name itself for unknown skills', () => {
      expect(getSkillCode('Unknown Skill')).toBe('Unknown Skill');
    });
  });

  describe('isValidFitSkill()', () => {
    it('returns true for valid FIT skills', () => {
      for (const skill of FIT_SKILLS_ARRAY) {
        expect(isValidFitSkill(skill)).toBe(true);
      }
    });

    it('returns false for non-FIT skills', () => {
      expect(isValidFitSkill('Transparency')).toBe(false);
      expect(isValidFitSkill('Unknown')).toBe(false);
    });
  });

  describe('isValidAIReadinessSkill()', () => {
    it('returns true for valid AI Readiness skills', () => {
      for (const skill of AI_READINESS_SKILLS_ARRAY) {
        expect(isValidAIReadinessSkill(skill)).toBe(true);
      }
    });

    it('returns false for legacy skill names', () => {
      expect(isValidAIReadinessSkill('AI Literacy')).toBe(false);
    });

    it('returns false for non-AI Readiness skills', () => {
      expect(isValidAIReadinessSkill('High Agency')).toBe(false);
    });
  });

  describe('isValidAIQSkill()', () => {
    it('returns true for valid AIQ skills', () => {
      for (const skill of AIQ_SKILLS_ARRAY) {
        expect(isValidAIQSkill(skill)).toBe(true);
      }
    });

    it('returns false for non-AIQ skills', () => {
      expect(isValidAIQSkill('High Agency')).toBe(false);
      expect(isValidAIQSkill('Unknown')).toBe(false);
    });
  });

  describe('isValidPromptArchitectureSkill()', () => {
    it('returns true for valid Prompt Architecture skills', () => {
      for (const skill of PROMPT_ARCHITECTURE_SKILLS_ARRAY) {
        expect(isValidPromptArchitectureSkill(skill)).toBe(true);
      }
    });

    it('returns false for non-Prompt Architecture skills', () => {
      expect(isValidPromptArchitectureSkill('High Agency')).toBe(false);
    });
  });

  describe('LEGACY_TO_CANONICAL_AI_READINESS', () => {
    it('maps AI Literacy to canonical name', () => {
      expect(LEGACY_TO_CANONICAL_AI_READINESS['AI Literacy']).toBe('AI Literacy & Prompt Engineering');
    });

    it('maps AI Literacy/Prompting to canonical name', () => {
      expect(LEGACY_TO_CANONICAL_AI_READINESS['AI Literacy/Prompting']).toBe('AI Literacy & Prompt Engineering');
    });

    it('maps Technical Fluency to Technical Fundamentals', () => {
      expect(LEGACY_TO_CANONICAL_AI_READINESS['Technical Fluency']).toBe('Technical Fundamentals');
    });

    it('maps Domain Fluency to Data Fluency', () => {
      expect(LEGACY_TO_CANONICAL_AI_READINESS['Domain Fluency']).toBe('Data Fluency');
    });

    it('maps Critical Thinking to canonical name', () => {
      expect(LEGACY_TO_CANONICAL_AI_READINESS['Critical Thinking']).toBe('Critical Thinking & Problem-Solving');
    });

    it('maps Adaptive Learning to Adaptability', () => {
      expect(LEGACY_TO_CANONICAL_AI_READINESS['Adaptive Learning']).toBe('Adaptability & Continuous Learning');
    });

    it('maps Collaboration to canonical name', () => {
      expect(LEGACY_TO_CANONICAL_AI_READINESS['Collaboration']).toBe('Collaboration & Communication');
    });

    it('maps Cross-functional Collaboration to canonical name', () => {
      expect(LEGACY_TO_CANONICAL_AI_READINESS['Cross-functional Collaboration']).toBe('Collaboration & Communication');
    });

    it('maps Responsible AI to canonical name', () => {
      expect(LEGACY_TO_CANONICAL_AI_READINESS['Responsible AI']).toBe('Responsible AI & Ethical Awareness');
    });

    it('maps Creative Innovation to canonical name', () => {
      expect(LEGACY_TO_CANONICAL_AI_READINESS['Creative Innovation']).toBe('Creativity & Innovation');
    });
  });

  describe('normalizeAIReadinessScores()', () => {
    it('passes through canonical keys unchanged', () => {
      const scores = {
        'AI Literacy & Prompt Engineering': 85,
        'Technical Fundamentals': 70,
        'Data Fluency': 65,
      };
      const result = normalizeAIReadinessScores(scores);
      expect(result['AI Literacy & Prompt Engineering']).toBe(85);
      expect(result['Technical Fundamentals']).toBe(70);
      expect(result['Data Fluency']).toBe(65);
    });

    it('converts legacy keys to canonical', () => {
      const scores = {
        'AI Literacy': 85,
        'Technical Fluency': 70,
        'Domain Fluency': 65,
        'Critical Thinking': 80,
        'Adaptive Learning': 75,
      };
      const result = normalizeAIReadinessScores(scores);
      expect(result['AI Literacy & Prompt Engineering']).toBe(85);
      expect(result['Technical Fundamentals']).toBe(70);
      expect(result['Data Fluency']).toBe(65);
      expect(result['Critical Thinking & Problem-Solving']).toBe(80);
      expect(result['Adaptability & Continuous Learning']).toBe(75);
    });

    it('handles mixed legacy and canonical keys', () => {
      const scores = {
        'AI Literacy': 85,
        'Technical Fundamentals': 70,
      };
      const result = normalizeAIReadinessScores(scores);
      expect(result['AI Literacy & Prompt Engineering']).toBe(85);
      expect(result['Technical Fundamentals']).toBe(70);
    });

    it('does not overwrite existing canonical key with legacy value', () => {
      const scores = {
        'AI Literacy & Prompt Engineering': 90,
        'AI Literacy': 85,
      };
      const result = normalizeAIReadinessScores(scores);
      expect(result['AI Literacy & Prompt Engineering']).toBe(90);
    });

    it('handles empty object', () => {
      const result = normalizeAIReadinessScores({});
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('passes through unknown keys as-is', () => {
      const scores = { 'Unknown Skill': 50 };
      const result = normalizeAIReadinessScores(scores);
      expect(result['Unknown Skill']).toBe(50);
    });
  });
});
