import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Brain, Target, Shield, Lightbulb } from "lucide-react";
import { FIT_SKILLS, AI_READINESS_SKILLS, SKILL_ACRONYMS } from "@/lib/assessmentSkills";

// Prompt Architecture dimensions with descriptions
export const PROMPT_ARCHITECTURE_DIMENSIONS = [
  { key: 'clarity', displayName: 'Clarity', description: 'Clear and precise instructions that leave no ambiguity' },
  { key: 'structure', displayName: 'Structure', description: 'Well-organized prompts with logical flow and hierarchy' },
  { key: 'contextRelevance', displayName: 'Context Relevance', description: 'Appropriate context that guides AI responses effectively' },
  { key: 'creativity', displayName: 'Creativity', description: 'Innovative approaches to prompt design and problem framing' },
  { key: 'iterativeImprovement', displayName: 'Iterative Improvement', description: 'Ability to refine prompts based on AI output feedback' },
];

// AIQ scoring bands with descriptions
export const AIQ_BANDS = [
  { range: '80-100%', title: 'Ethics Champion', description: 'Exceptional understanding of AI ethics and responsible deployment' },
  { range: '60-79%', title: 'Ethics Aware', description: 'Strong ethical foundations with room for advanced concepts' },
  { range: '40-59%', title: 'Ethics Developing', description: 'Building awareness of AI ethics and fairness principles' },
  { range: '0-39%', title: 'Ethics Emerging', description: 'Early stage understanding of AI ethics considerations' },
];

interface SkillsLegendProps {
  className?: string;
  compact?: boolean;
  forPdf?: boolean;
}

export default function SkillsLegend({ className = '', compact = false, forPdf = false }: SkillsLegendProps) {
  const getAcronym = (skillName: string): string => {
    return SKILL_ACRONYMS[skillName] || '';
  };

  return (
    <Card className={className} data-testid="card-skills-legend">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Skills Legend
        </CardTitle>
        <CardDescription>
          Reference guide for all assessed competencies across the four assessment types
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* FIT Assessment Skills */}
        <div className={forPdf ? 'avoid-page-break' : ''}>
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-blue-600" />
            FIT Assessment - Behavioral Skills
          </h4>
          <div className={`grid gap-2 ${forPdf ? 'grid-cols-1' : compact ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {FIT_SKILLS.map((skill) => (
              <div key={skill.key} className="p-2 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                    {getAcronym(skill.displayName)}
                  </span>
                  <span className="font-medium text-sm">{skill.displayName}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Readiness Skills */}
        <div className={forPdf ? 'page-break-before avoid-page-break' : ''}>
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-green-600" />
            AI Readiness - Technical Competencies
          </h4>
          <div className={`grid gap-2 ${forPdf ? 'grid-cols-1' : compact ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {AI_READINESS_SKILLS.map((skill) => (
              <div key={skill.key} className="p-2 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                    {getAcronym(skill.displayName)}
                  </span>
                  <span className="font-medium text-sm">{skill.displayName}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Prompt Architecture Dimensions */}
        <div className={forPdf ? 'avoid-page-break' : ''}>
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-amber-600" />
            Prompt Architecture - Evaluation Dimensions
          </h4>
          <div className={`grid gap-2 ${forPdf ? 'grid-cols-1' : compact ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {PROMPT_ARCHITECTURE_DIMENSIONS.map((dim) => (
              <div key={dim.key} className="p-2 rounded-lg bg-muted/30 border">
                <span className="font-medium text-sm">{dim.displayName}</span>
                <p className="text-xs text-muted-foreground mt-1">{dim.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AIQ Scoring Bands */}
        <div className={forPdf ? 'avoid-page-break' : ''}>
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-purple-600" />
            AIQ - Algorithmic Integrity Quotient Bands
          </h4>
          <div className={`grid gap-2 ${forPdf ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {AIQ_BANDS.map((band) => (
              <div key={band.range} className="p-2 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                    {band.range}
                  </span>
                  <span className="font-medium text-sm">{band.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{band.description}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Export skill data for PDF generation
export const ALL_SKILLS_FOR_PDF = {
  fit: FIT_SKILLS.map(s => ({ ...s, acronym: SKILL_ACRONYMS[s.displayName] || '' })),
  aiReadiness: AI_READINESS_SKILLS.map(s => ({ ...s, acronym: SKILL_ACRONYMS[s.displayName] || '' })),
  promptArchitecture: PROMPT_ARCHITECTURE_DIMENSIONS,
  aiqBands: AIQ_BANDS,
};
