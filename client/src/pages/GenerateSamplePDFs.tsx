import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { exportEnhancedCandidatePDF } from "@/lib/enhancedPdfExport";
import { transformToRadarData } from "@/lib/assessmentSkills";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { AI_READINESS_SKILL_NAMES, FIT_SKILL_NAMES } from "@shared/skillNames";

// Sarah Chen mock data - matching exact structure from CandidatesTab
const sarahChenData = {
  user: {
    firstName: "Sarah",
    lastName: "C***",
    email: "s***@example.com"
  },
  results: [
    {
      id: 1,
      userId: 1,
      purchaseItemId: 1,
      assessmentType: "fit",
      status: "completed",
      scores: {
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 88,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 92,
        [FIT_SKILL_NAMES.RESILIENCE]: 85,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 90,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 87,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 91
      },
      completedAt: new Date("2024-11-02"),
      createdAt: new Date("2024-11-02"),
      updatedAt: new Date("2024-11-02")
    },
    {
      id: 2,
      userId: 1,
      purchaseItemId: 2,
      assessmentType: "ai_readiness",
      status: "completed",
      scores: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 85,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 78,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 82,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 90,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 88,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 92,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 80,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 86,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 84
      },
      completedAt: new Date("2024-11-02"),
      createdAt: new Date("2024-11-02"),
      updatedAt: new Date("2024-11-02")
    },
    {
      id: 3,
      userId: 1,
      purchaseItemId: 3,
      assessmentType: "prompt_architecture",
      status: "completed",
      scores: { overall: 82 },
      completedAt: new Date("2024-11-02"),
      createdAt: new Date("2024-11-02"),
      updatedAt: new Date("2024-11-02")
    },
    {
      id: 4,
      userId: 1,
      purchaseItemId: 4,
      assessmentType: "aiq",
      status: "completed",
      scores: { aiq: 85 },
      completedAt: new Date("2024-11-02"),
      createdAt: new Date("2024-11-02"),
      updatedAt: new Date("2024-11-02")
    }
  ]
};

// Transform to skills array (matching CandidatesTab logic EXACTLY)
function getSkills(candidate: typeof sarahChenData) {
  const allSkills: Array<{name: string, score: number, assessment: string}> = [];
  
  const completedResults = candidate.results.filter(r => r.status === "completed");
  
  completedResults.forEach((result) => {
    const assessmentType = result.assessmentType;
    
    // Skip non-skill based assessments
    if (assessmentType === "prompt_architecture" || assessmentType === "aiq") {
      return;
    }
    
    // Use transformToRadarData to get properly formatted skills
    const radarData = transformToRadarData(result.scores as unknown as Record<string, number>, assessmentType);
    
    radarData.forEach((skillData) => {
      allSkills.push({
        name: skillData.skill,
        score: skillData.score,
        assessment: assessmentType === "fit" ? "FIT Assessment" : "AI Readiness"
      });
    });
  });
  
  return allSkills;
}

// Mock platform averages - includes all required fields for PlatformAverages type
const platformAverages = {
  fit: {
    [FIT_SKILL_NAMES.HIGH_AGENCY]: 72,
    [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 75,
    [FIT_SKILL_NAMES.RESILIENCE]: 70,
    [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 73,
    [FIT_SKILL_NAMES.GROWTH_MINDSET]: 71,
    [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 74
  },
  aiReadiness: {
    [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 68,
    [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 65,
    [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 67,
    [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 70,
    [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 69,
    [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 71,
    [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 66,
    [AI_READINESS_SKILL_NAMES.CREATIVITY]: 68,
    [AI_READINESS_SKILL_NAMES.COLLABORATION]: 69
  },
  promptArchitecture: 65,
  aiq: 70,
  totalCandidates: 150,
  avgScoreAcrossCandidates: 72,
  skillAverages: {
    fit: 72,
    aiReadiness: 68,
    promptArchitecture: 65,
    aiq: 70
  }
};

// Mock prompt architecture evaluations
const promptArchitectureData = [
  { level: 1, clarity: 22, structure: 18, contextRelevance: 17, creativity: 18, iterativeImprovement: 13 },
  { level: 2, clarity: 21, structure: 17, contextRelevance: 18, creativity: 17, iterativeImprovement: 12 },
  { level: 3, clarity: 20, structure: 16, contextRelevance: 17, creativity: 16, iterativeImprovement: 12 },
  { level: 4, clarity: 19, structure: 16, contextRelevance: 16, creativity: 15, iterativeImprovement: 11 },
  { level: 5, clarity: 18, structure: 15, contextRelevance: 16, creativity: 15, iterativeImprovement: 10 },
  { level: 6, clarity: 17, structure: 15, contextRelevance: 15, creativity: 14, iterativeImprovement: 10 },
  { level: 7, clarity: 16, structure: 14, contextRelevance: 15, creativity: 14, iterativeImprovement: 9 }
];

// Mock role comparison
const roleComparison = {
  role: {
    name: "Software Engineer",
    description: "Build and maintain software applications using modern technologies"
  },
  overallFit: 85,
  skillAlignments: [
    { skill: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, score: 78, targetScore: 85, alignment: 92 },
    { skill: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, score: 90, targetScore: 80, alignment: 100 },
    { skill: AI_READINESS_SKILL_NAMES.ADAPTABILITY, score: 88, targetScore: 75, alignment: 100 }
  ],
  strengths: ["Exceptional problem-solving", "Strong AI integration skills"],
  developmentAreas: ["Could improve technical depth"],
  recommendations: ["Excellent fit for full-stack development roles"]
};

export default function GenerateSamplePDFs() {
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");

  const generateSarahChenPDF = async () => {
    setGenerating(true);
    setStatus("Generating individual-sample.pdf...");
    
    try {
      const skills = getSkills(sarahChenData);
      
      // Generate PDF using exact same function as admin dashboard
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Import and call the same helper functions from enhancedPdfExport
      // This ensures we use the EXACT same export logic
      await exportEnhancedCandidatePDF(
        sarahChenData as any,
        skills,
        platformAverages,
        undefined, // no radar chart images
        undefined, // no role comparison for individual report
        promptArchitectureData as any
      );
      
      setStatus("✅ individual-sample.pdf generated! Save to client/public/sample-reports/");
    } catch (error) {
      console.error("Error generating PDF:", error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setGenerating(false);
    }
  };

  const generateRoleFitPDF = async () => {
    setGenerating(true);
    setStatus("Generating rolefit-sample.pdf...");
    
    try {
      const skills = getSkills(sarahChenData);
      
      // Generate PDF using exact same function as admin dashboard  
      await exportEnhancedCandidatePDF(
        sarahChenData as any,
        skills,
        platformAverages,
        undefined,
        roleComparison as any,
        promptArchitectureData as any
      );
      
      setStatus("✅ rolefit-sample.pdf generated! Save to client/public/sample-reports/");
    } catch (error) {
      console.error("Error generating PDF:", error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <Card className="max-w-2xl w-full p-8">
        <h1 className="text-3xl font-bold mb-2">Sample PDF Generator</h1>
        <p className="text-muted-foreground mb-6">
          Generate sample PDFs using the exact same export function as the admin dashboard
        </p>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={generateSarahChenPDF}
              disabled={generating}
              className="flex-1"
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Generate Individual Report
            </Button>
            
            <Button
              onClick={generateRoleFitPDF}
              disabled={generating}
              variant="outline"
              className="flex-1"
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Generate Role Fit Report
            </Button>
          </div>
          
          {status && (
            <div className={`p-4 rounded-md ${
              status.startsWith("✅") 
                ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                : status.startsWith("❌")
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            }`}>
              {status}
            </div>
          )}
          
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Click a button to generate a PDF (uses EXACT same function as admin dashboard)</li>
              <li>The PDF will download to your browser's download folder</li>
              <li>Rename the downloaded file:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>Individual Report → <code className="bg-muted px-1 rounded">individual-sample.pdf</code></li>
                  <li>Role Fit Report → <code className="bg-muted px-1 rounded">rolefit-sample.pdf</code></li>
                </ul>
              </li>
              <li>Move renamed PDFs to <code className="bg-muted px-1 rounded">client/public/sample-reports/</code></li>
              <li>Test by visiting home page "View Sample Reports" section</li>
            </ol>
            <p className="text-sm text-muted-foreground mt-3">
              See <code className="bg-muted px-1 rounded">SAMPLE_PDFS_README.md</code> for full documentation
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
