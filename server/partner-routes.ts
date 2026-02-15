import { Express, Request, Response } from "express";
import { evaluatePromptWithGPT, PA_LEVEL_DESCRIPTIONS } from "./services/promptArchitecture";
import { storage } from "./storage";
import { partnerAuth, PartnerRequest, trackUsage, generateApiKey } from "./partner-auth";
import { isAuthenticated } from "./auth";
import { sendPartnerQuotaWarning70, sendPartnerQuotaWarning90, sendPartnerAccessSuspendedEmail, sendPartnerAutoTopUpConfirmation, sendPartnerBulkInvitationEmail, sendB2BCongratulatoryEmail, sendB2BAllCompleteEmail } from "./email";
import { ASSESSMENT_TYPES, normalizeAssessmentId, type PartnerAccount, B2C_RETAIL_PRICE_PER_ASSESSMENT, BASE_FEE, ASSESSMENT_PRICES, assessmentResults, assessmentSessions, promptArchitectureEvaluations } from "@shared/schema";
import { db } from "./db";
import { getQuestionLocale, getPPPAdjustedPriceInPence, getCurrencyForCountry, formatPrice, COUNTRY_CURRENCY_MAP, convertPenceToRoundedLocalCurrency, calculateStripeAmountFromRoundedTotal, calculateCandidatePricing } from "@shared/currencies";
import { calculateFITScores, calculateAIReadinessScores } from "./scoring";
import { generateTemporaryPassword } from "./passwordUtils";
import bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { z } from "zod";
import { isValidEmail, normalizeEmail } from "@shared/validation";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import Stripe from "stripe";
import { db } from "./db";
import { eq, and, sql, or, isNull } from "drizzle-orm";
import pLimit from "p-limit";
import { createPaymentIntent, getPaymentIntent, formatAmountForAirwallex, isAirwallexConfigured, airwallexEnv } from "./airwallex";
import { getPaymentProviders, createCheckoutWithFallback, type PaymentCheckoutResult } from "./payment-routing";
import { getExchangeRates } from "./exchange-rates";

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

const multiAssessmentContextSchema = z.object({
  assessmentTypes: z.array(z.string()),
  currentIndex: z.number(),
  isLastInSeries: z.boolean(),
  completedInSession: z.array(z.string()),
}).nullable().optional();

const submitAnswersSchema = z.object({
  answers: z.record(z.any()),
  multiAssessmentContext: multiAssessmentContextSchema,
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

  // Update partner billing information (enterprise onboarding)
  app.post("/api/partner/me/billing-info", isAuthenticated, async (req: any, res: Response) => {
    try {
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
      
      // Only enterprise billing type requires this setup
      if (partner.billingType !== 'enterprise') {
        return res.status(400).json({ error: "Billing info setup is only required for enterprise partners" });
      }
      
      const billingSchema = z.object({
        billingAddressLine1: z.string().min(1, "Address is required").max(200),
        billingAddressLine2: z.string().max(200).optional().nullable(),
        billingCity: z.string().min(1, "City is required").max(100),
        billingPostcode: z.string().min(1, "Postcode is required").max(20),
        billingCountry: z.string().min(1, "Country is required").max(100),
        vatNumber: z.string().max(50).optional().nullable(),
        companyRegistrationNumber: z.string().max(50).optional().nullable(),
        invoiceContact: z.string().min(1, "Invoice contact name is required").max(200),
        billingEmail: z.string().email("Valid email required"),
        purchaseOrderRequired: z.boolean().default(false),
        defaultPurchaseOrderNumber: z.string().max(100).optional().nullable(),
      });
      
      const parsed = billingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parsed.error.errors,
        });
      }
      
      const data = parsed.data;
      
      await storage.updatePartnerAccount(partner.id, {
        billingAddressLine1: data.billingAddressLine1,
        billingAddressLine2: data.billingAddressLine2 || null,
        billingCity: data.billingCity,
        billingPostcode: data.billingPostcode,
        billingCountry: data.billingCountry,
        vatNumber: data.vatNumber || null,
        companyRegistrationNumber: data.companyRegistrationNumber || null,
        invoiceContact: data.invoiceContact,
        billingEmail: data.billingEmail,
        purchaseOrderRequired: data.purchaseOrderRequired,
        defaultPurchaseOrderNumber: data.defaultPurchaseOrderNumber || null,
        billingSetupComplete: true,
      });
      
      res.json({ success: true, message: "Billing information saved successfully" });
    } catch (error: any) {
      console.error("Error updating billing info:", error);
      res.status(500).json({ error: error.message || "Failed to update billing information" });
    }
  });

  // Partner subscription enquiry - sends email to hello@humanmetrix.co.uk
  app.post("/api/partner/subscription-enquiry", isAuthenticated, async (req: any, res: Response) => {
    try {
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

      const schema = z.object({
        message: z.string().min(1, "Message is required").max(2000),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const { sendEmail } = await import("./email");
      const result = await sendEmail({
        to: "hello@humanmetrix.co.uk",
        subject: `Subscription Enquiry from ${partner.companyName || user.firstName + " " + user.lastName}`,
        html: `
          <h2>Subscription Plan Enquiry</h2>
          <p><strong>Partner:</strong> ${partner.companyName || "N/A"}</p>
          <p><strong>Contact:</strong> ${user.firstName} ${user.lastName} (${user.email})</p>
          <p><strong>Current Billing Type:</strong> ${partner.billingType || "PAYG"}</p>
          <p><strong>Current Credits:</strong> ${partner.credits || 0}</p>
          <p><strong>Message:</strong></p>
          <p>${parsed.data.message.replace(/\n/g, "<br>")}</p>
        `,
        text: `Subscription Enquiry from ${partner.companyName}\nContact: ${user.firstName} ${user.lastName} (${user.email})\nBilling Type: ${partner.billingType}\nCredits: ${partner.credits}\nMessage: ${parsed.data.message}`,
        replyTo: user.email,
      }, {
        recipientType: 'admin' as any,
        emailType: 'general' as any,
        recipientName: 'HumanMetrix Admin',
        metadata: { partnerId: partner.id, enquiryType: 'subscription' },
      });

      if (!result.success) {
        return res.status(500).json({ error: "Failed to send enquiry email" });
      }

      res.json({ success: true, message: "Subscription enquiry sent successfully" });
    } catch (error: any) {
      console.error("Error sending subscription enquiry:", error);
      res.status(500).json({ error: error.message || "Failed to send enquiry" });
    }
  });

  // Get partner billing info for display
  app.get("/api/partner/me/billing-info", isAuthenticated, async (req: any, res: Response) => {
    try {
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
      
      res.json({
        billingType: partner.billingType,
        billingSetupComplete: partner.billingSetupComplete,
        billingEmail: partner.billingEmail,
        billingAddressLine1: partner.billingAddressLine1,
        billingAddressLine2: partner.billingAddressLine2,
        billingCity: partner.billingCity,
        billingPostcode: partner.billingPostcode,
        billingCountry: partner.billingCountry,
        vatNumber: partner.vatNumber,
        companyRegistrationNumber: partner.companyRegistrationNumber,
        invoiceContact: partner.invoiceContact,
        purchaseOrderRequired: partner.purchaseOrderRequired,
        defaultPurchaseOrderNumber: partner.defaultPurchaseOrderNumber,
        paymentTermsDays: partner.paymentTermsDays,
      });
    } catch (error: any) {
      console.error("Error fetching billing info:", error);
      res.status(500).json({ error: error.message || "Failed to fetch billing information" });
    }
  });

  app.post(
    "/api/partner/sessions",
    partnerAuth(["assessments:write"]),
    async (req: PartnerRequest, res) => {
      try {
        const partner = req.partner!;
        const apiKey = req.apiKey!;
        
        // Check if API access is suspended due to billing failure
        if (partner.billingStatusOverride === 'suspended_billing_failure') {
          return res.status(402).json({
            error: "API Access Suspended",
            message: "Your API access has been suspended due to payment failure. Please update your payment method in the partner portal to restore access.",
            billingStatus: {
              reason: partner.billingFailureReason || 'payment_failed',
              failedAttempts: partner.failedBillingAttempts || 0,
              lastFailureAt: partner.lastBillingFailureAt,
            },
          });
        }
        
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
          isTestSession: apiKey.environment === "test", // Persist test session flag for widget display
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

  // Get sessions grouped by pipeline stage for Kanban view
  app.get(
    "/api/partner/pipeline",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        // Look up partner for the authenticated user
        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(403).json({ error: "Partner access required" });
        }
        
        let partner = null;
        
        // Check if user is a partner admin
        const hasPartnerAccess = user.role === 'super_admin' || user.role === 'organization_admin' || user.role === 'partner_admin';
        if (hasPartnerAccess) {
          if (user.organizationId) {
            partner = await storage.getPartnerAccountByOrganizationId(user.organizationId);
          }
          if (!partner && user.email) {
            partner = await storage.getPartnerAccountByEmail(user.email);
          }
        }
        
        // Check if user is a team member
        if (!partner) {
          const teamMembership = await storage.getPartnerTeamMemberByUserId(req.user.id);
          if (teamMembership) {
            partner = await storage.getPartnerAccount(teamMembership.partnerId);
          }
        }
        
        if (!partner) {
          return res.status(403).json({ error: "Partner access required" });
        }
        
        const partnerId = partner.id;
        
        const organisationId = req.query.organisationId as string | undefined;
        
        // Get all non-expired sessions for this partner
        const sessions = await storage.getPipelineSessions(partnerId, organisationId);
        
        const stageOrder = ["new", "in_progress", "completed", "reviewing", "shortlisted", "hired", "rejected"];
        const stageRank: Record<string, number> = {};
        stageOrder.forEach((s, i) => { stageRank[s] = i; });
        
        // First, derive stage for each session and group by candidate email
        const candidateMap: Record<string, { sessions: any[]; stage: string; email: string; userId: string | null }> = {};
        
        for (const session of sessions) {
          let stage = session.pipelineStage || "new";
          if (!session.pipelineStage) {
            if (session.status === "started") stage = "in_progress";
            else if (session.status === "completed") stage = "completed";
            else if (session.status === "expired") continue;
          }
          
          const email = (session.externalEmail || session.externalUserId || session.id).toLowerCase().trim();
          
          if (!candidateMap[email]) {
            candidateMap[email] = {
              sessions: [],
              stage: stage,
              email: email,
              userId: session.externalUserId,
            };
          }
          
          candidateMap[email].sessions.push({
            sessionId: session.id,
            assessmentType: session.assessmentType,
            status: session.status,
            pipelineStage: stage,
            pipelineNotes: session.pipelineNotes,
            totalScore: session.totalScore,
            percentile: session.percentile,
            createdAt: session.createdAt,
            completedAt: session.completedAt,
            pipelineStageUpdatedAt: session.pipelineStageUpdatedAt,
            metadata: session.metadata,
          });
          
          // Use the most advanced pipeline stage among all sessions for this candidate
          if ((stageRank[stage] ?? 0) > (stageRank[candidateMap[email].stage] ?? 0)) {
            candidateMap[email].stage = stage;
          }
        }
        
        // Group candidates by their derived pipeline stage
        const pipeline: Record<string, any[]> = {};
        for (const stage of stageOrder) {
          pipeline[stage] = [];
        }
        
        for (const candidate of Object.values(candidateMap)) {
          const stage = candidate.stage;
          if (pipeline[stage]) {
            const candidateName = candidate.sessions
              .map((s: any) => (s.metadata as any)?.candidateName)
              .find((n: string | undefined) => n) || null;
            pipeline[stage].push({
              candidateEmail: candidate.email,
              candidateName,
              externalUserId: candidate.userId,
              pipelineStage: stage,
              sessions: candidate.sessions,
              sessionCount: candidate.sessions.length,
              completedCount: candidate.sessions.filter((s: any) => s.status === 'completed').length,
              latestActivity: candidate.sessions.reduce((latest: string, s: any) => {
                const d = s.completedAt || s.createdAt;
                return d > latest ? d : latest;
              }, candidate.sessions[0]?.createdAt || ''),
            });
          }
        }
        
        // Count totals (now counting candidates, not sessions)
        const totalCount = Object.values(pipeline).reduce((sum, arr) => sum + arr.length, 0);
        
        res.json({
          pipeline,
          totalCount,
          stages: stageOrder.map(s => ({
            id: s,
            label: {
              new: "New",
              in_progress: "In Progress", 
              completed: "Completed",
              reviewing: "Under Review",
              shortlisted: "Shortlisted",
              hired: "Hired",
              rejected: "Rejected",
            }[s],
            count: pipeline[s].length,
          })),
        });
      } catch (error) {
        console.error("Error fetching pipeline:", error);
        res.status(500).json({ error: "Failed to fetch pipeline data" });
      }
    }
  );

  // Update session pipeline stage
  app.patch(
    "/api/partner/sessions/:sessionId/pipeline",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        // Look up partner for the authenticated user
        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(403).json({ error: "Partner access required" });
        }
        
        let partner = null;
        
        // Check if user is a partner admin
        const hasPartnerAccess = user.role === 'super_admin' || user.role === 'organization_admin' || user.role === 'partner_admin';
        if (hasPartnerAccess) {
          if (user.organizationId) {
            partner = await storage.getPartnerAccountByOrganizationId(user.organizationId);
          }
          if (!partner && user.email) {
            partner = await storage.getPartnerAccountByEmail(user.email);
          }
        }
        
        // Check if user is a team member
        if (!partner) {
          const teamMembership = await storage.getPartnerTeamMemberByUserId(req.user.id);
          if (teamMembership) {
            partner = await storage.getPartnerAccount(teamMembership.partnerId);
          }
        }
        
        if (!partner) {
          return res.status(403).json({ error: "Partner access required" });
        }
        
        const partnerId = partner.id;
        
        const { sessionId } = req.params;
        const { pipelineStage, pipelineNotes } = req.body;
        
        // Validate stage
        const validStages = ["new", "in_progress", "completed", "reviewing", "shortlisted", "hired", "rejected"];
        if (pipelineStage && !validStages.includes(pipelineStage)) {
          return res.status(400).json({ error: "Invalid pipeline stage" });
        }
        
        // Get session and verify ownership
        const session = await storage.getAssessmentSession(sessionId);
        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }
        
        if (session.partnerId !== partnerId) {
          return res.status(403).json({ error: "Access denied" });
        }
        
        // Build update object
        const updates: any = {
          pipelineStageUpdatedAt: new Date(),
          pipelineStageUpdatedBy: req.user?.id,
        };
        
        if (pipelineStage !== undefined) {
          updates.pipelineStage = pipelineStage;
        }
        
        if (pipelineNotes !== undefined) {
          updates.pipelineNotes = pipelineNotes;
        }
        
        await storage.updateAssessmentSession(sessionId, updates);
        
        // Create notification for stage change
        if (pipelineStage) {
          const stageLabels: Record<string, string> = {
            new: "New",
            in_progress: "In Progress",
            completed: "Completed", 
            reviewing: "Under Review",
            shortlisted: "Shortlisted",
            hired: "Hired",
            rejected: "Rejected",
          };
          
          await storage.createPartnerNotification({
            partnerId,
            type: "pipeline_updated",
            title: "Pipeline Stage Updated",
            message: `${session.externalEmail || session.externalUserId || "Candidate"} moved to ${stageLabels[pipelineStage]}`,
            metadata: {
              sessionId,
              previousStage: session.pipelineStage,
              newStage: pipelineStage,
            },
          });
        }
        
        res.json({ 
          success: true,
          sessionId,
          pipelineStage: pipelineStage || session.pipelineStage,
          pipelineNotes: pipelineNotes !== undefined ? pipelineNotes : session.pipelineNotes,
        });
      } catch (error) {
        console.error("Error updating pipeline:", error);
        res.status(500).json({ error: "Failed to update pipeline" });
      }
    }
  );

  // Bulk update pipeline stages (atomic - all succeed or all fail via DB transaction)
  app.post(
    "/api/partner/pipeline/bulk-update",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(403).json({ error: "Partner access required" });
        }

        let partner = null;
        const hasPartnerAccess = user.role === 'super_admin' || user.role === 'organization_admin' || user.role === 'partner_admin';
        if (hasPartnerAccess) {
          if (user.organizationId) {
            partner = await storage.getPartnerAccountByOrganizationId(user.organizationId);
          }
          if (!partner && user.email) {
            partner = await storage.getPartnerAccountByEmail(user.email);
          }
        }
        if (!partner) {
          const teamMembership = await storage.getPartnerTeamMemberByUserId(req.user.id);
          if (teamMembership) {
            partner = await storage.getPartnerAccount(teamMembership.partnerId);
          }
        }
        if (!partner) {
          return res.status(403).json({ error: "Partner access required" });
        }

        const partnerId = partner.id;
        const { updates } = req.body;
        
        if (!Array.isArray(updates) || updates.length === 0) {
          return res.status(400).json({ error: "Updates array is required" });
        }
        
        const validStages = ["new", "in_progress", "completed", "reviewing", "shortlisted", "hired", "rejected"];

        for (const update of updates) {
          if (!update.sessionId || !update.pipelineStage || !validStages.includes(update.pipelineStage)) {
            return res.status(400).json({ error: `Invalid data for session ${update.sessionId}` });
          }
        }

        // Pre-validate ownership of ALL sessions before making any changes
        const sessions = [];
        for (const update of updates) {
          const session = await storage.getAssessmentSession(update.sessionId);
          if (!session || session.partnerId !== partnerId) {
            return res.status(403).json({ error: `Access denied for session ${update.sessionId}` });
          }
          sessions.push(session);
        }

        // All validated - now apply all updates atomically in a DB transaction
        const now = new Date();
        await db.transaction(async (tx) => {
          for (const update of updates) {
            await tx
              .update(assessmentSessions)
              .set({
                pipelineStage: update.pipelineStage,
                pipelineStageUpdatedAt: now,
                pipelineStageUpdatedBy: req.user?.id,
              })
              .where(eq(assessmentSessions.id, update.sessionId));
          }
        });

        // Create a single notification for the move
        if (updates.length > 0 && updates[0].pipelineStage) {
          const stageLabels: Record<string, string> = {
            new: "New", in_progress: "In Progress", completed: "Completed",
            reviewing: "Under Review", shortlisted: "Shortlisted", hired: "Hired", rejected: "Rejected",
          };
          await storage.createPartnerNotification({
            partnerId,
            type: "pipeline_updated",
            title: "Pipeline Stage Updated",
            message: `${sessions[0]?.externalEmail || "Candidate"} moved to ${stageLabels[updates[0].pipelineStage]}`,
            metadata: { sessionIds: updates.map((u: any) => u.sessionId), newStage: updates[0].pipelineStage },
          });
        }
        
        res.json({ 
          results: updates.map((u: any) => ({ sessionId: u.sessionId, success: true, pipelineStage: u.pipelineStage }))
        });
      } catch (error) {
        console.error("Error bulk updating pipeline:", error);
        res.status(500).json({ error: "Failed to bulk update pipeline" });
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
        
        // Parallelize partner and API key lookups for faster response
        const [partner, apiKey] = await Promise.all([
          storage.getPartnerAccount(session.partnerId),
          session.apiKeyId ? storage.getPartnerApiKey(session.apiKeyId) : Promise.resolve(null),
        ]);
        
        // Check if this session was created with a test API key
        // First check the persisted flag, then fallback to checking the API key environment
        const isTestSession = session.isTestSession === true || apiKey?.environment === "test";
        
        // Check if this session is from a partner invitation (magic link - skip email verification)
        const sessionMetadata = session.metadata as any;
        const isFromInvitation = !!(sessionMetadata?.source === 'partner_invitation' && sessionMetadata?.invitationId);
        
        // Get invitation context for multi-assessment series tracking
        let invitationContext: { assessmentTypes: string[]; currentIndex: number; totalCount: number } | null = null;
        if (isFromInvitation && sessionMetadata?.invitationId) {
          try {
            const invitation = await storage.getPartnerCandidateInvitation(sessionMetadata.invitationId);
            if (invitation) {
              const normalizedTypes = invitation.assessmentTypes.map((t: string) => normalizeAssessmentId(t));
              const currentType = normalizeAssessmentId(session.assessmentType);
              const currentIndex = normalizedTypes.indexOf(currentType);
              invitationContext = {
                assessmentTypes: normalizedTypes,
                currentIndex: currentIndex >= 0 ? currentIndex : 0,
                totalCount: normalizedTypes.length,
              };
            }
          } catch (invErr) {
            console.error('[Embed Session] Failed to load invitation context:', invErr);
          }
        }
        
        console.log(`[Embed Session] Returning session ${session.id}, externalEmail: ${session.externalEmail}, isTestSession: ${isTestSession}, isFromInvitation: ${isFromInvitation}, invitationContext: ${JSON.stringify(invitationContext)}`);
        
        // Calculate time remaining for in-progress assessments
        // Timer "pauses" when tab is closed - resume from saved value
        let timeRemaining: number | null = null;
        if (session.status === 'started' && session.startedAt) {
          const normalizedType = session.assessmentType.replace(/-/g, '_');
          const timeLimitSeconds = normalizedType === 'prompt_architecture' ? 180 : 1200; // 3 min or 20 min
          
          // Use saved remaining time if available (from when user closed tab)
          // This implements "pause on close" - timer freezes when tab is closed
          if (session.pausedTimeRemainingMs != null) {
            timeRemaining = Math.floor(session.pausedTimeRemainingMs / 1000);
          } else {
            // No saved value, calculate from start time
            const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
            const elapsedSeconds = Math.floor(elapsedMs / 1000);
            timeRemaining = Math.max(0, timeLimitSeconds - elapsedSeconds);
          }
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
          // Include saved progress for resume functionality
          savedAnswers: session.answers || null,
          lastAnsweredIndex: session.lastAnsweredIndex ?? null,
          lastActivityAt: session.lastActivityAt || null,
          // Timer remaining time (in seconds) for in-progress assessments
          timeRemaining,
          // Test mode flag - skip email verification for developer testing
          isTestSession,
          // Skip email verification for partner invitations (magic link pattern - clicking email link = verified)
          isFromInvitation,
          // Multi-assessment context from invitation
          invitationContext,
          // Results status for determining if results can be shown
          resultsPaymentStatus: session.resultsPaymentStatus,
          resultsReleaseStatus: session.resultsReleaseStatus,
        };
        
        // Include results data if payment is completed or results are released
        const canViewResults = session.resultsPaymentStatus === 'paid' || session.resultsReleaseStatus === 'released';
        if (canViewResults && session.status === 'completed') {
          let scores = session.scores;
          let totalScore = session.totalScore;
          let percentile = session.percentile;
          
          // If scores only have 'overall', recalculate from stored answers for detailed breakdown
          const scoreKeys = scores ? Object.keys(scores) : [];
          if (session.answers && (scoreKeys.length === 0 || (scoreKeys.length === 1 && scoreKeys[0] === 'overall'))) {
            try {
              const recalculated = await calculateScores(session.assessmentType, session.answers);
              scores = recalculated.scores;
              totalScore = recalculated.totalScore;
              percentile = recalculated.percentile;
              
              // Update session with recalculated scores for future requests
              await storage.updateAssessmentSession(session.id, {
                scores,
                totalScore,
                percentile,
              } as any);
              console.log(`[Recalculation] Updated session ${session.id} with detailed scores`);
            } catch (recalcError) {
              console.error(`[Recalculation] Failed for session ${session.id}:`, recalcError);
              // Fall back to existing scores
            }
          }
          
          response.results = {
            scores,
            totalScore,
            percentile,
            evaluations: session.evaluations,
          };
        }
        
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

  // Send email verification code
  app.post(
    "/api/embed/session/:sessionId/send-verification-code",
    async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        const { email } = req.body || {};
        
        if (!email || typeof email !== 'string') {
          return res.status(400).json({ error: "Email is required" });
        }
        
        // Normalize email consistently
        const normalizedEmail = email.trim().toLowerCase();
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
          return res.status(400).json({ error: "Invalid email format" });
        }
        
        const session = await storage.getAssessmentSession(sessionId);
        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }
        
        // Check for existing unexpired code (rate limiting)
        const existingCode = await storage.getActiveVerificationCode(normalizedEmail, sessionId);
        if (existingCode && existingCode.createdAt) {
          const timeSinceCreation = Date.now() - new Date(existingCode.createdAt).getTime();
          if (timeSinceCreation < 60000) { // 1 minute cooldown
            return res.status(429).json({ 
              error: "Please wait before requesting another code",
              retryAfter: Math.ceil((60000 - timeSinceCreation) / 1000)
            });
          }
        }
        
        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store code with 10-minute expiry
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await storage.createEmailVerificationCode({
          email: normalizedEmail,
          code,
          sessionId,
          partnerId: session.partnerId,
          expiresAt,
        });
        
        // Send the code via email (send to original email case for display)
        const partner = await storage.getPartnerAccount(session.partnerId);
        const { sendEmailVerificationCode } = await import("./email");
        const result = await sendEmailVerificationCode(
          email.trim(), // Original case for email display
          code,
          partner?.companyName || partner?.name
        );
        
        if (!result.success) {
          return res.status(500).json({ error: "Failed to send verification email" });
        }
        
        res.json({ success: true, message: "Verification code sent" });
      } catch (error) {
        console.error("Error sending verification code:", error);
        res.status(500).json({ error: "Failed to send verification code" });
      }
    }
  );

  // Verify email code
  app.post(
    "/api/embed/session/:sessionId/verify-email",
    async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        const { email, code } = req.body || {};
        
        if (!email || !code) {
          return res.status(400).json({ error: "Email and code are required" });
        }
        
        // Normalize email consistently
        const normalizedEmail = email.trim().toLowerCase();
        
        const session = await storage.getAssessmentSession(sessionId);
        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }
        
        // Find the verification code
        const verification = await storage.getEmailVerificationCode(normalizedEmail, code);
        
        if (!verification) {
          // Track failed attempt on active code if exists
          const activeCode = await storage.getActiveVerificationCode(normalizedEmail, sessionId);
          if (activeCode) {
            const newAttempts = (activeCode.attempts || 0) + 1;
            await storage.updateEmailVerificationCode(activeCode.id, { attempts: newAttempts });
            
            if (newAttempts >= 5) {
              return res.status(429).json({ error: "Too many failed attempts. Please request a new code." });
            }
          }
          return res.status(400).json({ error: "Invalid or expired verification code" });
        }
        
        // Check if code belongs to this session
        if (verification.sessionId !== sessionId) {
          return res.status(400).json({ error: "Invalid verification code" });
        }
        
        // Mark as verified
        await storage.updateEmailVerificationCode(verification.id, { verified: true });
        
        res.json({ success: true, verified: true });
      } catch (error) {
        console.error("Error verifying email:", error);
        res.status(500).json({ error: "Failed to verify email" });
      }
    }
  );

  app.post(
    "/api/embed/session/:sessionId/start",
    async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        const { candidateEmail } = req.body || {};
        
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
        
        // If already started, calculate remaining time and clear the stored pausedTimeRemainingMs
        // so subsequent fetches use the resumed timer position
        if (session.status === "started") {
          const normalizedType = session.assessmentType.replace(/-/g, '_');
          const timeLimitSeconds = normalizedType === 'prompt_architecture' ? 180 : 1200;
          let timeRemaining = timeLimitSeconds;
          
          if (session.pausedTimeRemainingMs != null) {
            timeRemaining = Math.floor(session.pausedTimeRemainingMs / 1000);
            console.log(`[Session Resume] Session ${sessionId} resuming with pausedTimeRemainingMs=${session.pausedTimeRemainingMs}ms (${timeRemaining}s)`);
            // Clear the stored time and update startedAt to reflect the resume point
            // This way subsequent time calculations will be based on the new startedAt
            const newStartedAt = new Date(Date.now() - (timeLimitSeconds - timeRemaining) * 1000);
            await storage.updateAssessmentSession(sessionId, {
              pausedTimeRemainingMs: null,
              startedAt: newStartedAt,
              lastActivityAt: new Date(),
            } as any);
          } else if (session.startedAt) {
            // pausedTimeRemainingMs is null - calculate from startedAt
            // This happens when resume handshake was already performed
            const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
            const elapsedSeconds = Math.floor(elapsedMs / 1000);
            timeRemaining = Math.max(0, timeLimitSeconds - elapsedSeconds);
            console.log(`[Session Resume] Session ${sessionId} already resumed, calculating from startedAt: elapsed=${elapsedSeconds}s, remaining=${timeRemaining}s`);
          }
          
          return res.json({
            sessionId: session.id,
            assessmentType: session.assessmentType,
            status: "started",
            timeRemaining,
          });
        }
        
        // Check if this is a test session (created with test API key)
        const apiKey = session.apiKeyId ? await storage.getPartnerApiKey(session.apiKeyId) : null;
        const isTestSession = session.isTestSession === true || apiKey?.environment === "test";
        
        // Check if this session is from a partner invitation (email already verified by clicking link)
        const sessionMetadata = session.metadata as Record<string, any> | null;
        const isFromInvitation = sessionMetadata?.source === 'partner_invitation';
        
        // For test sessions or partner invitations, skip email verification requirement
        if (isTestSession) {
          console.log(`[Test Session] Skipping email verification for test session ${sessionId}`);
        } else if (isFromInvitation) {
          console.log(`[Partner Invitation] Skipping email verification for invitation session ${sessionId}`);
        } else {
          // Require verified email before starting (for B2B widget security)
          if (!candidateEmail || typeof candidateEmail !== 'string') {
            return res.status(400).json({ error: "Email is required" });
          }
          
          // Normalize email to lowercase for consistent lookup
          const trimmedEmail = candidateEmail.trim().toLowerCase();
          
          // Check if email is verified for this session
          const verification = await storage.getActiveVerificationCode(trimmedEmail, sessionId);
          if (!verification || !verification.verified) {
            return res.status(400).json({ 
              error: "Email not verified. Please verify your email first.",
              code: "EMAIL_NOT_VERIFIED"
            });
          }
          
          // Delete the verification code after use (prevent replay attacks)
          await storage.deleteEmailVerificationCode(verification.id);
        }
        
        // Detect user's country from IP for PPP pricing
        let countryCode = 'GB'; // Default to UK for full pricing
        try {
          const forwardedFor = req.headers['x-forwarded-for'];
          const clientIP = forwardedFor 
            ? (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0].trim())
            : req.socket.remoteAddress;
          
          if (clientIP && !clientIP.startsWith('127.') && !clientIP.startsWith('::1') && !clientIP.startsWith('192.168.')) {
            // Note: ip-api.com free tier only supports HTTP, but we use it server-side only
            // For production, consider using a paid geolocation service with HTTPS support
            const response = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,countryCode,message`);
            if (response.ok) {
              const data = await response.json();
              if (data.status === 'success' && data.countryCode) {
                countryCode = data.countryCode;
              }
            }
          }
        } catch (geoError) {
          console.error('[B2B Session] Country detection failed, defaulting to GB:', geoError);
        }
        
        // Update session with email, country code, and test flag if provided
        const existingMetadata = session.metadata || {};
        const updateData: any = {
          status: "started",
          startedAt: new Date(),
          metadata: { ...existingMetadata, countryCode },
          isTestSession, // Persist test session flag for downstream endpoints
        };
        if (candidateEmail && typeof candidateEmail === 'string') {
          updateData.externalEmail = candidateEmail.trim();
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
        
        // Return full time limit for freshly started assessment
        const normalizedType = session.assessmentType.replace(/-/g, '_');
        const timeRemaining = normalizedType === 'prompt_architecture' ? 180 : 1200;
        
        res.json({
          sessionId: session.id,
          assessmentType: session.assessmentType,
          status: "started",
          timeRemaining,
        });
      } catch (error) {
        console.error("Error starting session:", error);
        res.status(500).json({ error: "Failed to start session" });
      }
    }
  );

  // Save progress endpoint - allows incremental answer saving
  // Support both PATCH (normal saves) and POST (sendBeacon on tab close)
  const handleProgressSave = async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        const { answers, lastAnsweredIndex, timeRemainingMs } = req.body;
        
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
        
        const updateData: any = {
          answers: mergedAnswers,
          lastAnsweredIndex: lastAnsweredIndex ?? session.lastAnsweredIndex,
          lastActivityAt: new Date(),
          status: session.status === "created" ? "started" : session.status,
        };
        
        // Save timer remaining time if provided (for resuming after tab close)
        // Validate to prevent client manipulation: time can only decrease, not increase
        if (typeof timeRemainingMs === 'number' && timeRemainingMs >= 0) {
          const normalizedType = session.assessmentType.replace(/-/g, '_');
          const maxTimeMs = (normalizedType === 'prompt_architecture' ? 180 : 1200) * 1000;
          
          // Determine the maximum allowed remaining time:
          // 1. If pausedTimeRemainingMs is set, new value must be <= that (time can only decrease)
          // 2. Otherwise, use max time limit
          let maxAllowedMs = maxTimeMs;
          if (session.pausedTimeRemainingMs != null) {
            // Time can only decrease from last saved value
            maxAllowedMs = session.pausedTimeRemainingMs;
          }
          
          // Clamp to valid range: 0 <= value <= maxAllowedMs
          const clampedTimeMs = Math.min(Math.max(0, Math.floor(timeRemainingMs)), maxAllowedMs);
          updateData.pausedTimeRemainingMs = clampedTimeMs;
          console.log(`[Session Progress] Session ${sessionId} saving pausedTimeRemainingMs=${clampedTimeMs}ms (${Math.floor(clampedTimeMs/1000)}s), client sent ${timeRemainingMs}ms`);
        }
        
        await storage.updateAssessmentSession(sessionId, updateData);
        
        res.json({
          success: true,
          savedAnswerCount: Object.keys(mergedAnswers).length,
          lastAnsweredIndex: lastAnsweredIndex ?? session.lastAnsweredIndex,
        });
      } catch (error) {
        console.error("Error saving session progress:", error);
        res.status(500).json({ error: "Failed to save progress" });
      }
  };

  // Register progress handler for both PATCH and POST (sendBeacon uses POST)
  app.patch("/api/embed/session/:sessionId/progress", handleProgressSave);
  app.post("/api/embed/session/:sessionId/progress", handleProgressSave);

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
        
        const { answers: submittedAnswers, multiAssessmentContext } = parseResult.data;
        
        // Merge saved answers with submitted answers (submitted takes precedence)
        const savedAnswers = session.answers || {};
        const answers = { ...savedAnswers, ...submittedAnswers };
        
        // Multi-assessment tracking
        const isMultiAssessmentSeries = !!multiAssessmentContext;
        const isLastInMultiAssessmentSeries = multiAssessmentContext?.isLastInSeries ?? false;
        const multiAssessmentTypes = multiAssessmentContext?.assessmentTypes ?? [];
        
        const { scores, totalScore, percentile, evaluations } = await calculateScores(
          session.assessmentType,
          answers
        );
        
        // Calculate 30-day free results release date
        const now = new Date();
        const resultsReleaseScheduledAt = new Date(now);
        resultsReleaseScheduledAt.setDate(resultsReleaseScheduledAt.getDate() + 30);
        
        // Check if this is a test session - prefer stored flag, fallback to API key lookup
        // This ensures test mode is consistent even if API key lookup fails
        let isTestSession = session.isTestSession === true;
        if (!isTestSession && session.apiKeyId) {
          const apiKey = await storage.getPartnerApiKey(session.apiKeyId);
          isTestSession = apiKey?.environment === "test";
        }
        
        await storage.updateAssessmentSession(sessionId, {
          status: "completed",
          answers,
          scores,
          totalScore,
          percentile,
          evaluations,
          completedAt: now,
          // New release fields
          resultsReleaseScheduledAt,
          resultsReleaseStatus: "pending",
          // Legacy fields for scheduler compatibility
          resultsUnlockAt: resultsReleaseScheduledAt,
          resultsPaymentStatus: "unpaid",
          resultsDeliveryStatus: "pending",
          resultsDeliveryAttemptCount: 0,
          isTestSession,
        } as any);
        
        // Only track billable usage and consume quota for non-test sessions
        if (isTestSession) {
          // Track as non-billable test session
          await trackUsage(
            session.partnerId,
            session.apiKeyId,
            sessionId,
            "session_completed",
            session.assessmentType,
            false, // NOT billable for test sessions
            0 // No charge for test sessions
          );
          console.log(`[Test Session] Skipping billing for test session ${sessionId}`);
        } else {
          // Track usage for reporting only - assessments are not billed
          await trackUsage(
            session.partnerId,
            session.apiKeyId,
            sessionId,
            "session_completed",
            session.assessmentType,
            false, // Not billable - assessments don't consume credits
            0
          );
        } // End of else block for non-test sessions
        
        // Create notification for assessment completion (skip for test API key sessions)
        // dispatchPartnerNotification automatically checks notification preferences
        if (!isTestSession) {
          const candidateIdentifier = session.externalEmail || session.externalUserId || 'Unknown';
          await storage.dispatchPartnerNotification({
            partnerId: session.partnerId,
            type: 'assessment_completed',
            title: 'Assessment Completed',
            message: `A ${session.assessmentType.toUpperCase()} assessment has been completed by ${candidateIdentifier}.`,
            metadata: { 
              sessionId: session.id, 
              assessmentType: session.assessmentType,
              externalUserId: session.externalUserId,
              externalEmail: session.externalEmail,
              totalScore,
              percentile,
            },
          });
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
        
        // Send B2B congratulatory email with payment link if email is available
        // Skip email for test sessions (developer testing purposes)
        if (isTestSession) {
          console.log(`[Test Session] Skipping congratulatory email for test session ${sessionId}`);
        }
        
        // Refresh session to get the email that was saved during start
        const updatedSession = await storage.getAssessmentSession(sessionId);
        const candidateEmail = updatedSession?.externalEmail;
        
        // Only send emails for non-test production sessions
        if (candidateEmail && partner && !isTestSession) {
          try {
            // Generate payment URL for immediate access
            const baseUrl = getBaseUrl(req);
            
            // Get user's country code for PPP pricing (stored during session start)
            const userCountryCode = (updatedSession?.metadata as any)?.countryCode || 'GB';
            
            // Calculate individual assessment price using canonical pricing (no bundle discount — same as B2C)
            const normalizedType = normalizeAssessmentId(session.assessmentType);
            const assessmentPrice = ASSESSMENT_PRICES[normalizedType] || 400;
            const exchangeRatesData = await getExchangeRates();
            const localCurrencyCode = COUNTRY_CURRENCY_MAP[userCountryCode.toUpperCase()] || 'GBP';
            const emailLiveRate = exchangeRatesData.rates?.[localCurrencyCode] ?? undefined;
            
            const individualPricing = calculateCandidatePricing(
              userCountryCode,
              [{ type: normalizedType, priceInPence: assessmentPrice }],
              BASE_FEE,
              { exchangeRate: emailLiveRate }
            );
            const individualPriceDisplay = individualPricing.totalDisplay;
            
            console.log(`[B2B Pricing] Assessment: ${normalizedType}, Country: ${userCountryCode}, Total: ${individualPricing.totalLocal} (${individualPriceDisplay})`);
            
            // Calculate 30-day free unlock date
            const freeUnlockDate = new Date();
            freeUnlockDate.setDate(freeUnlockDate.getDate() + 30);
            
            // Create payment URL with country code for consistent pricing on payment page
            const paymentUrl = `${baseUrl}/b2b-results?session=${sessionId}&country=${userCountryCode}`;
            
            try {
                const invitationId = (updatedSession?.metadata as any)?.invitationId;
                const invitation = invitationId ? await storage.getPartnerCandidateInvitation(invitationId) : null;
                const existingUser = await storage.getUserByEmail(candidateEmail);
                const candidateDisplayName = invitation?.name || existingUser?.name || existingUser?.username || undefined;
                
                await sendB2BCongratulatoryEmail({
                  email: candidateEmail,
                  candidateName: candidateDisplayName,
                  assessmentType: session.assessmentType,
                  partnerCompanyName: partner.companyName || partner.name,
                  paymentUrl,
                  paymentAmount: individualPriceDisplay,
                  freeUnlockDate,
                });
                console.log(`[B2B Email] Sent congratulatory email to ${candidateEmail} for session ${sessionId}`);
              } catch (emailError) {
                console.error('[B2B Email] Failed to send congratulatory email:', emailError);
              }
            
            // Check for bundle email eligibility
            // Case 1: Multi-assessment series - send bundle at end of series
            // Case 2: All 4 assessments complete across any sessions - send full bundle
            const allAssessmentTypes = ['fit', 'ai_readiness', 'prompt_architecture', 'aiq'];
            const completedSessions = await storage.getCompletedB2BSessionsByEmail(
              candidateEmail, 
              session.partnerId
            );
            
            const completedTypes = new Set(completedSessions.map(s => s.assessmentType));
            const allComplete = allAssessmentTypes.every(type => completedTypes.has(type));
            
            // Determine if we should send a bundle email
            let shouldSendBundleEmail = false;
            let bundleAssessmentTypes: string[] = [];
            const bundleDiscountPercent = 25; // Always 25% off for bundle pricing
            
            // Count how many assessments are NOT yet paid for (locked results)
            const lockedSessions = completedSessions.filter((s: any) => {
              return (s as any).resultsPaymentStatus !== 'paid' && (s as any).resultsReleaseStatus !== 'released';
            });
            const lockedAssessmentTypes = [...new Set(lockedSessions.map(s => normalizeAssessmentId(s.assessmentType)))];
            
            // Only send bundle email if there are MORE than 1 unpaid assessment results
            if (lockedAssessmentTypes.length > 1) {
              if (isMultiAssessmentSeries && isLastInMultiAssessmentSeries) {
                // Multi-assessment series completed - send bundle for locked series assessments only
                bundleAssessmentTypes = multiAssessmentTypes.filter(t => lockedAssessmentTypes.includes(normalizeAssessmentId(t)));
                if (bundleAssessmentTypes.length > 1) {
                  shouldSendBundleEmail = true;
                  console.log(`[B2B Email] Multi-assessment series complete (${bundleAssessmentTypes.length} locked tests) for ${candidateEmail} - sending bundle offer with 25% off`);
                } else {
                  console.log(`[B2B Email] Multi-assessment series complete but only ${bundleAssessmentTypes.length} locked result(s) - skipping bundle email`);
                }
              } else if (allComplete && !isMultiAssessmentSeries) {
                // All 4 assessments complete (non-multi-assessment flow) - send bundle for locked assessments only
                bundleAssessmentTypes = lockedAssessmentTypes;
                shouldSendBundleEmail = true;
                console.log(`[B2B Email] All 4 assessments complete, ${bundleAssessmentTypes.length} locked for ${candidateEmail} - sending bundle offer with 25% off`);
              }
            } else {
              console.log(`[B2B Email] Only ${lockedAssessmentTypes.length} locked result(s) for ${candidateEmail} - skipping bundle email (need >1)`);
            }
            
            if (shouldSendBundleEmail) {
              // Notify partner that all assessments are complete (always runs, even if emails failed)
              try {
                const { notifyAssessmentCompleted } = await import('./partner-notifications');
                const sessionMetadata = updatedSession?.metadata as any;
                await notifyAssessmentCompleted(
                  session.partnerId,
                  candidateEmail,
                  session.externalUserId,
                  session.assessmentType,
                  true,
                  {
                    assessmentCount: bundleAssessmentTypes.length,
                    invitationId: sessionMetadata?.invitationId,
                  }
                );
                console.log(`[B2B Notification] Sent assessment_all_completed notification for ${candidateEmail} (${bundleAssessmentTypes.length} assessments)`);
              } catch (notifyError) {
                console.error('[B2B Notification] Failed to notify assessment completion:', notifyError);
              }
              
              // Calculate bundle price based on the sum of individual PPP-adjusted discounted prices
              // The bundle discount (25%) is applied on top of the individual discounted prices
              try {
                // Calculate bundle pricing using canonical function (same formula as B2C, plus 25% discount)
                const bundleItems = bundleAssessmentTypes.map(type => ({
                  type: normalizeAssessmentId(type),
                  priceInPence: ASSESSMENT_PRICES[normalizeAssessmentId(type)] || 400,
                }));
                
                const bundleOriginalPricing = calculateCandidatePricing(
                  userCountryCode, bundleItems, BASE_FEE,
                  { exchangeRate: emailLiveRate }
                );
                const bundleDiscountedPricing = calculateCandidatePricing(
                  userCountryCode, bundleItems, BASE_FEE,
                  { exchangeRate: emailLiveRate, bundleDiscount: bundleDiscountPercent }
                );
                
                const bundleOriginalDisplay = bundleOriginalPricing.totalDisplay;
                const bundleDiscountedDisplay = bundleDiscountedPricing.totalDisplay;
                
                console.log(`[B2B Bundle Pricing] Assessments: ${bundleAssessmentTypes.join(', ')}, Original: ${bundleOriginalPricing.totalLocal} (${bundleOriginalDisplay}), ${bundleDiscountPercent}% discount: ${bundleDiscountedPricing.totalLocal} (${bundleDiscountedDisplay})`);
                
                const bundlePaymentUrl = `${baseUrl}/b2b-results-bundle?email=${encodeURIComponent(candidateEmail)}&partner=${session.partnerId}&country=${userCountryCode}&types=${bundleAssessmentTypes.join(',')}`;
                
                const bundleInvitationId = (updatedSession?.metadata as any)?.invitationId;
                const bundleInvitation = bundleInvitationId ? await storage.getPartnerCandidateInvitation(bundleInvitationId) : null;
                const bundleUser = await storage.getUserByEmail(candidateEmail);
                const bundleCandidateName = bundleInvitation?.name || bundleUser?.name || bundleUser?.username || undefined;
                
                const normalizedBundleTypes = bundleAssessmentTypes.map(t => normalizeAssessmentId(t));
                const seriesSessions = completedSessions.filter((s: any) => normalizedBundleTypes.includes(normalizeAssessmentId(s.assessmentType)));
                const bundlePaidSessions = seriesSessions.filter((s: any) => s.resultsPaymentStatus === 'paid');
                const bundleUnpaidSessions = seriesSessions.filter((s: any) => s.resultsPaymentStatus !== 'paid');
                
                await sendB2BAllCompleteEmail({
                  email: candidateEmail,
                  candidateName: bundleCandidateName,
                  partnerCompanyName: partner.companyName || partner.name,
                  completedAssessments: bundleAssessmentTypes,
                  paidAssessments: bundlePaidSessions.map(s => s.assessmentType),
                  unpaidAssessments: bundleUnpaidSessions.map(s => s.assessmentType),
                  paymentUrl: bundlePaymentUrl,
                  bundlePrice: bundleDiscountedDisplay,
                  originalTotalPrice: bundleOriginalDisplay,
                  discountPercentage: bundleDiscountPercent,
                  freeUnlockDate,
                });
                console.log(`[B2B Email] Sent bundle offer email to ${candidateEmail}`);
              } catch (bundleEmailError) {
                console.error('[B2B Email] Failed to send bundle offer email:', bundleEmailError);
              }
            }
          } catch (pricingError) {
            console.error('[B2B Pricing] Failed to calculate pricing:', pricingError);
          }
        }
        
        // Update partner invitation status if this session was created from an invitation
        const sessionMetadata = session.metadata as any;
        if (sessionMetadata?.invitationId && sessionMetadata?.source === 'partner_invitation') {
          try {
            const invitationId = sessionMetadata.invitationId;
            const invitation = await storage.getPartnerCandidateInvitation(invitationId);
            if (invitation) {
              // Get all completed sessions for this partner invitation
              const allSessions = await storage.getSessionsByPartner(session.partnerId, 100);
              const invitationSessions = allSessions.filter(
                (s: any) => (s.metadata as any)?.invitationId === invitationId && s.status === 'completed'
              );
              
              const completedTypes = invitationSessions.map((s: any) => normalizeAssessmentId(s.assessmentType));
              const normalizedInvitationTypes = invitation.assessmentTypes.map((t: string) => normalizeAssessmentId(t));
              
              const allComplete = normalizedInvitationTypes.every((type: string) => completedTypes.includes(type));
              
              if (allComplete && invitation.status !== 'completed') {
                await storage.updatePartnerCandidateInvitation(invitationId, {
                  status: 'completed',
                  completedAt: new Date(),
                });
                console.log(`[Partner Invitation] All assessments completed for invitation ${invitationId}`);
              }
              
              // CRITICAL FIX: Sync assessment_results for logged-in users immediately after completion
              // This ensures the dashboard shows the result without requiring a separate account creation flow
              if (invitation.email) {
                // Find user by email to check if they have an account
                const linkedUser = await storage.getUserByEmail(invitation.email);
                if (linkedUser) {
                  // User has an account - sync this completed session immediately
                  const existingResults = await storage.getResultsByUser(linkedUser.id);
                  const hasExistingResult = existingResults.some(
                    (r: any) => r.partnerInvitationId === invitationId && r.assessmentType === session.assessmentType
                  );
                  
                  if (!hasExistingResult) {
                    // Fetch the updated session to get the final scores
                    const updatedSessionForSync = await storage.getAssessmentSession(sessionId);
                    if (updatedSessionForSync && updatedSessionForSync.status === 'completed') {
                      await storage.createAssessmentResult({
                        userId: linkedUser.id,
                        partnerInvitationId: invitationId,
                        assessmentType: updatedSessionForSync.assessmentType,
                        questionLocale: updatedSessionForSync.questionLocale || 'default',
                        answers: updatedSessionForSync.answers || {},
                        scores: updatedSessionForSync.scores || {},
                        totalScore: updatedSessionForSync.totalScore,
                        percentile: updatedSessionForSync.percentile,
                        evaluations: updatedSessionForSync.evaluations,
                        status: 'completed',
                        completedAt: updatedSessionForSync.completedAt,
                      });
                      console.log(`[Partner Invitation] Synced assessment_result for user ${linkedUser.id}, type: ${session.assessmentType}`);
                    }
                  }
                }
              }
            }
          } catch (invError) {
            console.error('[Partner Invitation] Failed to update invitation status:', invError);
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
      
      // Google Workspace daily limit: 2000 emails/day
      // We limit to 500 per batch to allow multiple batches per day
      const DAILY_EMAIL_LIMIT = 2000;
      const MAX_BATCH_SIZE = 500;
      
      const bodySchema = z.object({
        candidates: z.array(z.object({
          externalUserId: z.string().transform(s => s.trim()).optional().nullable(),
          email: z.string().transform(s => s.trim()).refine(
            (val) => val === '' || isValidEmail(val),
            { message: "Invalid email format" }
          ).optional().nullable(),
          name: z.string().optional().nullable(),
          metadata: z.record(z.any()).optional().nullable(),
        })).min(1, "At least one candidate required").max(MAX_BATCH_SIZE, `Maximum ${MAX_BATCH_SIZE} candidates per batch`),
        assessmentTypes: z.array(z.string()).min(1, "At least one assessment type required"),
        sendEmails: z.boolean().default(true),
        expiresInDays: z.number().min(1).max(30).default(7), // 7-day default expiry
        forceReinvite: z.boolean().default(false), // Allow re-inviting existing candidates for new testing series
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
      
      const { candidates, assessmentTypes, sendEmails, expiresInDays, forceReinvite } = parsed.data;
      
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
      const candidatesToReactivate: Array<{ row: number; candidate: any; existingInvitation: any; identifier: string }> = [];
      const seenEmails = new Map<string, number>();
      
      // Pre-fetch all team members for this partner to check for conflicts
      const teamMembers = await storage.getPartnerTeamMembers(partner.id);
      const teamMemberEmails = new Set(teamMembers.map(tm => tm.email.toLowerCase()));
      
      // Pre-fetch existing invitations for this partner to check for duplicates
      const candidateEmails = candidates
        .map(c => c.email?.trim().toLowerCase())
        .filter((e): e is string => !!e);
      const existingInvitations = await storage.getPartnerCandidateInvitationsByPartnerAndEmails(partner.id, candidateEmails);
      const existingInvitationEmails = new Map<string, any>();
      for (const inv of existingInvitations) {
        if (inv.email) {
          existingInvitationEmails.set(inv.email.toLowerCase(), inv);
        }
      }
      
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const row = i + 1;
        const identifier = candidate.email || candidate.externalUserId || `row-${row}`;
        
        // Email is now required (externalUserId is optional)
        if (!candidate.email || candidate.email.trim() === '') {
          validationErrors.push({ row, externalUserId: identifier, field: 'email', error: 'Email is required' });
          continue;
        }
        
        // Validate email format using shared validation
        if (!isValidEmail(candidate.email.trim())) {
          validationErrors.push({ row, externalUserId: identifier, field: 'email', error: 'Invalid email format' });
          continue;
        }
        
        // Check if this email belongs to an existing team member
        if (teamMemberEmails.has(candidate.email.toLowerCase())) {
          validationErrors.push({ 
            row, 
            externalUserId: identifier, 
            field: 'email', 
            error: 'This email belongs to a team member. They cannot be invited as a candidate. Use a different email address.' 
          });
          continue;
        }
        
        // Check if this candidate already exists in the system
        const existingInvitation = existingInvitationEmails.get(candidate.email.toLowerCase());
        if (existingInvitation) {
          if (existingInvitation.status === 'revoked' || existingInvitation.status === 'expired') {
            candidatesToReactivate.push({
              row,
              candidate,
              existingInvitation,
              identifier
            });
            continue;
          }
          
          // Always allow re-inviting the same email - creates a new invitation for a new testing series
          console.log(`[Bulk Invitations] Re-invite for ${candidate.email} (existing status: ${existingInvitation.status}) - creating new invitation`);
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
        console.log('[Bulk Invitations] Validation failed with errors:', JSON.stringify(validationErrors, null, 2));
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
      
      // Check daily email limit (Google Workspace: 2000/day)
      if (sendEmails) {
        const todayEmailCount = await storage.countTodayPartnerInvitationEmails();
        const emailsToSend = candidates.filter(c => c.email?.trim()).length;
        const remainingDaily = DAILY_EMAIL_LIMIT - todayEmailCount;
        
        if (emailsToSend > remainingDaily) {
          return res.status(400).json({
            error: `Daily email limit exceeded`,
            errors: [{
              row: 0,
              externalUserId: '',
              field: 'sendEmails',
              error: `Daily limit is ${DAILY_EMAIL_LIMIT} emails. ${todayEmailCount} sent today, ${remainingDaily} remaining. Reduce batch size or disable email sending.`
            }],
            summary: {
              totalCandidates: candidates.length,
              successCount: 0,
              failedCount: candidates.length,
              tokensUsed: 0,
              dailyEmailsRemaining: remainingDaily,
            },
          });
        }
      }
      
      // Calculate tokens required (only after validation passes)
      const tokensRequired = candidates.length * assessmentTypes.length;
      
      // Check prepaid balance for prepaid and payg partners
      const partnerAccount = await storage.getPartnerAccount(partner.id);
      if (partnerAccount?.billingType === 'prepaid' || partnerAccount?.billingType === 'payg') {
        const balance = await storage.getPartnerQuotaBalance(partner.id);
        if (balance.remaining < tokensRequired) {
          return res.status(400).json({ 
            error: "Insufficient credits",
            code: "INSUFFICIENT_CREDITS",
            tokensRequired,
            tokensRemaining: balance.remaining,
            maxCandidates: Math.floor(balance.remaining / assessmentTypes.length),
            maxAssessments: balance.remaining,
            errors: [{ 
              row: 0, 
              externalUserId: '', 
              field: 'credits', 
              error: `You need ${tokensRequired} credits but only have ${balance.remaining} available. You can invite up to ${Math.floor(balance.remaining / assessmentTypes.length)} candidate(s) with ${assessmentTypes.length} assessment(s) each, or reduce the number of assessments per candidate.`
            }],
            summary: {
              totalCandidates: candidates.length,
              successCount: 0,
              failedCount: candidates.length,
              tokensUsed: 0,
            },
            purchaseUrl: '/partner-dashboard?tab=billing',
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
          // Note: We allow re-inviting the same candidate multiple times
          // Each invitation creates a new "testing series" with fresh assessment sessions
          // This matches the behavior of logged-in candidates starting new assessments
          
          // Note: We do NOT create user accounts at invitation time.
          // Account creation happens after the candidate completes all assessments
          // via the GuestInvite page's "Create Account" flow.
          
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
      
      // Handle reactivation of revoked/expired invitations
      let reactivatedInvitations: any[] = [];
      if (candidatesToReactivate.length > 0) {
        console.log(`[Bulk Invitations] Reactivating ${candidatesToReactivate.length} revoked/expired invitations`);
        for (const { row, candidate, existingInvitation, identifier } of candidatesToReactivate) {
          try {
                        const newInviteToken = crypto.randomBytes(32).toString('hex');
            const newExpiresAt = new Date();
            newExpiresAt.setDate(newExpiresAt.getDate() + expiresInDays);
            const baseUrl = getBaseUrl(req);
            const newInviteUrl = `${baseUrl}/invite/${newInviteToken}`;
            
            // Determine assessment types - use existing or new ones
            const assessmentTypes = candidate.assessmentTypes?.length > 0 
              ? candidate.assessmentTypes.map((t: string) => t.toLowerCase())
              : existingInvitation.assessmentTypes || ['fit'];
            
            await storage.updatePartnerCandidateInvitation(existingInvitation.id, {
              status: 'pending',
              inviteToken: newInviteToken,
              inviteUrl: newInviteUrl,
              expiresAt: newExpiresAt,
              name: candidate.name || existingInvitation.name,
              metadata: candidate.metadata || existingInvitation.metadata,
              assessmentTypes: assessmentTypes,
              tokensUsed: assessmentTypes.length,
              emailSentAt: undefined, // Reset email tracking
            });
            
            reactivatedInvitations.push({
              ...existingInvitation,
              status: 'pending',
              inviteToken: newInviteToken,
              inviteUrl: newInviteUrl,
              expiresAt: newExpiresAt,
              tokensUsed: assessmentTypes.length,
            });
          } catch (err: any) {
            console.error(`[Bulk Invitations] Failed to reactivate invitation for ${candidate.email}:`, err);
            errors.push({
              row,
              externalUserId: identifier,
              error: `Failed to reactivate invitation: ${err.message || 'Unknown error'}`,
            });
          }
        }
        console.log(`[Bulk Invitations] Reactivated ${reactivatedInvitations.length} invitations`);
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
      
      // Combine created and reactivated invitations for totals
      const allSuccessfulInvitations = [...createdInvitations, ...reactivatedInvitations];
      const totalSuccess = allSuccessfulInvitations.length;
      const totalTokensUsed = allSuccessfulInvitations.reduce((sum, inv) => sum + (inv.tokensUsed || 0), 0);
      
      // Update import record
      await storage.updatePartnerCandidateImport(importRecord.id, {
        successCount: totalSuccess,
        failedCount: errors.length,
        tokensUsed: totalTokensUsed,
        status: errors.length === 0 ? 'completed' : (totalSuccess > 0 ? 'partial' : 'failed'),
        errorReport: errors.length > 0 ? { errors } : null,
        completedAt: new Date(),
      });
      
      // Respond immediately
      res.json({
        success: true,
        importId: importRecord.id,
        summary: {
          totalCandidates: candidates.length,
          successCount: totalSuccess,
          newInvitations: createdInvitations.length,
          reactivatedInvitations: reactivatedInvitations.length,
          failedCount: errors.length,
          tokensUsed: totalTokensUsed,
        },
        errors: errors.length > 0 ? errors : undefined,
        invitations: allSuccessfulInvitations.map(inv => ({
          id: inv.id,
          externalUserId: inv.externalUserId,
          email: inv.email,
          inviteUrl: inv.inviteUrl,
          status: inv.status,
          expiresAt: inv.expiresAt,
          reactivated: reactivatedInvitations.some(r => r.id === inv.id),
        })),
      });
      
      // Send emails in background with rate limiting to avoid overwhelming SMTP
      // Gmail limits: ~500/day regular, 2000/day Workspace
      // We limit to 5 concurrent emails with 200ms delay between batches
      if (sendEmails && createdInvitations.length > 0) {
        const emailLimit = pLimit(5); // Max 5 concurrent email sends
        const BATCH_SIZE = 50;
        const BATCH_DELAY_MS = 1000; // 1 second delay between batches
        
        setImmediate(async () => {
          const invitationsWithEmail = createdInvitations.filter(inv => inv.email);
          const totalEmails = invitationsWithEmail.length;
          let sentCount = 0;
          let failedCount = 0;
          
          console.log(`[Bulk Invitations] Starting email delivery for ${totalEmails} invitations...`);
          
          // Process in batches to avoid overwhelming SMTP
          for (let batchStart = 0; batchStart < invitationsWithEmail.length; batchStart += BATCH_SIZE) {
            const batch = invitationsWithEmail.slice(batchStart, batchStart + BATCH_SIZE);
            
            // Process batch with concurrency limit
            await Promise.all(batch.map(inv => emailLimit(async () => {
              try {
                // Note: No credentials are sent in the invitation email.
                // Account creation happens after the candidate completes all assessments.
                const emailResult = await sendPartnerBulkInvitationEmail({
                  candidateEmail: inv.email,
                  candidateName: inv.name || undefined,
                  assessmentTypes: inv.assessmentTypes,
                  inviteToken: inv.inviteToken,
                  partnerCompanyName: partnerAccount?.companyName || partner.companyName || 'HumanMetrix Partner',
                  partnerLogoUrl: partnerAccount?.logoUrl,
                  partnerPrimaryColor: partnerAccount?.brandingPrimaryColor,
                  expiresAt: inv.expiresAt,
                  // No temporaryPassword - account is created after assessment completion
                });
                
                if (emailResult.success) {
                  await storage.updatePartnerCandidateInvitation(inv.id, {
                    status: 'sent',
                    emailSentAt: new Date(),
                  });
                  sentCount++;
                } else {
                  failedCount++;
                }
              } catch (emailError: any) {
                console.error(`Failed to send email to ${inv.email}:`, emailError.message);
                failedCount++;
              }
            })));
            
            // Log progress for large batches
            if (totalEmails > 100) {
              console.log(`[Bulk Invitations] Email progress: ${sentCount + failedCount}/${totalEmails} processed (${sentCount} sent, ${failedCount} failed)`);
            }
            
            // Delay between batches to avoid rate limiting
            if (batchStart + BATCH_SIZE < invitationsWithEmail.length) {
              await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
            }
          }
          
          console.log(`[Bulk Invitations] Email delivery complete: ${sentCount} sent, ${failedCount} failed out of ${totalEmails}`);
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

  // Send or resend invitation email
  app.post("/api/partner/me/invitations/:invitationId/send-email", isAuthenticated, async (req: any, res: Response) => {
    try {
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
      
      const { invitationId } = req.params;
      
      // Get the invitation
      const invitation = await storage.getPartnerCandidateInvitation(invitationId);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      // Verify invitation belongs to this partner
      if (invitation.partnerId !== partner.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Check if candidate has an email
      if (!invitation.email) {
        return res.status(400).json({ error: "Invitation has no email address" });
      }
      
      // Check if invitation is still valid (not completed)
      if (invitation.status === 'completed') {
        return res.status(400).json({ error: "Cannot send email for completed invitation" });
      }
      
      // For expired or revoked invitations, regenerate token and extend expiry
      let inviteToken = invitation.inviteToken;
      let expiresAt = invitation.expiresAt;
      const isExpired = invitation.expiresAt && new Date(invitation.expiresAt) < new Date();
      const isRevoked = invitation.status === 'revoked';
      
      if (isExpired || isRevoked) {
                inviteToken = crypto.randomBytes(32).toString('hex');
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14); // 14 day expiry
        
        const baseUrl = getBaseUrl(req);
        const inviteUrl = `${baseUrl}/invite/${inviteToken}`;
        
        await storage.updatePartnerCandidateInvitation(invitation.id, {
          status: 'pending',
          inviteToken,
          inviteUrl,
          expiresAt,
        });
      }
      
      const isResume = invitation.status === 'started';
      
      const emailResult = await sendPartnerBulkInvitationEmail({
        candidateEmail: invitation.email,
        candidateName: invitation.name || undefined,
        assessmentTypes: invitation.assessmentTypes,
        inviteToken,
        partnerCompanyName: partner.companyName || 'HumanMetrix Partner',
        partnerLogoUrl: partner.logoUrl,
        partnerPrimaryColor: partner.brandingPrimaryColor,
        expiresAt,
        isResume,
      });
      
      if (!emailResult.success) {
        return res.status(500).json({ error: "Failed to send email" });
      }
      
      // Update invitation status
      await storage.updatePartnerCandidateInvitation(invitation.id, {
        status: invitation.status === 'pending' ? 'sent' : invitation.status,
        emailSentAt: new Date(),
      });
      
      let message = "Email sent successfully";
      if (isExpired) {
        message = "Invitation renewed and email sent. The invitation now has a new expiry date.";
      } else if (isRevoked) {
        message = "Invitation reactivated and email sent.";
      } else if (isResume) {
        message = "Reminder email sent to continue their in-progress assessments.";
      } else if (invitation.emailSentAt) {
        message = "Email resent successfully";
      }
      
      res.json({ 
        success: true, 
        message,
        reactivated: isExpired || isRevoked,
        newExpiresAt: (isExpired || isRevoked) ? expiresAt : undefined,
      });
    } catch (error) {
      console.error("Error sending invitation email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Revoke an invitation (only if not started or completed)
  app.delete("/api/partner/me/invitations/:invitationId", isAuthenticated, async (req: any, res: Response) => {
    try {
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
      
      const { invitationId } = req.params;
      
      // Get the invitation
      const invitation = await storage.getPartnerCandidateInvitation(invitationId);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      // Verify invitation belongs to this partner
      if (invitation.partnerId !== partner.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Only allow revoking pending or sent invitations
      if (invitation.status === 'started' || invitation.status === 'completed') {
        return res.status(400).json({ 
          error: "Cannot revoke invitation", 
          message: `Invitation is already ${invitation.status}. You can only revoke invitations that haven't been started.` 
        });
      }
      
      // Update the invitation status to revoked
      await storage.updatePartnerCandidateInvitation(invitationId, { 
        status: 'revoked' 
      });
      
      console.log(`[Partner Invitations] Invitation ${invitationId} revoked by partner ${partner.id}`);
      
      res.json({ 
        success: true, 
        message: "Invitation revoked successfully" 
      });
    } catch (error) {
      console.error("Error revoking invitation:", error);
      res.status(500).json({ error: "Failed to revoke invitation" });
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
        // Instead of blocking, return redirect info for completed invitations
        // Check if user has an account to redirect to dashboard
        let hasAccount = false;
        if (invitation.email) {
          const existingUser = await storage.getUserByEmail(invitation.email);
          hasAccount = !!existingUser;
        }
        
        return res.status(200).json({ 
          isCompleted: true,
          hasAccount,
          email: invitation.email,
          invitationToken: token,
          message: hasAccount 
            ? "Assessments completed. Please log in to view your results."
            : "Assessments completed. Create an account to access your results.",
          redirectTo: hasAccount ? '/login' : `/invite/${token}`
        });
      }
      
      if (invitation.status === 'revoked') {
        return res.status(410).json({ error: "This invitation has been revoked" });
      }
      
      // Check if expired based on date
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        await storage.updatePartnerCandidateInvitation(invitation.id, { status: 'expired' });
        return res.status(410).json({ error: "This invitation has expired" });
      }
      
      // Get partner branding
      const partnerAccount = await storage.getPartnerAccount(invitation.partnerId);
      
      // Find completed assessments for this invitation by checking completed sessions
      const completedSessions = await db
        .select({ assessmentType: assessmentSessions.assessmentType })
        .from(assessmentSessions)
        .where(
          and(
            sql`${assessmentSessions.metadata}->>'invitationToken' = ${token}`,
            eq(assessmentSessions.status, 'completed')
          )
        );
      
      const completedAssessmentTypes = completedSessions.map(s => s.assessmentType);
      console.log(`[Invite Validation] Completed assessments for token ${token}:`, completedAssessmentTypes);
      
      // Also check for an in-progress session to resume
      const inProgressSession = await db
        .select({ id: assessmentSessions.id, assessmentType: assessmentSessions.assessmentType })
        .from(assessmentSessions)
        .where(
          and(
            sql`${assessmentSessions.metadata}->>'invitationToken' = ${token}`,
            eq(assessmentSessions.status, 'started')
          )
        )
        .limit(1);
      
      res.json({
        id: invitation.id,
        externalUserId: invitation.externalUserId,
        name: invitation.name,
        assessmentTypes: invitation.assessmentTypes,
        completedAssessmentTypes,
        inProgressSession: inProgressSession[0] || null,
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
      
      // Check for existing in-progress session to resume
      const existingSession = await db
        .select()
        .from(assessmentSessions)
        .where(
          and(
            sql`${assessmentSessions.metadata}->>'invitationToken' = ${token}`,
            eq(assessmentSessions.status, 'started')
          )
        )
        .limit(1);
      
      // Check for completed sessions to skip those assessment types
      const completedSessions = await db
        .select({ assessmentType: assessmentSessions.assessmentType })
        .from(assessmentSessions)
        .where(
          and(
            sql`${assessmentSessions.metadata}->>'invitationToken' = ${token}`,
            eq(assessmentSessions.status, 'completed')
          )
        );
      
      const completedTypes = completedSessions.map(s => s.assessmentType);
      const remainingTypes = invitation.assessmentTypes.filter(t => !completedTypes.includes(t));
      
      const baseUrl = getBaseUrl(req);
      
      // If there's an existing in-progress session, resume it
      if (existingSession.length > 0) {
        const session = existingSession[0];
        console.log(`[Invite Start] Resuming existing session ${session.id} for token ${token}`);
        
        res.json({
          sessionId: session.id,
          widgetUrl: `${baseUrl}/embed/assessment?session=${session.id}&types=${remainingTypes.join(',')}&inviteToken=${token}`,
          assessmentType: session.assessmentType,
          assessmentTypes: remainingTypes,
          resumed: true,
        });
        return;
      }
      
      // Create new assessment session starting with the first remaining type
      const startingType = remainingTypes[0] || normalizedType;
      // Use the invitation's expiration date, or fall back to 7 days if not set
      const expiresAt = invitation.expiresAt 
        ? new Date(invitation.expiresAt) 
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const session = await storage.createAssessmentSession({
        partnerId: invitation.partnerId,
        partnerOrganisationId: null,
        apiKeyId: null,
        assessmentType: startingType,
        externalUserId: invitation.externalUserId,
        externalEmail: invitation.email,
        metadata: {
          ...invitation.metadata,
          invitationId: invitation.id,
          invitationToken: token,
          source: 'partner_invitation',
          candidateName: invitation.name,
        },
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
      
      console.log(`[Invite Start] Created new session ${session.id} for token ${token}, remaining types: ${remainingTypes.join(',')}`);
      
      res.json({
        sessionId: session.id,
        widgetUrl: `${baseUrl}/embed/assessment?session=${session.id}&types=${remainingTypes.join(',')}&inviteToken=${token}`,
        assessmentType: startingType,
        assessmentTypes: remainingTypes,
        resumed: false,
      });
    } catch (error) {
      console.error("Error starting assessment from invite:", error);
      res.status(500).json({ error: "Failed to start assessment" });
    }
  });

  // Complete partner invitation - check user existence and send completion email (public endpoint)
  app.post("/api/invite/:token/complete", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ error: "Missing invite token" });
      }
      
      const invitation = await storage.getPartnerCandidateInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ error: "Invalid invitation" });
      }
      
      if (!invitation.email) {
        return res.status(400).json({ error: "No email associated with this invitation" });
      }
      
      // Get partner for branding
      const partnerAccount = await storage.getPartnerAccount(invitation.partnerId);
      const companyName = partnerAccount?.companyName || 'HumanMetrix Partner';
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(invitation.email);
      const userExists = !!existingUser;
      
      // Get all completed assessment sessions for this invitation (with metadata for country code)
      const completedSessions = await db
        .select({ 
          assessmentType: assessmentSessions.assessmentType,
          metadata: assessmentSessions.metadata,
          resultsPaymentStatus: assessmentSessions.resultsPaymentStatus,
        })
        .from(assessmentSessions)
        .where(
          and(
            sql`${assessmentSessions.metadata}->>'invitationToken' = ${token}`,
            eq(assessmentSessions.status, 'completed')
          )
        );
      
      const completedTypes = completedSessions.map(s => s.assessmentType);
      
      // Check if all assessments are complete
      const allComplete = invitation.assessmentTypes.every(t => completedTypes.includes(t));
      
      if (!allComplete) {
        return res.status(400).json({ 
          error: "Not all assessments are complete",
          completedTypes,
          remainingTypes: invitation.assessmentTypes.filter(t => !completedTypes.includes(t))
        });
      }
      
      // Get country code from session metadata for PPP pricing
      const sessionWithCountry = completedSessions.find(s => (s.metadata as any)?.countryCode);
      const userCountryCode = (sessionWithCountry?.metadata as any)?.countryCode || 'GB';
      
      // Check if user has already paid for any results (sessions unlocked mid-series)
      const paidCount = completedSessions.filter(s => s.resultsPaymentStatus === 'paid').length;
      const hasAlreadyPaid = paidCount > 0;
      
      const unpaidCount = completedTypes.length - paidCount;
      const assessmentCount = unpaidCount > 0 ? unpaidCount : completedTypes.length;
      
      const unpaidAssessmentTypes = completedSessions.filter(s => s.resultsPaymentStatus !== 'paid').map(s => s.assessmentType);
      const relevantTypes = unpaidCount > 0 ? unpaidAssessmentTypes : completedTypes;
      
      // Use canonical pricing function (same formula as B2C)
      const localCurrencyCode = COUNTRY_CURRENCY_MAP[userCountryCode.toUpperCase()] || 'GBP';
      const exchangeRatesData = await getExchangeRates();
      const liveRate = exchangeRatesData.rates?.[localCurrencyCode] ?? undefined;
      
      const completionItems = relevantTypes.map(type => ({
        type: normalizeAssessmentId(type),
        priceInPence: ASSESSMENT_PRICES[normalizeAssessmentId(type)] || 400,
      }));
      
      const discountPercentage = assessmentCount >= 2 ? 25 : 0;
      
      const originalPricing = calculateCandidatePricing(
        userCountryCode, completionItems, BASE_FEE,
        { exchangeRate: liveRate }
      );
      const discountedPricing = calculateCandidatePricing(
        userCountryCode, completionItems, BASE_FEE,
        { exchangeRate: liveRate, bundleDiscount: discountPercentage }
      );
      
      const bundlePriceDisplay = discountedPricing.totalDisplay;
      const originalPriceDisplay = originalPricing.totalDisplay;
      
      console.log(`[Invite Complete] Country: ${userCountryCode}, Original: ${originalPriceDisplay}, Bundle: ${bundlePriceDisplay}`);
      
      // Free unlock date (30 days from now)
      const freeUnlockDate = new Date();
      freeUnlockDate.setDate(freeUnlockDate.getDate() + 30);
      
      // Generate payment URL with invitation context and country code
      const baseUrl = getBaseUrl(req);
      const paymentUrl = `${baseUrl}/unlock-results?email=${encodeURIComponent(invitation.email)}&invite=${token}&country=${userCountryCode}`;
      
      const paidTypes = completedSessions.filter(s => s.resultsPaymentStatus === 'paid').map(s => s.assessmentType);
      const unpaidTypes = completedSessions.filter(s => s.resultsPaymentStatus !== 'paid').map(s => s.assessmentType);
      
      // Send completion email (always send, but content adapts based on paid/unpaid status)
      try {
        await sendB2BAllCompleteEmail({
          email: invitation.email,
          candidateName: invitation.name || undefined,
          partnerCompanyName: companyName,
          completedAssessments: completedTypes,
          paidAssessments: paidTypes,
          unpaidAssessments: unpaidTypes,
          paymentUrl,
          bundlePrice: bundlePriceDisplay,
          originalTotalPrice: originalPriceDisplay,
          discountPercentage,
          freeUnlockDate,
        });
        console.log(`[Invite Complete] Sent completion email to ${invitation.email} (${unpaidTypes.length} unpaid, ${paidTypes.length} paid)`);
      } catch (emailError) {
        console.error(`[Invite Complete] Failed to send completion email:`, emailError);
      }
      
      // Update invitation status to completed and lock exchange rate for pricing consistency
      const existingMetadata = (invitation.metadata as Record<string, any>) || {};
      await storage.updatePartnerCandidateInvitation(invitation.id, { 
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          ...existingMetadata,
          lockedExchangeRate: liveRate,
          lockedCurrencyCode: localCurrencyCode,
          lockedCountryCode: userCountryCode,
          pricingLockedAt: new Date().toISOString(),
        },
      });
      
      const dashboardUrl = userExists 
        ? `${baseUrl}/dashboard?view=candidate&scrollToSeries=${invitation.id}`
        : null;
      
      res.json({
        success: true,
        userExists,
        email: invitation.email,
        completedAssessments: completedTypes,
        unpaidCount,
        bundlePrice: bundlePriceDisplay,
        originalPrice: originalPriceDisplay,
        discountPercentage,
        freeUnlockDate: freeUnlockDate.toISOString(),
        dashboardUrl,
        createAccountUrl: !userExists ? `${baseUrl}/login?email=${encodeURIComponent(invitation.email)}&redirect=/my-results` : null,
        paymentUrl,
      });
    } catch (error) {
      console.error("Error completing invitation:", error);
      res.status(500).json({ error: "Failed to complete invitation" });
    }
  });

  // ========== Unlock Results Endpoints (for email payment links) ==========

  // Get unlock results data for a partner invitation
  app.get("/api/unlock-results", async (req: Request, res: Response) => {
    try {
      const { email, invite: inviteToken, country: countryCode = 'GB' } = req.query;
      
      if (!email || !inviteToken) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      // Find the invitation
      const invitation = await storage.getPartnerCandidateInvitationByToken(inviteToken as string);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      if (invitation.email?.toLowerCase() !== (email as string).toLowerCase()) {
        return res.status(400).json({ error: "Email does not match invitation" });
      }
      
      // Get partner company name
      const partner = await storage.getPartnerAccount(invitation.partnerId);
      const partnerName = partner?.companyName || "Partner";
      
      // Get all completed sessions for this invitation
      const completedSessions = await db
        .select({
          id: assessmentSessions.id,
          assessmentType: assessmentSessions.assessmentType,
          completedAt: assessmentSessions.completedAt,
          resultsPaymentStatus: assessmentSessions.resultsPaymentStatus,
        })
        .from(assessmentSessions)
        .where(
          and(
            sql`${assessmentSessions.metadata}->>'invitationToken' = ${inviteToken}`,
            eq(assessmentSessions.status, 'completed')
          )
        );
      
      if (completedSessions.length === 0) {
        return res.status(404).json({ error: "No completed assessments found" });
      }
      
      // Check if all are paid
      const allPaid = completedSessions.every(s => s.resultsPaymentStatus === 'paid');
      const unpaidCount = completedSessions.filter(s => s.resultsPaymentStatus !== 'paid').length;
      
      // Use canonical pricing function
      const userCountry = (countryCode as string).toUpperCase();
      const localCurrencyCode = COUNTRY_CURRENCY_MAP[userCountry] || 'GBP';
      const unpaidSessions = completedSessions.filter(s => s.resultsPaymentStatus !== 'paid');
      
      // Use locked exchange rate from invitation metadata for pricing consistency
      const unlockLockedRate = (invitation?.metadata as any)?.lockedExchangeRate;
      const effectiveRate = unlockLockedRate ?? (await getExchangeRates()).rates?.[localCurrencyCode] ?? undefined;
      
      if (unlockLockedRate) {
        console.log(`[Unlock Results] Using locked exchange rate ${unlockLockedRate} for ${localCurrencyCode}`);
      }
      
      // Single assessment pricing (no discount — same as B2C)
      const singleType = normalizeAssessmentId(unpaidSessions[0]?.assessmentType || 'fit');
      const singleItem = [{ type: singleType, priceInPence: ASSESSMENT_PRICES[singleType] || 400 }];
      const singlePricing = calculateCandidatePricing(
        userCountry, singleItem, BASE_FEE,
        { exchangeRate: effectiveRate }
      );
      
      // Bundle pricing: all unpaid (or all completed) assessments with 25% discount if >= 2
      const relevantSessions = unpaidCount > 0 ? unpaidSessions : completedSessions;
      const bundleItems = relevantSessions.map(s => ({
        type: normalizeAssessmentId(s.assessmentType),
        priceInPence: ASSESSMENT_PRICES[normalizeAssessmentId(s.assessmentType)] || 400,
      }));
      const bundleDiscountPercent = unpaidCount >= 2 ? 25 : 0;
      
      const bundleOriginalPricing = calculateCandidatePricing(
        userCountry, bundleItems, BASE_FEE,
        { exchangeRate: effectiveRate }
      );
      const bundleDiscountedPricing = calculateCandidatePricing(
        userCountry, bundleItems, BASE_FEE,
        { exchangeRate: effectiveRate, bundleDiscount: bundleDiscountPercent }
      );
      
      // Free unlock date (30 days from first completion)
      const firstCompletedAt = completedSessions
        .map(s => s.completedAt)
        .filter(Boolean)
        .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime())[0];
      
      let freeAccessDate: Date | null = null;
      if (firstCompletedAt) {
        freeAccessDate = new Date(firstCompletedAt);
        freeAccessDate.setDate(freeAccessDate.getDate() + 30);
      }
      
      res.json({
        email: invitation.email,
        inviteToken,
        partnerName,
        countryCode: userCountry,
        currencyCode: singlePricing.currencyCode,
        completedAssessments: completedSessions.map(s => ({
          sessionId: s.id,
          assessmentType: s.assessmentType,
          completedAt: s.completedAt?.toISOString() || null,
          paymentStatus: s.resultsPaymentStatus,
        })),
        pricing: {
          single: {
            originalPricePence: singlePricing.totalLocal,
            discountedPricePence: singlePricing.totalLocal,
            originalDisplay: singlePricing.totalDisplay,
            discountedDisplay: singlePricing.totalDisplay,
            discountPercent: 0,
          },
          bundle: {
            originalPricePence: bundleOriginalPricing.totalLocal,
            discountedPricePence: bundleDiscountedPricing.totalLocal,
            originalDisplay: bundleOriginalPricing.totalDisplay,
            discountedDisplay: bundleDiscountedPricing.totalDisplay,
            discountPercent: bundleDiscountPercent,
          },
        },
        freeAccessDate: freeAccessDate?.toISOString() || null,
        allPaid,
      });
    } catch (error) {
      console.error("Error fetching unlock results:", error);
      res.status(500).json({ error: "Failed to fetch results" });
    }
  });

  // Create checkout for unlock results
  app.post("/api/unlock-results/checkout", async (req: Request, res: Response) => {
    try {
      const { email, inviteToken, countryCode = 'GB', isBundle = false } = req.body;
      
      if (!email || !inviteToken) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      // Find the invitation
      const invitation = await storage.getPartnerCandidateInvitationByToken(inviteToken);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      if (invitation.email?.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ error: "Email does not match invitation" });
      }
      
      // Get partner company name
      const partner = await storage.getPartnerAccount(invitation.partnerId);
      const partnerName = partner?.companyName || "Partner";
      
      // Get unpaid sessions for this invitation
      const unpaidSessions = await db
        .select({ id: assessmentSessions.id, assessmentType: assessmentSessions.assessmentType })
        .from(assessmentSessions)
        .where(
          and(
            sql`${assessmentSessions.metadata}->>'invitationToken' = ${inviteToken}`,
            eq(assessmentSessions.status, 'completed'),
            or(
              eq(assessmentSessions.resultsPaymentStatus, 'pending'),
              isNull(assessmentSessions.resultsPaymentStatus)
            )
          )
        );
      
      if (unpaidSessions.length === 0) {
        return res.status(400).json({ error: "No unpaid assessments found" });
      }
      
      // Use canonical pricing function
      const userCountry = (countryCode as string).toUpperCase();
      const currencyCode = COUNTRY_CURRENCY_MAP[userCountry] || 'GBP';
      const { getStripeCurrencyCode } = await import("@shared/currencies");
      const stripeCurrency = getStripeCurrencyCode(userCountry);
      
      // Use locked exchange rate from invitation metadata for pricing consistency
      const unlockCheckoutLockedRate = (invitation?.metadata as any)?.lockedExchangeRate;
      const effectiveRate = unlockCheckoutLockedRate ?? (await getExchangeRates()).rates?.[currencyCode] ?? undefined;
      
      if (unlockCheckoutLockedRate) {
        console.log(`[Unlock Checkout] Using locked exchange rate ${unlockCheckoutLockedRate} for ${currencyCode}`);
      }
      
      let unlockPricing: ReturnType<typeof calculateCandidatePricing>;
      let description: string;
      
      if (isBundle && unpaidSessions.length > 1) {
        const bundleItems = unpaidSessions.map(s => ({
          type: normalizeAssessmentId(s.assessmentType),
          priceInPence: ASSESSMENT_PRICES[normalizeAssessmentId(s.assessmentType)] || 400,
        }));
        unlockPricing = calculateCandidatePricing(
          userCountry, bundleItems, BASE_FEE,
          { exchangeRate: effectiveRate, bundleDiscount: 25 }
        );
        description = `HumanMetrix - Unlock ${unpaidSessions.length} Assessment Results (25% Bundle Discount)`;
      } else {
        const singleType = normalizeAssessmentId(unpaidSessions[0].assessmentType);
        unlockPricing = calculateCandidatePricing(
          userCountry,
          [{ type: singleType, priceInPence: ASSESSMENT_PRICES[singleType] || 400 }],
          BASE_FEE,
          { exchangeRate: effectiveRate }
        );
        description = `HumanMetrix - Unlock Assessment Results`;
      }
      
      const totalLocal = unlockPricing.totalLocal;
      const stripeAmount = unlockPricing.stripeAmount;
      
      const baseUrl = getBaseUrl(req);
      const sessionIds = isBundle ? unpaidSessions.map(s => s.id) : [unpaidSessions[0].id];
      
      // Candidate-facing payments always use Airwallex as primary (partner preference only applies to partner's own payments)
      const { primary, fallback } = getPaymentProviders('airwallex');

      const airwallexFn = async (): Promise<PaymentCheckoutResult> => {
        const airwallexAmount = formatAmountForAirwallex(stripeAmount, stripeCurrency.toUpperCase());
        const merchantOrderId = `b2b_unlock_${inviteToken}_${Date.now()}`;
        const intent = await createPaymentIntent({
          amount: airwallexAmount,
          currency: stripeCurrency.toUpperCase(),
          merchantOrderId,
          returnUrl: `${baseUrl}/b2b-payment-callback?success=true&provider=airwallex`,
          customerEmail: email,
          description,
          metadata: {
            type: 'b2b_unlock',
            inviteToken,
            sessionIds: JSON.stringify(sessionIds),
            isBundle: String(isBundle),
            country_code: userCountry,
          },
        });
        return {
          provider: 'airwallex',
          intentId: intent.id,
          clientSecret: intent.clientSecret,
          amount: airwallexAmount,
          currency: stripeCurrency.toUpperCase(),
        };
      };

      const stripeFn = async (): Promise<PaymentCheckoutResult> => {
        const stripeSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          adaptive_pricing: { enabled: false },
          line_items: [{
            price_data: {
              currency: stripeCurrency,
              product_data: { name: description },
              unit_amount: stripeAmount,
            },
            quantity: 1,
          }],
          mode: 'payment',
          allow_promotion_codes: true,
          success_url: `${baseUrl}/b2b-payment-callback?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/unlock-results?email=${encodeURIComponent(email)}&invite=${inviteToken}`,
          customer_email: email,
          metadata: {
            type: 'b2b_unlock',
            inviteToken,
            sessionIds: JSON.stringify(sessionIds),
            isBundle: String(isBundle),
            country_code: userCountry,
          },
        });
        return { provider: 'stripe', url: stripeSession.url, sessionId: stripeSession.id };
      };

      const result = await createCheckoutWithFallback(primary, fallback, airwallexFn, stripeFn);

      if (result.provider === 'airwallex') {
        res.json({
          provider: 'airwallex',
          airwallexEnv,
          intentId: result.intentId,
          clientSecret: result.clientSecret,
          amount: result.amount,
          currency: result.currency,
        });
      } else {
        res.json({ checkoutUrl: result.url });
      }
    } catch (error) {
      console.error("Error creating unlock checkout:", error);
      res.status(500).json({ error: "Failed to create checkout" });
    }
  });

  // POST /api/unlock-results/process-payment - Process unlock results payment after Stripe callback
  app.post("/api/unlock-results/process-payment", async (req: Request, res: Response) => {
    try {
      const { stripeSessionId, intentId, provider } = req.body;
      
      let inviteToken: string;
      let sessionIdsJson: string;
      let isBundle: string | undefined;
      let sessionIds: string[];
      let email: string | null;
      let paymentIntentId: string;
      let amountTotal: number;
      let currency: string;
      let stripeSessionIdForRecord: string | undefined = stripeSessionId;
      
      if (provider === 'airwallex' && intentId) {
        const paymentIntent = await getPaymentIntent(intentId);
        if (paymentIntent.status !== 'SUCCEEDED') {
          return res.status(400).json({ error: "Payment not completed" });
        }
        
        const metadata = paymentIntent.metadata;
        if (!metadata || metadata.type !== 'b2b_unlock') {
          return res.status(400).json({ error: "Invalid payment type" });
        }
        
        inviteToken = metadata.inviteToken;
        sessionIdsJson = metadata.sessionIds;
        isBundle = metadata.isBundle;
        if (!inviteToken || !sessionIdsJson) {
          return res.status(400).json({ error: "Missing payment metadata" });
        }
        
        sessionIds = JSON.parse(sessionIdsJson);
        email = paymentIntent.order?.shipping?.email || metadata.email || null;
        paymentIntentId = intentId;
        amountTotal = Math.round(paymentIntent.amount * 100);
        currency = (paymentIntent.currency || 'GBP').toUpperCase();
        stripeSessionIdForRecord = undefined;
      } else if (stripeSessionId) {
        let checkoutSession;
        try {
          checkoutSession = await stripe.checkout.sessions.retrieve(stripeSessionId);
        } catch (stripeError: any) {
          console.error('[Unlock Results] Stripe session retrieval failed:', stripeError.message);
          return res.status(400).json({ error: "Failed to verify payment" });
        }
        
        if (checkoutSession.payment_status !== 'paid') {
          return res.status(400).json({ error: "Payment not completed" });
        }
        
        if (checkoutSession.metadata?.type !== 'b2b_unlock') {
          return res.status(400).json({ error: "Invalid payment type" });
        }
        
        inviteToken = checkoutSession.metadata.inviteToken;
        sessionIdsJson = checkoutSession.metadata.sessionIds;
        isBundle = checkoutSession.metadata.isBundle;
        if (!inviteToken || !sessionIdsJson) {
          return res.status(400).json({ error: "Missing payment metadata" });
        }
        
        sessionIds = JSON.parse(sessionIdsJson);
        email = checkoutSession.customer_email || null;
        paymentIntentId = (checkoutSession.payment_intent as string) || checkoutSession.id;
        amountTotal = checkoutSession.amount_total || 0;
        currency = (checkoutSession.currency || 'gbp').toUpperCase();
      } else {
        return res.status(400).json({ error: "Missing payment session ID" });
      }
      
      if (!email && sessionIds.length > 0) {
        const firstSession = await storage.getAssessmentSession(sessionIds[0]);
        email = firstSession?.externalEmail || null;
      }
      
      // Get the invitation
      const invitation = await storage.getPartnerCandidateInvitationByToken(inviteToken);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      // Get partner info
      const partner = await storage.getPartnerAccount(invitation.partnerId);
      const partnerName = partner?.companyName || partner?.name || "Partner";
      
      // Update all sessions to mark payment as complete
      const now = new Date();
      for (const sessionId of sessionIds) {
        await db.update(assessmentSessions)
          .set({
            resultsPaymentStatus: 'paid',
            resultsUnlockAt: now,
          })
          .where(eq(assessmentSessions.id, sessionId));
      }
      
      // Check if user has an existing account
      const existingUser = await storage.getUserByEmail(email || '');
      const hasExistingAccount = !!existingUser;
      
      // Auto-login existing user so they can access dashboard directly after payment
      if (hasExistingAccount && existingUser) {
        try {
          (req as any).session.userId = existingUser.id;
          await new Promise<void>((resolve, reject) => {
            (req as any).session.save((err: any) => {
              if (err) {
                console.error('[Unlock Results] Session save error:', err);
                resolve();
              } else {
                console.log(`[Unlock Results] Auto-logged in existing user ${existingUser.id}`);
                resolve();
              }
            });
          });
        } catch (loginErr: any) {
          console.error('[Unlock Results] Auto-login failed:', loginErr.message);
        }
      }
      
      // Create or update partner_result_purchases record if user exists
      if (existingUser) {
        // Check for existing purchase record
        const existingPurchase = await storage.getPartnerResultPurchaseByInvitation(existingUser.id, invitation.id);
        
        if (existingPurchase) {
          await storage.updatePartnerResultPurchase(existingPurchase.id, {
            status: 'completed',
            stripeSessionId: stripeSessionIdForRecord,
            stripePaymentIntentId: paymentIntentId,
            purchasedAt: now,
          });
        } else {
          await storage.createPartnerResultPurchase({
            userId: existingUser.id,
            partnerInvitationId: invitation.id,
            stripeSessionId: stripeSessionIdForRecord,
            amount: amountTotal,
            currency: currency,
            assessmentCount: sessionIds.length,
            status: 'completed',
          });
        }
      }
      
      // Send payment receipt email
      if (email) {
        try {
          const { sendPaymentReceiptWithPdf } = await import('./email');
          
          const receiptDetails = {
            email: email,
            name: email.split('@')[0] || 'Candidate',
            items: [{
              description: isBundle === 'true' ? `${sessionIds.length} Assessment Results Bundle` : 'Assessment Results',
              quantity: sessionIds.length,
              amount: amountTotal,
            }],
            subtotal: amountTotal,
            total: amountTotal,
            currency: currency,
            transactionId: paymentIntentId,
          };
          
          await sendPaymentReceiptWithPdf(receiptDetails);
          console.log(`[Unlock Results] Receipt email sent to ${email}`);
        } catch (receiptError: any) {
          console.error('[Unlock Results] Failed to send receipt email:', receiptError.message);
        }
      }
      
      // Send confirmation email with results
      if (email) {
        try {
          const { sendB2BResultsUnlockedEmail } = await import('./email');
          const baseUrl = getBaseUrl(req);
          const resultsUrl = `${baseUrl}/b2b-results/${sessionIds[0]}`;
          
          await sendB2BResultsUnlockedEmail(
            email,
            isBundle === 'true' ? `${sessionIds.length} Assessments` : 'Assessment Results',
            partnerName,
            resultsUrl
          );
          console.log(`[Unlock Results] Sent unlock confirmation email to ${email}`);
        } catch (emailError) {
          console.error('[Unlock Results] Failed to send email:', emailError);
        }
      }
      
      console.log(`[Unlock Results] Successfully processed payment for ${sessionIds.length} session(s), invite: ${inviteToken}`);
      
      res.json({
        success: true,
        email,
        hasExistingAccount,
        resultsUrl: `/b2b-results/${sessionIds[0]}`,
        sessionId: sessionIds[0], // For account creation flow
      });
    } catch (error: any) {
      console.error("Error processing unlock payment:", error);
      res.status(500).json({ error: "Failed to process payment" });
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
      
      // Only prepaid, payg, and subscription partners can save cards
      if (!['prepaid', 'payg', 'subscription'].includes(partner.billingType)) {
        return res.status(400).json({ error: "Card-on-file is not available for this billing type" });
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
              overageTests: charge.testsOverLimit.toString(),
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
            
            // Create success notification (uses dispatchPartnerNotification for preference checking)
            await storage.dispatchPartnerNotification({
              partnerId: partner.id,
              type: 'billing_success',
              title: 'Overage Billing Processed',
              message: `Your overage charges for ${charge.billingMonth} (£${(charge.totalAmount / 100).toFixed(2)} for ${charge.testsOverLimit} tests) have been successfully billed.`,
              metadata: { billingMonth: charge.billingMonth, amount: charge.totalAmount, tests: charge.testsOverLimit },
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
            metadata: { billingMonth: charge.billingMonth, error: paymentError.message },
          });
        }
      }
      
      // Update pendingOverageAmount for each partner based on what was successfully billed
      for (const [partnerId, billedAmount] of billedByPartner.entries()) {
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

  // ===== B2B Results Payment Flow =====
  
  // GET /api/b2b/session-results/:sessionId - Get full session data with scores for PDF generation
  // Security: Requires email query param that must match session email
  app.get("/api/b2b/session-results/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const email = req.query.email as string;
      
      // Get session with all data
      const session = await storage.getAssessmentSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Security: Validate ownership - email must match session email
      // This prevents IDOR attacks where anyone with a sessionId could fetch results
      if (!session.externalEmail) {
        return res.status(403).json({ error: "Session has no associated email" });
      }
      
      if (!email || email.toLowerCase() !== session.externalEmail.toLowerCase()) {
        return res.status(403).json({ error: "Unauthorized access to session" });
      }
      
      // Validate session is completed
      if (session.status !== 'completed') {
        return res.status(400).json({ error: "Assessment not completed" });
      }
      
      // Check if results are released (paid or free release)
      const isReleased = (session as any).resultsPaymentStatus === 'paid' || 
                         (session as any).resultsReleaseStatus === 'released';
      if (!isReleased) {
        return res.status(403).json({ error: "Results not yet unlocked" });
      }
      
      // Get partner info
      const partner = session.partnerId ? await storage.getPartnerAccount(session.partnerId) : null;
      
      res.json({
        sessionId: session.id,
        assessmentType: session.assessmentType,
        email: session.externalEmail,
        partnerName: partner?.companyName || partner?.name || 'Partner',
        scores: (session as any).scores || {},
        overallScore: (session as any).totalScore || 0,
        percentile: (session as any).percentile || null,
        completedAt: session.completedAt,
        resultsDeliveryStatus: (session as any).resultsDeliveryStatus || 'pending',
      });
    } catch (error) {
      console.error("Error getting B2B session results:", error);
      res.status(500).json({ error: "Failed to get session results" });
    }
  });

  // GET /api/b2b/results/:sessionId - Get session info and pricing for unlock page
  app.get("/api/b2b/results/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const countryCode = (req.query.country as string)?.toUpperCase() || 'GB';
      
      // Get session
      const session = await storage.getAssessmentSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Validate session is completed and results not yet released
      if (session.status !== 'completed') {
        return res.status(400).json({ error: "Assessment not completed" });
      }
      
      // Get partner info (needed for both already-paid and payment flow)
      const partner = await storage.getPartnerAccount(session.partnerId);
      
      // Check if already paid/released
      if ((session as any).resultsPaymentStatus === 'paid' || (session as any).resultsReleaseStatus === 'released') {
        // Check if user has an existing account
        const existingUser = await storage.getUserByEmail(session.externalEmail);
        const hasExistingAccount = !!existingUser;
        
        // Include delivery status so client knows if PDF email needs to be sent
        const resultsDeliveryStatus = (session as any).resultsDeliveryStatus || 'pending';
        
        return res.status(200).json({ 
          alreadyPaid: true,
          sessionId,
          email: session.externalEmail,
          assessmentType: session.assessmentType,
          partnerName: partner?.companyName || partner?.name || 'Partner',
          hasExistingAccount,
          userId: existingUser?.id,
          resultsDeliveryStatus,
        });
      }
      
      // Use canonical pricing function (same formula as B2C)
      const normalizedType = normalizeAssessmentId(session.assessmentType);
      const assessmentPrice = ASSESSMENT_PRICES[normalizedType] || 400;
      const localCurrencyCode = COUNTRY_CURRENCY_MAP[countryCode] || 'GBP';
      
      // Use locked exchange rate from invitation metadata for pricing consistency
      const invitationId = (session.metadata as any)?.invitationId;
      const invitation = invitationId ? await storage.getPartnerCandidateInvitation(invitationId) : null;
      const lockedRate = (invitation?.metadata as any)?.lockedExchangeRate;
      const effectiveRate = lockedRate ?? (await getExchangeRates()).rates?.[localCurrencyCode] ?? undefined;
      
      if (lockedRate) {
        console.log(`[B2B Results] Using locked exchange rate ${lockedRate} for ${localCurrencyCode}`);
      }
      
      // Single assessment pricing (no discount — same as B2C)
      const singlePricing = calculateCandidatePricing(
        countryCode,
        [{ type: normalizedType, priceInPence: assessmentPrice }],
        BASE_FEE,
        { exchangeRate: effectiveRate }
      );
      
      // Bundle pricing: all 4 assessments with 25% discount
      const allAssessmentItems = Object.entries(ASSESSMENT_PRICES).map(([type, price]) => ({
        type, priceInPence: price,
      }));
      const bundleOriginalPricing = calculateCandidatePricing(
        countryCode, allAssessmentItems, BASE_FEE,
        { exchangeRate: effectiveRate }
      );
      const bundleDiscountedPricing = calculateCandidatePricing(
        countryCode, allAssessmentItems, BASE_FEE,
        { exchangeRate: effectiveRate, bundleDiscount: 25 }
      );
      
      // Calculate free release date
      const releaseDate = (session as any).resultsReleaseScheduledAt || (session as any).resultsUnlockAt;
      
      res.json({
        sessionId: session.id,
        assessmentType: session.assessmentType,
        email: session.externalEmail,
        partnerName: partner?.companyName || partner?.name || 'Partner',
        completedAt: session.completedAt,
        countryCode,
        currencyCode: singlePricing.currencyCode,
        pricing: {
          single: {
            originalPricePence: singlePricing.totalLocal,
            discountedPricePence: singlePricing.totalLocal,
            originalDisplay: singlePricing.totalDisplay,
            discountedDisplay: singlePricing.totalDisplay,
            discountPercent: 0
          },
          bundle: {
            originalPricePence: bundleOriginalPricing.totalLocal,
            discountedPricePence: bundleDiscountedPricing.totalLocal,
            originalDisplay: bundleOriginalPricing.totalDisplay,
            discountedDisplay: bundleDiscountedPricing.totalDisplay,
            discountPercent: 25
          }
        },
        freeAccessDate: releaseDate ? new Date(releaseDate).toISOString() : null,
      });
    } catch (error) {
      console.error("Error getting B2B results info:", error);
      res.status(500).json({ error: "Failed to get session info" });
    }
  });

  // POST /api/b2b/results/:sessionId/checkout - Create Stripe checkout session
  app.post("/api/b2b/results/:sessionId/checkout", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { countryCode = 'GB', isBundle = false } = req.body;
      
      // Get session
      const session = await storage.getAssessmentSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if (session.status !== 'completed') {
        return res.status(400).json({ error: "Assessment not completed" });
      }
      
      if ((session as any).resultsPaymentStatus === 'paid') {
        return res.status(400).json({ error: "Results already paid for" });
      }
      
      // Get partner for payment provider preference
      const partner = session.partnerId ? await storage.getPartnerAccount(session.partnerId) : null;
      
      // Use canonical pricing function (same formula as B2C)
      const normalizedType = normalizeAssessmentId(session.assessmentType);
      const assessmentPrice = ASSESSMENT_PRICES[normalizedType] || 400;
      const userCountry = countryCode.toUpperCase();
      const currencyCode = COUNTRY_CURRENCY_MAP[userCountry] || 'GBP';
      const { getStripeCurrencyCode } = await import("@shared/currencies");
      const stripeCurrency = getStripeCurrencyCode(userCountry);
      
      // Use locked exchange rate from invitation metadata for pricing consistency
      const checkoutInvitationId = (session.metadata as any)?.invitationId;
      const checkoutInvitation = checkoutInvitationId ? await storage.getPartnerCandidateInvitation(checkoutInvitationId) : null;
      const checkoutLockedRate = (checkoutInvitation?.metadata as any)?.lockedExchangeRate;
      const effectiveRate = checkoutLockedRate ?? (await getExchangeRates()).rates?.[currencyCode] ?? undefined;
      
      if (checkoutLockedRate) {
        console.log(`[B2B Checkout] Using locked exchange rate ${checkoutLockedRate} for ${currencyCode}`);
      }
      
      let checkoutPricing: ReturnType<typeof calculateCandidatePricing>;
      let productName: string;
      
      if (isBundle) {
        const allItems = Object.entries(ASSESSMENT_PRICES).map(([type, price]) => ({
          type, priceInPence: price,
        }));
        checkoutPricing = calculateCandidatePricing(
          userCountry, allItems, BASE_FEE,
          { exchangeRate: effectiveRate, bundleDiscount: 25 }
        );
        productName = 'HumanMetrix Complete Assessment Bundle';
      } else {
        checkoutPricing = calculateCandidatePricing(
          userCountry,
          [{ type: normalizedType, priceInPence: assessmentPrice }],
          BASE_FEE,
          { exchangeRate: effectiveRate }
        );
        productName = `HumanMetrix ${session.assessmentType.toUpperCase()} Assessment Results`;
      }
      
      const totalLocal = checkoutPricing.totalLocal;
      const stripeAmount = checkoutPricing.stripeAmount;
      
      console.log(`[B2B Checkout Debug] Country: ${userCountry}, Currency: ${currencyCode}, StripeCurrency: ${stripeCurrency}`);
      console.log(`[B2B Checkout Debug] Total: ${totalLocal}, StripeAmount: ${stripeAmount}, IsBundle: ${isBundle}`);
      
      // Get base URL
      const baseUrl = getBaseUrl(req);
      
      // Candidate-facing payments always use Airwallex as primary (partner preference only applies to partner's own payments)
      const { primary, fallback } = getPaymentProviders('airwallex');

      const airwallexFn = async (): Promise<PaymentCheckoutResult> => {
        const airwallexAmount = formatAmountForAirwallex(stripeAmount, stripeCurrency.toUpperCase());
        const merchantOrderId = `b2b_res_${sessionId.substring(0, 8)}_${Date.now()}`;
        const intent = await createPaymentIntent({
          amount: airwallexAmount,
          currency: stripeCurrency.toUpperCase(),
          merchantOrderId,
          returnUrl: `${baseUrl}/b2b-payment-callback?provider=airwallex&b2b_session=${sessionId}`,
          customerEmail: session.externalEmail || undefined,
          description: productName,
          metadata: {
            b2b_session_id: sessionId,
            partner_id: session.partnerId || '',
            assessment_type: session.assessmentType,
            is_bundle: isBundle.toString(),
            country_code: countryCode,
            payment_type: 'b2b_results_unlock',
            original_amount: stripeAmount.toString(),
            currency: stripeCurrency,
          },
        });
        return {
          provider: 'airwallex',
          intentId: intent.id,
          clientSecret: intent.clientSecret,
          amount: airwallexAmount,
          currency: stripeCurrency.toUpperCase(),
        };
      };

      const stripeFn = async (): Promise<PaymentCheckoutResult> => {
        const checkoutSession = await stripe.checkout.sessions.create({
          adaptive_pricing: { enabled: false },
          mode: 'payment',
          payment_method_types: ['card'],
          allow_promotion_codes: true,
          line_items: [{
            price_data: {
              currency: stripeCurrency,
              product_data: {
                name: productName,
                description: `Immediate access to your detailed assessment results with ${discountPercent}% discount`,
              },
              unit_amount: stripeAmount,
            },
            quantity: 1,
          }],
          success_url: `${baseUrl}/b2b-payment-callback?session_id={CHECKOUT_SESSION_ID}&b2b_session=${sessionId}`,
          cancel_url: `${baseUrl}/b2b-results?session=${sessionId}&country=${countryCode}`,
          metadata: {
            b2b_session_id: sessionId,
            partner_id: session.partnerId,
            assessment_type: session.assessmentType,
            is_bundle: isBundle.toString(),
            country_code: countryCode,
            payment_type: 'b2b_results_unlock',
            original_amount: stripeAmount.toString(),
            currency: stripeCurrency,
          },
          customer_email: session.externalEmail || undefined,
        });
        return { provider: 'stripe', url: checkoutSession.url, sessionId: checkoutSession.id };
      };

      const result = await createCheckoutWithFallback(primary, fallback, airwallexFn, stripeFn);

      if (result.provider === 'airwallex') {
        res.json({
          provider: 'airwallex',
          airwallexEnv,
          intentId: result.intentId,
          clientSecret: result.clientSecret,
          amount: result.amount,
          currency: result.currency,
        });
      } else {
        res.json({
          checkoutUrl: result.url,
        });
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error("Error creating B2B checkout session:", errorMsg, error?.stack || '');
      console.error("[B2B Checkout Debug] Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2));
      res.status(500).json({ error: "Failed to create checkout session. Please try again or contact support.", details: errorMsg });
    }
  });

  // POST /api/b2b/process-payment - Process B2B results payment after Stripe callback
  app.post("/api/b2b/process-payment", async (req: Request, res: Response) => {
    try {
      const { stripeSessionId, b2bSessionId: b2bSessionIdFromBody, intentId, provider } = req.body;
      
      let b2bSessionId: string;
      let paymentAmountTotal: number;
      let paymentCurrency: string;
      let paymentIntentIdForRecord: string;
      let isBundle: boolean;
      let originalAmount: number | null = null;
      
      if (provider === 'airwallex' && intentId) {
        const paymentIntent = await getPaymentIntent(intentId);
        if (paymentIntent.status !== 'SUCCEEDED') {
          if (b2bSessionIdFromBody) {
            try {
              const session = await storage.getAssessmentSession(b2bSessionIdFromBody);
              const partner = session ? await storage.getPartnerAccount(session.partnerId) : null;
              const { notifyB2BTestTakerPaymentFailure } = await import('./email');
              await notifyB2BTestTakerPaymentFailure({
                candidateEmail: session?.externalEmail || 'Unknown',
                sessionId: b2bSessionIdFromBody,
                assessmentType: session?.assessmentType || 'Unknown',
                partnerId: session?.partnerId || 'Unknown',
                partnerName: partner?.companyName || partner?.name || 'Unknown Partner',
                amountDue: Math.round(paymentIntent.amount * 100),
                currency: (paymentIntent.currency || 'GBP').toUpperCase(),
                failureReason: `Airwallex payment status: ${paymentIntent.status}`,
              });
            } catch (notifyError: any) {
              console.error('[B2B Payment] Failed to notify super admin:', notifyError.message);
            }
          }
          return res.status(400).json({ error: "Payment not completed" });
        }
        
        const metadata = paymentIntent.metadata;
        b2bSessionId = metadata?.b2b_session_id || b2bSessionIdFromBody;
        if (!b2bSessionId) {
          return res.status(400).json({ error: "Missing session ID" });
        }
        
        paymentAmountTotal = Math.round(paymentIntent.amount * 100);
        paymentCurrency = (paymentIntent.currency || 'GBP').toUpperCase();
        paymentIntentIdForRecord = intentId;
        isBundle = metadata?.is_bundle === 'true';
        originalAmount = metadata?.original_amount ? parseInt(metadata.original_amount, 10) : null;
      } else if (stripeSessionId) {
        b2bSessionId = b2bSessionIdFromBody;
        if (!b2bSessionId) {
          return res.status(400).json({ error: "Missing session IDs" });
        }
        
        let checkoutSession;
        try {
          checkoutSession = await stripe.checkout.sessions.retrieve(stripeSessionId);
        } catch (stripeError: any) {
          console.error('[B2B Payment] Stripe session retrieval failed:', stripeError.message);
          try {
            const session = await storage.getAssessmentSession(b2bSessionId);
            const partner = session ? await storage.getPartnerAccount(session.partnerId) : null;
            const { notifyB2BTestTakerPaymentFailure } = await import('./email');
            await notifyB2BTestTakerPaymentFailure({
              candidateEmail: session?.externalEmail || 'Unknown',
              sessionId: b2bSessionId,
              assessmentType: session?.assessmentType || 'Unknown',
              partnerId: session?.partnerId || 'Unknown',
              partnerName: partner?.companyName || partner?.name || 'Unknown Partner',
              amountDue: 0,
              currency: 'GBP',
              failureReason: `Stripe API error: ${stripeError.message}`,
            });
          } catch (notifyError: any) {
            console.error('[B2B Payment] Failed to notify super admin:', notifyError.message);
          }
          return res.status(400).json({ error: "Failed to verify payment" });
        }
        
        if (checkoutSession.payment_status !== 'paid') {
          try {
            const session = await storage.getAssessmentSession(b2bSessionId);
            const partner = session ? await storage.getPartnerAccount(session.partnerId) : null;
            const { notifyB2BTestTakerPaymentFailure } = await import('./email');
            await notifyB2BTestTakerPaymentFailure({
              candidateEmail: session?.externalEmail || checkoutSession.customer_email || 'Unknown',
              candidateName: session?.externalUserId || undefined,
              sessionId: b2bSessionId,
              assessmentType: session?.assessmentType || 'Unknown',
              partnerId: session?.partnerId || checkoutSession.metadata?.partner_id || 'Unknown',
              partnerName: partner?.companyName || partner?.name || 'Unknown Partner',
              amountDue: checkoutSession.amount_total || 0,
              currency: checkoutSession.currency?.toUpperCase() || 'GBP',
              failureReason: checkoutSession.payment_status === 'unpaid' ? 'Payment not completed' : 'Checkout expired or cancelled',
            });
          } catch (notifyError: any) {
            console.error('[B2B Payment] Failed to notify super admin:', notifyError.message);
          }
          return res.status(400).json({ error: "Payment not completed" });
        }
        
        if (checkoutSession.metadata?.b2b_session_id !== b2bSessionId) {
          return res.status(400).json({ error: "Session ID mismatch" });
        }
        
        paymentAmountTotal = checkoutSession.amount_total || 0;
        paymentCurrency = (checkoutSession.currency || 'gbp').toUpperCase();
        paymentIntentIdForRecord = (checkoutSession.payment_intent as string) || checkoutSession.id;
        isBundle = checkoutSession.metadata?.is_bundle === 'true';
        originalAmount = checkoutSession.metadata?.original_amount ? parseInt(checkoutSession.metadata.original_amount, 10) : null;
      } else {
        return res.status(400).json({ error: "Missing payment session ID" });
      }
      
      // Get B2B session
      const session = await storage.getAssessmentSession(b2bSessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Check if already processed
      if ((session as any).resultsPaymentStatus === 'paid') {
        // Still need to check for existing account to support account creation flow
        const existingUser = await storage.getUserByEmail(session.externalEmail);
        const hasExistingAccount = !!existingUser;
        
        // Auto-login existing user so they can access dashboard directly
        if (hasExistingAccount && existingUser) {
          (req as any).session.userId = existingUser.id;
          await new Promise<void>((resolve, reject) => {
            (req as any).session.save((err: any) => {
              if (err) {
                console.error('[B2B Payment] Session save error (already processed):', err);
                resolve();
              } else {
                console.log(`[B2B Payment] Auto-logged in existing user ${existingUser.id} (already processed)`);
                resolve();
              }
            });
          });
        }
        
        console.log(`[B2B Payment] Already processed, returning: email=${session.externalEmail}, sessionId=${b2bSessionId}`);
        
        return res.json({ 
          success: true, 
          message: "Already processed",
          email: session.externalEmail,
          sessionId: b2bSessionId,
          hasExistingAccount,
          userId: existingUser?.id,
          resultsUrl: `/b2b-results/${b2bSessionId}`
        });
      }
      
      // Update session with payment info - payment fields first, delivery status after email success
      const now = new Date();
      
      // First update: Mark payment as complete but delivery as pending
      await storage.updateAssessmentSession(b2bSessionId, {
        resultsReleaseStatus: 'released',
        resultsReleasedAt: now,
        resultsPaymentStatus: 'paid',
        resultsPaidAt: now,
        resultsPaymentAmount: paymentAmountTotal,
        resultsPaymentCurrency: paymentCurrency,
      } as any);
      
      console.log(`[B2B Payment] Successfully processed payment for session ${b2bSessionId}, isBundle: ${isBundle}`);
      
      // Send payment receipt email (non-PDF, just confirmation)
      try {
        const { sendPaymentReceiptWithPdf } = await import('./email');
        const assessmentName = {
          'fit': 'FIT',
          'ai_readiness': 'AI Readiness',
          'prompt_architecture': 'Prompt Architecture',
          'aiq': 'AIQ'
        }[session.assessmentType] || session.assessmentType;
        
        const itemPrice = originalAmount !== null ? originalAmount : paymentAmountTotal;
        
        const discountAmount = originalAmount !== null && originalAmount > paymentAmountTotal 
          ? originalAmount - paymentAmountTotal 
          : 0;
        
        const receiptItems: Array<{ description: string; quantity?: number; amount: number }> = [{
          description: `${assessmentName} Assessment Results`,
          quantity: 1,
          amount: itemPrice,
        }];
        
        if (discountAmount > 0) {
          receiptItems.push({
            description: 'Discount Applied',
            amount: -discountAmount,
          });
        }
        
        const receiptDetails = {
          email: session.externalEmail || '',
          name: session.externalUserId || session.externalEmail?.split('@')[0] || 'Candidate',
          items: receiptItems,
          subtotal: itemPrice,
          total: paymentAmountTotal,
          currency: paymentCurrency,
          transactionId: paymentIntentIdForRecord,
        };
        
        if (receiptDetails.email) {
          await sendPaymentReceiptWithPdf(receiptDetails);
          console.log(`[B2B Payment] Receipt email sent to ${receiptDetails.email} (Original: ${itemPrice}, Discount: ${discountAmount}, Total: ${paymentAmountTotal})`);
        }
      } catch (receiptError: any) {
        console.error(`[B2B Payment] Failed to send receipt email:`, receiptError.message);
        // Don't fail the whole flow for receipt email failure
      }
      
      const sessionIsTest = (session as any).isTestSession === true;
      
      if (sessionIsTest) {
        console.log(`[Test Session] Marking as sent for test session ${b2bSessionId}`);
        await storage.updateAssessmentSession(b2bSessionId, {
          resultsDeliveryStatus: 'sent',
          resultsEmailSentAt: now,
        } as any);
      } else {
        // Send results ready notification email (no PDF - candidates export from dashboard)
        const targetEmail = session.externalEmail;
        if (targetEmail) {
          const existingUserForEmail = await storage.getUserByEmail(targetEmail);
          const partner = session.partnerId ? await storage.getPartnerAccount(session.partnerId) : null;
          const partnerCompanyName = partner?.companyName || partner?.name || 'HumanMetrix Partner';
          
          try {
            const { sendResultsReadyEmail } = await import("./email");
            const invitationIdForEmail = (session as any).metadata?.invitationId || (session as any).partnerInvitationId || null;
            let autoLoginToken: string | undefined;
            if (existingUserForEmail) {
              try {
                autoLoginToken = crypto.randomUUID();
                const autoLoginExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                await storage.setAutoLoginToken(existingUserForEmail.id, autoLoginToken, autoLoginExpiry);
              } catch (tokenErr) {
                console.error("[B2B Payment] Failed to generate auto-login token:", tokenErr);
              }
            }
            const emailResult = await sendResultsReadyEmail({
              email: targetEmail,
              candidateName: (session as any).metadata?.candidateName,
              assessmentTypes: [session.assessmentType],
              partnerCompanyName,
              hasExistingAccount: !!existingUserForEmail,
              sessionId: b2bSessionId,
              partnerInvitationId: invitationIdForEmail || undefined,
              autoLoginToken,
            });
            
            if (emailResult.success) {
              await storage.updateAssessmentSession(b2bSessionId, {
                resultsDeliveryStatus: 'sent',
                resultsEmailSentAt: new Date(),
              } as any);
              console.log(`[B2B Payment] Results ready email sent to ${targetEmail}`);
            } else {
              await storage.updateAssessmentSession(b2bSessionId, {
                resultsDeliveryStatus: 'failed',
              } as any);
              console.error(`[B2B Payment] Failed to send results ready email to ${targetEmail}`);
            }
          } catch (emailError: any) {
            console.error(`[B2B Payment] Error sending results ready email:`, emailError.message);
            await storage.updateAssessmentSession(b2bSessionId, {
              resultsDeliveryStatus: 'failed',
            } as any);
          }
        } else {
          console.error(`[B2B Payment] No email address for session ${b2bSessionId}`);
          await storage.updateAssessmentSession(b2bSessionId, {
            resultsDeliveryStatus: 'failed',
          } as any);
        }
      }
      
      // Check if user has an existing account
      const existingUser = await storage.getUserByEmail(session.externalEmail);
      const hasExistingAccount = !!existingUser;
      
      // Auto-login existing user so they can access dashboard directly after payment
      if (hasExistingAccount && existingUser) {
        try {
          (req as any).session.userId = existingUser.id;
          await new Promise<void>((resolve, reject) => {
            (req as any).session.save((err: any) => {
              if (err) {
                console.error('[B2B Payment] Session save error:', err);
                resolve();
              } else {
                console.log(`[B2B Payment] Auto-logged in existing user ${existingUser.id}`);
                resolve();
              }
            });
          });
        } catch (loginErr: any) {
          console.error('[B2B Payment] Auto-login failed:', loginErr.message);
        }
      }
      
      console.log(`[B2B Payment] Returning response: email=${session.externalEmail}, sessionId=${b2bSessionId}, hasExistingAccount=${hasExistingAccount}`);
      
      res.json({
        success: true,
        message: "Results unlocked successfully",
        email: session.externalEmail,
        sessionId: b2bSessionId,
        hasExistingAccount,
        userId: existingUser?.id,
        resultsUrl: `/b2b-results/${b2bSessionId}`
      });
    } catch (error) {
      console.error("Error processing B2B payment:", error);
      res.status(500).json({ error: "Failed to process payment" });
    }
  });

  // POST /api/b2b/create-account - Create account for B2B user after payment
  app.post("/api/b2b/create-account", async (req: Request, res: Response) => {
    try {
      const { email, sessionId } = req.body;
      
      console.log(`[B2B Create Account] Request received for email: ${email}, sessionId: ${sessionId}`);
      
      if (!email || !sessionId) {
        console.log('[B2B Create Account] Missing parameters');
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      // Verify the session exists and belongs to this email
      const session = await storage.getAssessmentSession(sessionId);
      if (!session) {
        console.log(`[B2B Create Account] Session not found: ${sessionId}`);
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Allow if session email matches OR if session has no email (for some B2B flows)
      const sessionEmail = session.externalEmail?.toLowerCase();
      const requestEmail = email.toLowerCase();
      
      if (sessionEmail && sessionEmail !== requestEmail) {
        console.log(`[B2B Create Account] Email mismatch. Session: ${sessionEmail}, Request: ${requestEmail}`);
        return res.status(403).json({ error: "Email does not match session" });
      }
      
      // Check if user already exists
      let user = await storage.getUserByEmail(email);
      let isNewUser = false;
      
      let emailSent = false;
      
      if (!user) {
        isNewUser = true;
        try {
          const bcrypt = await import('bcryptjs');
          const { generateTemporaryPassword } = await import('./passwordUtils');
          const randomPassword = generateTemporaryPassword();
          const hashedPassword = await bcrypt.hash(randomPassword, 10);
          
          user = await storage.createUser({
            email: email.toLowerCase(),
            passwordHash: hashedPassword,
          });
          
          console.log(`[B2B Create Account] Created new user: ${user.id} for ${email}`);
          
          try {
            const { sendWelcomeEmailWithPassword } = await import('./email');
            const crypto = await import('crypto');
            
            const autoLoginToken = crypto.randomUUID();
            const autoLoginExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await storage.setAutoLoginToken(user.id, autoLoginToken, autoLoginExpiry);
            
            await sendWelcomeEmailWithPassword(
              user.email, 
              email.split('@')[0], 
              randomPassword,
              "Thank you for completing your assessment! You can use these credentials to log in and view your results anytime.",
              'post_payment',
              autoLoginToken
            );
            emailSent = true;
            console.log(`[B2B Create Account] Welcome email with credentials sent to ${email}`);
          } catch (emailError: any) {
            console.error('[B2B Create Account] Failed to send welcome email:', emailError.message, emailError.stack);
          }
        } catch (createError: any) {
          console.error('[B2B Create Account] Failed to create user:', createError.message);
          return res.status(500).json({ error: `Failed to create user account: ${createError.message}` });
        }
      } else {
        console.log(`[B2B Create Account] User already exists: ${user.id} for ${email}`);
      }
      
      // Convert B2B session results into proper assessmentResults so they show in dashboard
      try {
        // Get the B2B session details
        const sessionDetails = await storage.getAssessmentSession(sessionId);
        
        // Extract invitationId from session metadata (links to partnerCandidateInvitation)
        const partnerInvitationId = (sessionDetails?.metadata as any)?.invitationId || null;
        console.log(`[B2B Create Account] Session ${sessionId} has invitationId: ${partnerInvitationId}`);
        
        if (sessionDetails && sessionDetails.status === 'completed' && sessionDetails.scores) {
          // Check if we already created an assessmentResult for this session
          const existingResults = await storage.getResultsByUser(user!.id);
          const alreadyHasResult = existingResults.some(
            r => r.assessmentType === sessionDetails.assessmentType &&
                 r.scores && JSON.stringify(r.scores) === JSON.stringify(sessionDetails.scores)
          );
          
          if (!alreadyHasResult) {
            // Create a proper assessmentResult entry from the B2B session data
            // IMPORTANT: Include partnerInvitationId so it appears in partner testing series
            const newResult = await storage.createAssessmentResult({
              userId: user!.id,
              assessmentType: sessionDetails.assessmentType,
              questionLocale: sessionDetails.questionLocale || 'default',
              answers: sessionDetails.answers || {},
              scores: sessionDetails.scores,
              totalScore: sessionDetails.totalScore || undefined,
              percentile: sessionDetails.percentile || undefined,
              evaluations: sessionDetails.evaluations || undefined,
              status: 'completed',
              completedAt: sessionDetails.completedAt || new Date(),
              partnerInvitationId: partnerInvitationId || undefined, // Link to partner invitation for series tracking
            });
            console.log(`[B2B Create Account] Created assessmentResult ${newResult.id} for ${sessionDetails.assessmentType} from B2B session ${sessionId}, partnerInvitationId: ${partnerInvitationId}`);
          } else {
            // Result already exists - ensure it has partnerInvitationId set for proper series tracking
            if (partnerInvitationId) {
              const existingResult = existingResults.find(
                r => r.assessmentType === sessionDetails.assessmentType &&
                     r.scores && JSON.stringify(r.scores) === JSON.stringify(sessionDetails.scores)
              );
              if (existingResult && !existingResult.partnerInvitationId) {
                await storage.updateAssessmentResult(existingResult.id, { partnerInvitationId });
                console.log(`[B2B Create Account] Updated existing result ${existingResult.id} with partnerInvitationId: ${partnerInvitationId}`);
              } else {
                console.log(`[B2B Create Account] Result for ${sessionDetails.assessmentType} already exists for user ${user!.id} with partnerInvitationId`);
              }
            } else {
              console.log(`[B2B Create Account] Result for ${sessionDetails.assessmentType} already exists for user ${user!.id}`);
            }
          }
        }
        
        // Also check for partner invitation results
        if (sessionDetails?.metadata) {
          const invitationId = (sessionDetails.metadata as any)?.invitationId;
          if (invitationId) {
            const invitationResults = await storage.getResultsByPartnerInvitation(invitationId);
            for (const result of invitationResults) {
              if (result.userId !== user!.id) {
                await storage.updateAssessmentResult(result.id, { userId: user!.id });
                console.log(`[B2B Create Account] Linked invitation result ${result.id} (${result.assessmentType}) to user ${user!.id}`);
              }
            }
          }
        }
        
        // Update session metadata to include userId for reference
        await storage.updateAssessmentSession(sessionId, { 
          externalUserId: user!.id,
          metadata: { 
            ...(session.metadata || {}),
            linkedUserId: user!.id 
          }
        });
        console.log(`[B2B Create Account] Updated session ${sessionId} with user reference`);
      } catch (linkError: any) {
        console.error('[B2B Create Account] Failed to link/convert results:', linkError.message);
        // Continue anyway - user can still view results via session
      }
      
      // Log the user in by setting session
      (req.session as any).userId = user!.id;
      req.session.save((err: any) => {
        if (err) {
          console.error('[B2B Create Account] Session save error:', err);
          return res.status(500).json({ error: `Failed to log in: ${err.message || 'Session error'}` });
        }
        
        console.log(`[B2B Create Account] User ${email} logged in successfully`);
        
        const sessionMeta = session.metadata as any;
        const scrollSeriesId = sessionMeta?.invitationId || null;
        let redirectUrl = scrollSeriesId 
          ? `/dashboard?view=candidate&scrollToSeries=${scrollSeriesId}` 
          : "/dashboard?view=candidate";
        
        res.json({
          success: true,
          redirectTo: redirectUrl,
          userId: user!.id,
          isNewUser,
          emailSent,
        });
      });
    } catch (error: any) {
      console.error("[B2B Create Account] Error:", error);
      res.status(500).json({ error: `Failed to create account: ${error.message || 'Unknown error'}` });
    }
  });

  // POST /api/b2b/results/:sessionId/resend-email - Resend results email to user
  app.post("/api/b2b/results/:sessionId/resend-email", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { email } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }
      
      // Get the session
      const session = await storage.getAssessmentSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Check if the session has been paid for / results released
      // Use the same conditions as the session info endpoint
      if ((session as any).resultsPaymentStatus !== 'paid' && (session as any).resultsReleaseStatus !== 'released') {
        return res.status(403).json({ error: "Results have not been unlocked yet" });
      }
      
      // Check if there's an email to send to
      if (!session.externalEmail) {
        return res.status(400).json({ error: "No email address associated with this session" });
      }
      
      // Ownership validation: If email is provided in request, it must match session email
      // This prevents abuse by ensuring only the session owner can trigger resends
      if (email && email.toLowerCase() !== session.externalEmail.toLowerCase()) {
        return res.status(403).json({ error: "Email does not match session" });
      }
      
      // Get partner info
      const partner = session.partnerId ? await storage.getPartnerAccount(session.partnerId) : null;
      const partnerCompanyName = partner?.companyName || partner?.name || 'HumanMetrix Partner';
      
      const existingUserForResend = await storage.getUserByEmail(session.externalEmail);
      
      let autoLoginToken: string | undefined;
      if (existingUserForResend) {
        try {
          autoLoginToken = crypto.randomUUID();
          const autoLoginExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await storage.setAutoLoginToken(existingUserForResend.id, autoLoginToken, autoLoginExpiry);
        } catch (tokenErr) {
          console.error("[B2B Resend] Failed to generate auto-login token:", tokenErr);
        }
      }
      
      const { sendResultsReadyEmail } = await import("./email");
      const invitationIdForResend = (session as any).metadata?.invitationId || (session as any).partnerInvitationId || null;
      const emailResult = await sendResultsReadyEmail({
        email: session.externalEmail,
        candidateName: (session as any).metadata?.candidateName,
        assessmentTypes: [session.assessmentType],
        partnerCompanyName,
        hasExistingAccount: !!existingUserForResend,
        sessionId,
        partnerInvitationId: invitationIdForResend || undefined,
        autoLoginToken,
      });
      
      if (!emailResult.success) {
        console.error(`[B2B Resend] Failed to resend results email to ${session.externalEmail}`);
        return res.status(500).json({ error: "Failed to send email. Please try again." });
      }
      
      await storage.updateAssessmentSession(sessionId, {
        resultsDeliveryStatus: 'sent',
        resultsEmailSentAt: new Date(),
      } as any);
      
      console.log(`[B2B Resend] Successfully resent results email to ${session.externalEmail}`);
      
      res.json({
        success: true,
        message: "Results email has been resent",
        email: session.externalEmail,
      });
    } catch (error: any) {
      console.error("[B2B Resend Email] Error:", error);
      res.status(500).json({ error: "Failed to resend email" });
    }
  });

  // POST /api/b2b/results/:sessionId/generate-pdf - Send results ready notification email
  // Security: Requires email in body that must match session email
  app.post("/api/b2b/results/:sessionId/generate-pdf", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { email, sendEmail: shouldSendEmail = true } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }
      
      if (!email) {
        return res.status(400).json({ error: "Email is required for verification" });
      }
      
      const session = await storage.getAssessmentSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if ((session as any).resultsPaymentStatus !== 'paid' && (session as any).resultsReleaseStatus !== 'released') {
        return res.status(403).json({ error: "Results have not been unlocked yet" });
      }
      
      if (!session.externalEmail || email.toLowerCase() !== session.externalEmail.toLowerCase()) {
        return res.status(403).json({ error: "Unauthorized access to session" });
      }
      
      const targetEmail = session.externalEmail;
      const partner = session.partnerId ? await storage.getPartnerAccount(session.partnerId) : null;
      const partnerCompanyName = partner?.companyName || partner?.name || 'HumanMetrix Partner';
      
      if (shouldSendEmail) {
        const existingUser = await storage.getUserByEmail(targetEmail);
        let autoLoginToken: string | undefined;
        if (existingUser) {
          try {
            autoLoginToken = crypto.randomUUID();
            const autoLoginExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await storage.setAutoLoginToken(existingUser.id, autoLoginToken, autoLoginExpiry);
          } catch (tokenErr) {
            console.error("[B2B Deliver] Failed to generate auto-login token:", tokenErr);
          }
        }
        const { sendResultsReadyEmail } = await import("./email");
        const invitationIdForDeliver = (session as any).metadata?.invitationId || (session as any).partnerInvitationId || null;
        const emailResult = await sendResultsReadyEmail({
          email: targetEmail,
          candidateName: (session as any).metadata?.candidateName,
          assessmentTypes: [session.assessmentType],
          partnerCompanyName,
          hasExistingAccount: !!existingUser,
          sessionId,
          partnerInvitationId: invitationIdForDeliver || undefined,
          autoLoginToken,
        });
        
        if (!emailResult.success) {
          return res.status(500).json({ error: "Failed to send email. Please try again." });
        }
        
        await storage.updateAssessmentSession(sessionId, {
          resultsDeliveryStatus: 'sent',
          resultsEmailSentAt: new Date(),
        } as any);
        
        res.json({
          success: true,
          message: "Results ready notification email has been sent",
          email: targetEmail,
        });
      } else {
        res.json({
          success: true,
          message: "Results are available on the dashboard",
        });
      }
    } catch (error: any) {
      console.error("[Results Email] Error:", error.message);
      res.status(500).json({ error: "Failed to send notification email. Please try again." });
    }
  });

  // POST /api/b2b/results/:sessionId/send-pdf-email - Send results ready notification (LEGACY endpoint kept for compatibility)
  app.post("/api/b2b/results/:sessionId/send-pdf-email", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { email } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }
      
      if (!email) {
        return res.status(400).json({ error: "Email is required for verification" });
      }
      
      const session = await storage.getAssessmentSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if ((session as any).resultsPaymentStatus !== 'paid' && (session as any).resultsReleaseStatus !== 'released') {
        return res.status(403).json({ error: "Results have not been unlocked yet" });
      }
      
      if (!session.externalEmail || email.toLowerCase() !== session.externalEmail.toLowerCase()) {
        return res.status(403).json({ error: "Unauthorized access to session" });
      }
      
      const targetEmail = session.externalEmail;
      const currentStatus = (session as any).resultsDeliveryStatus;
      if (currentStatus === 'sent') {
        return res.json({
          success: true,
          message: "Results email has already been sent",
          email: targetEmail,
          alreadySent: true,
        });
      }
      
      const partner = session.partnerId ? await storage.getPartnerAccount(session.partnerId) : null;
      const partnerCompanyName = partner?.companyName || partner?.name || 'HumanMetrix Partner';
      const existingUser = await storage.getUserByEmail(targetEmail);
      
      let autoLoginToken: string | undefined;
      if (existingUser) {
        try {
          autoLoginToken = crypto.randomUUID();
          const autoLoginExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await storage.setAutoLoginToken(existingUser.id, autoLoginToken, autoLoginExpiry);
        } catch (tokenErr) {
          console.error("[B2B Manual Send] Failed to generate auto-login token:", tokenErr);
        }
      }
      
      const { sendResultsReadyEmail } = await import("./email");
      const invitationIdForManual = (session as any).metadata?.invitationId || (session as any).partnerInvitationId || null;
      const emailResult = await sendResultsReadyEmail({
        email: targetEmail,
        candidateName: (session as any).metadata?.candidateName,
        assessmentTypes: [session.assessmentType],
        partnerCompanyName,
        hasExistingAccount: !!existingUser,
        sessionId,
        partnerInvitationId: invitationIdForManual || undefined,
        autoLoginToken,
      });
      
      if (!emailResult.success) {
        return res.status(500).json({ error: "Failed to send email. Please try again." });
      }
      
      await storage.updateAssessmentSession(sessionId, {
        resultsDeliveryStatus: 'sent',
        resultsEmailSentAt: new Date(),
      } as any);
      
      console.log(`[B2B Email] Results ready email sent to ${targetEmail}`);
      
      res.json({
        success: true,
        message: "Results notification email has been sent",
        email: targetEmail,
      });
    } catch (error: any) {
      console.error("[B2B Email] Error:", error);
      res.status(500).json({ error: "Failed to send notification email" });
    }
  });

  // Get bundle results info for multiple assessments
  app.get("/api/b2b/results-bundle", async (req, res) => {
    try {
      const { email, partner, country, types } = req.query;
      
      if (!email || !partner) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      const partnerId = partner as string; // Partner ID is a UUID string
      const countryCode = (country as string) || 'GB';
      const assessmentTypes = (types as string)?.split(',').filter(Boolean) || [];
      
      // Get partner info
      const partnerAccount = await storage.getPartnerAccount(partnerId);
      if (!partnerAccount) {
        return res.status(404).json({ error: "Partner not found" });
      }
      
      // Get completed sessions for this email and partner
      const completedSessions = await storage.getCompletedB2BSessionsByEmail(
        email as string, 
        partnerId
      );
      
      if (!completedSessions || completedSessions.length === 0) {
        return res.status(404).json({ error: "No completed assessments found" });
      }
      
      // Filter out already-paid/unlocked sessions - only show locked results
      const lockedSessions = completedSessions.filter((s: any) => {
        return (s as any).resultsPaymentStatus !== 'paid' && (s as any).resultsReleaseStatus !== 'released';
      });
      
      if (lockedSessions.length === 0) {
        const existingUser = await storage.getUserByEmail(email as string);
        return res.status(200).json({ 
          alreadyUnlocked: true,
          email,
          partnerName: partnerAccount.companyName || partnerAccount.name,
          hasExistingAccount: !!existingUser,
        });
      }
      
      // Filter to requested types if specified
      const filteredSessions = assessmentTypes.length > 0
        ? lockedSessions.filter((s: any) => {
            const normalizedType = normalizeAssessmentId(s.assessmentType);
            return assessmentTypes.some(t => normalizeAssessmentId(t) === normalizedType);
          })
        : lockedSessions;
      
      if (filteredSessions.length === 0) {
        return res.status(404).json({ error: "No matching assessments found" });
      }
      
      // Calculate bundle pricing based on sum of individual discounted prices
      const userCurrency = getCurrencyForCountry(countryCode);
      let sumOfIndividualDiscountedPrices = 0;
      
      const completedAssessments = [];
      // Use a Set to deduplicate by assessment type (only include each type once)
      const seenTypes = new Set<string>();
      
      for (const session of filteredSessions) {
        const normalizedType = normalizeAssessmentId(session.assessmentType);
        
        // Skip if we've already included this assessment type
        if (seenTypes.has(normalizedType)) {
          continue;
        }
        seenTypes.add(normalizedType);
        
        const assessmentPrice = ASSESSMENT_PRICES[normalizedType] || 400;
        
        const indPricing = calculateCandidatePricing(
          countryCode,
          [{ type: normalizedType, priceInPence: assessmentPrice }],
          BASE_FEE,
          {}
        );
        const individualLocalPrice = indPricing.totalLocal;
        sumOfIndividualDiscountedPrices += individualLocalPrice;
        
        completedAssessments.push({
          type: normalizedType,
          displayName: formatAssessmentTypeName(session.assessmentType),
          completedAt: session.completedAt?.toISOString() || new Date().toISOString(),
          originalPrice: individualLocalPrice,
          discountedPrice: individualLocalPrice,
          originalPriceDisplay: indPricing.totalDisplay,
          discountedPriceDisplay: indPricing.totalDisplay,
        });
      }
      
      // Apply bundle discount (25%) to sum of individual prices
      const bundleDiscountPercent = 25;
      const bundleDiscountedPrice = Math.round(sumOfIndividualDiscountedPrices * ((100 - bundleDiscountPercent) / 100));
      
      // Free unlock date (30 days from last completion)
      const latestCompletion = filteredSessions.reduce((latest: Date, s: any) => {
        const completedAt = s.completedAt ? new Date(s.completedAt) : new Date();
        return completedAt > latest ? completedAt : latest;
      }, new Date(0));
      const freeAccessDate = new Date(latestCompletion);
      freeAccessDate.setDate(freeAccessDate.getDate() + 30);
      
      res.json({
        email,
        partnerId,
        partnerName: partnerAccount.companyName || partnerAccount.name,
        countryCode,
        currencyCode: COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || 'GBP',
        completedAssessments,
        pricing: {
          sumOfIndividualDiscounted: sumOfIndividualDiscountedPrices,
          bundleDiscountedPrice,
          sumOfIndividualDisplay: formatPrice(sumOfIndividualDiscountedPrices, userCurrency),
          bundleDiscountedDisplay: formatPrice(bundleDiscountedPrice, userCurrency),
          bundleDiscountPercent,
        },
        freeAccessDate: freeAccessDate.toISOString(),
      });
    } catch (error) {
      console.error("Error fetching bundle results:", error);
      res.status(500).json({ error: "Failed to load bundle data" });
    }
  });

  // Create checkout for bundle purchase
  app.post("/api/b2b/results-bundle/checkout", async (req, res) => {
    try {
      const { email, partnerId, countryCode, types } = req.body;
      
      if (!email || !partnerId) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      const partnerIdStr = partnerId.toString(); // Ensure partner ID is string (UUID)
      const assessmentTypes = types || [];
      
      // Get partner info
      const partnerAccount = await storage.getPartnerAccount(partnerIdStr);
      if (!partnerAccount) {
        return res.status(404).json({ error: "Partner not found" });
      }
      
      // Get completed sessions for this email and partner
      const completedSessions = await storage.getCompletedB2BSessionsByEmail(email, partnerIdStr);
      
      // Filter out already-paid/unlocked sessions - only process locked results
      const lockedSessions = completedSessions.filter((s: any) => {
        return (s as any).resultsPaymentStatus !== 'paid' && (s as any).resultsReleaseStatus !== 'released';
      });
      
      if (lockedSessions.length === 0) {
        return res.status(400).json({ error: "All assessments have already been unlocked" });
      }
      
      // Filter to requested types if specified
      const filteredSessions = assessmentTypes.length > 0
        ? lockedSessions.filter((s: any) => {
            const normalizedType = normalizeAssessmentId(s.assessmentType);
            return assessmentTypes.some((t: string) => normalizeAssessmentId(t) === normalizedType);
          })
        : lockedSessions;
      
      if (filteredSessions.length === 0) {
        return res.status(404).json({ error: "No matching assessments found" });
      }
      
      // Calculate bundle pricing using canonical function
      const sessionIds: string[] = [];
      const bundleItems: Array<{ type: string; priceInPence: number }> = [];
      for (const session of filteredSessions) {
        const normalizedType = normalizeAssessmentId(session.assessmentType);
        const assessmentPrice = ASSESSMENT_PRICES[normalizedType] || 400;
        bundleItems.push({ type: normalizedType, priceInPence: assessmentPrice });
        sessionIds.push(session.id);
      }
      
      // Get Stripe currency code
      const currencyCode = COUNTRY_CURRENCY_MAP[(countryCode || 'GB').toUpperCase()] || 'GBP';
      
      const exchangeRatesData = await getExchangeRates();
      const liveRate = exchangeRatesData.rates?.[currencyCode] ?? undefined;
      
      // Use canonical pricing function with 25% bundle discount
      const bundleCheckoutPricing = calculateCandidatePricing(
        countryCode || 'GB', bundleItems, BASE_FEE,
        { exchangeRate: liveRate, bundleDiscount: 25 }
      );
      const localCurrencyTotal = bundleCheckoutPricing.totalLocal;
      const stripeAmount = bundleCheckoutPricing.stripeAmount;
      
      console.log(`[Bundle Checkout] Local: ${localCurrencyTotal} ${currencyCode}, Stripe: ${stripeAmount}`);
      
      // Create Stripe checkout session
      const baseUrl = getBaseUrl(req);
      const successUrl = `${baseUrl}/b2b-payment-callback?success=true&bundle=true&session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}&partner=${partnerId}&sessions=${sessionIds.join(',')}`;
      const cancelUrl = `${baseUrl}/b2b-results-bundle?email=${encodeURIComponent(email)}&partner=${partnerId}&country=${countryCode}&types=${assessmentTypes.join(',')}`;
      
      // Use unique assessment count for description
      const uniqueAssessmentCount = new Set(filteredSessions.map((s: any) => normalizeAssessmentId(s.assessmentType))).size;
      
      // Candidate-facing payments always use Airwallex as primary (partner preference only applies to partner's own payments)
      const { primary, fallback: fallbackProvider } = getPaymentProviders('airwallex');

      const airwallexFn = async (): Promise<PaymentCheckoutResult> => {
        const airwallexAmount = formatAmountForAirwallex(stripeAmount, currencyCode.toUpperCase());
        const emailHash = email.substring(0, 8).replace(/[^a-zA-Z0-9]/g, '');
        const merchantOrderId = `b2b_bnd_${emailHash}_${Date.now()}`;
        const intent = await createPaymentIntent({
          amount: airwallexAmount,
          currency: currencyCode.toUpperCase(),
          merchantOrderId,
          returnUrl: `${baseUrl}/b2b-payment-callback?provider=airwallex&bundle=true&email=${encodeURIComponent(email)}&partner=${partnerId}&sessions=${sessionIds.join(',')}`,
          customerEmail: email,
          description: `HumanMetrix Assessment Bundle (${uniqueAssessmentCount} Assessments)`,
          metadata: {
            type: 'b2b_bundle',
            email,
            partnerId: partnerId.toString(),
            sessionIds: sessionIds.join(','),
            countryCode: countryCode || 'GB',
          },
        });
        return {
          provider: 'airwallex',
          intentId: intent.id,
          clientSecret: intent.clientSecret,
          amount: airwallexAmount,
          currency: currencyCode.toUpperCase(),
        };
      };

      const stripeFn = async (): Promise<PaymentCheckoutResult> => {
        const session = await stripe.checkout.sessions.create({
          adaptive_pricing: { enabled: false },
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: currencyCode.toLowerCase(),
                product_data: {
                  name: `HumanMetrix Assessment Bundle (${uniqueAssessmentCount} Assessments)`,
                  description: `Unlock all ${uniqueAssessmentCount} completed assessment results`,
                },
                unit_amount: stripeAmount,
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          allow_promotion_codes: true,
          success_url: successUrl,
          cancel_url: cancelUrl,
          customer_email: email,
          metadata: {
            type: 'b2b_bundle',
            email,
            partnerId: partnerId.toString(),
            sessionIds: sessionIds.join(','),
            countryCode: countryCode || 'GB',
          },
        });
        return { provider: 'stripe', url: session.url, sessionId: session.id };
      };

      const result = await createCheckoutWithFallback(primary, fallbackProvider, airwallexFn, stripeFn);

      if (result.provider === 'airwallex') {
        res.json({
          provider: 'airwallex',
          airwallexEnv,
          intentId: result.intentId,
          clientSecret: result.clientSecret,
          amount: result.amount,
          currency: result.currency,
        });
      } else {
        res.json({ checkoutUrl: result.url });
      }
    } catch (error) {
      console.error("Error creating bundle checkout:", error);
      res.status(500).json({ error: "Failed to create checkout" });
    }
  });
  
  // POST /api/b2b/results-bundle/process-payment - Process bundle payment after Stripe callback
  app.post("/api/b2b/results-bundle/process-payment", async (req: Request, res: Response) => {
    try {
      const { stripeSessionId, intentId, provider } = req.body;
      
      let email: string;
      let partnerId: string;
      let sessionIds: string[];
      let countryCode: string | undefined;
      
      if (provider === 'airwallex' && intentId) {
        const paymentIntent = await getPaymentIntent(intentId);
        if (paymentIntent.status !== 'SUCCEEDED') {
          return res.status(400).json({ error: "Payment not completed" });
        }
        
        const metadata = paymentIntent.metadata;
        if (!metadata || metadata.type !== 'b2b_bundle') {
          return res.status(400).json({ error: "Invalid payment type" });
        }
        
        email = metadata.email;
        partnerId = metadata.partnerId;
        const sessionIdsStr = metadata.sessionIds;
        countryCode = metadata.countryCode;
        if (!email || !partnerId || !sessionIdsStr) {
          return res.status(400).json({ error: "Missing payment metadata" });
        }
        
        sessionIds = sessionIdsStr.split(',');
      } else if (stripeSessionId) {
        let checkoutSession;
        try {
          checkoutSession = await stripe.checkout.sessions.retrieve(stripeSessionId);
        } catch (stripeError: any) {
          console.error('[Bundle Payment] Stripe session retrieval failed:', stripeError.message);
          return res.status(400).json({ error: "Failed to verify payment" });
        }
        
        if (checkoutSession.payment_status !== 'paid') {
          return res.status(400).json({ error: "Payment not completed" });
        }
        
        if (checkoutSession.metadata?.type !== 'b2b_bundle') {
          return res.status(400).json({ error: "Invalid payment type" });
        }
        
        email = checkoutSession.metadata.email;
        partnerId = checkoutSession.metadata.partnerId;
        const sessionIdsStr = checkoutSession.metadata.sessionIds;
        countryCode = checkoutSession.metadata.countryCode;
        if (!email || !partnerId || !sessionIdsStr) {
          return res.status(400).json({ error: "Missing payment metadata" });
        }
        
        sessionIds = sessionIdsStr.split(',');
      } else {
        return res.status(400).json({ error: "Missing payment session ID" });
      }
      
      // Get partner info
      const partner = await storage.getPartnerAccount(partnerId);
      const partnerName = partner?.companyName || partner?.name || "Partner";
      
      // Update all sessions to mark payment as complete
      const now = new Date();
      for (const sessionId of sessionIds) {
        await db.update(assessmentSessions)
          .set({
            resultsPaymentStatus: 'paid',
            resultsUnlockAt: now,
          })
          .where(eq(assessmentSessions.id, sessionId));
      }
      
      console.log(`[Bundle Payment] Marked ${sessionIds.length} sessions as paid for ${email}`);
      
      // Check if user has an existing account
      const existingUser = await storage.getUserByEmail(email);
      const hasExistingAccount = !!existingUser;
      
      // Auto-login existing user so they can access dashboard directly after bundle payment
      if (hasExistingAccount && existingUser) {
        try {
          (req as any).session.userId = existingUser.id;
          await new Promise<void>((resolve, reject) => {
            (req as any).session.save((err: any) => {
              if (err) {
                console.error('[Bundle Payment] Session save error:', err);
                resolve();
              } else {
                console.log(`[Bundle Payment] Auto-logged in existing user ${existingUser.id}`);
                resolve();
              }
            });
          });
        } catch (loginErr: any) {
          console.error('[Bundle Payment] Auto-login failed:', loginErr.message);
        }
      }
      
      // Get first session for redirect
      const firstSession = sessionIds[0];
      
      res.json({
        success: true,
        email,
        sessionId: firstSession,
        hasExistingAccount,
        resultsUrl: `/b2b-results/${firstSession}`,
      });
      
      // Send results ready notification email (no PDFs)
      (async () => {
        try {
          const sessions = await Promise.all(
            sessionIds.map(id => storage.getAssessmentSession(id))
          );
          const validSessions = sessions.filter(s => s && s.completedAt);
          const assessmentTypes = validSessions.map(s => s!.assessmentType);
          
          const { sendResultsReadyEmail } = await import("./email");
          const bundleInvitationId = validSessions.find(s => (s as any)?.metadata?.invitationId)?.metadata?.invitationId || 
                                     validSessions.find(s => (s as any)?.partnerInvitationId)?.partnerInvitationId || null;
          let autoLoginToken: string | undefined;
          if (hasExistingAccount) {
            try {
              const existingUserForBundle = await storage.getUserByEmail(email);
              if (existingUserForBundle) {
                autoLoginToken = crypto.randomUUID();
                const autoLoginExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                await storage.setAutoLoginToken(existingUserForBundle.id, autoLoginToken, autoLoginExpiry);
              }
            } catch (tokenErr) {
              console.error("[Bundle Payment] Failed to generate auto-login token:", tokenErr);
            }
          }
          const emailResult = await sendResultsReadyEmail({
            email,
            assessmentTypes: assessmentTypes.length > 0 ? assessmentTypes : ['fit'],
            partnerCompanyName: partnerName,
            hasExistingAccount,
            partnerInvitationId: bundleInvitationId || undefined,
            autoLoginToken,
          });
          
          if (emailResult.success) {
            console.log(`[Bundle Payment] Results ready email sent to ${email} for ${assessmentTypes.length} assessments`);
          } else {
            console.error(`[Bundle Payment] Failed to send results ready email`);
          }
        } catch (emailError) {
          console.error('[Bundle Payment] Failed to send results email:', emailError);
        }
      })();
    } catch (error) {
      console.error("Error processing bundle payment:", error);
      res.status(500).json({ error: "Failed to process payment" });
    }
  });
}

function getBaseUrl(req: Request): string {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}`;
}

function formatAssessmentTypeName(type: string): string {
  const mapping: Record<string, string> = {
    'fit': 'FIT Assessment',
    'ai_readiness': 'AI Readiness Assessment',
    'prompt_architecture': 'Prompt Architecture Assessment',
    'aiq': 'AIQ Assessment',
  };
  return mapping[type.toLowerCase()] || type;
}

// Graded scoring for AIQ assessment (same as B2C)
function calculateAIQScores(answers: Record<string, string>): Record<string, number> {
  const gradedScores: Record<string, Record<string, number>> = {
    '1': { 'A': 100, 'B': 0, 'C': 65, 'D': 30 },
    '2': { 'A': 100, 'B': 70, 'C': 25, 'D': 0 },
    '3': { 'A': 70, 'B': 55, 'C': 100, 'D': 0 },
    '4': { 'A': 0, 'B': 100, 'C': 20, 'D': 60 },
    '5': { 'A': 75, 'B': 100, 'C': 15, 'D': 40 },
    '6': { 'A': 100, 'B': 60, 'C': 20, 'D': 45 },
    '7': { 'A': 100, 'B': 50, 'C': 75, 'D': 20 },
    '8': { 'A': 50, 'B': 70, 'C': 100, 'D': 0 },
  };

  let totalPoints = 0;
  let questionsAnswered = 0;
  
  Object.entries(answers).forEach(([question, answer]) => {
    const questionScores = gradedScores[question];
    if (questionScores && questionScores[answer] !== undefined) {
      totalPoints += questionScores[answer];
      questionsAnswered++;
    }
  });

  const averageScore = questionsAnswered > 0 
    ? Math.round(totalPoints / questionsAnswered) 
    : 0;
  
  return { 'Algorithmic Integrity': averageScore };
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
  const normalizedType = normalizeAssessmentId(assessmentType);
  let scores: Record<string, number>;
  let totalScore: number;
  let evaluations: any[] | undefined;
  
  if (normalizedType === 'fit') {
    scores = calculateFITScores(answers);
    // Calculate average of all skill scores for total
    const skillScores = Object.values(scores);
    totalScore = skillScores.length > 0 
      ? Math.round(skillScores.reduce((a, b) => a + b, 0) / skillScores.length)
      : 0;
  } else if (normalizedType === 'ai_readiness') {
    scores = calculateAIReadinessScores(answers);
    // Calculate average of all skill scores for total
    const skillScores = Object.values(scores);
    totalScore = skillScores.length > 0 
      ? Math.round(skillScores.reduce((a, b) => a + b, 0) / skillScores.length)
      : 0;
  } else if (normalizedType === 'aiq') {
    scores = calculateAIQScores(answers);
    totalScore = scores['Algorithmic Integrity'] || 0;
  } else if (normalizedType === 'prompt_architecture') {
    // Prompt Architecture uses async GPT evaluation - same as B2C for consistency
    // Uses PA_LEVEL_DESCRIPTIONS from shared service module

    // Evaluate each level with GPT
    const evaluationsWithData: Array<{
      level: number;
      userPrompt: string;
      evaluation: any;
    }> = [];
    
    let clarityTotal = 0;
    let structureTotal = 0;
    let contextTotal = 0;
    let creativityTotal = 0;
    let iterativeTotal = 0;

    // Process each answer with GPT evaluation
    for (const [levelKey, userPrompt] of Object.entries(answers)) {
      if (!userPrompt || typeof userPrompt !== 'string' || !userPrompt.trim()) continue;
      
      const levelMatch = levelKey.match(/level-?(\d+)/);
      const levelNum = levelMatch ? parseInt(levelMatch[1]) : 1;
      const taskDesc = PA_LEVEL_DESCRIPTIONS[levelNum.toString()] || `Level ${levelNum} task`;
      
      try {
        const evaluation = await evaluatePromptWithGPT(userPrompt, levelNum, taskDesc);
        evaluationsWithData.push({ level: levelNum, userPrompt, evaluation });
        
        clarityTotal += evaluation.clarity;
        structureTotal += evaluation.structure;
        contextTotal += evaluation.contextRelevance;
        creativityTotal += evaluation.creativity;
        iterativeTotal += evaluation.iterativeImprovement;
      } catch (error: any) {
        console.error(`[B2B PA] GPT evaluation failed for level ${levelNum}:`, error.message);
        // Use fallback scores if GPT fails (0-20 scale per criterion, 50 total per level)
        evaluationsWithData.push({
          level: levelNum,
          userPrompt,
          evaluation: {
            clarity: 10,
            structure: 10,
            contextRelevance: 10,
            creativity: 10,
            iterativeImprovement: 10,
            totalScore: 50,
            feedback: 'Evaluation unavailable - default scores applied',
          },
        });
        clarityTotal += 10;
        structureTotal += 10;
        contextTotal += 10;
        creativityTotal += 10;
        iterativeTotal += 10;
      }
    }

    const numLevels = evaluationsWithData.length || 1;
    scores = {
      "Clarity": Math.round(clarityTotal / numLevels),
      "Structure": Math.round(structureTotal / numLevels),
      "Context Relevance": Math.round(contextTotal / numLevels),
      "Creativity": Math.round(creativityTotal / numLevels),
      "Iterative Improvement": Math.round(iterativeTotal / numLevels),
    };
    totalScore = Math.round((clarityTotal + structureTotal + contextTotal + creativityTotal + iterativeTotal) / numLevels);
    
    // Build evaluations array for response (matching B2C format)
    evaluations = evaluationsWithData.map(({ level, evaluation }) => ({
      level,
      ...evaluation,
    }));
  } else {
    // Fallback for unknown assessment types
    const questionCount = Object.keys(answers).length || 1;
    const answeredQuestions = Object.values(answers).filter((a) => a !== null && a !== undefined);
    
    const rawScore = (answeredQuestions.length / questionCount) * 100;
    totalScore = Math.round(50 + rawScore * 0.4 + Math.pow(rawScore / 100, 2) * 5);
    totalScore = Math.min(95, Math.max(50, totalScore));
    
    scores = { overall: totalScore };
  }
  
  // Calculate percentile based on total score
  const percentile = Math.min(99, Math.max(1, Math.round(totalScore * 0.9)));
  
  return { scores, totalScore, percentile, evaluations };
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

// ============================================================================
// GUEST ASSESSMENT FLOW - For partner-invited candidates (no login required)
// Uses existing embed infrastructure with invitation token authentication
// ============================================================================

// Helper function to link partner assessment results to a user account
// Creates assessment_results entries for each completed session in the invitation
async function linkPartnerResultsToUser(userId: string, invitation: any) {
  try {
    // Get all assessment sessions for this partner
    const allSessions = await storage.getSessionsByPartner(invitation.partnerId);
    
    // Filter to completed sessions for this invitation
    const completedSessions = allSessions.filter(
      (s: any) => (s.metadata as any)?.invitationId === invitation.id && s.status === 'completed'
    );
    
    if (completedSessions.length === 0) {
      console.log(`No completed sessions to link for invitation ${invitation.id}`);
      return;
    }
    
    // Load existing results once to avoid N+1 queries and reduce race conditions
    const existingResults = await storage.getResultsByUser(userId);
    const existingResultsSet = new Set(
      existingResults
        .filter((r: any) => r.partnerInvitationId === invitation.id)
        .map((r: any) => `${r.partnerInvitationId}:${r.assessmentType}`)
    );
    
    let linkedCount = 0;
    
    // For each completed session, create an assessment result linked to the user
    for (const session of completedSessions) {
      const resultKey = `${invitation.id}:${session.assessmentType}`;
      
      if (existingResultsSet.has(resultKey)) {
        continue; // Skip if already linked
      }
      
      // Mark as linked to prevent duplicates in this batch
      existingResultsSet.add(resultKey);
      
      // Create assessment result entry linked to user
      const createdResult = await storage.createAssessmentResult({
        userId,
        partnerInvitationId: invitation.id,
        assessmentType: session.assessmentType,
        questionLocale: session.questionLocale || 'default',
        answers: session.answers || {},
        scores: session.scores || {},
        totalScore: session.totalScore,
        percentile: session.percentile,
        evaluations: session.evaluations,
        status: 'completed',
        completedAt: session.completedAt,
      });
      
      // For PA assessments, copy per-level evaluations from session JSONB into the dedicated table
      const normalizedType = normalizeAssessmentId(session.assessmentType);
      if (normalizedType === 'prompt_architecture' && session.evaluations && Array.isArray(session.evaluations)) {
        try {
          for (const evalEntry of session.evaluations) {
            if (evalEntry.level === undefined || evalEntry.totalScore === undefined) continue;
            
            const answers = session.answers || {};
            const levelKey = Object.keys(answers).find(k => {
              const match = k.match(/level-?(\d+)/);
              return match && parseInt(match[1]) === evalEntry.level;
            });
            const userPrompt = levelKey ? (answers as any)[levelKey] : '';
            
            await db.insert(promptArchitectureEvaluations).values({
              resultId: createdResult.id,
              level: evalEntry.level,
              userPrompt: userPrompt || '',
              aiResponse: null,
              evaluationScores: {
                clarity: evalEntry.clarity ?? 0,
                structure: evalEntry.structure ?? 0,
                contextRelevance: evalEntry.contextRelevance ?? 0,
                creativity: evalEntry.creativity ?? 0,
                iterativeImprovement: evalEntry.iterativeImprovement ?? 0,
              },
              totalScore: evalEntry.totalScore,
              feedback: evalEntry.feedback || null,
              status: 'completed',
              evaluatedAt: new Date(),
            });
          }
          console.log(`[Link PA] Inserted ${session.evaluations.length} PA evaluations for result ${createdResult.id}`);
        } catch (paError) {
          console.error(`[Link PA] Failed to insert PA evaluations for result ${createdResult.id}:`, paError);
        }
      }
      
      linkedCount++;
    }
    
    console.log(`Linked ${linkedCount} new partner assessment results to user ${userId}`);
  } catch (error) {
    console.error("Error linking partner results to user:", error);
    // Don't throw - this is a non-critical operation
  }
}

// Rate limiting for token validation attempts (security: prevent brute force)
const tokenValidationAttempts = new Map<string, { count: number; firstAttempt: number }>();
const TOKEN_RATE_LIMIT = 10; // Max attempts per window
const TOKEN_RATE_WINDOW = 60 * 1000; // 1 minute window

function checkTokenRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const attempt = tokenValidationAttempts.get(ip);
  
  if (!attempt || (now - attempt.firstAttempt) > TOKEN_RATE_WINDOW) {
    // Reset or create new entry
    tokenValidationAttempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }
  
  if (attempt.count >= TOKEN_RATE_LIMIT) {
    const retryAfter = Math.ceil((TOKEN_RATE_WINDOW - (now - attempt.firstAttempt)) / 1000);
    return { allowed: false, retryAfter };
  }
  
  attempt.count++;
  return { allowed: true };
}

// Cleanup old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, attempt] of tokenValidationAttempts.entries()) {
    if ((now - attempt.firstAttempt) > TOKEN_RATE_WINDOW * 2) {
      tokenValidationAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function registerGuestAssessmentRoutes(app: Express) {
  // Get invitation details by token - landing page
  app.get("/api/guest/invite/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      // Rate limiting to prevent brute force token guessing
      const clientIp = req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0] || 'unknown';
      const rateCheck = checkTokenRateLimit(clientIp);
      if (!rateCheck.allowed) {
        return res.status(429).json({ 
          error: "Too many requests. Please try again later.",
          retryAfter: rateCheck.retryAfter
        });
      }
      
      const invitation = await storage.getPartnerCandidateInvitationByToken(token);
      
      // If not found in partner invitations, check admin invitations table as fallback
      if (!invitation) {
        const adminInvitation = await storage.getInvitationByToken(token);
        if (!adminInvitation) {
          return res.status(404).json({ error: "Invitation not found or invalid" });
        }
        
        // Check if admin invitation has expired
        if (adminInvitation.expiresAt && new Date(adminInvitation.expiresAt) < new Date()) {
          return res.status(410).json({ error: "Invitation has expired" });
        }
        
        // Admin invitations create user accounts upfront, so user should already exist
        const existingUser = await storage.getUserByEmail(adminInvitation.candidateEmail);
        const hasExistingAccount = !!existingUser;
        
        // Get inviter info for display
        const inviter = await storage.getUser(adminInvitation.sentBy);
        const inviterName = inviter?.firstName || inviter?.name || 'HumanMetrix';
        
        // For admin invitations, check completion status from user's assessment results
        const assessmentTypes = (adminInvitation.assessmentTypes as string[]).map((t: string) => normalizeAssessmentId(t));
        let assessmentStatuses = assessmentTypes.map((type: string) => ({
          type,
          status: 'not_started' as string,
          sessionId: null as string | null,
        }));
        
        if (existingUser) {
          const userResults = await storage.getResultsByUser(existingUser.id);
          assessmentStatuses = assessmentTypes.map((type: string) => {
            const result = userResults.find((r: any) => normalizeAssessmentId(r.assessmentType) === type);
            return {
              type,
              status: result ? 'completed' : 'not_started',
              sessionId: null,
            };
          });
        }
        
        const allComplete = assessmentStatuses.every((s: any) => s.status === 'completed');
        
        // Update admin invitation status if all complete
        if (allComplete && adminInvitation.status !== 'completed') {
          await storage.updateInvitationStatus(adminInvitation.id, 'completed', new Date());
        }
        
        return res.json({
          id: adminInvitation.id,
          email: adminInvitation.candidateEmail,
          name: adminInvitation.candidateName,
          assessmentTypes,
          assessmentStatuses,
          partnerName: inviterName,
          partnerId: null,
          expiresAt: adminInvitation.expiresAt,
          status: allComplete ? 'completed' : adminInvitation.status,
          allComplete,
          hasExistingAccount,
          isAdminInvite: true,
        });
      }
      
      // Check if invitation has expired
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Invitation has expired" });
      }
      
      // Get partner info
      const partner = await storage.getPartnerAccount(invitation.partnerId);
      
      // Get sessions created from this invitation
      const allSessions = await storage.getSessionsByPartner(invitation.partnerId, 100);
      const invitationSessions = allSessions.filter(
        (s: any) => (s.metadata as any)?.invitationId === invitation.id
      );
      
      // Map assessment types to their completion status based on sessions
      // Use the most recent session for each type (sort by createdAt descending)
      const assessmentStatuses = invitation.assessmentTypes.map((type: string) => {
        const normalizedType = normalizeAssessmentId(type);
        // Find all sessions for this type and sort by createdAt (most recent first)
        const sessionsForType = invitationSessions
          .filter((s: any) => normalizeAssessmentId(s.assessmentType) === normalizedType)
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const mostRecentSession = sessionsForType[0];
        return {
          type: normalizedType,
          status: mostRecentSession?.status || 'not_started',
          sessionId: mostRecentSession?.id || null,
        };
      });
      
      // Check if all assessments are complete
      const allComplete = assessmentStatuses.every((s: any) => s.status === 'completed');
      
      // Check if user already has an account (for auto-login at completion)
      let hasExistingAccount = false;
      if (invitation.email) {
        const existingUser = await storage.getUserByEmail(invitation.email);
        hasExistingAccount = !!existingUser;
      }
      
      res.json({
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        assessmentTypes: invitation.assessmentTypes.map((t: string) => normalizeAssessmentId(t)),
        assessmentStatuses,
        partnerName: partner?.companyName || partner?.name || 'Partner',
        partnerId: invitation.partnerId,
        expiresAt: invitation.expiresAt,
        status: allComplete ? 'completed' : invitation.status,
        allComplete,
        hasExistingAccount,
      });
    } catch (error) {
      console.error("Error fetching invitation:", error);
      res.status(500).json({ error: "Failed to fetch invitation details" });
    }
  });
  
  // Create account after completing assessments (optional)
  // Auto-generates password, emails it, and auto-logs in the user
  app.post("/api/guest/invite/:token/create-account", async (req: any, res: Response) => {
    try {
      const { token } = req.params;
      
      const invitation = await storage.getPartnerCandidateInvitationByToken(token);
      if (!invitation) {
        // Check admin invitations - admin invites already create accounts upfront
        const adminInvitation = await storage.getInvitationByToken(token);
        if (adminInvitation) {
          const existingUser = await storage.getUserByEmail(adminInvitation.candidateEmail);
          if (existingUser) {
            // Auto-login existing user
            req.session.userId = existingUser.id;
            await new Promise<void>((resolve, reject) => {
              req.session.save((err: any) => {
                if (err) reject(err);
                else resolve();
              });
            });
            return res.json({ 
              success: true, 
              message: "You have been logged in.",
              existingAccount: true,
              redirectTo: '/dashboard?view=candidate'
            });
          }
          return res.status(400).json({ error: "Account not found. Please contact your administrator." });
        }
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      if (!invitation.email) {
        return res.status(400).json({ error: "Email required to create account" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(invitation.email);
      if (existingUser) {
        // Auto-login existing user
        req.session.userId = existingUser.id;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        // Link partner assessment results to existing user
        await linkPartnerResultsToUser(existingUser.id, invitation);
        
        // Send a results-ready email reminding them of their existing account
        const { sendB2BResultsReadyEmail } = await import('./email');
        const displayName = existingUser.firstName || existingUser.name || existingUser.username || invitation.email.split('@')[0];
        
        const invitationId = invitation.id;
        let guestRedirectUrl = invitationId 
          ? `/dashboard?view=candidate&scrollToSeries=${invitationId}` 
          : "/dashboard?view=candidate";
        
        try {
          let autoLoginToken: string | undefined;
          try {
            autoLoginToken = crypto.randomUUID();
            const autoLoginExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await storage.setAutoLoginToken(existingUser.id, autoLoginToken, autoLoginExpiry);
          } catch (tokenErr) {
            console.error("[GuestInvite] Failed to generate auto-login token:", tokenErr);
          }
          await sendB2BResultsReadyEmail({
            email: invitation.email,
            candidateName: displayName,
            partnerName: invitation.partnerName || 'your employer',
            dashboardUrl: `${req.protocol}://${req.get('host')}${guestRedirectUrl}`,
            autoLoginToken,
          });
        } catch (emailErr) {
          console.error(`[GuestInvite] Failed to send results-ready email to ${invitation.email}:`, emailErr);
        }
        console.log(`[GuestInvite] Existing user ${existingUser.id} logged in, results-ready email sent to ${invitation.email}`);
        
        return res.json({ 
          success: true, 
          message: "You have been logged in to your existing account.",
          existingAccount: true,
          redirectTo: guestRedirectUrl
        });
      }
      
      // Generate temporary password
      const temporaryPassword = generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
      
      const nameParts = invitation.name?.split(' ') || [];
      const firstName = nameParts[0] || invitation.email.split('@')[0];
      const lastName = nameParts.slice(1).join(' ') || null;
      
      // Create new user
      const newUser = await storage.createUser({
        email: invitation.email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        role: 'user',
      });
      
      // Generate auto-login token and send welcome email (non-blocking)
      import('crypto').then(async (crypto) => {
        const autoLoginToken = crypto.randomUUID();
        const autoLoginExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await storage.setAutoLoginToken(newUser.id, autoLoginToken, autoLoginExpiry);
        
        const { sendWelcomeEmailWithPassword } = await import('./email');
        sendWelcomeEmailWithPassword(
          invitation.email!,
          firstName,
          temporaryPassword,
          "You've completed your assessments and can now access your results anytime.",
          'post_payment',
          autoLoginToken
        ).then(() => {
          console.log(`[GuestInvite] Credentials email sent to ${invitation.email}`);
        }).catch((emailErr) => {
          console.error(`[GuestInvite] Failed to send credentials email to ${invitation.email}:`, emailErr);
        });
      });
      console.log(`[GuestInvite] New account created for ${invitation.email}`);
      
      // Auto-login the new user
      req.session.userId = newUser.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Link partner assessment results to new user
      await linkPartnerResultsToUser(newUser.id, invitation);
      
      const invitationId = invitation.id;
      const redirectTo = invitationId 
        ? `/dashboard?view=candidate&scrollToSeries=${invitationId}` 
        : '/dashboard?view=candidate';
      
      res.json({ 
        success: true, 
        message: "Account created successfully. Check your email for login credentials.",
        userId: newUser.id,
        redirectTo,
      });
    } catch (error) {
      console.error("Error creating account:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });
  
  // Generate embed session from invitation token
  // This bridges the invitation system with the existing embed infrastructure
  app.post("/api/guest/invite/:token/session", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { assessmentType } = req.body;
      
      const invitation = await storage.getPartnerCandidateInvitationByToken(token);
      if (!invitation) {
        // Check admin invitations - admin invites don't use partner sessions
        const adminInvitation = await storage.getInvitationByToken(token);
        if (adminInvitation) {
          return res.status(400).json({ 
            error: "Admin invitations use the standard assessment flow. Please log in to take your assessments.",
            isAdminInvite: true
          });
        }
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Invitation has expired" });
      }
      
      const normalizedType = normalizeAssessmentId(assessmentType);
      
      // Verify this assessment type is in the invitation
      const normalizedInvitationTypes = invitation.assessmentTypes.map((t: string) => normalizeAssessmentId(t));
      if (!normalizedInvitationTypes.includes(normalizedType)) {
        return res.status(403).json({ error: "Assessment type not included in invitation" });
      }
      
      // Get partner's API key to create a session
      const partner = await storage.getPartnerAccount(invitation.partnerId);
      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
      }
      
      // Check for existing session for this invitation/type combination
      const existingSessions = await storage.getSessionsByPartner(invitation.partnerId, 100);
      const existingSession = existingSessions.find((s: any) => 
        (s.metadata as any)?.invitationId === invitation.id && 
        normalizeAssessmentId(s.assessmentType) === normalizedType
      );
      
      if (existingSession) {
        if (existingSession.status === 'completed') {
          return res.status(400).json({ 
            error: "Assessment already completed",
            sessionId: existingSession.id,
            status: 'completed'
          });
        }
        return res.json({ 
          sessionId: existingSession.id,
          assessmentType: normalizedType,
          resumed: true 
        });
      }
      
      // Create new embed session using partner's credentials
      const sessionData = {
        partnerId: invitation.partnerId,
        assessmentType: normalizedType,
        status: 'created',
        externalUserId: invitation.externalUserId || invitation.email || 'guest',
        externalEmail: invitation.email,
        metadata: {
          invitationId: invitation.id,
          invitationToken: token,
          source: 'partner_invitation',
          candidateName: invitation.name,
        },
        webhookUrl: null,
        expiresAt: invitation.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
      
      const session = await storage.createAssessmentSession(sessionData);
      
      // Update invitation status if first assessment
      if (invitation.status === 'pending' || invitation.status === 'sent') {
        await storage.updatePartnerCandidateInvitation(invitation.id, {
          status: 'started',
          startedAt: new Date(),
        });
      }
      
      res.json({ 
        sessionId: session.id,
        assessmentType: normalizedType,
        resumed: false 
      });
    } catch (error) {
      console.error("Error creating session from invitation:", error);
      res.status(500).json({ error: "Failed to create assessment session" });
    }
  });
}
