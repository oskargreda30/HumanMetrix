import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export interface CriticalSkillData {
  skillName: string;
  candidateScore: number | null;
  requiredScore: number;
  gap: number | null;
  criticality: string;
}

interface CriticalSkillsAnalysisProps {
  skills: CriticalSkillData[];
  candidateName?: string;
}

const SKILL_DESCRIPTIONS: Record<string, string> = {
  // FIT Skills
  "High Agency": "Enables proactive problem-solving and ownership of outcomes, reducing dependency on constant supervision in fast-moving AI environments.",
  "Intellectual Curiosity": "Drives continuous learning and exploration of new technologies, essential for staying current in rapidly evolving AI landscape.",
  "Resilience": "Supports persistence through setbacks and ambiguity, critical for navigating complex AI implementation challenges.",
  "Empathy & Ethics": "Ensures AI solutions consider human impact and ethical implications, vital for responsible AI deployment.",
  "Growth Mindset": "Facilitates adaptation to new tools and methodologies, enabling continuous improvement in AI capabilities.",
  "Interpersonal Agility": "Essential for effective collaboration across diverse teams and stakeholders in complex AI initiatives.",
  // AI Readiness Skills (official names)
  "AI Literacy & Prompt Engineering": "Foundational understanding of AI concepts and effective prompt engineering, required for AI-augmented work.",
  "Technical Fundamentals": "Core technical knowledge enabling effective interaction with AI systems and tools.",
  "Data Fluency": "Ability to work with and interpret data, essential for leveraging AI insights effectively.",
  "Critical Thinking & Problem-Solving": "Key for evaluating AI recommendations and identifying optimal solutions to complex challenges.",
  "Adaptability & Continuous Learning": "Enables quick adaptation to new AI tools and evolving best practices.",
  "Collaboration & Communication": "Facilitates effective teamwork in AI-augmented environments and cross-functional projects.",
  "Responsible AI & Ethical Awareness": "Ensures ethical considerations in AI usage and deployment decisions.",
  "Creativity & Innovation": "Drives novel applications of AI technology to solve business problems.",
  // Legacy names for backwards compatibility
  "AI Literacy": "Foundational understanding of AI concepts and applications, required for effective AI-augmented work.",
  "Collaboration": "Facilitates effective teamwork in AI-augmented environments and cross-functional projects.",
  "Domain Expertise": "Deep knowledge in specific areas that enhances AI application and interpretation.",
};

function getSkillDescription(skillName: string): string {
  return SKILL_DESCRIPTIONS[skillName] || `Critical for success in roles requiring ${skillName.toLowerCase()} capabilities.`;
}

export function CriticalSkillsAnalysis({ skills, candidateName = "Candidate" }: CriticalSkillsAnalysisProps) {
  const criticalSkills = skills.filter(s => s.criticality === 'critical');
  
  if (criticalSkills.length === 0) {
    return null;
  }

  const skillsMet = criticalSkills.filter(s => s.candidateScore !== null && s.gap !== null && s.gap >= 0).length;
  const totalCritical = criticalSkills.length;

  return (
    <Card data-testid="section-critical-skills-analysis">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-blue-600" />
          Critical Skills Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Deep analysis of the most critical skills required for this role
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {criticalSkills.map((skill, index) => {
          const gapValue = skill.gap ?? 0;
          const isAbove = gapValue >= 0;
          const gapText = skill.candidateScore === null 
            ? "No data available" 
            : isAbove 
              ? `+${gapValue} above requirement` 
              : `${Math.abs(gapValue)} below requirement`;
          
          return (
            <div key={index} className="space-y-2" data-testid={`critical-skill-${index}`}>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5">
                  CRITICAL
                </Badge>
                <h4 className="font-semibold text-lg">{skill.skillName}</h4>
              </div>
              
              <p className="text-sm text-muted-foreground italic">
                Why it matters: {getSkillDescription(skill.skillName)}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span>
                  Candidate Score: <strong>{skill.candidateScore !== null ? `${skill.candidateScore}/100` : 'N/A'}</strong>
                </span>
                <span className="text-muted-foreground">
                  (Recommended: {skill.requiredScore})
                </span>
                <span className={`font-medium ${
                  skill.candidateScore === null 
                    ? 'text-muted-foreground' 
                    : isAbove 
                      ? 'text-green-600' 
                      : 'text-red-600'
                }`}>
                  {gapText}
                </span>
              </div>
            </div>
          );
        })}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg border-l-4 border-blue-600">
          <h4 className="font-semibold mb-2">Critical Skills Summary</h4>
          <p className="text-sm text-muted-foreground">
            {candidateName} shows {skillsMet === totalCritical ? 'strong' : skillsMet >= totalCritical / 2 ? 'moderate' : 'limited'} alignment with critical skills, 
            meeting {skillsMet} of {totalCritical} key requirements.
            {skillsMet < totalCritical && ' Targeted development in the remaining critical areas would strengthen role performance significantly.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
