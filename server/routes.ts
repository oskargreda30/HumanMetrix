import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { ASSESSMENT_TYPES, ASSESSMENT_PRICES, BASE_FEE, normalizeAssessmentId, insertInvitationSchema } from "@shared/schema";
import { db } from "./db";
import { purchaseItems, assessmentResults, purchases, promptArchitectureEvaluations } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendInvitationEmail, sendContactFormEmail, sendWelcomeEmailWithPassword } from "./email";
import { generateTemporaryPassword } from "./passwordUtils";
import bcrypt from "bcryptjs";
import OpenAI from "openai";
import Stripe from "stripe";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 45000, // 45 seconds per request
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

// Simple retry helper with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on non-transient errors
      if (error.code === 'invalid_api_key' || error.code === 'insufficient_quota') {
        throw error;
      }
      
      // If this was the last attempt, throw
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait with exponential backoff: 1s, 2s
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Rate limiting for contact form (in-memory)
const contactFormRateLimiter = new Map<string, { count: number; resetTime: number }>();

const contactFormSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  company: z.string().min(2),
  message: z.string().min(10),
  intent: z.enum(['demo', 'sales']),
});

// Get time limit in seconds for each assessment type
function getAssessmentTimeLimit(assessmentType: string): number {
  // Prompt Architecture: 14 minutes (2 min per level × 7 levels)
  if (assessmentType === 'prompt_architecture') {
    return 840; // 14 minutes in seconds
  }
  // All other assessments: 20 minutes
  return 1200;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup simple auth
  await setupAuth(app);

  // Version check endpoint
  app.get("/api/version", (req, res) => {
    res.json({ 
      version: "2.0-normalized-scoring",
      deployed: new Date().toISOString(),
      scoringLogic: "normalized"
    });
  });

  // Contact form endpoint with rate limiting
  app.post("/api/contact", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      // Check rate limit
      const rateLimitData = contactFormRateLimiter.get(ip);
      if (rateLimitData) {
        if (now < rateLimitData.resetTime) {
          if (rateLimitData.count >= 5) {
            return res.status(429).json({ 
              message: "Too many requests. Please try again later." 
            });
          }
          rateLimitData.count += 1;
        } else {
          contactFormRateLimiter.set(ip, { count: 1, resetTime: now + oneHour });
        }
      } else {
        contactFormRateLimiter.set(ip, { count: 1, resetTime: now + oneHour });
      }

      // Validate request body
      const validatedData = contactFormSchema.parse(req.body);

      // Send email
      await sendContactFormEmail(
        validatedData.name,
        validatedData.email,
        validatedData.company,
        validatedData.message,
        validatedData.intent
      );

      res.json({ 
        success: true, 
        message: "Message sent successfully" 
      });
    } catch (error: any) {
      console.error("Contact form error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid form data" 
        });
      }
      res.status(500).json({ 
        message: "Failed to send message. Please try again later." 
      });
    }
  });

  // Process payment success and create user account
  app.post("/api/process-payment-success", async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }

      // Retrieve the checkout session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (!session || session.payment_status !== "paid") {
        return res.status(400).json({ message: "Payment not completed" });
      }

      const metadata = session.metadata;
      
      if (!metadata) {
        return res.status(400).json({ message: "Missing session metadata" });
      }

      // Handle logged-in user purchasing additional assessments
      if (metadata.userId && !metadata.isGuestCheckout) {
        const userId = metadata.userId;
        const assessmentIds = metadata.assessmentIds;
        
        if (!userId || !assessmentIds) {
          return res.status(400).json({ message: "Missing user or assessment information" });
        }

        // Create purchase record
        const purchase = await storage.createPurchase({
          userId: userId,
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent as string || null,
          totalAmount: session.amount_total || 0,
          baseFee: BASE_FEE,
          status: "completed",
          resultsAccessPaid: true, // Paid users can view results
          completedAt: new Date(),
        });

        let assessmentList: string[];
        try {
          assessmentList = JSON.parse(assessmentIds);
        } catch (e) {
          return res.status(400).json({ message: "Invalid assessment data format" });
        }
        
        for (const assessmentId of assessmentList) {
          const normalizedId = normalizeAssessmentId(assessmentId);
          const price = ASSESSMENT_PRICES[normalizedId] || 0;
          
          await storage.createPurchaseItem({
            purchaseId: purchase.id,
            assessmentType: normalizedId,
            price,
            status: "ready",
          });
        }
        
        return res.json({
          success: true,
          message: "Assessments added to your account",
          isLoggedIn: true,
        });
      }

      // Handle guest checkout (new user)
      if (metadata.isGuestCheckout !== "true") {
        return res.status(400).json({ message: "Invalid checkout session" });
      }

      const { customerEmail, firstName, lastName, assessmentIds } = metadata;
      
      if (!customerEmail || !firstName || !lastName) {
        return res.status(400).json({ message: "Missing customer information" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(customerEmail);
      
      if (existingUser) {
        // User already exists, just grant access to assessments
        const purchase = await storage.createPurchase({
          userId: existingUser.id,
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent as string || null,
          totalAmount: session.amount_total || 0,
          baseFee: BASE_FEE,
          status: "completed",
          resultsAccessPaid: true, // Paid users can view results
          completedAt: new Date(),
        });

        let assessmentList: string[];
        try {
          assessmentList = JSON.parse(assessmentIds);
        } catch (e) {
          return res.status(400).json({ message: "Invalid assessment data format" });
        }
        
        for (const assessmentId of assessmentList) {
          const normalizedId = normalizeAssessmentId(assessmentId);
          const price = ASSESSMENT_PRICES[normalizedId] || 0;
          
          await storage.createPurchaseItem({
            purchaseId: purchase.id,
            assessmentType: normalizedId,
            price,
            status: "ready",
          });
        }
        
        return res.json({
          success: true,
          email: customerEmail,
          message: "Assessments added to existing account",
        });
      }

      // Generate temporary password
      const bcrypt = await import("bcryptjs");
      const { sendWelcomeEmailWithPassword } = await import("./email");
      const crypto = await import("crypto");
      
      const words = [
        "ocean", "mountain", "forest", "river", "cloud",
        "storm", "dawn", "sunset", "moon", "star",
        "wind", "rain", "snow", "fire", "earth",
        "sky", "wave", "thunder", "lightning", "rainbow"
      ];
      
      const word1 = words[crypto.randomInt(0, words.length)];
      const word2 = words[crypto.randomInt(0, words.length)];
      const word3 = words[crypto.randomInt(0, words.length)];
      const digits = crypto.randomInt(10, 100).toString();
      
      const temporaryPassword = `${word1}-${word2}-${word3}-${digits}`;
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);
      
      // Create user account
      await storage.createUser({
        email: customerEmail,
        passwordHash,
        firstName,
        lastName,
        profileImageUrl: null,
      });
      
      const newUser = await storage.getUserByEmail(customerEmail);
      if (!newUser) {
        throw new Error("Failed to create user account");
      }

      // Create purchase record and grant assessment access
      const purchase = await storage.createPurchase({
        userId: newUser.id,
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string || null,
        totalAmount: session.amount_total || 0,
        baseFee: BASE_FEE,
        status: "completed",
        resultsAccessPaid: true, // Paid users can view results
        completedAt: new Date(),
      });

      const assessmentList = JSON.parse(assessmentIds);
      
      for (const assessmentId of assessmentList) {
        const normalizedId = normalizeAssessmentId(assessmentId);
        const price = ASSESSMENT_PRICES[normalizedId] || 0;
        
        await storage.createPurchaseItem({
          purchaseId: purchase.id,
          assessmentType: normalizedId,
          price,
          status: "ready",
        });
      }
      
      // Send welcome email with credentials
      try {
        await sendWelcomeEmailWithPassword(
          customerEmail,
          `${firstName} ${lastName}`,
          temporaryPassword
        );
        console.log(`✓ Welcome email sent successfully to ${customerEmail}`);
      } catch (emailError: any) {
        console.error(`✗ Failed to send welcome email to ${customerEmail}:`, emailError);
        // Don't fail the payment - account is created, just email failed
        // User can use password reset as fallback
      }

      res.json({
        success: true,
        email: customerEmail,
        message: "Account created and credentials sent",
      });
    } catch (error: any) {
      console.error("Error processing payment success:", error);
      res.status(500).json({ message: "Failed to process payment: " + error.message });
    }
  });

  // Results payment endpoint (for invited users)
  app.post("/api/unlock-results", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { discountCode, purchaseId } = req.body;
      
      let unpaidPurchase: any;
      
      if (purchaseId) {
        // Use the specific purchase ID provided (preferred)
        const purchases = await storage.getPurchasesByUser(userId);
        unpaidPurchase = purchases.find((p: any) => p.id === purchaseId);
        
        if (!unpaidPurchase) {
          return res.status(404).json({ 
            message: "Purchase not found or does not belong to this user" 
          });
        }
        
        if (unpaidPurchase.resultsAccessPaid) {
          return res.status(400).json({ 
            message: "Results for this purchase have already been paid for" 
          });
        }
      } else {
        // Fallback: Find the user's most recent unpaid purchase
        // Note: Invited users may have purchases with 0 items (just for tracking payment)
        let purchases = await storage.getPurchasesByUser(userId);
        let unpaidPurchases = purchases.filter((p: any) => !p.resultsAccessPaid);
        
        // Defensive fallback: For legacy invited users who logged in before the fix
        if (!unpaidPurchases || unpaidPurchases.length === 0) {
          const user = await storage.getUser(userId);
          if (user) {
            const invitationPurchase = await storage.ensureInvitationPurchase(userId, user.email);
            if (invitationPurchase) {
              unpaidPurchases = [invitationPurchase];
            } else {
              return res.status(400).json({ 
                message: "No purchase or active invitation found requiring payment" 
              });
            }
          } else {
            return res.status(404).json({ message: "User not found" });
          }
        }
        
        // Use most recent unpaid purchase
        unpaidPurchases.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        unpaidPurchase = unpaidPurchases[0];
      }
      
      // Get the user and determine required assessments (from invitation or purchase)
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Determine required assessments from current unpaid purchase cycle only
      let requiredAssessmentTypes: string[] = [];
      let linkedInvitation: any = null;
      
      // Get assessments from current unpaid purchase items
      const purchaseItems = await storage.getPurchaseItems(unpaidPurchase.id);
      const purchaseAssessments = purchaseItems.map((item: any) => item.assessmentType);

      if (purchaseAssessments.length > 0) {
        // Self-service purchase: Use only the purchased assessments
        // This prevents re-billing for previously paid invitation assessments
        requiredAssessmentTypes = purchaseAssessments;
      } else if (unpaidPurchase.invitationId) {
        // Invitation-linked purchase: Use the SPECIFIC linked invitation
        // This prevents re-billing for other old invitations
        linkedInvitation = await storage.getInvitation(unpaidPurchase.invitationId);
        if (linkedInvitation && new Date(linkedInvitation.expiresAt) > new Date()) {
          requiredAssessmentTypes = linkedInvitation.assessmentTypes;
        }
      }
      
      // Validate that we have at least some assessments to unlock
      if (requiredAssessmentTypes.length === 0) {
        return res.status(400).json({ 
          message: "No assessments found for this purchase or invitation. Please contact support.",
          error: "no_assessments"
        });
      }
      
      // Get completed assessments and check for DISTINCT types
      const results = await storage.getResultsByUser(userId);
      const completedResults = results.filter((r: any) => r.status === 'completed');
      
      // Get unique assessment types to prevent duplicate completions from bypassing check
      const uniqueAssessmentTypes = new Set(completedResults.map((r: any) => r.assessmentType));
      
      // CRITICAL: Require all REQUIRED assessments to be completed before allowing unlock
      const allRequiredCompleted = requiredAssessmentTypes.every(type => uniqueAssessmentTypes.has(type));
      
      if (!allRequiredCompleted) {
        // Count how many of the REQUIRED assessments are completed
        const completedRequiredCount = requiredAssessmentTypes.filter(type => uniqueAssessmentTypes.has(type)).length;
        return res.status(400).json({ 
          message: `You must complete all required assessments before unlocking results. You have completed ${completedRequiredCount} of ${requiredAssessmentTypes.length} required assessments.`,
          completedCount: completedRequiredCount,
          required: requiredAssessmentTypes.length
        });
      }
      
      // Calculate price based ONLY on required assessments for this purchase cycle
      // Business logic: Pay per purchase cycle - don't charge for previously paid assessments
      // Price = base fee + assessments in current unpaid purchase/invitation
      const assessmentsTotal = requiredAssessmentTypes.reduce((sum, type) => {
        const normalizedType = normalizeAssessmentId(type);
        return sum + (ASSESSMENT_PRICES[normalizedType] || 0);
      }, 0);
      const priceInPence = BASE_FEE + assessmentsTotal;
      const totalAssessmentCount = requiredAssessmentTypes.length;
      
      // Check if discount code is "FREE" (case-insensitive)
      if (discountCode && discountCode.trim().toUpperCase() === "FREE") {
        // Grant free access
        await storage.updatePurchase(unpaidPurchase.id.toString(), {
          resultsAccessPaid: true,
        });
        
        return res.json({ 
          success: true, 
          message: "Results unlocked successfully",
          free: true 
        });
      }
      
      // Otherwise, create Stripe checkout session for results payment
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: 'Assessment Results Access',
                description: `Unlock your assessment results and download your professional PDF report (${totalAssessmentCount} assessment${totalAssessmentCount > 1 ? 's' : ''})`,
              },
              unit_amount: priceInPence,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        allow_promotion_codes: true,
        success_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : req.protocol + '://' + req.hostname}/payment-callback?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : req.protocol + '://' + req.hostname}/dashboard?payment=cancelled`,
        metadata: {
          userId: userId.toString(),
          purchaseId: unpaidPurchase.id.toString(),
          isResultsPayment: 'true',
        },
      });
      
      res.json({ 
        success: true, 
        sessionUrl: session.url,
        free: false 
      });
    } catch (error: any) {
      console.error("Error unlocking results:", error);
      res.status(500).json({ 
        message: "Failed to process request: " + error.message 
      });
    }
  });

  // Process results payment success (non-authenticated callback for Stripe redirects)
  // This endpoint doesn't require authentication because session cookies can be lost during Stripe redirects
  // Security is ensured by validating the Stripe session instead
  app.post("/api/process-results-payment", async (req: any, res) => {
    try {
      const { sessionId } = req.body;
      
      console.log(`[Payment Callback] Processing session: ${sessionId}`);
      
      if (!sessionId) {
        console.error("[Payment Callback] No session ID provided");
        return res.status(400).json({ 
          success: false,
          message: "Session ID required" 
        });
      }
      
      // Retrieve and validate Stripe session
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      console.log(`[Payment Callback] Stripe session retrieved - Status: ${session.payment_status}, Mode: ${session.mode}`);
      
      // Accept both "paid" and "no_payment_required" (for free checkouts with 100% discount)
      if (!session || (session.payment_status !== "paid" && session.payment_status !== "no_payment_required")) {
        console.error(`[Payment Callback] Invalid payment status: ${session?.payment_status}`);
        return res.status(400).json({ 
          success: false,
          message: "Payment not completed" 
        });
      }
      
      const metadata = session.metadata;
      if (!metadata || metadata.isResultsPayment !== 'true') {
        console.error(`[Payment Callback] Invalid session metadata - isResultsPayment: ${metadata?.isResultsPayment}`);
        return res.status(400).json({ 
          success: false,
          message: "Invalid session" 
        });
      }
      
      const purchaseId = metadata.purchaseId;
      const userId = metadata.userId;
      
      if (!purchaseId || !userId) {
        console.error(`[Payment Callback] Missing required metadata - purchaseId: ${purchaseId}, userId: ${userId}`);
        return res.status(400).json({ 
          success: false,
          message: "Invalid session metadata" 
        });
      }
      
      // Check if already processed to prevent double-processing
      const purchase = await storage.getPurchase(purchaseId);
      if (purchase?.resultsAccessPaid) {
        console.log(`[Payment Callback] Purchase ${purchaseId} already processed, skipping`);
        return res.json({ 
          success: true, 
          message: "Results already unlocked",
          alreadyProcessed: true
        });
      }
      
      // Update purchase to grant results access
      await storage.updatePurchase(purchaseId, {
        resultsAccessPaid: true,
      });
      
      console.log(`[Payment Callback] ✓ Successfully unlocked results for purchase ${purchaseId}, user ${userId}`);
      
      // Re-establish session after Stripe redirect
      // Stripe redirects often cause session cookies to be lost, especially in production
      // We regenerate the session to ensure a fresh, valid session is created
      try {
        await new Promise<void>((resolve, reject) => {
          req.session.regenerate((err: any) => {
            if (err) {
              console.error(`[Payment Callback] Session regeneration error:`, err);
              // If regeneration fails, try setting on existing session
              req.session.userId = userId;
              req.session.save((saveErr: any) => {
                if (saveErr) {
                  console.error(`[Payment Callback] Session save error:`, saveErr);
                  reject(saveErr);
                } else {
                  console.log(`[Payment Callback] ✓ Session saved (fallback) for user ${userId}`);
                  resolve();
                }
              });
            } else {
              // Set user ID on newly regenerated session
              req.session.userId = userId;
              req.session.save((saveErr: any) => {
                if (saveErr) {
                  console.error(`[Payment Callback] Session save error:`, saveErr);
                  reject(saveErr);
                } else {
                  console.log(`[Payment Callback] ✓ Session regenerated and saved for user ${userId}`);
                  resolve();
                }
              });
            }
          });
        });
      } catch (sessionError: any) {
        console.error(`[Payment Callback] CRITICAL: Session re-establishment failed`, sessionError);
        return res.status(500).json({ 
          success: false,
          message: "Payment processed but session error occurred. Please log in manually."
        });
      }
      
      // Session is now guaranteed to be saved with Set-Cookie header
      res.json({ 
        success: true, 
        message: "Results access granted",
        purchaseId: purchaseId // Return purchaseId so frontend can redirect correctly
      });
    } catch (error: any) {
      console.error("[Payment Callback ERROR]", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to process payment: " + error.message 
      });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Ensure invitation purchase exists for invited users (on first login)
      await storage.ensureInvitationPurchase(user.id, user.email);
      
      // Check if user has any completed purchases (to determine if invitation-only)
      const purchases = await storage.getPurchasesByUser(user.id);
      const hasCompletedPurchase = purchases.some((p: any) => p.status === 'completed');
      
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        isInvitationOnly: !hasCompletedPurchase,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Stripe checkout session for guest (before signup)
  app.post("/api/create-checkout-session-guest", async (req, res) => {
    try {
      const { assessmentIds, customerEmail, customerName, firstName, lastName } = req.body;
      
      if (!assessmentIds || !Array.isArray(assessmentIds) || assessmentIds.length === 0) {
        return res.status(400).json({ message: "Invalid assessment selection" });
      }

      if (!customerEmail || !customerName || !firstName || !lastName) {
        return res.status(400).json({ message: "Customer details required" });
      }

      // Create line items for Stripe
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "Base Computation Fee",
              description: "One-time platform access fee",
            },
            unit_amount: BASE_FEE,
          },
          quantity: 1,
        },
      ];

      // Add assessment line items
      const assessmentNames: Record<string, string> = {
        "fit": "FIT Assessment (15Q)",
        "ai_readiness": "AI Readiness Assessment (21Q)",
        "prompt_architecture": "Prompt Architecture Assessment (7 Levels)",
        "aiq": "Algorithmic Integrity Quotient (AIQ) (4Q)",
      };

      for (const assessmentId of assessmentIds) {
        const normalizedId = normalizeAssessmentId(assessmentId);
        if (!ASSESSMENT_PRICES[normalizedId]) {
          return res.status(400).json({ message: `Invalid assessment: ${assessmentId}` });
        }
        
        lineItems.push({
          price_data: {
            currency: "gbp",
            product_data: {
              name: assessmentNames[normalizedId] || normalizedId,
            },
            unit_amount: ASSESSMENT_PRICES[normalizedId], // Already in pence
          },
          quantity: 1,
        });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer_email: customerEmail,
        line_items: lineItems,
        mode: "payment",
        success_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : req.protocol + '://' + req.hostname}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : req.protocol + '://' + req.hostname}/assessments`,
        metadata: {
          customerEmail,
          customerName,
          firstName,
          lastName,
          assessmentIds: JSON.stringify(assessmentIds),
          isGuestCheckout: "true",
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating guest checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session: " + error.message });
    }
  });

  // Free checkout for testing (using discount code "FREE")
  app.post("/api/checkout-free", async (req, res) => {
    try {
      const { assessmentIds, customerEmail, customerName, firstName, lastName } = req.body;
      
      if (!assessmentIds || !Array.isArray(assessmentIds) || assessmentIds.length === 0) {
        return res.status(400).json({ message: "Invalid assessment selection" });
      }

      if (!customerEmail || !customerName || !firstName || !lastName) {
        return res.status(400).json({ message: "Customer details required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(customerEmail);
      if (existingUser) {
        return res.status(400).json({ 
          message: "An account with this email already exists. Please log in instead." 
        });
      }

      // Generate temporary password
      const temporaryPassword = generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      // Create user account
      const newUser = await storage.createUser({
        email: customerEmail,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        isAdmin: false,
      });

      // Create purchase record with status "completed" (free checkout)
      const purchase = await storage.createPurchase({
        userId: newUser.id,
        stripeSessionId: `free_${Date.now()}`, // Unique identifier for free checkout
        totalAmount: 0, // Free
        baseFee: 0,
        status: "completed",
      });

      // Create purchase items with status "ready"
      for (const assessmentId of assessmentIds) {
        await storage.createPurchaseItem({
          purchaseId: purchase.id,
          assessmentType: assessmentId,
          price: 0, // Free
          status: "ready",
        });
      }

      // Send welcome email with login credentials
      try {
        await sendWelcomeEmailWithPassword(customerEmail, `${firstName} ${lastName}`, temporaryPassword);
      } catch (emailError) {
        console.error("✗ Failed to send welcome email:", emailError);
        // Don't fail the whole checkout if email fails
      }

      res.json({ 
        success: true,
        message: "Account created successfully! Check your email for login credentials."
      });
    } catch (error: any) {
      console.error("Error processing free checkout:", error);
      res.status(500).json({ 
        message: "Failed to process free checkout: " + error.message 
      });
    }
  });

  // Create free purchase for logged-in users (payment-deferred model)
  app.post("/api/create-free-purchase", isAuthenticated, async (req: any, res) => {
    try {
      const { assessmentIds } = req.body;
      
      if (!assessmentIds || !Array.isArray(assessmentIds) || assessmentIds.length === 0) {
        return res.status(400).json({ message: "Invalid assessment selection" });
      }

      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create purchase record with resultsAccessPaid: false (payment-deferred)
      const purchase = await storage.createPurchase({
        userId: userId,
        stripeSessionId: `free_${Date.now()}_${userId}`,
        totalAmount: 0,
        baseFee: 0,
        status: "completed",
        resultsAccessPaid: false, // User can take assessments, pay later for results
        completedAt: new Date(),
      });

      // Create purchase items with status "ready"
      for (const assessmentId of assessmentIds) {
        const normalizedId = normalizeAssessmentId(assessmentId);
        
        await storage.createPurchaseItem({
          purchaseId: purchase.id,
          assessmentType: normalizedId,
          price: 0, // Free to take
          status: "ready",
        });
      }
      
      res.json({
        success: true,
        message: "Assessments added to your account! You can now take them for free.",
        purchaseId: purchase.id,
      });
    } catch (error: any) {
      console.error("Error creating free purchase:", error);
      res.status(500).json({ message: "Failed to create free purchase: " + error.message });
    }
  });

  // Stripe checkout session
  app.post("/api/create-checkout-session", isAuthenticated, async (req: any, res) => {
    try {
      const { assessmentIds } = req.body;
      
      if (!assessmentIds || !Array.isArray(assessmentIds) || assessmentIds.length === 0) {
        return res.status(400).json({ message: "Invalid assessment selection" });
      }

      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create line items for Stripe
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "Base Computation Fee",
              description: "One-time platform access fee",
            },
            unit_amount: BASE_FEE,
          },
          quantity: 1,
        },
      ];

      // Add assessment line items
      const assessmentNames: Record<string, string> = {
        "fit": "FIT Assessment (15Q)",
        "ai_readiness": "AI Readiness Assessment (21Q)",
        "prompt_architecture": "Prompt Architecture Assessment (7 Levels)",
        "aiq": "Algorithmic Integrity Quotient (AIQ) (4Q)",
      };

      for (const assessmentId of assessmentIds) {
        const normalizedId = normalizeAssessmentId(assessmentId);
        if (!ASSESSMENT_PRICES[normalizedId]) {
          return res.status(400).json({ message: `Invalid assessment: ${assessmentId}` });
        }
        
        lineItems.push({
          price_data: {
            currency: "gbp",
            product_data: {
              name: assessmentNames[normalizedId] || normalizedId,
            },
            unit_amount: ASSESSMENT_PRICES[normalizedId], // Already in pence
          },
          quantity: 1,
        });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer_email: user.email,
        line_items: lineItems,
        mode: "payment",
        success_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : req.protocol + '://' + req.hostname}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : req.protocol + '://' + req.hostname}/purchase`,
        metadata: {
          userId: userId,
          assessmentIds: JSON.stringify(assessmentIds),
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session: " + error.message });
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

  // Get purchase items by purchase ID (for price calculation)
  app.get("/api/purchase-items/:purchaseId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { purchaseId } = req.params;
      
      // Verify purchase belongs to user
      const purchase = await storage.getPurchase(purchaseId);
      if (!purchase || purchase.userId !== userId) {
        return res.status(404).json({ message: "Purchase not found" });
      }
      
      const items = await storage.getPurchaseItems(purchaseId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching purchase items:", error);
      res.status(500).json({ message: "Failed to fetch purchase items" });
    }
  });

  // Get user's purchases with their results grouped (for batch viewing)
  app.get("/api/purchases-with-results", isAuthenticated, async (req: any, res) => {
    try {
      // Prevent browser caching - always fetch fresh data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const userId = req.user.id;
      
      // Efficient bulk queries (no N+1)
      const [purchasesRaw, allResults] = await Promise.all([
        storage.getPurchasesByUser(userId),
        storage.getResultsByUser(userId)
      ]);
      
      // Sort purchases newest first for consistent numbering
      const purchases = purchasesRaw.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Get all purchase items in bulk
      const allPurchaseItems = await Promise.all(
        purchases.map(p => storage.getPurchaseItems(p.id))
      );
      
      // Flatten and create a map of purchaseId -> items
      const purchaseItemsMap = new Map<string, any[]>();
      allPurchaseItems.forEach((items, index) => {
        purchaseItemsMap.set(purchases[index].id, items);
      });
      
      // Create map of purchaseItemId -> results[] (supports multiple results per item)
      const resultsMap = new Map<string, any[]>();
      allResults.forEach(result => {
        if (result.purchaseItemId) {
          if (!resultsMap.has(result.purchaseItemId)) {
            resultsMap.set(result.purchaseItemId, []);
          }
          resultsMap.get(result.purchaseItemId)!.push(result);
        }
      });
      
      // Group results by purchase
      const purchasesWithResults = purchases.map(purchase => {
        const items = purchaseItemsMap.get(purchase.id) || [];
        const resultsForPurchase: any[] = [];
        
        // Collect ALL results for all items in this purchase
        items.forEach(item => {
          const itemResults = resultsMap.get(item.id) || [];
          itemResults.forEach(result => {
            resultsForPurchase.push({
              ...result,
              purchaseItemId: item.id,  // Ensure linkage is explicit
              assessmentType: item.assessmentType
            });
          });
        });
        
        const completedResults = resultsForPurchase.filter(r => r.status === 'completed');
        
        // Find the latest completion date for this purchase
        const completedAt = completedResults.length > 0
          ? completedResults
              .filter(r => r.completedAt)
              .map(r => new Date(r.completedAt))
              .sort((a, b) => b.getTime() - a.getTime())[0]
          : null;
        
        return {
          ...purchase,
          purchaseItems: items,
          results: resultsForPurchase,  // All results, including multiple attempts
          completedCount: completedResults.length,
          totalCount: items.length,
          allItemsCompleted: completedResults.length >= items.length,
          completedAt: completedAt ? completedAt.toISOString() : null
        };
      });
      
      res.json(purchasesWithResults);
    } catch (error) {
      console.error("Error fetching purchases with results:", error);
      res.status(500).json({ message: "Failed to fetch purchases with results" });
    }
  });

  // Get available assessments for user (from purchases OR invitations)
  app.get("/api/available-assessments", isAuthenticated, async (req: any, res) => {
    try {
      // Prevent browser caching - always fetch fresh data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const availableAssessments: any[] = [];
      let requiredAssessmentTypes: string[] = [];
      let hasActiveInvitation = false;
      const purchasedAssessmentTypes = new Set<string>();
      const addedAssessmentTypes = new Set<string>(); // Track which types we've already added
      
      // Check for purchased assessments
      const purchases = await storage.getPurchasesByUser(userId);
      
      for (const purchase of purchases) {
        if (purchase.status === 'completed') {
          const items = await storage.getPurchaseItems(purchase.id);
          
          for (const item of items) {
            // Track all purchased assessment types (regardless of completion)
            purchasedAssessmentTypes.add(item.assessmentType);
            
            const existing = await storage.getResultByPurchaseItem(item.id);
            
            if (!existing || existing.status !== 'completed') {
              // Only add if we haven't already added this assessment type
              if (!addedAssessmentTypes.has(item.assessmentType)) {
                availableAssessments.push({
                  purchaseItemId: item.id,
                  assessmentType: item.assessmentType,
                  status: item.status,
                  source: 'purchase',
                });
                addedAssessmentTypes.add(item.assessmentType);
              }
            }
          }
        }
      }
      
      // Check for invitation-based assessments
      const invitations = await storage.getInvitationsByEmail(user.email);
      for (const invitation of invitations) {
        // Only include active invitations (sent or accepted, not completed/expired)
        if (invitation.status === 'sent' || invitation.status === 'accepted') {
          // Check if invitation is still valid (not expired)
          if (new Date(invitation.expiresAt) > new Date()) {
            hasActiveInvitation = true;
            // Track required assessment types from invitation
            requiredAssessmentTypes = invitation.assessmentTypes;
            
            // Add each assessment type from the invitation
            for (const assessmentType of invitation.assessmentTypes) {
              // Check if this assessment type was already completed via this invitation
              const existingResult = await storage.getResultByInvitationAndType(invitation.id, assessmentType);
              
              if (!existingResult || existingResult.status !== 'completed') {
                // Only add if we haven't already added this assessment type
                if (!addedAssessmentTypes.has(assessmentType)) {
                  // Create a synthetic ID for invitation-based assessments (using :: separator to avoid UUID/type conflicts)
                  availableAssessments.push({
                    purchaseItemId: `invitation::${invitation.id}::${assessmentType}`,
                    assessmentType: assessmentType,
                    status: 'ready',
                    source: 'invitation',
                    invitationId: invitation.id,
                  });
                  addedAssessmentTypes.add(assessmentType);
                }
              }
            }
          }
        }
      }
      
      // If no active invitation, use the assessments they actually purchased
      if (!hasActiveInvitation) {
        requiredAssessmentTypes = Array.from(purchasedAssessmentTypes);
      }
      
      res.json({ 
        assessments: availableAssessments,
        requiredAssessmentTypes,
      });
    } catch (error) {
      console.error("Error fetching available assessments:", error);
      res.status(500).json({ message: "Failed to fetch available assessments" });
    }
  });

  // Start an assessment (from purchase or invitation)
  app.post("/api/assessments/start", isAuthenticated, async (req: any, res) => {
    try {
      const { purchaseItemId } = req.body;
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if this is an invitation-based assessment (synthetic ID format: invitation::{invitationId}::{assessmentType})
      if (purchaseItemId.startsWith('invitation::')) {
        const parts = purchaseItemId.split('::');
        if (parts.length !== 3 || parts[0] !== 'invitation') {
          return res.status(400).json({ message: "Invalid invitation assessment ID" });
        }
        
        const invitationId = parts[1];
        const assessmentType = parts[2];

        // Verify invitation exists and belongs to user
        const invitation = await storage.getInvitation(invitationId);
        if (!invitation || invitation.candidateEmail !== user.email) {
          return res.status(403).json({ message: "Unauthorized access to this assessment" });
        }

        // Verify invitation is still valid
        if (new Date(invitation.expiresAt) < new Date()) {
          return res.status(400).json({ message: "Invitation has expired" });
        }

        // Verify this assessment type is included in the invitation
        if (!invitation.assessmentTypes.includes(assessmentType)) {
          return res.status(403).json({ message: "Assessment type not included in invitation" });
        }

        // Check if assessment already started for this invitation
        const existing = await storage.getResultByInvitationAndType(invitationId, assessmentType);
        if (existing) {
          if (existing.userId !== userId) {
            return res.status(403).json({ message: "Unauthorized access to this assessment" });
          }
          
          // Calculate remaining time based on assessment type
          const timeLimit = getAssessmentTimeLimit(assessmentType);
          const startTime = new Date(existing.startedAt).getTime();
          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);
          const remaining = Math.max(0, timeLimit - elapsed);
          
          return res.json({ ...existing, timeRemaining: remaining });
        }

        // Create new assessment result for invitation
        const result = await storage.createAssessmentResult({
          userId,
          purchaseItemId: null,
          invitationId,
          assessmentType,
          answers: {},
          scores: {},
          totalScore: null,
          percentile: null,
          status: 'in_progress',
          completedAt: null,
        });

        const timeLimit = getAssessmentTimeLimit(assessmentType);
        const startTime = new Date(result.startedAt).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, timeLimit - elapsed);

        return res.json({ ...result, timeRemaining: remaining });
      }

      // Handle purchase-based assessment (existing logic)
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
        
        // Calculate remaining time based on assessment type
        const timeLimit = getAssessmentTimeLimit(item.assessmentType);
        const startTime = new Date(existing.startedAt).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, timeLimit - elapsed);
        
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

      // Calculate initial remaining time based on assessment type
      const timeLimit = getAssessmentTimeLimit(item.assessmentType);
      const startTime = new Date(result.startedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, timeLimit - elapsed);

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

      // Check if time limit exceeded based on assessment type
      const timeLimit = getAssessmentTimeLimit(result.assessmentType);
      const startTime = new Date(result.startedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      
      if (elapsed > timeLimit) {
        // Time expired - auto-submit with current answers only
        console.log(`Assessment ${id} submitted after time limit (${elapsed}s > ${timeLimit}s)`);
      }

      // Calculate scores based on assessment type
      let scores: Record<string, number> = {};
      let totalScore: number | null = 0;
      let evaluations: any[] = [];

      if (result.assessmentType === ASSESSMENT_TYPES.FIT) {
        scores = calculateFITScores(answers);
        totalScore = null; // No total score for FIT - just individual skills
      } else if (result.assessmentType === ASSESSMENT_TYPES.AI_READINESS) {
        scores = calculateAIReadinessScores(answers);
        totalScore = null; // No total score for AI Readiness - just individual skills
      } else if (result.assessmentType === ASSESSMENT_TYPES.AIQ) {
        scores = calculateAIQScores(answers);
        totalScore = scores['Algorithmic Integrity']; // AIQ has a single score
      } else if (result.assessmentType === ASSESSMENT_TYPES.PROMPT_ARCHITECTURE) {
        // For Prompt Architecture, use OpenAI GPT evaluation
        // This includes transactional storage of evaluations AND status update
        try {
          console.log(`[Assessment Submit] Starting Prompt Architecture evaluation for assessment ${id}`);
          const promptEvalResult = await calculatePromptArchitectureScores(answers, id);
          scores = promptEvalResult.scores;
          totalScore = promptEvalResult.totalScore;
          evaluations = promptEvalResult.evaluations;
          
          console.log(`[Assessment Submit] Prompt Architecture evaluation completed successfully`);
          
          // The function already updated the assessment result in a transaction
          // Just return the results
          return res.json({ success: true, scores, totalScore, evaluations });
        } catch (error: any) {
          console.error(`[Assessment Submit ERROR] Prompt Architecture failed for assessment ${id}:`, {
            error: error.message,
            stack: error.stack
          });
          
          // Handle OpenAI API errors gracefully
          if (error.message?.includes('quota') || error.message?.includes('429')) {
            return res.status(402).json({ 
              message: "OpenAI API quota exceeded. Please add credits to your OpenAI account to use Prompt Architecture assessment.",
              error: "quota_exceeded"
            });
          }
          if (error.message?.includes('invalid') && error.message?.includes('key')) {
            return res.status(500).json({ 
              message: "OpenAI API configuration error. Please contact support.",
              error: "api_config_error"
            });
          }
          if (error.message?.includes('timeout')) {
            return res.status(504).json({ 
              message: "OpenAI API request timed out. Please try again.",
              error: "timeout"
            });
          }
          
          // Return detailed error message to help debug
          return res.status(500).json({ 
            message: error.message || "Failed to evaluate prompts with AI. Please try again.",
            error: "evaluation_failed"
          });
        }
      }

      // For other assessment types, update assessment result
      await db.update(assessmentResults)
        .set({
          answers,
          scores,
          totalScore,
          evaluations: Array.isArray(evaluations) && evaluations.length > 0 ? evaluations : null,
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

  // Get current user's candidate data for PDF export (restricted to non-sensitive fields)
  app.get("/api/my-candidate-data", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only fetch results - exclude admin-only data (tags, notes)
      const results = await storage.getResultsByUser(user.id);

      // Return minimal structure needed for PDF export
      res.json({
        user,
        results,
        tags: [],        // Empty - candidates shouldn't see admin tags
        notes: [],       // Empty - candidates shouldn't see admin notes
        invitations: [], // Empty - not needed for candidate PDF
      });
    } catch (error) {
      console.error("Error fetching candidate data:", error);
      res.status(500).json({ message: "Failed to fetch candidate data" });
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

  // Check if user was invited
  app.get("/api/invitation-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if there's an invitation record for this email
      const invitations = await storage.getAllInvitations();
      const wasInvited = invitations.some((inv: any) => 
        inv.candidateEmail.toLowerCase() === user.email.toLowerCase()
      );
      
      res.json({ wasInvited });
    } catch (error) {
      console.error("Error checking invitation status:", error);
      res.status(500).json({ message: "Failed to check invitation status" });
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
      
      // Create user account with temporary password
      let temporaryPassword = '';
      const bcrypt = await import("bcryptjs");
      const { sendWelcomeEmailWithPassword } = await import("./email");
      const crypto = await import("crypto");
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.candidateEmail);
      
      if (!existingUser) {
        // Generate temporary password using crypto for randomness
        const words = [
          "ocean", "mountain", "forest", "river", "cloud",
          "storm", "dawn", "sunset", "moon", "star",
          "wind", "rain", "snow", "fire", "earth",
          "sky", "wave", "thunder", "lightning", "rainbow"
        ];
        
        const word1 = words[crypto.randomInt(0, words.length)];
        const word2 = words[crypto.randomInt(0, words.length)];
        const word3 = words[crypto.randomInt(0, words.length)];
        const digits = crypto.randomInt(10, 100).toString();
        
        temporaryPassword = `${word1}-${word2}-${word3}-${digits}`;
        const passwordHash = await bcrypt.hash(temporaryPassword, 10);
        
        // Extract first and last name from candidateName
        const nameParts = validatedData.candidateName.split(' ');
        const firstName = nameParts[0] || validatedData.candidateName;
        const lastName = nameParts.slice(1).join(' ') || null;
        
        // Create user account
        console.log(`Creating user account for ${validatedData.candidateEmail}`);
        await storage.createUser({
          email: validatedData.candidateEmail,
          passwordHash,
          firstName,
          lastName,
          profileImageUrl: null,
        });
        
        // Grant free access to all assessments
        const newUser = await storage.getUserByEmail(validatedData.candidateEmail);
        if (!newUser) {
          throw new Error("Failed to create user account");
        }
        
        console.log(`Granting free assessments to user ${newUser.id}`);
        await storage.createFreeAssessmentsForUser(newUser.id);
        
        // Send welcome email with credentials
        console.log(`Sending welcome email to ${validatedData.candidateEmail}`);
        await sendWelcomeEmailWithPassword(
          validatedData.candidateEmail,
          validatedData.candidateName,
          temporaryPassword,
          validatedData.message ?? undefined
        );
        
        console.log(`Successfully created invitation for ${validatedData.candidateEmail} with temp password: ${temporaryPassword}`);
      } else {
        console.log(`User ${validatedData.candidateEmail} already exists, granting free assessments`);
        
        // Grant free assessments to existing user (if they don't already have them)
        await storage.createFreeAssessmentsForUser(existingUser.id);
        
        console.log(`Successfully granted free assessments to existing user ${validatedData.candidateEmail}`);
      }

      res.json({
        ...invitation,
        // Only include temporary password in response if it was generated
        ...(temporaryPassword ? { temporaryPassword } : {})
      });
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  // Self-service: Create free account and grant access to assessments (no payment upfront)
  app.post("/api/create-free-invitation", async (req, res) => {
    try {
      const { assessmentIds, firstName, lastName, email } = req.body;
      
      if (!assessmentIds || !Array.isArray(assessmentIds) || assessmentIds.length === 0) {
        return res.status(400).json({ message: "Please select at least one assessment" });
      }

      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "Please provide your name and email" });
      }

      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return res.status(400).json({ message: "Please provide a valid email address" });
      }

      // Validate assessment IDs using ASSESSMENT_PRICES as source of truth
      const validAssessmentIds = Object.keys(ASSESSMENT_PRICES);
      const invalidIds = assessmentIds.filter((id: string) => !validAssessmentIds.includes(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ message: `Invalid assessment IDs: ${invalidIds.join(', ')}` });
      }

      const bcrypt = await import("bcryptjs");
      const { sendWelcomeEmailWithPassword } = await import("./email");
      const crypto = await import("crypto");

      let userId: string;
      let requiresLogin = false;

      // Handle authenticated users differently
      if (req.user) {
        // Logged-in user: validate email matches their account
        if (req.user.email.toLowerCase() !== email.toLowerCase()) {
          return res.status(400).json({ 
            message: 'Email does not match your account. Please use your account email or log out to create a new account.' 
          });
        }
        userId = req.user.id;
        console.log(`Authenticated user ${email} requesting free assessments`);
      } else {
        // Guest user: check if account exists
        const existingUser = await storage.getUserByEmail(email);

        if (!existingUser) {
          // Generate temporary password for new user
          const words = [
            "ocean", "mountain", "forest", "river", "cloud",
            "storm", "dawn", "sunset", "moon", "star",
            "wind", "rain", "snow", "fire", "earth",
            "sky", "wave", "thunder", "lightning", "rainbow"
          ];
          
          const word1 = words[crypto.randomInt(0, words.length)];
          const word2 = words[crypto.randomInt(0, words.length)];
          const word3 = words[crypto.randomInt(0, words.length)];
          const digits = crypto.randomInt(10, 100).toString();
          
          const temporaryPassword = `${word1}-${word2}-${word3}-${digits}`;
          const passwordHash = await bcrypt.hash(temporaryPassword, 10);
          
          // Create user account
          const newUser = await storage.createUser({
            email,
            passwordHash,
            firstName,
            lastName,
            profileImageUrl: null,
          });
          
          userId = newUser.id;
          requiresLogin = true;
          
          console.log(`📧 Sending welcome email to ${email} with temporary password`);
          // Send welcome email with credentials
          await sendWelcomeEmailWithPassword(
            email,
            `${firstName} ${lastName}`,
            temporaryPassword
          );
          console.log(`✅ Created new user ${email} and sent welcome email`);
        } else {
          userId = existingUser.id;
          requiresLogin = true; // Existing user needs to log in
          console.log(`⚠️  User ${email} already exists - no email will be sent, they need to use their existing password`);
        }
      }

      // Check for existing unpaid purchase (idempotency)
      const existingPurchases = await storage.getPurchasesByUser(userId);
      const unpaidPurchase = existingPurchases.find((p: any) => !p.resultsAccessPaid);

      let purchaseId: string;

      if (unpaidPurchase) {
        // User already has unpaid access, use existing purchase
        purchaseId = unpaidPurchase.id;
        console.log(`User ${email} has existing unpaid purchase ${purchaseId}`);
        
        // Get existing purchase items to avoid duplicates
        const existingItems = await storage.getPurchaseItems(purchaseId);
        const existingTypes = new Set(existingItems.map((item: any) => item.assessmentType));
        
        // Only add new assessments that don't already exist
        for (const assessmentId of assessmentIds) {
          if (!existingTypes.has(assessmentId)) {
            await storage.createPurchaseItem({
              purchaseId,
              assessmentType: assessmentId,
              price: ASSESSMENT_PRICES[assessmentId as keyof typeof ASSESSMENT_PRICES], // Standard price in pence (for metadata/analytics)
              status: 'ready',
            });
            console.log(`Added ${assessmentId} to existing purchase`);
          }
        }
      } else {
        // Check if user has an active invitation matching these assessments
        let matchingInvitationId: string | null = null;
        
        const userInvitations = await storage.getInvitationsByEmail(email);
        for (const invitation of userInvitations) {
          // Only consider active, non-expired invitations
          if ((invitation.status === 'sent' || invitation.status === 'accepted') && 
              new Date(invitation.expiresAt) > new Date()) {
            // Check if this invitation's assessments match the selected ones
            const invitationAssessments = new Set(invitation.assessmentTypes);
            const selectedAssessments = new Set(assessmentIds);
            
            // Exact match: invitation assessments = selected assessments
            if (invitationAssessments.size === selectedAssessments.size &&
                Array.from(invitationAssessments).every(a => selectedAssessments.has(a))) {
              matchingInvitationId = invitation.id;
              console.log(`Matched invitation ${invitation.id} for ${email}`);
              break;
            }
          }
        }
        
        // Create new free purchase (resultsAccessPaid: false = pay later)
        const purchase = await storage.createPurchase({
          userId,
          stripeSessionId: null,
          stripePaymentIntentId: null,
          totalAmount: 0, // 0 pence
          baseFee: 0, // 0 pence
          status: 'completed',
          resultsAccessPaid: false, // Must pay to unlock results
          completedAt: new Date(),
          invitationId: matchingInvitationId, // Link to invitation if matched
        });
        
        purchaseId = purchase.id;

        // Create purchase items for selected assessments with standard pricing (for analytics)
        for (const assessmentId of assessmentIds) {
          await storage.createPurchaseItem({
            purchaseId,
            assessmentType: assessmentId,
            price: ASSESSMENT_PRICES[assessmentId as keyof typeof ASSESSMENT_PRICES], // Standard price in pence
            status: 'ready',
          });
        }

        const purchaseType = matchingInvitationId ? 'invitation-linked' : 'self-service';
        console.log(`Created ${purchaseType} free purchase ${purchaseId} with ${assessmentIds.length} assessment(s) for ${email}`);
      }
    

      res.json({
        success: true,
        message: requiresLogin 
          ? "Account created! Check your email for login instructions." 
          : "You're all set! Log in to start your assessments.",
        requiresLogin,
      });
    } catch (error: any) {
      console.error("Error creating free account:", error);
      res.status(500).json({ 
        message: "Failed to process request: " + error.message 
      });
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

  // Admin: Get all candidates with results, tags, notes
  app.get("/api/admin/candidates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const candidates = await storage.getCandidatesWithResults();
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  // Admin: Get platform averages for benchmarking
  app.get("/api/admin/platform-averages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const candidates = await storage.getCandidatesWithResults();
      
      // Calculate platform-wide averages
      const allSkills: Record<string, number[]> = {};
      let totalScores: number[] = [];
      
      candidates.forEach((candidate: any) => {
        const completedResults = candidate.results?.filter(
          (r: any) => r.status === 'completed' && r.scores
        ) || [];
        
        let candidateScores: number[] = [];
        
        completedResults.forEach((result: any) => {
          if (result.scores && typeof result.scores === 'object') {
            Object.entries(result.scores).forEach(([skillName, score]) => {
              if (typeof score === 'number') {
                if (!allSkills[skillName]) {
                  allSkills[skillName] = [];
                }
                allSkills[skillName].push(score);
                candidateScores.push(score);
              }
            });
          }
        });
        
        if (candidateScores.length > 0) {
          const avg = candidateScores.reduce((a, b) => a + b, 0) / candidateScores.length;
          totalScores.push(avg);
        }
      });
      
      // Calculate skill averages
      const skillAverages: Record<string, number> = {};
      Object.entries(allSkills).forEach(([skillName, scores]) => {
        if (scores.length > 0) {
          skillAverages[skillName] = Math.round(
            scores.reduce((a, b) => a + b, 0) / scores.length
          );
        }
      });
      
      // Calculate overall platform average
      const avgScoreAcrossCandidates = totalScores.length > 0
        ? Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length)
        : 0;
      
      res.json({
        totalCandidates: candidates.length,
        avgScoreAcrossCandidates,
        skillAverages,
      });
    } catch (error) {
      console.error("Error fetching platform averages:", error);
      res.status(500).json({ message: "Failed to fetch platform averages" });
    }
  });

  // Admin: Add tag to candidate
  app.post("/api/admin/candidates/tags", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.id;
      const admin = await storage.getUser(adminId);
      
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const { userId, tag } = req.body;
      if (!userId || !tag) {
        return res.status(400).json({ message: "User ID and tag are required" });
      }

      const createdTag = await storage.createCandidateTag({
        userId,
        tag,
        color: null,
        createdBy: adminId,
      });

      res.json(createdTag);
    } catch (error) {
      console.error("Error adding tag:", error);
      res.status(500).json({ message: "Failed to add tag" });
    }
  });

  // Admin: Add note to candidate
  app.post("/api/admin/candidates/notes", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.id;
      const admin = await storage.getUser(adminId);
      
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const { userId, note } = req.body;
      if (!userId || !note) {
        return res.status(400).json({ message: "User ID and note are required" });
      }

      const createdNote = await storage.createCandidateNote({
        userId,
        note,
        createdBy: adminId,
      });

      res.json(createdNote);
    } catch (error) {
      console.error("Error adding note:", error);
      res.status(500).json({ message: "Failed to add note" });
    }
  });

  // Admin: Get comparison data for multiple candidates
  app.get("/api/admin/compare", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const userIds = Array.isArray(req.query.userIds)
        ? req.query.userIds as string[]
        : [req.query.userIds as string];

      if (!userIds || userIds.length < 2) {
        return res.status(400).json({ message: "At least 2 user IDs required" });
      }

      // Get results for all selected candidates
      const candidatesResults = await Promise.all(
        userIds.map((id) => storage.getResultsByUser(id))
      );

      // Filter to only multi-skill assessments (FIT has 6 skills, AI Readiness has 9 skills)
      // Exclude AIQ (single score) and prompt_architecture (percentage scoring)
      const skillBasedAssessmentTypes = ['fit', 'ai_readiness', 'ai-readiness'];
      
      // Build radar chart data
      const radarData: any[] = [];
      
      // Normalize assessment type for comparison (handle both hyphens and underscores)
      const normalizeAssessmentType = (type: string) => 
        type.toLowerCase().replace(/[\s-]+/g, '_');
      
      // Skill name normalization map (legacy to canonical)
      const normalizeSkillName = (skill: string): string => {
        const skillMap: Record<string, string> = {
          // Legacy AI Readiness keys → canonical keys
          'AI Literacy': 'AI Literacy & Prompt Engineering',
          'AI Literacy/Prompting': 'AI Literacy & Prompt Engineering',
          'Technical Fluency': 'Technical Fundamentals',
          'Domain Fluency': 'Data Fluency',
          'Critical Thinking': 'Critical Thinking & Problem-Solving',
          'Adaptive Learning': 'Adaptability & Continuous Learning',
          'Collaboration': 'Collaboration & Communication',
          'Cross-functional Collaboration': 'Collaboration & Communication',
          'Responsible AI': 'Responsible AI & Ethical Awareness',
          'Creative Innovation': 'Creativity & Innovation',
        };
        return skillMap[skill] || skill;
      };
      
      // Aggregate skills across all skill-based assessments for radar chart
      const skillsMap = new Map<string, (number | null)[]>();
      
      candidatesResults.forEach((results, candidateIndex) => {
        // Only process skill-based assessments
        const skillBasedResults = results.filter((r) => {
          const normalized = normalizeAssessmentType(r.assessmentType);
          return skillBasedAssessmentTypes.some(type => normalizeAssessmentType(type) === normalized);
        });
        
        skillBasedResults.forEach((result) => {
          if (result.scores && typeof result.scores === 'object') {
            Object.entries(result.scores).forEach(([skill, score]) => {
              const canonicalSkill = normalizeSkillName(skill);
              if (!skillsMap.has(canonicalSkill)) {
                skillsMap.set(canonicalSkill, new Array(userIds.length).fill(null));
              }
              const scores = skillsMap.get(canonicalSkill)!;
              scores[candidateIndex] = score as number;
            });
          }
        });
      });

      skillsMap.forEach((scores, skill) => {
        const dataPoint: any = { skill };
        scores.forEach((score, index) => {
          dataPoint[`candidate${index}`] = score ?? 0; // Use 0 for radar chart display
        });
        radarData.push(dataPoint);
      });

      // Build skill-based comparison table  
      const skillComparison: any[] = [];
      skillsMap.forEach((scores, skillName) => {
        skillComparison.push({
          skillName,
          scores: scores, // Keep nulls for missing scores
        });
      });

      // Calculate average skill scores for each candidate (only from skill-based assessments)
      const averageScores = candidatesResults.map((results) => {
        const skillBasedResults = results.filter((r) => {
          if (r.status !== 'completed' || !r.scores) return false;
          const normalized = normalizeAssessmentType(r.assessmentType);
          return skillBasedAssessmentTypes.some(type => normalizeAssessmentType(type) === normalized);
        });
        
        if (skillBasedResults.length === 0) return 0;
        
        let totalSum = 0;
        let skillCount = 0;
        skillBasedResults.forEach((result) => {
          if (result.scores && typeof result.scores === 'object') {
            const skillValues = Object.values(result.scores);
            totalSum += skillValues.reduce((sum, val) => sum + (val as number), 0);
            skillCount += skillValues.length;
          }
        });
        
        return skillCount > 0 ? Math.round(totalSum / skillCount) : 0;
      });
      
      // Check if we have any skill data to compare
      const hasSkillData = skillComparison.length > 0;

      // Extract specific assessment data for each candidate
      const fitAssessments = await Promise.all(
        candidatesResults.map(async (results) => {
          const fitResult = results.find((r) => {
            const normalized = normalizeAssessmentType(r.assessmentType);
            return normalized === 'fit' && r.status === 'completed';
          });
          return fitResult ? {
            scores: fitResult.scores || {},
            completedAt: fitResult.completedAt,
          } : null;
        })
      );

      const aiReadinessAssessments = await Promise.all(
        candidatesResults.map(async (results) => {
          const aiReadinessResult = results.find((r) => {
            const normalized = normalizeAssessmentType(r.assessmentType);
            return (normalized === 'ai_readiness' || normalized === 'ai-readiness') && r.status === 'completed';
          });
          return aiReadinessResult ? {
            scores: aiReadinessResult.scores || {},
            completedAt: aiReadinessResult.completedAt,
          } : null;
        })
      );

      const aiqAssessments = await Promise.all(
        candidatesResults.map(async (results) => {
          const aiqResult = results.find((r) => {
            const normalized = normalizeAssessmentType(r.assessmentType);
            return normalized === 'aiq' && r.status === 'completed';
          });
          return aiqResult ? {
            totalScore: aiqResult.totalScore || 0,
            scores: aiqResult.scores || {},
            completedAt: aiqResult.completedAt,
          } : null;
        })
      );

      const promptArchitectureAssessments = await Promise.all(
        candidatesResults.map(async (results) => {
          const promptResult = results.find((r) => {
            const normalized = normalizeAssessmentType(r.assessmentType);
            return normalized === 'prompt_architecture' && r.status === 'completed';
          });
          
          if (!promptResult) return null;
          
          // Fetch evaluations for this result
          const evaluations = await storage.getEvaluationsByResult(promptResult.id);
          
          // Helper function to scale dimension scores from 0-25 to 0-20
          const scaleDimensionScore = (score: number): number => {
            return Math.round((score / 25) * 20);
          };
          
          // Organize evaluations by level (1-7) and scale scores
          const levelData = evaluations
            .filter(e => e.status === 'completed' && e.evaluationScores)
            .map(e => {
              const scores = e.evaluationScores!; // Safe because of filter above
              return {
                level: e.level,
                scores: {
                  clarity: scaleDimensionScore(scores.clarity),
                  structure: scaleDimensionScore(scores.structure),
                  contextRelevance: scaleDimensionScore(scores.contextRelevance),
                  creativity: scaleDimensionScore(scores.creativity),
                  iterativeImprovement: scaleDimensionScore(scores.iterativeImprovement),
                },
                totalScore: e.totalScore, // Already out of 100 per level
                feedback: e.feedback,
              };
            })
            .sort((a, b) => a.level - b.level);
          
          // If no level-by-level evaluations exist, create a summary from assessment_results.scores
          let finalLevelData = levelData;
          if (levelData.length === 0 && promptResult.scores && typeof promptResult.scores === 'object') {
            // Convert summary scores to a single "average" level entry
            const summaryScores = promptResult.scores as Record<string, number>;
            const normalizeKey = (key: string) => key.toLowerCase().replace(/\s+/g, '');
            
            // Detect if scores are out of 25 or already out of 100
            const allScoreValues = Object.values(summaryScores).filter(v => typeof v === 'number');
            const maxScore = Math.max(...allScoreValues);
            const scoresAreOutOf100 = maxScore > 25; // If any score > 25, assume they're out of 100
            
            const getSummaryScore = (dimension: string): number | undefined => {
              let rawScore: number | undefined;
              
              // Try direct match first
              if (summaryScores[dimension] !== undefined) {
                rawScore = summaryScores[dimension];
              } else {
                // Try normalized matching
                const normalized = normalizeKey(dimension);
                for (const [key, value] of Object.entries(summaryScores)) {
                  if (normalizeKey(key) === normalized) {
                    rawScore = value;
                    break;
                  }
                }
              }
              
              if (rawScore === undefined) return undefined;
              
              // Scale appropriately based on detected format
              if (scoresAreOutOf100) {
                // Scores are already out of 100, scale to 20
                return Math.round((rawScore / 100) * 20);
              } else {
                // Scores are out of 25, scale to 20
                return scaleDimensionScore(rawScore);
              }
            };
            
            const clarity = getSummaryScore('clarity') || getSummaryScore('Clarity');
            const structure = getSummaryScore('structure') || getSummaryScore('Structure');
            const contextRelevance = getSummaryScore('contextRelevance') || getSummaryScore('Context Relevance');
            const creativity = getSummaryScore('creativity') || getSummaryScore('Creativity');
            const iterativeImprovement = getSummaryScore('iterativeImprovement') || getSummaryScore('Iterative Improvement');
            
            if (clarity !== undefined || structure !== undefined || contextRelevance !== undefined || 
                creativity !== undefined || iterativeImprovement !== undefined) {
              // Create a summary level entry
              finalLevelData = [{
                level: 1,  // Use level 1 as summary
                scores: {
                  clarity: clarity || 0,
                  structure: structure || 0,
                  contextRelevance: contextRelevance || 0,
                  creativity: creativity || 0,
                  iterativeImprovement: iterativeImprovement || 0,
                },
                totalScore: promptResult.totalScore || 0,
                feedback: 'Summary scores from overall assessment',
              }];
            }
          }
          
          return {
            levels: finalLevelData,
            totalScore: promptResult.totalScore || 0,
            percentile: promptResult.percentile,
            completedAt: promptResult.completedAt,
          };
        })
      );

      res.json({
        radarData,
        skillComparison,
        averageScores,
        hasSkillData,
        fitAssessments,
        aiReadinessAssessments,
        promptArchitectureAssessments,
        aiqAssessments,
      });
    } catch (error) {
      console.error("Error fetching comparison data:", error);
      res.status(500).json({ message: "Failed to fetch comparison data" });
    }
  });

  // Admin: Get all job roles
  app.get("/api/admin/roles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const roles = await storage.getAllJobRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  // Admin: Generate required skill scores for a role using OpenAI
  app.post("/api/admin/roles/:roleId/generate-required-scores", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const { roleId } = req.params;
      const role = await storage.getJobRole(roleId);
      
      if (!role) {
        return res.status(404).json({ message: "Job role not found" });
      }

      // Use OpenAI to generate required skill scores
      const OpenAI = await import('openai');
      const openai = new OpenAI.default({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const prompt = `You are an expert HR consultant determining required skill scores for a job role.

JOB ROLE: ${role.name}
${role.description ? `DESCRIPTION: ${role.description}\n` : ''}

Based on this role, determine the minimum required percentage scores (0-100) for each of the following HumanMetrix assessment skills:

FIT ASSESSMENT SKILLS (Behavioral):
1. Resilience - Ability to bounce back from setbacks and maintain performance under pressure
2. High Agency - Taking initiative and ownership of outcomes
3. Growth Mindset - Embracing challenges and viewing failures as learning opportunities
4. Empathy & Ethics - Understanding others' perspectives and maintaining ethical standards
5. Interpersonal Agility - Navigating diverse relationships and adapting communication styles
6. Intellectual Curiosity - Seeking knowledge and exploring new ideas

AI READINESS SKILLS (Technical):
1. AI Literacy - Understanding AI capabilities, limitations, and terminology
2. Collaboration - Working effectively with AI systems and human teams
3. Domain Fluency - Applying AI knowledge within specific professional contexts
4. Responsible AI - Understanding ethical implications and biases in AI applications
5. Domain Expertise - Deep knowledge in a specific field combined with AI understanding
6. Adaptive Learning - Quickly learning new AI tools and adapting to evolving technologies
7. Critical Thinking - Evaluating AI outputs and making informed decisions
8. Technical Fluency - Comfort with technical tools and systems
9. Creative Innovation - Using AI to generate novel solutions and approaches

For each skill, provide a realistic required score (0-100) that represents the MINIMUM competency needed for this specific role. Consider:
- Entry-level roles may require 50-60% for basic skills
- Mid-level roles may require 65-75% for core competencies
- Senior roles may require 80-90% for critical skills
- Not all skills are equally important for every role

Format your response as JSON with this exact structure and skill names:
{
  "fitSkills": {
    "Resilience": number,
    "High Agency": number,
    "Growth Mindset": number,
    "Empathy & Ethics": number,
    "Interpersonal Agility": number,
    "Intellectual Curiosity": number
  },
  "aiReadinessSkills": {
    "AI Literacy": number,
    "Collaboration": number,
    "Data Fluency": number,
    "Responsible AI & Ethical Awareness": number,
    "Domain Expertise": number,
    "Adaptability & Continuous Learning": number,
    "Critical Thinking & Problem-Solving": number,
    "Technical Fundamentals": number,
    "Creativity & Innovation": number
  }
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const requiredScores = JSON.parse(completion.choices[0].message.content || "{}");
      requiredScores.generatedAt = new Date().toISOString();

      // Update the role with the generated scores
      await storage.updateJobRole(roleId, {
        requiredSkillScores: requiredScores,
      });

      res.json(requiredScores);
    } catch (error: any) {
      console.error("Error generating required scores:", error);
      res.status(500).json({ message: "Failed to generate required scores: " + error.message });
    }
  });

  // Admin: Create job role
  app.post("/api/admin/roles", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.id;
      const admin = await storage.getUser(adminId);
      
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const { name, description, competencies } = req.body;
      
      const role = await storage.createJobRole({
        name,
        description,
        competencies,
        isCustom: true,
        createdBy: adminId,
      });

      res.json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  // Admin: Trigger AI role alignment analysis
  app.post("/api/admin/role-alignment", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.id;
      const admin = await storage.getUser(adminId);
      
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const { userId, jobRoleId } = req.body;
      
      if (!userId || !jobRoleId) {
        return res.status(400).json({ message: "User ID and job role ID are required" });
      }

      // Get candidate results
      const results = await storage.getResultsByUser(userId);
      const completedResults = results.filter((r) => r.status === 'completed');
      
      if (completedResults.length === 0) {
        return res.status(400).json({ message: "Candidate has no completed assessments" });
      }

      // Get job role
      const role = await storage.getJobRole(jobRoleId);
      if (!role) {
        return res.status(404).json({ message: "Job role not found" });
      }

      // Aggregate candidate skills from all assessments, separated by type
      const candidateSkills = new Map<string, number>();
      const fitSkills = new Map<string, number>();
      const aiReadinessSkills = new Map<string, number>();
      
      completedResults.forEach((result) => {
        if (result.scores && typeof result.scores === 'object') {
          Object.entries(result.scores).forEach(([skill, score]) => {
            const currentScore = candidateSkills.get(skill) || 0;
            candidateSkills.set(skill, Math.max(currentScore, score as number));
            
            // Categorize by assessment type
            if (result.assessmentType === 'fit') {
              fitSkills.set(skill, score as number);
            } else if (result.assessmentType === 'ai_readiness') {
              aiReadinessSkills.set(skill, score as number);
            }
          });
        }
      });

      // Check if role has required skill scores
      if (!role.requiredSkillScores) {
        return res.status(400).json({ 
          message: "Role does not have required skill scores. Please generate them first.",
          requiresGeneration: true
        });
      }

      // Build skill alignments using stored required scores
      const fitSkillAlignments: any[] = [];
      const aiReadinessSkillAlignments: any[] = [];
      
      // Process FIT skills
      if (fitSkills.size > 0 && role.requiredSkillScores.fitSkills) {
        Object.entries(role.requiredSkillScores.fitSkills).forEach(([skillName, requiredScore]) => {
          const candidateScore = fitSkills.get(skillName) || 0;
          const gap = requiredScore - candidateScore;
          let alignment: string;
          if (gap <= -10) alignment = 'excellent';
          else if (gap <= 0) alignment = 'good';
          else if (gap <= 15) alignment = 'fair';
          else alignment = 'poor';
          
          fitSkillAlignments.push({
            skillName,
            candidateScore,
            requiredScore,
            gap,
            alignment
          });
        });
      }
      
      // Process AI Readiness skills
      if (aiReadinessSkills.size > 0 && role.requiredSkillScores.aiReadinessSkills) {
        Object.entries(role.requiredSkillScores.aiReadinessSkills).forEach(([skillName, requiredScore]) => {
          const candidateScore = aiReadinessSkills.get(skillName) || 0;
          const gap = requiredScore - candidateScore;
          let alignment: string;
          if (gap <= -10) alignment = 'excellent';
          else if (gap <= 0) alignment = 'good';
          else if (gap <= 15) alignment = 'fair';
          else alignment = 'poor';
          
          aiReadinessSkillAlignments.push({
            skillName,
            candidateScore,
            requiredScore,
            gap,
            alignment
          });
        });
      }

      // Calculate overall fit score based on how well candidate meets requirements
      // Uses a weighted approach: exceeding requirements helps, falling short penalizes more
      const allAlignments = [...fitSkillAlignments, ...aiReadinessSkillAlignments];
      const overallFit = allAlignments.length > 0
        ? Math.round(allAlignments.reduce((sum, skill) => {
            // If candidate meets or exceeds requirement, give them full credit
            if (skill.candidateScore >= skill.requiredScore) {
              return sum + 100;
            } else {
              // If below requirement, scale proportionally (penalize more heavily)
              const percentage = (skill.candidateScore / skill.requiredScore) * 100;
              return sum + percentage;
            }
          }, 0) / allAlignments.length)
        : 0;

      // Use OpenAI to generate strengths, gaps, and recommendations
      const OpenAI = await import('openai');
      const openai = new OpenAI.default({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const prompt = `You are an expert HR consultant analyzing candidate-role fit.

JOB ROLE: ${role.name}
${role.description ? `DESCRIPTION: ${role.description}\n` : ''}

OVERALL FIT SCORE: ${overallFit}/100

FIT ASSESSMENT SKILLS (Behavioral):
${fitSkillAlignments.map(s => `- ${s.skillName}: ${s.candidateScore}/${s.requiredScore} (${s.alignment})`).join('\n')}

AI READINESS SKILLS (Technical):
${aiReadinessSkillAlignments.map(s => `- ${s.skillName}: ${s.candidateScore}/${s.requiredScore} (${s.alignment})`).join('\n')}

Based on this analysis, provide:
1. Top 3-5 strengths specific to this role (areas where candidate exceeds requirements)
2. Top 3-5 development areas/gaps (areas where candidate falls short)
3. Brief practical recommendations for hiring manager (2-3 sentences)
4. Any risk flags or concerns (if any critical gaps exist)

Format your response as JSON with this structure:
{
  "strengths": [string],
  "gaps": [string],
  "recommendations": string,
  "riskFlags": [string]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const insights = JSON.parse(completion.choices[0].message.content || "{}");

      const analysis = {
        overallFit,
        skillAlignments: allAlignments,  // Combined for backward compatibility
        fitSkillAlignments: fitSkillAlignments.length > 0 ? fitSkillAlignments : null,
        aiReadinessSkillAlignments: aiReadinessSkillAlignments.length > 0 ? aiReadinessSkillAlignments : null,
        strengths: insights.strengths || [],
        gaps: insights.gaps || [],
        recommendations: insights.recommendations || '',
        riskFlags: insights.riskFlags || []
      };

      // Cache the result
      const crypto = await import('crypto');
      const promptHash = crypto.createHash('md5').update(prompt).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await storage.createRoleAlignment({
        userId,
        jobRoleId,
        overallFit: analysis.overallFit,
        skillAlignments: analysis.skillAlignments,
        fitSkillAlignments: analysis.fitSkillAlignments || null,
        aiReadinessSkillAlignments: analysis.aiReadinessSkillAlignments || null,
        strengths: analysis.strengths,
        gaps: analysis.gaps,
        recommendations: analysis.recommendations,
        riskFlags: analysis.riskFlags || [],
        promptHash,
        expiresAt,
      });

      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing role fit:", error);
      res.status(500).json({ message: "Failed to analyze role fit: " + error.message });
    }
  });

  // Admin: Get cached role alignment
  app.get("/api/admin/role-alignment", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.id;
      const admin = await storage.getUser(adminId);
      
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const { userId, jobRoleId } = req.query;
      
      if (!userId || !jobRoleId) {
        return res.status(400).json({ message: "User ID and job role ID are required" });
      }

      const alignment = await storage.getRoleAlignment(userId as string, jobRoleId as string);
      
      if (!alignment) {
        return res.status(404).json({ message: "No cached alignment found" });
      }

      res.json(alignment);
    } catch (error) {
      console.error("Error fetching role alignment:", error);
      res.status(500).json({ message: "Failed to fetch role alignment" });
    }
  });

  // Get prompt architecture evaluations for a specific assessment result
  app.get("/api/prompt-evaluations/:resultId", isAuthenticated, async (req: any, res) => {
    try {
      const { resultId } = req.params;
      const userId = req.user.id;
      
      // Verify the assessment result belongs to the user or user is admin
      const result = await storage.getAssessmentResult(resultId);
      if (!result) {
        return res.status(404).json({ message: "Assessment result not found" });
      }
      
      const user = await storage.getUser(userId);
      if (result.userId !== userId && !user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: You can only access your own assessment results" });
      }
      
      // Get all prompt architecture evaluations for this result
      const evaluations = await storage.getEvaluationsByResult(resultId);
      res.json(evaluations);
    } catch (error) {
      console.error("Error fetching prompt evaluations:", error);
      res.status(500).json({ message: "Failed to fetch prompt evaluations" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Scoring functions
function calculateFITScores(answers: Record<string, string>): Record<string, number> {
  // Initialize skill scores
  const rawScores: Record<string, number> = {
    'High Agency': 0, 
    'Intellectual Curiosity': 0, 
    'Resilience': 0, 
    'Empathy & Ethics': 0, 
    'Growth Mindset': 0, 
    'Interpersonal Agility': 0,
  };

  // Scoring matrix - each question-option maps to 1-3 skills with 4 points each
  const scoringMatrix: Record<string, Record<string, number>> = {
    "1-A": { "High Agency": 4, "Resilience": 4, "Growth Mindset": 4 },
    "1-B": { "Intellectual Curiosity": 4, "Interpersonal Agility": 4 },
    "1-C": { "Empathy & Ethics": 4, "Growth Mindset": 4 },
    "1-D": { "High Agency": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    
    "2-A": { "High Agency": 4, "Growth Mindset": 4 },
    "2-B": { "Resilience": 4, "Empathy & Ethics": 4 },
    "2-C": { "Intellectual Curiosity": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "2-D": { "High Agency": 4, "Resilience": 4, "Interpersonal Agility": 4 },
    
    "3-A": { "Intellectual Curiosity": 4, "Growth Mindset": 4 },
    "3-B": { "High Agency": 4, "Resilience": 4, "Interpersonal Agility": 4 },
    "3-C": { "Intellectual Curiosity": 4, "Empathy & Ethics": 4 },
    "3-D": { "Resilience": 4, "Growth Mindset": 4, "Interpersonal Agility": 4 },
    
    "4-A": { "High Agency": 4, "Resilience": 4, "Growth Mindset": 4 },
    "4-B": { "Intellectual Curiosity": 4, "Growth Mindset": 4 },
    "4-C": { "Resilience": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "4-D": { "High Agency": 4, "Empathy & Ethics": 4, "Growth Mindset": 4 },
    
    "5-A": { "Intellectual Curiosity": 4, "Empathy & Ethics": 4 },
    "5-B": { "Resilience": 4, "Growth Mindset": 4, "Interpersonal Agility": 4 },
    "5-C": { "High Agency": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "5-D": { "Intellectual Curiosity": 4, "Resilience": 4, "Interpersonal Agility": 4 },
    
    "6-A": { "High Agency": 4, "Intellectual Curiosity": 4 },
    "6-B": { "Resilience": 4, "Growth Mindset": 4 },
    "6-C": { "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "6-D": { "High Agency": 4, "Resilience": 4, "Empathy & Ethics": 4 },
    
    "7-A": { "Intellectual Curiosity": 4, "Growth Mindset": 4 },
    "7-B": { "High Agency": 4, "Resilience": 4, "Growth Mindset": 4 },
    "7-C": { "Intellectual Curiosity": 4, "Growth Mindset": 4, "Interpersonal Agility": 4 },
    "7-D": { "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    
    "8-A": { "High Agency": 4, "Growth Mindset": 4, "Interpersonal Agility": 4 },
    "8-B": { "Intellectual Curiosity": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "8-C": { "High Agency": 4, "Empathy & Ethics": 4 },
    "8-D": { "Intellectual Curiosity": 4, "Resilience": 4, "Growth Mindset": 4 },
    
    "9-A": { "Resilience": 4, "Empathy & Ethics": 4 },
    "9-B": { "Intellectual Curiosity": 4, "Empathy & Ethics": 4 },
    "9-C": { "High Agency": 4, "Interpersonal Agility": 4 },
    "9-D": { "High Agency": 4, "Intellectual Curiosity": 4, "Resilience": 4 },
    
    "10-A": { "High Agency": 4, "Resilience": 4, "Growth Mindset": 4 },
    "10-B": { "Intellectual Curiosity": 4, "Growth Mindset": 4 },
    "10-C": { "Intellectual Curiosity": 4, "Resilience": 4, "Growth Mindset": 4 },
    "10-D": { "Resilience": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    
    "11-A": { "High Agency": 4, "Resilience": 4, "Interpersonal Agility": 4 },
    "11-B": { "Intellectual Curiosity": 4, "Empathy & Ethics": 4 },
    "11-C": { "High Agency": 4, "Empathy & Ethics": 4 },
    "11-D": { "Intellectual Curiosity": 4, "Growth Mindset": 4, "Interpersonal Agility": 4 },
    
    "12-A": { "Resilience": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "12-B": { "High Agency": 4, "Resilience": 4, "Empathy & Ethics": 4 },
    "12-C": { "High Agency": 4, "Growth Mindset": 4, "Interpersonal Agility": 4 },
    "12-D": { "Intellectual Curiosity": 4, "Growth Mindset": 4, "Interpersonal Agility": 4 },
    
    "13-A": { "High Agency": 4, "Intellectual Curiosity": 4 },
    "13-B": { "Intellectual Curiosity": 4, "Growth Mindset": 4 },
    "13-C": { "Resilience": 4, "Growth Mindset": 4 },
    "13-D": { "High Agency": 4, "Resilience": 4, "Growth Mindset": 4 },
    
    "14-A": { "Resilience": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "14-B": { "High Agency": 4, "Empathy & Ethics": 4 },
    "14-C": { "Intellectual Curiosity": 4, "Growth Mindset": 4, "Interpersonal Agility": 4 },
    "14-D": { "High Agency": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    
    "15-A": { "High Agency": 4, "Intellectual Curiosity": 4, "Growth Mindset": 4 },
    "15-B": { "Intellectual Curiosity": 4, "Resilience": 4, "Interpersonal Agility": 4 },
    "15-C": { "Empathy & Ethics": 4, "Growth Mindset": 4 },
    "15-D": { "High Agency": 4, "Resilience": 4, "Interpersonal Agility": 4 },
  };

  // Calculate raw scores based on answers
  Object.entries(answers).forEach(([questionId, answer]) => {
    const key = `${questionId}-${answer}`;
    const skillPoints = scoringMatrix[key];
    
    if (skillPoints) {
      Object.entries(skillPoints).forEach(([skill, points]) => {
        rawScores[skill] = (rawScores[skill] || 0) + points;
      });
    }
  });

  // Calculate maximum possible scores for each skill
  // Group scoring matrix by question number
  const questionScores: Record<number, Record<string, Record<string, number>>> = {};
  
  Object.entries(scoringMatrix).forEach(([key, skillPoints]) => {
    const [questionNum] = key.split('-');
    const q = parseInt(questionNum);
    
    if (!questionScores[q]) {
      questionScores[q] = {};
    }
    questionScores[q][key] = skillPoints;
  });

  // For each question, find the maximum points each skill can get
  const maxScores: Record<string, number> = {
    'High Agency': 0,
    'Intellectual Curiosity': 0,
    'Resilience': 0,
    'Empathy & Ethics': 0,
    'Growth Mindset': 0,
    'Interpersonal Agility': 0,
  };

  Object.values(questionScores).forEach((options) => {
    const questionMaxScores: Record<string, number> = {
      'High Agency': 0,
      'Intellectual Curiosity': 0,
      'Resilience': 0,
      'Empathy & Ethics': 0,
      'Growth Mindset': 0,
      'Interpersonal Agility': 0,
    };

    // For each option in this question, track max points per skill
    Object.values(options).forEach((skillPoints) => {
      Object.entries(skillPoints).forEach(([skill, points]) => {
        questionMaxScores[skill] = Math.max(questionMaxScores[skill], points);
      });
    });

    // Add the best possible score for each skill from this question
    Object.entries(questionMaxScores).forEach(([skill, points]) => {
      maxScores[skill] += points;
    });
  });

  // Normalize to 0-100 scale
  const normalizedScores: Record<string, number> = {};
  Object.entries(rawScores).forEach(([skill, score]) => {
    if (maxScores[skill] > 0) {
      const rawNormalized = (score / maxScores[skill]) * 100;
      // Scale to 50-100 range: 50 + (normalized * 0.5)
      normalizedScores[skill] = Math.round(50 + (rawNormalized * 0.5));
    } else {
      normalizedScores[skill] = 50; // Minimum score is 50
    }
  });

  return normalizedScores;
}

function calculateAIReadinessScores(answers: Record<string, string>): Record<string, number> {
  // Initialize skill scores with full names
  const skills: Record<string, number> = {
    'AI Literacy & Prompt Engineering': 0,
    'Technical Fundamentals': 0,
    'Data Fluency': 0,
    'Critical Thinking & Problem-Solving': 0,
    'Adaptability & Continuous Learning': 0,
    'Collaboration & Communication': 0,
    'Responsible AI & Ethical Awareness': 0,
    'Creativity & Innovation': 0,
    'Domain Expertise': 0,
  };

  // Scoring matrix - each question-option maps to skill(s) and points (4 points each)
  // Updated mapping system with skill abbreviations: AL/PE, DF, TF, DE, RAI, CT/PS, ACL, CC, CI
  const scoringMatrix: Record<string, Record<string, number>> = {
    "1-A": { "AI Literacy & Prompt Engineering": 4, "Data Fluency": 4 },
    "1-B": { "Technical Fundamentals": 4, "Domain Expertise": 4 },
    "1-C": { "Technical Fundamentals": 4, "Responsible AI & Ethical Awareness": 4, "Critical Thinking & Problem-Solving": 4 },
    "1-D": { "Adaptability & Continuous Learning": 4, "Collaboration & Communication": 4 },
    "1-E": { "AI Literacy & Prompt Engineering": 4, "Creativity & Innovation": 4 },
    "2-A": { "Technical Fundamentals": 4, "Creativity & Innovation": 4 },
    "2-B": { "Technical Fundamentals": 4, "Collaboration & Communication": 4 },
    "2-C": { "Responsible AI & Ethical Awareness": 4, "Domain Expertise": 4 },
    "2-D": { "Data Fluency": 4, "Critical Thinking & Problem-Solving": 4 },
    "2-E": { "AI Literacy & Prompt Engineering": 4, "Adaptability & Continuous Learning": 4 },
    "3-A": { "Critical Thinking & Problem-Solving": 4, "Adaptability & Continuous Learning": 4 },
    "3-B": { "Data Fluency": 4, "Creativity & Innovation": 4 },
    "3-C": { "Data Fluency": 4, "Responsible AI & Ethical Awareness": 4, "AI Literacy & Prompt Engineering": 4 },
    "3-D": { "Adaptability & Continuous Learning": 4, "Collaboration & Communication": 4, "Creativity & Innovation": 4 },
    "3-E": { "Technical Fundamentals": 4, "Critical Thinking & Problem-Solving": 4 },
    "4-A": { "Technical Fundamentals": 4, "Domain Expertise": 4 },
    "4-B": { "Adaptability & Continuous Learning": 4, "Collaboration & Communication": 4 },
    "4-C": { "Responsible AI & Ethical Awareness": 4, "Critical Thinking & Problem-Solving": 4 },
    "4-D": { "Adaptability & Continuous Learning": 4, "Domain Expertise": 4 },
    "4-E": { "AI Literacy & Prompt Engineering": 4, "Collaboration & Communication": 4 },
    "5-A": { "AI Literacy & Prompt Engineering": 4, "Data Fluency": 4 },
    "5-B": { "Technical Fundamentals": 4, "Data Fluency": 4 },
    "5-C": { "Responsible AI & Ethical Awareness": 4, "Domain Expertise": 4 },
    "5-D": { "Critical Thinking & Problem-Solving": 4, "Creativity & Innovation": 4 },
    "5-E": { "Adaptability & Continuous Learning": 4, "Collaboration & Communication": 4 },
    "6-A": { "Responsible AI & Ethical Awareness": 4, "Critical Thinking & Problem-Solving": 4, "Adaptability & Continuous Learning": 4 },
    "6-B": { "AI Literacy & Prompt Engineering": 4, "Creativity & Innovation": 4 },
    "6-C": { "Technical Fundamentals": 4, "Collaboration & Communication": 4 },
    "6-D": { "Data Fluency": 4, "Adaptability & Continuous Learning": 4 },
    "6-E": { "Domain Expertise": 4, "Data Fluency": 4 },
    "7-A": { "AI Literacy & Prompt Engineering": 4, "Data Fluency": 4 },
    "7-B": { "Technical Fundamentals": 4, "Domain Expertise": 4 },
    "7-C": { "Responsible AI & Ethical Awareness": 4, "Adaptability & Continuous Learning": 4, "Collaboration & Communication": 4 },
    "7-D": { "Critical Thinking & Problem-Solving": 4, "Adaptability & Continuous Learning": 4 },
    "7-E": { "Creativity & Innovation": 4, "Collaboration & Communication": 4 },
    "8-A": { "Critical Thinking & Problem-Solving": 4, "Adaptability & Continuous Learning": 4 },
    "8-B": { "AI Literacy & Prompt Engineering": 4, "Creativity & Innovation": 4, "Collaboration & Communication": 4 },
    "8-C": { "Technical Fundamentals": 4, "Domain Expertise": 4 },
    "8-D": { "Data Fluency": 4, "Creativity & Innovation": 4 },
    "8-E": { "Technical Fundamentals": 4, "Adaptability & Continuous Learning": 4 },
    "9-A": { "Data Fluency": 4, "Domain Expertise": 4 },
    "9-B": { "Responsible AI & Ethical Awareness": 4, "Adaptability & Continuous Learning": 4 },
    "9-C": { "AI Literacy & Prompt Engineering": 4, "Critical Thinking & Problem-Solving": 4 },
    "9-D": { "Technical Fundamentals": 4, "Creativity & Innovation": 4, "Domain Expertise": 4 },
    "9-E": { "Critical Thinking & Problem-Solving": 4, "Adaptability & Continuous Learning": 4, "Collaboration & Communication": 4 },
    "10-A": { "Domain Expertise": 4, "Critical Thinking & Problem-Solving": 4 },
    "10-B": { "AI Literacy & Prompt Engineering": 4, "Data Fluency": 4 },
    "10-C": { "Adaptability & Continuous Learning": 4, "Collaboration & Communication": 4 },
    "10-D": { "Creativity & Innovation": 4, "Responsible AI & Ethical Awareness": 4 },
    "10-E": { "Technical Fundamentals": 4, "Creativity & Innovation": 4, "Collaboration & Communication": 4 },
    "11-A": { "Responsible AI & Ethical Awareness": 4, "Domain Expertise": 4 },
    "11-B": { "Critical Thinking & Problem-Solving": 4, "Adaptability & Continuous Learning": 4 },
    "11-C": { "AI Literacy & Prompt Engineering": 4, "Technical Fundamentals": 4, "Data Fluency": 4 },
    "11-D": { "Collaboration & Communication": 4, "Adaptability & Continuous Learning": 4 },
    "11-E": { "AI Literacy & Prompt Engineering": 4, "Creativity & Innovation": 4 },
    "12-A": { "Critical Thinking & Problem-Solving": 4, "Data Fluency": 4, "AI Literacy & Prompt Engineering": 4 },
    "12-B": { "Technical Fundamentals": 4, "Domain Expertise": 4 },
    "12-C": { "Data Fluency": 4, "Adaptability & Continuous Learning": 4 },
    "12-D": { "Collaboration & Communication": 4, "AI Literacy & Prompt Engineering": 4 },
    "12-E": { "Responsible AI & Ethical Awareness": 4, "Critical Thinking & Problem-Solving": 4, "Creativity & Innovation": 4 },
    "13-A": { "Technical Fundamentals": 4, "Creativity & Innovation": 4 },
    "13-B": { "Adaptability & Continuous Learning": 4, "Data Fluency": 4 },
    "13-C": { "Collaboration & Communication": 4, "Responsible AI & Ethical Awareness": 4 },
    "13-D": { "Domain Expertise": 4, "AI Literacy & Prompt Engineering": 4 },
    "13-E": { "Critical Thinking & Problem-Solving": 4, "Adaptability & Continuous Learning": 4, "Creativity & Innovation": 4 },
    "14-A": { "Technical Fundamentals": 4, "Adaptability & Continuous Learning": 4 },
    "14-B": { "Collaboration & Communication": 4, "Creativity & Innovation": 4 },
    "14-C": { "AI Literacy & Prompt Engineering": 4, "Data Fluency": 4 },
    "14-D": { "Critical Thinking & Problem-Solving": 4, "Responsible AI & Ethical Awareness": 4 },
    "14-E": { "Technical Fundamentals": 4, "Adaptability & Continuous Learning": 4, "Domain Expertise": 4 },
    "15-A": { "Responsible AI & Ethical Awareness": 4, "Creativity & Innovation": 4 },
    "15-B": { "Data Fluency": 4, "Critical Thinking & Problem-Solving": 4 },
    "15-C": { "AI Literacy & Prompt Engineering": 4, "Adaptability & Continuous Learning": 4 },
    "15-D": { "Domain Expertise": 4, "Collaboration & Communication": 4 },
    "15-E": { "Technical Fundamentals": 4, "Data Fluency": 4, "Critical Thinking & Problem-Solving": 4 },
    "16-A": { "Technical Fundamentals": 4, "Critical Thinking & Problem-Solving": 4 },
    "16-B": { "Creativity & Innovation": 4, "Collaboration & Communication": 4 },
    "16-C": { "Adaptability & Continuous Learning": 4, "Domain Expertise": 4, "Collaboration & Communication": 4 },
    "16-D": { "Responsible AI & Ethical Awareness": 4, "Data Fluency": 4 },
    "16-E": { "AI Literacy & Prompt Engineering": 4, "Technical Fundamentals": 4 },
    "17-A": { "Domain Expertise": 4, "Critical Thinking & Problem-Solving": 4 },
    "17-B": { "Technical Fundamentals": 4, "Data Fluency": 4 },
    "17-C": { "AI Literacy & Prompt Engineering": 4, "Adaptability & Continuous Learning": 4 },
    "17-D": { "Responsible AI & Ethical Awareness": 4, "Collaboration & Communication": 4 },
    "17-E": { "Data Fluency": 4, "Creativity & Innovation": 4, "Critical Thinking & Problem-Solving": 4 },
    "18-A": { "Adaptability & Continuous Learning": 4, "Domain Expertise": 4 },
    "18-B": { "Critical Thinking & Problem-Solving": 4, "Collaboration & Communication": 4 },
    "18-C": { "Technical Fundamentals": 4, "Responsible AI & Ethical Awareness": 4 },
    "18-D": { "AI Literacy & Prompt Engineering": 4, "Creativity & Innovation": 4 },
    "18-E": { "Data Fluency": 4, "Adaptability & Continuous Learning": 4 },
    "19-A": { "Critical Thinking & Problem-Solving": 4, "Adaptability & Continuous Learning": 4 },
    "19-B": { "Technical Fundamentals": 4, "Data Fluency": 4 },
    "19-C": { "AI Literacy & Prompt Engineering": 4, "Creativity & Innovation": 4 },
    "19-D": { "Collaboration & Communication": 4, "Creativity & Innovation": 4 },
    "19-E": { "Technical Fundamentals": 4, "Data Fluency": 4, "Responsible AI & Ethical Awareness": 4 },
    "20-A": { "Responsible AI & Ethical Awareness": 4, "Domain Expertise": 4 },
    "20-B": { "Creativity & Innovation": 4, "Technical Fundamentals": 4 },
    "20-C": { "AI Literacy & Prompt Engineering": 4, "Domain Expertise": 4 },
    "20-D": { "Adaptability & Continuous Learning": 4, "Collaboration & Communication": 4 },
    "20-E": { "Data Fluency": 4, "Critical Thinking & Problem-Solving": 4, "AI Literacy & Prompt Engineering": 4 },
    "21-A": { "Critical Thinking & Problem-Solving": 4, "Domain Expertise": 4 },
    "21-B": { "Technical Fundamentals": 4, "Data Fluency": 4 },
    "21-C": { "Responsible AI & Ethical Awareness": 4, "Data Fluency": 4 },
    "21-D": { "Adaptability & Continuous Learning": 4, "Creativity & Innovation": 4 },
    "21-E": { "AI Literacy & Prompt Engineering": 4, "Collaboration & Communication": 4, "Technical Fundamentals": 4 },
  };

  // Calculate raw scores based on answers
  Object.entries(answers).forEach(([questionId, answer]) => {
    const key = `${questionId}-${answer}`;
    const skillPoints = scoringMatrix[key];
    
    if (skillPoints) {
      Object.entries(skillPoints).forEach(([skill, points]) => {
        skills[skill] += points;
      });
    }
  });

  // Calculate maximum possible scores for each skill
  // Group scoring matrix by question number
  const questionScores: Record<number, Record<string, Record<string, number>>> = {};
  
  Object.entries(scoringMatrix).forEach(([key, skillPoints]) => {
    const [questionNum] = key.split('-');
    const q = parseInt(questionNum);
    
    if (!questionScores[q]) {
      questionScores[q] = {};
    }
    questionScores[q][key] = skillPoints;
  });

  // For each question, find the maximum points each skill can get
  const maxScores: Record<string, number> = {
    'AI Literacy & Prompt Engineering': 0,
    'Technical Fundamentals': 0,
    'Data Fluency': 0,
    'Critical Thinking & Problem-Solving': 0,
    'Adaptability & Continuous Learning': 0,
    'Responsible AI & Ethical Awareness': 0,
    'Domain Expertise': 0,
    'Creativity & Innovation': 0,
    'Collaboration & Communication': 0,
  };

  Object.values(questionScores).forEach((options) => {
    const questionMaxScores: Record<string, number> = {
      'AI Literacy & Prompt Engineering': 0,
      'Technical Fundamentals': 0,
      'Data Fluency': 0,
      'Critical Thinking & Problem-Solving': 0,
      'Adaptability & Continuous Learning': 0,
      'Responsible AI & Ethical Awareness': 0,
      'Domain Expertise': 0,
      'Creativity & Innovation': 0,
      'Collaboration & Communication': 0,
    };

    // For each option in this question, track max points per skill
    Object.values(options).forEach((skillPoints) => {
      Object.entries(skillPoints).forEach(([skill, points]) => {
        questionMaxScores[skill] = Math.max(questionMaxScores[skill], points);
      });
    });

    // Add the best possible score for each skill from this question
    Object.entries(questionMaxScores).forEach(([skill, points]) => {
      maxScores[skill] += points;
    });
  });

  // Normalize to 0-100 scale with division-by-zero guard
  const normalizedScores: Record<string, number> = {};
  Object.entries(skills).forEach(([skill, score]) => {
    if (maxScores[skill] > 0) {
      const rawNormalized = (score / maxScores[skill]) * 100;
      // Scale to 50-100 range: 50 + (normalized * 0.5)
      normalizedScores[skill] = Math.round(50 + (rawNormalized * 0.5));
    } else {
      normalizedScores[skill] = 50; // Minimum score is 50
    }
  });

  return normalizedScores;
}

function calculateAIQScores(answers: Record<string, string>): Record<string, number> {
  // Correct answers based on AIQ assessment
  const correctAnswers: Record<string, string> = {
    '1': 'A', // Data Privacy: Delete combined dataset
    '2': 'A', // Bias: Re-engineer to remove biased features
    '3': 'C', // Transparency: Deploy XAI technique
    '4': 'B', // Safety: Hard-code emergency vehicle priority
  };

  let score = 0;
  let correctCount = 0;
  
  Object.entries(answers).forEach(([question, answer]) => {
    if (correctAnswers[question] === answer) {
      score += 25;
      correctCount++;
    }
  });

  // 70% or above is pass (3 or 4 correct = pass)
  // Below 70% is needs improvement (0-2 correct = needs improvement)
  return { 
    'Algorithmic Integrity': score
  };
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
1. **Clarity (20 points)**: Is the prompt clear, unambiguous, and easy to understand?
2. **Structure (20 points)**: Is the prompt well-organized with logical flow?
3. **Context Relevance (20 points)**: Does the prompt provide necessary context and constraints?
4. **Creativity (20 points)**: Does the prompt encourage thoughtful, creative responses?
5. **Iterative Improvement (20 points)**: Does the prompt include mechanisms for refinement or building upon concepts?

**Instructions**:
- Provide scores for each criterion (out of 20 points each)
- Be fair but rigorous in your evaluation
- Consider the difficulty level when scoring
- Provide constructive feedback

**Response Format** (MUST follow exactly):
{
  "clarity": <score out of 20>,
  "structure": <score out of 20>,
  "contextRelevance": <score out of 20>,
  "creativity": <score out of 20>,
  "iterativeImprovement": <score out of 20>,
  "feedback": "<brief constructive feedback>",
  "totalScore": <sum of all scores>
}`;

  try {
    console.log(`[Prompt Eval] Evaluating Level ${level} prompt (length: ${userPrompt.length} chars)`);
    
    // Retry OpenAI call with exponential backoff
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
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
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    
    console.log(`[Prompt Eval] Level ${level} evaluated successfully - Total: ${result.totalScore || 0}`);
    
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
  } catch (error: any) {
    console.error(`[Prompt Eval ERROR] Level ${level} failed:`, {
      error: error.message,
      code: error.code,
      type: error.type,
      status: error.status,
    });
    
    // Provide more specific error messages
    if (error.code === 'insufficient_quota' || error.status === 429) {
      throw new Error('OpenAI API quota exceeded');
    }
    if (error.code === 'invalid_api_key') {
      throw new Error('OpenAI API key is invalid');
    }
    if (error.message?.includes('timeout')) {
      throw new Error('OpenAI API request timed out');
    }
    
    throw new Error(`Failed to evaluate prompt: ${error.message || 'Unknown error'}`);
  }
}

// Calculate Prompt Architecture scores by evaluating all prompts
async function calculatePromptArchitectureScores(
  answers: Record<string, string>,
  resultId: string
): Promise<{
  scores: Record<string, number>;
  totalScore: number;
  evaluations: any[];
}> {
  console.log(`[Prompt Arch] Starting evaluation for result ${resultId} with ${Object.keys(answers).length} prompts`);
  
  const levelDescriptions: Record<string, string> = {
    "1": "Write a prompt to ask for the capital city of France and 3 interesting facts about it.",
    "2": "List the top 5 programming languages for web development in 2024, formatted as a numbered list with descriptions.",
    "3": "Explain quantum computing as a senior physics professor to undergraduate students.",
    "4": "Debug a Python function for finding duplicates with 4 steps: analyze, identify bug, explain, correct.",
    "5": "Generate a 100-word eco-friendly water bottle description with 3 benefits for millennials.",
    "6": "Draft, evaluate, and improve a job offer decline email.",
    "7": "Design a comprehensive content moderation system covering multiple domains.",
  };

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

  // Step 1: Evaluate all prompts with GPT (external API calls - cannot be rolled back)
  for (const [levelKey, userPrompt] of Object.entries(answers)) {
    // Extract numeric level from key (e.g., "level-1" -> 1)
    const levelMatch = levelKey.match(/level-?(\d+)/);
    const levelNum = levelMatch ? parseInt(levelMatch[1]) : 1;
    
    const taskDesc = levelDescriptions[levelNum.toString()] || `Level ${levelNum} task`;
    
    try {
      const evaluation = await evaluatePromptWithGPT(userPrompt, levelNum, taskDesc);
      
      evaluationsWithData.push({
        level: levelNum,
        userPrompt,
        evaluation,
      });

      clarityTotal += evaluation.clarity;
      structureTotal += evaluation.structure;
      contextTotal += evaluation.contextRelevance;
      creativityTotal += evaluation.creativity;
      iterativeTotal += evaluation.iterativeImprovement;
    } catch (error: any) {
      console.error(`[Prompt Arch ERROR] Failed to evaluate level ${levelNum}:`, error.message);
      throw error; // Rethrow to stop processing
    }
  }
  
  console.log(`[Prompt Arch] All ${evaluationsWithData.length} prompts evaluated successfully`);

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

  // Build evaluations array for response
  const evaluations = evaluationsWithData.map(({ level, evaluation }) => ({
    level,
    ...evaluation,
  }));

  // Step 2: Store all evaluations AND update assessment result in database (transactional safety)
  // If any operation fails, all will be rolled back in the database
  try {
    await db.transaction(async (tx) => {
      // Delete any existing evaluations for this result (idempotency for retries)
      await tx.delete(promptArchitectureEvaluations)
        .where(eq(promptArchitectureEvaluations.resultId, resultId));

      // Insert all evaluations
      for (const { level, userPrompt, evaluation } of evaluationsWithData) {
        await tx.insert(promptArchitectureEvaluations).values({
          resultId: resultId,
          level: level,
          userPrompt: userPrompt,
          aiResponse: null,
          evaluationScores: {
            clarity: evaluation.clarity,
            structure: evaluation.structure,
            contextRelevance: evaluation.contextRelevance,
            creativity: evaluation.creativity,
            iterativeImprovement: evaluation.iterativeImprovement,
          },
          totalScore: evaluation.totalScore,
          feedback: evaluation.feedback,
          status: 'completed',
          evaluatedAt: new Date(),
        });
      }
      
      // Update assessment result with scores and mark as completed
      await tx.update(assessmentResults)
        .set({
          answers,
          scores,
          totalScore,
          evaluations: evaluations,
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(assessmentResults.id, resultId));
    });
  } catch (error) {
    console.error("Error storing prompt evaluations in database:", error);
    throw new Error("Failed to store prompt evaluations. Please try again.");
  }

  return { scores, totalScore, evaluations };
}
