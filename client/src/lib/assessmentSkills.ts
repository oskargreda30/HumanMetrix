// Shared assessment skill metadata and utilities

export type AssessmentType = 'fit' | 'ai_readiness' | 'aiq' | 'prompt_architecture';

export interface SkillDefinition {
  key: string;
  displayName: string;
  acronym: string;
  description?: string;
  color: string;
}

// FIT Assessment: 6 behavioral skills
export const FIT_SKILLS: SkillDefinition[] = [
  {
    key: 'High Agency',
    displayName: 'High Agency',
    acronym: 'HA',
    description: 'Takes initiative and ownership of outcomes',
    color: 'hsl(var(--chart-1))',
  },
  {
    key: 'Intellectual Curiosity',
    displayName: 'Intellectual Curiosity',
    acronym: 'IC',
    description: 'Seeks knowledge and understanding',
    color: 'hsl(var(--chart-2))',
  },
  {
    key: 'Resilience',
    displayName: 'Resilience',
    acronym: 'RES',
    description: 'Adapts and perseveres through challenges',
    color: 'hsl(var(--chart-3))',
  },
  {
    key: 'Empathy & Ethics',
    displayName: 'Empathy & Ethics',
    acronym: 'E&E',
    description: 'Considers impact on others and ethical implications',
    color: 'hsl(var(--chart-4))',
  },
  {
    key: 'Growth Mindset',
    displayName: 'Growth Mindset',
    acronym: 'GM',
    description: 'Views challenges as learning opportunities',
    color: 'hsl(var(--chart-5))',
  },
  {
    key: 'Interpersonal Agility',
    displayName: 'Interpersonal Agility',
    acronym: 'IA',
    description: 'Navigates social dynamics effectively',
    color: 'hsl(var(--chart-1))',
  },
];

// AI Readiness: 9 technical skills
export const AI_READINESS_SKILLS: SkillDefinition[] = [
  {
    key: 'AI Literacy & Prompt Engineering',
    displayName: 'AI Literacy & Prompt Engineering',
    acronym: 'AL&PE',
    description: 'Understanding AI capabilities and effective prompt engineering',
    color: 'hsl(var(--chart-1))',
  },
  {
    key: 'Technical Fundamentals',
    displayName: 'Technical Fundamentals',
    acronym: 'TF',
    description: 'Core technical knowledge and system understanding',
    color: 'hsl(var(--chart-2))',
  },
  {
    key: 'Data Fluency',
    displayName: 'Data Fluency',
    acronym: 'DF',
    description: 'Ability to work with and interpret data effectively',
    color: 'hsl(var(--chart-3))',
  },
  {
    key: 'Critical Thinking & Problem-Solving',
    displayName: 'Critical Thinking & Problem-Solving',
    acronym: 'CT&PS',
    description: 'Analytical reasoning and solution development',
    color: 'hsl(var(--chart-4))',
  },
  {
    key: 'Adaptability & Continuous Learning',
    displayName: 'Adaptability & Continuous Learning',
    acronym: 'ACL',
    description: 'Embracing change and ongoing skill development',
    color: 'hsl(var(--chart-5))',
  },
  {
    key: 'Collaboration & Communication',
    displayName: 'Collaboration & Communication',
    acronym: 'C&C',
    description: 'Effective teamwork and information sharing',
    color: 'hsl(var(--chart-1))',
  },
  {
    key: 'Responsible AI & Ethical Awareness',
    displayName: 'Responsible AI & Ethical Awareness',
    acronym: 'RAI',
    description: 'Ethical AI practices and responsible deployment',
    color: 'hsl(var(--chart-2))',
  },
  {
    key: 'Creativity & Innovation',
    displayName: 'Creativity & Innovation',
    acronym: 'C&I',
    description: 'Generating novel ideas and innovative solutions',
    color: 'hsl(var(--chart-3))',
  },
  {
    key: 'Domain Expertise',
    displayName: 'Domain Expertise',
    acronym: 'DE',
    description: 'Deep specialized knowledge in specific field',
    color: 'hsl(var(--chart-4))',
  },
];

// AIQ: Algorithmic Integrity Quotient (single comprehensive score)
export const AIQ_SKILLS: SkillDefinition[] = [
  {
    key: 'Algorithmic Integrity',
    displayName: 'Algorithmic Integrity',
    acronym: 'AIQ',
    description: 'Comprehensive understanding of AI ethics, bias, fairness, transparency, and responsible deployment',
    color: 'hsl(var(--chart-1))',
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
    skills: [],
    isSkillBased: false, // Uses pass/fail percentage
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
 * Transform assessment scores into radar chart data with acronyms for PDF export
 */
export function transformToRadarDataWithAcronyms(
  scores: Record<string, number>,
  assessmentType: string
): Array<{ skill: string; score: number; fullMark: number }> {
  const skills = getAssessmentSkills(assessmentType);
  
  return skills.map(skillDef => ({
    skill: skillDef.acronym,
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
