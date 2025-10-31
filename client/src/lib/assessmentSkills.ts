// Shared assessment skill metadata and utilities

export type AssessmentType = 'fit' | 'ai_readiness' | 'aiq' | 'prompt_architecture';

export interface SkillDefinition {
  key: string;
  displayName: string;
  description?: string;
  color: string;
}

// FIT Assessment: 6 behavioral skills
export const FIT_SKILLS: SkillDefinition[] = [
  {
    key: 'High Agency',
    displayName: 'High Agency',
    description: 'Takes initiative and ownership of outcomes',
    color: 'hsl(var(--chart-1))',
  },
  {
    key: 'Intellectual Curiosity',
    displayName: 'Intellectual Curiosity',
    description: 'Seeks knowledge and understanding',
    color: 'hsl(var(--chart-2))',
  },
  {
    key: 'Resilience',
    displayName: 'Resilience',
    description: 'Adapts and perseveres through challenges',
    color: 'hsl(var(--chart-3))',
  },
  {
    key: 'Empathy & Ethics',
    displayName: 'Empathy & Ethics',
    description: 'Considers impact on others and ethical implications',
    color: 'hsl(var(--chart-4))',
  },
  {
    key: 'Growth Mindset',
    displayName: 'Growth Mindset',
    description: 'Views challenges as learning opportunities',
    color: 'hsl(var(--chart-5))',
  },
  {
    key: 'Interpersonal Agility',
    displayName: 'Interpersonal Agility',
    description: 'Navigates social dynamics effectively',
    color: 'hsl(var(--chart-1))',
  },
];

// AI Readiness: 9 technical skills
export const AI_READINESS_SKILLS: SkillDefinition[] = [
  {
    key: 'AI Literacy',
    displayName: 'AI Literacy',
    description: 'Understands AI capabilities and limitations',
    color: 'hsl(var(--chart-1))',
  },
  {
    key: 'Technical Fluency',
    displayName: 'Technical Fluency',
    description: 'Comfort with technical systems and tools',
    color: 'hsl(var(--chart-2))',
  },
  {
    key: 'Domain Fluency',
    displayName: 'Domain Fluency',
    description: 'Deep knowledge of domain-specific challenges',
    color: 'hsl(var(--chart-3))',
  },
  {
    key: 'Critical Thinking',
    displayName: 'Critical Thinking',
    description: 'Analyzes information objectively',
    color: 'hsl(var(--chart-4))',
  },
  {
    key: 'Adaptive Learning',
    displayName: 'Adaptive Learning',
    description: 'Quickly learns and applies new concepts',
    color: 'hsl(var(--chart-5))',
  },
  {
    key: 'Responsible AI',
    displayName: 'Responsible AI',
    description: 'Ethical AI integration and governance',
    color: 'hsl(var(--chart-1))',
  },
  {
    key: 'Domain Expertise',
    displayName: 'Domain Expertise',
    description: 'Advanced subject matter knowledge',
    color: 'hsl(var(--chart-2))',
  },
  {
    key: 'Creative Innovation',
    displayName: 'Creative Innovation',
    description: 'Generates novel solutions',
    color: 'hsl(var(--chart-3))',
  },
  {
    key: 'Collaboration',
    displayName: 'Collaboration',
    description: 'Works effectively with diverse teams',
    color: 'hsl(var(--chart-4))',
  },
];

// AIQ: 4 ethical reasoning areas
export const AIQ_SKILLS: SkillDefinition[] = [
  {
    key: 'Fairness',
    displayName: 'Fairness',
    description: 'Ensures equitable outcomes',
    color: 'hsl(var(--chart-1))',
  },
  {
    key: 'Transparency',
    displayName: 'Transparency',
    description: 'Promotes explainability and accountability',
    color: 'hsl(var(--chart-2))',
  },
  {
    key: 'Privacy',
    displayName: 'Privacy',
    description: 'Protects user data and consent',
    color: 'hsl(var(--chart-3))',
  },
  {
    key: 'Responsible Deployment',
    displayName: 'Responsible Deployment',
    description: 'Considers societal impact',
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
