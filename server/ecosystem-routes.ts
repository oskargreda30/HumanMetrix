import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";
import OpenAI from "openai";
import Stripe from "stripe";
import { z } from "zod";
import multer from "multer";
import * as pdfParse from "pdf-parse";
import type { 
  EcosystemMissionAnalysis,
  EcosystemTeamAnalysis,
  EcosystemCapabilityPriority,
  EcosystemGapAnalysis,
  EcosystemHireRecommendation,
  EcosystemRiskAlert,
} from "@shared/schema";
import { 
  convertToStripeCurrencyAmount, 
  getStripeCurrencyCode, 
  COUNTRY_CURRENCY_MAP
} from "@shared/currencies";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia" as any,
});

// Helper function to get base URL for redirects
function getBaseUrl(req: Request): string {
  // Use PRODUCTION_URL if set (for deployed environment)
  if (process.env.PRODUCTION_URL) {
    return process.env.PRODUCTION_URL.replace(/\/$/, '');
  }
  // Fall back to request-based URL
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}`;
}

// Configure multer for PDF uploads (memory storage, max 10MB)
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
});

// Helper function to check if a user has access to an ecosystem project
// Returns true if user owns the project or is a member of the partner organization
async function hasProjectAccess(project: { userId: string; partnerId: string | null }, userEmail: string, userId: string): Promise<boolean> {
  // Check direct ownership
  if (project.userId === userId) {
    return true;
  }
  
  // Check partner membership
  if (project.partnerId) {
    const partnerMember = await storage.getPartnerTeamMemberByEmail(project.partnerId, userEmail);
    return !!partnerMember;
  }
  
  return false;
}

// FIT capability definitions for reference
const FIT_CAPABILITIES = {
  HA: { name: "High Agency", description: "Taking initiative and ownership, driving outcomes proactively" },
  IC: { name: "Intellectual Curiosity", description: "Desire to learn, explore new ideas, and understand complex problems" },
  RA: { name: "Resilience & Adaptability", description: "Bouncing back from setbacks and adapting to change" },
  EE: { name: "Empathy & Ethics", description: "Understanding others and making principled decisions" },
  GM: { name: "Growth Mindset", description: "Believing abilities can be developed and embracing challenges" },
  IA: { name: "Interpersonal Agility", description: "Building relationships and navigating social dynamics effectively" },
};

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().optional(),
  partnerId: z.string().optional(),
});

const missionAnalysisSchema = z.object({
  missionStatement: z.string().min(1, "Mission statement is required"),
  companyEthos: z.string().optional(),
});

const organizationContextSchema = z.object({
  // Basic context - all optional now
  industry: z.string().optional(),
  teamFunction: z.string().optional(),
  teamSize: z.number().min(1).optional(),
  workMode: z.enum(["remote", "hybrid", "onsite"]).optional(),
  teamStage: z.enum(["new", "growing", "mature", "restructuring"]).optional(),
  hiringPlans: z.enum(["0", "1-3", "4-10", "10+"]).optional(),
  currentChallenges: z.string().optional(),
  
  // Deep dive - Team Dynamics & Pain Points
  delayedTasks: z.string().optional(),
  conflictTopics: z.string().optional(),
  avoidedWork: z.string().optional(),
  
  // Deep dive - Workload & Capacity
  overloadedMember: z.string().optional(),
  wishedSkills: z.string().optional(),
  
  // Deep dive - Culture & Collaboration
  idealInteractionStyle: z.string().optional(),
  personalityGap: z.string().optional(),
  
  // Deep dive - Strategic Context
  upcomingInitiative: z.string().optional(),
  cloneableSkills: z.string().optional(),
  transformativeFix: z.string().optional(),
});

const addTeamMemberSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  fitScores: z.object({
    HA: z.number().min(0).max(100).optional(),
    IC: z.number().min(0).max(100).optional(),
    RA: z.number().min(0).max(100).optional(),
    EE: z.number().min(0).max(100).optional(),
    GM: z.number().min(0).max(100).optional(),
    IA: z.number().min(0).max(100).optional(),
  }).optional(),
  sourceType: z.enum(["pdf_upload", "linked_result", "invitation", "manual"]),
  sourceId: z.string().optional(),
});

// Strategic analysis response schema for validation
const strategicAnalysisResponseSchema = z.object({
  executiveSummary: z.string(),
  strategicInsights: z.array(z.object({
    category: z.enum(["strength", "gap", "risk", "opportunity"]),
    title: z.string(),
    analysis: z.string(),
    impact: z.enum(["critical", "high", "medium", "low"]),
    actionRequired: z.boolean(),
  })),
  idealHireProfiles: z.array(z.object({
    roleTitle: z.string(),
    priority: z.number(),
    rationale: z.string(),
    fitTargets: z.record(z.object({
      min: z.number(),
      ideal: z.number(),
    })),
    keyBehaviors: z.array(z.string()),
    redFlags: z.array(z.string()),
  })),
  capabilityGapMatrix: z.array(z.object({
    capability: z.string(),
    code: z.string(),
    missionPriority: z.enum(["critical", "high", "medium", "low"]),
    teamStrength: z.enum(["strong", "adequate", "weak", "critical"]),
    gapAnalysis: z.string(),
    currentScore: z.number().optional(),
    targetScore: z.number().optional(),
  })),
});

// Contextual gap analysis response schema for validation
const contextualGapAnalysisResponseSchema = z.object({
  gapAnalysis: z.array(z.object({
    code: z.string(),
    capability: z.string().optional(),
    requiredPriority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
    gapSeverity: z.enum(["critical", "warning", "healthy"]).default("healthy"),
    currentAverage: z.number().optional(),
    teamCoverage: z.number().optional(),
    contextualReasoning: z.string().optional(),
    reasoning: z.string().optional(),
    businessImpact: z.string().optional(),
  })),
  contextualInsights: z.array(z.string()).default([]),
  idealCandidateProfile: z.object({
    summary: z.string().default(""),
    fitTargets: z.record(z.object({
      min: z.number(),
      ideal: z.number(),
      reasoning: z.string().optional(),
    })).default({}),
    keyTraits: z.array(z.string()).default([]),
    interviewFocusAreas: z.array(z.string()).default([]),
  }).default({
    summary: "",
    fitTargets: {},
    keyTraits: [],
    interviewFocusAreas: [],
  }),
});

// Helper to analyze mission statement with OpenAI
async function analyzeMissionWithAI(
  missionStatement: string,
  companyEthos?: string
): Promise<EcosystemMissionAnalysis> {
  const systemPrompt = `You are an organizational psychologist and talent strategy expert. Your task is to analyze a company's mission statement and ethos to determine which behavioral capabilities (from the FIT framework) are most critical for their success.

The FIT framework capabilities are:
- HA (High Agency): Taking initiative, ownership, driving outcomes proactively
- IC (Intellectual Curiosity): Desire to learn, explore ideas, understand complexity
- RA (Resilience & Adaptability): Bouncing back from setbacks, adapting to change
- EE (Empathy & Ethics): Understanding others, making principled decisions
- GM (Growth Mindset): Believing abilities can develop, embracing challenges
- IA (Interpersonal Agility): Building relationships, navigating social dynamics

Analyze the mission and return a JSON response with:
1. A brief summary of the organization's focus and culture
2. Each capability ranked by priority (critical, high, medium, low) with reasoning
3. Key themes identified from the mission/ethos

Be specific and tie your reasoning directly to the mission content.`;

  const userPrompt = `Analyze this organization:

MISSION STATEMENT:
${missionStatement}

${companyEthos ? `COMPANY ETHOS/VALUES:\n${companyEthos}` : ""}

Return your analysis as JSON with this exact structure:
{
  "summary": "Brief 2-3 sentence summary of the organization's focus",
  "capabilityPriorities": [
    {
      "code": "HA",
      "name": "High Agency",
      "priority": "critical|high|medium|low",
      "reasoning": "Specific reasoning tied to mission content"
    },
    // ... repeat for all 6 capabilities
  ],
  "keyThemes": ["theme1", "theme2", "theme3"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const parsed = JSON.parse(content);
  
  return {
    summary: parsed.summary,
    capabilityPriorities: parsed.capabilityPriorities,
    keyThemes: parsed.keyThemes,
    analyzedAt: new Date().toISOString(),
  };
}

// AI-powered strategic advisor analysis
async function generateStrategicAdvisorAnalysis(
  project: any,
  teamMembers: any[],
  missionAnalysis: EcosystemMissionAnalysis | null,
  capabilityDistribution: Record<string, { average: number; min: number; max: number; coverage: number }>,
  gapAnalysis: EcosystemGapAnalysis[],
  riskAlerts: EcosystemRiskAlert[]
): Promise<{
  executiveSummary: string;
  strategicInsights: any[];
  idealHireProfiles: any[];
  capabilityGapMatrix: any[];
}> {
  const teamContext = {
    industry: project.industry || "Unknown",
    teamFunction: project.teamFunction || "Unknown",
    teamSize: project.teamSize || teamMembers.length,
    teamStage: project.teamStage || "Unknown",
    hiringPlans: project.hiringPlans || "Unknown",
    currentChallenges: project.currentChallenges || "",
    workMode: project.workMode || "Unknown",
  };
  
  // Deep dive context for richer analysis
  const deepDiveContext = {
    // Team Dynamics & Pain Points
    delayedTasks: project.delayedTasks || "",
    conflictTopics: project.conflictTopics || "",
    avoidedWork: project.avoidedWork || "",
    // Workload & Capacity
    overloadedMember: project.overloadedMember || "",
    wishedSkills: project.wishedSkills || "",
    // Culture & Collaboration
    idealInteractionStyle: project.idealInteractionStyle || "",
    personalityGap: project.personalityGap || "",
    // Strategic Context
    upcomingInitiative: project.upcomingInitiative || "",
    cloneableSkills: project.cloneableSkills || "",
    transformativeFix: project.transformativeFix || "",
  };
  
  // Check if any deep dive data is provided
  const hasDeepDiveData = Object.values(deepDiveContext).some(v => v.length > 0);

  const systemPrompt = `You are an elite hiring consultant and organizational psychologist with 20+ years of experience advising Fortune 500 companies on talent strategy. Your role is to provide deep, strategic analysis that goes beyond surface-level metrics.

You are analyzing a ${teamContext.industry} ${teamContext.teamFunction} team.

The FIT framework capabilities are:
- HA (High Agency): Taking initiative, ownership, driving outcomes proactively
- IC (Intellectual Curiosity): Desire to learn, explore ideas, understand complexity  
- RA (Resilience & Adaptability): Bouncing back from setbacks, adapting to change
- EE (Empathy & Ethics): Understanding others, making principled decisions
- GM (Growth Mindset): Believing abilities can develop, embracing challenges
- IA (Interpersonal Agility): Building relationships, navigating social dynamics

Your analysis should:
1. Be written in a consultative, advisory tone - like a trusted partner giving strategic advice
2. Connect insights to business outcomes and team performance
3. Be specific and actionable, not generic
4. Consider the team's stage, industry, and specific challenges
5. Provide reasoning behind every recommendation`;

  const teamMemberSummary = teamMembers.map(m => ({
    name: m.name || "Anonymous",
    role: m.role || "Unknown role",
    scores: m.fitScores || {},
  }));

  const userPrompt = `Analyze this team and provide strategic hiring recommendations:

TEAM CONTEXT:
- Industry: ${teamContext.industry}
- Team Function: ${teamContext.teamFunction}
- Current Team Size: ${teamContext.teamSize}
- Team Stage: ${teamContext.teamStage}
- Work Mode: ${teamContext.workMode}
- Hiring Plans: ${teamContext.hiringPlans} hires planned
- Current Challenges: ${teamContext.currentChallenges || "Not specified"}

${hasDeepDiveData ? `DEEP DIVE INSIGHTS (Important - use these to inform your recommendations):
${deepDiveContext.delayedTasks ? `- Tasks frequently delayed/deprioritized: ${deepDiveContext.delayedTasks}` : ""}
${deepDiveContext.conflictTopics ? `- Common conflict topics: ${deepDiveContext.conflictTopics}` : ""}
${deepDiveContext.avoidedWork ? `- Work the team avoids/struggles with: ${deepDiveContext.avoidedWork}` : ""}
${deepDiveContext.overloadedMember ? `- Overloaded team members: ${deepDiveContext.overloadedMember}` : ""}
${deepDiveContext.wishedSkills ? `- Skills wished for in-house: ${deepDiveContext.wishedSkills}` : ""}
${deepDiveContext.idealInteractionStyle ? `- Desired interaction style: ${deepDiveContext.idealInteractionStyle}` : ""}
${deepDiveContext.personalityGap ? `- Biggest personality gap: ${deepDiveContext.personalityGap}` : ""}
${deepDiveContext.upcomingInitiative ? `- Upcoming initiative and needed capability: ${deepDiveContext.upcomingInitiative}` : ""}
${deepDiveContext.cloneableSkills ? `- Skills they'd clone if they could: ${deepDiveContext.cloneableSkills}` : ""}
${deepDiveContext.transformativeFix ? `- Transformative fix needed: ${deepDiveContext.transformativeFix}` : ""}

IMPORTANT: The deep dive insights above reveal the team's real pain points and needs. Use them to:
1. Identify which FIT capabilities would address each specific challenge
2. Weight your recommendations heavily based on these stated needs
3. Reference specific insights in your rationale for hire recommendations
` : ""}
MISSION ANALYSIS:
${missionAnalysis ? `
Summary: ${missionAnalysis.summary}
Key Capability Priorities: ${missionAnalysis.capabilityPriorities.map(p => `${p.name} (${p.priority})`).join(", ")}
Key Themes: ${missionAnalysis.keyThemes.join(", ")}
` : "No mission analysis available"}

TEAM MEMBER PROFILES:
${JSON.stringify(teamMemberSummary, null, 2)}

CAPABILITY DISTRIBUTION:
${Object.entries(capabilityDistribution).map(([code, d]) => 
  `${FIT_CAPABILITIES[code as keyof typeof FIT_CAPABILITIES]?.name || code}: Avg ${d.average}%, Coverage ${d.coverage}%, Range ${d.min}-${d.max}%`
).join("\n")}

IDENTIFIED GAPS:
${gapAnalysis.filter(g => g.gapSeverity !== "healthy").map(g => 
  `${g.capability}: ${g.gapSeverity.toUpperCase()} gap (Mission Priority: ${g.requiredPriority})`
).join("\n") || "No significant gaps identified"}

RISK ALERTS:
${riskAlerts.map(r => `${r.type}: ${r.title} - ${r.description}`).join("\n") || "No critical risks identified"}

Provide your analysis as JSON with this exact structure:
{
  "executiveSummary": "A compelling 3-4 paragraph strategic summary written in first person consultant voice. Start with the team's key strengths, then transition to the most critical gaps and risks, and end with the strategic path forward. Be specific and tie insights to business outcomes.",
  
  "strategicInsights": [
    {
      "category": "strength|gap|risk|opportunity",
      "title": "Concise insight title",
      "analysis": "Deep 2-3 sentence analysis explaining the insight, its business impact, and why it matters for this specific team",
      "impact": "critical|high|medium|low",
      "actionRequired": true/false
    }
  ],
  
  "idealHireProfiles": [
    {
      "roleTitle": "Specific role title (e.g., 'Senior Full-Stack Engineer with Product Mindset')",
      "priority": 1,
      "rationale": "2-3 sentences explaining why this specific hire is critical for the team, referencing the gaps and business context",
      "fitTargets": {
        "HA": { "min": 65, "ideal": 80 },
        "IC": { "min": 70, "ideal": 85 },
        "RA": { "min": 60, "ideal": 75 },
        "EE": { "min": 55, "ideal": 70 },
        "GM": { "min": 70, "ideal": 85 },
        "IA": { "min": 60, "ideal": 75 }
      },
      "keyBehaviors": ["Behavior to look for in interviews"],
      "redFlags": ["Warning signs to watch for"]
    }
  ],
  
  "capabilityGapMatrix": [
    {
      "capability": "Full capability name",
      "code": "HA|IC|RA|EE|GM|IA",
      "missionPriority": "critical|high|medium|low",
      "teamStrength": "strong|adequate|weak|critical",
      "gapAnalysis": "1-2 sentence strategic insight about this specific gap and its implications"
    }
  ]
}

Generate 3-5 strategic insights, 1-3 ideal hire profiles based on hiring plans, and include all 6 capabilities in the gap matrix.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse and validate with Zod for type safety
    const rawParsed = JSON.parse(content);
    const validated = strategicAnalysisResponseSchema.safeParse(rawParsed);
    
    if (validated.success) {
      return validated.data;
    }
    
    // Log validation errors but try to use raw data with fallbacks
    console.warn("[Ecosystem] AI response validation warning:", validated.error.issues);
    
    // Return raw data with fallbacks for missing fields
    return {
      executiveSummary: rawParsed.executiveSummary || "",
      strategicInsights: Array.isArray(rawParsed.strategicInsights) ? rawParsed.strategicInsights : [],
      idealHireProfiles: Array.isArray(rawParsed.idealHireProfiles) ? rawParsed.idealHireProfiles : [],
      capabilityGapMatrix: Array.isArray(rawParsed.capabilityGapMatrix) ? rawParsed.capabilityGapMatrix : [],
    };
  } catch (error) {
    console.error("[Ecosystem] AI strategic analysis error:", error);
    // Return fallback basic analysis
    return {
      executiveSummary: `Based on my analysis of your ${teamContext.teamFunction} team, I've identified several key patterns that will inform your hiring strategy. Your team shows varying levels of capability coverage across the FIT dimensions, with some areas requiring immediate attention. Given your ${teamContext.teamStage} stage and plans for ${teamContext.hiringPlans} hires, I recommend prioritizing candidates who can address your most critical capability gaps while complementing your existing team strengths.`,
      strategicInsights: gapAnalysis.filter(g => g.gapSeverity !== "healthy").map((g, i) => ({
        category: g.gapSeverity === "critical" ? "gap" : "risk",
        title: `${g.capability} Gap Requires Attention`,
        analysis: g.reasoning,
        impact: g.gapSeverity === "critical" ? "critical" : "high",
        actionRequired: true,
      })),
      idealHireProfiles: [],
      capabilityGapMatrix: gapAnalysis.map(g => {
        // Current = actual team average from FIT scores
        const currentScore = Math.round(g.currentAverage || 50);
        // Target = required score based on mission priority
        const targetScore = g.requiredPriority === "critical" ? 85 : 
                           g.requiredPriority === "high" ? 75 : 
                           g.requiredPriority === "medium" ? 65 : 55;
        return {
          capability: g.capability,
          code: g.code,
          missionPriority: g.requiredPriority,
          teamStrength: g.gapSeverity === "healthy" ? "strong" : g.gapSeverity === "warning" ? "adequate" : "weak",
          gapAnalysis: g.reasoning,
          currentScore,
          targetScore,
        };
      }),
    };
  }
}

// AI-powered contextual gap analysis - uses mission, ethos, and deep dive context for nuanced insights
async function generateAIContextualGapAnalysis(
  project: any,
  teamMembers: any[],
  missionAnalysis: EcosystemMissionAnalysis | null,
  capabilityDistribution: Record<string, { average: number; min: number; max: number; coverage: number }>
): Promise<{
  gapAnalysis: EcosystemGapAnalysis[];
  contextualInsights: string[];
  idealCandidateProfile: {
    summary: string;
    fitTargets: Record<string, { min: number; ideal: number; reasoning: string }>;
    keyTraits: string[];
    interviewFocusAreas: string[];
  };
}> {
  const teamContext = {
    industry: project.industry || "Unknown",
    teamFunction: project.teamFunction || "Unknown",
    teamSize: project.teamSize || teamMembers.length,
    teamStage: project.teamStage || "Unknown",
    hiringPlans: project.hiringPlans || "Unknown",
    currentChallenges: project.currentChallenges || "",
    workMode: project.workMode || "Unknown",
  };

  const deepDiveContext = {
    delayedTasks: project.delayedTasks || "",
    conflictTopics: project.conflictTopics || "",
    avoidedWork: project.avoidedWork || "",
    overloadedMember: project.overloadedMember || "",
    wishedSkills: project.wishedSkills || "",
    idealInteractionStyle: project.idealInteractionStyle || "",
    personalityGap: project.personalityGap || "",
    upcomingInitiative: project.upcomingInitiative || "",
    cloneableSkills: project.cloneableSkills || "",
    transformativeFix: project.transformativeFix || "",
  };

  const hasDeepDiveData = Object.values(deepDiveContext).some(v => v.length > 0);

  const teamMemberProfiles = teamMembers.map(m => ({
    name: m.name || "Anonymous",
    role: m.role || "Unknown",
    scores: m.fitScores || {},
  }));

  const systemPrompt = `You are an expert organizational psychologist analyzing team capability gaps using the FIT framework. Your analysis must be deeply contextual - not just comparing numbers to thresholds, but understanding HOW the team's specific context, challenges, and goals shape what capabilities matter most.

FIT Framework Capabilities:
- HA (High Agency): Initiative, ownership, driving outcomes proactively
- IC (Intellectual Curiosity): Learning drive, exploring ideas, understanding complexity
- RA (Resilience & Adaptability): Recovering from setbacks, adapting to change
- EE (Empathy & Ethics): Understanding others, principled decision-making
- GM (Growth Mindset): Believing abilities develop, embracing challenges
- IA (Interpersonal Agility): Building relationships, navigating social dynamics

Your task: Analyze the gap between what this team HAS and what they NEED based on their specific context. Consider:
1. Mission requirements - what capabilities are essential for their stated goals?
2. Deep dive pain points - what do their challenges reveal about capability needs?
3. Team dynamics - how do current scores interact with stated problems?
4. Strategic timing - given their stage and hiring plans, what's most urgent?

IMPORTANT: Generate realistic, varied score targets. Do NOT use round numbers like 70, 75, 80. Use specific numbers like 73, 82, 67 based on your contextual analysis.`;

  const userPrompt = `Analyze capability gaps for this team:

TEAM CONTEXT:
- Industry: ${teamContext.industry}
- Function: ${teamContext.teamFunction}
- Size: ${teamContext.teamSize}
- Stage: ${teamContext.teamStage}
- Work Mode: ${teamContext.workMode}
- Hiring Plans: ${teamContext.hiringPlans}
- Current Challenges: ${teamContext.currentChallenges || "Not specified"}

${missionAnalysis ? `MISSION ANALYSIS:
- Summary: ${missionAnalysis.summary}
- Key Themes: ${missionAnalysis.keyThemes?.join(", ") || "N/A"}
- Capability Priorities: ${missionAnalysis.capabilityPriorities?.map(p => `${p.code}: ${p.priority}`).join(", ") || "N/A"}
` : "No mission analysis available."}

${hasDeepDiveData ? `DEEP DIVE INSIGHTS (Critical for understanding real gaps):
${deepDiveContext.delayedTasks ? `- Tasks frequently delayed: ${deepDiveContext.delayedTasks}` : ""}
${deepDiveContext.conflictTopics ? `- Conflict topics: ${deepDiveContext.conflictTopics}` : ""}
${deepDiveContext.avoidedWork ? `- Work avoided/struggled with: ${deepDiveContext.avoidedWork}` : ""}
${deepDiveContext.overloadedMember ? `- Overloaded members: ${deepDiveContext.overloadedMember}` : ""}
${deepDiveContext.wishedSkills ? `- Skills wished for in-house: ${deepDiveContext.wishedSkills}` : ""}
${deepDiveContext.idealInteractionStyle ? `- Desired interaction style: ${deepDiveContext.idealInteractionStyle}` : ""}
${deepDiveContext.personalityGap ? `- Personality gap noted: ${deepDiveContext.personalityGap}` : ""}
${deepDiveContext.upcomingInitiative ? `- Upcoming initiative needing capability: ${deepDiveContext.upcomingInitiative}` : ""}
${deepDiveContext.cloneableSkills ? `- Skills they'd clone: ${deepDiveContext.cloneableSkills}` : ""}
${deepDiveContext.transformativeFix ? `- Transformative fix needed: ${deepDiveContext.transformativeFix}` : ""}
` : "No deep dive data provided."}

CURRENT TEAM SCORES:
${JSON.stringify(teamMemberProfiles, null, 2)}

CAPABILITY DISTRIBUTION (Current State):
${Object.entries(capabilityDistribution).map(([code, d]) => 
  `${code}: Avg ${d.average}%, Coverage ${d.coverage}% (70+), Range ${d.min}-${d.max}%`
).join("\n") || "No score data available"}

Return JSON with this structure:
{
  "gapAnalysis": [
    {
      "code": "HA|IC|RA|EE|GM|IA",
      "capability": "Full capability name",
      "requiredPriority": "critical|high|medium|low",
      "gapSeverity": "critical|warning|healthy",
      "currentAverage": 67.3,
      "teamCoverage": 45,
      "contextualReasoning": "2-3 sentences explaining WHY this is a gap given the specific context - reference deep dive insights, mission needs, or team challenges. Not just 'score is low' but 'the team's struggle with X directly relates to insufficient Y capability'",
      "businessImpact": "1 sentence on what this gap means for business outcomes"
    }
  ],
  "contextualInsights": [
    "Insight connecting multiple data points, e.g., 'The team's pattern of avoiding client-facing work correlates with lower Interpersonal Agility scores, suggesting a systematic gap rather than individual preference'"
  ],
  "idealCandidateProfile": {
    "summary": "2-3 paragraph description of the ideal next hire based on all context. Be specific about personality, work style, and what they bring to the team.",
    "fitTargets": {
      "HA": { "min": 73, "ideal": 86, "reasoning": "Why this specific range for this team" },
      "IC": { "min": 68, "ideal": 81, "reasoning": "..." },
      "RA": { "min": 71, "ideal": 84, "reasoning": "..." },
      "EE": { "min": 64, "ideal": 77, "reasoning": "..." },
      "GM": { "min": 69, "ideal": 83, "reasoning": "..." },
      "IA": { "min": 72, "ideal": 88, "reasoning": "..." }
    },
    "keyTraits": ["Specific trait 1", "Specific trait 2"],
    "interviewFocusAreas": ["Behavioral question topic 1", "Scenario to probe"]
  }
}

IMPORTANT: Use varied, specific numbers for scores (not multiples of 5). Base all analysis on the specific context provided.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const rawParsed = JSON.parse(content);
    
    // Validate with Zod for type safety and defaults
    const validated = contextualGapAnalysisResponseSchema.safeParse(rawParsed);
    
    if (!validated.success) {
      console.warn("[Ecosystem] AI contextual gap analysis validation warning:", validated.error.issues);
    }
    
    // Use validated data or fall back to raw with defaults
    const validatedData = validated.success ? validated.data : rawParsed;
    
    // Transform AI response to match our schema
    const gapAnalysis: EcosystemGapAnalysis[] = (validatedData.gapAnalysis || []).map((g: any) => ({
      capability: g.capability || FIT_CAPABILITIES[g.code as keyof typeof FIT_CAPABILITIES]?.name || g.code,
      code: g.code,
      currentAverage: g.currentAverage ?? capabilityDistribution[g.code]?.average ?? 0,
      teamCoverage: g.teamCoverage ?? capabilityDistribution[g.code]?.coverage ?? 0,
      requiredPriority: g.requiredPriority || "medium",
      gapSeverity: g.gapSeverity || "healthy",
      reasoning: g.contextualReasoning || g.reasoning || "",
      businessImpact: g.businessImpact || "",
    }));

    // Ensure idealCandidateProfile has all required fields with defaults
    const idealCandidateProfile = {
      summary: validatedData.idealCandidateProfile?.summary || "",
      fitTargets: validatedData.idealCandidateProfile?.fitTargets || {},
      keyTraits: validatedData.idealCandidateProfile?.keyTraits || [],
      interviewFocusAreas: validatedData.idealCandidateProfile?.interviewFocusAreas || [],
    };

    return {
      gapAnalysis,
      contextualInsights: validatedData.contextualInsights || [],
      idealCandidateProfile,
    };
  } catch (error) {
    console.error("[Ecosystem] AI contextual gap analysis error:", error);
    // Return fallback basic analysis
    const capabilityCodes = ["HA", "IC", "RA", "EE", "GM", "IA"] as const;
    const fallbackGapAnalysis: EcosystemGapAnalysis[] = capabilityCodes.map(code => {
      const dist = capabilityDistribution[code];
      const priority = missionAnalysis?.capabilityPriorities?.find(p => p.code === code)?.priority || "medium";
      let severity: "critical" | "warning" | "healthy" = "healthy";
      if (dist && dist.average < 55) severity = "critical";
      else if (dist && dist.average < 70) severity = "warning";
      
      return {
        capability: FIT_CAPABILITIES[code].name,
        code,
        currentAverage: dist?.average || 0,
        teamCoverage: dist?.coverage || 0,
        requiredPriority: priority,
        gapSeverity: severity,
        reasoning: `Team average: ${dist?.average || 0}%, Coverage: ${dist?.coverage || 0}%`,
      };
    });
    
    return {
      gapAnalysis: fallbackGapAnalysis,
      contextualInsights: [],
      idealCandidateProfile: {
        summary: "Unable to generate AI analysis. Please try again.",
        fitTargets: {},
        keyTraits: [],
        interviewFocusAreas: [],
      },
    };
  }
}

// Helper to generate comprehensive team analysis
async function generateTeamAnalysis(
  projectId: string,
  missionAnalysis: EcosystemMissionAnalysis | null,
  project: any
): Promise<EcosystemTeamAnalysis> {
  const teamMembers = await storage.getEcosystemTeamMembers(projectId);
  
  if (teamMembers.length === 0) {
    throw new Error("No team members found");
  }

  // Calculate capability distribution
  const capabilityDistribution: Record<string, { average: number; min: number; max: number; coverage: number }> = {};
  const capabilityCodes = ["HA", "IC", "RA", "EE", "GM", "IA"] as const;
  
  for (const code of capabilityCodes) {
    const scores = teamMembers
      .filter(m => m.fitScores && m.fitScores[code] !== undefined)
      .map(m => m.fitScores![code]!);
    
    if (scores.length > 0) {
      const average = scores.reduce((a, b) => a + b, 0) / scores.length;
      const coverage = (scores.filter(s => s >= 70).length / scores.length) * 100;
      
      capabilityDistribution[code] = {
        average: Math.round(average * 10) / 10,
        min: Math.min(...scores),
        max: Math.max(...scores),
        coverage: Math.round(coverage),
      };
    }
  }

  // AI-powered contextual gap analysis
  console.log("[Ecosystem] Generating AI contextual gap analysis...");
  const aiGapAnalysis = await generateAIContextualGapAnalysis(
    project,
    teamMembers,
    missionAnalysis,
    capabilityDistribution
  );
  
  const gapAnalysis = aiGapAnalysis.gapAnalysis;
  const contextualInsights = aiGapAnalysis.contextualInsights;
  const idealCandidateProfile = aiGapAnalysis.idealCandidateProfile;

  // Sort by severity and priority
  const severityOrder = { critical: 0, warning: 1, healthy: 2 };
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  gapAnalysis.sort((a, b) => {
    const sevDiff = severityOrder[a.gapSeverity] - severityOrder[b.gapSeverity];
    if (sevDiff !== 0) return sevDiff;
    return priorityOrder[a.requiredPriority] - priorityOrder[b.requiredPriority];
  });

  // Generate hire recommendations based on gaps - use AI-generated targets if available
  const hireRecommendations: EcosystemHireRecommendation[] = [];
  let priorityRank = 1;
  
  for (const gap of gapAnalysis.filter(g => g.gapSeverity !== "healthy")) {
    // Use AI-generated ideal targets if available, otherwise fall back to defaults
    const aiTarget = idealCandidateProfile?.fitTargets?.[gap.code];
    const targetScore = aiTarget?.ideal || (gap.gapSeverity === "critical" ? 85 : 75);
    
    hireRecommendations.push({
      priorityRank,
      capability: gap.capability,
      code: gap.code,
      targetScore,
      reasoning: aiTarget?.reasoning || gap.reasoning,
      alignsWithMission: gap.requiredPriority === "critical" || gap.requiredPriority === "high",
    });
    priorityRank++;
  }

  // Generate risk alerts
  const riskAlerts: EcosystemRiskAlert[] = [];
  
  // Check for concentration risks (too few people covering a capability)
  for (const code of capabilityCodes) {
    const dist = capabilityDistribution[code];
    if (dist && dist.coverage > 0 && dist.coverage <= 20 && teamMembers.length >= 5) {
      const strongCount = Math.round(teamMembers.length * dist.coverage / 100);
      riskAlerts.push({
        type: "single_point_of_failure",
        severity: "critical",
        title: `Single Point of Failure: ${FIT_CAPABILITIES[code].name}`,
        description: `Only ${strongCount} team member${strongCount === 1 ? '' : 's'} score${strongCount === 1 ? 's' : ''} strongly in ${FIT_CAPABILITIES[code].name}. This creates dependency risk.`,
        affectedCapabilities: [code],
        recommendation: `Consider hiring or developing additional team members with strong ${FIT_CAPABILITIES[code].name}.`,
      });
    }
  }

  // Check for capability imbalances
  const averages = Object.entries(capabilityDistribution).map(([code, d]) => ({ code, avg: d.average }));
  if (averages.length >= 4) {
    const sortedAvg = [...averages].sort((a, b) => b.avg - a.avg);
    const spread = sortedAvg[0].avg - sortedAvg[sortedAvg.length - 1].avg;
    
    if (spread > 25) {
      riskAlerts.push({
        type: "imbalance",
        severity: "warning",
        title: "Significant Capability Imbalance",
        description: `There's a ${Math.round(spread)}% spread between your strongest (${FIT_CAPABILITIES[sortedAvg[0].code as keyof typeof FIT_CAPABILITIES].name}) and weakest (${FIT_CAPABILITIES[sortedAvg[sortedAvg.length - 1].code as keyof typeof FIT_CAPABILITIES].name}) capabilities.`,
        affectedCapabilities: [sortedAvg[0].code, sortedAvg[sortedAvg.length - 1].code],
        recommendation: "Focus development efforts on weaker capabilities to create a more balanced team.",
      });
    }
  }

  // Calculate overall health score with granular scoring
  // Base score from capability averages
  const capAverages = Object.values(capabilityDistribution).map(c => c.average);
  const avgCapabilityScore = capAverages.length > 0 
    ? capAverages.reduce((a, b) => a + b, 0) / capAverages.length 
    : 50;
  
  // Calculate coverage factor (how many capabilities have adequate team coverage)
  const coverageScores = Object.values(capabilityDistribution).map(c => c.coverage);
  const avgCoverage = coverageScores.length > 0 
    ? coverageScores.reduce((a, b) => a + b, 0) / coverageScores.length 
    : 50;
  
  // Penalty factors for gaps and risks
  const criticalGaps = gapAnalysis.filter(g => g.gapSeverity === "critical").length;
  const warningGaps = gapAnalysis.filter(g => g.gapSeverity === "warning").length;
  const gapPenalty = (criticalGaps * 12) + (warningGaps * 6) + (riskAlerts.length * 3);
  
  // Weighted health score: 40% capability average, 30% coverage, 30% gap/risk penalty
  const overallHealthScore = Math.round(
    Math.max(0, Math.min(100, 
      (avgCapabilityScore * 0.4) + (avgCoverage * 0.3) + ((100 - gapPenalty) * 0.3)
    ))
  );
  
  // Mission alignment based on how well critical/high priority capabilities are covered
  let missionAlignmentScore = 100;
  if (missionAnalysis) {
    for (const gap of gapAnalysis) {
      // Use capability average to determine penalty amount for more granular scoring
      const capAvg = gap.currentAverage || 50;
      const capDeficit = Math.max(0, 70 - capAvg); // How far below 70% threshold
      
      if (gap.requiredPriority === "critical") {
        // Critical priorities: larger penalty scaled by actual deficit
        missionAlignmentScore -= gap.gapSeverity === "critical" 
          ? Math.round(8 + (capDeficit * 0.3))
          : gap.gapSeverity === "warning" 
            ? Math.round(4 + (capDeficit * 0.15))
            : 0;
      } else if (gap.requiredPriority === "high") {
        missionAlignmentScore -= gap.gapSeverity === "critical" 
          ? Math.round(6 + (capDeficit * 0.2))
          : gap.gapSeverity === "warning" 
            ? Math.round(3 + (capDeficit * 0.1))
            : 0;
      } else if (gap.requiredPriority === "medium") {
        missionAlignmentScore -= gap.gapSeverity === "critical" 
          ? Math.round(4 + (capDeficit * 0.1))
          : gap.gapSeverity === "warning" 
            ? Math.round(2)
            : 0;
      }
    }
    missionAlignmentScore = Math.max(0, Math.min(100, Math.round(missionAlignmentScore)));
  }

  // Generate AI-powered strategic advisor analysis
  const strategicAnalysis = await generateStrategicAdvisorAnalysis(
    project,
    teamMembers,
    missionAnalysis,
    capabilityDistribution,
    gapAnalysis,
    riskAlerts
  );

  // Enhance capabilityGapMatrix with actual scores from real data
  const enhancedCapabilityGapMatrix = strategicAnalysis.capabilityGapMatrix.map((item: any) => {
    const capDist = capabilityDistribution[item.code];
    
    // Current = actual team average from FIT scores
    const currentScore = Math.round(capDist?.average || item.currentScore || 50);
    
    // Target = required score based on mission priority
    // These represent what level the mission requires for each capability
    const targetScore = item.missionPriority === "critical" ? 85 : 
                        item.missionPriority === "high" ? 75 : 
                        item.missionPriority === "medium" ? 65 : 55;
    
    return {
      ...item,
      currentScore,
      targetScore,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    teamSize: teamMembers.length,
    capabilityDistribution,
    missionAlignmentScore,
    gapAnalysis,
    hireRecommendations,
    riskAlerts,
    overallHealthScore,
    // Enhanced strategic advisor content
    executiveSummary: strategicAnalysis.executiveSummary,
    strategicInsights: strategicAnalysis.strategicInsights,
    idealHireProfiles: strategicAnalysis.idealHireProfiles,
    capabilityGapMatrix: enhancedCapabilityGapMatrix,
    // AI-powered contextual gap analysis
    contextualInsights,
    idealCandidateProfile,
  };
}

export function registerEcosystemRoutes(app: Express): void {
  // ============================================
  // Ecosystem Index API Routes
  // ============================================

  // Create a new ecosystem project
  app.post("/api/ecosystem/projects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      console.log("[Ecosystem] Creating project for user:", { userId: user.id, email: user.email, body: req.body });

      const data = createProjectSchema.parse(req.body);
      
      const project = await storage.createEcosystemProject({
        userId: user.id,
        partnerId: data.partnerId || null,
        name: data.name || "My Team Analysis",
        status: "draft",
        currentStep: 1,
        isPaid: false, // Requires payment at £15 base (with PPP pricing)
        paidAmount: 0,
      });

      console.log("[Ecosystem] Project created successfully:", project.id);
      res.status(201).json(project);
    } catch (error: any) {
      console.error("[Ecosystem] Error creating project:", error.message || error);
      console.error("[Ecosystem] Error details:", error.code, error.detail, error.constraint);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create project", details: error.message });
    }
  });

  // Get user's ecosystem projects
  app.get("/api/ecosystem/projects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const projects = await storage.getEcosystemProjectsByUser(user.id);
      res.json(projects);
    } catch (error: any) {
      console.error("[Ecosystem] Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  // Get a specific ecosystem project
  app.get("/api/ecosystem/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const project = await storage.getEcosystemProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!(await hasProjectAccess(project, user.email, user.id))) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(project);
    } catch (error: any) {
      console.error("[Ecosystem] Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  // Update ecosystem project
  app.patch("/api/ecosystem/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const project = await storage.getEcosystemProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!(await hasProjectAccess(project, user.email, user.id))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updated = await storage.updateEcosystemProject(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("[Ecosystem] Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  // Delete ecosystem project
  app.delete("/api/ecosystem/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const project = await storage.getEcosystemProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!(await hasProjectAccess(project, user.email, user.id))) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteEcosystemProject(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("[Ecosystem] Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Save mission statement (no AI analysis - analysis happens during team generation)
  app.post("/api/ecosystem/projects/:id/save-mission", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const project = await storage.getEcosystemProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!(await hasProjectAccess(project, user.email, user.id))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const data = missionAnalysisSchema.parse(req.body);
      
      // Just save the mission data - AI analysis will happen during team analysis generation
      // Advance to step 3 (Team Context) after saving mission
      const updated = await storage.updateEcosystemProject(req.params.id, {
        missionStatement: data.missionStatement,
        companyEthos: data.companyEthos,
        currentStep: Math.max(project.currentStep, 3), // Move to step 3
        status: "in_progress",
      });

      res.json({
        project: updated,
      });
    } catch (error: any) {
      console.error("[Ecosystem] Error saving mission:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to save mission" });
    }
  });

  // Analyze mission statement with AI (legacy - kept for backwards compatibility)
  app.post("/api/ecosystem/projects/:id/analyze-mission", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const project = await storage.getEcosystemProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!(await hasProjectAccess(project, user.email, user.id))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const data = missionAnalysisSchema.parse(req.body);
      
      // Analyze with AI
      const missionAnalysis = await analyzeMissionWithAI(data.missionStatement, data.companyEthos);

      // Update project
      const updated = await storage.updateEcosystemProject(req.params.id, {
        missionStatement: data.missionStatement,
        companyEthos: data.companyEthos,
        missionAnalysis,
        currentStep: Math.max(project.currentStep, 2),
        status: "in_progress",
      });

      res.json({
        project: updated,
        missionAnalysis,
      });
    } catch (error: any) {
      console.error("[Ecosystem] Error analyzing mission:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to analyze mission" });
    }
  });

  // Update organization context
  app.post("/api/ecosystem/projects/:id/organization-context", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const project = await storage.getEcosystemProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!(await hasProjectAccess(project, user.email, user.id))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const data = organizationContextSchema.parse(req.body);
      
      const updated = await storage.updateEcosystemProject(req.params.id, {
        // Basic context
        industry: data.industry || null,
        teamFunction: data.teamFunction || null,
        teamSize: data.teamSize || null,
        workMode: data.workMode || null,
        teamStage: data.teamStage || null,
        hiringPlans: data.hiringPlans || null,
        currentChallenges: data.currentChallenges || null,
        
        // Deep dive - Team Dynamics
        delayedTasks: data.delayedTasks || null,
        conflictTopics: data.conflictTopics || null,
        avoidedWork: data.avoidedWork || null,
        
        // Deep dive - Workload & Capacity
        overloadedMember: data.overloadedMember || null,
        wishedSkills: data.wishedSkills || null,
        
        // Deep dive - Culture & Collaboration
        idealInteractionStyle: data.idealInteractionStyle || null,
        personalityGap: data.personalityGap || null,
        
        // Deep dive - Strategic Context
        upcomingInitiative: data.upcomingInitiative || null,
        cloneableSkills: data.cloneableSkills || null,
        transformativeFix: data.transformativeFix || null,
        
        currentStep: Math.max(project.currentStep, 4), // Move to step 4 (Team Members)
        status: "in_progress",
      } as any);

      res.json(updated);
    } catch (error: any) {
      console.error("[Ecosystem] Error updating organization context:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update organization context" });
    }
  });

  // Get team members for a project
  app.get("/api/ecosystem/projects/:id/team-members", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const project = await storage.getEcosystemProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!(await hasProjectAccess(project, user.email, user.id))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const teamMembers = await storage.getEcosystemTeamMembers(req.params.id);
      res.json(teamMembers);
    } catch (error: any) {
      console.error("[Ecosystem] Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Add a team member
  app.post("/api/ecosystem/projects/:id/team-members", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const project = await storage.getEcosystemProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!(await hasProjectAccess(project, user.email, user.id))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const data = addTeamMemberSchema.parse(req.body);
      
      const member = await storage.addEcosystemTeamMember({
        projectId: req.params.id,
        name: data.name,
        email: data.email,
        role: data.role,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        fitScores: data.fitScores,
        assessmentCompleted: data.fitScores ? Object.keys(data.fitScores).length >= 6 : false,
      });

      // Update project step if needed
      if (project.currentStep < 4) {
        await storage.updateEcosystemProject(req.params.id, {
          currentStep: 4,
          status: "in_progress",
        });
      }

      res.status(201).json(member);
    } catch (error: any) {
      console.error("[Ecosystem] Error adding team member:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to add team member" });
    }
  });

  // Update a team member
  app.patch("/api/ecosystem/projects/:id/team-members/:memberId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const project = await storage.getEcosystemProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!(await hasProjectAccess(project, user.email, user.id))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updated = await storage.updateEcosystemTeamMember(req.params.memberId, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("[Ecosystem] Error updating team member:", error);
      res.status(500).json({ error: "Failed to update team member" });
    }
  });

  // Delete a team member
  app.delete("/api/ecosystem/projects/:id/team-members/:memberId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const project = await storage.getEcosystemProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!(await hasProjectAccess(project, user.email, user.id))) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteEcosystemTeamMember(req.params.memberId);
      res.status(204).send();
    } catch (error: any) {
      console.error("[Ecosystem] Error deleting team member:", error);
      res.status(500).json({ error: "Failed to delete team member" });
    }
  });

  // Parse FIT scores from PDF
  app.post("/api/ecosystem/parse-fit-pdf", isAuthenticated, pdfUpload.single("pdf"), async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      // Parse the PDF
      const pdfData = await (pdfParse as any).default(file.buffer);
      const text = pdfData.text;

      // Extract name from PDF (look for common patterns in HumanMetrix FIT reports)
      let name = "";
      const namePatterns = [
        /Candidate:\s*([A-Za-z\s]+)/i,
        /Name:\s*([A-Za-z\s]+)/i,
        /FIT Assessment Report\s+for\s+([A-Za-z\s]+)/i,
        /Assessment Results\s+([A-Za-z\s]+)/i,
      ];
      for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match) {
          name = match[1].trim();
          break;
        }
      }

      // Log first 2000 chars of extracted text for debugging
      console.log("[Ecosystem] PDF Text (first 2000 chars):", text.substring(0, 2000));

      // Extract FIT scores using regex patterns - more flexible to handle various PDF formats
      const scores: Record<string, number> = {};
      
      // Try multiple pattern strategies
      const scorePatterns = [
        // Pattern: "Skill Name: 85" or "Skill Name 85" with possible newlines/spaces
        { code: "HA", patterns: [
          /High Agency[:\s]*(\d{1,3})/gi,
          /\bHA[:\s]+(\d{1,3})/gi,
        ]},
        { code: "IC", patterns: [
          /Intellectual Curiosity[:\s]*(\d{1,3})/gi,
          /\bIC[:\s]+(\d{1,3})/gi,
        ]},
        { code: "RA", patterns: [
          /Resilience[:\s]*(\d{1,3})/gi,
          /\bRA[:\s]+(\d{1,3})/gi,
        ]},
        { code: "EE", patterns: [
          /Empathy\s*[&]+\s*Ethics[:\s]*(\d{1,3})/gi,
          /Empathy[:\s]*(\d{1,3})/gi,
          /\bEE[:\s]+(\d{1,3})/gi,
          /E\s*&\s*E[:\s]+(\d{1,3})/gi,
        ]},
        { code: "GM", patterns: [
          /Growth Mindset[:\s]*(\d{1,3})/gi,
          /\bGM[:\s]+(\d{1,3})/gi,
        ]},
        { code: "IA", patterns: [
          /Interpersonal Agility[:\s]*(\d{1,3})/gi,
          /\bIA[:\s]+(\d{1,3})/gi,
        ]},
      ];

      for (const { code, patterns } of scorePatterns) {
        for (const pattern of patterns) {
          // Reset lastIndex for global patterns
          pattern.lastIndex = 0;
          const match = pattern.exec(text);
          if (match) {
            const score = parseInt(match[1], 10);
            if (score >= 0 && score <= 100) {
              scores[code] = score;
              console.log(`[Ecosystem] Found ${code}: ${score}`);
              break;
            }
          }
        }
      }

      // If no scores found with standard patterns, try to find any individual skill scores section
      if (Object.keys(scores).length === 0) {
        // Look for "Individual Skill Scores" section and extract numbers near skill names
        const skillsSection = text.match(/Individual Skill Scores[\s\S]{0,1000}/i);
        if (skillsSection) {
          console.log("[Ecosystem] Found skills section:", skillsSection[0].substring(0, 500));
          // Try extracting again from this section
          const sectionText = skillsSection[0];
          const simplePatterns = [
            { code: "HA", regex: /High Agency[\s\S]*?(\d{1,3})/i },
            { code: "IC", regex: /Intellectual Curiosity[\s\S]*?(\d{1,3})/i },
            { code: "RA", regex: /Resilience[\s\S]*?(\d{1,3})/i },
            { code: "EE", regex: /Empathy[\s\S]*?(\d{1,3})/i },
            { code: "GM", regex: /Growth Mindset[\s\S]*?(\d{1,3})/i },
            { code: "IA", regex: /Interpersonal Agility[\s\S]*?(\d{1,3})/i },
          ];
          for (const { code, regex } of simplePatterns) {
            const match = sectionText.match(regex);
            if (match) {
              const score = parseInt(match[1], 10);
              if (score >= 0 && score <= 100 && !scores[code]) {
                scores[code] = score;
                console.log(`[Ecosystem] Found ${code} from section: ${score}`);
              }
            }
          }
        }
      }

      if (Object.keys(scores).length === 0) {
        return res.status(400).json({ 
          error: "Could not extract FIT scores from PDF", 
          hint: "Please ensure this is a valid HumanMetrix FIT assessment report.",
          debug: { extractedTextPreview: text.substring(0, 500) }
        });
      }

      console.log("[Ecosystem] Parsed PDF scores:", { name, scores });

      res.json({ 
        name: name || "Unknown Candidate",
        scores,
        extractedFields: Object.keys(scores).length,
      });
    } catch (error: any) {
      console.error("[Ecosystem] Error parsing PDF:", error);
      res.status(500).json({ error: "Failed to parse PDF", details: error.message });
    }
  });

  // Generate team analysis
  app.post("/api/ecosystem/projects/:id/generate-analysis", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const project = await storage.getEcosystemProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!(await hasProjectAccess(project, user.email, user.id))) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check payment status (currently free at £0, but ready for future pricing)
      if (!project.isPaid) {
        return res.status(402).json({ 
          error: "Payment required", 
          message: "Please complete payment to generate your team analysis report.",
          requiresPayment: true 
        });
      }

      // Check if project has team members
      const teamMembers = await storage.getEcosystemTeamMembers(req.params.id);
      if (teamMembers.length === 0) {
        return res.status(400).json({ error: "No team members added. Please add at least one team member before generating analysis." });
      }

      // Check if any team members have FIT scores
      const membersWithScores = teamMembers.filter(m => m.fitScores && Object.keys(m.fitScores).length > 0);
      if (membersWithScores.length === 0) {
        return res.status(400).json({ error: "No team members have FIT scores. Please add assessment data for at least one team member." });
      }

      // Run mission analysis if not already done (deferred from Step 2)
      let missionAnalysis = project.missionAnalysis as EcosystemMissionAnalysis | null;
      if (!missionAnalysis && project.missionStatement) {
        console.log("[Ecosystem] Running deferred mission analysis for project:", req.params.id);
        missionAnalysis = await analyzeMissionWithAI(project.missionStatement, project.companyEthos || "");
        // Save mission analysis immediately
        await storage.updateEcosystemProject(req.params.id, {
          missionAnalysis,
        });
      }

      // Generate the analysis
      const teamAnalysis = await generateTeamAnalysis(
        req.params.id,
        missionAnalysis,
        project
      );

      // Update project
      const updated = await storage.updateEcosystemProject(req.params.id, {
        teamAnalysis,
        currentStep: 7, // Step 7 is the results step
        status: "completed",
      });

      res.json({
        project: updated,
        teamAnalysis,
      });
    } catch (error: any) {
      console.error("[Ecosystem] Error generating analysis:", error);
      res.status(500).json({ error: error.message || "Failed to generate analysis" });
    }
  });

  // Partner-specific routes
  app.get("/api/ecosystem/partner/projects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get partner account for user if they have one
      const partnerId = req.query.partnerId as string;
      if (!partnerId) {
        // Return user's own projects
        const projects = await storage.getEcosystemProjectsByUser(user.id);
        return res.json(projects);
      }

      // Check if user has access to this partner
      const projects = await storage.getEcosystemProjectsByPartner(partnerId);
      res.json(projects);
    } catch (error: any) {
      console.error("[Ecosystem] Error fetching partner projects:", error);
      res.status(500).json({ error: "Failed to fetch partner projects" });
    }
  });

  // Get searchable candidates for ecosystem project (partner's invited candidates, excluding already compared)
  app.get("/api/ecosystem/projects/:id/searchable-candidates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const project = await storage.getEcosystemProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Check ownership
      if (project.userId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // If project has no partnerId, return empty array
      if (!project.partnerId) {
        return res.json([]);
      }

      // Get team members already in the project (to exclude from search)
      const existingMembers = await storage.getEcosystemTeamMembers(req.params.id);
      const existingEmails = new Set(existingMembers.map(m => m.email?.toLowerCase()).filter(Boolean));

      // Get all completed FIT sessions for this partner
      const sessions = await storage.getSessionsByPartner(project.partnerId, 10000);
      
      // Filter to completed FIT assessments with scores, excluding already added members
      const candidatesMap = new Map<string, any>();
      
      for (const session of sessions) {
        // Skip test sessions and non-FIT assessments
        if (session.isTestSession || session.assessmentType !== "fit") continue;
        
        // Must have email and be completed with scores
        if (!session.externalEmail || session.status !== "completed" || !session.scores) continue;
        
        const emailLower = session.externalEmail.toLowerCase();
        
        // Skip if already in team
        if (existingEmails.has(emailLower)) continue;
        
        // Extract FIT scores from session
        const fitScores: Record<string, number> = {};
        if (session.scores) {
          Object.entries(session.scores).forEach(([key, value]) => {
            if (typeof value === 'number') {
              fitScores[key] = value;
            }
          });
        }
        
        if (Object.keys(fitScores).length === 0) continue;
        
        // Add to candidates map (deduplicate by email, keep most recent)
        const existing = candidatesMap.get(emailLower);
        if (!existing || (session.completedAt && existing.completedAt && new Date(session.completedAt) > new Date(existing.completedAt))) {
          candidatesMap.set(emailLower, {
            id: session.id,
            email: session.externalEmail,
            name: session.externalEmail.split('@')[0],
            fitScores,
            completedAt: session.completedAt,
          });
        }
      }
      
      res.json(Array.from(candidatesMap.values()));
    } catch (error: any) {
      console.error("[Ecosystem] Error fetching searchable candidates:", error);
      res.status(500).json({ error: "Failed to fetch candidates" });
    }
  });

  // ============================================
  // Ecosystem Payment - Step 6 Checkout
  // ============================================
  
  // Base price for Ecosystem Team Diagnostic: £15 (1500 pence)
  const ECOSYSTEM_BASE_PRICE_PENCE = 1500;

  // Create Stripe checkout session for ecosystem project payment
  app.post("/api/ecosystem/projects/:id/create-checkout", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { countryCode, returnPath } = req.body;
      const projectId = req.params.id;

      const project = await storage.getEcosystemProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Check ownership
      if (project.userId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if already paid
      if (project.isPaid) {
        return res.status(400).json({ error: "This project has already been paid for" });
      }

      // Check if team members with FIT scores exist (required before payment)
      const teamMembers = await storage.getEcosystemTeamMembers(projectId);
      const membersWithScores = teamMembers.filter(m => m.fitScores && Object.keys(m.fitScores as object).length > 0);
      if (membersWithScores.length === 0) {
        return res.status(400).json({ error: "Please add at least one team member with FIT scores before proceeding to payment" });
      }

      // Get pricing based on country
      const userCountry = countryCode || 'GB';
      const stripeCurrency = getStripeCurrencyCode(userCountry);
      const localCurrencyCode = COUNTRY_CURRENCY_MAP[userCountry.toUpperCase()] || 'GBP';
      
      // Apply PPP pricing adjustment and convert to local currency
      const adjustedPrice = convertToStripeCurrencyAmount(ECOSYSTEM_BASE_PRICE_PENCE, localCurrencyCode, userCountry);

      // Get base URL for redirects
      const baseUrl = getBaseUrl(req);

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        customer_email: user.email,
        line_items: [{
          price_data: {
            currency: stripeCurrency,
            product_data: {
              name: "Ecosystem Team Diagnostic Report",
              description: "AI-powered team capability analysis with gap identification and hire recommendations",
            },
            unit_amount: adjustedPrice,
          },
          quantity: 1,
        }],
        mode: "payment",
        allow_promotion_codes: true, // Enable promo codes like FREE
        payment_intent_data: {
          receipt_email: user.email, // Send receipt email
        },
        success_url: `${baseUrl}${returnPath || '/ecosystem/start'}?project=${projectId}&payment=success`,
        cancel_url: `${baseUrl}${returnPath || '/ecosystem/start'}?project=${projectId}&payment=cancelled`,
        metadata: {
          type: "ecosystem_project",
          projectId: projectId,
          userId: user.id,
          countryCode: userCountry,
          localCurrency: localCurrencyCode,
        },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error("[Ecosystem] Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Verify payment and mark project as paid (called after redirect from Stripe)
  app.post("/api/ecosystem/projects/:id/verify-payment", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const projectId = req.params.id;
      const project = await storage.getEcosystemProject(projectId);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (project.userId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // If already paid, return success
      if (project.isPaid) {
        return res.json({ success: true, alreadyPaid: true });
      }

      // Check for completed payments via Stripe - search more sessions to ensure we find it
      const sessions = await stripe.checkout.sessions.list({
        limit: 100,
      });

      // Find a completed session for this project
      const completedSession = sessions.data.find(session => 
        session.metadata?.projectId === projectId &&
        session.metadata?.type === "ecosystem_project" &&
        session.payment_status === "paid"
      );

      if (completedSession) {
        // Mark project as paid
        await storage.updateEcosystemProject(projectId, {
          isPaid: true,
          paidAmount: completedSession.amount_total || ECOSYSTEM_BASE_PRICE_PENCE,
          paidAt: new Date(),
          stripePaymentIntentId: completedSession.payment_intent as string,
        });

        return res.json({ success: true, paid: true });
      }

      return res.json({ success: false, paid: false });
    } catch (error: any) {
      console.error("[Ecosystem] Error verifying payment:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  // Consume partner credits for ecosystem analysis (replaces Stripe payment)
  app.post("/api/ecosystem/projects/:id/consume-credits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const userId = user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Verify project exists and belongs to user
      const project = await storage.getEcosystemProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // If already paid, return success
      if (project.isPaid) {
        return res.json({ success: true, alreadyPaid: true });
      }
      
      // Find partner account for this user
      const dbUser = await storage.getUser(userId);
      if (!dbUser?.organizationId) {
        return res.status(403).json({ error: "Partner account required to use Ecosystem Index" });
      }
      
      const partner = await storage.getPartnerAccountByOrganizationId(dbUser.organizationId);
      if (!partner) {
        return res.status(403).json({ error: "Partner account not found" });
      }
      
      // Check if partner has enough credits (20 credits required)
      const ECOSYSTEM_CREDITS_REQUIRED = 20;
      const remaining = partner.testsPurchased - partner.testsConsumed;
      
      if (remaining < ECOSYSTEM_CREDITS_REQUIRED) {
        return res.status(400).json({ 
          error: `Insufficient credits. This service requires ${ECOSYSTEM_CREDITS_REQUIRED} credits. You have ${remaining} credits remaining.`,
          creditsRequired: ECOSYSTEM_CREDITS_REQUIRED,
          creditsRemaining: remaining
        });
      }
      
      // Consume credits
      await storage.updatePartnerAccount(partner.id, {
        testsConsumed: partner.testsConsumed + ECOSYSTEM_CREDITS_REQUIRED,
      });
      
      // Mark project as paid
      await storage.updateEcosystemProject(id, {
        isPaid: true,
        stripePaymentIntentId: `CREDITS_${partner.id}_${Date.now()}`,
        paidAmount: 0, // No payment, credits used
        paidAt: new Date(),
        status: "paid",
      });
      
      console.log(`[Ecosystem] Partner ${partner.id} consumed ${ECOSYSTEM_CREDITS_REQUIRED} credits for project ${id}`);
      res.json({ 
        success: true, 
        creditsConsumed: ECOSYSTEM_CREDITS_REQUIRED,
        creditsRemaining: remaining - ECOSYSTEM_CREDITS_REQUIRED
      });
    } catch (error: any) {
      console.error("[Ecosystem] Error consuming credits:", error);
      res.status(500).json({ error: "Failed to consume credits" });
    }
  });
}
