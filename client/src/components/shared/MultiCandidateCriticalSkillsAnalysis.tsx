import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, AlertCircle, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export interface CriticalSkillCandidateData {
  userId: string;
  userName: string;
  score: number | null;
  dataAvailable: boolean;
  gap: number | null;
  meetsRequirement: boolean;
}

export interface CriticalSkillMultiData {
  skillName: string;
  requiredScore: number;
  criticality: string;
  category: 'fit' | 'ai_readiness' | 'prompt_architecture' | 'aiq';
  candidates: CriticalSkillCandidateData[];
}

interface MultiCandidateCriticalSkillsAnalysisProps {
  skills: CriticalSkillMultiData[];
  roleName: string;
}

const SKILL_DESCRIPTIONS: Record<string, string> = {
  "High Agency": "Enables proactive problem-solving and ownership of outcomes, reducing dependency on constant supervision in fast-moving AI environments.",
  "Intellectual Curiosity": "Drives continuous learning and exploration of new technologies, essential for staying current in rapidly evolving AI landscape.",
  "Resilience": "Supports persistence through setbacks and ambiguity, critical for navigating complex AI implementation challenges.",
  "Empathy & Ethics": "Ensures AI solutions consider human impact and ethical implications, vital for responsible AI deployment.",
  "Growth Mindset": "Facilitates adaptation to new tools and methodologies, enabling continuous improvement in AI capabilities.",
  "Interpersonal Agility": "Essential for effective collaboration across diverse teams and stakeholders in complex AI initiatives.",
  "AI Literacy & Prompt Engineering": "Foundational understanding of AI concepts and effective prompt engineering, required for AI-augmented work.",
  "Technical Fundamentals": "Core technical knowledge enabling effective interaction with AI systems and tools.",
  "Data Fluency": "Ability to work with and interpret data, essential for leveraging AI insights effectively.",
  "Critical Thinking & Problem-Solving": "Key for evaluating AI recommendations and identifying optimal solutions to complex challenges.",
  "Adaptability & Continuous Learning": "Enables quick adaptation to new AI tools and evolving best practices.",
  "Collaboration & Communication": "Facilitates effective teamwork in AI-augmented environments and cross-functional projects.",
  "Responsible AI & Ethical Awareness": "Ensures ethical considerations in AI usage and deployment decisions.",
  "Creativity & Innovation": "Drives novel applications of AI technology to solve business problems.",
  "AI Literacy": "Foundational understanding of AI concepts and applications, required for effective AI-augmented work.",
  "Collaboration": "Facilitates effective teamwork in AI-augmented environments and cross-functional projects.",
  "Domain Expertise": "Deep knowledge in specific areas that enhances AI application and interpretation.",
};

function getSkillDescription(skillName: string): string {
  return SKILL_DESCRIPTIONS[skillName] || `Critical for success in roles requiring ${skillName.toLowerCase()} capabilities.`;
}

function getCategoryLabel(category: 'fit' | 'ai_readiness' | 'prompt_architecture' | 'aiq'): string {
  switch (category) {
    case 'fit': return 'Behavioral';
    case 'ai_readiness': return 'Technical';
    case 'prompt_architecture': return 'Prompt Architecture';
    case 'aiq': return 'AIQ';
  }
}

export function MultiCandidateCriticalSkillsAnalysis({ skills, roleName }: MultiCandidateCriticalSkillsAnalysisProps) {
  const criticalSkills = skills.filter(s => s.criticality === 'critical');
  
  if (criticalSkills.length === 0) {
    return null;
  }

  const allCandidates = criticalSkills[0]?.candidates || [];
  
  const candidateSummaries = allCandidates.map(candidate => {
    let skillsMet = 0;
    let skillsAssessed = 0;
    
    criticalSkills.forEach(skill => {
      const candidateData = skill.candidates.find(c => c.userId === candidate.userId);
      if (candidateData?.dataAvailable && candidateData.score !== null) {
        skillsAssessed++;
        if (candidateData.meetsRequirement) {
          skillsMet++;
        }
      }
    });
    
    return {
      userId: candidate.userId,
      userName: candidate.userName,
      skillsMet,
      skillsAssessed,
      totalCritical: criticalSkills.length,
      percentage: skillsAssessed > 0 ? Math.round((skillsMet / skillsAssessed) * 100) : 0,
    };
  }).sort((a, b) => b.percentage - a.percentage);

  return (
    <Card data-testid="section-multi-candidate-critical-skills-analysis">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-blue-600" />
          Critical Skills Deep Dive
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          AI-identified must-have skills for {roleName} with detailed analysis of why each matters and how all candidates compare
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        {criticalSkills.map((skill, index) => {
          const candidatesWithData = skill.candidates.filter(c => c.dataAvailable && c.score !== null);
          const candidatesMeeting = candidatesWithData.filter(c => c.meetsRequirement).length;
          const bestCandidate = candidatesWithData.length > 0 
            ? candidatesWithData.reduce((best, curr) => (curr.score || 0) > (best.score || 0) ? curr : best)
            : null;
          
          return (
            <div key={index} className="space-y-4 pb-6 border-b last:border-b-0 last:pb-0" data-testid={`multi-critical-skill-${index}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5">
                  CRITICAL
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getCategoryLabel(skill.category)}
                </Badge>
                <h4 className="font-semibold text-lg">{skill.skillName}</h4>
                <span className="text-sm text-muted-foreground ml-auto">
                  Required: {skill.requiredScore}/100
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground italic border-l-2 border-blue-500 pl-3">
                Why it matters: {getSkillDescription(skill.skillName)}
              </p>
              
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Candidate Performance
                  </span>
                  <span className="text-muted-foreground">
                    {candidatesMeeting}/{candidatesWithData.length} candidates meet requirement
                    {skill.candidates.length - candidatesWithData.length > 0 && (
                      <span className="ml-1">({skill.candidates.length - candidatesWithData.length} not assessed)</span>
                    )}
                  </span>
                </div>
                
                {skill.candidates.map((candidate, cidx) => {
                  const meetsReq = candidate.meetsRequirement;
                  const isBest = bestCandidate?.userId === candidate.userId;
                  
                  return (
                    <div key={cidx} className="flex items-center gap-3">
                      <div className="w-32 flex items-center gap-2">
                        <span className="text-sm font-medium truncate" title={candidate.userName}>
                          {candidate.userName.length > 12 ? candidate.userName.slice(0, 12) + '...' : candidate.userName}
                        </span>
                        {isBest && candidate.dataAvailable && (
                          <Badge className="bg-amber-500 text-white text-xs px-1 py-0">Best</Badge>
                        )}
                      </div>
                      
                      {!candidate.dataAvailable || candidate.score === null ? (
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 h-4 bg-muted rounded-full" />
                          <span className="w-16 text-sm text-muted-foreground italic">No data</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 relative">
                            <Progress 
                              value={candidate.score} 
                              className={`h-4 ${meetsReq ? '[&>div]:bg-green-500' : '[&>div]:bg-red-400'}`}
                            />
                            <div 
                              className="absolute top-0 h-4 w-0.5 bg-blue-600" 
                              style={{ left: `${skill.requiredScore}%` }}
                              title={`Required: ${skill.requiredScore}`}
                            />
                          </div>
                          <div className="w-16 flex items-center gap-1">
                            {meetsReq ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                            <span className={`text-sm font-medium ${meetsReq ? 'text-green-600' : 'text-red-600'}`}>
                              {candidate.score}%
                            </span>
                          </div>
                          <span className={`w-16 text-xs ${(candidate.gap || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(candidate.gap || 0) >= 0 ? '+' : ''}{candidate.gap}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
                
                <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground border-t mt-3">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    Meets requirement
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-400" />
                    Below requirement
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-0.5 h-3 bg-blue-600" />
                    Required threshold
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/30 rounded-lg border-l-4 border-blue-600">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Critical Skills Summary by Candidate
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {candidateSummaries.map((summary, idx) => {
              const allMet = summary.skillsMet === summary.skillsAssessed && summary.skillsAssessed > 0;
              const mostMet = summary.percentage >= 75;
              const someMet = summary.percentage >= 50;
              
              return (
                <div 
                  key={summary.userId} 
                  className={`p-3 rounded-lg border ${
                    allMet ? 'bg-green-50 dark:bg-green-950/30 border-green-200' :
                    mostMet ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200' :
                    someMet ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200' :
                    'bg-red-50 dark:bg-red-950/30 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{summary.userName}</span>
                    {idx === 0 && summary.skillsAssessed > 0 && (
                      <Badge className="bg-amber-500 text-white text-xs">Top</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${
                      allMet ? 'text-green-600' :
                      mostMet ? 'text-blue-600' :
                      someMet ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {summary.skillsMet}/{summary.skillsAssessed}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      critical skills met
                      {summary.skillsAssessed < summary.totalCritical && (
                        <span> ({summary.totalCritical - summary.skillsAssessed} not assessed)</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {allMet ? 'Meets all assessed critical requirements' :
                     mostMet ? 'Strong alignment with most critical skills' :
                     someMet ? 'Moderate alignment - some gaps to address' :
                     summary.skillsAssessed === 0 ? 'No critical skills data available' :
                     'Significant gaps in critical skills'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
