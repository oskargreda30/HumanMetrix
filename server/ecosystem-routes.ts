import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";
import OpenAI from "openai";
import { z } from "zod";
import type { 
  EcosystemMissionAnalysis,
  EcosystemTeamAnalysis,
  EcosystemCapabilityPriority,
  EcosystemGapAnalysis,
  EcosystemHireRecommendation,
  EcosystemRiskAlert,
} from "@shared/schema";

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
  missionStatement: z.string().min(10, "Mission statement is too short"),
  companyEthos: z.string().optional(),
});

const organizationContextSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companySize: z.enum(["1-10", "11-50", "51-200", "201-500", "500+"]),
  industry: z.string().min(1, "Industry is required"),
  teamFunction: z.string().min(1, "Team function is required"),
  teamSize: z.number().min(1, "Team size must be at least 1"),
  workMode: z.enum(["remote", "hybrid", "onsite"]),
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

// Helper to generate comprehensive team analysis
async function generateTeamAnalysis(
  projectId: string,
  missionAnalysis: EcosystemMissionAnalysis | null
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

  // Gap analysis
  const gapAnalysis: EcosystemGapAnalysis[] = [];
  const priorityMap: Record<string, "critical" | "high" | "medium" | "low"> = {};
  
  if (missionAnalysis?.capabilityPriorities) {
    for (const cap of missionAnalysis.capabilityPriorities) {
      priorityMap[cap.code] = cap.priority;
    }
  }

  for (const code of capabilityCodes) {
    const dist = capabilityDistribution[code];
    const priority = priorityMap[code] || "medium";
    
    if (dist) {
      let gapSeverity: "critical" | "warning" | "healthy" = "healthy";
      const thresholds = {
        critical: { avgMin: 60, coverageMin: 40 },
        high: { avgMin: 55, coverageMin: 35 },
        medium: { avgMin: 50, coverageMin: 30 },
        low: { avgMin: 45, coverageMin: 25 },
      };
      
      const threshold = thresholds[priority];
      
      if (dist.average < threshold.avgMin - 10 || dist.coverage < threshold.coverageMin - 10) {
        gapSeverity = "critical";
      } else if (dist.average < threshold.avgMin || dist.coverage < threshold.coverageMin) {
        gapSeverity = "warning";
      }

      let reasoning = "";
      if (gapSeverity === "critical") {
        reasoning = `Team average of ${dist.average}% with only ${dist.coverage}% strong performers is critically low for a ${priority}-priority capability.`;
      } else if (gapSeverity === "warning") {
        reasoning = `Team coverage could be stronger - ${dist.coverage}% of team scores 70+ in this ${priority}-priority capability.`;
      } else {
        reasoning = `Team is well-positioned with ${dist.average}% average and ${dist.coverage}% strong performers.`;
      }

      gapAnalysis.push({
        capability: FIT_CAPABILITIES[code].name,
        code,
        currentAverage: dist.average,
        teamCoverage: dist.coverage,
        requiredPriority: priority,
        gapSeverity,
        reasoning,
      });
    }
  }

  // Sort by severity and priority
  const severityOrder = { critical: 0, warning: 1, healthy: 2 };
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  gapAnalysis.sort((a, b) => {
    const sevDiff = severityOrder[a.gapSeverity] - severityOrder[b.gapSeverity];
    if (sevDiff !== 0) return sevDiff;
    return priorityOrder[a.requiredPriority] - priorityOrder[b.requiredPriority];
  });

  // Generate hire recommendations based on gaps
  const hireRecommendations: EcosystemHireRecommendation[] = [];
  let priorityRank = 1;
  
  for (const gap of gapAnalysis.filter(g => g.gapSeverity !== "healthy")) {
    const targetScore = gap.gapSeverity === "critical" ? 85 : 75;
    hireRecommendations.push({
      priorityRank,
      capability: gap.capability,
      code: gap.code,
      targetScore,
      reasoning: gap.reasoning,
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

  // Calculate overall health and mission alignment scores
  const criticalGaps = gapAnalysis.filter(g => g.gapSeverity === "critical").length;
  const warningGaps = gapAnalysis.filter(g => g.gapSeverity === "warning").length;
  const overallHealthScore = Math.max(0, 100 - (criticalGaps * 20) - (warningGaps * 10) - (riskAlerts.length * 5));
  
  // Mission alignment based on how well critical/high priority capabilities are covered
  let missionAlignmentScore = 100;
  if (missionAnalysis) {
    for (const gap of gapAnalysis) {
      if (gap.requiredPriority === "critical") {
        missionAlignmentScore -= gap.gapSeverity === "critical" ? 20 : gap.gapSeverity === "warning" ? 10 : 0;
      } else if (gap.requiredPriority === "high") {
        missionAlignmentScore -= gap.gapSeverity === "critical" ? 15 : gap.gapSeverity === "warning" ? 5 : 0;
      }
    }
    missionAlignmentScore = Math.max(0, missionAlignmentScore);
  }

  return {
    generatedAt: new Date().toISOString(),
    teamSize: teamMembers.length,
    capabilityDistribution,
    missionAlignmentScore,
    gapAnalysis,
    hireRecommendations,
    riskAlerts,
    overallHealthScore,
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

      const data = createProjectSchema.parse(req.body);
      
      const project = await storage.createEcosystemProject({
        userId: user.id,
        partnerId: data.partnerId || null,
        name: data.name || "My Team Analysis",
        status: "draft",
        currentStep: 1,
        isPaid: true, // Free for now (£0)
        paidAmount: 0,
      });

      res.status(201).json(project);
    } catch (error: any) {
      console.error("[Ecosystem] Error creating project:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create project" });
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

  // Analyze mission statement with AI
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
        companyName: data.companyName,
        companySize: data.companySize,
        industry: data.industry,
        teamFunction: data.teamFunction,
        teamSize: data.teamSize,
        workMode: data.workMode,
        currentStep: Math.max(project.currentStep, 3),
        status: "in_progress",
      });

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

      // Generate the analysis
      const teamAnalysis = await generateTeamAnalysis(
        req.params.id,
        project.missionAnalysis as EcosystemMissionAnalysis | null
      );

      // Update project
      const updated = await storage.updateEcosystemProject(req.params.id, {
        teamAnalysis,
        currentStep: 6,
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
}
