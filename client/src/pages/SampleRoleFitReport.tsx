import { useState } from "react";
import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { SharedSingleCandidateRoleFit } from "@/components/shared/SharedSingleCandidateRoleFit";
import { exportResultsPDF } from "@/lib/pdfScreenCapture";

const MOCK_ALIGNMENT = {
  overallFit: 84,
  fitSkillAlignments: [
    { skillName: "High Agency", candidateScore: 85, requiredScore: 80, gap: 5, alignment: "exceeds", criticality: "critical" as const, dataAvailable: true },
    { skillName: "Intellectual Curiosity", candidateScore: 88, requiredScore: 85, gap: 3, alignment: "exceeds", criticality: "critical" as const, dataAvailable: true },
    { skillName: "Resilience", candidateScore: 78, requiredScore: 75, gap: 3, alignment: "meets", criticality: "standard" as const, dataAvailable: true },
    { skillName: "Empathy & Ethics", candidateScore: 84, requiredScore: 80, gap: 4, alignment: "exceeds", criticality: "standard" as const, dataAvailable: true },
    { skillName: "Growth Mindset", candidateScore: 86, requiredScore: 85, gap: 1, alignment: "meets", criticality: "critical" as const, dataAvailable: true },
    { skillName: "Interpersonal Agility", candidateScore: 80, requiredScore: 85, gap: -5, alignment: "gap", criticality: "standard" as const, dataAvailable: true },
  ],
  aiReadinessSkillAlignments: [
    { skillName: "AI Literacy & Prompt Engineering", candidateScore: 82, requiredScore: 80, gap: 2, alignment: "meets", criticality: "critical" as const, dataAvailable: true },
    { skillName: "Technical Fundamentals", candidateScore: 75, requiredScore: 70, gap: 5, alignment: "exceeds", criticality: "standard" as const, dataAvailable: true },
    { skillName: "Data Fluency", candidateScore: 80, requiredScore: 75, gap: 5, alignment: "exceeds", criticality: "standard" as const, dataAvailable: true },
    { skillName: "Critical Thinking & Problem-Solving", candidateScore: 85, requiredScore: 80, gap: 5, alignment: "exceeds", criticality: "critical" as const, dataAvailable: true },
    { skillName: "Adaptability & Continuous Learning", candidateScore: 88, requiredScore: 85, gap: 3, alignment: "exceeds", criticality: "standard" as const, dataAvailable: true },
    { skillName: "Collaboration & Communication", candidateScore: 78, requiredScore: 75, gap: 3, alignment: "exceeds", criticality: "standard" as const, dataAvailable: true },
    { skillName: "Responsible AI & Ethical Awareness", candidateScore: 90, requiredScore: 85, gap: 5, alignment: "exceeds", criticality: "critical" as const, dataAvailable: true },
    { skillName: "Creativity & Innovation", candidateScore: 76, requiredScore: 75, gap: 1, alignment: "meets", criticality: "standard" as const, dataAvailable: true },
  ],
  strengths: [
    {
      skill: "Responsible AI & Ethical Awareness",
      summary: "Exceptional ethical AI mindset",
      description: "Scores 90% on responsible AI awareness, well above the 85% threshold for this critical skill. Demonstrates deep commitment to ethical AI deployment practices and governance.",
    },
    {
      skill: "Intellectual Curiosity",
      summary: "Outstanding learning drive",
      description: "Exhibits exceptional intellectual curiosity at 88%, indicating a natural inclination toward continuous learning and exploration of new AI technologies and methodologies.",
    },
    {
      skill: "Adaptability & Continuous Learning",
      summary: "Strong adaptability profile",
      description: "Scores 88% on adaptability, exceeding the 85% requirement. Demonstrates strong capacity to embrace new challenges and pivot quickly in dynamic environments.",
    },
    {
      skill: "High Agency",
      summary: "Self-driven initiative",
      description: "Scores 85%, exceeding the 80% requirement. Demonstrates proactive problem-solving and ownership of outcomes without requiring external direction.",
    },
  ],
  gaps: [
    {
      skill: "Interpersonal Agility",
      summary: "Interpersonal flexibility gap",
      description: "Scores 80% against a required score of 85% for this role. Development in cross-cultural communication and adapting style to diverse stakeholders would strengthen this area.",
    },
  ],
  cohortBenchmarks: {
    overall: { percentile: 82, totalCandidates: 247, position: "Top 18%" },
    fit: { percentile: 79, totalCandidates: 247, skillCount: 6, avgScore: 83 },
    ai_readiness: { percentile: 85, totalCandidates: 247, skillCount: 8, avgScore: 82 },
    prompt_architecture: { percentile: 72, totalCandidates: 183, avgScore: 75 },
    aiq: { percentile: 74, totalCandidates: 247, avgScore: 78 },
  },
  interviewQuestions: [
    {
      question: "Tell me about a time when you had to influence stakeholders without direct authority. How did you approach it?",
      purpose: "Assess interpersonal agility and influence skills in cross-functional settings",
      targetSkill: "Interpersonal Agility",
    },
    {
      question: "Describe a situation where you had to make a product decision with incomplete data. What was your process?",
      purpose: "Evaluate decision-making under uncertainty and intellectual curiosity",
      targetSkill: "Intellectual Curiosity",
    },
    {
      question: "How do you approach ethical considerations when designing AI-powered features?",
      purpose: "Assess responsible AI mindset and ethical decision-making framework",
      targetSkill: "Responsible AI & Ethical Awareness",
    },
    {
      question: "Describe a major setback you encountered in a project. How did you recover and what did you learn?",
      purpose: "Evaluate resilience and growth mindset in the face of adversity",
      targetSkill: "Resilience",
    },
  ],
  finalRecommendation: "Strong hire recommendation. Sarah Chen demonstrates exceptional alignment with the Senior Product Manager role, exceeding requirements on 7 of 14 assessed skills. The combination of strong AI literacy, ethical awareness, and intellectual curiosity makes her well-suited for product leadership in AI-driven environments. The single identified gap in Interpersonal Agility is addressable through targeted coaching and is not a barrier to success in this role.",
  nextSteps: [
    "Proceed to final interview panel with focus on stakeholder management scenarios",
    "Assess cross-cultural communication through structured role-play exercises",
    "Explore leadership style and team management philosophy",
    "Discuss specific examples of navigating organizational complexity",
  ],
  dataCoverage: {
    percentage: 100,
    assessedSkillCount: 14,
    totalRequiredSkills: 14,
    missingAssessments: [],
    hasSufficientData: true,
  },
};

const MOCK_CANDIDATE_DATA = {
  user: {
    id: "sample-1",
    email: "sarah.chen@example.com",
    firstName: "Sarah",
    lastName: "Chen",
  },
  results: [],
};

const MOCK_ROLE_DATA = {
  id: "role-1",
  name: "Senior Product Manager",
  description: "Lead product strategy and execution for AI-powered features, working cross-functionally with engineering, design, and business teams to deliver high-impact products.",
};

const MOCK_FIT_ASSESSMENT = {
  scores: {
    "High Agency": 85,
    "Intellectual Curiosity": 88,
    "Resilience": 78,
    "Empathy & Ethics": 84,
    "Growth Mindset": 86,
    "Interpersonal Agility": 80,
  },
  completedAt: "2026-01-15T10:30:00Z",
};

const MOCK_AI_ASSESSMENT = {
  scores: {
    "AI Literacy & Prompt Engineering": 82,
    "Technical Fundamentals": 75,
    "Data Fluency": 80,
    "Critical Thinking & Problem-Solving": 85,
    "Adaptability & Continuous Learning": 88,
    "Collaboration & Communication": 78,
    "Responsible AI & Ethical Awareness": 90,
    "Creativity & Innovation": 76,
    "Domain Expertise": 84,
  },
  completedAt: "2026-01-16T14:15:00Z",
};

const MOCK_PROMPT_ASSESSMENT = {
  levels: [
    { level: 1, scores: { clarity: 18, structure: 17, contextRelevance: 16, creativity: 15, iterativeImprovement: 17 }, totalScore: 83, feedback: "Strong foundational prompt construction with clear intent." },
    { level: 2, scores: { clarity: 17, structure: 16, contextRelevance: 17, creativity: 14, iterativeImprovement: 16 }, totalScore: 80, feedback: "Effective use of context and constraints in prompt design." },
    { level: 3, scores: { clarity: 16, structure: 17, contextRelevance: 15, creativity: 16, iterativeImprovement: 15 }, totalScore: 79, feedback: "Good structural approach with room for creative enhancement." },
    { level: 4, scores: { clarity: 15, structure: 16, contextRelevance: 16, creativity: 15, iterativeImprovement: 14 }, totalScore: 76, feedback: "Handles moderate complexity well with structured approaches." },
    { level: 5, scores: { clarity: 15, structure: 15, contextRelevance: 14, creativity: 14, iterativeImprovement: 15 }, totalScore: 73, feedback: "Demonstrates growing capability in multi-step prompt engineering." },
    { level: 6, scores: { clarity: 14, structure: 14, contextRelevance: 13, creativity: 13, iterativeImprovement: 14 }, totalScore: 68, feedback: "Advanced complexity presents challenges in maintaining coherence." },
    { level: 7, scores: { clarity: 13, structure: 13, contextRelevance: 12, creativity: 12, iterativeImprovement: 13 }, totalScore: 63, feedback: "Expert-level scenarios reveal areas for continued development." },
  ],
  totalScore: 75,
  percentile: 72,
  completedAt: "2026-01-17T09:45:00Z",
};

const MOCK_AIQ_ASSESSMENT = {
  totalScore: 78,
  scores: { "Algorithmic Integrity": 78 },
  completedAt: "2026-01-18T11:20:00Z",
};

export default function SampleRoleFitReport() {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await exportResultsPDF({
        elementId: "sample-report-rolefit",
        filename: "humanmetrix-role-fit-sample.pdf",
      });
    } catch (e) {
      console.error("PDF generation failed", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-grow">
        <div id="sample-report-rolefit" className="mx-auto max-w-6xl px-3 md:px-6 lg:px-8 py-4 md:py-8">
          <div className="flex items-center justify-between mb-4 md:mb-6 gap-3 flex-wrap">
            <Link href="/#sample-reports">
              <Button variant="ghost" size="sm" className="text-xs md:text-sm" data-testid="button-back-to-samples">
                <ArrowLeft className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                Back to Sample Reports
              </Button>
            </Link>
            <Button
              onClick={handleDownloadPDF}
              disabled={downloading}
              size="sm"
              className="gap-2 text-xs md:text-sm"
              data-testid="button-download-pdf"
            >
              {downloading ? <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" /> : <Download className="h-3 w-3 md:h-4 md:w-4" />}
              {downloading ? "Generating..." : "Download PDF"}
            </Button>
          </div>

          <div className="mb-4 md:mb-6">
            <div className="flex items-center gap-2 mb-1 md:mb-2">
              <Badge variant="secondary" className="text-[10px] md:text-xs" data-testid="badge-sample">
                Sample Report
              </Badge>
            </div>
            <h1 className="text-lg md:text-3xl font-bold" data-testid="text-page-title">
              Role Fit Report
            </h1>
            <p className="text-xs md:text-base text-muted-foreground mt-1">
              Sarah Chen assessed against Senior Product Manager role
            </p>
          </div>

          <SharedSingleCandidateRoleFit
            config={{
              candidatesEndpoint: "",
              rolesEndpoint: "",
              roleAlignmentEndpoint: "",
              generateScoresEndpoint: () => "",
              analyzeRoleFitEndpoint: "",
              candidateIdParam: "userId",
              contextType: "partner",
            }}
            staticData={{
              alignment: MOCK_ALIGNMENT as any,
              candidateData: MOCK_CANDIDATE_DATA,
              roleData: MOCK_ROLE_DATA,
              fitAssessment: MOCK_FIT_ASSESSMENT,
              aiReadinessAssessment: MOCK_AI_ASSESSMENT,
              promptArchitectureAssessment: MOCK_PROMPT_ASSESSMENT,
              aiqAssessment: MOCK_AIQ_ASSESSMENT,
            }}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
