import { useState } from "react";
import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { SharedCompareTab } from "@/components/shared/SharedCompareTab";
import { exportResultsPDF } from "@/lib/pdfScreenCapture";

const MOCK_CANDIDATES = [
  {
    user: {
      id: "1",
      email: "sarah.chen@example.com",
      firstName: "Sarah",
      lastName: "Chen",
    },
  },
  {
    user: {
      id: "2",
      email: "marcus.johnson@example.com",
      firstName: "Marcus",
      lastName: "Johnson",
    },
  },
  {
    user: {
      id: "3",
      email: "emily.rodriguez@example.com",
      firstName: "Emily",
      lastName: "Rodriguez",
    },
  },
];

const FIT_SKILLS = ["High Agency", "Intellectual Curiosity", "Resilience", "Empathy & Ethics", "Growth Mindset", "Interpersonal Agility"];
const AI_SKILLS = ["AI Literacy & Prompt Engineering", "Technical Fundamentals", "Data Fluency", "Critical Thinking & Problem-Solving", "Adaptability & Continuous Learning", "Collaboration & Communication", "Responsible AI & Ethical Awareness", "Creativity & Innovation", "Domain Expertise"];

const FIT_SCORES = [
  { "High Agency": 85, "Intellectual Curiosity": 88, "Resilience": 78, "Empathy & Ethics": 84, "Growth Mindset": 86, "Interpersonal Agility": 80 },
  { "High Agency": 72, "Intellectual Curiosity": 78, "Resilience": 82, "Empathy & Ethics": 75, "Growth Mindset": 74, "Interpersonal Agility": 76 },
  { "High Agency": 68, "Intellectual Curiosity": 74, "Resilience": 72, "Empathy & Ethics": 82, "Growth Mindset": 70, "Interpersonal Agility": 78 },
];

const AI_SCORES = [
  { "AI Literacy & Prompt Engineering": 82, "Technical Fundamentals": 75, "Data Fluency": 80, "Critical Thinking & Problem-Solving": 85, "Adaptability & Continuous Learning": 88, "Collaboration & Communication": 78, "Responsible AI & Ethical Awareness": 90, "Creativity & Innovation": 76, "Domain Expertise": 84 },
  { "AI Literacy & Prompt Engineering": 78, "Technical Fundamentals": 82, "Data Fluency": 74, "Critical Thinking & Problem-Solving": 74, "Adaptability & Continuous Learning": 76, "Collaboration & Communication": 70, "Responsible AI & Ethical Awareness": 72, "Creativity & Innovation": 68, "Domain Expertise": 79 },
  { "AI Literacy & Prompt Engineering": 70, "Technical Fundamentals": 65, "Data Fluency": 68, "Critical Thinking & Problem-Solving": 76, "Adaptability & Continuous Learning": 72, "Collaboration & Communication": 74, "Responsible AI & Ethical Awareness": 85, "Creativity & Innovation": 70, "Domain Expertise": 73 },
];

function avg(scores: number[]) {
  return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
}

const MOCK_COMPARISON = {
  radarData: FIT_SKILLS.map((skill) => ({
    skill,
    "Sarah Chen": FIT_SCORES[0][skill as keyof typeof FIT_SCORES[0]],
    "Marcus Johnson": FIT_SCORES[1][skill as keyof typeof FIT_SCORES[1]],
    "Emily Rodriguez": FIT_SCORES[2][skill as keyof typeof FIT_SCORES[2]],
  })),
  skillComparison: [
    ...FIT_SKILLS.map((skill) => ({
      skillName: skill,
      scores: [
        FIT_SCORES[0][skill as keyof typeof FIT_SCORES[0]],
        FIT_SCORES[1][skill as keyof typeof FIT_SCORES[1]],
        FIT_SCORES[2][skill as keyof typeof FIT_SCORES[2]],
      ],
    })),
    ...AI_SKILLS.map((skill) => ({
      skillName: skill,
      scores: [
        AI_SCORES[0][skill as keyof typeof AI_SCORES[0]],
        AI_SCORES[1][skill as keyof typeof AI_SCORES[1]],
        AI_SCORES[2][skill as keyof typeof AI_SCORES[2]],
      ],
    })),
  ],
  averageScores: [82, 76, 71],
  hasSkillData: true,
  fitAssessments: [
    { scores: FIT_SCORES[0], completedAt: new Date("2026-01-15T10:30:00Z") },
    { scores: FIT_SCORES[1], completedAt: new Date("2026-01-14T09:00:00Z") },
    { scores: FIT_SCORES[2], completedAt: new Date("2026-01-13T11:00:00Z") },
  ],
  aiReadinessAssessments: [
    { scores: AI_SCORES[0], completedAt: new Date("2026-01-15T12:00:00Z") },
    { scores: AI_SCORES[1], completedAt: new Date("2026-01-14T10:00:00Z") },
    { scores: AI_SCORES[2], completedAt: new Date("2026-01-13T12:00:00Z") },
  ],
  promptArchitectureAssessments: [
    {
      levels: [
        { level: 1, scores: { clarity: 18, structure: 17, contextRelevance: 16, creativity: 15, iterativeImprovement: 17 }, totalScore: 83, feedback: "Strong foundational prompt construction." },
        { level: 2, scores: { clarity: 17, structure: 16, contextRelevance: 17, creativity: 14, iterativeImprovement: 16 }, totalScore: 80, feedback: "Effective use of context and constraints." },
        { level: 3, scores: { clarity: 16, structure: 17, contextRelevance: 15, creativity: 16, iterativeImprovement: 15 }, totalScore: 79, feedback: "Good structural approach." },
        { level: 4, scores: { clarity: 15, structure: 16, contextRelevance: 16, creativity: 15, iterativeImprovement: 14 }, totalScore: 76, feedback: "Handles moderate complexity well." },
        { level: 5, scores: { clarity: 15, structure: 15, contextRelevance: 14, creativity: 14, iterativeImprovement: 15 }, totalScore: 73, feedback: "Growing capability in multi-step engineering." },
        { level: 6, scores: { clarity: 14, structure: 14, contextRelevance: 13, creativity: 13, iterativeImprovement: 14 }, totalScore: 68, feedback: "Advanced complexity presents challenges." },
        { level: 7, scores: { clarity: 13, structure: 13, contextRelevance: 12, creativity: 12, iterativeImprovement: 13 }, totalScore: 63, feedback: "Expert-level scenarios reveal areas for development." },
      ],
      totalScore: 75,
      percentile: 72,
      completedAt: new Date("2026-01-15T14:00:00Z"),
    },
    {
      levels: [
        { level: 1, scores: { clarity: 16, structure: 15, contextRelevance: 15, creativity: 14, iterativeImprovement: 15 }, totalScore: 75, feedback: "Solid foundational prompting." },
        { level: 2, scores: { clarity: 15, structure: 15, contextRelevance: 14, creativity: 13, iterativeImprovement: 14 }, totalScore: 71, feedback: "Consistent structure across levels." },
        { level: 3, scores: { clarity: 14, structure: 14, contextRelevance: 14, creativity: 13, iterativeImprovement: 13 }, totalScore: 68, feedback: "Good understanding of constraints." },
        { level: 4, scores: { clarity: 13, structure: 14, contextRelevance: 13, creativity: 12, iterativeImprovement: 13 }, totalScore: 65, feedback: "Effective at intermediate complexity." },
        { level: 5, scores: { clarity: 13, structure: 13, contextRelevance: 12, creativity: 12, iterativeImprovement: 12 }, totalScore: 62, feedback: "Challenges emerge at higher complexity." },
        { level: 6, scores: { clarity: 12, structure: 12, contextRelevance: 12, creativity: 11, iterativeImprovement: 12 }, totalScore: 59, feedback: "Room to grow in advanced scenarios." },
        { level: 7, scores: { clarity: 11, structure: 11, contextRelevance: 11, creativity: 11, iterativeImprovement: 11 }, totalScore: 55, feedback: "Expert level needs further development." },
      ],
      totalScore: 65,
      percentile: 58,
      completedAt: new Date("2026-01-14T11:00:00Z"),
    },
    null,
  ],
  aiqAssessments: [
    { totalScore: 78, scores: { "Algorithmic Integrity": 78 }, completedAt: new Date("2026-01-15T15:00:00Z") },
    { totalScore: 72, scores: { "Algorithmic Integrity": 72 }, completedAt: new Date("2026-01-14T12:00:00Z") },
    { totalScore: 80, scores: { "Algorithmic Integrity": 80 }, completedAt: new Date("2026-01-13T13:00:00Z") },
  ],
  aiInsights: null,
};

export default function SampleComparisonReport() {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await exportResultsPDF({
        elementId: "sample-report-comparison",
        filename: "humanmetrix-comparison-sample.pdf",
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
        <div id="sample-report-comparison" className="mx-auto max-w-6xl px-3 md:px-6 lg:px-8 py-4 md:py-8">
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
              Candidate Comparison Report
            </h1>
            <p className="text-xs md:text-base text-muted-foreground mt-1">
              3 candidates compared across all assessment areas
            </p>
          </div>

          <SharedCompareTab
            config={{
              candidatesEndpoint: "",
              rolesEndpoint: "",
              compareEndpoint: "",
              showInsights: false,
              contextType: "partner",
            }}
            staticData={{
              comparison: MOCK_COMPARISON as any,
              candidates: MOCK_CANDIDATES,
            }}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
