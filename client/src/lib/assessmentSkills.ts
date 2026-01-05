// Shared assessment skill metadata and utilities

export type AssessmentType = 'fit' | 'ai_readiness' | 'aiq' | 'prompt_architecture';

export interface SkillDefinition {
  key: string;
  displayName: string;
  description?: string;
  color: string;
}

// Acronym mappings for PDF radar charts (matching table labels)
export const SKILL_ACRONYMS: Record<string, string> = {
  // FIT Skills
  'High Agency': 'HA',
  'Intellectual Curiosity': 'IC',
  'Resilience': 'RES',
  'Empathy & Ethics': 'E&E',
  'Growth Mindset': 'GM',
  'Interpersonal Agility': 'IA',
  
  // AI Readiness Skills (Canonical keys)
  'AI Literacy & Prompt Engineering': 'AI-PE',
  'Technical Fundamentals': 'TF',
  'Data Fluency': 'DF',
  'Critical Thinking & Problem-Solving': 'CT-PS',
  'Adaptability & Continuous Learning': 'ACL',
  'Collaboration & Communication': 'C&C',
  'Responsible AI & Ethical Awareness': 'RA-EA',
  'Creativity & Innovation': 'CI',
  'Domain Expertise': 'DE',
  
  // Legacy AI Readiness keys (for backward compatibility with old data)
  'AI Literacy': 'AI-PE',
  'AI Literacy/Prompting': 'AI-PE', // Very old legacy key
  'Technical Fluency': 'TF',
  'Domain Fluency': 'DF',
  'Critical Thinking': 'CT-PS',
  'Adaptive Learning': 'ACL',
  'Collaboration': 'C&C',
  'Cross-functional Collaboration': 'C&C', // Very old legacy key
  'Responsible AI': 'RA-EA',
  'Creative Innovation': 'CI',
  // Note: 'Domain Expertise' is already correct in both old and new formats
};

/**
 * Get acronym for a skill name (for PDF radar charts)
 */
export function getSkillAcronym(skillName: string): string {
  return SKILL_ACRONYMS[skillName] || skillName;
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
    key: 'AI Literacy & Prompt Engineering',
    displayName: 'AI Literacy & Prompt Engineering',
    description: 'Understanding AI capabilities and effective prompt engineering',
    color: 'hsl(var(--chart-1))',
  },
  {
    key: 'Technical Fundamentals',
    displayName: 'Technical Fundamentals',
    description: 'Core technical knowledge and system understanding',
    color: 'hsl(var(--chart-2))',
  },
  {
    key: 'Data Fluency',
    displayName: 'Data Fluency',
    description: 'Ability to work with and interpret data effectively',
    color: 'hsl(var(--chart-3))',
  },
  {
    key: 'Critical Thinking & Problem-Solving',
    displayName: 'Critical Thinking & Problem-Solving',
    description: 'Analytical reasoning and solution development',
    color: 'hsl(var(--chart-4))',
  },
  {
    key: 'Adaptability & Continuous Learning',
    displayName: 'Adaptability & Continuous Learning',
    description: 'Embracing change and ongoing skill development',
    color: 'hsl(var(--chart-5))',
  },
  {
    key: 'Collaboration & Communication',
    displayName: 'Collaboration & Communication',
    description: 'Effective teamwork and information sharing',
    color: 'hsl(var(--chart-1))',
  },
  {
    key: 'Responsible AI & Ethical Awareness',
    displayName: 'Responsible AI & Ethical Awareness',
    description: 'Ethical AI practices and responsible deployment',
    color: 'hsl(var(--chart-2))',
  },
  {
    key: 'Creativity & Innovation',
    displayName: 'Creativity & Innovation',
    description: 'Generating novel ideas and innovative solutions',
    color: 'hsl(var(--chart-3))',
  },
  {
    key: 'Domain Expertise',
    displayName: 'Domain Expertise',
    description: 'Deep specialized knowledge in specific field',
    color: 'hsl(var(--chart-4))',
  },
];

// AIQ: Algorithmic Integrity Quotient (graded scoring with 20% band interpretations)
export const AIQ_SKILLS: SkillDefinition[] = [
  {
    key: 'Algorithmic Integrity',
    displayName: 'Algorithmic Integrity',
    description: 'AI ethics using graded scoring (0-100%) with weighted options for nuanced ethical judgment',
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
