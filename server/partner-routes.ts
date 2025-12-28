import { Express, Request, Response } from "express";
import { storage } from "./storage";
import { partnerAuth, PartnerRequest, trackUsage, generateApiKey, consumeTestCredit } from "./partner-auth";
import { sendPartnerQuotaWarning70, sendPartnerQuotaWarning90, sendPartnerAccessSuspendedEmail, sendPartnerAutoTopUpConfirmation } from "./email";
import { ASSESSMENT_TYPES, normalizeAssessmentId, type PartnerAccount } from "@shared/schema";
import { getQuestionLocale } from "@shared/currencies";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import Stripe from "stripe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover" as any,
});

// Package tiers for auto top-up pricing
const PACKAGE_TIERS = [
  { id: 'starter', size: 10, pricePerTest: 500, name: "Starter" },
  { id: 'growth', size: 25, pricePerTest: 450, name: "Growth" },
  { id: 'professional', size: 50, pricePerTest: 400, name: "Professional" },
  { id: 'business', size: 100, pricePerTest: 350, name: "Business" },
  { id: 'enterprise', size: 250, pricePerTest: 300, name: "Enterprise" },
  { id: 'enterprise_plus', size: 500, pricePerTest: 250, name: "Enterprise+" },
];

// Process automatic top-up for a partner when their quota falls below threshold
async function processAutoTopUp(partner: PartnerAccount): Promise<{ success: boolean; testsAdded?: number; error?: string }> {
  if (!partner.autoTopUpEnabled || !partner.autoTopUpPackage || !partner.stripeCustomerId) {
    return { success: false, error: 'Auto top-up not configured' };
  }
  
  // Find the package tier
  const tier = PACKAGE_TIERS.find(t => t.id === partner.autoTopUpPackage);
  if (!tier) {
    console.error(`[Auto Top-Up] Invalid package tier: ${partner.autoTopUpPackage}`);
    return { success: false, error: 'Invalid package tier' };
  }
  
  const totalAmount = tier.size * tier.pricePerTest;
  
  try {
    // Get customer's default payment method
    const customer = await stripe.customers.retrieve(partner.stripeCustomerId);
    if (!customer || customer.deleted) {
      return { success: false, error: 'Stripe customer not found' };
    }
    
    const defaultPaymentMethod = (customer as Stripe.Customer).invoice_settings?.default_payment_method;
    if (!defaultPaymentMethod) {
      console.log(`[Auto Top-Up] No default payment method for partner ${partner.id}`);
      return { success: false, error: 'No payment method on file' };
    }
    
    // Create and confirm payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'gbp',
      customer: partner.stripeCustomerId,
      payment_method: typeof defaultPaymentMethod === 'string' ? defaultPaymentMethod : defaultPaymentMethod.id,
      off_session: true,
      confirm: true,
      description: `Auto top-up: ${tier.name} package (${tier.size} tests)`,
      metadata: {
        partnerId: partner.id,
        packageTier: tier.id,
        testsCount: tier.size.toString(),
        autoTopUp: 'true',
      },
    });
    
    if (paymentIntent.status === 'succeeded') {
      // Record the package purchase first to get the package ID
      const pkg = await storage.createPartnerTestPackage({
        partnerId: partner.id,
        packageSize: tier.size,
        pricePerTest: tier.pricePerTest,
        totalPrice: totalAmount,
        currency: 'gbp',
        status: 'completed',
        stripePaymentIntentId: paymentIntent.id,
      });
      
      // Credit the tests to partner's account
      await storage.creditPartnerTests(partner.id, pkg.id, tier.size, `Auto top-up: ${tier.name} package`);
      
      // Reset quota notifications so they can trigger again for future low-quota scenarios
      await storage.updatePartnerAccount(partner.id, {
        last70NoticeAt: null,
        last90NoticeAt: null,
      });
      
      // Send confirmation email
      const alertEmail = partner.quotaAlertEmail || partner.billingEmail || partner.email;
      await sendPartnerAutoTopUpConfirmation(
        alertEmail,
        partner.companyName || partner.name,
        tier.size,
        totalAmount / 100,
        tier.name
      );
      
      console.log(`[Auto Top-Up] Successfully charged ${partner.id}: ${tier.size} tests for £${(totalAmount / 100).toFixed(2)}`);
      return { success: true, testsAdded: tier.size };
    } else {
      console.error(`[Auto Top-Up] Payment intent status: ${paymentIntent.status}`);
      return { success: false, error: `Payment ${paymentIntent.status}` };
    }
  } catch (error: any) {
    console.error(`[Auto Top-Up] Failed for partner ${partner.id}:`, error.message);
    return { success: false, error: error.message };
  }
}

const createSessionSchema = z.object({
  assessmentType: z.enum(["fit", "ai_readiness", "prompt_architecture", "aiq"]),
  externalUserId: z.string().optional(),
  externalEmail: z.string().email().optional(),
  metadata: z.record(z.any()).optional(),
  webhookUrl: z.string().url().optional(),
  expiresInMinutes: z.number().min(30).max(10080).default(1440),
  country: z.string().length(2).optional(), // ISO 3166-1 alpha-2 country code for locale selection
});

const submitAnswersSchema = z.object({
  answers: z.record(z.any()),
});

export function registerPartnerRoutes(app: Express) {
  app.get("/api/partner/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/partner/me", partnerAuth(), async (req: PartnerRequest, res) => {
    try {
      const partner = req.partner!;
      
      await trackUsage(partner.id, req.apiKey!.id, null, "api_call", undefined, false);
      
      res.json({
        id: partner.id,
        name: partner.name,
        companyName: partner.companyName,
        email: partner.email,
        monthlyQuota: partner.monthlyQuota,
        pricePerAssessment: partner.pricePerAssessment,
        isActive: partner.isActive,
      });
    } catch (error) {
      console.error("Error fetching partner info:", error);
      res.status(500).json({ error: "Failed to fetch partner information" });
    }
  });

  app.post(
    "/api/partner/sessions",
    partnerAuth(["assessments:write"]),
    async (req: PartnerRequest, res) => {
      try {
        const partner = req.partner!;
        const apiKey = req.apiKey!;
        
        // Check if partner has remaining quota before creating a session
        // Partners MUST have purchased test credits to use the API
        const quotaBalance = await storage.getPartnerQuotaBalance(partner.id);
        if (quotaBalance.testsPurchased <= 0) {
          return res.status(402).json({
            error: "No Credits Purchased",
            message: "You must purchase test credits before creating assessment sessions. Please visit the partner portal to purchase a test package.",
            quotaStatus: {
              testsPurchased: quotaBalance.testsPurchased,
              testsConsumed: quotaBalance.testsConsumed,
              remaining: quotaBalance.remaining,
            },
          });
        }
        if (quotaBalance.remaining <= 0) {
          return res.status(402).json({
            error: "Quota Exhausted",
            message: "Your test quota has been exhausted. Please purchase additional test credits to continue.",
            quotaStatus: {
              testsPurchased: quotaBalance.testsPurchased,
              testsConsumed: quotaBalance.testsConsumed,
              remaining: quotaBalance.remaining,
            },
          });
        }
        
        const parseResult = createSessionSchema.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({
            error: "Validation Error",
            details: parseResult.error.errors,
          });
        }
        
        const data = parseResult.data;
        const normalizedType = normalizeAssessmentId(data.assessmentType);
        
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + data.expiresInMinutes);
        
        // Determine question locale based on country code (for SEA localization)
        const questionLocale = data.country ? getQuestionLocale(data.country) : 'default';
        
        const session = await storage.createAssessmentSession({
          partnerId: partner.id,
          partnerOrganisationId: apiKey.partnerOrganisationId || null, // Track which client organisation this belongs to
          apiKeyId: apiKey.id,
          assessmentType: normalizedType,
          externalUserId: data.externalUserId,
          externalEmail: data.externalEmail,
          metadata: data.metadata,
          webhookUrl: data.webhookUrl,
          expiresAt,
          status: "created",
          questionLocale,
        });
        
        await trackUsage(
          partner.id,
          apiKey.id,
          session.id,
          "session_created",
          normalizedType,
          false,
          undefined, // billedAmount
          apiKey.partnerOrganisationId // Track usage per organisation
        );
        
        const widgetUrl = `${getBaseUrl(req)}/embed/assessment?session=${session.id}`;
        
        res.status(201).json({
          sessionId: session.id,
          assessmentType: normalizedType,
          status: session.status,
          expiresAt: session.expiresAt,
          widgetUrl,
          metadata: session.metadata,
        });
      } catch (error) {
        console.error("Error creating session:", error);
        res.status(500).json({ error: "Failed to create assessment session" });
      }
    }
  );

  app.get(
    "/api/partner/sessions/:sessionId",
    partnerAuth(["assessments:read"]),
    async (req: PartnerRequest, res) => {
      try {
        const partner = req.partner!;
        const { sessionId } = req.params;
        
        const session = await storage.getAssessmentSession(sessionId);
        
        if (!session || session.partnerId !== partner.id) {
          return res.status(404).json({ error: "Session not found" });
        }
        
        await trackUsage(partner.id, req.apiKey!.id, sessionId, "session_fetched");
        
        res.json({
          sessionId: session.id,
          assessmentType: session.assessmentType,
          status: session.status,
          externalUserId: session.externalUserId,
          externalEmail: session.externalEmail,
          metadata: session.metadata,
          createdAt: session.createdAt,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
          expiresAt: session.expiresAt,
        });
      } catch (error) {
        console.error("Error fetching session:", error);
        res.status(500).json({ error: "Failed to fetch session" });
      }
    }
  );

  app.get(
    "/api/partner/sessions/:sessionId/results",
    partnerAuth(["results:read"]),
    async (req: PartnerRequest, res) => {
      try {
        const partner = req.partner!;
        const { sessionId } = req.params;
        
        const session = await storage.getAssessmentSession(sessionId);
        
        if (!session || session.partnerId !== partner.id) {
          return res.status(404).json({ error: "Session not found" });
        }
        
        if (session.status !== "completed") {
          return res.status(400).json({
            error: "Results not available",
            message: `Session status is "${session.status}". Results are only available for completed sessions.`,
          });
        }
        
        await trackUsage(
          partner.id,
          req.apiKey!.id,
          sessionId,
          "results_fetched",
          session.assessmentType,
          true,
          partner.pricePerAssessment ?? undefined
        );
        
        res.json({
          sessionId: session.id,
          assessmentType: session.assessmentType,
          status: session.status,
          scores: session.scores,
          totalScore: session.totalScore,
          percentile: session.percentile,
          evaluations: session.evaluations,
          completedAt: session.completedAt,
          metadata: session.metadata,
        });
      } catch (error) {
        console.error("Error fetching results:", error);
        res.status(500).json({ error: "Failed to fetch results" });
      }
    }
  );

  app.get(
    "/api/partner/sessions",
    partnerAuth(["assessments:read"]),
    async (req: PartnerRequest, res) => {
      try {
        const partner = req.partner!;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
        
        const sessions = await storage.getSessionsByPartner(partner.id, limit);
        
        res.json({
          sessions: sessions.map((s) => ({
            sessionId: s.id,
            assessmentType: s.assessmentType,
            status: s.status,
            externalUserId: s.externalUserId,
            createdAt: s.createdAt,
            completedAt: s.completedAt,
          })),
          count: sessions.length,
        });
      } catch (error) {
        console.error("Error listing sessions:", error);
        res.status(500).json({ error: "Failed to list sessions" });
      }
    }
  );

  app.get(
    "/api/partner/usage",
    partnerAuth(),
    async (req: PartnerRequest, res) => {
      try {
        const partner = req.partner!;
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        
        const summary = await storage.getUsageSummaryByPartner(
          partner.id,
          startOfMonth,
          endOfMonth
        );
        
        const totalBilled = summary.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
        const completedSessions = summary.find((s) => s.eventType === "session_completed")?.count || 0;
        
        res.json({
          period: {
            start: startOfMonth.toISOString(),
            end: endOfMonth.toISOString(),
          },
          summary: {
            completedAssessments: completedSessions,
            totalBilledPence: totalBilled,
            totalBilledGBP: (totalBilled / 100).toFixed(2),
            quota: partner.monthlyQuota,
            quotaUsedPercent: partner.monthlyQuota
              ? ((completedSessions / partner.monthlyQuota) * 100).toFixed(1)
              : null,
          },
          breakdown: summary,
        });
      } catch (error) {
        console.error("Error fetching usage:", error);
        res.status(500).json({ error: "Failed to fetch usage data" });
      }
    }
  );

  app.get(
    "/api/partner/quota",
    partnerAuth(),
    async (req: PartnerRequest, res) => {
      try {
        const partner = req.partner!;
        const balance = await storage.getPartnerQuotaBalance(partner.id);
        
        const percentageUsed = balance.testsPurchased > 0
          ? (balance.testsConsumed / balance.testsPurchased) * 100
          : 0;
        
        res.json({
          testsPurchased: balance.testsPurchased,
          testsConsumed: balance.testsConsumed,
          remaining: balance.remaining,
          percentageUsed: Math.round(percentageUsed * 10) / 10,
        });
      } catch (error) {
        console.error("Error fetching quota:", error);
        res.status(500).json({ error: "Failed to fetch quota data" });
      }
    }
  );

  app.get("/api/partner/openapi.json", async (req, res) => {
    try {
      const openApiPath = path.resolve(__dirname, "../shared/openapi.json");
      const openApiContent = fs.readFileSync(openApiPath, "utf-8");
      const openApiSpec = JSON.parse(openApiContent);
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const spec = {
        ...openApiSpec,
        servers: [{ url: baseUrl, description: "Current server" }],
      };
      res.json(spec);
    } catch (error) {
      console.error("Error serving OpenAPI spec:", error);
      res.status(500).json({ error: "Failed to load OpenAPI specification" });
    }
  });

  app.get("/api/partner/assessment-types", (req, res) => {
    res.json({
      types: [
        {
          id: "fit",
          name: "FIT Assessment",
          description: "Measures behavioural skills and workplace fit",
          questionCount: 40,
          estimatedMinutes: 15,
        },
        {
          id: "ai_readiness",
          name: "AI Readiness Assessment",
          description: "Evaluates preparedness for AI-driven work environments",
          questionCount: 30,
          estimatedMinutes: 12,
        },
        {
          id: "prompt_architecture",
          name: "Prompt Architecture Assessment",
          description: "Tests ability to craft effective AI prompts",
          questionCount: 7,
          estimatedMinutes: 25,
        },
        {
          id: "aiq",
          name: "AIQ Assessment",
          description: "Measures AI ethics and integrity quotient",
          questionCount: 15,
          estimatedMinutes: 10,
        },
      ],
    });
  });

  app.get(
    "/api/embed/session/:sessionId",
    async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        
        const session = await storage.getAssessmentSession(sessionId);
        
        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }
        
        if (new Date(session.expiresAt) < new Date() && session.status !== "completed") {
          await storage.updateAssessmentSession(sessionId, { status: "expired" });
          return res.status(400).json({ error: "Session has expired" });
        }
        
        const partner = await storage.getPartnerAccount(session.partnerId);
        
        res.json({
          sessionId: session.id,
          assessmentType: session.assessmentType,
          status: session.status,
          externalUserId: session.externalUserId,
          externalEmail: session.externalEmail,
          partnerName: partner?.companyName || partner?.name,
          expiresAt: session.expiresAt,
          questionLocale: session.questionLocale || 'default',
        });
      } catch (error) {
        console.error("Error fetching session:", error);
        res.status(500).json({ error: "Failed to fetch session" });
      }
    }
  );

  app.post(
    "/api/embed/session/:sessionId/start",
    async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        
        const session = await storage.getAssessmentSession(sessionId);
        
        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }
        
        if (new Date(session.expiresAt) < new Date()) {
          await storage.updateAssessmentSession(sessionId, { status: "expired" });
          return res.status(400).json({ error: "Session has expired" });
        }
        
        if (session.status !== "created") {
          return res.status(400).json({
            error: "Session already started",
            status: session.status,
          });
        }
        
        await storage.updateAssessmentSession(sessionId, {
          status: "started",
          startedAt: new Date(),
        } as any);
        
        await trackUsage(
          session.partnerId,
          session.apiKeyId,
          sessionId,
          "session_started",
          session.assessmentType,
          false
        );
        
        res.json({
          sessionId: session.id,
          assessmentType: session.assessmentType,
          status: "started",
        });
      } catch (error) {
        console.error("Error starting session:", error);
        res.status(500).json({ error: "Failed to start session" });
      }
    }
  );

  app.post(
    "/api/embed/session/:sessionId/submit",
    async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        
        // Validate origin for CORS protection
        const origin = req.headers.origin || req.headers.referer;
        const session = await storage.getAssessmentSession(sessionId);
        
        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }
        
        // Check if partner has a configured website and validate origin
        const partner = await storage.getPartnerAccount(session.partnerId);
        if (partner?.website && origin) {
          try {
            const originUrl = new URL(origin);
            const partnerUrl = new URL(partner.website.startsWith("http") ? partner.website : `https://${partner.website}`);
            if (originUrl.hostname !== partnerUrl.hostname) {
              console.warn(`[Partner Embed] Origin mismatch: expected ${partnerUrl.hostname}, got ${originUrl.hostname}`);
              // Log but don't block - some legitimate cases like local dev environments
            }
          } catch {
            // URL parsing failed, continue anyway
          }
        }
        
        const parseResult = submitAnswersSchema.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({
            error: "Validation Error",
            details: parseResult.error.errors,
          });
        }
        
        if (session.status !== "started") {
          return res.status(400).json({
            error: "Session not in progress",
            status: session.status,
          });
        }
        
        // Additional security: Verify session hasn't expired
        if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
          return res.status(400).json({
            error: "Session has expired",
            status: "expired",
          });
        }
        
        const { answers } = parseResult.data;
        const { scores, totalScore, percentile, evaluations } = await calculateScores(
          session.assessmentType,
          answers
        );
        
        await storage.updateAssessmentSession(sessionId, {
          status: "completed",
          answers,
          scores,
          totalScore,
          percentile,
          evaluations,
          completedAt: new Date(),
        } as any);
        
        await trackUsage(
          session.partnerId,
          session.apiKeyId,
          sessionId,
          "session_completed",
          session.assessmentType,
          true,
          partner?.pricePerAssessment || 500
        );
        
        // Consume a test credit from the partner's prepaid quota
        const quotaResult = await consumeTestCredit(
          session.partnerId,
          sessionId,
          session.assessmentType
        );
        
        // Handle quota consumption failure - block result delivery if quota couldn't be deducted
        if (!quotaResult.success) {
          console.error(`Failed to consume test credit for session ${sessionId}: Insufficient quota`);
          // Return error but assessment data is saved - admin can add credits for retry
          return res.status(402).json({
            error: "Quota Consumption Failed",
            message: "Unable to deduct test credit. Please ensure you have available quota.",
            sessionId: session.id,
            status: "billing_pending",
          });
        }
        
        // Send quota warning emails if thresholds are crossed
        if (partner) {
          const balance = await storage.getPartnerQuotaBalance(session.partnerId);
          const alertEmail = partner.quotaAlertEmail || partner.billingEmail || partner.email;
          
          if (quotaResult.shouldNotifyFirst) {
            await sendPartnerQuotaWarning70(
              alertEmail,
              partner.companyName || partner.name,
              balance.testsConsumed,
              balance.testsPurchased,
              balance.remaining
            );
          }
          if (quotaResult.shouldNotifyUrgent) {
            await sendPartnerQuotaWarning90(
              alertEmail,
              partner.companyName || partner.name,
              balance.testsConsumed,
              balance.testsPurchased,
              balance.remaining
            );
          }
          if (quotaResult.suspended) {
            await sendPartnerAccessSuspendedEmail(
              alertEmail,
              partner.companyName || partner.name
            );
          }
          
          // Handle auto top-up if triggered
          if (quotaResult.shouldAutoTopUp && partner.autoTopUpPackage && partner.stripeCustomerId) {
            try {
              await processAutoTopUp(partner);
            } catch (err) {
              console.error('Auto top-up failed:', err);
            }
          }
        }
        
        if (session.webhookUrl) {
          sendWebhook(session.webhookUrl, {
            event: "session.completed",
            sessionId: session.id,
            assessmentType: session.assessmentType,
            totalScore,
            completedAt: new Date().toISOString(),
          }).catch((err) => console.error("Webhook failed:", err));
        }
        
        res.json({
          sessionId: session.id,
          status: "completed",
          scores,
          totalScore,
          percentile,
        });
      } catch (error) {
        console.error("Error submitting answers:", error);
        res.status(500).json({ error: "Failed to submit answers" });
      }
    }
  );

  // Serve embed test page
  app.get("/embed-test.html", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "public", "embed-test.html");
      const content = fs.readFileSync(filePath, "utf-8");
      res.setHeader("Content-Type", "text/html");
      res.send(content);
    } catch (error) {
      console.error("Error serving embed-test.html:", error);
      res.status(404).send("Test page not found");
    }
  });

  // Serve embed widget.js
  app.get("/embed/widget.js", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "server", "embed", "widget.js");
      const content = fs.readFileSync(filePath, "utf-8");
      res.setHeader("Content-Type", "application/javascript");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(content);
    } catch (error) {
      console.error("Error serving widget.js:", error);
      res.status(404).send("// Widget not found");
    }
  });

  // Serve embed sdk.js
  app.get("/embed/sdk.js", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "server", "embed", "sdk.js");
      const content = fs.readFileSync(filePath, "utf-8");
      res.setHeader("Content-Type", "application/javascript");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(content);
    } catch (error) {
      console.error("Error serving sdk.js:", error);
      res.status(404).send("// SDK not found");
    }
  });
}

function getBaseUrl(req: Request): string {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}`;
}

async function calculateScores(
  assessmentType: string,
  answers: Record<string, any>
): Promise<{
  scores: Record<string, number>;
  totalScore: number;
  percentile: number;
  evaluations?: any[];
}> {
  const questionCount = Object.keys(answers).length || 1;
  const answeredQuestions = Object.values(answers).filter((a) => a !== null && a !== undefined);
  
  const rawScore = (answeredQuestions.length / questionCount) * 100;
  const curvedScore = Math.round(50 + rawScore * 0.4 + Math.pow(rawScore / 100, 2) * 5);
  const totalScore = Math.min(95, Math.max(50, curvedScore));
  
  const percentile = Math.min(99, Math.max(1, Math.round(totalScore * 0.9)));
  
  const scores: Record<string, number> = {
    overall: totalScore,
  };
  
  return { scores, totalScore, percentile };
}

async function sendWebhook(url: string, payload: any): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Webhook delivery failed:", error);
    throw error;
  }
}
