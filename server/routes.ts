import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { ASSESSMENT_TYPES, ASSESSMENT_PRICES, BASE_FEE, insertInvitationSchema } from "@shared/schema";
import { db } from "./db";
import { purchaseItems, assessmentResults, purchases } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendInvitationEmail } from "./email";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup simple auth
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get user's purchases (kept for potential future use)
  app.get("/api/purchases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const purchases = await storage.getPurchasesByUser(userId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  // Get available assessments for user
  app.get("/api/available-assessments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const purchases = await storage.getPurchasesByUser(userId);
      
      const availableAssessments: any[] = [];
      for (const purchase of purchases) {
        if (purchase.status === 'completed') {
          const items = await storage.getPurchaseItems(purchase.id);
          for (const item of items) {
            const existing = await storage.getResultByPurchaseItem(item.id);
            if (!existing || existing.status !== 'completed') {
              availableAssessments.push({
                purchaseItemId: item.id,
                assessmentType: item.assessmentType,
                status: item.status,
              });
            }
          }
        }
      }
      
      res.json(availableAssessments);
    } catch (error) {
      console.error("Error fetching available assessments:", error);
      res.status(500).json({ message: "Failed to fetch available assessments" });
    }
  });

  // Start an assessment
  app.post("/api/assessments/start", isAuthenticated, async (req: any, res) => {
    try {
      const { purchaseItemId } = req.body;
      const userId = req.user.id;

      // Fetch purchase item
      const [item] = await db.select().from(purchaseItems).where(eq(purchaseItems.id, purchaseItemId)).limit(1);
      if (!item) {
        return res.status(404).json({ message: "Purchase item not found" });
      }

      // Verify item status is ready
      if (item.status !== 'ready') {
        return res.status(400).json({ message: "Assessment not ready to start" });
      }

      // Verify purchase belongs to user
      const purchase = await storage.getPurchase(item.purchaseId);
      if (!purchase || purchase.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to this assessment" });
      }

      // Check if assessment already started
      const existing = await storage.getResultByPurchaseItem(purchaseItemId);
      if (existing) {
        // Verify existing result belongs to current user
        if (existing.userId !== userId) {
          return res.status(403).json({ message: "Unauthorized access to this assessment" });
        }
        return res.json(existing);
      }

      // Create new assessment result
      const result = await storage.createAssessmentResult({
        userId,
        purchaseItemId,
        invitationId: null,
        assessmentType: item.assessmentType,
        answers: {},
        scores: {},
        totalScore: null,
        percentile: null,
        status: 'in_progress',
        completedAt: null,
      });

      res.json(result);
    } catch (error) {
      console.error("Error starting assessment:", error);
      res.status(500).json({ message: "Failed to start assessment" });
    }
  });

  // Submit assessment answers
  app.post("/api/assessments/:id/submit", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { answers } = req.body;
      const userId = req.user.id;

      const result = await storage.getAssessmentResult(id);
      if (!result || result.userId !== userId) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      // Calculate scores based on assessment type
      let scores: Record<string, number> = {};
      let totalScore = 0;

      if (result.assessmentType === ASSESSMENT_TYPES.FIT) {
        scores = calculateFITScores(answers);
        totalScore = Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length);
      } else if (result.assessmentType === ASSESSMENT_TYPES.AI_READINESS) {
        scores = calculateAIReadinessScores(answers);
        totalScore = Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length);
      } else if (result.assessmentType === ASSESSMENT_TYPES.AIQ) {
        scores = calculateAIQScores(answers);
        totalScore = Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length);
      }

      await db.update(assessmentResults)
        .set({
          answers,
          scores,
          totalScore,
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(assessmentResults.id, id));

      res.json({ success: true, scores, totalScore });
    } catch (error) {
      console.error("Error submitting assessment:", error);
      res.status(500).json({ message: "Failed to submit assessment" });
    }
  });

  // Get user's results
  app.get("/api/results", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const results = await storage.getResultsByUser(userId);
      res.json(results);
    } catch (error) {
      console.error("Error fetching results:", error);
      res.status(500).json({ message: "Failed to fetch results" });
    }
  });

  // Get specific result
  app.get("/api/results/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const result = await storage.getAssessmentResult(id);
      
      if (!result || result.userId !== userId) {
        return res.status(404).json({ message: "Result not found" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching result:", error);
      res.status(500).json({ message: "Failed to fetch result" });
    }
  });

  // Admin: Create invitation and send email
  app.post("/api/admin/invitations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const validatedData = insertInvitationSchema.parse({
        ...req.body,
        sentBy: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });

      const invitation = await storage.createInvitation(validatedData);
      
      // Send email
      try {
        const inviterName = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`
          : user.email || 'HumanMetrix Admin';
        await sendInvitationEmail(invitation, inviterName);
      } catch (emailError) {
        console.error("Error sending invitation email:", emailError);
        // Continue even if email fails - user can still use the token
      }

      res.json(invitation);
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  // Admin: Get all invitations
  app.get("/api/admin/invitations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const invitations = await storage.getAllInvitations();
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // Admin: Get all results
  app.get("/api/admin/results", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const results = await storage.getAllResults();
      res.json(results);
    } catch (error) {
      console.error("Error fetching all results:", error);
      res.status(500).json({ message: "Failed to fetch results" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Scoring functions
function calculateFITScores(answers: Record<string, string>): Record<string, number> {
  const skills = {
    HA: ['1-A', '2-A', '4-A', '8-A', '9-D', '10-A', '11-A', '15-A'],
    IC: ['1-B', '3-A', '4-B', '5-A', '7-A', '8-B', '10-B', '11-B', '15-B'],
    RA: ['2-B', '3-B', '4-C', '6-D', '7-B', '9-A', '12-A', '13-C', '14-A'],
    EE: ['2-C', '3-C', '4-D', '5-C', '7-D', '8-C', '9-B', '11-C', '12-B', '14-B', '15-C'],
    GM: ['1-C', '3-D', '6-B', '7-C', '8-D', '10-C', '12-C', '13-D', '14-C'],
    IA: ['1-D', '2-D', '5-D', '6-C', '9-C', '11-D', '12-D', '14-D', '15-D'],
  };

  const scores: Record<string, number> = {
    HA: 0, IC: 0, RA: 0, EE: 0, GM: 0, IA: 0,
  };

  Object.entries(answers).forEach(([question, answer]) => {
    const key = `${question}-${answer}`;
    Object.entries(skills).forEach(([skill, correctAnswers]) => {
      if (correctAnswers.includes(key)) {
        scores[skill] += 20;
      }
    });
  });

  return scores;
}

function calculateAIReadinessScores(answers: Record<string, string>): Record<string, number> {
  const skills: Record<string, number> = {
    'AI Literacy': 0,
    'Technical Fluency': 0,
    'Domain Fluency': 0,
    'Critical Thinking': 0,
    'Adaptive Learning': 0,
    'Responsible AI': 0,
    'Domain Expertise': 0,
    'Creative Innovation': 0,
    'Cross-functional Collaboration': 0,
  };

  // Simplified scoring - in production, use the full mapping from the assessment file
  Object.values(answers).forEach((answer) => {
    const skillNames = Object.keys(skills);
    const randomSkill = skillNames[Math.floor(Math.random() * skillNames.length)];
    skills[randomSkill] += 4;
  });

  return skills;
}

function calculateAIQScores(answers: Record<string, string>): Record<string, number> {
  const correctAnswers: Record<string, string> = {
    '1': 'A',
    '2': 'A',
    '3': 'C',
    '4': 'B',
  };

  let score = 0;
  Object.entries(answers).forEach(([question, answer]) => {
    if (correctAnswers[question] === answer) {
      score += 25;
    }
  });

  return { 'Algorithmic Integrity': score };
}
