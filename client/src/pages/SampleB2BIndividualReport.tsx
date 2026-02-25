import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SharedIndividualReport } from "@/components/shared/SharedIndividualReport";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_CANDIDATE_REPORT = {
  fitAssessments: [
    {
      scores: {
        "High Agency": 85,
        "Intellectual Curiosity": 88,
        "Resilience": 72,
        "Empathy & Ethics": 84,
        "Growth Mindset": 86,
        "Interpersonal Agility": 79,
      },
      totalScore: 82,
      completedAt: "2026-01-15T10:30:00Z",
    },
  ],
  aiReadinessAssessments: [
    {
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
      totalScore: 82,
      completedAt: "2026-01-16T14:15:00Z",
    },
  ],
  promptArchitectureAssessments: [
    {
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
    },
  ],
  aiqAssessments: [
    {
      totalScore: 78,
      scores: {
        "Ethical Reasoning": 82,
        "Bias Awareness": 76,
        "Transparency": 80,
        "Accountability": 74,
        "Fairness": 78,
      },
      completedAt: "2026-01-18T11:20:00Z",
    },
  ],
  aiInsights: `**ROLE SUITABILITY**
This candidate demonstrates strong suitability for mid-to-senior level roles requiring a blend of technical AI competence and interpersonal effectiveness. The combination of high Intellectual Curiosity (88) and Growth Mindset (86) indicates strong capacity for continuous learning in rapidly evolving AI environments. The candidate is well-positioned for roles such as AI Product Manager, Technical Program Manager, or Innovation Lead where both strategic thinking and technical understanding are essential.

**OPTIMAL ENVIRONMENT**
The candidate thrives in collaborative, innovation-driven environments that value both analytical rigour and creative problem-solving. The high Responsible AI & Ethical Awareness score (90) suggests alignment with organisations that prioritise ethical AI development. A team culture that encourages experimentation while maintaining structured processes would maximise this candidate's contributions. Cross-functional settings where diverse perspectives are valued will complement their Empathy & Ethics strengths.

**KEY STRENGTHS**
Responsible AI & Ethical Awareness stands out as an exceptional strength at 90, positioning the candidate as a potential champion for ethical AI practices within the organisation. Intellectual Curiosity at 88 and Adaptability & Continuous Learning at 88 together create a powerful learning and adaptation profile. The combination of Growth Mindset (86), High Agency (85), and Critical Thinking (85) demonstrates the self-driven, analytical approach needed for complex AI-related challenges. These strengths collectively suggest a candidate who can navigate ambiguity while maintaining ethical standards.

**DEVELOPMENT FOCUS**
Resilience at 72 represents the most significant development area, particularly relevant for high-pressure AI implementation projects where setbacks are common. Technical Fundamentals at 75 and Creativity & Innovation at 76 could benefit from targeted development to round out the technical skill profile. Interpersonal Agility at 79, while competent, has room for growth especially in cross-cultural team settings common in global AI projects. Structured mentorship and challenging project assignments would accelerate development across these areas.

**OVERALL ASSESSMENT AND RECOMMENDATION**
This candidate presents a strong overall profile with an impressive balance of technical AI capability and behavioural competencies. The ethical awareness combined with strong learning orientation makes this individual particularly valuable as AI governance and responsible AI practices become increasingly critical. The recommendation is to proceed to advanced interviews with a focus on exploring real-world scenarios involving the identified development areas. With targeted support in resilience and technical depth, this candidate has strong potential for rapid growth into senior AI leadership roles.`,
  generatedAt: "2026-01-18T12:00:00Z",
  cached: false,
};

export default function SampleB2BIndividualReport() {
  return (
    <div className="min-h-screen bg-white dark:bg-background">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 pt-16 md:pt-8">
        <div className="mb-6">
          <Link href="/#sample-reports">
            <Button variant="ghost" size="sm" data-testid="button-back-to-samples-b2b-individual">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sample Reports
            </Button>
          </Link>
        </div>
        <SharedIndividualReport
          config={{
            candidatesEndpoint: '',
            reportEndpoint: '',
            profileInsightsEndpoint: '',
            contextType: 'partner',
          }}
          staticData={{
            candidateReport: MOCK_CANDIDATE_REPORT,
            candidateName: "Sarah Chen",
            candidateEmail: "sarah.chen@example.com",
          }}
        />
      </div>
      <Footer />
    </div>
  );
}
