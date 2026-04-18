import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";
import { normalizeAssessmentId, ASSESSMENT_PRICES, BASE_FEE } from "@shared/schema";
import { getPricingTier, getStripeCurrencyCode, COUNTRY_CURRENCY_MAP, calculateCandidatePricing } from "@shared/currencies";
import { sendWelcomeEmailWithPassword } from "./email";
import { generateTemporaryPassword } from "./passwordUtils";
import { getExchangeRates } from "./exchange-rates";
import { createPaymentIntent, formatAmountForAirwallex, airwallexEnv } from "./airwallex";
import { getPaymentProviders, createCheckoutWithFallback, type PaymentCheckoutResult } from "./payment-routing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

const B2C_DISCOUNT_CODES: Record<string, number> = {
  'FREE': 100,
  '20OFFPRICE': 20,
  'DISCOUNT': 99,
};

function getPaymentBaseUrl(req: Request): string {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}`;
}

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; role: string };
}

export function registerPaymentRoutes(app: Express): void {
  app.post("/api/validate-discount", async (req: Request, res: Response) => {
    try {
      const { code } = req.body as { code?: unknown };
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ valid: false, message: "Code is required" });
      }
      const normalized = code.trim().toUpperCase();
      const discountPercent = B2C_DISCOUNT_CODES[normalized];
      if (discountPercent !== undefined) {
        return res.json({ valid: true, discountPercent, message: `${discountPercent}% discount applied` });
      }
      return res.json({ valid: false, message: "Invalid promo code" });
    } catch (error) {
      return res.status(500).json({ valid: false, message: "Failed to validate code" });
    }
  });

  app.get("/api/exchange-rates", async (_req: Request, res: Response) => {
    try {
      const rates = await getExchangeRates();
      return res.json(rates);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Exchange Rates] Error fetching rates:', msg);
      return res.status(500).json({ error: 'Failed to fetch exchange rates' });
    }
  });

  app.post("/api/checkout-free", async (req: Request, res: Response) => {
    try {
      const { assessmentIds, customerEmail, customerName, firstName, lastName } = req.body as {
        assessmentIds?: unknown; customerEmail?: unknown; customerName?: unknown;
        firstName?: unknown; lastName?: unknown;
      };

      if (!assessmentIds || !Array.isArray(assessmentIds) || assessmentIds.length === 0) {
        return res.status(400).json({ message: "Invalid assessment selection" });
      }
      if (!customerEmail || !customerName || !firstName || !lastName) {
        return res.status(400).json({ message: "Customer details required" });
      }

      const existingUser = await storage.getUserByEmail(String(customerEmail));
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists. Please log in instead." });
      }

      const temporaryPassword = generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
      const newUser = await storage.createUser({
        email: String(customerEmail),
        passwordHash: hashedPassword,
        firstName: String(firstName),
        lastName: String(lastName),
        role: 'candidate',
      });

      const purchase = await storage.createPurchase({
        userId: newUser.id,
        stripeSessionId: `free_${Date.now()}`,
        totalAmount: 0,
        baseFee: 0,
        status: "completed",
      });

      for (const assessmentId of assessmentIds) {
        await storage.createPurchaseItem({
          purchaseId: purchase.id,
          assessmentType: String(assessmentId),
          price: 0,
          status: "ready",
        });
      }

      const crypto = await import("crypto");
      const autoLoginToken = crypto.randomUUID();
      await storage.setAutoLoginToken(newUser.id, autoLoginToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

      try {
        await sendWelcomeEmailWithPassword(String(customerEmail), `${firstName} ${lastName}`, temporaryPassword, undefined, 'post_payment', autoLoginToken);
      } catch (emailError) {
        console.error("✗ Failed to send welcome email:", emailError);
      }

      return res.json({ success: true, message: "Account created successfully! Check your email for login credentials." });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error processing free checkout:", error);
      return res.status(500).json({ message: "Failed to process free checkout: " + msg });
    }
  });

  app.post("/api/create-free-purchase", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { assessmentIds } = req.body as { assessmentIds?: unknown };
      const userId = (req as AuthenticatedRequest).user.id;

      if (!assessmentIds || !Array.isArray(assessmentIds) || assessmentIds.length === 0) {
        return res.status(400).json({ message: "Invalid assessment selection" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const purchase = await storage.createPurchase({
        userId,
        stripeSessionId: `free_${Date.now()}_${userId}`,
        totalAmount: 0,
        baseFee: 0,
        status: "completed",
        resultsAccessPaid: false,
        completedAt: new Date(),
      });

      for (const assessmentId of assessmentIds) {
        const normalizedId = normalizeAssessmentId(String(assessmentId));
        await storage.createPurchaseItem({
          purchaseId: purchase.id,
          assessmentType: normalizedId,
          price: 0,
          status: "ready",
        });
      }

      return res.json({
        success: true,
        message: "Assessments added to your account! You can now take them for free.",
        purchaseId: purchase.id,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error creating free purchase:", error);
      return res.status(500).json({ message: "Failed to create free purchase: " + msg });
    }
  });

  app.post("/api/create-checkout-session-guest", async (req: Request, res: Response) => {
    try {
      const { assessmentIds, customerEmail, customerName, firstName, lastName, countryCode } = req.body as {
        assessmentIds?: unknown; customerEmail?: unknown; customerName?: unknown;
        firstName?: unknown; lastName?: unknown; countryCode?: unknown;
      };

      if (!assessmentIds || !Array.isArray(assessmentIds) || assessmentIds.length === 0) {
        return res.status(400).json({ message: "Invalid assessment selection" });
      }
      if (!customerEmail || !customerName || !firstName || !lastName) {
        return res.status(400).json({ message: "Customer details required" });
      }

      const existingUser = await storage.getUserByEmail(String(customerEmail));
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists. Please log in instead." });
      }

      const userCountry = (countryCode ? String(countryCode) : 'GB');
      const pricingTier = getPricingTier(userCountry);
      const stripeCurrency = getStripeCurrencyCode(userCountry);
      const localCurrencyCode = COUNTRY_CURRENCY_MAP[userCountry.toUpperCase()] || 'GBP';

      for (const assessmentId of assessmentIds) {
        const normalizedId = normalizeAssessmentId(String(assessmentId));
        if (!ASSESSMENT_PRICES[normalizedId]) {
          return res.status(400).json({ message: `Invalid assessment: ${assessmentId}` });
        }
      }

      const guestItems = assessmentIds.map((id: unknown) => {
        const normalizedId = normalizeAssessmentId(String(id));
        return { type: normalizedId, priceInPence: ASSESSMENT_PRICES[normalizedId] || 0 };
      });
      const guestPricing = calculateCandidatePricing(userCountry, guestItems, BASE_FEE, {});

      const assessmentNameMap: Record<string, string> = {
        "fit": "FIT", "ai_readiness": "AI Readiness",
        "prompt_architecture": "Prompt Architecture", "aiq": "AIQ",
      };
      const assessmentNamesList = assessmentIds.map((id: unknown) => assessmentNameMap[normalizeAssessmentId(String(id))] || normalizeAssessmentId(String(id))).join(", ");

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{
        price_data: {
          currency: stripeCurrency,
          product_data: { name: `HumanMetrix Assessment: ${assessmentNamesList}`, description: `Base computation fee + ${assessmentIds.length} assessment${assessmentIds.length > 1 ? 's' : ''}` },
          unit_amount: guestPricing.stripeAmount,
        },
        quantity: 1,
      }];

      const baseUrl = getPaymentBaseUrl(req);
      const guestMeta = {
        customerEmail: String(customerEmail), customerName: String(customerName),
        firstName: String(firstName), lastName: String(lastName),
        assessmentIds: JSON.stringify(assessmentIds), isGuestCheckout: "true",
        countryCode: userCountry, pricingTier, localCurrency: localCurrencyCode,
      };

      const { primary: guestPrimary, fallback: guestFallback } = getPaymentProviders('airwallex');

      const airwallexGuestFn = async (): Promise<PaymentCheckoutResult> => {
        const airwallexAmount = formatAmountForAirwallex(guestPricing.stripeAmount, stripeCurrency.toUpperCase());
        const merchantOrderId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const intent = await createPaymentIntent({
          amount: airwallexAmount, currency: stripeCurrency.toUpperCase(), merchantOrderId,
          returnUrl: `${baseUrl}/purchase/success`,
          customerEmail: String(customerEmail),
          description: `HumanMetrix Assessment Purchase (${assessmentIds.length} assessment${assessmentIds.length > 1 ? 's' : ''})`,
          metadata: guestMeta,
        });
        return { provider: 'airwallex', intentId: intent.id, clientSecret: intent.clientSecret, amount: airwallexAmount, currency: stripeCurrency.toUpperCase(), returnUrl: `${baseUrl}/purchase/success` };
      };

      const stripeGuestFn = async (): Promise<PaymentCheckoutResult> => {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'], adaptive_pricing: { enabled: false },
          customer_email: String(customerEmail), line_items: lineItems, mode: "payment",
          allow_promotion_codes: true,
          success_url: `${baseUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/dashboard?payment=cancelled`, metadata: guestMeta,
        });
        return { provider: 'stripe', url: session.url || undefined, sessionId: session.id };
      };

      const guestResult = await createCheckoutWithFallback(guestPrimary, guestFallback, airwallexGuestFn, stripeGuestFn);

      if (guestResult.provider === 'airwallex') {
        return res.json({ provider: 'airwallex', airwallexEnv, intentId: guestResult.intentId, clientSecret: guestResult.clientSecret, currency: guestResult.currency, countryCode: userCountry, amount: guestResult.amount, returnUrl: guestResult.returnUrl });
      }
      return res.json({ provider: 'stripe', url: guestResult.url });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error creating guest checkout session:", error);
      return res.status(500).json({ message: "Failed to create checkout session: " + msg });
    }
  });

  app.post("/api/create-checkout-session", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { assessmentIds, countryCode } = req.body as { assessmentIds?: unknown; countryCode?: unknown };
      const userId = (req as AuthenticatedRequest).user.id;

      if (!assessmentIds || !Array.isArray(assessmentIds) || assessmentIds.length === 0) {
        return res.status(400).json({ message: "Invalid assessment selection" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userCountry = (countryCode ? String(countryCode) : 'GB');
      const pricingTier = getPricingTier(userCountry);
      const stripeCurrency = getStripeCurrencyCode(userCountry);
      const localCurrencyCode = COUNTRY_CURRENCY_MAP[userCountry.toUpperCase()] || 'GBP';

      for (const assessmentId of assessmentIds) {
        const normalizedId = normalizeAssessmentId(String(assessmentId));
        if (!ASSESSMENT_PRICES[normalizedId]) {
          return res.status(400).json({ message: `Invalid assessment: ${assessmentId}` });
        }
      }

      const checkoutItems = assessmentIds.map((id: unknown) => {
        const normalizedId = normalizeAssessmentId(String(id));
        return { type: normalizedId, priceInPence: ASSESSMENT_PRICES[normalizedId] || 0 };
      });
      const checkoutPricingResult = calculateCandidatePricing(userCountry, checkoutItems, BASE_FEE, {});

      const assessmentNameMap: Record<string, string> = {
        "fit": "FIT", "ai_readiness": "AI Readiness",
        "prompt_architecture": "Prompt Architecture", "aiq": "AIQ",
      };
      const checkoutAssessmentNames = assessmentIds.map((id: unknown) => assessmentNameMap[normalizeAssessmentId(String(id))] || normalizeAssessmentId(String(id))).join(", ");

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{
        price_data: {
          currency: stripeCurrency,
          product_data: { name: `HumanMetrix Assessment: ${checkoutAssessmentNames}`, description: `Base computation fee + ${assessmentIds.length} assessment${assessmentIds.length > 1 ? 's' : ''}` },
          unit_amount: checkoutPricingResult.stripeAmount,
        },
        quantity: 1,
      }];

      const baseUrl = getPaymentBaseUrl(req);
      const checkoutMeta = {
        userId: userId.toString(), assessmentIds: JSON.stringify(assessmentIds),
        countryCode: userCountry, pricingTier, localCurrency: localCurrencyCode,
      };

      const { primary, fallback } = getPaymentProviders('airwallex');

      const airwallexCheckoutFn = async (): Promise<PaymentCheckoutResult> => {
        const airwallexAmount = formatAmountForAirwallex(checkoutPricingResult.stripeAmount, stripeCurrency.toUpperCase());
        const merchantOrderId = `checkout_${userId}_${Date.now()}`;
        const intent = await createPaymentIntent({
          amount: airwallexAmount, currency: stripeCurrency.toUpperCase(), merchantOrderId,
          returnUrl: `${baseUrl}/purchase/success`, customerEmail: user.email,
          description: `HumanMetrix Assessment Purchase (${assessmentIds.length} assessment${assessmentIds.length > 1 ? 's' : ''})`,
          metadata: checkoutMeta,
        });
        return { provider: 'airwallex', intentId: intent.id, clientSecret: intent.clientSecret, amount: airwallexAmount, currency: stripeCurrency.toUpperCase(), returnUrl: `${baseUrl}/purchase/success` };
      };

      const stripeCheckoutFn = async (): Promise<PaymentCheckoutResult> => {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'], adaptive_pricing: { enabled: false },
          customer_email: user.email, line_items: lineItems, mode: "payment",
          allow_promotion_codes: true,
          success_url: `${baseUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/dashboard?payment=cancelled`, metadata: checkoutMeta,
        });
        return { provider: 'stripe', url: session.url || undefined, sessionId: session.id };
      };

      const checkoutResult = await createCheckoutWithFallback(primary, fallback, airwallexCheckoutFn, stripeCheckoutFn);

      if (checkoutResult.provider === 'airwallex') {
        return res.json({ provider: 'airwallex', airwallexEnv, intentId: checkoutResult.intentId, clientSecret: checkoutResult.clientSecret, amount: checkoutResult.amount, currency: checkoutResult.currency, returnUrl: checkoutResult.returnUrl });
      }
      return res.json({ provider: 'stripe', url: checkoutResult.url });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error creating checkout session:", error);
      return res.status(500).json({ message: "Failed to create checkout session: " + msg });
    }
  });
}
