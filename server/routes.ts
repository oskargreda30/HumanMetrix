import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, populateUser } from "./auth";
import { ASSESSMENT_TYPES, ASSESSMENT_PRICES, BASE_FEE, normalizeAssessmentId, insertInvitationSchema } from "@shared/schema";
import { getPPPAdjustedPriceInPence, getPricingTier, getStripeCurrencyCode, convertToStripeCurrencyAmount, COUNTRY_CURRENCY_MAP } from "@shared/currencies";
import { db } from "./db";
import { purchaseItems, assessmentResults, purchases, promptArchitectureEvaluations, goldenSetResults, goldenSetPrompts } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { sendInvitationEmail, sendContactFormEmail, sendWelcomeEmailWithPassword, sendPaymentReceiptEmail } from "./email";
import { generateTemporaryPassword } from "./passwordUtils";
import { getQueueStats } from "./queues";
import { getPoolStats } from "./db";
import { getExchangeRates, initExchangeRates } from "./exchange-rates";
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

// Initialize Stripe promotion codes
async function initializeStripeCoupons() {
  const couponsToCreate = [
    {
      id: 'FREE_100_OFF',
      code: 'FREE',
      percent_off: 100,
      duration: 'forever' as const,
      name: 'Free Access (100% off)'
    },
    {
      id: 'COMPOFF_15_OFF',
      code: 'COMPOFF',
      amount_off: 1500, // £15 in pence
      currency: 'gbp',
      duration: 'once' as const, // Fixed amount coupons must use 'once'
      name: 'Company Offer (£15 off)'
    },
    {
      id: '20OFFPRICE_20_OFF',
      code: '20OFFPRICE',
      percent_off: 20,
      duration: 'forever' as const,
      name: '20% Discount'
    }
  ];

  for (const couponData of couponsToCreate) {
    try {
      // Check if coupon already exists
      let couponExists = false;
      try {
        await stripe.coupons.retrieve(couponData.id);
        couponExists = true;
        console.log(`[Stripe] Coupon ${couponData.id} already exists`);
      } catch (e: any) {
        if (e.code === 'resource_missing') {
          // Create the coupon
          const couponParams: Stripe.CouponCreateParams = {
            id: couponData.id,
            name: couponData.name,
            duration: couponData.duration,
          };
          
          if (couponData.percent_off) {
            couponParams.percent_off = couponData.percent_off;
          } else if (couponData.amount_off) {
            couponParams.amount_off = couponData.amount_off;
            couponParams.currency = couponData.currency;
          }
          
          await stripe.coupons.create(couponParams);
          couponExists = true;
          console.log(`[Stripe] Created coupon: ${couponData.id}`);
        } else {
          throw e;
        }
      }

      if (!couponExists) continue;

      // Check if promotion code already exists by listing all promo codes
      let codeExists = false;
      try {
        const existingPromoCodes = await stripe.promotionCodes.list({ limit: 100 });
        codeExists = existingPromoCodes.data.some(
          pc => pc.code === couponData.code && pc.coupon && 
          (typeof pc.coupon === 'string' ? pc.coupon === couponData.id : pc.coupon.id === couponData.id)
        );
      } catch (e) {
        console.log(`[Stripe] Could not list promotion codes`);
      }

      if (!codeExists) {
        // Create the promotion code using raw fetch to Stripe API
        const promoResponse = await fetch('https://api.stripe.com/v1/promotion_codes', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `coupon=${couponData.id}&code=${couponData.code}`,
        });
        
        if (promoResponse.ok) {
          console.log(`[Stripe] Created promotion code: ${couponData.code}`);
        } else {
          const errorData = await promoResponse.json();
          console.error(`[Stripe] Failed to create promo code ${couponData.code}:`, errorData.error?.message);
        }
      } else {
        console.log(`[Stripe] Promotion code ${couponData.code} already exists`);
      }
    } catch (error: any) {
      console.error(`[Stripe] Error setting up coupon ${couponData.code}:`, error.message);
    }
  }
}

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

// VPN/Proxy detection by organization name
// Common VPN providers, hosting companies, and datacenter operators
function detectVPNFromOrg(orgLower: string): boolean {
  const vpnKeywords = [
    'vpn', 'proxy', 'private internet', 'nordvpn', 'expressvpn', 'surfshark',
    'mullvad', 'protonvpn', 'cyberghost', 'tunnelbear', 'windscribe', 'ipvanish',
    'hide.me', 'purevpn', 'privatevpn', 'zenmate', 'hotspot shield',
    'hosting', 'server', 'datacenter', 'data center', 'cloud', 'vps',
    'digitalocean', 'linode', 'vultr', 'hetzner', 'ovh', 'aws', 'amazon',
    'google cloud', 'microsoft azure', 'azure', 'alibaba', 'tencent',
    'colocation', 'colo', 'dedicated', 'virtual private', 'anonymous',
    'tor', 'relay', 'exit node'
  ];
  
  return vpnKeywords.some(keyword => orgLower.includes(keyword));
}

// VPN/Proxy detection by ASN (Autonomous System Number)
// Known datacenter and VPN provider ASNs
function detectVPNFromASN(asn: string | undefined): boolean {
  if (!asn) return false;
  
  // Common datacenter/VPN ASNs (format: AS12345 or just 12345)
  const vpnASNs = [
    '14061', // DigitalOcean
    '16276', // OVH
    '24940', // Hetzner
    '20473', // Vultr
    '63949', // Linode
    '16509', // Amazon AWS
    '15169', // Google
    '8075',  // Microsoft Azure
    '13335', // Cloudflare
    '9009',  // M247 (VPN provider hosting)
    '60068', // Datacamp (VPN/Proxy)
    '202425', // Private Internet Access
    '136787', // NordVPN
  ];
  
  // Extract numeric part of ASN
  const asnNumber = asn.replace(/^AS/i, '');
  return vpnASNs.includes(asnNumber);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup simple auth
  await setupAuth(app);

  // Register partner API routes (for B2B integrations)
  const { registerPartnerRoutes } = await import("./partner-routes");
  registerPartnerRoutes(app);

  // Initialize Stripe discount codes (runs in background)
  initializeStripeCoupons().catch(err => {
    console.error('[Stripe] Failed to initialize coupons:', err.message);
  });

  // Version check endpoint
  app.get("/api/version", (req, res) => {
    res.json({ 
      version: "2.0-normalized-scoring",
      deployed: new Date().toISOString(),
      scoringLogic: "normalized"
    });
  });

  // Geolocation cache (1-minute TTL, keyed by IP) - shorter TTL for faster VPN detection updates
  const geoCache = new Map<string, { data: any; expires: number }>();
  const GEO_CACHE_TTL = 60 * 1000; // 1 minute

  // Geolocation endpoint for currency detection
  app.get("/api/geolocation", async (req, res) => {
    // Prevent browser caching - geolocation must always be fresh for accurate VPN detection
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    try {
      // Get client IP - handle proxies
      const forwardedFor = req.headers['x-forwarded-for'];
      const clientIP = typeof forwardedFor === 'string' 
        ? forwardedFor.split(',')[0].trim() 
        : req.ip || req.socket.remoteAddress || '';
      
      // Skip geolocation for localhost/private IPs
      const isPrivateIP = clientIP === '127.0.0.1' || 
                          clientIP === '::1' || 
                          clientIP.startsWith('192.168.') ||
                          clientIP.startsWith('10.') ||
                          clientIP.startsWith('172.') ||
                          !clientIP;
      
      if (isPrivateIP) {
        // Default to GB for development - no VPN assumed for private IPs
        return res.json({ 
          countryCode: 'GB',
          country: 'United Kingdom',
          detected: false,
          source: 'default',
          isVPN: false,
        });
      }

      // Check cache first
      const cached = geoCache.get(clientIP);
      if (cached && cached.expires > Date.now()) {
        return res.json({ ...cached.data, source: 'cache' });
      }

      // Use ip-api.com (provides org/ISP data for VPN detection, 45 req/min limit)
      // We cache for 5 minutes so effective rate is much lower
      const response = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,message,countryCode,country,isp,org,as,proxy,hosting`);
      
      if (!response.ok) {
        console.error(`[Geolocation] ip-api.com returned status ${response.status} for IP ${clientIP}`);
        return res.json({
          countryCode: 'GB',
          country: 'United Kingdom',
          detected: false,
          source: 'service_error',
          isVPN: false,
        });
      }
      
      const data = await response.json();
      
      if (data.status === 'success' && data.countryCode) {
        // ip-api.com provides proxy/hosting detection and org data
        const orgLower = (data.org || data.isp || '').toLowerCase();
        const isVPN = data.proxy === true || 
                      data.hosting === true ||
                      detectVPNFromOrg(orgLower) || 
                      detectVPNFromASN(data.as) ||
                      data.countryCode === 'A1' || // Anonymous proxy
                      data.countryCode === 'A2';   // Satellite provider
        
        console.log(`[Geolocation] IP ${clientIP}: country=${data.countryCode}, org="${data.org}", isp="${data.isp}", proxy=${data.proxy}, hosting=${data.hosting}, isVPN=${isVPN}`);
        
        const result = {
          countryCode: data.countryCode,
          country: data.country,
          detected: true,
          source: 'ip-api',
          isVPN,
        };
        
        // Cache the result
        geoCache.set(clientIP, { data: result, expires: Date.now() + GEO_CACHE_TTL });
        
        return res.json(result);
      } else {
        console.error(`[Geolocation] ip-api.com error: ${data.message}`);
        // Fallback to GB if geolocation fails
        return res.json({
          countryCode: 'GB',
          country: 'United Kingdom',
          detected: false,
          source: 'fallback',
          isVPN: false,
        });
      }
    } catch (error: any) {
      console.error('[Geolocation] Error:', error.message);
      // Network/timeout errors - don't assume VPN, just fallback gracefully
      res.json({
        countryCode: 'GB',
        country: 'United Kingdom',
        detected: false,
        source: 'error',
        isVPN: false, // Network error, not a VPN indicator
      });
    }
  });

  // Exchange rates endpoint - provides live exchange rates for the frontend
  app.get("/api/exchange-rates", async (req, res) => {
    try {
      const rates = await getExchangeRates();
      res.json(rates);
    } catch (error: any) {
      console.error('[Exchange Rates] Error fetching rates:', error.message);
      res.status(500).json({ error: 'Failed to fetch exchange rates' });
    }
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

  // Marketing opt-in endpoint (public - no auth required)
  app.post("/api/marketing-optin", async (req, res) => {
    try {
      const { email, source } = req.body;
      
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ message: "Valid email address is required" });
      }

      const ip = req.ip || req.socket.remoteAddress || undefined;
      const userAgent = req.headers['user-agent'] || undefined;

      // Save the opt-in to database
      await storage.createMarketingOptin({
        email: email.toLowerCase().trim(),
        source: source || 'job_ad',
        ipAddress: ip,
        userAgent: userAgent,
        consentGiven: true,
      });

      res.json({ 
        success: true, 
        message: "Thank you for subscribing!" 
      });
    } catch (error: any) {
      console.error("Marketing opt-in error:", error);
      res.status(500).json({ 
        message: "Failed to subscribe. Please try again later." 
      });
    }
  });

  // Admin endpoint to get marketing opt-ins list
  app.get("/api/admin/marketing-optins", isAuthenticated, async (req: any, res) => {
    try {
      const hasAdminAccess = req.user?.role === 'super_admin' || req.user?.role === 'admin';
      if (!hasAdminAccess) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const optins = await storage.getMarketingOptins();
      res.json(optins);
    } catch (error: any) {
      console.error("Error fetching marketing opt-ins:", error);
      res.status(500).json({ message: "Failed to fetch opt-ins" });
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
        
        const assessmentNames: Record<string, string> = {
          "fit": "FIT Assessment",
          "ai_readiness": "AI Readiness Assessment",
          "prompt_architecture": "Prompt Architecture Assessment",
          "aiq": "Algorithmic Integrity Quotient (AIQ)",
        };
        
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
        
        // Send receipt email to logged-in user
        const user = await storage.getUser(userId);
        if (user) {
          const assessmentDisplayNames = assessmentList.map((id: string) => {
            const normalized = normalizeAssessmentId(id);
            return assessmentNames[normalized] || normalized;
          });
          
          const userName = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user.firstName || user.email;
          
          await sendPaymentReceiptEmail(
            user.email,
            userName,
            assessmentDisplayNames,
            session.amount_total || 0,
            session.id
          );
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
        
        const assessmentNames: Record<string, string> = {
          "fit": "FIT Assessment",
          "ai_readiness": "AI Readiness Assessment",
          "prompt_architecture": "Prompt Architecture Assessment",
          "aiq": "Algorithmic Integrity Quotient (AIQ)",
        };
        
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
        
        // Send receipt email to existing user
        const assessmentDisplayNames = assessmentList.map((id: string) => {
          const normalized = normalizeAssessmentId(id);
          return assessmentNames[normalized] || normalized;
        });
        
        const existingUserName = existingUser.firstName && existingUser.lastName
          ? `${existingUser.firstName} ${existingUser.lastName}`
          : existingUser.firstName || `${firstName} ${lastName}`;
        
        await sendPaymentReceiptEmail(
          existingUser.email,
          existingUserName,
          assessmentDisplayNames,
          session.amount_total || 0,
          session.id
        );
        
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
      
      const assessmentNames: Record<string, string> = {
        "fit": "FIT Assessment",
        "ai_readiness": "AI Readiness Assessment",
        "prompt_architecture": "Prompt Architecture Assessment",
        "aiq": "Algorithmic Integrity Quotient (AIQ)",
      };
      
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
      
      // Send payment receipt email
      try {
        const assessmentDisplayNames = assessmentList.map((id: string) => {
          const normalized = normalizeAssessmentId(id);
          return assessmentNames[normalized] || normalized;
        });
        
        await sendPaymentReceiptEmail(
          customerEmail,
          `${firstName} ${lastName}`,
          assessmentDisplayNames,
          session.amount_total || 0,
          session.id
        );
        console.log(`✓ Payment receipt sent successfully to ${customerEmail}`);
      } catch (emailError: any) {
        console.error(`✗ Failed to send payment receipt to ${customerEmail}:`, emailError);
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
  // Submit user reference for FREE discount code
  app.post("/api/submit-reference", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { referenceText } = req.body;
      
      if (!referenceText || typeof referenceText !== 'string') {
        return res.status(400).json({ message: "Reference text is required" });
      }
      
      const wordCount = referenceText.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
      
      if (wordCount < 50) {
        return res.status(400).json({ message: "Reference must be at least 50 words" });
      }
      
      // Check if user already submitted a reference
      const existing = await storage.getUserReference(userId);
      if (existing) {
        return res.status(400).json({ message: "You have already submitted a reference" });
      }
      
      // Create reference
      const reference = await storage.createUserReference({
        userId,
        referenceText,
        wordCount,
      });
      
      res.json({ success: true, reference });
    } catch (error) {
      console.error("Error submitting reference:", error);
      res.status(500).json({ message: "Failed to submit reference" });
    }
  });
  
  // Check reference status
  app.get("/api/reference-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const reference = await storage.getUserReference(userId);
      
      res.json({ 
        hasSubmitted: !!reference,
        reference: reference || null 
      });
    } catch (error) {
      console.error("Error checking reference status:", error);
      res.status(500).json({ message: "Failed to check reference status" });
    }
  });
  
  app.post("/api/unlock-results", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { discountCode, purchaseId, countryCode } = req.body;
      
      // Get pricing tier and PPP multiplier for the user's country
      const userCountry = countryCode || 'GB';
      const pricingTier = getPricingTier(userCountry);
      
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
      // Apply PPP adjustment for user's country
      const adjustedBaseFee = getPPPAdjustedPriceInPence(BASE_FEE, userCountry);
      const assessmentsTotal = requiredAssessmentTypes.reduce((sum, type) => {
        const normalizedType = normalizeAssessmentId(type);
        const originalPrice = ASSESSMENT_PRICES[normalizedType] || 0;
        return sum + getPPPAdjustedPriceInPence(originalPrice, userCountry);
      }, 0);
      const priceInPence = adjustedBaseFee + assessmentsTotal;
      const totalAssessmentCount = requiredAssessmentTypes.length;
      
      // Apply discount codes
      let finalPriceInPence = priceInPence;
      let discountApplied = false;
      let discountDescription = '';
      const normalizedCode = discountCode ? discountCode.trim().toUpperCase() : '';
      
      // Check if discount code is "FREE" (case-insensitive) - 100% off
      if (normalizedCode === "FREE") {
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
      
      // COMPOFF - £15 off
      if (normalizedCode === "COMPOFF") {
        const discountAmount = 1500; // £15 in pence
        finalPriceInPence = Math.max(0, priceInPence - discountAmount);
        discountApplied = true;
        discountDescription = ' (£15 discount applied)';
        
        // If discount makes it free, grant access immediately
        if (finalPriceInPence === 0) {
          await storage.updatePurchase(unpaidPurchase.id.toString(), {
            resultsAccessPaid: true,
          });
          
          return res.json({ 
            success: true, 
            message: "Results unlocked successfully with COMPOFF discount",
            free: true 
          });
        }
      }
      
      // 20OFFPRICE - 20% off
      if (normalizedCode === "20OFFPRICE") {
        const discountAmount = Math.round(priceInPence * 0.20);
        finalPriceInPence = priceInPence - discountAmount;
        discountApplied = true;
        discountDescription = ' (20% discount applied)';
        
        // If discount makes it free, grant access immediately
        if (finalPriceInPence === 0) {
          await storage.updatePurchase(unpaidPurchase.id.toString(), {
            resultsAccessPaid: true,
          });
          
          return res.json({ 
            success: true, 
            message: "Results unlocked successfully with 20% discount",
            free: true 
          });
        }
      }
      
      // Otherwise, create Stripe checkout session for results payment with PPP-adjusted price
      // Charge in user's local currency
      const stripeCurrency = getStripeCurrencyCode(userCountry);
      const currencyCode = COUNTRY_CURRENCY_MAP[userCountry.toUpperCase()] || 'GBP';
      const stripeAmount = convertToStripeCurrencyAmount(finalPriceInPence, currencyCode, userCountry);
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: stripeCurrency,
              product_data: {
                name: 'Assessment Results Access',
                description: `Unlock your assessment results and download your professional PDF report (${totalAssessmentCount} assessment${totalAssessmentCount > 1 ? 's' : ''})${discountDescription}`,
              },
              unit_amount: stripeAmount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        allow_promotion_codes: true,
        success_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : req.protocol + '://' + req.hostname}/payment-callback?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : req.protocol + '://' + req.hostname}/payment-cancel-callback`,
        metadata: {
          userId: userId.toString(),
          purchaseId: unpaidPurchase.id.toString(),
          isResultsPayment: 'true',
          countryCode: userCountry,
          pricingTier,
          localCurrency: currencyCode,
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
      
      // Send payment receipt email (including for FREE orders where amount_total is 0)
      try {
        const user = await storage.getUser(userId);
        const purchaseItems = await storage.getPurchaseItems(purchaseId);
        const assessmentTypes = purchaseItems.map((item: any) => item.assessmentType);
        
        if (user) {
          const amount = session.amount_total ?? 0; // Handle 0 for FREE orders
          await sendPaymentReceiptEmail(
            user.email,
            user.firstName || 'Customer',
            assessmentTypes,
            amount,
            sessionId
          );
          console.log(`[Payment Callback] ✓ Receipt email sent to ${user.email} (amount: £${(amount / 100).toFixed(2)})`);
        }
      } catch (emailError) {
        console.error(`[Payment Callback] Failed to send receipt email:`, emailError);
        // Don't fail the payment if email fails
      }
      
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
        role: user.role,
        organizationId: user.organizationId,
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
      const { assessmentIds, customerEmail, customerName, firstName, lastName, countryCode } = req.body;
      
      if (!assessmentIds || !Array.isArray(assessmentIds) || assessmentIds.length === 0) {
        return res.status(400).json({ message: "Invalid assessment selection" });
      }

      if (!customerEmail || !customerName || !firstName || !lastName) {
        return res.status(400).json({ message: "Customer details required" });
      }

      // Check if user already exists - they should log in instead
      const existingUser = await storage.getUserByEmail(customerEmail);
      if (existingUser) {
        return res.status(400).json({ 
          message: "An account with this email already exists. Please log in instead." 
        });
      }

      // Get pricing tier and apply PPP adjustment
      const userCountry = countryCode || 'GB';
      const pricingTier = getPricingTier(userCountry);
      
      // Get user's local currency for Stripe checkout
      const stripeCurrency = getStripeCurrencyCode(userCountry);
      const localCurrencyCode = COUNTRY_CURRENCY_MAP[userCountry.toUpperCase()] || 'GBP';
      
      // Convert base fee to local currency with PPP adjustment
      const baseFeeInLocalCurrency = convertToStripeCurrencyAmount(BASE_FEE, localCurrencyCode, userCountry);

      // Create line items for Stripe with PPP-adjusted prices in local currency
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        {
          price_data: {
            currency: stripeCurrency,
            product_data: {
              name: "Base Computation Fee",
              description: "One-time platform access fee",
            },
            unit_amount: baseFeeInLocalCurrency,
          },
          quantity: 1,
        },
      ];

      // Add assessment line items
      const assessmentNames: Record<string, string> = {
        "fit": "FIT Assessment (15Q)",
        "ai_readiness": "AI Readiness Assessment (21Q)",
        "prompt_architecture": "Prompt Architecture Assessment (7 Levels)",
        "aiq": "Algorithmic Integrity Quotient (AIQ) (8Q)",
      };

      for (const assessmentId of assessmentIds) {
        const normalizedId = normalizeAssessmentId(assessmentId);
        if (!ASSESSMENT_PRICES[normalizedId]) {
          return res.status(400).json({ message: `Invalid assessment: ${assessmentId}` });
        }
        
        // Apply PPP pricing adjustment and convert to local currency
        const adjustedPrice = convertToStripeCurrencyAmount(ASSESSMENT_PRICES[normalizedId], localCurrencyCode, userCountry);
        
        lineItems.push({
          price_data: {
            currency: stripeCurrency,
            product_data: {
              name: assessmentNames[normalizedId] || normalizedId,
            },
            unit_amount: adjustedPrice,
          },
          quantity: 1,
        });
      }

      // Create checkout session with local currency
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
          countryCode: userCountry,
          pricingTier,
          localCurrency: localCurrencyCode,
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
        role: 'candidate',
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
      const { assessmentIds, countryCode } = req.body;
      
      if (!assessmentIds || !Array.isArray(assessmentIds) || assessmentIds.length === 0) {
        return res.status(400).json({ message: "Invalid assessment selection" });
      }

      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get pricing tier and apply PPP adjustment
      const userCountry = countryCode || 'GB';
      const pricingTier = getPricingTier(userCountry);
      
      // Get user's local currency for Stripe checkout
      const stripeCurrency = getStripeCurrencyCode(userCountry);
      const localCurrencyCode = COUNTRY_CURRENCY_MAP[userCountry.toUpperCase()] || 'GBP';
      
      // Convert base fee to local currency with PPP adjustment
      const baseFeeInLocalCurrency = convertToStripeCurrencyAmount(BASE_FEE, localCurrencyCode, userCountry);

      // Create line items for Stripe with PPP-adjusted prices in local currency
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        {
          price_data: {
            currency: stripeCurrency,
            product_data: {
              name: "Base Computation Fee",
              description: "One-time platform access fee",
            },
            unit_amount: baseFeeInLocalCurrency,
          },
          quantity: 1,
        },
      ];

      // Add assessment line items
      const assessmentNames: Record<string, string> = {
        "fit": "FIT Assessment (15Q)",
        "ai_readiness": "AI Readiness Assessment (21Q)",
        "prompt_architecture": "Prompt Architecture Assessment (7 Levels)",
        "aiq": "Algorithmic Integrity Quotient (AIQ) (8Q)",
      };

      for (const assessmentId of assessmentIds) {
        const normalizedId = normalizeAssessmentId(assessmentId);
        if (!ASSESSMENT_PRICES[normalizedId]) {
          return res.status(400).json({ message: `Invalid assessment: ${assessmentId}` });
        }
        
        // Apply PPP pricing adjustment and convert to local currency
        const adjustedPrice = convertToStripeCurrencyAmount(ASSESSMENT_PRICES[normalizedId], localCurrencyCode, userCountry);
        
        lineItems.push({
          price_data: {
            currency: stripeCurrency,
            product_data: {
              name: assessmentNames[normalizedId] || normalizedId,
            },
            unit_amount: adjustedPrice,
          },
          quantity: 1,
        });
      }

      // Create checkout session with local currency
      const session = await stripe.checkout.sessions.create({
        customer_email: user.email,
        line_items: lineItems,
        mode: "payment",
        success_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : req.protocol + '://' + req.hostname}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : req.protocol + '://' + req.hostname}/purchase`,
        metadata: {
          userId: userId,
          assessmentIds: JSON.stringify(assessmentIds),
          countryCode: userCountry,
          pricingTier,
          localCurrency: localCurrencyCode,
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
      
      // Get all purchase items in bulk (single query instead of N queries)
      const purchaseIds = purchases.map(p => p.id);
      const purchaseItemsMap = await storage.getPurchaseItemsBulk(purchaseIds);
      
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
            // Normalize assessment type for consistent comparison
            const normalizedType = normalizeAssessmentId(item.assessmentType);
            
            // Track all purchased assessment types (regardless of completion)
            purchasedAssessmentTypes.add(normalizedType);
            
            const existing = await storage.getResultByPurchaseItem(item.id);
            
            if (!existing || existing.status !== 'completed') {
              // Use purchase-item-specific key to allow same type from different purchases (multiple testing series)
              const purchaseItemKey = `purchase::${item.id}`;
              if (!addedAssessmentTypes.has(purchaseItemKey)) {
                availableAssessments.push({
                  purchaseItemId: item.id,
                  assessmentType: item.assessmentType,
                  status: existing?.status || 'ready', // Use result status if exists, otherwise 'ready'
                  source: 'purchase',
                  purchaseId: purchase.id, // Include purchase ID for grouping
                });
                addedAssessmentTypes.add(purchaseItemKey);
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
              // Normalize assessment type for consistent comparison
              const normalizedType = normalizeAssessmentId(assessmentType);
              
              // Check if this SPECIFIC INVITATION's assessment was already completed
              // (Not checking ALL results - allow multiple test series)
              const existingResult = await storage.getResultByInvitationAndType(invitation.id, normalizedType);
              const alreadyCompleted = existingResult?.status === 'completed';
              
              if (!alreadyCompleted) {
                // Only add if we haven't already added this assessment type from THIS invitation
                // Use invitation-specific key to allow same type from different invitations
                const invitationTypeKey = `${invitation.id}::${normalizedType}`;
                if (!addedAssessmentTypes.has(invitationTypeKey)) {
                  // Create a synthetic ID for invitation-based assessments (using :: separator to avoid UUID/type conflicts)
                  availableAssessments.push({
                    purchaseItemId: `invitation::${invitation.id}::${normalizedType}`,
                    assessmentType: normalizedType,
                    status: 'ready',
                    source: 'invitation',
                    invitationId: invitation.id,
                  });
                  addedAssessmentTypes.add(invitationTypeKey);
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
        const assessmentType = normalizeAssessmentId(parts[2]); // Normalize assessment type

        // Verify invitation exists and belongs to user
        const invitation = await storage.getInvitation(invitationId);
        if (!invitation || invitation.candidateEmail !== user.email) {
          return res.status(403).json({ message: "Unauthorized access to this assessment" });
        }

        // Verify invitation is still valid
        if (new Date(invitation.expiresAt) < new Date()) {
          return res.status(400).json({ message: "Invitation has expired" });
        }

        // Verify this assessment type is included in the invitation (compare normalized versions)
        const normalizedInvitationTypes = invitation.assessmentTypes.map(t => normalizeAssessmentId(t));
        if (!normalizedInvitationTypes.includes(assessmentType)) {
          return res.status(403).json({ message: "Assessment type not included in invitation" });
        }

        // Check if assessment already started for this invitation (using normalized type)
        const existing = await storage.getResultByInvitationAndType(invitationId, assessmentType);
        if (existing) {
          if (existing.userId !== userId) {
            return res.status(403).json({ message: "Unauthorized access to this assessment" });
          }
          
          // If already completed, don't allow restart
          if (existing.status === 'completed') {
            return res.status(400).json({ message: "Assessment already completed" });
          }
          
          // Calculate remaining time based on assessment type
          const timeLimit = getAssessmentTimeLimit(assessmentType);
          const startTime = new Date(existing.startedAt).getTime();
          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);
          const remaining = Math.max(0, timeLimit - elapsed);
          
          // If time has expired, give full time again (not just grace period)
          // This allows users to properly complete assessments that timed out
          if (remaining <= 0 && existing.status === 'in_progress') {
            // Give full time limit back to allow proper completion
            console.log(`[START ASSESSMENT] Invitation assessment ${existing.id} time expired - granting full ${timeLimit}s to complete`);
            return res.json({ ...existing, timeRemaining: timeLimit });
          }
          
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
      console.log(`[START ASSESSMENT] Looking for purchaseItem ${purchaseItemId} for user ${userId}`);
      
      const [item] = await db.select().from(purchaseItems).where(eq(purchaseItems.id, purchaseItemId)).limit(1);
      if (!item) {
        console.log(`[START ASSESSMENT] Purchase item not found: ${purchaseItemId}`);
        return res.status(404).json({ message: "Purchase item not found" });
      }
      
      console.log(`[START ASSESSMENT] Found purchase item:`, {
        id: item.id,
        assessmentType: item.assessmentType,
        status: item.status,
        purchaseId: item.purchaseId
      });

      // Verify item status is ready
      if (item.status !== 'ready') {
        console.log(`[START ASSESSMENT] Item not ready: ${item.status}`);
        return res.status(400).json({ message: "Assessment not ready to start" });
      }

      // Verify purchase belongs to user
      const purchase = await storage.getPurchase(item.purchaseId);
      if (!purchase || purchase.userId !== userId) {
        console.log(`[START ASSESSMENT] Purchase mismatch. Purchase userId: ${purchase?.userId}, Request userId: ${userId}`);
        return res.status(403).json({ message: "Unauthorized access to this assessment" });
      }

      // Check if assessment already started
      const existing = await storage.getResultByPurchaseItem(purchaseItemId);
      console.log(`[START ASSESSMENT] Existing result lookup for purchaseItemId ${purchaseItemId}:`, existing ? {
        id: existing.id,
        status: existing.status,
        userId: existing.userId,
        assessmentType: existing.assessmentType,
        startedAt: existing.startedAt
      } : 'null');
      
      if (existing) {
        // Verify existing result belongs to current user
        if (existing.userId !== userId) {
          console.log(`[START ASSESSMENT] User mismatch! Existing userId: ${existing.userId}, Request userId: ${userId}`);
          return res.status(403).json({ message: "Unauthorized access to this assessment" });
        }
        
        // If already completed, don't allow restart
        if (existing.status === 'completed') {
          console.log(`[START ASSESSMENT] Assessment already completed: ${existing.id}`);
          return res.status(400).json({ message: "Assessment already completed" });
        }
        
        // Calculate remaining time based on assessment type
        const timeLimit = getAssessmentTimeLimit(item.assessmentType);
        const startTime = new Date(existing.startedAt).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, timeLimit - elapsed);
        
        console.log(`[START ASSESSMENT] Time calculation: timeLimit=${timeLimit}s, elapsed=${elapsed}s, remaining=${remaining}s`);
        
        // If time has expired, give full time again (not just grace period)
        // This allows users to properly complete assessments that timed out
        if (remaining <= 0 && existing.status === 'in_progress') {
          // Give full time limit back to allow proper completion
          console.log(`[START ASSESSMENT] Assessment ${existing.id} time expired - granting full ${timeLimit}s to complete`);
          return res.json({ ...existing, timeRemaining: timeLimit });
        }
        
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
    const { id } = req.params;
    const timestamp = new Date().toISOString();
    console.log(`[SUBMIT ${timestamp}] Starting submission for assessment ${id}, user ${req.user?.id}`);
    
    try {
      const { answers } = req.body;
      const userId = req.user.id;
      
      // Input validation - ensure answers is a valid object
      if (!answers || typeof answers !== 'object') {
        console.log(`[SUBMIT ${timestamp}] Invalid answers format:`, typeof answers, answers);
        return res.status(400).json({ message: "Invalid answers format" });
      }
      
      const answerCount = Object.keys(answers).length;
      console.log(`[SUBMIT ${timestamp}] Answers received: ${answerCount} answers`);
      console.log(`[SUBMIT ${timestamp}] Answer keys:`, Object.keys(answers).join(', '));

      let result;
      try {
        result = await storage.getAssessmentResult(id);
      } catch (dbError: any) {
        console.error(`[SUBMIT ${timestamp}] Database error fetching assessment:`, {
          error: dbError.message,
          code: dbError.code,
          assessmentId: id
        });
        return res.status(500).json({ message: "Database error. Please try again." });
      }
      
      console.log(`[SUBMIT ${timestamp}] Assessment result found:`, result ? {
        id: result.id,
        userId: result.userId,
        assessmentType: result.assessmentType,
        status: result.status,
        purchaseItemId: result.purchaseItemId,
        startedAt: result.startedAt
      } : 'null');
      
      if (!result) {
        console.log(`[SUBMIT ${timestamp}] Assessment not found for id: ${id}`);
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      if (result.userId !== userId) {
        console.log(`[SUBMIT ${timestamp}] User mismatch! Result userId: ${result.userId}, Request userId: ${userId}`);
        return res.status(403).json({ message: "Access denied to this assessment" });
      }

      // Prevent duplicate submission - if already completed, return success
      if (result.status === 'completed') {
        console.log(`Assessment ${id} already completed - ignoring duplicate submission`);
        return res.json({ 
          success: true, 
          scores: result.scores, 
          totalScore: result.totalScore,
          evaluations: result.evaluations,
          message: "Assessment already submitted"
        });
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
        console.log(`[SUBMIT DEBUG] Calculating AIQ scores for assessment ${id}`);
        scores = calculateAIQScores(answers);
        totalScore = scores['Algorithmic Integrity']; // AIQ has a single score
        console.log(`[SUBMIT DEBUG] AIQ scores calculated:`, { scores, totalScore });
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
      console.log(`[SUBMIT ${timestamp}] Updating database for assessment ${id}, type: ${result.assessmentType}`);
      console.log(`[SUBMIT ${timestamp}] Scores to save:`, JSON.stringify(scores));
      
      try {
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
        
        console.log(`[SUBMIT ${timestamp}] Database update successful for assessment ${id}`);
      } catch (dbUpdateError: any) {
        console.error(`[SUBMIT ${timestamp}] Database update failed:`, {
          error: dbUpdateError.message,
          code: dbUpdateError.code,
          assessmentId: id,
          assessmentType: result.assessmentType
        });
        return res.status(500).json({ 
          message: "Failed to save assessment results. Please try again.",
          error: "database_error"
        });
      }
      
      res.json({ success: true, scores, totalScore, evaluations });
    } catch (error: any) {
      const timestamp = new Date().toISOString();
      console.error(`[SUBMIT ERROR ${timestamp}] Assessment ${id} failed:`, {
        error: error.message,
        code: error.code,
        stack: error.stack,
        assessmentId: id,
        userId: req.user?.id,
        bodyKeys: req.body ? Object.keys(req.body) : 'no body'
      });
      
      // Provide more specific error messages based on error type
      let userMessage = "Failed to submit assessment. Please try again.";
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        userMessage = "Connection error. Please check your internet and try again.";
      } else if (error.message?.includes('session')) {
        userMessage = "Session expired. Please log in again and retry.";
      }
      
      res.status(500).json({ message: userMessage, error: "submission_failed" });
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
      
      // Allow super_admin or organization admin
      const isSuperAdmin = user?.role === 'super_admin';
      const isOrgAdmin = user?.role === 'admin' && user?.organizationId;
      
      if (!isSuperAdmin && !isOrgAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      // Determine organizationId: org admins use their own org, super admins can specify
      let organizationId: string | null = null;
      if (isOrgAdmin) {
        // Organization admins always use their own organization
        organizationId = user!.organizationId;
      } else if (isSuperAdmin && req.body.organizationId) {
        // Super admins can optionally specify an organization - validate it exists
        const specifiedOrg = await storage.getOrganization(req.body.organizationId);
        if (!specifiedOrg) {
          return res.status(400).json({ message: "Specified organization does not exist" });
        }
        organizationId = req.body.organizationId;
      }

      const validatedData = insertInvitationSchema.parse({
        ...req.body,
        sentBy: userId,
        organizationId,
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
        
        // Create user account with organization assignment from invitation
        console.log(`Creating user account for ${validatedData.candidateEmail}${organizationId ? ` in organization ${organizationId}` : ''}`);
        await storage.createUser({
          email: validatedData.candidateEmail,
          passwordHash,
          firstName,
          lastName,
          profileImageUrl: null,
          role: 'candidate',
          organizationId: organizationId ?? undefined,
        });
        
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
        // If user exists but has no organization, assign them to the invitation's org
        if (organizationId && !existingUser.organizationId) {
          await storage.updateUser(existingUser.id, { 
            organizationId,
            role: 'candidate'
          });
          console.log(`Assigned existing user ${validatedData.candidateEmail} to organization ${organizationId}`);
        }
        
        // Send invitation email to existing user
        console.log(`Sending invitation email to existing user ${validatedData.candidateEmail}`);
        await sendInvitationEmail(invitation, user!.firstName || 'HumanMetrix');
        
        console.log(`User ${validatedData.candidateEmail} already exists - invitation created and email sent`);
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
  app.post("/api/create-free-invitation", populateUser, async (req, res) => {
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
          // User already exists - they should log in instead of creating new assessments
          console.log(`⚠️  User ${email} already exists - rejecting checkout, they should log in`);
          return res.status(400).json({ 
            message: "An account with this email already exists. Please log in to add assessments to your account." 
          });
        }
      }

      // Check for existing unpaid purchase that still has incomplete assessments
      const existingPurchases = await storage.getPurchasesByUser(userId);
      let unpaidPurchase = existingPurchases.find((p: any) => !p.resultsAccessPaid);
      
      // If there's an unpaid purchase, check if all its items are completed
      // If all completed, allow creating a NEW testing series
      if (unpaidPurchase) {
        const existingItems = await storage.getPurchaseItems(unpaidPurchase.id);
        const userResults = await storage.getResultsByUser(userId);
        
        // Check if ALL items in this purchase have completed results
        const allItemsCompleted = existingItems.every((item: any) => {
          const result = userResults.find((r: any) => r.purchaseItemId === item.id);
          return result && result.status === 'completed';
        });
        
        if (allItemsCompleted && existingItems.length > 0) {
          // All assessments completed - allow creating a NEW testing series
          console.log(`User ${email} has completed all assessments in purchase ${unpaidPurchase.id}, allowing new series`);
          unpaidPurchase = undefined; // Force creation of new purchase
        }
      }

      let purchaseId: string;

      if (unpaidPurchase) {
        // User has unpaid purchase with INCOMPLETE assessments - add to existing
        purchaseId = unpaidPurchase.id;
        console.log(`User ${email} has existing unpaid purchase ${purchaseId} with incomplete assessments`);
        
        // Get existing purchase items to avoid duplicates within this purchase
        const existingItems = await storage.getPurchaseItems(purchaseId);
        const existingTypes = new Set(existingItems.map((item: any) => item.assessmentType));
        
        // Check which assessments are duplicates vs new
        const duplicates = assessmentIds.filter((id: string) => existingTypes.has(id));
        const newAssessments = assessmentIds.filter((id: string) => !existingTypes.has(id));
        
        // If ALL selected assessments are duplicates, return error
        if (newAssessments.length === 0) {
          return res.status(400).json({ 
            message: "These assessments are already in your dashboard. Complete them first or select different ones." 
          });
        }
        
        // Add only the new assessments
        for (const assessmentId of newAssessments) {
          await storage.createPurchaseItem({
            purchaseId,
            assessmentType: assessmentId,
            price: ASSESSMENT_PRICES[assessmentId as keyof typeof ASSESSMENT_PRICES],
            status: 'ready',
          });
          console.log(`Added ${assessmentId} to existing purchase`);
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
      
      const isSuperAdmin = user?.role === 'super_admin';
      const isOrgAdmin = user?.role === 'admin';
      const hasAdminAccess = isSuperAdmin || isOrgAdmin;
      
      if (!hasAdminAccess) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      let invitations = await storage.getAllInvitations();
      
      // Filter by organisation for regular admins
      if (isOrgAdmin && user?.organizationId) {
        invitations = invitations.filter((inv: any) => inv.organizationId === user.organizationId);
      } else if (isOrgAdmin && !user?.organizationId) {
        // Admin without organisation sees no invitations
        invitations = [];
      }
      
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // Admin: Get all results with user info
  app.get("/api/admin/results", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const isSuperAdmin = user?.role === 'super_admin';
      const isOrgAdmin = user?.role === 'admin';
      const hasAdminAccess = isSuperAdmin || isOrgAdmin;
      
      if (!hasAdminAccess) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      let results = await storage.getAllResults();
      
      // Filter by organisation for regular admins
      if (isOrgAdmin) {
        if (user?.organizationId) {
          // Get users belonging to this organization
          const orgUsers = await storage.getUsersByOrganization(user.organizationId);
          const orgUserIds = new Set(orgUsers.map((u: any) => u.id));
          results = results.filter((r: any) => orgUserIds.has(r.userId));
        } else {
          // Admin without organisation sees no results
          results = [];
        }
      }
      
      // Enrich results with user info
      const enrichedResults = await Promise.all(
        results.map(async (result) => {
          const resultUser = await storage.getUser(result.userId);
          return {
            ...result,
            userEmail: resultUser?.email || 'Unknown',
            userName: resultUser?.firstName && resultUser?.lastName 
              ? `${resultUser.firstName} ${resultUser.lastName}` 
              : resultUser?.email?.split('@')[0] || 'Unknown',
          };
        })
      );
      
      // Sort: completed first, then by completedAt/startedAt descending
      enrichedResults.sort((a, b) => {
        // Completed results first
        if (a.status === 'completed' && b.status !== 'completed') return -1;
        if (a.status !== 'completed' && b.status === 'completed') return 1;
        
        // Then by date (most recent first)
        const dateA = a.completedAt ? new Date(a.completedAt) : new Date(a.startedAt);
        const dateB = b.completedAt ? new Date(b.completedAt) : new Date(b.startedAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      res.json(enrichedResults);
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
      
      // Check if user has admin access
      const isSuperAdmin = user?.role === 'super_admin';
      const isOrgAdmin = user?.role === 'admin';
      const hasAdminAccess = isSuperAdmin || isOrgAdmin;
      
      if (!hasAdminAccess) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      // Super admins see all candidates, org admins only see their organization's candidates
      let candidates;
      if (isSuperAdmin) {
        // Super admin: see all candidates
        candidates = await storage.getCandidatesWithResultsByOrganization(null);
      } else if (isOrgAdmin && user?.organizationId) {
        // Org admin: see only their organization's candidates
        candidates = await storage.getCandidatesWithResultsByOrganization(user.organizationId);
      } else {
        // Org admin without organization assigned
        candidates = [];
      }
      
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
      
      const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
      if (!hasAdminAccess) {
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
      
      const hasAdminAccess = admin?.role === 'super_admin' || admin?.role === 'admin';
      if (!hasAdminAccess) {
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
      
      const hasAdminAccess = admin?.role === 'super_admin' || admin?.role === 'admin';
      if (!hasAdminAccess) {
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
      
      const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
      if (!hasAdminAccess) {
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
      
      const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
      if (!hasAdminAccess) {
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
      
      const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
      if (!hasAdminAccess) {
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
        model: "gpt-5",
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
      
      const hasAdminAccess = admin?.role === 'super_admin' || admin?.role === 'admin';
      if (!hasAdminAccess) {
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
      
      const hasAdminAccess = admin?.role === 'super_admin' || admin?.role === 'admin';
      if (!hasAdminAccess) {
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
      // Mapping from short skill names (used in required scores) to full names (stored in assessment results)
      const aiReadinessSkillMapping: Record<string, string> = {
        'AI Literacy': 'AI Literacy & Prompt Engineering',
        'Collaboration': 'Collaboration & Communication',
        'Domain Fluency': 'Data Fluency',
        'Responsible AI': 'Responsible AI & Ethical Awareness',
        'Data Fluency': 'Data Fluency',
        'Technical Fundamentals': 'Technical Fundamentals',
        'Technical Fluency': 'Technical Fundamentals',
        'Critical Thinking': 'Critical Thinking & Problem-Solving',
        'Adaptability': 'Adaptability & Continuous Learning',
        'Adaptive Learning': 'Adaptability & Continuous Learning',
        'Creativity': 'Creativity & Innovation',
        'Creative Innovation': 'Creativity & Innovation',
        'Domain Expertise': 'Domain Expertise',
      };
      
      if (aiReadinessSkills.size > 0 && role.requiredSkillScores.aiReadinessSkills) {
        Object.entries(role.requiredSkillScores.aiReadinessSkills).forEach(([skillName, requiredScore]) => {
          // Look up using full name from mapping, fallback to original name
          const fullSkillName = aiReadinessSkillMapping[skillName] || skillName;
          const candidateScore = aiReadinessSkills.get(fullSkillName) || aiReadinessSkills.get(skillName) || 0;
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
        model: "gpt-5",
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
      
      const hasAdminAccess = admin?.role === 'super_admin' || admin?.role === 'admin';
      if (!hasAdminAccess) {
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
      const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
      if (result.userId !== userId && !hasAdminAccess) {
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

  // ==================== PLATFORM METRICS (Super Admin Only) ====================

  // Super Admin: Get platform-wide stats across all organizations
  app.get("/api/admin/platform-stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Forbidden: Super admin access required" });
      }
      
      // Get all organizations
      const organizations = await storage.getAllOrganizations();
      
      // Get all candidates and results
      const allCandidates = await storage.getCandidatesWithResults();
      const allResults = await storage.getAllResults();
      const allInvitations = await storage.getAllInvitations();
      
      // Calculate per-organization stats
      const orgStats = await Promise.all(organizations.map(async (org) => {
        const orgCandidates = await storage.getCandidatesWithResultsByOrganization(org.id);
        const members = await storage.getUsersByOrganization(org.id);
        
        const completedAssessments = orgCandidates.reduce((count: number, candidate: any) => {
          const completed = (candidate.results || []).filter((r: any) => r.status === 'completed').length;
          return count + completed;
        }, 0);
        
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          isActive: org.isActive,
          memberCount: members.length,
          candidateCount: orgCandidates.length,
          completedAssessments,
        };
      }));
      
      // Calculate totals
      const totalOrganizations = organizations.length;
      const activeOrganizations = organizations.filter(o => o.isActive).length;
      const totalCandidates = allCandidates.length;
      const totalAssessments = allResults.length;
      const completedAssessments = allResults.filter((r: any) => r.status === 'completed').length;
      const totalInvitations = allInvitations.length;
      
      // Calculate candidates without organization (self-service)
      const selfServiceCandidates = allCandidates.filter((c: any) => !c.user?.organizationId).length;
      
      res.json({
        totals: {
          organizations: totalOrganizations,
          activeOrganizations,
          candidates: totalCandidates,
          selfServiceCandidates,
          assessments: totalAssessments,
          completedAssessments,
          invitations: totalInvitations,
        },
        organizationStats: orgStats,
      });
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ message: "Failed to fetch platform stats" });
    }
  });

  // Super Admin: Get queue and system health stats
  app.get("/api/admin/queue-stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Forbidden: Super admin access required" });
      }
      
      const queueStats = getQueueStats();
      const poolStats = await getPoolStats();
      
      res.json({
        queues: queueStats,
        database: poolStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching queue stats:", error);
      res.status(500).json({ message: "Failed to fetch queue stats" });
    }
  });

  // Admin: Get current user's organization info
  app.get("/api/admin/my-organization", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
      if (!hasAdminAccess) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      if (user?.role === 'super_admin') {
        // Super admins don't have a specific organization, they see all
        return res.json({ 
          isSuperAdmin: true, 
          organization: null 
        });
      }
      
      if (!user?.organizationId) {
        return res.json({ 
          isSuperAdmin: false, 
          organization: null,
          message: "No organization assigned" 
        });
      }
      
      const organization = await storage.getOrganization(user.organizationId);
      res.json({ 
        isSuperAdmin: false, 
        organization 
      });
    } catch (error) {
      console.error("Error fetching user's organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  // ==================== ORGANIZATION ADMIN API ====================

  // Admin/Super Admin: Get organizations (super admin sees all, admin sees their own)
  app.get("/api/admin/organizations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
      if (!hasAdminAccess) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      if (user?.role === 'super_admin') {
        // Super admins see all organizations
        const organizations = await storage.getAllOrganizations();
        res.json(organizations);
      } else {
        // Regular admins see only their organization
        if (user?.organizationId) {
          const org = await storage.getOrganization(user.organizationId);
          res.json(org ? [org] : []);
        } else {
          res.json([]);
        }
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  // Admin/Super Admin: Get single organization with member count
  app.get("/api/admin/organizations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
      if (!hasAdminAccess) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      // Regular admins can only view their own organization
      if (user?.role === 'admin' && user.organizationId !== req.params.id) {
        return res.status(403).json({ message: "Forbidden: You can only view your own organization" });
      }
      
      const org = await storage.getOrganization(req.params.id);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Get member count
      const members = await storage.getUsersByOrganization(org.id);
      
      res.json({
        ...org,
        memberCount: members.length,
        members: members.map(m => ({
          id: m.id,
          email: m.email,
          firstName: m.firstName,
          lastName: m.lastName,
          role: m.role,
        })),
      });
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  // Admin/Super Admin: Create organization
  app.post("/api/admin/organizations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
      if (!hasAdminAccess) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      // Regular admins can only create one organization and must not already have one
      if (user?.role === 'admin' && user.organizationId) {
        return res.status(400).json({ message: "You already belong to an organization. Only super admins can create multiple organizations." });
      }
      
      const { name, slug, logoUrl, primaryColor, maxSeats } = req.body;
      
      if (!name || !slug) {
        return res.status(400).json({ message: "Name and slug are required" });
      }
      
      // Check if slug is unique
      const existing = await storage.getOrganizationBySlug(slug);
      if (existing) {
        return res.status(400).json({ message: "An organization with this slug already exists" });
      }
      
      const org = await storage.createOrganization({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        logoUrl: logoUrl || null,
        primaryColor: primaryColor || null,
        maxSeats: maxSeats || 10,
        isActive: true,
      });
      
      // If admin (not super admin), automatically assign them to the new organization
      if (user?.role === 'admin') {
        await storage.updateUserOrganization(userId, org.id);
      }
      
      res.json(org);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  // Super Admin: Update organization
  app.put("/api/admin/organizations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Forbidden: Super admin access required" });
      }
      
      const { name, slug, logoUrl, primaryColor, maxSeats, isActive } = req.body;
      
      const org = await storage.getOrganization(req.params.id);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Check slug uniqueness if changed
      if (slug && slug !== org.slug) {
        const existing = await storage.getOrganizationBySlug(slug);
        if (existing) {
          return res.status(400).json({ message: "An organization with this slug already exists" });
        }
      }
      
      await storage.updateOrganization(req.params.id, {
        name: name ?? org.name,
        slug: slug ? slug.toLowerCase().replace(/[^a-z0-9-]/g, '-') : org.slug,
        logoUrl: logoUrl !== undefined ? logoUrl : org.logoUrl,
        primaryColor: primaryColor !== undefined ? primaryColor : org.primaryColor,
        maxSeats: maxSeats ?? org.maxSeats,
        isActive: isActive !== undefined ? isActive : org.isActive,
      });
      
      const updated = await storage.getOrganization(req.params.id);
      res.json(updated);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  // Super Admin: Delete organization
  app.delete("/api/admin/organizations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Forbidden: Super admin access required" });
      }
      
      const org = await storage.getOrganization(req.params.id);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Check if there are any members
      const members = await storage.getUsersByOrganization(org.id);
      if (members.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete organization with ${members.length} member(s). Remove all members first.` 
        });
      }
      
      await storage.deleteOrganization(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting organization:", error);
      res.status(500).json({ message: "Failed to delete organization" });
    }
  });

  // Super Admin: Assign user to organization
  app.post("/api/admin/organizations/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Forbidden: Super admin access required" });
      }
      
      const { userEmail, role } = req.body;
      
      if (!userEmail) {
        return res.status(400).json({ message: "User email is required" });
      }
      
      const org = await storage.getOrganization(req.params.id);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      const targetUser = await storage.getUserByEmail(userEmail);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check seat limit
      const members = await storage.getUsersByOrganization(org.id);
      if (members.length >= (org.maxSeats || 10)) {
        return res.status(400).json({ message: `Organization has reached maximum seats (${org.maxSeats})` });
      }
      
      // Update user's organization and role
      await storage.updateUserOrganization(targetUser.id, org.id);
      if (role && (role === 'candidate' || role === 'admin')) {
        await storage.updateUserRole(targetUser.id, role);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error adding member to organization:", error);
      res.status(500).json({ message: "Failed to add member" });
    }
  });

  // Super Admin: Remove user from organization
  app.delete("/api/admin/organizations/:id/members/:memberId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Forbidden: Super admin access required" });
      }
      
      const targetUser = await storage.getUser(req.params.memberId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (targetUser.organizationId !== req.params.id) {
        return res.status(400).json({ message: "User is not a member of this organization" });
      }
      
      // Remove from organization and set role to candidate
      await storage.updateUserOrganization(targetUser.id, null);
      await storage.updateUserRole(targetUser.id, 'candidate');
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing member from organization:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // Super Admin: Update member role
  app.put("/api/admin/organizations/:id/members/:memberId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Forbidden: Super admin access required" });
      }
      
      const { role } = req.body;
      if (!role || (role !== 'candidate' && role !== 'admin')) {
        return res.status(400).json({ message: "Valid role (candidate or admin) is required" });
      }
      
      const targetUser = await storage.getUser(req.params.memberId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (targetUser.organizationId !== req.params.id) {
        return res.status(400).json({ message: "User is not a member of this organization" });
      }
      
      await storage.updateUserRole(targetUser.id, role);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ message: "Failed to update member role" });
    }
  });

  // ==================== B2B PARTNER ADMIN API ====================

  // Super Admin: List all partners
  app.get("/api/admin/partners", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Forbidden: Super admin access required" });
      }
      
      const partners = await storage.getAllPartnerAccounts();
      
      // Get usage stats for each partner
      const partnersWithStats = await Promise.all(partners.map(async (partner) => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const usage = await storage.getUsageSummaryByPartner(partner.id, startOfMonth, endOfMonth);
        const completedSessions = usage.find((u: any) => u.eventType === 'session_completed')?.count || 0;
        
        return {
          ...partner,
          currentMonthSessions: completedSessions,
        };
      }));
      
      res.json(partnersWithStats);
    } catch (error) {
      console.error("Error fetching partners:", error);
      res.status(500).json({ message: "Failed to fetch partners" });
    }
  });

  // Super Admin: Create new partner
  app.post("/api/admin/partners", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Forbidden: Super admin access required" });
      }
      
      const { name, companyName, email, monthlyQuota, pricePerAssessment, stripeCustomerId } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }
      
      // Check for existing partner with same email
      const existing = await storage.getPartnerAccountByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "A partner with this email already exists" });
      }
      
      const partner = await storage.createPartnerAccount({
        name,
        companyName,
        email,
        monthlyQuota: monthlyQuota || null,
        pricePerAssessment: pricePerAssessment || 500, // Default £5
        stripeCustomerId: stripeCustomerId || null,
        isActive: true,
      });
      
      res.status(201).json(partner);
    } catch (error) {
      console.error("Error creating partner:", error);
      res.status(500).json({ message: "Failed to create partner" });
    }
  });

  // Super Admin: Update partner
  app.put("/api/admin/partners/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Forbidden: Super admin access required" });
      }
      
      const partner = await storage.getPartnerAccount(req.params.id);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      
      const { name, companyName, email, monthlyQuota, pricePerAssessment, isActive, stripeCustomerId } = req.body;
      
      await storage.updatePartnerAccount(req.params.id, {
        name: name ?? partner.name,
        companyName: companyName ?? partner.companyName,
        email: email ?? partner.email,
        monthlyQuota: monthlyQuota !== undefined ? monthlyQuota : partner.monthlyQuota,
        pricePerAssessment: pricePerAssessment ?? partner.pricePerAssessment,
        isActive: isActive !== undefined ? isActive : partner.isActive,
        stripeCustomerId: stripeCustomerId ?? partner.stripeCustomerId,
      });
      
      const updated = await storage.getPartnerAccount(req.params.id);
      res.json(updated);
    } catch (error) {
      console.error("Error updating partner:", error);
      res.status(500).json({ message: "Failed to update partner" });
    }
  });

  // Super Admin: Get partner API keys
  app.get("/api/admin/partners/:id/keys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Forbidden: Super admin access required" });
      }
      
      const partner = await storage.getPartnerAccount(req.params.id);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      
      const keys = await storage.getApiKeysByPartner(req.params.id);
      
      // Don't expose the full hash, just metadata
      const safeKeys = keys.map(k => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        keyHint: k.keyHint,
        environment: k.environment,
        permissions: k.permissions,
        rateLimit: k.rateLimit,
        isActive: k.isActive,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
        createdAt: k.createdAt,
      }));
      
      res.json(safeKeys);
    } catch (error) {
      console.error("Error fetching partner API keys:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  // Super Admin: Create new API key for partner
  app.post("/api/admin/partners/:id/keys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Forbidden: Super admin access required" });
      }
      
      const partner = await storage.getPartnerAccount(req.params.id);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      
      const { name, environment, permissions, rateLimit, expiresAt } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Key name is required" });
      }
      
      const env = environment === 'live' ? 'live' : 'test';
      const { generateApiKey } = await import("./partner-auth");
      const { fullKey, prefix, hash, hint } = generateApiKey(env as 'test' | 'live');
      
      const key = await storage.createPartnerApiKey({
        partnerId: partner.id,
        name,
        keyHash: hash,
        keyPrefix: prefix,
        keyHint: hint,
        environment: env,
        permissions: permissions || ['assessments:read', 'assessments:write', 'results:read'],
        rateLimit: rateLimit || 100,
        isActive: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });
      
      // Return the full key ONLY on creation - it won't be retrievable again
      res.status(201).json({
        ...key,
        fullKey, // Include full key only on creation!
        message: "IMPORTANT: Save this API key securely. It will not be shown again.",
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  // Super Admin: Revoke API key
  app.delete("/api/admin/partners/:id/keys/:keyId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Forbidden: Super admin access required" });
      }
      
      const key = await storage.getPartnerApiKey(req.params.keyId);
      if (!key || key.partnerId !== req.params.id) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      await storage.revokePartnerApiKey(req.params.keyId);
      
      res.json({ success: true, message: "API key revoked" });
    } catch (error) {
      console.error("Error revoking API key:", error);
      res.status(500).json({ message: "Failed to revoke API key" });
    }
  });

  // Super Admin: Get partner usage details
  app.get("/api/admin/partners/:id/usage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Forbidden: Super admin access required" });
      }
      
      const partner = await storage.getPartnerAccount(req.params.id);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const usage = await storage.getUsageSummaryByPartner(partner.id, startOfMonth, endOfMonth);
      const recentEvents = await storage.getRecentUsageEvents(partner.id, 100);
      
      res.json({
        period: { start: startOfMonth, end: endOfMonth },
        summary: usage,
        recentEvents,
      });
    } catch (error) {
      console.error("Error fetching partner usage:", error);
      res.status(500).json({ message: "Failed to fetch usage" });
    }
  });

  // Super Admin: Get partner sessions
  app.get("/api/admin/partners/:id/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Forbidden: Super admin access required" });
      }
      
      const partner = await storage.getPartnerAccount(req.params.id);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const sessions = await storage.getSessionsByPartner(partner.id, limit);
      
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching partner sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // ==================== GOLDEN SET ADMIN API ====================

  // Admin: Get golden set benchmark prompts
  app.get("/api/admin/golden-set/prompts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
      if (!hasAdminAccess) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      let prompts = await storage.getAllGoldenSetPrompts();
      
      // Seed if empty
      if (prompts.length === 0) {
        await seedGoldenSetPrompts();
        prompts = await storage.getAllGoldenSetPrompts();
      }
      
      res.json(prompts);
    } catch (error) {
      console.error("Error fetching golden set prompts:", error);
      res.status(500).json({ message: "Failed to fetch golden set prompts" });
    }
  });

  // Admin: Get latest golden set results
  app.get("/api/admin/golden-set/results", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
      if (!hasAdminAccess) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const results = await storage.getLatestGoldenSetResults();
      
      // Also get prompts that haven't been tested yet
      const prompts = await storage.getAllGoldenSetPrompts();
      const testedPromptIds = new Set(results.map(r => r.promptId));
      const untestedPrompts = prompts.filter(p => !testedPromptIds.has(p.id));
      
      res.json({
        results,
        untestedPrompts,
        allPrompts: prompts,
        totalPrompts: prompts.length,
        testedCount: results.length,
        passedCount: results.filter(r => r.passed).length,
        failedCount: results.filter(r => !r.passed).length
      });
    } catch (error) {
      console.error("Error fetching golden set results:", error);
      res.status(500).json({ message: "Failed to fetch golden set results" });
    }
  });

  // Admin: Get golden set historical results
  app.get("/api/admin/golden-set/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
      if (!hasAdminAccess) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      // Get all results grouped by test run (using testedAt date)
      const allResults = await db
        .select()
        .from(goldenSetResults)
        .orderBy(desc(goldenSetResults.testedAt))
        .limit(100);
      
      // Get all prompts for reference
      const prompts = await storage.getAllGoldenSetPrompts();
      const promptMap = new Map(prompts.map(p => [p.id, p]));
      
      // Group by test run date (rounded to minute)
      const runGroups: Map<string, Array<typeof allResults[0] & { promptName: string; level: number }>> = new Map();
      
      for (const result of allResults) {
        const runTime = new Date(result.testedAt).toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
        const prompt = promptMap.get(result.promptId);
        
        if (!runGroups.has(runTime)) {
          runGroups.set(runTime, []);
        }
        
        runGroups.get(runTime)!.push({
          ...result,
          promptName: prompt?.name || 'Unknown',
          level: prompt?.level || 0
        });
      }
      
      // Convert to array with summary stats
      const history = Array.from(runGroups.entries()).map(([runTime, results]) => ({
        runTime,
        testedCount: results.length,
        passedCount: results.filter(r => r.passed).length,
        failedCount: results.filter(r => !r.passed).length,
        avgDrift: Math.round(results.reduce((sum, r) => sum + (r.driftPercentage || 0), 0) / results.length * 10) / 10,
        results: results.sort((a, b) => a.level - b.level)
      }));
      
      res.json({ history });
    } catch (error) {
      console.error("Error fetching golden set history:", error);
      res.status(500).json({ message: "Failed to fetch golden set history" });
    }
  });

  // Admin: Run golden set evaluation (manual trigger - runs in background)
  app.post("/api/admin/golden-set/run", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
      if (!hasAdminAccess) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      console.log('[Golden Set] Manual evaluation triggered by admin');
      
      // Start evaluation in background (don't await)
      runGoldenSetEvaluation().then(result => {
        console.log('[Golden Set] Background evaluation completed:', result.overallPassed ? 'PASSED' : 'SOME FAILED');
      }).catch(err => {
        console.error('[Golden Set] Background evaluation error:', err);
      });
      
      // Return immediately
      res.json({ message: "Evaluation started", status: "running" });
    } catch (error: any) {
      console.error("Error starting golden set evaluation:", error);
      res.status(500).json({ message: "Failed to start golden set evaluation: " + error.message });
    }
  });

  // Admin: Get golden set evaluation progress
  app.get("/api/admin/golden-set/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
      if (!hasAdminAccess) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      res.json(goldenSetProgress);
    } catch (error) {
      console.error("Error fetching golden set progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Admin: Seed golden set prompts (if needed)
  app.post("/api/admin/golden-set/seed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
      if (!hasAdminAccess) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const prompts = await seedGoldenSetPrompts();
      res.json({ message: "Golden set prompts seeded", count: prompts.length });
    } catch (error) {
      console.error("Error seeding golden set prompts:", error);
      res.status(500).json({ message: "Failed to seed golden set prompts" });
    }
  });

  // Admin: Recalibrate golden set - runs GPT-5 evaluation and updates expected scores to match
  app.post("/api/admin/golden-set/reset", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
      if (!hasAdminAccess) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      console.log('[Golden Set] Starting recalibration...');
      
      // Delete all results first (due to foreign key)
      await storage.deleteAllGoldenSetResults();
      
      // Delete all prompts
      await storage.deleteAllGoldenSetPrompts();
      
      // Re-seed prompts (with placeholder expected scores)
      const created = [];
      for (const prompt of GOLDEN_SET_PROMPTS) {
        const result = await storage.createGoldenSetPrompt(prompt);
        created.push(result);
      }
      
      console.log(`[Golden Set] Seeded ${created.length} prompts. Starting smoothed GPT-5 calibration (5 runs per prompt)...`);
      
      const CALIBRATION_RUNS = 5; // Run each prompt 5 times and average for maximum stable baseline
      
      // Run calibration in background with progress tracking
      (async () => {
        try {
          const prompts = await storage.getAllGoldenSetPrompts();
          
          // Initialize progress tracking for calibration
          goldenSetProgress = {
            isRunning: true,
            currentPrompt: 0,
            totalPrompts: prompts.length,
            currentPromptName: "Starting calibration...",
            startedAt: new Date(),
            isCalibrating: true,
          };
          
          for (let i = 0; i < prompts.length; i++) {
            const prompt = prompts[i];
            
            // Update progress
            goldenSetProgress.currentPrompt = i + 1;
            goldenSetProgress.currentPromptName = prompt.name;
            
            console.log(`[Calibration] Evaluating: ${prompt.name} (${CALIBRATION_RUNS} runs)`);
            
            // Run GPT-5 evaluation multiple times and collect scores
            const evaluations: Array<{
              clarity: number;
              structure: number;
              contextRelevance: number;
              creativity: number;
              iterativeImprovement: number;
              totalScore: number;
            }> = [];
            
            for (let run = 0; run < CALIBRATION_RUNS; run++) {
              console.log(`[Calibration] ${prompt.name} - Run ${run + 1}/${CALIBRATION_RUNS}`);
              const scores = await evaluatePromptWithGPT(prompt.promptText, prompt.level, prompt.taskDescription);
              evaluations.push(scores);
            }
            
            // Calculate averaged scores across all runs
            const averagedScores = {
              clarity: Math.round(evaluations.reduce((sum, e) => sum + e.clarity, 0) / CALIBRATION_RUNS),
              structure: Math.round(evaluations.reduce((sum, e) => sum + e.structure, 0) / CALIBRATION_RUNS),
              contextRelevance: Math.round(evaluations.reduce((sum, e) => sum + e.contextRelevance, 0) / CALIBRATION_RUNS),
              creativity: Math.round(evaluations.reduce((sum, e) => sum + e.creativity, 0) / CALIBRATION_RUNS),
              iterativeImprovement: Math.round(evaluations.reduce((sum, e) => sum + e.iterativeImprovement, 0) / CALIBRATION_RUNS),
              totalScore: Math.round(evaluations.reduce((sum, e) => sum + e.totalScore, 0) / CALIBRATION_RUNS),
            };
            
            // Update the expected scores to match averaged GPT-5 output
            await db.update(goldenSetPrompts)
              .set({ expectedScores: averagedScores })
              .where(eq(goldenSetPrompts.id, prompt.id));
            
            // Store result with 0% drift (since we're calibrating)
            await storage.createGoldenSetResult({
              promptId: prompt.id,
              actualScores: averagedScores,
              driftPercentage: 0,
              passed: true,
            });
            
            const runScores = evaluations.map(e => e.totalScore).join(', ');
            console.log(`[Calibration] ${prompt.name}: Runs [${runScores}], Calibrated to avg ${averagedScores.totalScore}`);
          }
          
          // Mark calibration as complete
          goldenSetProgress.isRunning = false;
          goldenSetProgress.currentPromptName = "Complete";
          goldenSetProgress.isCalibrating = false;
          
          console.log('[Calibration] Complete! All prompts calibrated to smoothed GPT-5 output.');
        } catch (err) {
          console.error('[Calibration] Error:', err);
          goldenSetProgress.isRunning = false;
          goldenSetProgress.isCalibrating = false;
        }
      })();
      
      res.json({ message: "Recalibration started", status: "running", count: created.length });
    } catch (error) {
      console.error("Error starting recalibration:", error);
      res.status(500).json({ message: "Failed to start recalibration" });
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
      // Enhanced differentiation formula:
      // - Floor at 50 (no demoralising scores)
      // - Average performers (~50% raw) → ~71%
      // - Strong performers (~80% raw) → ~85%
      // - Exceptional performers (100% raw) → 95%
      // Creates ~25pt differentiation in top half vs ~10pt in old formula
      const baseScore = rawNormalized * 0.4; // 0-40 points linear component
      const bonusScore = Math.pow(rawNormalized / 100, 2) * 5; // 0-5 bonus for high performers
      normalizedScores[skill] = Math.round(50 + baseScore + bonusScore);
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
      // Enhanced differentiation formula (same as FIT):
      // - Floor at 50 (no demoralising scores)
      // - Average performers (~50% raw) → ~71%
      // - Strong performers (~80% raw) → ~85%
      // - Exceptional performers (100% raw) → 95%
      const baseScore = rawNormalized * 0.4; // 0-40 points linear component
      const bonusScore = Math.pow(rawNormalized / 100, 2) * 5; // 0-5 bonus for high performers
      normalizedScores[skill] = Math.round(50 + baseScore + bonusScore);
    } else {
      normalizedScores[skill] = 50; // Minimum score is 50
    }
  });

  return normalizedScores;
}

function calculateAIQScores(answers: Record<string, string>): Record<string, number> {
  // Graded scoring for AIQ assessment
  // Each answer option has a score from 0-100 based on ethical alignment
  const gradedScores: Record<string, Record<string, number>> = {
    '1': { 'A': 100, 'B': 0, 'C': 65, 'D': 30 },   // Re-identification Risk
    '2': { 'A': 100, 'B': 70, 'C': 25, 'D': 0 },   // CV Screening Bias
    '3': { 'A': 70, 'B': 55, 'C': 100, 'D': 0 },   // Black Box Loan Decisions
    '4': { 'A': 0, 'B': 100, 'C': 20, 'D': 60 },   // Emergency Vehicle Priority
    '5': { 'A': 75, 'B': 100, 'C': 15, 'D': 40 },  // Facial Recognition Bias
    '6': { 'A': 100, 'B': 60, 'C': 20, 'D': 45 },  // Mental Health Chatbot
    '7': { 'A': 100, 'B': 50, 'C': 75, 'D': 20 },  // AI Tutoring Achievement Gap
    '8': { 'A': 50, 'B': 70, 'C': 100, 'D': 0 },   // Hospital AI Consent
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

  // Calculate average score (out of 100)
  const averageScore = questionsAnswered > 0 
    ? Math.round(totalPoints / questionsAnswered) 
    : 0;
  
  return { 
    'Algorithmic Integrity': averageScore
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
        model: "gpt-5",
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

// ==================== GOLDEN SET BENCHMARK SYSTEM ====================

// Progress tracking for golden set evaluations
let goldenSetProgress = {
  isRunning: false,
  currentPrompt: 0,
  totalPrompts: 10,
  currentPromptName: "",
  startedAt: null as Date | null,
  isCalibrating: false,
};

// 10 Benchmark prompts across all 7 levels for scoring consistency verification
// Expected scores calibrated from actual GPT-4o-2024-08-06 output (Dec 2025)
const GOLDEN_SET_PROMPTS = [
  {
    name: "L1-Basic-Good",
    level: 1,
    taskDescription: "Write a prompt to ask for the capital city of France and 3 interesting facts about it.",
    promptText: "Tell me the capital of France and provide 3 interesting facts about this city, including its history, culture, and landmarks.",
    expectedScores: { clarity: 18, structure: 17, contextRelevance: 17, creativity: 15, iterativeImprovement: 14, totalScore: 81 }
  },
  {
    name: "L1-Basic-Poor",
    level: 1,
    taskDescription: "Write a prompt to ask for the capital city of France and 3 interesting facts about it.",
    promptText: "France capital facts",
    expectedScores: { clarity: 5, structure: 4, contextRelevance: 5, creativity: 2, iterativeImprovement: 2, totalScore: 18 }
  },
  {
    name: "L2-Structured-Good",
    level: 2,
    taskDescription: "Write a prompt asking the AI to list the top 5 programming languages for web development in 2024, formatted as a numbered list with a brief one-sentence description for each.",
    promptText: "Please provide a numbered list of the top 5 programming languages for web development in 2024. For each language, include: 1) The language name, 2) A one-sentence description of its primary use case and popularity. Format each entry on its own line.",
    expectedScores: { clarity: 19, structure: 18, contextRelevance: 18, creativity: 14, iterativeImprovement: 12, totalScore: 81 }
  },
  {
    name: "L3-Role-Good",
    level: 3,
    taskDescription: "Write a prompt asking the AI to explain quantum computing as if it were a senior physics professor teaching undergraduate students.",
    promptText: "You are a senior physics professor at MIT with 30 years of experience teaching undergraduates. Explain quantum computing to your introductory physics class. Use accessible language, real-world analogies, and avoid jargon. Structure your explanation with: 1) What is quantum computing, 2) How it differs from classical computing, 3) One practical application students can relate to.",
    expectedScores: { clarity: 19, structure: 19, contextRelevance: 18, creativity: 17, iterativeImprovement: 16, totalScore: 89 }
  },
  {
    name: "L4-MultiStep-Good",
    level: 4,
    taskDescription: "Write a prompt asking the AI to help debug a Python function that's supposed to find duplicates in a list.",
    promptText: "I have a Python function that should find duplicate values in a list but it's not working correctly. Please help me debug it by following these steps:\n\n1. ANALYZE: First, examine the code logic and identify potential issues\n2. IDENTIFY: Pinpoint the specific bug(s) causing the problem\n3. EXPLAIN: Describe why this bug causes incorrect behavior\n4. FIX: Provide a corrected version of the function with comments explaining the changes\n\nHere's my function:\ndef find_duplicates(lst):\n    duplicates = []\n    for i in lst:\n        if lst.count(i) > 1:\n            duplicates.append(i)\n    return duplicates",
    expectedScores: { clarity: 19, structure: 20, contextRelevance: 19, creativity: 16, iterativeImprovement: 15, totalScore: 89 }
  },
  {
    name: "L5-Creative-Good",
    level: 5,
    taskDescription: "Write a prompt for a 100-word eco-friendly water bottle product description with constraints.",
    promptText: "Create a product description for EcoFlow, a new eco-friendly water bottle.\n\nRequirements:\n- Exactly 100 words (±5 words acceptable)\n- Include exactly 3 key benefits, each clearly labeled\n- Use persuasive marketing language with action verbs\n- Mention sustainability and environmental impact at least twice\n- Target audience: health-conscious millennials aged 25-35\n- Tone: enthusiastic but not overly salesy\n- End with a call-to-action\n\nFormat: Short opening hook, followed by the 3 benefits as bullet points, then closing statement with CTA.",
    expectedScores: { clarity: 18, structure: 19, contextRelevance: 20, creativity: 18, iterativeImprovement: 14, totalScore: 89 }
  },
  {
    name: "L6-Iterative-Good",
    level: 6,
    taskDescription: "Write a prompt for drafting and self-improving a job offer decline email.",
    promptText: "Complete this multi-step task for writing a professional email declining a job offer:\n\nSTEP 1 - DRAFT:\nWrite a professional email to decline a job offer from TechCorp for a Software Engineer position. Express gratitude, decline politely, and leave the door open for future opportunities.\n\nSTEP 2 - SELF-EVALUATE:\nCritically analyze your draft on these criteria:\n- Tone (professional yet warm?)\n- Clarity (is the message unambiguous?)\n- Professionalism (appropriate language and structure?)\n- Completeness (all necessary elements included?)\nList 2-3 specific weaknesses.\n\nSTEP 3 - IMPROVE:\nRewrite the email addressing the weaknesses you identified. Highlight what you changed and why.",
    expectedScores: { clarity: 19, structure: 20, contextRelevance: 18, creativity: 17, iterativeImprovement: 18, totalScore: 92 }
  },
  {
    name: "L7-Complex-Good",
    level: 7,
    taskDescription: "Write a prompt for designing a comprehensive content moderation system.",
    promptText: "Design a comprehensive content moderation system for a social media platform with 50 million active users.\n\nProvide a structured response covering ALL of these sections:\n\n1. TECHNICAL ARCHITECTURE\n   - AI/ML pipeline components\n   - Human review integration\n   - Real-time vs batch processing\n\n2. CONTENT CLASSIFICATION\n   - Decision tree for content types (text, images, video)\n   - Severity levels and corresponding actions\n   - Edge case handling protocol\n\n3. ETHICAL CONSIDERATIONS\n   - Free speech balance\n   - Cultural sensitivity across regions\n   - Bias mitigation in AI systems\n\n4. SCALABILITY\n   - Load handling during viral events\n   - Queue management and prioritization\n\n5. APPEALS PROCESS\n   - User dispute mechanism\n   - Escalation tiers\n   - Resolution timeframes\n\n6. METRICS & MONITORING\n   - Key performance indicators\n   - False positive/negative tracking\n\nFor each section, provide specific recommendations with rationale.",
    expectedScores: { clarity: 19, structure: 19, contextRelevance: 18, creativity: 16, iterativeImprovement: 16, totalScore: 88 }
  },
  {
    name: "L4-MultiStep-Poor",
    level: 4,
    taskDescription: "Write a prompt asking the AI to help debug a Python function.",
    promptText: "Fix this code:\ndef find_duplicates(lst):\n    duplicates = []\n    for i in lst:\n        if lst.count(i) > 1:\n            duplicates.append(i)\n    return duplicates",
    expectedScores: { clarity: 12, structure: 10, contextRelevance: 14, creativity: 8, iterativeImprovement: 6, totalScore: 50 }
  },
  {
    name: "L7-Complex-Medium",
    level: 7,
    taskDescription: "Write a prompt for designing a content moderation system.",
    promptText: "Design a content moderation system for a social media platform. Consider the technical side, ethics, and how to handle appeals. Make it scalable.",
    expectedScores: { clarity: 17, structure: 16, contextRelevance: 16, creativity: 16, iterativeImprovement: 15, totalScore: 80 }
  }
];

// Seed golden set prompts into database
async function seedGoldenSetPrompts() {
  const existingPrompts = await storage.getAllGoldenSetPrompts();
  
  if (existingPrompts.length > 0) {
    console.log(`[Golden Set] Already have ${existingPrompts.length} prompts, skipping seed`);
    return existingPrompts;
  }
  
  console.log('[Golden Set] Seeding 10 benchmark prompts...');
  const created = [];
  
  for (const prompt of GOLDEN_SET_PROMPTS) {
    const result = await storage.createGoldenSetPrompt(prompt);
    created.push(result);
  }
  
  console.log(`[Golden Set] Created ${created.length} benchmark prompts`);
  return created;
}

// Evaluate a single golden set prompt (reuses existing GPT evaluation)
async function evaluateGoldenSetPrompt(prompt: { level: number; taskDescription: string; promptText: string }) {
  return await evaluatePromptWithGPT(prompt.promptText, prompt.level, prompt.taskDescription);
}

// Calculate drift percentage between expected and actual scores
function calculateDrift(expected: { totalScore: number }, actual: { totalScore: number }): number {
  if (expected.totalScore === 0) return actual.totalScore > 0 ? 100 : 0;
  return Math.abs(((actual.totalScore - expected.totalScore) / expected.totalScore) * 100);
}

// Run full golden set evaluation
async function runGoldenSetEvaluation(isCalibrating = false): Promise<{
  results: Array<{
    promptName: string;
    level: number;
    expectedScore: number;
    actualScore: number;
    driftPercentage: number;
    passed: boolean;
  }>;
  overallPassed: boolean;
  testedAt: Date;
}> {
  const prompts = await storage.getAllGoldenSetPrompts();
  
  if (prompts.length === 0) {
    await seedGoldenSetPrompts();
    const newPrompts = await storage.getAllGoldenSetPrompts();
    prompts.push(...newPrompts);
  }
  
  // Initialize progress tracking
  goldenSetProgress = {
    isRunning: true,
    currentPrompt: 0,
    totalPrompts: prompts.length,
    currentPromptName: "Starting...",
    startedAt: new Date(),
    isCalibrating,
  };
  
  const results = [];
  const DRIFT_THRESHOLD = 2; // 2% drift threshold for pass/fail (smoothing makes this achievable)
  const EVALUATION_RUNS = 5; // Run each prompt 5 times and average for maximum stability
  
  console.log(`[Golden Set] Running smoothed evaluation (${EVALUATION_RUNS} runs per prompt) on ${prompts.length} benchmark prompts...`);
  
  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    
    // Update progress
    goldenSetProgress.currentPrompt = i + 1;
    goldenSetProgress.currentPromptName = prompt.name;
    
    try {
      console.log(`[Golden Set] Evaluating: ${prompt.name} (Level ${prompt.level}) - ${EVALUATION_RUNS} runs`);
      
      // Run evaluation multiple times and collect scores
      const evaluations: Array<{
        clarity: number;
        structure: number;
        contextRelevance: number;
        creativity: number;
        iterativeImprovement: number;
        totalScore: number;
      }> = [];
      
      for (let run = 0; run < EVALUATION_RUNS; run++) {
        console.log(`[Golden Set] ${prompt.name} - Run ${run + 1}/${EVALUATION_RUNS}`);
        const evaluation = await evaluateGoldenSetPrompt({
          level: prompt.level,
          taskDescription: prompt.taskDescription,
          promptText: prompt.promptText
        });
        evaluations.push(evaluation);
      }
      
      // Calculate averaged scores across all runs
      const averagedEvaluation = {
        clarity: Math.round(evaluations.reduce((sum, e) => sum + e.clarity, 0) / EVALUATION_RUNS),
        structure: Math.round(evaluations.reduce((sum, e) => sum + e.structure, 0) / EVALUATION_RUNS),
        contextRelevance: Math.round(evaluations.reduce((sum, e) => sum + e.contextRelevance, 0) / EVALUATION_RUNS),
        creativity: Math.round(evaluations.reduce((sum, e) => sum + e.creativity, 0) / EVALUATION_RUNS),
        iterativeImprovement: Math.round(evaluations.reduce((sum, e) => sum + e.iterativeImprovement, 0) / EVALUATION_RUNS),
        totalScore: Math.round(evaluations.reduce((sum, e) => sum + e.totalScore, 0) / EVALUATION_RUNS),
      };
      
      const expectedScores = prompt.expectedScores as any;
      const driftPercentage = Math.round(calculateDrift(expectedScores, averagedEvaluation) * 10) / 10; // One decimal place
      const passed = driftPercentage <= DRIFT_THRESHOLD;
      
      // Store result in database (with averaged scores)
      await storage.createGoldenSetResult({
        promptId: prompt.id,
        actualScores: averagedEvaluation,
        driftPercentage,
        passed
      });
      
      results.push({
        promptName: prompt.name,
        level: prompt.level,
        expectedScore: expectedScores.totalScore,
        actualScore: averagedEvaluation.totalScore,
        driftPercentage,
        passed
      });
      
      const runScores = evaluations.map(e => e.totalScore).join(', ');
      console.log(`[Golden Set] ${prompt.name}: Expected ${expectedScores.totalScore}, Runs [${runScores}], Avg ${averagedEvaluation.totalScore}, Drift: ${driftPercentage}%, ${passed ? 'PASS' : 'FAIL'}`);
      
    } catch (error: any) {
      console.error(`[Golden Set] Failed to evaluate ${prompt.name}:`, error.message);
      results.push({
        promptName: prompt.name,
        level: prompt.level,
        expectedScore: (prompt.expectedScores as any).totalScore,
        actualScore: 0,
        driftPercentage: 100,
        passed: false
      });
    }
  }
  
  // Mark evaluation as complete
  goldenSetProgress.isRunning = false;
  goldenSetProgress.currentPromptName = "Complete";
  
  const overallPassed = results.every(r => r.passed);
  const testedAt = new Date();
  
  console.log(`[Golden Set] Evaluation complete. Overall: ${overallPassed ? 'ALL PASS' : 'SOME FAILED'}`);
  
  return { results, overallPassed, testedAt };
}

// Daily scheduler for golden set evaluation (runs at midnight UTC)
let goldenSetSchedulerStarted = false;

export function startGoldenSetScheduler() {
  if (goldenSetSchedulerStarted) {
    console.log('[Golden Set Scheduler] Already started, skipping');
    return;
  }
  
  goldenSetSchedulerStarted = true;
  
  // Calculate time until next midnight UTC
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const timeUntilMidnight = tomorrow.getTime() - now.getTime();
  
  console.log(`[Golden Set Scheduler] Will run first evaluation in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes at ${tomorrow.toISOString()}`);
  
  // Run at next midnight, then every 24 hours
  setTimeout(() => {
    runScheduledGoldenSetEvaluation();
    
    // Then run every 24 hours
    setInterval(() => {
      runScheduledGoldenSetEvaluation();
    }, 24 * 60 * 60 * 1000);
  }, timeUntilMidnight);
}

async function runScheduledGoldenSetEvaluation() {
  console.log(`[Golden Set Scheduler] Starting scheduled evaluation at ${new Date().toISOString()}`);
  
  try {
    const result = await runGoldenSetEvaluation();
    console.log(`[Golden Set Scheduler] Completed. Pass: ${result.overallPassed}, Results: ${result.results.length}`);
  } catch (error: any) {
    console.error('[Golden Set Scheduler] Failed:', error.message);
  }
}
