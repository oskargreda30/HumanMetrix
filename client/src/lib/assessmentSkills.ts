// Shared assessment skill metadata and utilities
// IMPORTS FROM SINGLE SOURCE OF TRUTH
import {
  FIT_SKILL_NAMES,
  AI_READINESS_SKILL_NAMES,
  AIQ_SKILL_NAMES,
  PROMPT_ARCHITECTURE_SKILL_NAMES,
  LEGACY_TO_CANONICAL_AI_READINESS,
  getSkillCode,
  normalizeAIReadinessScores as normalizeScores,
  isValidFitSkill,
  isValidAIReadinessSkill,
  isValidAIQSkill,
  isValidPromptArchitectureSkill,
} from '@shared/skillNames';

// Re-export validation functions
export { isValidFitSkill, isValidAIReadinessSkill, isValidAIQSkill, isValidPromptArchitectureSkill };

export type AssessmentType = 'fit' | 'ai_readiness' | 'aiq' | 'prompt_architecture';

export interface SkillDefinition {
  key: string;
  displayName: string;
  description?: string;
  color: string;
}

// Acronym mappings for PDF radar charts - uses shared skill codes
export const SKILL_ACRONYMS: Record<string, string> = {
  // FIT Skills (canonical)
  [FIT_SKILL_NAMES.HIGH_AGENCY]: 'HA',
  [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'IC',
  [FIT_SKILL_NAMES.RESILIENCE]: 'RA',
  [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'EE',
  [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'GM',
  [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'IA',
  
  // AI Readiness Skills (canonical)
  [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'AL/PE',
  [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'TF',
  [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'DF',
  [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'CT/PS',
  [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'ACL',
  [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'CC',
  [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'RAI',
  [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'CI',
  [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'DE',
  
  // AIQ Skills (canonical)
  [AIQ_SKILL_NAMES.TRANSPARENCY]: 'T',
  [AIQ_SKILL_NAMES.ACCOUNTABILITY]: 'A',
  [AIQ_SKILL_NAMES.BIAS_AWARENESS]: 'BA',
  [AIQ_SKILL_NAMES.PRIVACY_SENSITIVITY]: 'PS',
  
  // Prompt Architecture Skills (canonical)
  [PROMPT_ARCHITECTURE_SKILL_NAMES.CLARITY]: 'CL',
  [PROMPT_ARCHITECTURE_SKILL_NAMES.CONTEXT_SETTING]: 'CS',
  [PROMPT_ARCHITECTURE_SKILL_NAMES.OUTPUT_FORMATTING]: 'OF',
  [PROMPT_ARCHITECTURE_SKILL_NAMES.CONSTRAINT_DEFINITION]: 'CD',
  
  // Legacy AI Readiness keys (for backward compatibility with old data)
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

/**
 * Get acronym for a skill name (for PDF radar charts)
 */
export function getSkillAcronym(skillName: string): string {
  return SKILL_ACRONYMS[skillName] || getSkillCode(skillName) || skillName;
}

/**
 * Legacy to canonical key mapping for AI Readiness skills
 * Re-exported from shared module for backward compatibility
 */
const AI_READINESS_KEY_MAPPING = LEGACY_TO_CANONICAL_AI_READINESS;

/**
 * Normalize AI Readiness scores to use canonical skill names
 * This handles legacy data that may have different key names
 */
export function normalizeAIReadinessScores(scores: Record<string, number>): Record<string, number> {
  return normalizeScores(scores);
}

/**
 * Get AI Readiness score for a skill, checking both canonical and legacy keys
 */
export function getAIReadinessScore(scores: Record<string, number>, canonicalSkillName: string): number {
  // Try canonical key first
  if (scores[canonicalSkillName] !== undefined) {
    return scores[canonicalSkillName];
  }
  
  // Find legacy key that maps to this canonical key
  for (const [legacyKey, canonical] of Object.entries(AI_READINESS_KEY_MAPPING)) {
    if (canonical === canonicalSkillName && scores[legacyKey] !== undefined) {
      return scores[legacyKey];
    }
  }
  
  return 0;
}

// FIT Assessment: 6 behavioral skills (using shared constants)
export const FIT_SKILLS: SkillDefinition[] = [
  {
    key: FIT_SKILL_NAMES.HIGH_AGENCY,
    displayName: FIT_SKILL_NAMES.HIGH_AGENCY,
    description: 'Takes initiative and ownership of outcomes',
    color: 'hsl(var(--chart-1))',
  },
  {
    key: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY,
    displayName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY,
    description: 'Seeks knowledge and understanding',
    color: 'hsl(var(--chart-2))',
  },
  {
    key: FIT_SKILL_NAMES.RESILIENCE,
    displayName: FIT_SKILL_NAMES.RESILIENCE,
    description: 'Adapts and perseveres through challenges',
    color: 'hsl(var(--chart-3))',
  },
  {
    key: FIT_SKILL_NAMES.EMPATHY_ETHICS,
    displayName: FIT_SKILL_NAMES.EMPATHY_ETHICS,
    description: 'Considers impact on others and ethical implications',
    color: 'hsl(var(--chart-4))',
  },
  {
    key: FIT_SKILL_NAMES.GROWTH_MINDSET,
    displayName: FIT_SKILL_NAMES.GROWTH_MINDSET,
    description: 'Views challenges as learning opportunities',
    color: 'hsl(var(--chart-5))',
  },
  {
    key: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY,
    displayName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY,
    description: 'Navigates social dynamics effectively',
    color: 'hsl(var(--chart-1))',
  },
];

// AI Readiness: 9 technical skills (using shared constants)
export const AI_READINESS_SKILLS: SkillDefinition[] = [
  {
    key: AI_READINESS_SKILL_NAMES.AI_LITERACY,
    displayName: AI_READINESS_SKILL_NAMES.AI_LITERACY,
    description: 'Understanding AI capabilities and effective prompt engineering',
    color: 'hsl(var(--chart-1))',
  },
  {
    key: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS,
    displayName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS,
    description: 'Core technical knowledge and system understanding',
    color: 'hsl(var(--chart-2))',
  },
  {
    key: AI_READINESS_SKILL_NAMES.DATA_FLUENCY,
    displayName: AI_READINESS_SKILL_NAMES.DATA_FLUENCY,
    description: 'Ability to work with and interpret data effectively',
    color: 'hsl(var(--chart-3))',
  },
  {
    key: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING,
    displayName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING,
    description: 'Analytical reasoning and solution development',
    color: 'hsl(var(--chart-4))',
  },
  {
    key: AI_READINESS_SKILL_NAMES.ADAPTABILITY,
    displayName: AI_READINESS_SKILL_NAMES.ADAPTABILITY,
    description: 'Embracing change and ongoing skill development',
    color: 'hsl(var(--chart-5))',
  },
  {
    key: AI_READINESS_SKILL_NAMES.COLLABORATION,
    displayName: AI_READINESS_SKILL_NAMES.COLLABORATION,
    description: 'Effective teamwork and information sharing',
    color: 'hsl(var(--chart-1))',
  },
  {
    key: AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI,
    displayName: AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI,
    description: 'Ethical AI practices and responsible deployment',
    color: 'hsl(var(--chart-2))',
  },
  {
    key: AI_READINESS_SKILL_NAMES.CREATIVITY,
    displayName: AI_READINESS_SKILL_NAMES.CREATIVITY,
    description: 'Generating novel ideas and innovative solutions',
    color: 'hsl(var(--chart-3))',
  },
  {
    key: AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE,
    displayName: AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE,
    description: 'Deep specialized knowledge in specific field',
    color: 'hsl(var(--chart-4))',
  },
];

// AIQ: Algorithmic Integrity Quotient - 4 ethical dimensions (using shared constants)
export const AIQ_SKILLS: SkillDefinition[] = [
  {
    key: AIQ_SKILL_NAMES.TRANSPARENCY,
    displayName: AIQ_SKILL_NAMES.TRANSPARENCY,
    description: 'Commitment to explainable AI and clear communication of AI decisions',
    color: 'hsl(var(--chart-1))',
  },
  {
    key: AIQ_SKILL_NAMES.ACCOUNTABILITY,
    displayName: AIQ_SKILL_NAMES.ACCOUNTABILITY,
    description: 'Taking responsibility for AI outcomes and maintaining oversight',
    color: 'hsl(var(--chart-2))',
  },
  {
    key: AIQ_SKILL_NAMES.BIAS_AWARENESS,
    displayName: AIQ_SKILL_NAMES.BIAS_AWARENESS,
    description: 'Recognizing and mitigating algorithmic bias in AI systems',
    color: 'hsl(var(--chart-3))',
  },
  {
    key: AIQ_SKILL_NAMES.PRIVACY_SENSITIVITY,
    displayName: AIQ_SKILL_NAMES.PRIVACY_SENSITIVITY,
    description: 'Protecting user data and respecting privacy in AI applications',
    color: 'hsl(var(--chart-4))',
  },
];

// Prompt Architecture: 4 prompt design skills (using shared constants)
export const PROMPT_ARCHITECTURE_SKILLS: SkillDefinition[] = [
  {
    key: PROMPT_ARCHITECTURE_SKILL_NAMES.CLARITY,
    displayName: PROMPT_ARCHITECTURE_SKILL_NAMES.CLARITY,
    description: 'Writing clear and unambiguous prompts',
    color: 'hsl(var(--chart-1))',
  },
  {
    key: PROMPT_ARCHITECTURE_SKILL_NAMES.CONTEXT_SETTING,
    displayName: PROMPT_ARCHITECTURE_SKILL_NAMES.CONTEXT_SETTING,
    description: 'Providing appropriate background and context in prompts',
    color: 'hsl(var(--chart-2))',
  },
  {
    key: PROMPT_ARCHITECTURE_SKILL_NAMES.OUTPUT_FORMATTING,
    displayName: PROMPT_ARCHITECTURE_SKILL_NAMES.OUTPUT_FORMATTING,
    description: 'Specifying desired output format and structure',
    color: 'hsl(var(--chart-3))',
  },
  {
    key: PROMPT_ARCHITECTURE_SKILL_NAMES.CONSTRAINT_DEFINITION,
    displayName: PROMPT_ARCHITECTURE_SKILL_NAMES.CONSTRAINT_DEFINITION,
    description: 'Defining boundaries and limitations for AI responses',
    color: 'hsl(var(--chart-4))',
  },
];

// Assessment type metadata
export const ASSESSMENT_METADATA: Record<AssessmentType, {
  displayName: string;
  skills: SkillDefinition[];
  isSkillBased: boolean;
}> = {
  fit: {
    displayName: 'FIT Assessment',
    skills: FIT_SKILLS,
    isSkillBased: true,
  },
  ai_readiness: {
    displayName: 'AI Readiness',
    skills: AI_READINESS_SKILLS,
    isSkillBased: true,
  },
  aiq: {
    displayName: 'AIQ',
    skills: AIQ_SKILLS,
    isSkillBased: true,
  },
  prompt_architecture: {
    displayName: 'Prompt Architecture',
    skills: PROMPT_ARCHITECTURE_SKILLS,
    isSkillBased: true,
  },
};

/**
 * Get skill definitions for an assessment type
 */
export function getAssessmentSkills(assessmentType: string): SkillDefinition[] {
  const type = assessmentType.toLowerCase().replace(/\s+/g, '_') as AssessmentType;
  return ASSESSMENT_METADATA[type]?.skills || [];
}

/**
 * Check if an assessment uses skill-based scoring
 */
export function isSkillBasedAssessment(assessmentType: string): boolean {
  const type = assessmentType.toLowerCase().replace(/\s+/g, '_') as AssessmentType;
  return ASSESSMENT_METADATA[type]?.isSkillBased || false;
}

/**
 * Transform assessment scores into radar chart data
 */
export function transformToRadarData(
  scores: Record<string, number>,
  assessmentType: string
): Array<{ skill: string; score: number; fullMark: number }> {
  const skills = getAssessmentSkills(assessmentType);
  
  return skills.map(skillDef => ({
    skill: skillDef.displayName,
    score: scores[skillDef.key] || 0,
    fullMark: 100,
  }));
}

/**
 * Get top N skills from scores
 */
export function getTopSkills(
  scores: Record<string, number>,
  assessmentType: string,
  count: number = 3
): Array<{ name: string; score: number; color: string }> {
  const skills = getAssessmentSkills(assessmentType);
  
  return Object.entries(scores)
    .map(([key, score]) => {
      const skillDef = skills.find(s => s.key === key);
      return {
        name: skillDef?.displayName || key,
        score,
        color: skillDef?.color || 'hsl(var(--primary))',
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

/**
 * Get growth areas (lowest N skills)
 */
export function getGrowthAreas(
  scores: Record<string, number>,
  assessmentType: string,
  count: number = 3
): Array<{ name: string; score: number; color: string }> {
  const skills = getAssessmentSkills(assessmentType);
  
  return Object.entries(scores)
    .map(([key, score]) => {
      const skillDef = skills.find(s => s.key === key);
      return {
        name: skillDef?.displayName || key,
        score,
        color: skillDef?.color || 'hsl(var(--primary))',
      };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, count);
}

/**
 * Calculate average score across all skills
 */
export function calculateAverageScore(scores: Record<string, number>): number {
  const values = Object.values(scores);
  if (values.length === 0) return 0;
  
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / values.length);
}

/**
 * Format assessment type for display
 */
export function formatAssessmentType(assessmentType: string): string {
  const type = assessmentType.toLowerCase().replace(/\s+/g, '_') as AssessmentType;
  return ASSESSMENT_METADATA[type]?.displayName || assessmentType;
}

/**
 * Get color palette for candidate comparisons
 */
export const COMPARISON_COLORS = [
  'hsl(217, 91%, 60%)',  // Blue
  'hsl(142, 76%, 36%)',  // Green
  'hsl(24, 95%, 53%)',   // Orange
];

/**
 * Role definitions with weighted skill requirements for role suitability scoring
 */
export const ROLE_DEFINITIONS: Record<string, { name: string; description: string; weights: Record<string, number> }> = {
  'ai_product_manager': {
    name: 'AI Product Manager',
    description: 'Leads AI product strategy and development',
    weights: {
      'AI Literacy & Prompt Engineering': 0.15,
      'Critical Thinking & Problem-Solving': 0.15,
      'Collaboration & Communication': 0.15,
      'Domain Expertise': 0.12,
      'Creativity & Innovation': 0.10,
      'Responsible AI & Ethical Awareness': 0.10,
      'High Agency': 0.08,
      'Growth Mindset': 0.08,
      'Interpersonal Agility': 0.07,
    }
  },
  'data_analyst': {
    name: 'Data Analyst',
    description: 'Analyzes data to drive business decisions',
    weights: {
      'Data Fluency': 0.20,
      'Critical Thinking & Problem-Solving': 0.18,
      'Technical Fundamentals': 0.15,
      'Domain Expertise': 0.12,
      'Intellectual Curiosity': 0.10,
      'Collaboration & Communication': 0.10,
      'AI Literacy & Prompt Engineering': 0.08,
      'Growth Mindset': 0.07,
    }
  },
  'ai_engineer': {
    name: 'AI/ML Engineer',
    description: 'Builds and deploys AI/ML systems',
    weights: {
      'Technical Fundamentals': 0.20,
      'AI Literacy & Prompt Engineering': 0.18,
      'Data Fluency': 0.15,
      'Critical Thinking & Problem-Solving': 0.12,
      'Adaptability & Continuous Learning': 0.10,
      'Creativity & Innovation': 0.10,
      'Responsible AI & Ethical Awareness': 0.08,
      'Growth Mindset': 0.07,
    }
  },
  'ux_researcher': {
    name: 'UX Researcher',
    description: 'Conducts user research for AI products',
    weights: {
      'Empathy & Ethics': 0.18,
      'Collaboration & Communication': 0.15,
      'Critical Thinking & Problem-Solving': 0.15,
      'Intellectual Curiosity': 0.12,
      'Interpersonal Agility': 0.12,
      'Data Fluency': 0.10,
      'Creativity & Innovation': 0.10,
      'Responsible AI & Ethical Awareness': 0.08,
    }
  },
  'ai_consultant': {
    name: 'AI Strategy Consultant',
    description: 'Advises organizations on AI adoption',
    weights: {
      'Domain Expertise': 0.15,
      'Collaboration & Communication': 0.15,
      'High Agency': 0.12,
      'AI Literacy & Prompt Engineering': 0.12,
      'Critical Thinking & Problem-Solving': 0.12,
      'Interpersonal Agility': 0.10,
      'Responsible AI & Ethical Awareness': 0.10,
      'Growth Mindset': 0.07,
      'Resilience': 0.07,
    }
  },
  'prompt_engineer': {
    name: 'Prompt Engineer',
    description: 'Designs and optimizes AI prompts',
    weights: {
      'AI Literacy & Prompt Engineering': 0.25,
      'Creativity & Innovation': 0.18,
      'Critical Thinking & Problem-Solving': 0.15,
      'Technical Fundamentals': 0.12,
      'Adaptability & Continuous Learning': 0.10,
      'Intellectual Curiosity': 0.10,
      'Domain Expertise': 0.10,
    }
  },
  'recruiter': {
    name: 'Recruiter',
    description: 'Identifies and evaluates talent for AI-focused roles',
    weights: {
      'Interpersonal Agility': 0.18,
      'Collaboration & Communication': 0.16,
      'Empathy & Ethics': 0.14,
      'Critical Thinking & Problem-Solving': 0.12,
      'High Agency': 0.10,
      'Intellectual Curiosity': 0.10,
      'AI Literacy & Prompt Engineering': 0.08,
      'Growth Mindset': 0.07,
      'Resilience': 0.05,
    }
  },
};
