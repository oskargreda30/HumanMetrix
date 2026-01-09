import { Express, Request, Response } from "express";
import { storage } from "./storage";
import { partnerAuth, PartnerRequest, trackUsage, generateApiKey, consumeTestCredit } from "./partner-auth";
import { isAuthenticated } from "./auth";
import { sendPartnerQuotaWarning70, sendPartnerQuotaWarning90, sendPartnerAccessSuspendedEmail, sendPartnerAutoTopUpConfirmation, sendPartnerBulkInvitationEmail, sendB2BCongratulatoryEmail, sendB2BResultsEmail } from "./email";
import { generateB2BResultsPDF } from "./generateB2BPDF";
import { ASSESSMENT_TYPES, normalizeAssessmentId, type PartnerAccount, B2B_VOLUME_TIERS } from "@shared/schema";
import { getQuestionLocale, getPPPAdjustedPriceInPence, getStripeCurrencyCode, COUNTRY_CURRENCY_MAP, ZERO_DECIMAL_CURRENCIES, roundPriceUp, convertAndRoundToLocalCurrency } from "@shared/currencies";
import { getExchangeRates } from "./exchange-rates";
import { ASSESSMENT_PRICES, BASE_FEE } from "@shared/schema";
import { generateTemporaryPassword } from "./passwordUtils";
import bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import Stripe from "stripe";
import { createPaymentIntent, formatAmountForAirwallex, isAirwallexConfigured } from "./airwallex";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover" as any,
});

// Use Airwallex as the primary payment processor if configured, otherwise fall back to Stripe
const useAirwallex = () => isAirwallexConfigured();

// Volume-based pricing tiers using shared constants from schema
// Prices in USD cents - Tier assignment based on monthly volume commitment ($1.00 = 1 Credit, 6-month expiration)
const PACKAGE_TIERS = [
  { id: 'boutique', size: 50, pricePerTest: B2B_VOLUME_TIERS.BOUTIQUE.pricePerTest, name: B2B_VOLUME_TIERS.BOUTIQUE.name, tierVolume: B2B_VOLUME_TIERS.BOUTIQUE.volumeRange },
  { id: 'growth', size: 250, pricePerTest: B2B_VOLUME_TIERS.GROWTH.pricePerTest, name: B2B_VOLUME_TIERS.GROWTH.name, tierVolume: B2B_VOLUME_TIERS.GROWTH.volumeRange },
  { id: 'small_enterprise', size: 1000, pricePerTest: B2B_VOLUME_TIERS.SMALL_ENTERPRISE.pricePerTest, name: B2B_VOLUME_TIERS.SMALL_ENTERPRISE.name, tierVolume: B2B_VOLUME_TIERS.SMALL_ENTERPRISE.volumeRange },
  { id: 'enterprise', size: 5000, pricePerTest: B2B_VOLUME_TIERS.ENTERPRISE.pricePerTest, name: B2B_VOLUME_TIERS.ENTERPRISE.name, tierVolume: B2B_VOLUME_TIERS.ENTERPRISE.volumeRange },
  { id: 'pro', size: 10000, pricePerTest: B2B_VOLUME_TIERS.PRO.pricePerTest, name: B2B_VOLUME_TIERS.PRO.name, tierVolume: B2B_VOLUME_TIERS.PRO.volumeRange },
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
        const isTestKey = apiKey.environment === 'test';
        
        // Generate purchase portal link
        const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
        const purchaseUrl = domain 
          ? `https://${domain}/developers?tab=billing&action=purchase` 
          : 'http://localhost:5000/developers?tab=billing&action=purchase';
        
        // Only check quota for live API keys - test keys bypass quota checks
        if (!isTestKey) {
          // Check if partner has remaining quota before creating a session
          // Partners MUST have purchased test credits to use the API
          const quotaBalance = await storage.getPartnerQuotaBalance(partner.id);
          
          if (quotaBalance.testsPurchased <= 0) {
            return res.status(402).json({
              error: "No Credits Purchased",
              code: "NO_CREDITS",
              message: "You must purchase test credits before creating assessment sessions.",
              action: {
                label: "Purchase Credits",
                url: purchaseUrl,
              },
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
              code: "QUOTA_EXHAUSTED",
              message: "Your test quota has been exhausted. Purchase additional credits to continue.",
              action: {
                label: "Purchase More Credits",
                url: purchaseUrl,
              },
              quotaStatus: {
                testsPurchased: quotaBalance.testsPurchased,
                testsConsumed: quotaBalance.testsConsumed,
                remaining: quotaBalance.remaining,
              },
            });
          }
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
          isTestSession: isTestKey, // Mark as test session if created with a test API key
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
          apiKey.partnerOrganisationId, // Track usage per organisation
          isTestKey // Track as test mode usage
        );
        
        const widgetUrl = `${getBaseUrl(req)}/embed/assessment?session=${session.id}`;
        
        res.status(201).json({
          sessionId: session.id,
          assessmentType: normalizedType,
          status: session.status,
          expiresAt: session.expiresAt,
          widgetUrl,
          metadata: session.metadata,
          testMode: isTestKey, // Indicate to the client this is a test session
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
        const apiKey = req.apiKey!;
        const { sessionId } = req.params;
        
        const session = await storage.getAssessmentSession(sessionId);
        
        if (!session || session.partnerId !== partner.id) {
          return res.status(404).json({ error: "Session not found" });
        }
        
        // Block access to results for test sessions
        if (session.isTestSession) {
          return res.status(403).json({
            error: "Test Session Results Blocked",
            code: "TEST_SESSION_RESULTS_BLOCKED",
            message: "Results from test API key sessions cannot be accessed. Test sessions are for integration testing only. Use a live API key to create production sessions with accessible results.",
            testMode: true,
          });
        }
        
        if (session.status !== "completed") {
          return res.status(400).json({
            error: "Results not available",
            message: `Session status is "${session.status}". Results are only available for completed sessions.`,
          });
        }
        
        const isTestKey = apiKey.environment === 'test';
        
        await trackUsage(
          partner.id,
          apiKey.id,
          sessionId,
          "results_fetched",
          session.assessmentType,
          !isTestKey, // Only billable for live API keys
          isTestKey ? undefined : (partner.pricePerAssessment ?? undefined),
          apiKey.partnerOrganisationId,
          isTestKey
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
        
        const now = new Date();
        
        // Check for session expiry
        if (new Date(session.expiresAt) < now && session.status !== "completed") {
          await storage.updateAssessmentSession(sessionId, { status: "expired" });
          return res.status(400).json({ error: "Session has expired" });
        }
        
        // Check if paused session's grace period has expired
        if (session.pausedAt && session.pauseGraceExpiresAt && new Date(session.pauseGraceExpiresAt) < now) {
          await storage.updateAssessmentSession(sessionId, { status: "expired" } as any);
          return res.status(400).json({ 
            error: "Session expired",
            message: "The 30-minute grace period has expired. The session has been marked as expired."
          });
        }
        
        const partner = await storage.getPartnerAccount(session.partnerId);
        
        // Check if the API key used to create this session is still active
        let apiKeyActive = true;
        if (session.apiKeyId) {
          const apiKey = await storage.getPartnerApiKey(session.apiKeyId);
          apiKeyActive = apiKey?.isActive ?? true;
        }
        
        const response: any = {
          sessionId: session.id,
          assessmentType: session.assessmentType,
          status: session.status,
          externalUserId: session.externalUserId,
          externalEmail: session.externalEmail,
          partnerName: partner?.companyName || partner?.name,
          expiresAt: session.expiresAt,
          questionLocale: session.questionLocale || 'default',
          isTestSession: session.isTestSession || false, // Indicate if this is a test API key session
          apiKeyActive, // False if the API key was deactivated (e.g., quota exhausted)
          // Include saved progress for resume functionality
          savedAnswers: session.answers || null,
          lastAnsweredIndex: session.lastAnsweredIndex ?? null,
          lastActivityAt: session.lastActivityAt || null,
          // Pause state for timer synchronization
          isPaused: !!session.pausedAt,
          pausedAt: session.pausedAt || null,
          pausedTimeRemainingMs: session.pausedTimeRemainingMs ?? null,
          pauseGraceExpiresAt: session.pauseGraceExpiresAt || null,
          resumeCount: session.resumeCount || 0,
          canPauseAgain: (session.resumeCount || 0) < 1, // Can only pause once
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

  // Validation schema for session start
  const sessionStartSchema = z.object({
    email: z.string().email("Invalid email format").optional(),
    countryCode: z.string().length(2, "Country code must be 2 characters").regex(/^[A-Za-z]{2}$/, "Invalid country code format").transform(c => c.toUpperCase()).optional(),
  }).optional();

  app.post(
    "/api/embed/session/:sessionId/start",
    async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        
        // Validate input
        const parseResult = sessionStartSchema.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({ 
            error: "Invalid input", 
            details: parseResult.error.errors.map(e => e.message).join(', ') 
          });
        }
        
        const { email, countryCode } = parseResult.data || {};
        
        const session = await storage.getAssessmentSession(sessionId);
        
        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }
        
        if (new Date(session.expiresAt) < new Date()) {
          await storage.updateAssessmentSession(sessionId, { status: "expired" });
          return res.status(400).json({ error: "Session has expired" });
        }
        
        // Allow session to proceed if already started (but not completed/expired)
        if (session.status === "completed" || session.status === "expired") {
          return res.status(400).json({
            error: session.status === "completed" ? "Session already completed" : "Session has expired",
            status: session.status,
          });
        }
        
        // If already started, just return success without updating
        if (session.status === "started") {
          return res.json({
            sessionId: session.id,
            assessmentType: session.assessmentType,
            status: "started",
          });
        }
        
        // Build update object with email and country if provided
        const updateData: any = {
          status: "started",
          startedAt: new Date(),
        };
        
        // Save email if provided and session doesn't already have one
        if (email && !session.externalEmail) {
          updateData.externalEmail = email;
        }
        
        // Save country code for pricing calculation
        if (countryCode) {
          updateData.testerCountryCode = countryCode;
        }
        
        await storage.updateAssessmentSession(sessionId, updateData);
        
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

  // Save progress endpoint - allows incremental answer saving
  app.patch(
    "/api/embed/session/:sessionId/progress",
    async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        const { answers, lastAnsweredIndex } = req.body;
        
        const session = await storage.getAssessmentSession(sessionId);
        
        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }
        
        // Only allow saving progress for started sessions
        if (session.status !== "started" && session.status !== "created") {
          return res.status(400).json({
            error: "Cannot save progress for this session",
            status: session.status,
          });
        }
        
        // Check if session has expired
        if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
          await storage.updateAssessmentSession(sessionId, { status: "expired" } as any);
          return res.status(400).json({ error: "Session has expired" });
        }
        
        // Merge new answers with existing answers
        const existingAnswers = session.answers || {};
        const mergedAnswers = { ...existingAnswers, ...answers };
        
        await storage.updateAssessmentSession(sessionId, {
          answers: mergedAnswers,
          lastAnsweredIndex: lastAnsweredIndex ?? session.lastAnsweredIndex,
          lastActivityAt: new Date(),
          status: session.status === "created" ? "started" : session.status,
        } as any);
        
        res.json({
          success: true,
          savedAnswerCount: Object.keys(mergedAnswers).length,
          lastAnsweredIndex: lastAnsweredIndex ?? session.lastAnsweredIndex,
        });
      } catch (error) {
        console.error("Error saving session progress:", error);
        res.status(500).json({ error: "Failed to save progress" });
      }
    }
  );

  // Pause session endpoint - called when window is closed/hidden
  // Allows one 30-minute grace period to return and resume
  app.post(
    "/api/embed/session/:sessionId/pause",
    async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        const { timeRemainingMs } = req.body;
        
        if (typeof timeRemainingMs !== 'number' || timeRemainingMs < 0) {
          return res.status(400).json({ error: "Invalid timeRemainingMs" });
        }
        
        const session = await storage.getAssessmentSession(sessionId);
        
        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }
        
        // Only allow pausing started sessions that aren't already completed/expired
        if (session.status !== "started") {
          return res.status(400).json({
            error: "Cannot pause session",
            message: `Session status is "${session.status}". Only started sessions can be paused.`,
          });
        }
        
        // Check if already used their one grace period (resumeCount >= 1)
        if ((session.resumeCount || 0) >= 1) {
          // Already used grace period - expire the session immediately
          await storage.updateAssessmentSession(sessionId, { 
            status: "expired",
            pausedAt: new Date(),
          } as any);
          return res.status(400).json({ 
            error: "Session expired",
            message: "You have already used your one-time resume. The session has expired.",
          });
        }
        
        // Check if already paused
        if (session.pausedAt) {
          return res.status(400).json({
            error: "Session already paused",
            message: "Session is already paused. Use the resume endpoint to continue.",
          });
        }
        
        // Set 30-minute grace period
        const now = new Date();
        const graceExpiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
        
        await storage.updateAssessmentSession(sessionId, {
          pausedAt: now,
          pausedTimeRemainingMs: Math.floor(timeRemainingMs),
          pauseGraceExpiresAt: graceExpiresAt,
        } as any);
        
        console.log(`[Session Pause] Session ${sessionId} paused with ${Math.floor(timeRemainingMs / 1000)}s remaining. Grace expires at ${graceExpiresAt.toISOString()}`);
        
        res.json({
          success: true,
          pausedAt: now.toISOString(),
          graceExpiresAt: graceExpiresAt.toISOString(),
          timeRemainingMs: Math.floor(timeRemainingMs),
        });
      } catch (error) {
        console.error("Error pausing session:", error);
        res.status(500).json({ error: "Failed to pause session" });
      }
    }
  );

  // Resume session endpoint - called when returning to a paused session
  app.post(
    "/api/embed/session/:sessionId/resume",
    async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        
        const session = await storage.getAssessmentSession(sessionId);
        
        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }
        
        // Check if session is paused
        if (!session.pausedAt) {
          return res.status(400).json({
            error: "Session not paused",
            message: "Session is not currently paused.",
          });
        }
        
        // Check if grace period has expired
        const now = new Date();
        if (session.pauseGraceExpiresAt && new Date(session.pauseGraceExpiresAt) < now) {
          // Grace period expired - expire the session
          await storage.updateAssessmentSession(sessionId, { 
            status: "expired",
          } as any);
          return res.status(400).json({
            error: "Grace period expired",
            message: "The 30-minute grace period has expired. The session has been marked as expired.",
          });
        }
        
        // Resume the session - increment resume count and clear pause state
        const newResumeCount = (session.resumeCount || 0) + 1;
        
        await storage.updateAssessmentSession(sessionId, {
          pausedAt: null,
          resumeCount: newResumeCount,
          lastActivityAt: now,
        } as any);
        
        console.log(`[Session Resume] Session ${sessionId} resumed. Resume count: ${newResumeCount}. Time remaining: ${session.pausedTimeRemainingMs}ms`);
        
        res.json({
          success: true,
          resumedAt: now.toISOString(),
          timeRemainingMs: session.pausedTimeRemainingMs || 0,
          resumeCount: newResumeCount,
          canPauseAgain: false, // Only one grace period allowed
        });
      } catch (error) {
        console.error("Error resuming session:", error);
        res.status(500).json({ error: "Failed to resume session" });
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
        
        const { answers: submittedAnswers } = parseResult.data;
        
        // Merge saved answers with submitted answers (submitted takes precedence)
        const savedAnswers = session.answers || {};
        const answers = { ...savedAnswers, ...submittedAnswers };
        
        // Check if this is a test session (created with test API key)
        const isTestSession = session.isTestSession === true;
        
        // For test sessions, use dummy scores without AI computation
        // This saves API costs and is appropriate since test sessions are for developer integration only
        const { scores, totalScore, percentile, evaluations } = await calculateScores(
          session.assessmentType,
          answers,
          isTestSession // Skip AI computation for test sessions
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
          !isTestSession, // Only billable for non-test sessions
          isTestSession ? undefined : (partner?.pricePerAssessment || 500),
          null, // partnerOrganisationId
          isTestSession // Mark as test mode
        );
        
        // Skip credit consumption and quota warnings for test sessions
        if (!isTestSession) {
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
          } as Record<string, any>,
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
        
        // B2B Test-Taker Results Monetization: Set results unlock date (30 days) and send congratulatory email
        // Skip email workflow for test sessions - these are for developer integration only
        let resultsUnlockAt: Date | undefined;
        if (!isTestSession) {
          const completedAt = new Date();
          resultsUnlockAt = new Date(completedAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later
          
          // Update session with results unlock date
          await storage.updateAssessmentSession(sessionId, {
            resultsUnlockAt,
            resultsPaymentStatus: 'unpaid',
          } as any);
        }
        
        // If test-taker has an email, send congratulatory email with payment option
        // Skip for test sessions - no emails should be sent for test API key sessions
        if (session.externalEmail && partner && !isTestSession && resultsUnlockAt) {
          try {
            // Calculate 75% of B2C price for test-taker's location
            const countryCode = session.testerCountryCode || 'GB';
            const assessmentType = normalizeAssessmentId(session.assessmentType);
            const basePriceInPence = ASSESSMENT_PRICES[assessmentType] || 500;
            const pppAdjustedPence = getPPPAdjustedPriceInPence(basePriceInPence, countryCode);
            
            // 75% discount for B2B test-takers
            const discountedPence = Math.round(pppAdjustedPence * 0.75);
            
            // Get currency for the country
            const currencyCode = getStripeCurrencyCode(countryCode);
            const exchangeRates = await getExchangeRates();
            
            // Convert to local currency with rounding
            let displayPrice: string;
            let originalDisplayPrice: string;
            let stripeAmount: number;
            const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(currencyCode.toUpperCase() as any);
            
            if (currencyCode.toUpperCase() === 'GBP') {
              // Already in pence
              stripeAmount = discountedPence;
              displayPrice = `£${(discountedPence / 100).toFixed(2)}`;
              originalDisplayPrice = `£${(pppAdjustedPence / 100).toFixed(2)}`;
            } else {
              // Convert from GBP to local currency
              const gbpRate = exchangeRates.rates['GBP'] || 1;
              const targetRate = exchangeRates.rates[currencyCode.toUpperCase()] || gbpRate;
              const localAmount = (discountedPence / 100) * (targetRate / gbpRate);
              const originalLocalAmount = (pppAdjustedPence / 100) * (targetRate / gbpRate);
              const roundedAmount = roundPriceUp(localAmount);
              const roundedOriginalAmount = roundPriceUp(originalLocalAmount);
              
              if (isZeroDecimal) {
                stripeAmount = Math.round(roundedAmount);
                displayPrice = `${currencyCode.toUpperCase()} ${stripeAmount.toLocaleString()}`;
                originalDisplayPrice = `${currencyCode.toUpperCase()} ${Math.round(roundedOriginalAmount).toLocaleString()}`;
              } else {
                stripeAmount = Math.round(roundedAmount * 100);
                displayPrice = `${currencyCode.toUpperCase()} ${roundedAmount.toFixed(2)}`;
                originalDisplayPrice = `${currencyCode.toUpperCase()} ${roundedOriginalAmount.toFixed(2)}`;
              }
            }
            
            // Store pricing info in session for checkout
            await storage.updateAssessmentSession(sessionId, {
              resultsPaymentAmount: stripeAmount,
              resultsPaymentCurrency: currencyCode,
            } as any);
            
            // Generate payment URL
            const baseUrl = process.env.REPLIT_DEV_DOMAIN 
              ? `https://${process.env.REPLIT_DEV_DOMAIN}`
              : 'https://humanmetrix.co.uk';
            const paymentUrl = `${baseUrl}/b2b-results-payment/${sessionId}`;
            
            // Send congratulatory email
            await sendB2BCongratulatoryEmail({
              email: session.externalEmail,
              assessmentType: session.assessmentType,
              partnerCompanyName: partner.companyName || partner.name,
              paymentUrl,
              paymentAmount: displayPrice,
              originalPaymentAmount: originalDisplayPrice,
              freeUnlockDate: resultsUnlockAt,
            });
            
            // Mark email as sent
            await storage.updateAssessmentSession(sessionId, {
              congratsEmailSentAt: new Date(),
            } as any);
            
            console.log(`[B2B Results] Congratulatory email sent to ${session.externalEmail} for session ${sessionId}`);
          } catch (emailError) {
            console.error(`[B2B Results] Failed to send congratulatory email for session ${sessionId}:`, emailError);
            // Don't fail the request if email fails
          }
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

  // ========================================
  // B2B TEST-TAKER RESULTS PAYMENT
  // ========================================
  
  // Get B2B test-taker results pricing for a session
  app.get("/api/b2b-results/:sessionId/pricing", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getAssessmentSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if (session.status !== 'completed') {
        return res.status(400).json({ error: "Assessment not completed" });
      }
      
      // Check if already paid or free period passed
      if (session.resultsPaymentStatus === 'paid') {
        return res.json({
          unlocked: true,
          method: 'paid',
          paidAt: session.resultsPaidAt,
        });
      }
      
      if (session.resultsUnlockAt && new Date(session.resultsUnlockAt) <= new Date()) {
        // Mark as free unlock
        await storage.updateAssessmentSession(sessionId, {
          resultsPaymentStatus: 'free',
        } as any);
        
        return res.json({
          unlocked: true,
          method: 'free',
          freeUnlockAt: session.resultsUnlockAt,
        });
      }
      
      // Results not yet unlocked - return pricing
      const countryCode = session.testerCountryCode || 'GB';
      const assessmentType = normalizeAssessmentId(session.assessmentType);
      const basePriceInPence = ASSESSMENT_PRICES[assessmentType] || 500;
      const pppAdjustedPence = getPPPAdjustedPriceInPence(basePriceInPence, countryCode);
      const discountedPence = Math.round(pppAdjustedPence * 0.75); // 75% of B2C price
      
      const currencyCode = getStripeCurrencyCode(countryCode);
      const exchangeRates = await getExchangeRates();
      const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(currencyCode.toUpperCase() as any);
      
      let displayPrice: string;
      let originalDisplayPrice: string;
      let stripeAmount: number;
      
      if (currencyCode.toUpperCase() === 'GBP') {
        stripeAmount = discountedPence;
        displayPrice = `${(discountedPence / 100).toFixed(2)}`;
        originalDisplayPrice = `${(pppAdjustedPence / 100).toFixed(2)}`;
      } else {
        const gbpRate = exchangeRates.rates['GBP'] || 1;
        const targetRate = exchangeRates.rates[currencyCode.toUpperCase()] || gbpRate;
        const localAmount = (discountedPence / 100) * (targetRate / gbpRate);
        const originalLocalAmount = (pppAdjustedPence / 100) * (targetRate / gbpRate);
        const roundedAmount = roundPriceUp(localAmount);
        const roundedOriginalAmount = roundPriceUp(originalLocalAmount);
        
        if (isZeroDecimal) {
          stripeAmount = Math.round(roundedAmount);
          displayPrice = `${roundedAmount.toLocaleString()}`;
          originalDisplayPrice = `${roundedOriginalAmount.toLocaleString()}`;
        } else {
          stripeAmount = Math.round(roundedAmount * 100);
          displayPrice = roundedAmount.toFixed(2);
          originalDisplayPrice = roundedOriginalAmount.toFixed(2);
        }
      }
      
      const partner = await storage.getPartnerAccount(session.partnerId);
      
      res.json({
        unlocked: false,
        sessionId: session.id,
        assessmentType: session.assessmentType,
        partnerCompanyName: partner?.companyName || partner?.name || 'Partner',
        pricing: {
          amount: stripeAmount,
          currency: currencyCode,
          displayPrice,
          originalDisplayPrice,
          isZeroDecimal,
        },
        freeUnlockAt: session.resultsUnlockAt,
        daysUntilFree: session.resultsUnlockAt 
          ? Math.ceil((new Date(session.resultsUnlockAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : 30,
      });
    } catch (error) {
      console.error("Error fetching B2B results pricing:", error);
      res.status(500).json({ error: "Failed to fetch pricing" });
    }
  });
  
  // Create Stripe checkout session for B2B results payment
  app.post("/api/b2b-results/:sessionId/checkout", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getAssessmentSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if (session.status !== 'completed') {
        return res.status(400).json({ error: "Assessment not completed" });
      }
      
      if (session.resultsPaymentStatus === 'paid') {
        return res.status(400).json({ error: "Results already unlocked" });
      }
      
      // Check if free period has passed
      if (session.resultsUnlockAt && new Date(session.resultsUnlockAt) <= new Date()) {
        return res.status(400).json({ error: "Results are now free to access" });
      }
      
      // Calculate pricing
      const countryCode = session.testerCountryCode || 'GB';
      const assessmentType = normalizeAssessmentId(session.assessmentType);
      const basePriceInPence = ASSESSMENT_PRICES[assessmentType] || 500;
      const pppAdjustedPence = getPPPAdjustedPriceInPence(basePriceInPence, countryCode);
      const discountedPence = Math.round(pppAdjustedPence * 0.75);
      
      const currencyCode = getStripeCurrencyCode(countryCode);
      const exchangeRates = await getExchangeRates();
      const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(currencyCode.toUpperCase() as any);
      
      let stripeAmount: number;
      
      if (currencyCode.toUpperCase() === 'GBP') {
        stripeAmount = discountedPence;
      } else {
        const gbpRate = exchangeRates.rates['GBP'] || 1;
        const targetRate = exchangeRates.rates[currencyCode.toUpperCase()] || gbpRate;
        const localAmount = (discountedPence / 100) * (targetRate / gbpRate);
        const roundedAmount = roundPriceUp(localAmount);
        
        if (isZeroDecimal) {
          stripeAmount = Math.round(roundedAmount);
        } else {
          stripeAmount = Math.round(roundedAmount * 100);
        }
      }
      
      const partner = await storage.getPartnerAccount(session.partnerId);
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'https://humanmetrix.co.uk';
      
      const assessmentNames: Record<string, string> = {
        'fit': 'FIT Assessment',
        'ai_readiness': 'AI Readiness Assessment',
        'prompt_architecture': 'Prompt Architecture Assessment',
        'aiq': 'AIQ Assessment',
      };
      
      // Use Airwallex if configured, otherwise fall back to Stripe
      if (useAirwallex()) {
        // Create Airwallex payment intent
        const airwallexAmount = formatAmountForAirwallex(stripeAmount);
        const merchantOrderId = `b2b_results_${sessionId}_${Date.now()}`;
        
        const paymentIntent = await createPaymentIntent({
          amount: airwallexAmount,
          currency: currencyCode.toUpperCase(),
          merchantOrderId,
          returnUrl: `${baseUrl}/b2b-results-success/${sessionId}`,
          customerEmail: session.externalEmail || undefined,
          description: `${assessmentNames[assessmentType] || 'Assessment'} Results`,
          metadata: {
            type: 'b2b_results_unlock',
            sessionId: session.id,
            assessmentType: session.assessmentType,
            partnerId: session.partnerId,
          },
        });
        
        // Store Airwallex payment intent ID
        await storage.updateAssessmentSession(sessionId, {
          resultsAirwallexIntentId: paymentIntent.id,
        } as any);
        
        res.json({
          provider: 'airwallex',
          intentId: paymentIntent.id,
          clientSecret: paymentIntent.clientSecret,
          currency: currencyCode.toUpperCase(),
          countryCode: countryCode,
          amount: airwallexAmount,
        });
      } else {
        // Fall back to Stripe checkout session
        const checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: currencyCode.toLowerCase(),
              product_data: {
                name: `${assessmentNames[assessmentType] || 'Assessment'} Results`,
                description: `Unlock your detailed assessment results and personalized insights`,
              },
              unit_amount: stripeAmount,
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: `${baseUrl}/b2b-results-success/${sessionId}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/b2b-results-payment/${sessionId}`,
          customer_email: session.externalEmail || undefined,
          metadata: {
            type: 'b2b_results_unlock',
            sessionId: session.id,
            assessmentType: session.assessmentType,
            partnerId: session.partnerId,
          },
        });
        
        // Store Stripe session ID
        await storage.updateAssessmentSession(sessionId, {
          resultsStripeSessionId: checkoutSession.id,
        } as any);
        
        res.json({
          provider: 'stripe',
          checkoutUrl: checkoutSession.url,
          stripeSessionId: checkoutSession.id,
        });
      }
    } catch (error) {
      console.error("Error creating B2B results checkout:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });
  
  // Verify B2B results payment and unlock results
  app.post("/api/b2b-results/:sessionId/verify-payment", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { stripeSessionId, airwallexIntentId, provider } = req.body;
      
      const session = await storage.getAssessmentSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      let paymentAmount: number | null = null;
      let paymentCurrency: string | null = null;
      
      if (provider === 'airwallex' && airwallexIntentId) {
        // Verify Airwallex payment intent
        const { getPaymentIntent } = await import("./airwallex");
        const paymentIntent = await getPaymentIntent(airwallexIntentId);
        
        if (paymentIntent.status !== 'SUCCEEDED') {
          return res.status(400).json({ error: "Payment not completed" });
        }
        
        if (paymentIntent.metadata?.sessionId !== sessionId) {
          return res.status(400).json({ error: "Payment session mismatch" });
        }
        
        paymentAmount = Math.round(paymentIntent.amount * 100); // Convert to pence
        paymentCurrency = paymentIntent.currency?.toLowerCase();
      } else if (stripeSessionId) {
        // Verify the Stripe session (fallback)
        const stripeSession = await stripe.checkout.sessions.retrieve(stripeSessionId);
        
        if (stripeSession.payment_status !== 'paid') {
          return res.status(400).json({ error: "Payment not completed" });
        }
        
        if (stripeSession.metadata?.sessionId !== sessionId) {
          return res.status(400).json({ error: "Payment session mismatch" });
        }
        
        paymentAmount = stripeSession.amount_total;
        paymentCurrency = stripeSession.currency;
      } else {
        return res.status(400).json({ error: "No payment session provided" });
      }
      
      // Mark as paid
      await storage.updateAssessmentSession(sessionId, {
        resultsPaymentStatus: 'paid',
        resultsPaidAt: new Date(),
        resultsPaymentAmount: paymentAmount,
        resultsPaymentCurrency: paymentCurrency,
      } as any);
      
      // Send results email with PDF if email is available
      if (session.externalEmail) {
        try {
          const partner = await storage.getPartnerAccount(session.partnerId);
          const assessmentName = normalizeAssessmentId(session.assessmentType).toUpperCase().replace('_', ' ');
          
          // Generate proper PDF with real assessment results
          const pdfBuffer = generateB2BResultsPDF({
            candidateName: session.externalUserId || undefined,
            candidateEmail: session.externalEmail,
            assessmentType: session.assessmentType,
            scores: session.scores || {},
            totalScore: session.totalScore || undefined,
            percentile: session.percentile || undefined,
            evaluations: session.evaluations || undefined,
            completedAt: session.completedAt || new Date(),
            partnerCompanyName: partner?.companyName || partner?.name || 'HumanMetrix Partner',
          });
          const pdfFilename = `${assessmentName.replace(/\s/g, '_')}_Results.pdf`;
          
          await sendB2BResultsEmail({
            email: session.externalEmail,
            candidateName: session.externalUserId || undefined,
            assessmentType: session.assessmentType,
            partnerCompanyName: partner?.companyName || partner?.name || 'HumanMetrix Partner',
            pdfBuffer,
            pdfFilename,
          });
          
          // Mark results email as sent
          await storage.updateAssessmentSession(sessionId, {
            resultsEmailSentAt: new Date(),
          } as any);
          
          console.log(`[B2B Results] Results email sent to ${session.externalEmail} after payment for session ${sessionId}`);
        } catch (emailError) {
          console.error(`[B2B Results] Failed to send results email for session ${sessionId}:`, emailError);
          // Don't fail the request if email fails
        }
      }
      
      res.json({
        success: true,
        unlocked: true,
        paidAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error verifying B2B results payment:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

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

  // Get partner's prepaid balance for token preview (session-based auth for dashboard)
  app.get("/api/partner/me/quota", isAuthenticated, async (req: any, res: Response) => {
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
      
      const balance = await storage.getPartnerQuotaBalance(partner.id);
      
      res.json({
        billingType: partner.billingType || 'prepaid',
        testsPurchased: balance.testsPurchased,
        testsConsumed: balance.testsConsumed,
        testsRemaining: balance.remaining,
        freeTestsRemaining: partner.freeTestsAllocated || 0,
        prepaidBalance: partner.prepaidBalance || 0,
        prepaidCreditsExpiresAt: partner.prepaidCreditsExpiresAt,
      });
    } catch (error) {
      console.error("Error fetching quota:", error);
      res.status(500).json({ error: "Failed to fetch quota" });
    }
  });
  
  // Get partner's prepaid balance via API key (for external API access)
  app.get("/api/partner/quota", partnerAuth(), async (req: PartnerRequest, res: Response) => {
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
          externalUserId: z.string().transform(s => s.trim()).optional().nullable(),
          email: z.string().transform(s => s.trim()).pipe(
            z.union([z.literal(''), z.string().email("Invalid email format")])
          ).optional().nullable(),
          name: z.string().optional().nullable(),
          metadata: z.record(z.any()).optional().nullable(),
        })).min(1, "At least one candidate required").max(500, "Maximum 500 candidates per batch"),
        assessmentTypes: z.array(z.string()).min(1, "At least one assessment type required"),
        sendEmails: z.boolean().default(true),
        expiresInDays: z.number().min(1).max(30).default(7), // 7-day default expiry
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
      const seenEmails = new Map<string, number>();
      
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const row = i + 1;
        const identifier = candidate.email || candidate.externalUserId || `row-${row}`;
        
        // Email is now required (externalUserId is optional)
        if (!candidate.email || candidate.email.trim() === '') {
          validationErrors.push({ row, externalUserId: identifier, field: 'email', error: 'Email is required' });
          continue;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(candidate.email.trim())) {
          validationErrors.push({ row, externalUserId: identifier, field: 'email', error: 'Invalid email format' });
          continue;
        }
        
        // Check for duplicate emails within batch
        const existingRow = seenEmails.get(candidate.email.toLowerCase());
        if (existingRow !== undefined) {
          validationErrors.push({ row, externalUserId: identifier, field: 'email', error: `Duplicate of row ${existingRow}` });
          continue;
        }
        seenEmails.set(candidate.email.toLowerCase(), row);
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
      const candidatePasswords: Map<string, { password: string; userId: string; isNewUser: boolean }> = new Map();
      
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        
        try {
          // Note: We allow re-inviting the same candidate multiple times
          // Each invitation creates a new "testing series" with fresh assessment sessions
          // This matches the behavior of logged-in candidates starting new assessments
          
          // If candidate has email, ensure they have a user account
          if (candidate.email) {
            const existingUser = await storage.getUserByEmail(candidate.email);
            
            if (!existingUser) {
              // Create new user account with generated password
              const temporaryPassword = generateTemporaryPassword();
              const passwordHash = await bcrypt.hash(temporaryPassword, 10);
              
              // Parse name into first and last name
              const nameParts = (candidate.name || '').trim().split(' ');
              const firstName = nameParts[0] || undefined;
              const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;
              
              const newUser = await storage.createUser({
                email: candidate.email,
                passwordHash,
                firstName,
                lastName,
                role: 'partner_candidate',
              });
              
              candidatePasswords.set(candidate.email, {
                password: temporaryPassword,
                userId: newUser.id,
                isNewUser: true,
              });
              console.log(`[Bulk Invitations] Created new user for ${candidate.email}`);
            } else {
              // User already exists - no new password needed
              candidatePasswords.set(candidate.email, {
                password: '', // Empty - they use existing password
                userId: existingUser.id,
                isNewUser: false,
              });
            }
          }
          
          // Generate unique invite token
          const inviteToken = crypto.randomUUID().replace(/-/g, '');
          const inviteUrl = `${baseUrl}/invite/${inviteToken}`;
          
          // Use email as externalUserId if not provided
          const effectiveExternalUserId = (candidate.externalUserId?.trim()) || candidate.email!;
          
          invitations.push({
            partnerId: partner.id,
            importId: importRecord.id,
            externalUserId: effectiveExternalUserId,
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
          const identifier = candidate.email || candidate.externalUserId || `row-${i + 1}`;
          errors.push({
            row: i + 1,
            externalUserId: identifier,
            error: err.message || 'Unknown error',
          });
        }
      }
      
      // Bulk insert invitations
      console.log(`[Bulk Invitations] Prepared ${invitations.length} invitations, ${errors.length} errors`);
      let createdInvitations: any[] = [];
      if (invitations.length > 0) {
        console.log('[Bulk Invitations] Inserting invitations into database...');
        createdInvitations = await storage.createPartnerCandidateInvitationsBulk(invitations);
        console.log(`[Bulk Invitations] Created ${createdInvitations.length} invitations successfully`);
        
        // Note: Tokens are deducted when assessment sessions are actually started,
        // not when invitations are created. This prevents charging for unused invitations.
        
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
                // Get the password info for this candidate
                const passwordInfo = candidatePasswords.get(inv.email);
                
                const emailResult = await sendPartnerBulkInvitationEmail({
                  candidateEmail: inv.email,
                  candidateName: inv.name || undefined,
                  assessmentTypes: inv.assessmentTypes,
                  inviteToken: inv.inviteToken,
                  partnerCompanyName: partnerAccount?.companyName || partner.companyName || 'HumanMetrix Partner',
                  partnerLogoUrl: partnerAccount?.logoUrl,
                  partnerPrimaryColor: partnerAccount?.brandingPrimaryColor,
                  expiresAt: inv.expiresAt,
                  // Include password for new users
                  temporaryPassword: passwordInfo?.isNewUser ? passwordInfo.password : undefined,
                });
                
                if (emailResult.success) {
                  await storage.updatePartnerCandidateInvitation(inv.id, {
                    status: 'sent',
                    emailSentAt: new Date(),
                  });
                  console.log(`Email sent to ${inv.email}${passwordInfo?.isNewUser ? ' (with credentials)' : ''}`);
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
  app.get("/api/partner/me/invitations", isAuthenticated, async (req: any, res: Response) => {
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
  app.get("/api/partner/me/invitations/imports", isAuthenticated, async (req: any, res: Response) => {
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
      
      const imports = await storage.getPartnerCandidateImports(partner.id, 20);
      res.json({ imports });
    } catch (error) {
      console.error("Error fetching imports:", error);
      res.status(500).json({ error: "Failed to fetch import history" });
    }
  });

  // Get import details with error report
  app.get("/api/partner/me/invitations/imports/:importId", isAuthenticated, async (req: any, res: Response) => {
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
      console.log(`[Invite Validation] Checking token: ${token}`);
      
      if (!token) {
        return res.status(400).json({ error: "Missing invite token" });
      }
      
      const invitation = await storage.getPartnerCandidateInvitationByToken(token);
      console.log(`[Invite Validation] Found invitation:`, invitation ? invitation.id : 'null');
      
      if (!invitation) {
        console.log(`[Invite Validation] No invitation found for token: ${token}`);
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
        status: 'created',
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

  // ========== Card Management Endpoints (for Prepaid Partners) ==========
  
  // Create Stripe Setup Intent for saving card
  app.post("/api/partner/card/setup-intent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Get partner account for this user
      const partner = await storage.getPartnerAccountByEmail(user.email);
      if (!partner) {
        return res.status(403).json({ error: "Not a partner account" });
      }
      
      // Only prepaid partners can save cards for overage billing
      if (partner.billingType !== 'prepaid') {
        return res.status(400).json({ error: "Card-on-file is only available for prepaid partners" });
      }
      
      // Create or retrieve Stripe customer
      let stripeCustomerId = partner.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: partner.billingEmail || partner.email,
          name: partner.companyName || partner.name,
          metadata: {
            partnerId: partner.id,
          },
        });
        stripeCustomerId = customer.id;
        await storage.updatePartnerAccount(partner.id, { stripeCustomerId });
      }
      
      // Create a SetupIntent to collect card details
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        metadata: {
          partnerId: partner.id,
          purpose: 'overage_billing',
        },
      });
      
      res.json({
        clientSecret: setupIntent.client_secret,
      });
    } catch (error) {
      console.error("Error creating setup intent:", error);
      res.status(500).json({ error: "Failed to create payment setup" });
    }
  });
  
  // Confirm card was saved and update partner record
  app.post("/api/partner/card/confirm", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { paymentMethodId } = req.body;
      if (!paymentMethodId) {
        return res.status(400).json({ error: "Payment method ID required" });
      }
      
      // Get partner account for this user
      const partner = await storage.getPartnerAccountByEmail(user.email);
      if (!partner) {
        return res.status(403).json({ error: "Not a partner account" });
      }
      
      // Retrieve payment method to get card details
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (!paymentMethod.card) {
        return res.status(400).json({ error: "Invalid payment method" });
      }
      
      // Set as default payment method for customer
      if (partner.stripeCustomerId) {
        await stripe.customers.update(partner.stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }
      
      // Update partner record with card info
      await storage.updatePartnerCardInfo(partner.id, {
        stripePaymentMethodId: paymentMethodId,
        cardLast4: paymentMethod.card.last4,
        cardBrand: paymentMethod.card.brand,
        cardOnFile: true,
      });
      
      res.json({
        success: true,
        cardLast4: paymentMethod.card.last4,
        cardBrand: paymentMethod.card.brand,
      });
    } catch (error) {
      console.error("Error confirming card:", error);
      res.status(500).json({ error: "Failed to save card" });
    }
  });
  
  // Get current card status
  app.get("/api/partner/card/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const partner = await storage.getPartnerAccountByEmail(user.email);
      if (!partner) {
        return res.status(403).json({ error: "Not a partner account" });
      }
      
      res.json({
        hasCard: partner.cardOnFile || false,
        cardLast4: partner.cardLast4,
        cardBrand: partner.cardBrand,
        overageRatePerTest: partner.overageRatePerTest || 500, // Default 5.00 GBP
        billingType: partner.billingType,
      });
    } catch (error) {
      console.error("Error getting card status:", error);
      res.status(500).json({ error: "Failed to get card status" });
    }
  });
  
  // Remove saved card
  app.delete("/api/partner/card", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const partner = await storage.getPartnerAccountByEmail(user.email);
      if (!partner) {
        return res.status(403).json({ error: "Not a partner account" });
      }
      
      // Detach payment method from Stripe if it exists
      if (partner.stripePaymentMethodId) {
        try {
          await stripe.paymentMethods.detach(partner.stripePaymentMethodId);
        } catch (e) {
          console.log("Payment method already detached or not found");
        }
      }
      
      // Remove card info from partner record
      await storage.removePartnerCard(partner.id);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing card:", error);
      res.status(500).json({ error: "Failed to remove card" });
    }
  });
  
  // Get overage billing history
  app.get("/api/partner/overage-history", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const partner = await storage.getPartnerAccountByEmail(user.email);
      if (!partner) {
        return res.status(403).json({ error: "Not a partner account" });
      }
      
      const history = await storage.getOverageLedgerByPartner(partner.id);
      
      res.json(history);
    } catch (error) {
      console.error("Error getting overage history:", error);
      res.status(500).json({ error: "Failed to get overage history" });
    }
  });

  // ========== Billing Scheduler Endpoint (called by cron job on 1st of month) ==========
  
  // Process all pending overage charges for prepaid partners with cards on file
  app.post("/api/internal/process-overage-billing", async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const pendingCharges = await storage.getPendingOverageCharges();
      const results = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        errors: [] as string[],
      };
      
      // Track amounts billed per partner for accurate pendingOverageAmount updates
      const billedByPartner: Map<string, number> = new Map();
      
      for (const charge of pendingCharges) {
        results.processed++;
        
        try {
          const partner = await storage.getPartnerAccount(charge.partnerId);
          if (!partner) {
            results.failed++;
            results.errors.push(`Partner ${charge.partnerId} not found`);
            continue;
          }
          
          if (!partner.stripeCustomerId || !partner.stripePaymentMethodId) {
            results.failed++;
            await storage.updateOverageLedgerEntry(charge.id, { chargeStatus: 'failed' });
            results.errors.push(`Partner ${charge.partnerId} missing payment method`);
            continue;
          }
          
          // Create payment intent for the overage amount
          const paymentIntent = await stripe.paymentIntents.create({
            amount: charge.totalAmount,
            currency: 'gbp',
            customer: partner.stripeCustomerId,
            payment_method: partner.stripePaymentMethodId,
            off_session: true,
            confirm: true,
            description: `Overage billing for ${charge.billingMonth}: ${charge.testsOverLimit} tests`,
            metadata: {
              partnerId: partner.id,
              overageLedgerId: charge.id,
              billingMonth: charge.billingMonth,
              testsOverLimit: charge.testsOverLimit.toString(),
            },
          });
          
          if (paymentIntent.status === 'succeeded') {
            // Update ledger entry as paid
            await storage.updateOverageLedgerEntry(charge.id, {
              chargeStatus: 'paid',
              stripePaymentIntentId: paymentIntent.id,
            });
            
            // Track billed amount for this partner
            billedByPartner.set(
              partner.id, 
              (billedByPartner.get(partner.id) || 0) + charge.totalAmount
            );
            
            // Create success notification
            await storage.createPartnerNotification({
              partnerId: partner.id,
              type: 'billing_success',
              title: 'Overage Billing Processed',
              message: `Your overage charges for ${charge.billingMonth} (£${(charge.totalAmount / 100).toFixed(2)} for ${charge.testsOverLimit} tests) have been successfully billed.`,
              metadata: { billingMonth: charge.billingMonth, amount: charge.totalAmount, tests: charge.testsOverLimit } as Record<string, any>,
            });
            
            results.succeeded++;
          } else {
            await storage.updateOverageLedgerEntry(charge.id, { chargeStatus: 'failed' });
            results.failed++;
            results.errors.push(`Partner ${charge.partnerId} payment status: ${paymentIntent.status}`);
          }
        } catch (paymentError: any) {
          await storage.updateOverageLedgerEntry(charge.id, { chargeStatus: 'failed' });
          results.failed++;
          results.errors.push(`Partner ${charge.partnerId}: ${paymentError.message}`);
          
          // Create failure notification
          await storage.createPartnerNotification({
            partnerId: charge.partnerId,
            type: 'billing_failed',
            title: 'Overage Billing Failed',
            message: `Your overage billing for ${charge.billingMonth} failed. Please update your payment method.`,
            metadata: { billingMonth: charge.billingMonth, error: paymentError.message } as Record<string, any>,
          });
        }
      }
      
      // Update pendingOverageAmount for each partner based on what was successfully billed
      for (const [partnerId, billedAmount] of Array.from(billedByPartner.entries())) {
        const partner = await storage.getPartnerAccount(partnerId);
        if (partner) {
          const newPendingAmount = Math.max(0, (partner.pendingOverageAmount || 0) - billedAmount);
          await storage.updatePartnerAccount(partnerId, {
            pendingOverageAmount: newPendingAmount,
          });
        }
      }
      
      console.log(`[Overage Billing] Processed: ${results.processed}, Succeeded: ${results.succeeded}, Failed: ${results.failed}`);
      
      res.json(results);
    } catch (error) {
      console.error("Error processing overage billing:", error);
      res.status(500).json({ error: "Failed to process overage billing" });
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
  answers: Record<string, any>,
  isTestSession: boolean = false
): Promise<{
  scores: Record<string, number>;
  totalScore: number;
  percentile: number;
  evaluations?: any[];
}> {
  // For test sessions, return dummy scores without any AI computation
  // Test API keys are for developer integration testing only
  if (isTestSession) {
    console.log(`[Test Session] Skipping AI scoring, returning dummy scores`);
    return {
      scores: { overall: 75, test_mode: 100 },
      totalScore: 75,
      percentile: 60,
      evaluations: [{ note: 'Test session - dummy scores for integration testing' }],
    };
  }
  
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
