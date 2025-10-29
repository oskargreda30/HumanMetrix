import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { ASSESSMENT_TYPES, ASSESSMENT_PRICES, BASE_FEE, insertInvitationSchema } from "@shared/schema";
import { db } from "./db";
import { purchaseItems, assessmentResults, purchases } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendInvitationEmail } from "./email";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
        
        // Calculate remaining time (20 minutes = 1200 seconds)
        const startTime = new Date(existing.startedAt).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, 1200 - elapsed);
        
        return res.json({ ...existing, timeRemaining: remaining });
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

      // Calculate initial remaining time (should be 1200 seconds)
      const startTime = new Date(result.startedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, 1200 - elapsed);

      res.json({ ...result, timeRemaining: remaining });
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

      // Check if time limit exceeded (20 minutes = 1200 seconds)
      const startTime = new Date(result.startedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      
      if (elapsed > 1200) {
        // Time expired - auto-submit with current answers only
        console.log(`Assessment ${id} submitted after time limit (${elapsed}s)`);
      }

      // Calculate scores based on assessment type
      let scores: Record<string, number> = {};
      let totalScore = 0;
      let evaluations: any[] = [];

      if (result.assessmentType === ASSESSMENT_TYPES.FIT) {
        scores = calculateFITScores(answers);
        totalScore = Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length);
      } else if (result.assessmentType === ASSESSMENT_TYPES.AI_READINESS) {
        scores = calculateAIReadinessScores(answers);
        totalScore = Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length);
      } else if (result.assessmentType === ASSESSMENT_TYPES.AIQ) {
        scores = calculateAIQScores(answers);
        totalScore = Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length);
      } else if (result.assessmentType === ASSESSMENT_TYPES.PROMPT_ARCHITECTURE) {
        // For Prompt Architecture, use OpenAI GPT evaluation
        const promptEvalResult = await calculatePromptArchitectureScores(answers);
        scores = promptEvalResult.scores;
        totalScore = promptEvalResult.totalScore;
        evaluations = promptEvalResult.evaluations;
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

      res.json({ success: true, scores, totalScore, evaluations });
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
    'High Agency': ['1-A', '2-A', '4-A', '8-A', '9-D', '10-A', '11-A', '15-A'],
    'Intellectual Curiosity': ['1-B', '3-A', '4-B', '5-A', '7-A', '8-B', '10-B', '11-B', '15-B'],
    'Resilience': ['2-B', '3-B', '4-C', '6-D', '7-B', '9-A', '12-A', '13-C', '14-A'],
    'Empathy & Ethics': ['2-C', '3-C', '4-D', '5-C', '7-D', '8-C', '9-B', '11-C', '12-B', '14-B', '15-C'],
    'Growth Mindset': ['1-C', '3-D', '6-B', '7-C', '8-D', '10-C', '12-C', '13-D', '14-C'],
    'Interpersonal Agility': ['1-D', '2-D', '5-D', '6-C', '9-C', '11-D', '12-D', '14-D', '15-D'],
  };

  const scores: Record<string, number> = {
    'High Agency': 0, 
    'Intellectual Curiosity': 0, 
    'Resilience': 0, 
    'Empathy & Ethics': 0, 
    'Growth Mindset': 0, 
    'Interpersonal Agility': 0,
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
  // Initialize skill scores with full names
  const skills: Record<string, number> = {
    'AI Literacy/Prompting': 0,
    'Technical Fluency': 0,
    'Domain Fluency': 0,
    'Critical Thinking': 0,
    'Adaptive Learning': 0,
    'Responsible AI': 0,
    'Domain Expertise': 0,
    'Creative Innovation': 0,
    'Cross-functional Collaboration': 0,
  };

  // Scoring matrix - each question-option maps to skill(s) and points
  const scoringMatrix: Record<string, Record<string, number>> = {
    "1-A": { "AI Literacy/Prompting": 4 },
    "1-B": { "Domain Expertise": 4, "AI Literacy/Prompting": 4, "Domain Fluency": 4 },
    "1-C": { "Responsible AI": 4 },
    "1-D": { "Cross-functional Collaboration": 4 },
    "1-E": { "Creative Innovation": 4 },
    "2-A": { "Technical Fluency": 4 },
    "2-B": { "Adaptive Learning": 4 },
    "2-C": { "Domain Expertise": 4 },
    "2-D": { "Critical Thinking": 4 },
    "2-E": { "AI Literacy/Prompting": 4 },
    "3-A": { "Domain Expertise": 4 },
    "3-B": { "Domain Fluency": 4 },
    "3-C": { "Creative Innovation": 4 },
    "3-D": { "Cross-functional Collaboration": 4 },
    "3-E": { "Technical Fluency": 4, "Critical Thinking": 4 },
    "4-A": { "Technical Fluency": 4 },
    "4-B": { "Adaptive Learning": 4, "Cross-functional Collaboration": 4 },
    "4-C": { "Responsible AI": 4 },
    "4-D": { "Critical Thinking": 4 },
    "4-E": { "AI Literacy/Prompting": 4 },
    "5-A": { "Domain Fluency": 4 },
    "5-B": { "Technical Fluency": 4, "Domain Fluency": 4, "Domain Expertise": 4 },
    "5-C": { "Cross-functional Collaboration": 4 },
    "5-D": { "Creative Innovation": 4 },
    "5-E": { "Adaptive Learning": 4, "Domain Expertise": 4 },
    "6-A": { "Responsible AI": 4 },
    "6-B": { "AI Literacy/Prompting": 4 },
    "6-C": { "Cross-functional Collaboration": 4 },
    "6-D": { "Creative Innovation": 4 },
    "6-E": { "Domain Expertise": 4 },
    "7-A": { "AI Literacy/Prompting": 4 },
    "7-B": { "Domain Expertise": 4 },
    "7-C": { "Cross-functional Collaboration": 4 },
    "7-D": { "Critical Thinking": 4, "Domain Fluency": 4 },
    "7-E": { "Creative Innovation": 4 },
    "8-A": { "Critical Thinking": 4 },
    "8-B": { "Creative Innovation": 4 },
    "8-C": { "Adaptive Learning": 4 },
    "8-D": { "Domain Fluency": 4 },
    "8-E": { "Creative Innovation": 4, "Domain Fluency": 4, "Domain Expertise": 4 },
    "9-A": { "Domain Fluency": 4 },
    "9-B": { "Cross-functional Collaboration": 4 },
    "9-C": { "Adaptive Learning": 4 },
    "9-D": { "Critical Thinking": 4 },
    "9-E": { "AI Literacy/Prompting": 4, "Domain Expertise": 4 },
    "10-A": { "Domain Fluency": 4, "Creative Innovation": 4, "Critical Thinking": 4 },
    "10-B": { "AI Literacy/Prompting": 4, "Responsible AI": 4 },
    "10-C": { "Critical Thinking": 4, "Responsible AI": 4 },
    "10-D": { "Creative Innovation": 4 },
    "10-E": { "Cross-functional Collaboration": 4 },
    "11-A": { "Technical Fluency": 4, "Cross-functional Collaboration": 4 },
    "11-B": { "Critical Thinking": 4 },
    "11-C": { "AI Literacy/Prompting": 4 },
    "11-D": { "Adaptive Learning": 4 },
    "11-E": { "Domain Expertise": 4 },
    "12-A": { "Critical Thinking": 4, "Creative Innovation": 4, "Domain Fluency": 4 },
    "12-B": { "Domain Fluency": 4 },
    "12-C": { "Creative Innovation": 4 },
    "12-D": { "Cross-functional Collaboration": 4 },
    "12-E": { "AI Literacy/Prompting": 4 },
    "13-A": { "Technical Fluency": 4 },
    "13-B": { "Adaptive Learning": 4, "Technical Fluency": 4, "Cross-functional Collaboration": 4 },
    "13-C": { "Domain Fluency": 4 },
    "13-D": { "Cross-functional Collaboration": 4, "Adaptive Learning": 4 },
    "13-E": { "Creative Innovation": 4 },
    "14-A": { "Domain Fluency": 4 },
    "14-B": { "Cross-functional Collaboration": 4 },
    "14-C": { "AI Literacy/Prompting": 4 },
    "14-D": { "Critical Thinking": 4, "Adaptive Learning": 4 },
    "14-E": { "Creative Innovation": 4 },
    "15-A": { "Responsible AI": 4 },
    "15-B": { "Domain Expertise": 4 },
    "15-C": { "AI Literacy/Prompting": 4, "Responsible AI": 4, "Adaptive Learning": 4 },
    "15-D": { "Domain Expertise": 4, "Critical Thinking": 4 },
    "15-E": { "Cross-functional Collaboration": 4 },
    "16-A": { "Technical Fluency": 4, "Critical Thinking": 4 },
    "16-B": { "Creative Innovation": 4 },
    "16-C": { "Cross-functional Collaboration": 4 },
    "16-D": { "AI Literacy/Prompting": 4 },
    "16-E": { "Creative Innovation": 4 },
    "17-A": { "Domain Expertise": 4 },
    "17-B": { "Technical Fluency": 4, "Critical Thinking": 4 },
    "17-C": { "AI Literacy/Prompting": 4, "Cross-functional Collaboration": 4, "Responsible AI": 4 },
    "17-D": { "Adaptive Learning": 4, "Cross-functional Collaboration": 4 },
    "17-E": { "Domain Expertise": 4 },
    "18-A": { "Responsible AI": 4, "Adaptive Learning": 4, "Cross-functional Collaboration": 4 },
    "18-B": { "Creative Innovation": 4 },
    "18-C": { "Cross-functional Collaboration": 4 },
    "18-D": { "AI Literacy/Prompting": 4 },
    "18-E": { "Cross-functional Collaboration": 4 },
    "19-A": { "Critical Thinking": 4 },
    "19-B": { "Domain Fluency": 4 },
    "19-C": { "AI Literacy/Prompting": 4 },
    "19-D": { "Adaptive Learning": 4, "Domain Expertise": 4 },
    "19-E": { "Technical Fluency": 4 },
    "20-A": { "Domain Expertise": 4 },
    "20-B": { "Domain Fluency": 4 },
    "20-C": { "Creative Innovation": 4 },
    "20-D": { "Technical Fluency": 4, "Adaptive Learning": 4 },
    "20-E": { "Cross-functional Collaboration": 4 },
    "21-A": { "AI Literacy/Prompting": 4 },
    "21-B": { "Domain Fluency": 4 },
    "21-C": { "Domain Expertise": 4 },
    "21-D": { "Technical Fluency": 4, "Critical Thinking": 4, "Adaptive Learning": 4 },
    "21-E": { "Cross-functional Collaboration": 4 },
  };

  // Calculate scores based on answers
  Object.entries(answers).forEach(([questionId, answer]) => {
    const key = `${questionId}-${answer}`;
    const skillPoints = scoringMatrix[key];
    
    if (skillPoints) {
      Object.entries(skillPoints).forEach(([skill, points]) => {
        skills[skill] += points;
      });
    }
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

// Evaluate a single prompt using OpenAI GPT-5
async function evaluatePromptWithGPT(userPrompt: string, level: number, taskDescription: string): Promise<{
  clarity: number;
  structure: number;
  contextRelevance: number;
  creativity: number;
  iterativeImprovement: number;
  feedback: string;
  totalScore: number;
}> {
  const evaluationPrompt = `You are an expert evaluator of AI prompts. Evaluate the following user-written prompt based on these criteria:

**Level ${level} Task**: ${taskDescription}

**User's Prompt**:
${userPrompt}

**Evaluation Criteria**:
1. **Clarity (25 points)**: Is the prompt clear, unambiguous, and easy to understand?
2. **Structure (20 points)**: Is the prompt well-organized with logical flow?
3. **Context Relevance (20 points)**: Does the prompt provide necessary context and constraints?
4. **Creativity (20 points)**: Does the prompt encourage thoughtful, creative responses?
5. **Iterative Improvement (15 points)**: Does the prompt include mechanisms for refinement or building upon concepts?

**Instructions**:
- Provide scores for each criterion (out of the maximum points listed)
- Be fair but rigorous in your evaluation
- Consider the difficulty level when scoring
- Provide constructive feedback

**Response Format** (MUST follow exactly):
{
  "clarity": <score out of 25>,
  "structure": <score out of 20>,
  "contextRelevance": <score out of 20>,
  "creativity": <score out of 20>,
  "iterativeImprovement": <score out of 15>,
  "feedback": "<brief constructive feedback>",
  "totalScore": <sum of all scores>
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert prompt engineering evaluator. Respond only with valid JSON matching the requested format.",
        },
        {
          role: "user",
          content: evaluationPrompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    
    // Ensure all fields exist with fallback values
    return {
      clarity: result.clarity || 0,
      structure: result.structure || 0,
      contextRelevance: result.contextRelevance || 0,
      creativity: result.creativity || 0,
      iterativeImprovement: result.iterativeImprovement || 0,
      feedback: result.feedback || "Evaluation completed",
      totalScore: result.totalScore || 0,
    };
  } catch (error) {
    console.error("Error evaluating prompt with GPT:", error);
    throw new Error("Failed to evaluate prompt");
  }
}

// Calculate Prompt Architecture scores by evaluating all prompts
async function calculatePromptArchitectureScores(answers: Record<string, string>): Promise<{
  scores: Record<string, number>;
  totalScore: number;
  evaluations: any[];
}> {
  const levelDescriptions: Record<string, string> = {
    "1": "Write a prompt to ask for the capital city of France and 3 interesting facts about it.",
    "2": "List the top 5 programming languages for web development in 2024, formatted as a numbered list with descriptions.",
    "3": "Explain quantum computing as a senior physics professor to undergraduate students.",
    "4": "Debug a Python function for finding duplicates with 4 steps: analyze, identify bug, explain, correct.",
    "5": "Generate a 100-word eco-friendly water bottle description with 3 benefits for millennials.",
    "6": "Draft, evaluate, and improve a job offer decline email.",
    "7": "Design a comprehensive content moderation system covering multiple domains.",
  };

  const evaluations: any[] = [];
  let clarityTotal = 0;
  let structureTotal = 0;
  let contextTotal = 0;
  let creativityTotal = 0;
  let iterativeTotal = 0;

  // Evaluate each level's prompt
  for (const [level, userPrompt] of Object.entries(answers)) {
    const taskDesc = levelDescriptions[level] || `Level ${level} task`;
    const evaluation = await evaluatePromptWithGPT(userPrompt, parseInt(level), taskDesc);
    
    evaluations.push({
      level: parseInt(level),
      ...evaluation,
    });

    clarityTotal += evaluation.clarity;
    structureTotal += evaluation.structure;
    contextTotal += evaluation.contextRelevance;
    creativityTotal += evaluation.creativity;
    iterativeTotal += evaluation.iterativeImprovement;
  }

  // Calculate average scores across all levels
  const numLevels = Object.keys(answers).length;
  const scores = {
    "Clarity": Math.round(clarityTotal / numLevels),
    "Structure": Math.round(structureTotal / numLevels),
    "Context Relevance": Math.round(contextTotal / numLevels),
    "Creativity": Math.round(creativityTotal / numLevels),
    "Iterative Improvement": Math.round(iterativeTotal / numLevels),
  };

  const totalScore = Math.round((clarityTotal + structureTotal + contextTotal + creativityTotal + iterativeTotal) / numLevels);

  return { scores, totalScore, evaluations };
}
