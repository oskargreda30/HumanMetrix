import { describe, it, expect } from 'vitest';
import {
  SKILL_ACRONYMS,
  getSkillAcronym,
  normalizeAIReadinessScores,
  getAIReadinessScore,
} from '@/lib/assessmentSkills';

describe('SKILL_ACRONYMS', () => {
  it('has entries for FIT skills', () => {
    expect(SKILL_ACRONYMS['High Agency']).toBe('HA');
    expect(SKILL_ACRONYMS['Intellectual Curiosity']).toBe('IC');
    expect(SKILL_ACRONYMS['Resilience']).toBe('RA');
    expect(SKILL_ACRONYMS['Empathy & Ethics']).toBe('EE');
    expect(SKILL_ACRONYMS['Growth Mindset']).toBe('GM');
    expect(SKILL_ACRONYMS['Interpersonal Agility']).toBe('IA');
  });

  it('has entries for AI Readiness skills', () => {
    expect(SKILL_ACRONYMS['AI Literacy & Prompt Engineering']).toBe('AL/PE');
    expect(SKILL_ACRONYMS['Technical Fundamentals']).toBe('TF');
    expect(SKILL_ACRONYMS['Data Fluency']).toBe('DF');
    expect(SKILL_ACRONYMS['Critical Thinking & Problem-Solving']).toBe('CT/PS');
    expect(SKILL_ACRONYMS['Adaptability & Continuous Learning']).toBe('ACL');
    expect(SKILL_ACRONYMS['Collaboration & Communication']).toBe('CC');
    expect(SKILL_ACRONYMS['Responsible AI & Ethical Awareness']).toBe('RAI');
    expect(SKILL_ACRONYMS['Creativity & Innovation']).toBe('CI');
    expect(SKILL_ACRONYMS['Domain Expertise']).toBe('DE');
  });

  it('has entries for AIQ skills', () => {
    expect(SKILL_ACRONYMS['Transparency']).toBe('T');
    expect(SKILL_ACRONYMS['Accountability']).toBe('A');
    expect(SKILL_ACRONYMS['Bias Awareness']).toBe('BA');
    expect(SKILL_ACRONYMS['Privacy Sensitivity']).toBe('PS');
  });

  it('has entries for Prompt Architecture skills', () => {
    expect(SKILL_ACRONYMS['Clarity']).toBe('CL');
    expect(SKILL_ACRONYMS['Context Setting']).toBe('CS');
    expect(SKILL_ACRONYMS['Output Formatting']).toBe('OF');
    expect(SKILL_ACRONYMS['Constraint Definition']).toBe('CD');
  });

  it('has entries for legacy keys (backward compatibility)', () => {
    expect(SKILL_ACRONYMS['AI Literacy']).toBe('AL/PE');
    expect(SKILL_ACRONYMS['AI Literacy/Prompting']).toBe('AL/PE');
    expect(SKILL_ACRONYMS['Technical Fluency']).toBe('TF');
    expect(SKILL_ACRONYMS['Domain Fluency']).toBe('DF');
    expect(SKILL_ACRONYMS['Critical Thinking']).toBe('CT/PS');
    expect(SKILL_ACRONYMS['Adaptive Learning']).toBe('ACL');
    expect(SKILL_ACRONYMS['Collaboration']).toBe('CC');
    expect(SKILL_ACRONYMS['Cross-functional Collaboration']).toBe('CC');
    expect(SKILL_ACRONYMS['Responsible AI']).toBe('RAI');
    expect(SKILL_ACRONYMS['Creative Innovation']).toBe('CI');
  });
});

describe('getSkillAcronym', () => {
  it('returns acronym for canonical names', () => {
    expect(getSkillAcronym('High Agency')).toBe('HA');
    expect(getSkillAcronym('Transparency')).toBe('T');
    expect(getSkillAcronym('AI Literacy & Prompt Engineering')).toBe('AL/PE');
    expect(getSkillAcronym('Clarity')).toBe('CL');
  });

  it('returns acronym for legacy names', () => {
    expect(getSkillAcronym('AI Literacy')).toBe('AL/PE');
    expect(getSkillAcronym('Technical Fluency')).toBe('TF');
    expect(getSkillAcronym('Creative Innovation')).toBe('CI');
  });

  it('returns original name for unknown names', () => {
    expect(getSkillAcronym('Unknown Skill')).toBe('Unknown Skill');
    expect(getSkillAcronym('Random')).toBe('Random');
  });
});

describe('normalizeAIReadinessScores', () => {
  it('normalizes legacy keys to canonical keys', () => {
    const legacyScores = {
      'AI Literacy': 80,
      'Technical Fluency': 70,
      'Domain Fluency': 60,
      'Critical Thinking': 75,
      'Adaptive Learning': 65,
      'Collaboration': 85,
      'Responsible AI': 90,
      'Creative Innovation': 55,
    };
    const normalized = normalizeAIReadinessScores(legacyScores);

    expect(normalized['AI Literacy & Prompt Engineering']).toBe(80);
    expect(normalized['Technical Fundamentals']).toBe(70);
    expect(normalized['Data Fluency']).toBe(60);
    expect(normalized['Critical Thinking & Problem-Solving']).toBe(75);
    expect(normalized['Adaptability & Continuous Learning']).toBe(65);
    expect(normalized['Collaboration & Communication']).toBe(85);
    expect(normalized['Responsible AI & Ethical Awareness']).toBe(90);
    expect(normalized['Creativity & Innovation']).toBe(55);
  });

  it('preserves canonical keys unchanged', () => {
    const canonicalScores = {
      'AI Literacy & Prompt Engineering': 80,
      'Technical Fundamentals': 70,
      'Data Fluency': 60,
    };
    const normalized = normalizeAIReadinessScores(canonicalScores);

    expect(normalized['AI Literacy & Prompt Engineering']).toBe(80);
    expect(normalized['Technical Fundamentals']).toBe(70);
    expect(normalized['Data Fluency']).toBe(60);
  });

  it('handles empty scores object', () => {
    const normalized = normalizeAIReadinessScores({});
    expect(Object.keys(normalized)).toHaveLength(0);
  });
});

describe('getAIReadinessScore', () => {
  it('reads from canonical keys', () => {
    const scores = {
      'AI Literacy & Prompt Engineering': 85,
      'Technical Fundamentals': 70,
    };
    expect(getAIReadinessScore(scores, 'AI Literacy & Prompt Engineering')).toBe(85);
    expect(getAIReadinessScore(scores, 'Technical Fundamentals')).toBe(70);
  });

  it('falls back to legacy keys', () => {
    const scores = {
      'AI Literacy': 80,
      'Technical Fluency': 65,
    };
    expect(getAIReadinessScore(scores, 'AI Literacy & Prompt Engineering')).toBe(80);
    expect(getAIReadinessScore(scores, 'Technical Fundamentals')).toBe(65);
  });

  it('returns 0 when skill not found', () => {
    const scores = { 'AI Literacy & Prompt Engineering': 85 };
    expect(getAIReadinessScore(scores, 'Domain Expertise')).toBe(0);
  });

  it('returns 0 for empty scores', () => {
    expect(getAIReadinessScore({}, 'AI Literacy & Prompt Engineering')).toBe(0);
  });
});
