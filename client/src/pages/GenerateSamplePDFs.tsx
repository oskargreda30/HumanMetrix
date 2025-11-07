import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { exportEnhancedCandidatePDF } from "@/lib/enhancedPdfExport";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

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
        "High Agency": 88,
        "Intellectual Curiosity": 92,
        "Resilience": 85,
        "Empathy & Ethics": 90,
        "Growth Mindset": 87,
        "Interpersonal Agility": 91
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
        "AI Literacy/Prompting": 85,
        "Technical Fluency": 78,
        "Domain Fluency": 82,
        "Critical Thinking": 90,
        "Adaptive Learning": 88,
        "Responsible AI": 92,
        "Domain Expertise": 80,
        "Creative Innovation": 86,
        "Cross-functional Collab": 84
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

// Transform to skills array (matching CandidatesTab logic)
function getSkills(candidate: typeof sarahChenData) {
  const allSkills: Array<{name: string, score: number, assessment: string}> = [];
  
  const fitResult = candidate.results.find(r => r.assessmentType === "fit");
  if (fitResult?.scores) {
    Object.entries(fitResult.scores).forEach(([skill, score]) => {
      allSkills.push({ name: skill, score: score as number, assessment: "FIT Assessment" });
    });
  }
  
  const aiResult = candidate.results.find(r => r.assessmentType === "ai_readiness");
  if (aiResult?.scores) {
    Object.entries(aiResult.scores).forEach(([skill, score]) => {
      allSkills.push({ name: skill, score: score as number, assessment: "AI Readiness" });
    });
  }
  
  const promptResult = candidate.results.find(r => r.assessmentType === "prompt_architecture");
  if (promptResult?.scores?.overall) {
    allSkills.push({ 
      name: "Prompt Architecture", 
      score: promptResult.scores.overall as number, 
      assessment: "Prompt Architecture" 
    });
  }
  
  const aiqResult = candidate.results.find(r => r.assessmentType === "aiq");
  if (aiqResult?.scores?.aiq) {
    allSkills.push({ 
      name: "AIQ", 
      score: aiqResult.scores.aiq as number, 
      assessment: "AIQ" 
    });
  }
  
  return allSkills;
}

// Mock platform averages
const platformAverages = {
  fit: {
    "High Agency": 72,
    "Intellectual Curiosity": 75,
    "Resilience": 70,
    "Empathy & Ethics": 73,
    "Growth Mindset": 71,
    "Interpersonal Agility": 74
  },
  aiReadiness: {
    "AI Literacy/Prompting": 68,
    "Technical Fluency": 65,
    "Domain Fluency": 67,
    "Critical Thinking": 70,
    "Adaptive Learning": 69,
    "Responsible AI": 71,
    "Domain Expertise": 66,
    "Creative Innovation": 68,
    "Cross-functional Collab": 69
  },
  promptArchitecture: 65,
  aiq: 70
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
    { skill: "Technical Fluency", score: 78, targetScore: 85, alignment: 92 },
    { skill: "Critical Thinking", score: 90, targetScore: 80, alignment: 100 },
    { skill: "Adaptive Learning", score: 88, targetScore: 75, alignment: 100 }
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
    setStatus("Generating Sarah Chen individual report...");
    
    try {
      const skills = getSkills(sarahChenData);
      
      await exportEnhancedCandidatePDF(
        sarahChenData as any,
        skills,
        platformAverages,
        undefined, // no radar chart images for now
        undefined, // no role comparison for individual report
        promptArchitectureData as any
      );
      
      setStatus("✅ Sarah Chen report generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setGenerating(false);
    }
  };

  const generateRoleFitPDF = async () => {
    setGenerating(true);
    setStatus("Generating Sarah Chen role fit report...");
    
    try {
      const skills = getSkills(sarahChenData);
      
      await exportEnhancedCandidatePDF(
        sarahChenData as any,
        skills,
        platformAverages,
        undefined,
        roleComparison as any,
        promptArchitectureData as any
      );
      
      setStatus("✅ Role fit report generated successfully!");
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
              <li>Click a button to generate a PDF using the same export function as admin dashboard</li>
              <li>The PDF will download automatically to your downloads folder</li>
              <li>Copy the generated PDFs to <code className="bg-muted px-1 rounded">client/public/sample-reports/</code></li>
              <li>Rename them appropriately (individual-sample.pdf, rolefit-sample.pdf)</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}
