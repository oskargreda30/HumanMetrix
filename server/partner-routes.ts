import { Express, Request, Response } from "express";
import { storage } from "./storage";
import { partnerAuth, PartnerRequest, trackUsage, generateApiKey, consumeTestCredit } from "./partner-auth";
import { isAuthenticated } from "./auth";
import { sendPartnerQuotaWarning70, sendPartnerQuotaWarning90, sendPartnerAccessSuspendedEmail, sendPartnerAutoTopUpConfirmation, sendPartnerBulkInvitationEmail } from "./email";
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
        
        const response: any = {
          sessionId: session.id,
          assessmentType: session.assessmentType,
          status: session.status,
          externalUserId: session.externalUserId,
          externalEmail: session.externalEmail,
          partnerName: partner?.companyName || partner?.name,
          expiresAt: session.expiresAt,
          questionLocale: session.questionLocale || 'default',
        };
        
        if (partner?.brandingEnabled) {
          response.branding = {
            enabled: true,
            primaryColor: partner.brandingPrimaryColor || '#0891b2',
            accentColor: partner.brandingAccentColor || '#06b6d4',
            logoUrl: partner.logoUrl || null,
            welcomeTitle: partner.brandingWelcomeTitle || null,
            welcomeMessage: partner.brandingWelcomeMessage || null,
            companyDisplayName: partner.brandingCompanyDisplayName || partner.companyName || partner.name,
          };
        }
        
        res.json(response);
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
        
        // Create notification for assessment completion
        await storage.createPartnerNotification({
          partnerId: session.partnerId,
          type: 'assessment_completed',
          title: 'Assessment Completed',
          message: `A ${session.assessmentType.toUpperCase()} assessment has been completed${session.externalUserId ? ` by ${session.externalUserId}` : ''}.`,
          metadata: { 
            sessionId: session.id, 
            assessmentType: session.assessmentType,
            externalUserId: session.externalUserId,
            totalScore,
            percentile,
          },
        });
        
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

  // ========================================
  // BULK CANDIDATE INVITATIONS
  // ========================================

  // Get partner's prepaid balance for token preview
  app.get("/api/partner/me/quota", partnerAuth, async (req: PartnerRequest, res: Response) => {
    try {
      const partner = req.partner!;
      const balance = await storage.getPartnerQuotaBalance(partner.id);
      const partnerAccount = await storage.getPartnerAccount(partner.id);
      
      res.json({
        billingType: partnerAccount?.billingType || 'prepaid',
        testsPurchased: balance.testsPurchased,
        testsConsumed: balance.testsConsumed,
        testsRemaining: balance.remaining,
        freeTestsRemaining: partnerAccount?.freeTestsAllocated || 0,
        prepaidBalance: partnerAccount?.prepaidBalance || 0,
        prepaidCreditsExpiresAt: partnerAccount?.prepaidCreditsExpiresAt,
      });
    } catch (error) {
      console.error("Error fetching quota:", error);
      res.status(500).json({ error: "Failed to fetch quota" });
    }
  });

  // Create bulk candidate invitations (session-based auth for dashboard)
  app.post("/api/partner/me/invitations/bulk", isAuthenticated, async (req: any, res: Response) => {
    console.log('[Bulk Invitations] Request received');
    try {
      // Get partner account from user session
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.organizationId) {
        return res.status(403).json({ error: "No partner organization linked" });
      }
      
      const partner = await storage.getPartnerAccountByOrganizationId(user.organizationId);
      if (!partner) {
        return res.status(403).json({ error: "Partner account not found" });
      }
      console.log('[Bulk Invitations] Partner authenticated:', partner.id);
      
      const bodySchema = z.object({
        candidates: z.array(z.object({
          externalUserId: z.string().min(1, "External User ID is required").transform(s => s.trim()),
          email: z.string().transform(s => s.trim()).pipe(
            z.union([z.literal(''), z.string().email("Invalid email format")])
          ).optional().nullable(),
          name: z.string().optional().nullable(),
          metadata: z.record(z.any()).optional().nullable(),
        })).min(1, "At least one candidate required").max(500, "Maximum 500 candidates per batch"),
        assessmentTypes: z.array(z.string()).min(1, "At least one assessment type required"),
        sendEmails: z.boolean().default(true),
        expiresInDays: z.number().min(1).max(90).default(30),
      });
      
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        // Return structured error response matching frontend expectation
        const zodErrors = parsed.error.errors.map((err, idx) => ({
          row: err.path.includes('candidates') ? (Number(err.path[1]) || 0) + 1 : 0,
          externalUserId: '',
          field: String(err.path[err.path.length - 1] || 'unknown'),
          error: err.message,
        }));
        return res.status(400).json({
          error: 'Validation failed',
          errors: zodErrors,
          summary: {
            totalCandidates: Array.isArray(req.body?.candidates) ? req.body.candidates.length : 0,
            successCount: 0,
            failedCount: zodErrors.length,
            tokensUsed: 0,
          },
        });
      }
      
      const { candidates, assessmentTypes, sendEmails, expiresInDays } = parsed.data;
      
      // Validate assessment types
      const validTypes = ['fit', 'ai_readiness', 'prompt_architecture', 'aiq'];
      const invalidTypes = assessmentTypes.filter(t => !validTypes.includes(t.toLowerCase()));
      if (invalidTypes.length > 0) {
        return res.status(400).json({
          error: `Invalid assessment types: ${invalidTypes.join(', ')}`,
          errors: [{ row: 0, externalUserId: '', field: 'assessmentTypes', error: `Invalid types: ${invalidTypes.join(', ')}` }],
          summary: {
            totalCandidates: candidates.length,
            successCount: 0,
            failedCount: candidates.length,
            tokensUsed: 0,
          },
        });
      }
      
      // Server-side validation: collect ALL errors before processing
      const validationErrors: Array<{ row: number; externalUserId: string; field: string; error: string }> = [];
      const seenExternalIds = new Map<string, number>();
      
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const row = i + 1;
        
        // Validate externalUserId is not blank
        if (!candidate.externalUserId || candidate.externalUserId.trim() === '') {
          validationErrors.push({ row, externalUserId: candidate.externalUserId || '', field: 'externalUserId', error: 'External User ID is required' });
          continue;
        }
        
        // Check for duplicates within batch
        const existingRow = seenExternalIds.get(candidate.externalUserId.toLowerCase());
        if (existingRow !== undefined) {
          validationErrors.push({ row, externalUserId: candidate.externalUserId, field: 'externalUserId', error: `Duplicate of row ${existingRow}` });
          continue;
        }
        seenExternalIds.set(candidate.externalUserId.toLowerCase(), row);
        
        // Validate email format if provided and not empty
        if (candidate.email && candidate.email.trim() !== '') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(candidate.email)) {
            validationErrors.push({ row, externalUserId: candidate.externalUserId, field: 'email', error: 'Invalid email format' });
          }
        }
      }
      
      // If there are validation errors, return them without creating anything
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: validationErrors,
          summary: {
            totalCandidates: candidates.length,
            successCount: 0,
            failedCount: validationErrors.length,
            tokensUsed: 0,
          },
        });
      }
      
      // Calculate tokens required (only after validation passes)
      const tokensRequired = candidates.length * assessmentTypes.length;
      
      // Check prepaid balance if prepaid billing type
      const partnerAccount = await storage.getPartnerAccount(partner.id);
      if (partnerAccount?.billingType === 'prepaid') {
        const balance = await storage.getPartnerQuotaBalance(partner.id);
        if (balance.remaining < tokensRequired) {
          return res.status(400).json({ 
            error: "Insufficient tokens",
            tokensRequired,
            tokensRemaining: balance.remaining,
            errors: [{ row: 0, externalUserId: '', field: 'tokens', error: `Need ${tokensRequired} tokens, only ${balance.remaining} available` }],
            summary: {
              totalCandidates: candidates.length,
              successCount: 0,
              failedCount: candidates.length,
              tokensUsed: 0,
            },
          });
        }
      }
      
      // Create import batch record
      console.log('[Bulk Invitations] Creating import record...');
      const importRecord = await storage.createPartnerCandidateImport({
        partnerId: partner.id,
        createdByUserId: null, // API imports don't have a user context
        sourceType: 'manual',
        assessmentTypes: assessmentTypes.map(t => t.toLowerCase()),
        candidateCount: candidates.length,
        status: 'processing',
      });
      console.log('[Bulk Invitations] Import record created:', importRecord.id);
      
      // Create individual invitations
      const baseUrl = getBaseUrl(req);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      
      const errors: Array<{ row: number; externalUserId: string; error: string }> = [];
      const invitations: any[] = [];
      
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        
        try {
          // Check if this externalUserId already has active invitations for these assessments
          const existingInvites = await storage.getPartnerCandidateInvitationsByExternalId(partner.id, candidate.externalUserId);
          const activeInviteTypes = existingInvites
            .filter(inv => inv.status !== 'expired' && inv.status !== 'completed')
            .flatMap(inv => inv.assessmentTypes);
          
          const duplicateTypes = assessmentTypes.filter(t => activeInviteTypes.includes(t.toLowerCase()));
          if (duplicateTypes.length > 0) {
            errors.push({
              row: i + 1,
              externalUserId: candidate.externalUserId,
              error: `Already has active invitations for: ${duplicateTypes.join(', ')}`,
            });
            continue;
          }
          
          // Generate unique invite token
          const inviteToken = crypto.randomUUID().replace(/-/g, '');
          const inviteUrl = `${baseUrl}/invite/${inviteToken}`;
          
          invitations.push({
            partnerId: partner.id,
            importId: importRecord.id,
            externalUserId: candidate.externalUserId,
            email: candidate.email || null,
            name: candidate.name || null,
            metadata: candidate.metadata || null,
            assessmentTypes: assessmentTypes.map(t => t.toLowerCase()),
            inviteToken,
            inviteUrl,
            status: 'pending',
            expiresAt,
            tokensUsed: assessmentTypes.length,
          });
        } catch (err: any) {
          errors.push({
            row: i + 1,
            externalUserId: candidate.externalUserId,
            error: err.message || 'Unknown error',
          });
        }
      }
      
      // Bulk insert invitations
      let createdInvitations: any[] = [];
      if (invitations.length > 0) {
        createdInvitations = await storage.createPartnerCandidateInvitationsBulk(invitations);
        
        // Deduct tokens for prepaid partners
        if (partnerAccount?.billingType === 'prepaid') {
          const tokensUsed = createdInvitations.reduce((sum, inv) => sum + inv.tokensUsed, 0);
          for (const inv of createdInvitations) {
            await storage.consumePartnerTest(partner.id, inv.id, `Bulk invite: ${inv.externalUserId}`);
          }
        }
        
      }
      
      // Update import record
      await storage.updatePartnerCandidateImport(importRecord.id, {
        successCount: createdInvitations.length,
        failedCount: errors.length,
        tokensUsed: createdInvitations.reduce((sum, inv) => sum + inv.tokensUsed, 0),
        status: errors.length === 0 ? 'completed' : (createdInvitations.length > 0 ? 'partial' : 'failed'),
        errorReport: errors.length > 0 ? { errors } : null,
        completedAt: new Date(),
      });
      
      // Respond immediately
      res.json({
        success: true,
        importId: importRecord.id,
        summary: {
          totalCandidates: candidates.length,
          successCount: createdInvitations.length,
          failedCount: errors.length,
          tokensUsed: createdInvitations.reduce((sum, inv) => sum + inv.tokensUsed, 0),
        },
        errors: errors.length > 0 ? errors : undefined,
        invitations: createdInvitations.map(inv => ({
          id: inv.id,
          externalUserId: inv.externalUserId,
          email: inv.email,
          inviteUrl: inv.inviteUrl,
          status: inv.status,
          expiresAt: inv.expiresAt,
        })),
      });
      
      // Send emails in background (one email per candidate with all assessments)
      if (sendEmails && createdInvitations.length > 0) {
        setImmediate(async () => {
          for (const inv of createdInvitations) {
            if (inv.email) {
              try {
                const emailResult = await sendPartnerBulkInvitationEmail({
                  candidateEmail: inv.email,
                  candidateName: inv.name || undefined,
                  assessmentTypes: inv.assessmentTypes,
                  inviteToken: inv.inviteToken,
                  partnerCompanyName: partnerAccount?.companyName || partner.companyName || 'HumanMetrix Partner',
                  partnerLogoUrl: partnerAccount?.logoUrl,
                  partnerPrimaryColor: partnerAccount?.brandingPrimaryColor,
                  expiresAt: inv.expiresAt,
                });
                
                if (emailResult.success) {
                  await storage.updatePartnerCandidateInvitation(inv.id, {
                    status: 'sent',
                    emailSentAt: new Date(),
                  });
                  console.log(`Email sent to ${inv.email}`);
                }
              } catch (emailError: any) {
                console.error(`Failed to send email to ${inv.email}:`, emailError.message);
              }
            }
          }
        });
      }
    } catch (error: any) {
      console.error("Error creating bulk invitations:", error);
      res.status(500).json({ error: error.message || "Failed to create bulk invitations" });
    }
  });

  // Get candidate invitations for partner
  app.get("/api/partner/me/invitations", partnerAuth, async (req: PartnerRequest, res: Response) => {
    try {
      const partner = req.partner!;
      const { status, limit = '50', offset = '0' } = req.query;
      
      const invitations = await storage.getPartnerCandidateInvitations(partner.id, {
        status: status as string | undefined,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      });
      
      const total = await storage.countPartnerCandidateInvitations(partner.id, status as string | undefined);
      
      res.json({
        invitations,
        pagination: {
          total,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
        },
      });
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  // Get import history
  app.get("/api/partner/me/invitations/imports", partnerAuth, async (req: PartnerRequest, res: Response) => {
    try {
      const partner = req.partner!;
      const imports = await storage.getPartnerCandidateImports(partner.id, 20);
      res.json({ imports });
    } catch (error) {
      console.error("Error fetching imports:", error);
      res.status(500).json({ error: "Failed to fetch import history" });
    }
  });

  // Get import details with error report
  app.get("/api/partner/me/invitations/imports/:importId", partnerAuth, async (req: PartnerRequest, res: Response) => {
    try {
      const partner = req.partner!;
      const { importId } = req.params;
      
      const importRecord = await storage.getPartnerCandidateImport(importId);
      if (!importRecord || importRecord.partnerId !== partner.id) {
        return res.status(404).json({ error: "Import not found" });
      }
      
      const invitations = await storage.getPartnerCandidateInvitations(partner.id, { importId });
      
      res.json({
        import: importRecord,
        invitations,
      });
    } catch (error) {
      console.error("Error fetching import details:", error);
      res.status(500).json({ error: "Failed to fetch import details" });
    }
  });

  // ========================================
  // PUBLIC INVITE TOKEN VALIDATION
  // ========================================

  // Validate invite token and get invitation details (public endpoint - no auth required)
  app.get("/api/invite/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ error: "Missing invite token" });
      }
      
      const invitation = await storage.getPartnerCandidateInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ error: "Invalid or expired invitation" });
      }
      
      if (invitation.status === 'expired') {
        return res.status(410).json({ error: "This invitation has expired" });
      }
      
      if (invitation.status === 'completed') {
        return res.status(410).json({ error: "This invitation has already been completed" });
      }
      
      // Check if expired based on date
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        await storage.updatePartnerCandidateInvitation(invitation.id, { status: 'expired' });
        return res.status(410).json({ error: "This invitation has expired" });
      }
      
      // Get partner branding
      const partnerAccount = await storage.getPartnerAccount(invitation.partnerId);
      
      res.json({
        id: invitation.id,
        externalUserId: invitation.externalUserId,
        name: invitation.name,
        assessmentTypes: invitation.assessmentTypes,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        partnerName: partnerAccount?.companyName || 'HumanMetrix Partner',
        branding: partnerAccount?.brandingEnabled ? {
          enabled: true,
          primaryColor: partnerAccount.brandingPrimaryColor,
          accentColor: partnerAccount.brandingAccentColor,
          logoUrl: partnerAccount.logoUrl,
          welcomeTitle: partnerAccount.brandingWelcomeTitle,
          welcomeMessage: partnerAccount.brandingWelcomeMessage,
          companyDisplayName: partnerAccount.brandingCompanyDisplayName,
        } : null,
      });
    } catch (error) {
      console.error("Error validating invite token:", error);
      res.status(500).json({ error: "Failed to validate invitation" });
    }
  });

  // Create assessment session from invite token (public endpoint)
  app.post("/api/invite/:token/start", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { assessmentType } = req.body;
      
      if (!token || !assessmentType) {
        return res.status(400).json({ error: "Missing token or assessment type" });
      }
      
      const invitation = await storage.getPartnerCandidateInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ error: "Invalid or expired invitation" });
      }
      
      if (invitation.status === 'expired' || invitation.status === 'completed') {
        return res.status(410).json({ error: "This invitation is no longer valid" });
      }
      
      // Check if expired based on date
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        await storage.updatePartnerCandidateInvitation(invitation.id, { status: 'expired' });
        return res.status(410).json({ error: "This invitation has expired" });
      }
      
      // Verify assessment type is allowed
      const normalizedType = assessmentType.toLowerCase().replace(/-/g, '_');
      if (!invitation.assessmentTypes.includes(normalizedType)) {
        return res.status(400).json({ error: "Assessment type not included in this invitation" });
      }
      
      // Create assessment session
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session expiry
      
      const session = await storage.createAssessmentSession({
        partnerId: invitation.partnerId,
        partnerOrganisationId: null,
        apiKeyId: null,
        assessmentType: normalizedType,
        externalUserId: invitation.externalUserId,
        externalEmail: invitation.email,
        metadata: invitation.metadata,
        webhookUrl: null,
        expiresAt,
        status: 'pending',
        questionLocale: 'default',
      });
      
      // Update invitation status to started if not already
      if (invitation.status === 'pending' || invitation.status === 'sent') {
        await storage.updatePartnerCandidateInvitation(invitation.id, { 
          status: 'started',
          startedAt: new Date(),
        });
      }
      
      const baseUrl = getBaseUrl(req);
      
      res.json({
        sessionId: session.id,
        widgetUrl: `${baseUrl}/embed/assessment?session=${session.id}`,
        assessmentType: normalizedType,
      });
    } catch (error) {
      console.error("Error starting assessment from invite:", error);
      res.status(500).json({ error: "Failed to start assessment" });
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
