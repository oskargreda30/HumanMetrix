/**
 * CANONICAL SKILL NAMES - SINGLE SOURCE OF TRUTH
 * 
 * This file defines all official skill names for HumanMetrix assessments.
 * All other files MUST import from here to ensure consistency.
 * 
 * DO NOT hardcode skill names anywhere else in the codebase.
 * 
 * Source: attached_assets/ALL assessments v1.md
 */

// ============================================================================
// FIT ASSESSMENT - 6 Behavioral Skills
// ============================================================================

export const FIT_SKILL_NAMES = {
  HIGH_AGENCY: 'High Agency',
  INTELLECTUAL_CURIOSITY: 'Intellectual Curiosity',
  RESILIENCE: 'Resilience',
  EMPATHY_ETHICS: 'Empathy & Ethics',
  GROWTH_MINDSET: 'Growth Mindset',
  INTERPERSONAL_AGILITY: 'Interpersonal Agility',
} as const;

export const FIT_SKILL_CODES = {
  'High Agency': 'HA',
  'Intellectual Curiosity': 'IC',
  'Resilience': 'RA',
  'Empathy & Ethics': 'EE',
  'Growth Mindset': 'GM',
  'Interpersonal Agility': 'IA',
} as const;

export const FIT_SKILLS_ARRAY = [
  FIT_SKILL_NAMES.HIGH_AGENCY,
  FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY,
  FIT_SKILL_NAMES.RESILIENCE,
  FIT_SKILL_NAMES.EMPATHY_ETHICS,
  FIT_SKILL_NAMES.GROWTH_MINDSET,
  FIT_SKILL_NAMES.INTERPERSONAL_AGILITY,
] as const;

// ============================================================================
// AI READINESS ASSESSMENT - 9 Technical Skills
// ============================================================================

export const AI_READINESS_SKILL_NAMES = {
  AI_LITERACY: 'AI Literacy & Prompt Engineering',
  TECHNICAL_FUNDAMENTALS: 'Technical Fundamentals',
  DATA_FLUENCY: 'Data Fluency',
  CRITICAL_THINKING: 'Critical Thinking & Problem-Solving',
  ADAPTABILITY: 'Adaptability & Continuous Learning',
  COLLABORATION: 'Collaboration & Communication',
  RESPONSIBLE_AI: 'Responsible AI & Ethical Awareness',
  CREATIVITY: 'Creativity & Innovation',
  DOMAIN_EXPERTISE: 'Domain Expertise',
} as const;

export const AI_READINESS_SKILL_CODES = {
  'AI Literacy & Prompt Engineering': 'AL/PE',
  'Technical Fundamentals': 'TF',
  'Data Fluency': 'DF',
  'Critical Thinking & Problem-Solving': 'CT/PS',
  'Adaptability & Continuous Learning': 'ACL',
  'Collaboration & Communication': 'CC',
  'Responsible AI & Ethical Awareness': 'RAI',
  'Creativity & Innovation': 'CI',
  'Domain Expertise': 'DE',
} as const;

export const AI_READINESS_SKILLS_ARRAY = [
  AI_READINESS_SKILL_NAMES.AI_LITERACY,
  AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS,
  AI_READINESS_SKILL_NAMES.DATA_FLUENCY,
  AI_READINESS_SKILL_NAMES.CRITICAL_THINKING,
  AI_READINESS_SKILL_NAMES.ADAPTABILITY,
  AI_READINESS_SKILL_NAMES.COLLABORATION,
  AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI,
  AI_READINESS_SKILL_NAMES.CREATIVITY,
  AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE,
] as const;

// ============================================================================
// AIQ ASSESSMENT - 4 Ethical Dimensions
// ============================================================================

export const AIQ_SKILL_NAMES = {
  TRANSPARENCY: 'Transparency',
  ACCOUNTABILITY: 'Accountability',
  BIAS_AWARENESS: 'Bias Awareness',
  PRIVACY_SENSITIVITY: 'Privacy Sensitivity',
} as const;

export const AIQ_SKILL_CODES = {
  'Transparency': 'T',
  'Accountability': 'A',
  'Bias Awareness': 'BA',
  'Privacy Sensitivity': 'PS',
} as const;

export const AIQ_SKILLS_ARRAY = [
  AIQ_SKILL_NAMES.TRANSPARENCY,
  AIQ_SKILL_NAMES.ACCOUNTABILITY,
  AIQ_SKILL_NAMES.BIAS_AWARENESS,
  AIQ_SKILL_NAMES.PRIVACY_SENSITIVITY,
] as const;

// ============================================================================
// PROMPT ARCHITECTURE ASSESSMENT - 4 Skills
// ============================================================================

export const PROMPT_ARCHITECTURE_SKILL_NAMES = {
  CLARITY: 'Clarity',
  CONTEXT_SETTING: 'Context Setting',
  OUTPUT_FORMATTING: 'Output Formatting',
  CONSTRAINT_DEFINITION: 'Constraint Definition',
} as const;

export const PROMPT_ARCHITECTURE_SKILL_CODES = {
  'Clarity': 'CL',
  'Context Setting': 'CS',
  'Output Formatting': 'OF',
  'Constraint Definition': 'CD',
} as const;

export const PROMPT_ARCHITECTURE_SKILLS_ARRAY = [
  PROMPT_ARCHITECTURE_SKILL_NAMES.CLARITY,
  PROMPT_ARCHITECTURE_SKILL_NAMES.CONTEXT_SETTING,
  PROMPT_ARCHITECTURE_SKILL_NAMES.OUTPUT_FORMATTING,
  PROMPT_ARCHITECTURE_SKILL_NAMES.CONSTRAINT_DEFINITION,
] as const;

// ============================================================================
// LEGACY KEY MAPPINGS - For backward compatibility with old data
// ============================================================================

/**
 * Maps legacy/old skill names to canonical names.
 * Used when reading old data from the database.
 */
export const LEGACY_TO_CANONICAL_AI_READINESS: Record<string, string> = {
  // Legacy keys that may exist in old data
  'AI Literacy': AI_READINESS_SKILL_NAMES.AI_LITERACY,
  'AI Literacy/Prompting': AI_READINESS_SKILL_NAMES.AI_LITERACY,
  'Technical Fluency': AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS,
  'Domain Fluency': AI_READINESS_SKILL_NAMES.DATA_FLUENCY,
  'Critical Thinking': AI_READINESS_SKILL_NAMES.CRITICAL_THINKING,
  'Adaptive Learning': AI_READINESS_SKILL_NAMES.ADAPTABILITY,
  'Collaboration': AI_READINESS_SKILL_NAMES.COLLABORATION,
  'Cross-functional Collaboration': AI_READINESS_SKILL_NAMES.COLLABORATION,
  'Responsible AI': AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI,
  'Creative Innovation': AI_READINESS_SKILL_NAMES.CREATIVITY,
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Check if a skill name is a valid canonical FIT skill
 */
export function isValidFitSkill(skillName: string): boolean {
  return FIT_SKILLS_ARRAY.includes(skillName as any);
}

/**
 * Check if a skill name is a valid canonical AI Readiness skill
 */
export function isValidAIReadinessSkill(skillName: string): boolean {
  return AI_READINESS_SKILLS_ARRAY.includes(skillName as any);
}

/**
 * Check if a skill name is a valid canonical AIQ skill
 */
export function isValidAIQSkill(skillName: string): boolean {
  return AIQ_SKILLS_ARRAY.includes(skillName as any);
}

/**
 * Check if a skill name is a valid canonical Prompt Architecture skill
 */
export function isValidPromptArchitectureSkill(skillName: string): boolean {
  return PROMPT_ARCHITECTURE_SKILLS_ARRAY.includes(skillName as any);
}

/**
 * Normalize a skill name to its canonical form.
 * Returns the canonical name if it's a legacy key, otherwise returns the input.
 */
export function normalizeAIReadinessSkillName(skillName: string): string {
  return LEGACY_TO_CANONICAL_AI_READINESS[skillName] || skillName;
}

/**
 * Normalize an entire scores object to use canonical skill names
 */
export function normalizeAIReadinessScores(scores: Record<string, number>): Record<string, number> {
  const normalized: Record<string, number> = {};
  
  for (const [key, value] of Object.entries(scores)) {
    const canonicalKey = normalizeAIReadinessSkillName(key);
    // Only add if we don't already have a value for this canonical key
    if (normalized[canonicalKey] === undefined) {
      normalized[canonicalKey] = value;
    }
  }
  
  return normalized;
}

/**
 * Get skill code/acronym from canonical skill name
 */
export function getSkillCode(skillName: string): string {
  const allCodes: Record<string, string> = {
    ...FIT_SKILL_CODES,
    ...AI_READINESS_SKILL_CODES,
    ...AIQ_SKILL_CODES,
    ...PROMPT_ARCHITECTURE_SKILL_CODES,
    // Also include legacy mappings for display purposes
    'AI Literacy': 'AL/PE',
    'AI Literacy/Prompting': 'AL/PE',
    'Technical Fluency': 'TF',
    'Domain Fluency': 'DF',
    'Critical Thinking': 'CT/PS',
    'Adaptive Learning': 'ACL',
    'Collaboration': 'CC',
    'Cross-functional Collaboration': 'CC',
    'Responsible AI': 'RAI',
    'Creative Innovation': 'CI',
  };
  
  return allCodes[skillName] || skillName;
}

/**
 * Validate that all keys in a scores object are valid canonical AI Readiness skills.
 * Returns an array of invalid keys (empty if all valid).
 */
export function validateAIReadinessScoreKeys(scores: Record<string, number>): string[] {
  const invalidKeys: string[] = [];
  
  for (const key of Object.keys(scores)) {
    // Check if it's canonical or a known legacy key
    if (!isValidAIReadinessSkill(key) && !LEGACY_TO_CANONICAL_AI_READINESS[key]) {
      invalidKeys.push(key);
    }
  }
  
  return invalidKeys;
}

/**
 * Validate that all keys in a scores object are valid canonical FIT skills.
 * Returns an array of invalid keys (empty if all valid).
 */
export function validateFitScoreKeys(scores: Record<string, number>): string[] {
  const invalidKeys: string[] = [];
  
  for (const key of Object.keys(scores)) {
    if (!isValidFitSkill(key)) {
      invalidKeys.push(key);
    }
  }
  
  return invalidKeys;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type FitSkillName = typeof FIT_SKILLS_ARRAY[number];
export type AIReadinessSkillName = typeof AI_READINESS_SKILLS_ARRAY[number];
export type AIQSkillName = typeof AIQ_SKILLS_ARRAY[number];
export type PromptArchitectureSkillName = typeof PROMPT_ARCHITECTURE_SKILLS_ARRAY[number];

export type FitScores = Record<FitSkillName, number>;
export type AIReadinessScores = Record<AIReadinessSkillName, number>;
export type AIQScores = Record<AIQSkillName, number>;
export type PromptArchitectureScores = Record<PromptArchitectureSkillName, number>;

// ============================================================================
// SKILL DESCRIPTIONS - Brief explanations for strengths/development areas
// ============================================================================

export const FIT_SKILL_DESCRIPTIONS: Record<string, { strength: string; development: string }> = {
  'High Agency': {
    strength: 'Takes initiative and drives results independently without waiting for direction.',
    development: 'May need support building confidence to take ownership of outcomes.',
  },
  'Intellectual Curiosity': {
    strength: 'Actively seeks to understand new concepts and asks insightful questions.',
    development: 'Could benefit from developing deeper inquiry habits and exploration.',
  },
  'Resilience': {
    strength: 'Maintains composure and adapts effectively when facing setbacks.',
    development: 'May need coaching to build coping strategies under pressure.',
  },
  'Empathy & Ethics': {
    strength: 'Demonstrates strong moral compass and consideration for others.',
    development: 'Could improve awareness of diverse perspectives and ethical nuances.',
  },
  'Growth Mindset': {
    strength: 'Embraces challenges as opportunities and learns from feedback.',
    development: 'May benefit from reframing setbacks as learning opportunities.',
  },
  'Interpersonal Agility': {
    strength: 'Navigates diverse relationships and adapts communication style effectively.',
    development: 'Could strengthen skills in building rapport across different contexts.',
  },
};

export const AI_READINESS_SKILL_DESCRIPTIONS: Record<string, { strength: string; development: string }> = {
  'AI Literacy & Prompt Engineering': {
    strength: 'Strong understanding of AI capabilities and crafts effective prompts.',
    development: 'Would benefit from hands-on practice with AI tools and prompt techniques.',
  },
  'Technical Fundamentals': {
    strength: 'Solid grasp of technical concepts needed to work with AI systems.',
    development: 'Could strengthen foundational technical knowledge for AI integration.',
  },
  'Data Fluency': {
    strength: 'Comfortable interpreting data and making data-driven decisions.',
    development: 'May need development in data analysis and interpretation skills.',
  },
  'Critical Thinking & Problem-Solving': {
    strength: 'Approaches problems systematically and evaluates AI outputs critically.',
    development: 'Could improve analytical thinking when validating AI-generated content.',
  },
  'Adaptability & Continuous Learning': {
    strength: 'Quickly adapts to new AI tools and embraces ongoing learning.',
    development: 'May need encouragement to stay current with rapidly evolving AI landscape.',
  },
  'Collaboration & Communication': {
    strength: 'Effectively communicates AI concepts and collaborates across teams.',
    development: 'Could improve ability to explain AI capabilities to diverse audiences.',
  },
  'Responsible AI & Ethical Awareness': {
    strength: 'Strong awareness of AI ethics, bias, and responsible use principles.',
    development: 'Would benefit from deeper understanding of AI governance and ethics.',
  },
  'Creativity & Innovation': {
    strength: 'Applies creative thinking to leverage AI in novel ways.',
    development: 'Could explore more innovative applications of AI in their work.',
  },
  'Domain Expertise': {
    strength: 'Deep domain knowledge that enhances AI application in their field.',
    development: 'May need to strengthen industry-specific knowledge for AI integration.',
  },
};

/**
 * Get a brief description for a strength based on skill name
 */
export function getStrengthDescription(skillName: string): string {
  const fitDesc = FIT_SKILL_DESCRIPTIONS[skillName];
  if (fitDesc) return fitDesc.strength;
  
  const aiDesc = AI_READINESS_SKILL_DESCRIPTIONS[skillName];
  if (aiDesc) return aiDesc.strength;
  
  return 'Demonstrates strong capability in this area.';
}

/**
 * Get a brief description for a development area based on skill name
 */
export function getDevelopmentDescription(skillName: string): string {
  const fitDesc = FIT_SKILL_DESCRIPTIONS[skillName];
  if (fitDesc) return fitDesc.development;
  
  const aiDesc = AI_READINESS_SKILL_DESCRIPTIONS[skillName];
  if (aiDesc) return aiDesc.development;
  
  return 'Could benefit from focused development in this area.';
}
