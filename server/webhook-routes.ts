import type { Express, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import { storage } from "./storage";
import { getAirwallexWebhookSecret, verifyAirwallexWebhookSignature, type AirwallexWebhookEvent } from "./airwallex";
import { sendPaymentReceiptWithPdf, sendInvitationEmail, sendPartnerBulkInvitationEmail, type PdfReceiptEmailDetails } from "./email";
import { normalizeAssessmentId } from "@shared/schema";
import { db } from "./db";
import { invitations, partnerCandidateInvitations, partnerAccounts, users, type PartnerAccount } from "@shared/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

function getWebhookBaseUrl(req: Request): string {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}`;
}

function calculateNextRetryDate(failedAttempts: number): Date {
  const retryDays = [3, 5, 7];
  const daysToAdd = retryDays[Math.min(failedAttempts, retryDays.length - 1)];
  const nextRetry = new Date();
  nextRetry.setDate(nextRetry.getDate() + daysToAdd);
  return nextRetry;
}

type RawBodyRequest = Request & { rawBody?: Buffer };

export function registerWebhookRoutes(app: Express): void {

  // Single consolidated Airwallex webhook handler covering all event types
  app.post("/api/webhooks/airwallex", async (req: Request, res: Response) => {
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;
    const webhookSecret = getAirwallexWebhookSecret();

    // Determine raw body — may come from express.raw() per-route or from the global verify callback
    const rawBodyReq = req as RawBodyRequest;
    const rawBody = rawBodyReq.rawBody instanceof Buffer
      ? rawBodyReq.rawBody.toString()
      : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    // Signature verification
    if (webhookSecret) {
      if (!signature || !timestamp) {
        console.error('[Airwallex Webhook] Missing signature or timestamp headers');
        return res.status(401).json({ error: 'Missing signature headers' });
      }
      const isValid = verifyAirwallexWebhookSignature(rawBody, signature, timestamp, webhookSecret);
      if (!isValid) {
        console.error('[Airwallex Webhook] Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else {
      console.warn('[Airwallex Webhook] No webhook secret configured - signature verification skipped');
    }

    let event: AirwallexWebhookEvent;
    try {
      event = typeof req.body === 'object' && req.body !== null && 'name' in req.body
        ? req.body as AirwallexWebhookEvent
        : JSON.parse(rawBody) as AirwallexWebhookEvent;
    } catch (parseErr) {
      console.error('[Airwallex Webhook] Failed to parse event body:', parseErr);
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    console.log(`[Airwallex Webhook] Received event: ${event.name}, id: ${event.id}`);

    try {
      if (event.name === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as {
          id: string; amount?: number; currency?: string; metadata?: Record<string, string>;
        };
        const metadata = paymentIntent.metadata || {};

        // ── B2C: user purchasing results access ──
        if (metadata.isResultsPayment === 'true' && metadata.purchaseId) {
          const purchaseId = metadata.purchaseId;
          const purchase = await storage.getPurchase(purchaseId);
          if (purchase?.resultsAccessPaid) {
            console.log(`[Airwallex Webhook] Purchase ${purchaseId} already unlocked, skipping`);
            return res.json({ received: true, alreadyProcessed: true });
          }
          await storage.updatePurchase(purchaseId, { resultsAccessPaid: true });
          console.log(`[Airwallex Webhook] ✓ Unlocked results for purchase ${purchaseId}`);
          if (metadata.userId) {
            try {
              const user = await storage.getUser(metadata.userId);
              const purchaseItemsData = await storage.getPurchaseItems(purchaseId);
              const assessmentTypes = purchaseItemsData.map((item: { assessmentType: string }) => item.assessmentType);
              if (user) {
                const amount = Math.round((paymentIntent.amount || 0) * 100);
                const currency = (paymentIntent.currency || 'gbp').toLowerCase();
                const assessmentNames: Record<string, string> = {
                  'fit': 'FIT Assessment', 'ai_readiness': 'AI Readiness Assessment',
                  'prompt_architecture': 'Prompt Architecture Assessment', 'aiq': 'AIQ Assessment',
                };
                const receiptDetails: PdfReceiptEmailDetails = {
                  email: user.email, name: user.firstName || 'Customer',
                  items: assessmentTypes.map((type: string) => ({ description: assessmentNames[type] || type, amount: Math.round(amount / assessmentTypes.length) })),
                  subtotal: amount, total: amount, currency,
                  transactionId: paymentIntent.id, paymentMethod: 'Airwallex',
                };
                const result = await sendPaymentReceiptWithPdf(receiptDetails);
                if (result.success) {
                  console.log(`[Airwallex Webhook] ✓ Receipt sent to ${user.email} (Receipt: ${result.receiptNumber})`);
                }
              }
            } catch (emailError) {
              console.error('[Airwallex Webhook] Failed to send receipt email:', emailError);
            }
          }
        }

        // ── B2B: partner session results unlock ──
        if (metadata.type === 'b2b_results_unlock' && metadata.sessionId) {
          const sessionId = metadata.sessionId;
          const session = await storage.getAssessmentSession(sessionId);
          if (!session) { console.log(`[Airwallex Webhook] Session ${sessionId} not found`); return res.json({ received: true }); }
          if (session.resultsPaymentStatus === 'paid') { console.log(`[Airwallex Webhook] Session ${sessionId} already paid, skipping`); return res.json({ received: true, alreadyProcessed: true }); }

          await storage.updateAssessmentSession(sessionId, {
            resultsPaymentStatus: 'paid', resultsReleaseStatus: 'paid',
            resultsPaidAt: new Date(),
            resultsPaymentAmount: Math.round((paymentIntent.amount || 0) * 100),
            resultsPaymentCurrency: (paymentIntent.currency || 'gbp').toLowerCase(),
          } as Parameters<typeof storage.updateAssessmentSession>[1]);
          console.log(`[Airwallex Webhook] ✓ B2B session ${sessionId} marked as paid`);

          if (session.externalEmail) {
            const partner = await storage.getPartnerAccount(session.partnerId);
            const assessmentName = normalizeAssessmentId(session.assessmentType).toUpperCase().replace('_', ' ');
            const paymentAmount = Math.round((paymentIntent.amount || 0) * 100);
            const paymentCurrency = (paymentIntent.currency || 'gbp').toLowerCase();
            const assessmentNames: Record<string, string> = {
              'fit': 'FIT Assessment', 'ai_readiness': 'AI Readiness Assessment',
              'prompt_architecture': 'Prompt Architecture Assessment', 'aiq': 'AIQ Assessment',
            };
            try {
              const receiptDetails: PdfReceiptEmailDetails = {
                email: session.externalEmail,
                name: session.externalUserId || 'Candidate',
                items: [{ description: assessmentNames[session.assessmentType] || assessmentName, amount: paymentAmount }],
                subtotal: paymentAmount, total: paymentAmount, currency: paymentCurrency,
                transactionId: paymentIntent.id, paymentMethod: 'Airwallex',
              };
              const receiptResult = await sendPaymentReceiptWithPdf(receiptDetails);
              if (receiptResult.success) { console.log(`[Airwallex Webhook] ✓ B2B payment receipt sent to ${session.externalEmail} (Receipt: ${receiptResult.receiptNumber})`); }
            } catch (receiptError) { console.error('[Airwallex Webhook] Failed to send B2B payment receipt:', receiptError); }

            try {
              const { sendResultsReadyEmail } = await import('./email');
              const existingUser = await storage.getUserByEmail(session.externalEmail);
              type SessionWithMeta = { metadata?: { invitationId?: string }; partnerInvitationId?: string };
              const invitationId = (session as unknown as SessionWithMeta).metadata?.invitationId || (session as unknown as SessionWithMeta).partnerInvitationId || null;
              let autoLoginToken: string | undefined;
              if (existingUser) {
                try {
                  const crypto = await import('crypto');
                  autoLoginToken = crypto.randomUUID();
                  await storage.setAutoLoginToken(existingUser.id, autoLoginToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
                } catch (tokenErr) { console.error("[Airwallex Webhook] Failed to generate auto-login token:", tokenErr); }
              }
              await sendResultsReadyEmail({
                email: session.externalEmail, candidateName: session.externalUserId || undefined,
                assessmentTypes: [session.assessmentType],
                partnerCompanyName: partner?.companyName || partner?.name || 'HumanMetrix Partner',
                hasExistingAccount: !!existingUser, sessionId,
                partnerInvitationId: invitationId || undefined, autoLoginToken,
              });
              await storage.updateAssessmentSession(sessionId, {
                resultsEmailSentAt: new Date(), resultsDeliveryStatus: 'sent', resultsReleasedAt: new Date(),
              } as Parameters<typeof storage.updateAssessmentSession>[1]);
              console.log(`[Airwallex Webhook] ✓ Results email sent to ${session.externalEmail}`);
            } catch (emailError) {
              console.error('[Airwallex Webhook] Failed to send B2B results email:', emailError);
              type SessionWithAttempts = { resultsDeliveryAttemptCount?: number };
              const currentAttempts = (session as unknown as SessionWithAttempts).resultsDeliveryAttemptCount || 0;
              await storage.updateAssessmentSession(sessionId, {
                lastResultsDeliveryAttemptAt: new Date(), resultsDeliveryAttemptCount: currentAttempts + 1,
              } as Parameters<typeof storage.updateAssessmentSession>[1]);
            }
          }
        }

        // ── Ecosystem project payment ──
        if (metadata.type === 'ecosystem_project' && metadata.projectId) {
          const projectId = metadata.projectId;
          const project = await storage.getEcosystemProject(projectId);
          if (!project) { console.log(`[Airwallex Webhook] Ecosystem project ${projectId} not found`); return res.json({ received: true }); }
          if (project.isPaid) { console.log(`[Airwallex Webhook] Ecosystem project ${projectId} already paid, skipping`); return res.json({ received: true, alreadyProcessed: true }); }

          const ecoAmount = Math.round((paymentIntent.amount || 0) * 100);
          const ecoCurrency = (paymentIntent.currency || 'gbp').toLowerCase();
          await storage.updateEcosystemProject(projectId, { isPaid: true, paidAmount: ecoAmount, paidAt: new Date(), stripePaymentIntentId: paymentIntent.id });
          console.log(`[Airwallex Webhook] ✓ Ecosystem project ${projectId} marked as paid`);
          try {
            const ecoUser = metadata.userId ? await storage.getUser(metadata.userId) : null;
            if (ecoUser?.email) {
              const receiptDetails: PdfReceiptEmailDetails = {
                email: ecoUser.email,
                name: ecoUser.firstName || ecoUser.lastName || ecoUser.email.split('@')[0],
                items: [{ description: 'Ecosystem Team Diagnostic Report', quantity: 1, amount: ecoAmount }],
                subtotal: ecoAmount, total: ecoAmount, currency: ecoCurrency.toUpperCase(),
                transactionId: paymentIntent.id, paymentMethod: 'Airwallex',
              };
              const receiptResult = await sendPaymentReceiptWithPdf(receiptDetails);
              if (receiptResult.success) { console.log(`[Airwallex Webhook] ✓ Ecosystem receipt sent to ${ecoUser.email} (Receipt: ${receiptResult.receiptNumber})`); }
            }
          } catch (receiptError) { console.error('[Airwallex Webhook] Failed to send ecosystem receipt:', receiptError); }
        }

        // ── B2B: partner package credits ──
        if (metadata.type === 'partner_package' && metadata.packageId) {
          const packageId = metadata.packageId;
          const pkg = await storage.getPartnerTestPackage(packageId);
          if (pkg && pkg.status !== 'completed') {
            const airwallexAmount = paymentIntent.amount ? Math.round(parseFloat(String(paymentIntent.amount)) * 100) : pkg.totalPrice;
            await storage.updatePartnerTestPackage(packageId, { status: 'completed', totalPrice: airwallexAmount } as Parameters<typeof storage.updatePartnerTestPackage>[1]);
            const result = await storage.creditPartnerTests(pkg.partnerId, packageId, pkg.packageSize, `Package purchase: ${pkg.packageSize} tests (Airwallex webhook)`);
            const partner = await storage.getPartnerAccount(pkg.partnerId);
            if (partner?.apiAccessSuspendedAt) { await storage.reactivatePartnerApiAccess(pkg.partnerId); }
            console.log(`[Airwallex Webhook] Credited ${pkg.packageSize} tests to partner ${pkg.partnerId}`);
            await storage.dispatchPartnerNotification({ partnerId: pkg.partnerId, type: 'credits_purchased', title: 'Credits Purchased', message: `${pkg.packageSize} assessment credits have been added to your account via Airwallex.`, metadata: { packageId, packageSize: pkg.packageSize, newBalance: result.newBalance } });
          }
        }

        // ── B2B: enterprise invoice payment ──
        if (metadata.type === 'enterprise_invoice' && metadata.invoiceId) {
          const invoiceId = metadata.invoiceId;
          const invoice = await storage.getPartnerInvoice(invoiceId);
          if (invoice && invoice.status !== 'paid') {
            await storage.updatePartnerInvoice(invoiceId, { status: 'paid', paidAt: new Date() });
            console.log(`[Airwallex Webhook] Invoice ${invoice.invoiceNumber} marked as paid via Airwallex`);
            const partner = await storage.getPartnerAccount(invoice.partnerId);
            if (partner?.invoiceOverdueSuspendedAt) {
              const allOverdueInvoices = await storage.getOverdueInvoicesForEnforcement();
              const remainingOverdue = allOverdueInvoices.filter((o: { invoice: { partnerId: string } }) => o.invoice.partnerId === invoice.partnerId);
              if (remainingOverdue.length === 0) {
                await storage.updatePartnerAccount(invoice.partnerId, { invoiceOverdueSuspendedAt: null });
                await storage.reactivatePartnerApiAccess(invoice.partnerId);
                console.log(`[Airwallex Webhook] Restored API access for partner ${invoice.partnerId} after invoice payment`);
                await storage.dispatchPartnerNotification({ partnerId: invoice.partnerId, type: 'api_access_restored', title: 'API Access Restored', message: `Your production API keys have been reactivated following payment of invoice ${invoice.invoiceNumber}. Thank you for your payment.`, metadata: { invoiceId, invoiceNumber: invoice.invoiceNumber } });
              }
            }
            await storage.dispatchPartnerNotification({ partnerId: invoice.partnerId, type: 'invoice_paid', title: 'Invoice Paid', message: `Invoice ${invoice.invoiceNumber} has been paid successfully via Airwallex.`, metadata: { invoiceId, invoiceNumber: invoice.invoiceNumber } });
          }
        }

        // ── Clear partner billing failures on success ──
        const successPartnerId = metadata.partnerId || metadata.partner_id;
        if (successPartnerId) {
          const partner = await storage.getPartnerAccount(successPartnerId);
          if (partner && partner.failedBillingAttempts && partner.failedBillingAttempts > 0) {
            await storage.updatePartnerAccount(successPartnerId, { failedBillingAttempts: 0, lastBillingFailureAt: null, billingFailureReason: null, nextBillingRetryAt: null, billingStatusOverride: null, lastBilledAt: new Date() });
            console.log(`[Airwallex Webhook] Cleared billing failures for partner ${successPartnerId}`);
          }
        }
      }

      if (event.name === 'payment_intent.payment_failed' || event.name === 'payment_intent.requires_payment_method') {
        const paymentIntent = event.data.object as { metadata?: Record<string, string>; failure_reason?: string; amount?: number };
        const partnerId = paymentIntent.metadata?.partnerId || paymentIntent.metadata?.partner_id;
        if (partnerId) {
          console.log(`[Airwallex Webhook] Payment failed for partner ${partnerId}`);
          const partner = await storage.getPartnerAccount(partnerId);
          if (partner) {
            const failureReason = paymentIntent.failure_reason || 'payment_failed';
            const amountDue = paymentIntent.amount || 0;
            const newAttempts = (partner.failedBillingAttempts || 0) + 1;
            const nextRetry = newAttempts < 3 ? calculateNextRetryDate(newAttempts) : null;
            const isSuspended = newAttempts >= 3;
            await storage.updatePartnerAccount(partnerId, { failedBillingAttempts: newAttempts, lastBillingFailureAt: new Date(), billingFailureReason: failureReason, nextBillingRetryAt: nextRetry, billingStatusOverride: isSuspended ? 'suspended_billing_failure' : null });
            const baseUrl = getWebhookBaseUrl(req);
            const { sendBillingFailureNotification, sendBillingFailureAdminNotification } = await import('./email');
            await sendBillingFailureNotification({ partnerEmail: partner.billingEmail || partner.email, companyName: partner.companyName, failureReason, failedAttempts: newAttempts, amountDue, currency: partner.currency || 'GBP', nextRetryDate: nextRetry || undefined, updatePaymentUrl: `${baseUrl}/partner-dashboard?tab=billing` });
            await sendBillingFailureAdminNotification({ partnerId: partner.id, companyName: partner.companyName, partnerEmail: partner.email, failureReason, failedAttempts: newAttempts, amountDue, currency: partner.currency || 'GBP', billingType: partner.billingType });
            console.log(`[Airwallex Webhook] Recorded payment failure for partner ${partnerId} (attempt ${newAttempts}/3)`);
          }
        }
      }

      return res.json({ received: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Airwallex Webhook ERROR]', error);
      return res.status(500).json({ error: msg });
    }
  });

  app.post("/api/webhooks/stripe", express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    try {
      if (webhookSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        event = JSON.parse(req.body.toString()) as Stripe.Event;
        console.warn('[Stripe Webhook] No webhook secret configured - signature verification skipped');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Stripe Webhook] Signature verification failed:', msg);
      return res.status(400).json({ error: `Webhook Error: ${msg}` });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}, id: ${event.id}`);

    const lockAcquired = await storage.acquireStripeEventLock(event.id, event.type);
    if (!lockAcquired) {
      console.log(`[Stripe Webhook] Event ${event.id} already processed or locked - skipping`);
      return res.json({ received: true, skipped: true });
    }

    let eventStatus: 'processed' | 'failed' = 'processed';
    let errorMessage: string | undefined;

    try {
      switch (event.type) {
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const partnerId = paymentIntent.metadata?.partner_id;
          if (partnerId) {
            console.log(`[Stripe Webhook] Payment failed for partner ${partnerId}: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`);
            const partner = await storage.getPartnerAccount(partnerId);
            if (partner) {
              const failureReason = paymentIntent.last_payment_error?.code || 'card_declined';
              const amountDue = paymentIntent.amount || 0;
              if (!partner.lastBillingFailureAt || (new Date().getTime() - new Date(partner.lastBillingFailureAt).getTime()) > 60000) {
                const newAttempts = (partner.failedBillingAttempts || 0) + 1;
                const nextRetry = newAttempts < 3 ? calculateNextRetryDate(newAttempts) : null;
                const isSuspended = newAttempts >= 3;
                await storage.updatePartnerAccount(partnerId, { failedBillingAttempts: newAttempts, lastBillingFailureAt: new Date(), billingFailureReason: failureReason, nextBillingRetryAt: nextRetry, billingStatusOverride: isSuspended ? 'suspended_billing_failure' : null });
                const baseUrl = getWebhookBaseUrl(req);
                const { sendBillingFailureNotification, sendBillingFailureAdminNotification } = await import('./email');
                await sendBillingFailureNotification({ partnerEmail: partner.billingEmail || partner.email, companyName: partner.companyName, failureReason, failedAttempts: newAttempts, amountDue, currency: partner.currency || 'GBP', nextRetryDate: nextRetry || undefined, updatePaymentUrl: `${baseUrl}/partner-dashboard?tab=billing` });
                await sendBillingFailureAdminNotification({ partnerId: partner.id, companyName: partner.companyName, partnerEmail: partner.email, failureReason, failedAttempts: newAttempts, amountDue, currency: partner.currency || 'GBP', billingType: partner.billingType });
                console.log(`[Stripe Webhook] Recorded payment failure for partner ${partnerId} (attempt ${newAttempts}/3)`);
              }
            }
          }
          break;
        }

        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const partnerId = paymentIntent.metadata?.partner_id;
          if (partnerId) {
            console.log(`[Stripe Webhook] Payment succeeded for partner ${partnerId}`);
            const partner = await storage.getPartnerAccount(partnerId);
            if (partner && partner.failedBillingAttempts && partner.failedBillingAttempts > 0) {
              await storage.updatePartnerAccount(partnerId, { failedBillingAttempts: 0, lastBillingFailureAt: null, billingFailureReason: null, nextBillingRetryAt: null, billingStatusOverride: null, lastBilledAt: new Date() });
              console.log(`[Stripe Webhook] Cleared billing failures for partner ${partnerId}`);
            }
          }
          break;
        }

        case 'payment_method.updated': {
          const paymentMethod = event.data.object as Stripe.PaymentMethod;
          const customerId = paymentMethod.customer as string | null;
          if (customerId && paymentMethod.card) {
            const partners = await storage.getAllPartnerAccounts();
            const partner = partners.find((p: PartnerAccount) => p.stripeCustomerId === customerId);
            if (partner) {
              await storage.updatePartnerAccount(partner.id, { cardLast4: paymentMethod.card!.last4, cardBrand: paymentMethod.card!.brand, cardExpiryMonth: paymentMethod.card!.exp_month, cardExpiryYear: paymentMethod.card!.exp_year, cardExpiryWarningsSent: 0 });
              console.log(`[Stripe Webhook] Updated card info for partner ${partner.id}`);
            }
          }
          break;
        }

        case 'customer.source.expiring': {
          const source = event.data.object as { customer?: string };
          const customerId = source.customer;
          if (customerId) {
            const partners = await storage.getAllPartnerAccounts();
            const partner = partners.find((p: PartnerAccount) => p.stripeCustomerId === customerId);
            if (partner) { console.log(`[Stripe Webhook] Card expiring soon for partner ${partner.id}`); }
          }
          break;
        }

        case 'payment_intent.requires_action': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const partnerId = paymentIntent.metadata?.partnerId || paymentIntent.metadata?.partner_id;
          const autoTopUp = paymentIntent.metadata?.autoTopUp === 'true';
          if (partnerId && autoTopUp) {
            console.log(`[Stripe Webhook] 3DS authentication required for auto top-up, partner ${partnerId}`);
            const partner = await storage.getPartnerAccount(partnerId);
            if (partner && partner.autoTopUpPackage) {
              await storage.createAutoTopUpRetry({ partnerId, packageTier: partner.autoTopUpPackage, nextRetryAt: new Date(Date.now() + 24 * 60 * 60 * 1000), lastError: 'Requires 3DS authentication - customer action needed', paymentIntentId: paymentIntent.id, requires3DS: true });
              const emailModule = await import('./email') as Record<string, unknown>;
              const send3DS = emailModule.sendPayment3DSRequiredEmail;
              if (typeof send3DS === 'function') {
                type Send3DSFn = (email: string, company: string, amount: number, currency: string) => Promise<void>;
                await (send3DS as Send3DSFn)(partner.email, partner.companyName || partner.name, paymentIntent.amount / 100, 'GBP');
              }
            }
          }
          break;
        }

        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }

      return res.json({ received: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Stripe Webhook ERROR]', error);
      eventStatus = 'failed';
      errorMessage = msg;
      return res.status(500).json({ error: msg });
    } finally {
      try {
        const dataObj = (event.data as { object?: Record<string, unknown> }).object || {};
        await storage.markStripeEventProcessed(event.id, event.type, eventStatus, {
          partnerId: (dataObj as { metadata?: { partnerId?: string; partner_id?: string } }).metadata?.partnerId || (dataObj as { metadata?: { partner_id?: string } }).metadata?.partner_id,
          paymentIntentId: (dataObj as { id?: string }).id,
          ...(errorMessage ? { error: errorMessage } : {}),
        });
      } catch (markError) {
        console.error('[Stripe Webhook] Failed to mark event status:', markError);
      }
    }
  });

  app.post("/api/webhooks/sendgrid", express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    try {
      const publicKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
      const signature = req.headers['x-twilio-email-event-webhook-signature'] as string;
      const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] as string;
      const isDevelopment = process.env.NODE_ENV === 'development';
      const allowUnsignedInDev = process.env.SENDGRID_ALLOW_UNSIGNED_WEBHOOKS === 'true';

      if (!publicKey) {
        if (isDevelopment && allowUnsignedInDev) {
          console.warn('[SendGrid Webhook] DEV MODE: No verification key - allowing unsigned request');
        } else {
          console.error('[SendGrid Webhook] REJECTED: No verification key configured');
          return res.status(403).json({ error: 'Webhook verification not configured' });
        }
      } else {
        if (!signature || !timestamp) {
          console.warn('[SendGrid Webhook] REJECTED: Missing signature headers');
          return res.status(403).json({ error: 'Missing signature headers' });
        }
        try {
          const { EventWebhook } = await import('@sendgrid/eventwebhook');
          const eventWebhook = new EventWebhook();
          const ecPublicKey = eventWebhook.convertPublicKeyToECDSA(publicKey);
          const rawBodyReq = req as RawBodyRequest;
          const bodyForVerification = rawBodyReq.rawBody instanceof Buffer ? rawBodyReq.rawBody : req.body;
          const isValid = eventWebhook.verifySignature(ecPublicKey, bodyForVerification, signature, timestamp);
          if (!isValid) {
            console.warn('[SendGrid Webhook] REJECTED: Invalid signature');
            return res.status(403).json({ error: 'Invalid signature' });
          }
          console.log('[SendGrid Webhook] Signature verified successfully');
        } catch (verifyError: unknown) {
          const msg = verifyError instanceof Error ? verifyError.message : String(verifyError);
          console.error('[SendGrid Webhook] REJECTED: Signature verification error:', msg);
          return res.status(403).json({ error: 'Signature verification failed' });
        }
      }

      let rawBody: string;
      const rawBodyReq = req as RawBodyRequest;
      if (rawBodyReq.rawBody instanceof Buffer) {
        rawBody = rawBodyReq.rawBody.toString();
      } else if (req.body instanceof Buffer) {
        rawBody = req.body.toString();
      } else if (typeof req.body === 'string') {
        rawBody = req.body;
      } else {
        rawBody = JSON.stringify(req.body);
      }
      const events = JSON.parse(rawBody);
      const eventList: Array<{ event: string; email?: string; reason?: string; response?: string }> = Array.isArray(events) ? events : [events];
      console.log(`[SendGrid Webhook] Received ${eventList.length} event(s)`);

      for (const sgEvent of eventList) {
        const eventType = sgEvent.event;
        const email = sgEvent.email?.toLowerCase();

        if (['bounce', 'dropped', 'blocked'].includes(eventType) && email) {
          console.log(`[SendGrid Webhook] Email ${eventType} for: ${email}, reason: ${sgEvent.reason || sgEvent.response || 'Unknown'}`);
          const bounceReason = sgEvent.reason || sgEvent.response || `Email ${eventType}`;

          const regularInvitations = await db.select().from(invitations).where(eq(invitations.candidateEmail, email));
          for (const invitation of regularInvitations) {
            if (!invitation.emailBounced) {
              await db.update(invitations)
                .set({ emailBounced: true, bounceReason: `SendGrid ${eventType}: ${bounceReason} - Retrying via Gmail...`, bouncedAt: new Date() })
                .where(eq(invitations.id, invitation.id));
              const sentByUser = await db.select().from(users).where(eq(users.id, invitation.sentBy)).limit(1);
              const inviterName = sentByUser[0]?.firstName || 'HumanMetrix';
              const retryResult = await sendInvitationEmail(invitation, inviterName, { forceGmail: true });
              if (retryResult?.success) {
                await db.update(invitations)
                  .set({ emailBounced: false, bounceReason: `SendGrid ${eventType}: ${bounceReason} - Auto-retried via Gmail successfully` })
                  .where(eq(invitations.id, invitation.id));
              } else {
                await db.update(invitations)
                  .set({ bounceReason: `SendGrid ${eventType}: ${bounceReason} - Gmail retry also failed` })
                  .where(eq(invitations.id, invitation.id));
              }
            }
          }

          const partnerInvitationsList = await db.select().from(partnerCandidateInvitations).where(eq(partnerCandidateInvitations.email, email));
          for (const invitation of partnerInvitationsList) {
            if (!invitation.emailBounced) {
              await db.update(partnerCandidateInvitations)
                .set({ emailBounced: true, bounceReason: `SendGrid ${eventType}: ${bounceReason} - Retrying via Gmail...`, bouncedAt: new Date() })
                .where(eq(partnerCandidateInvitations.id, invitation.id));
              const partner = await db.select().from(partnerAccounts).where(eq(partnerAccounts.id, invitation.partnerId)).limit(1);
              if (partner[0]) {
                const retryResult = await sendPartnerBulkInvitationEmail({
                  candidateEmail: invitation.email || email, candidateName: invitation.name || undefined,
                  assessmentTypes: invitation.assessmentTypes || [], inviteToken: invitation.inviteToken,
                  partnerCompanyName: partner[0].companyName, partnerLogoUrl: partner[0].logoUrl,
                  partnerPrimaryColor: (partner[0] as PartnerAccount & { primaryColor?: string }).primaryColor,
                  expiresAt: invitation.expiresAt || undefined,
                }, { forceGmail: true });
                if (retryResult.success) {
                  await db.update(partnerCandidateInvitations)
                    .set({ emailBounced: false, bounceReason: `SendGrid ${eventType}: ${bounceReason} - Auto-retried via Gmail successfully` })
                    .where(eq(partnerCandidateInvitations.id, invitation.id));
                } else {
                  await db.update(partnerCandidateInvitations)
                    .set({ bounceReason: `SendGrid ${eventType}: ${bounceReason} - Gmail retry also failed` })
                    .where(eq(partnerCandidateInvitations.id, invitation.id));
                }
              }
            }
          }
        }

        if (eventType === 'delivered' && email) {
          await db.update(partnerCandidateInvitations)
            .set({ emailDelivered: true, deliveredAt: new Date() })
            .where(eq(partnerCandidateInvitations.email, email));
        }

        if (eventType === 'deferred' && email) {
          console.log(`[SendGrid Webhook] Email deferred for: ${email} - will be retried automatically`);
        }
      }

      return res.json({ received: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[SendGrid Webhook ERROR]', error);
      return res.status(500).json({ error: msg });
    }
  });
}
