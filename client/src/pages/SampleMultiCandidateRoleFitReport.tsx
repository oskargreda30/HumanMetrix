import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import PartnerMultiCandidateRoleFitTab from "@/components/partner/PartnerMultiCandidateRoleFitTab";

const DEMO_COMPARISON = {
  id: "sample-multi-rolefit-001",
  jobRoleId: "role-senior-ai-engineer",
  candidateEntries: [
    {
      userId: "user-sarah-chen",
      userName: "Sarah Chen",
      email: "sarah.chen@example.com",
      overallFit: 87,
      rank: 1,
      fitTier: "strong" as const,
      promptArchitectureScore: 88,
      aiqScore: 85,
      dataCoverage: {
        percentage: 100,
        assessedSkillCount: 14,
        totalRequiredSkills: 14,
        missingAssessments: [],
        hasSufficientData: true,
      },
      hasSufficientData: true,
      missingAssessments: [],
      skillScores: [
        { skillName: "High Agency", score: 88, requiredScore: 80, gap: 8, alignment: "exceeds", criticality: "critical" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "Intellectual Curiosity", score: 90, requiredScore: 85, gap: 5, alignment: "exceeds", criticality: "critical" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "Resilience", score: 82, requiredScore: 75, gap: 7, alignment: "exceeds", criticality: "standard" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "Empathy & Ethics", score: 84, requiredScore: 80, gap: 4, alignment: "exceeds", criticality: "standard" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "Growth Mindset", score: 86, requiredScore: 85, gap: 1, alignment: "meets", criticality: "critical" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "Interpersonal Agility", score: 80, requiredScore: 78, gap: 2, alignment: "meets", criticality: "standard" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "AI Literacy & Prompt Engineering", score: 92, requiredScore: 85, gap: 7, alignment: "exceeds", criticality: "critical" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Technical Fundamentals", score: 88, requiredScore: 82, gap: 6, alignment: "exceeds", criticality: "critical" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Data Fluency", score: 85, requiredScore: 80, gap: 5, alignment: "exceeds", criticality: "standard" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Critical Thinking & Problem-Solving", score: 86, requiredScore: 82, gap: 4, alignment: "exceeds", criticality: "critical" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Adaptability & Continuous Learning", score: 84, requiredScore: 80, gap: 4, alignment: "exceeds", criticality: "standard" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Collaboration & Communication", score: 82, requiredScore: 78, gap: 4, alignment: "exceeds", criticality: "standard" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Responsible AI & Ethical Awareness", score: 90, requiredScore: 85, gap: 5, alignment: "exceeds", criticality: "critical" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Creativity & Innovation", score: 83, requiredScore: 78, gap: 5, alignment: "exceeds", criticality: "standard" as const, category: "ai_readiness" as const, dataAvailable: true },
      ],
      strengths: [
        { skill: "AI Literacy & Prompt Engineering", summary: "Exceptional AI fluency", description: "Demonstrates advanced understanding of prompt engineering patterns, achieving 92% — well above the 85% threshold for this critical skill." },
        { skill: "Intellectual Curiosity", summary: "Strong learning drive", description: "Exhibits outstanding intellectual curiosity at 90%, indicating a natural inclination toward continuous learning and exploration of new AI technologies." },
        { skill: "Responsible AI & Ethical Awareness", summary: "Strong ethical AI mindset", description: "Scores 90% on responsible AI awareness, showing deep commitment to ethical AI deployment practices." },
      ],
      gaps: [],
      riskFlags: [],
    },
    {
      userId: "user-marcus-johnson",
      userName: "Marcus Johnson",
      email: "marcus.johnson@example.com",
      overallFit: 79,
      rank: 2,
      fitTier: "moderate" as const,
      promptArchitectureScore: 76,
      aiqScore: 80,
      dataCoverage: {
        percentage: 100,
        assessedSkillCount: 14,
        totalRequiredSkills: 14,
        missingAssessments: [],
        hasSufficientData: true,
      },
      hasSufficientData: true,
      missingAssessments: [],
      skillScores: [
        { skillName: "High Agency", score: 82, requiredScore: 80, gap: 2, alignment: "meets", criticality: "critical" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "Intellectual Curiosity", score: 78, requiredScore: 85, gap: -7, alignment: "gap", criticality: "critical" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "Resilience", score: 85, requiredScore: 75, gap: 10, alignment: "exceeds", criticality: "standard" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "Empathy & Ethics", score: 80, requiredScore: 80, gap: 0, alignment: "meets", criticality: "standard" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "Growth Mindset", score: 76, requiredScore: 85, gap: -9, alignment: "gap", criticality: "critical" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "Interpersonal Agility", score: 83, requiredScore: 78, gap: 5, alignment: "exceeds", criticality: "standard" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "AI Literacy & Prompt Engineering", score: 80, requiredScore: 85, gap: -5, alignment: "gap", criticality: "critical" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Technical Fundamentals", score: 84, requiredScore: 82, gap: 2, alignment: "meets", criticality: "critical" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Data Fluency", score: 78, requiredScore: 80, gap: -2, alignment: "gap", criticality: "standard" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Critical Thinking & Problem-Solving", score: 80, requiredScore: 82, gap: -2, alignment: "gap", criticality: "critical" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Adaptability & Continuous Learning", score: 76, requiredScore: 80, gap: -4, alignment: "gap", criticality: "standard" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Collaboration & Communication", score: 86, requiredScore: 78, gap: 8, alignment: "exceeds", criticality: "standard" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Responsible AI & Ethical Awareness", score: 78, requiredScore: 85, gap: -7, alignment: "gap", criticality: "critical" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Creativity & Innovation", score: 80, requiredScore: 78, gap: 2, alignment: "meets", criticality: "standard" as const, category: "ai_readiness" as const, dataAvailable: true },
      ],
      strengths: [
        { skill: "Collaboration & Communication", summary: "Excellent team player", description: "Exceptional collaboration score of 86%, well above the 78% requirement, indicating strong cross-functional communication abilities." },
        { skill: "Resilience", summary: "Strong under pressure", description: "Demonstrates remarkable resilience at 85%, suggesting the ability to maintain productivity and composure in high-pressure AI development environments." },
      ],
      gaps: [
        { skill: "Growth Mindset", summary: "Below threshold", description: "Scores 76% against a required 85% for Growth Mindset, a critical skill. May need structured development programs to build a stronger learning orientation." },
        { skill: "AI Literacy & Prompt Engineering", summary: "Below critical threshold", description: "At 80% against a required 85%, there is a modest gap in AI fluency that may require targeted upskilling." },
      ],
      riskFlags: ["Multiple critical skill gaps may impact role effectiveness"],
    },
    {
      userId: "user-priya-patel",
      userName: "Priya Patel",
      email: "priya.patel@example.com",
      overallFit: 83,
      rank: 3,
      fitTier: "strong" as const,
      promptArchitectureScore: 91,
      aiqScore: 78,
      dataCoverage: {
        percentage: 100,
        assessedSkillCount: 14,
        totalRequiredSkills: 14,
        missingAssessments: [],
        hasSufficientData: true,
      },
      hasSufficientData: true,
      missingAssessments: [],
      skillScores: [
        { skillName: "High Agency", score: 84, requiredScore: 80, gap: 4, alignment: "exceeds", criticality: "critical" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "Intellectual Curiosity", score: 86, requiredScore: 85, gap: 1, alignment: "meets", criticality: "critical" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "Resilience", score: 79, requiredScore: 75, gap: 4, alignment: "exceeds", criticality: "standard" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "Empathy & Ethics", score: 88, requiredScore: 80, gap: 8, alignment: "exceeds", criticality: "standard" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "Growth Mindset", score: 84, requiredScore: 85, gap: -1, alignment: "gap", criticality: "critical" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "Interpersonal Agility", score: 82, requiredScore: 78, gap: 4, alignment: "exceeds", criticality: "standard" as const, category: "fit" as const, dataAvailable: true },
        { skillName: "AI Literacy & Prompt Engineering", score: 86, requiredScore: 85, gap: 1, alignment: "meets", criticality: "critical" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Technical Fundamentals", score: 82, requiredScore: 82, gap: 0, alignment: "meets", criticality: "critical" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Data Fluency", score: 84, requiredScore: 80, gap: 4, alignment: "exceeds", criticality: "standard" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Critical Thinking & Problem-Solving", score: 85, requiredScore: 82, gap: 3, alignment: "exceeds", criticality: "critical" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Adaptability & Continuous Learning", score: 82, requiredScore: 80, gap: 2, alignment: "meets", criticality: "standard" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Collaboration & Communication", score: 80, requiredScore: 78, gap: 2, alignment: "meets", criticality: "standard" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Responsible AI & Ethical Awareness", score: 86, requiredScore: 85, gap: 1, alignment: "meets", criticality: "critical" as const, category: "ai_readiness" as const, dataAvailable: true },
        { skillName: "Creativity & Innovation", score: 78, requiredScore: 78, gap: 0, alignment: "meets", criticality: "standard" as const, category: "ai_readiness" as const, dataAvailable: true },
      ],
      strengths: [
        { skill: "Empathy & Ethics", summary: "Strong ethical foundation", description: "Demonstrates exceptional ethical awareness at 88%, providing a solid foundation for responsible AI development and stakeholder management." },
        { skill: "Prompt Architecture", summary: "Outstanding prompt design", description: "Achieved 91% on Prompt Architecture, the highest among all candidates, indicating advanced skills in designing and optimizing AI prompts." },
        { skill: "Intellectual Curiosity", summary: "Driven learner", description: "Scores 86% on Intellectual Curiosity, meeting the high threshold and showing genuine passion for continuous technical growth." },
      ],
      gaps: [
        { skill: "Growth Mindset", summary: "Marginal gap", description: "At 84% against a required 85%, this is a very minor gap that could be addressed through targeted coaching or mentorship." },
      ],
      riskFlags: [],
    },
  ],
  roleSnapshot: {
    roleId: "role-senior-ai-engineer",
    roleName: "Senior AI Engineer",
    requiredSkillScores: {
      fitSkills: {
        "High Agency": 80,
        "Intellectual Curiosity": 85,
        "Resilience": 75,
        "Empathy & Ethics": 80,
        "Growth Mindset": 85,
        "Interpersonal Agility": 78,
      },
      aiReadinessSkills: {
        "AI Literacy & Prompt Engineering": 85,
        "Technical Fundamentals": 82,
        "Data Fluency": 80,
        "Critical Thinking & Problem-Solving": 82,
        "Adaptability & Continuous Learning": 80,
        "Collaboration & Communication": 78,
        "Responsible AI & Ethical Awareness": 85,
        "Creativity & Innovation": 78,
      },
      promptArchitectureSkills: {},
      aiqSkills: {},
      skillCriticality: {
        "High Agency": "critical",
        "Intellectual Curiosity": "critical",
        "Resilience": "standard",
        "Empathy & Ethics": "standard",
        "Growth Mindset": "critical",
        "Interpersonal Agility": "standard",
        "AI Literacy & Prompt Engineering": "critical",
        "Technical Fundamentals": "critical",
        "Data Fluency": "standard",
        "Critical Thinking & Problem-Solving": "critical",
        "Adaptability & Continuous Learning": "standard",
        "Collaboration & Communication": "standard",
        "Responsible AI & Ethical Awareness": "critical",
        "Creativity & Innovation": "standard",
      },
    },
  },
  summaryInsights: {
    topPerformer: { userId: "user-sarah-chen", userName: "Sarah Chen", overallFit: 87 },
    averageFit: 83,
    fitDistribution: { strong: 2, moderate: 1, developmentNeeded: 0 },
    commonStrengths: [
      "All candidates demonstrate adequate behavioral competencies for AI-driven roles",
      "Strong ethical awareness across the candidate pool",
      "Solid technical foundations with differentiated specializations",
    ],
    commonGaps: [
      "Growth Mindset scores are tight across the cohort, with two candidates near the threshold",
      "No candidate shows exceptional strength in all 14 assessed dimensions simultaneously",
    ],
    keyDifferentiators: [
      "Sarah Chen leads in AI Literacy and Responsible AI awareness, both critical skills",
      "Priya Patel has the highest Prompt Architecture score (91%) among all candidates",
      "Marcus Johnson excels in collaboration and resilience but has multiple critical skill gaps",
    ],
    recommendation: {
      recommendedCandidate: "Sarah Chen",
      recommendedUserId: "user-sarah-chen",
      fitScore: 87,
      fitTier: "strong",
      reasons: [
        "Highest overall fit score at 87% with no skill gaps across all 14 dimensions",
        "Exceeds requirements on 6 out of 7 critical skills, meeting the remaining one",
        "Strongest AI Literacy & Prompt Engineering score (92%), crucial for this senior role",
        "Exceptional Responsible AI awareness (90%) supports trustworthy AI development practices",
      ],
      criticalSkillAdvantages: [
        "AI Literacy & Prompt Engineering (92% vs 85% required)",
        "Intellectual Curiosity (90% vs 85% required)",
        "Responsible AI & Ethical Awareness (90% vs 85% required)",
      ],
    },
    runnerUp: {
      name: "Priya Patel",
      userId: "user-priya-patel",
      fitScore: 83,
      fitTier: "strong",
      consideration: [
        "Second highest overall fit at 83% with only one marginal gap (Growth Mindset at 84% vs 85%)",
        "Highest Prompt Architecture score in the cohort (91%), indicating advanced prompt engineering design capabilities",
        "Strong ethical foundation (88% Empathy & Ethics) complements technical skills well",
      ],
      advantagesOverTop: [
        "Prompt Architecture (91% vs Sarah's 88%)",
        "Empathy & Ethics (88% vs Sarah's 84%)",
      ],
    },
    skillComparison: [
      { skillName: "AI Literacy & Prompt Engineering", winner: "Sarah Chen", winnerScore: 92, loserScore: 80, margin: 12, criticality: "critical" },
      { skillName: "Intellectual Curiosity", winner: "Sarah Chen", winnerScore: 90, loserScore: 78, margin: 12, criticality: "critical" },
      { skillName: "Responsible AI & Ethical Awareness", winner: "Sarah Chen", winnerScore: 90, loserScore: 78, margin: 12, criticality: "critical" },
      { skillName: "Growth Mindset", winner: "Sarah Chen", winnerScore: 86, loserScore: 76, margin: 10, criticality: "critical" },
      { skillName: "Collaboration & Communication", winner: "Marcus Johnson", winnerScore: 86, loserScore: 80, margin: 6, criticality: "standard" },
      { skillName: "Resilience", winner: "Marcus Johnson", winnerScore: 85, loserScore: 79, margin: 6, criticality: "standard" },
    ],
    skillDominance: [
      { candidateName: "Sarah Chen", candidateId: "user-sarah-chen", winsCount: 10, totalSkills: 14, dominancePercent: 71 },
      { candidateName: "Priya Patel", candidateId: "user-priya-patel", winsCount: 2, totalSkills: 14, dominancePercent: 14 },
      { candidateName: "Marcus Johnson", candidateId: "user-marcus-johnson", winsCount: 2, totalSkills: 14, dominancePercent: 14 },
    ],
    consistencyScores: [
      { candidateName: "Sarah Chen", candidateId: "user-sarah-chen", consistencyScore: 92, interpretation: "Highly consistent performance across all skill dimensions" },
      { candidateName: "Priya Patel", candidateId: "user-priya-patel", consistencyScore: 88, interpretation: "Consistent with slight variation between behavioral and technical skills" },
      { candidateName: "Marcus Johnson", candidateId: "user-marcus-johnson", consistencyScore: 72, interpretation: "Notable variance between strengths and gap areas" },
    ],
    criticalGapRatios: [
      { candidateName: "Sarah Chen", candidateId: "user-sarah-chen", criticalGaps: 0, totalCritical: 7, gapRatio: 0, riskLevel: "low" },
      { candidateName: "Priya Patel", candidateId: "user-priya-patel", criticalGaps: 1, totalCritical: 7, gapRatio: 14, riskLevel: "low" },
      { candidateName: "Marcus Johnson", candidateId: "user-marcus-johnson", criticalGaps: 4, totalCritical: 7, gapRatio: 57, riskLevel: "high" },
    ],
    largestDifferential: {
      skillName: "AI Literacy & Prompt Engineering",
      topCandidate: "Sarah Chen",
      topScore: 92,
      bottomCandidate: "Marcus Johnson",
      bottomScore: 80,
      spread: 12,
      criticality: "critical",
    },
  },
  createdAt: new Date().toISOString(),
  aiInsights: "This cohort analysis reveals a clear frontrunner in **Sarah Chen**, who demonstrates exceptional AI technical fluency combined with strong behavioral competencies. Her standout performance in AI Literacy & Prompt Engineering (92%) and Responsible AI & Ethical Awareness (90%) positions her as the ideal candidate for a Senior AI Engineer role where both technical excellence and ethical judgment are paramount.\n\n**Priya Patel** presents a compelling alternative, particularly for teams that prioritize prompt architecture expertise (91% — the highest in the cohort). Her only gap is marginal (Growth Mindset at 84% vs. 85% required), making her a low-risk hire with strong potential.\n\n**Marcus Johnson**, while demonstrating excellent collaboration and resilience, faces significant challenges with 4 critical skill gaps. His strengths in teamwork (86%) and composure under pressure (85%) are valuable, but the pattern of gaps across AI Literacy, Responsible AI, Growth Mindset, and Critical Thinking suggests he may need substantial development before being ready for a senior-level AI role.\n\n**Key Insight:** The 12-point spread in AI Literacy between Sarah Chen (92%) and Marcus Johnson (80%) represents the largest differential on a critical skill, underscoring the importance of technical AI competency assessment in hiring decisions for this role.",
};

export default function SampleMultiCandidateRoleFitReport() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1">
        <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 max-w-6xl">
          <div className="mb-4 md:mb-6">
            <Link href="/#sample-reports">
              <Button variant="ghost" size="sm" className="mb-2 md:mb-4 text-xs md:text-sm" data-testid="button-back">
                <ArrowLeft className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                Back to Sample Reports
              </Button>
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1 md:mb-2">
                  <Badge variant="outline" className="text-primary border-primary text-[10px] md:text-xs" data-testid="badge-sample">
                    Sample Report
                  </Badge>
                </div>
                <h1 className="text-lg md:text-3xl font-bold" data-testid="text-page-title">
                  Multi-Candidate Role Fit Comparison
                </h1>
                <p className="text-xs md:text-base text-muted-foreground mt-1" data-testid="text-page-subtitle">
                  3 candidates compared against Senior AI Engineer role
                </p>
              </div>
            </div>
          </div>

          <PartnerMultiCandidateRoleFitTab
            staticData={{ comparison: DEMO_COMPARISON }}
          />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
