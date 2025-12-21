import Stripe from "stripe";
import { storage } from "./storage";
import { PartnerAccount, UsageEvent, AssessmentSession } from "@shared/schema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

export interface UsageReportResult {
  success: boolean;
  usageRecordId?: string;
  error?: string;
}

export async function reportUsageToStripe(
  partner: PartnerAccount,
  usageEvent: UsageEvent,
  quantity: number = 1
): Promise<UsageReportResult> {
  if (!partner.stripeSubscriptionId) {
    console.log(`[Partner Billing] Partner ${partner.id} has no Stripe subscription - skipping usage report`);
    return { success: false, error: "No Stripe subscription configured" };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(partner.stripeSubscriptionId);
    
    const meteredItem = subscription.items.data.find((item: any) => {
      const price = item.price as Stripe.Price;
      return price.recurring?.usage_type === "metered";
    });

    if (!meteredItem) {
      console.log(`[Partner Billing] No metered subscription item found for partner ${partner.id}`);
      return { success: false, error: "No metered subscription item found" };
    }

    // Report usage using the billing meter event API
    const usageRecord = await (stripe as any).billing.meterEvents.create({
      event_name: "assessment_completed",
      payload: {
        stripe_customer_id: partner.stripeCustomerId,
        value: quantity.toString(),
      },
      timestamp: Math.floor(Date.now() / 1000),
    });

    console.log(`[Partner Billing] Reported ${quantity} usage for partner ${partner.id}`);

    return { success: true, usageRecordId: usageRecord?.id };
  } catch (error: any) {
    console.error(`[Partner Billing] Failed to report usage for partner ${partner.id}:`, error.message);
    return { success: false, error: error.message };
  }
}

export async function getPartnerBillingInfo(partnerId: string): Promise<{
  currentPeriodUsage: number;
  currentPeriodCost: number;
  billingPeriodStart: Date | null;
  billingPeriodEnd: Date | null;
  invoices: any[];
  upcomingInvoice: any | null;
}> {
  const partner = await storage.getPartnerAccount(partnerId);
  
  if (!partner) {
    throw new Error("Partner not found");
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Use existing storage method
  const usageEvents = await storage.getUsageEventsByPartner(partnerId, monthStart, monthEnd);
  const billableEvents = usageEvents.filter((e: UsageEvent) => e.billable);

  const currentPeriodUsage = billableEvents.length;
  const pricePerAssessment = partner.pricePerAssessment ?? 500;
  const currentPeriodCost = currentPeriodUsage * pricePerAssessment;

  let invoices: any[] = [];
  let upcomingInvoice: any = null;

  if (partner.stripeCustomerId) {
    try {
      const stripeInvoices = await stripe.invoices.list({
        customer: partner.stripeCustomerId,
        limit: 10,
      });
      invoices = stripeInvoices.data.map((inv: Stripe.Invoice) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amount: inv.amount_due,
        currency: inv.currency,
        createdAt: new Date(inv.created * 1000),
        paidAt: inv.status_transitions?.paid_at
          ? new Date(inv.status_transitions.paid_at * 1000)
          : null,
        hostedInvoiceUrl: inv.hosted_invoice_url,
        pdfUrl: inv.invoice_pdf,
      }));
    } catch (error: any) {
      console.error(`[Partner Billing] Failed to fetch invoices:`, error.message);
    }

    try {
      const upcoming = await (stripe.invoices as any).upcoming({
        customer: partner.stripeCustomerId,
      });
      upcomingInvoice = {
        amount: upcoming.amount_due,
        currency: upcoming.currency,
        periodStart: upcoming.period_start
          ? new Date(upcoming.period_start * 1000)
          : null,
        periodEnd: upcoming.period_end
          ? new Date(upcoming.period_end * 1000)
          : null,
        lines: upcoming.lines?.data?.map((line: any) => ({
          description: line.description,
          amount: line.amount,
          quantity: line.quantity,
        })),
      };
    } catch (error: any) {
      if (error.code !== "invoice_upcoming_none") {
        console.error(`[Partner Billing] Failed to fetch upcoming invoice:`, error.message);
      }
    }
  }

  return {
    currentPeriodUsage,
    currentPeriodCost,
    billingPeriodStart: monthStart,
    billingPeriodEnd: monthEnd,
    invoices,
    upcomingInvoice,
  };
}

export async function createStripeCustomerForPartner(
  partner: PartnerAccount
): Promise<{ customerId: string } | null> {
  if (partner.stripeCustomerId) {
    return { customerId: partner.stripeCustomerId };
  }

  try {
    const customer = await stripe.customers.create({
      email: partner.billingEmail || partner.email,
      name: partner.companyName,
      metadata: {
        partnerId: partner.id,
        partnerName: partner.name,
      },
    });

    await storage.updatePartnerAccount(partner.id, {
      stripeCustomerId: customer.id,
    });

    console.log(`[Partner Billing] Created Stripe customer ${customer.id} for partner ${partner.id}`);
    return { customerId: customer.id };
  } catch (error: any) {
    console.error(`[Partner Billing] Failed to create Stripe customer:`, error.message);
    return null;
  }
}

export async function createMeteredSubscription(
  partner: PartnerAccount,
  priceId: string
): Promise<{ subscriptionId: string } | null> {
  if (!partner.stripeCustomerId) {
    const result = await createStripeCustomerForPartner(partner);
    if (!result) return null;
    partner = (await storage.getPartnerAccount(partner.id))!;
  }

  try {
    const subscription = await stripe.subscriptions.create({
      customer: partner.stripeCustomerId!,
      items: [
        {
          price: priceId,
        },
      ],
      metadata: {
        partnerId: partner.id,
        partnerName: partner.name,
      },
    });

    await storage.updatePartnerAccount(partner.id, {
      stripeSubscriptionId: subscription.id,
    });

    console.log(`[Partner Billing] Created subscription ${subscription.id} for partner ${partner.id}`);
    return { subscriptionId: subscription.id };
  } catch (error: any) {
    console.error(`[Partner Billing] Failed to create subscription:`, error.message);
    return null;
  }
}

export async function getMonthlyUsageSummary(partnerId: string): Promise<{
  totalSessions: number;
  completedSessions: number;
  totalBilledAmount: number;
  byAssessmentType: Record<string, number>;
}> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Use existing storage method
  const usageEvents = await storage.getUsageEventsByPartner(partnerId, monthStart, monthEnd);
  const billableEvents = usageEvents.filter((e: UsageEvent) => e.billable);

  const byAssessmentType: Record<string, number> = {};
  let completedSessions = 0;
  let totalBilledAmount = 0;

  for (const event of billableEvents) {
    if (event.eventType === "session_completed") {
      completedSessions++;
      if (event.assessmentType) {
        byAssessmentType[event.assessmentType] = (byAssessmentType[event.assessmentType] || 0) + 1;
      }
    }
    if (event.billedAmount) {
      totalBilledAmount += event.billedAmount;
    }
  }

  // Get all sessions for the month
  const allUsageEvents = await storage.getUsageEventsByPartner(partnerId, monthStart, monthEnd);
  const sessionCreatedEvents = allUsageEvents.filter((e: UsageEvent) => e.eventType === "session_created");

  return {
    totalSessions: sessionCreatedEvents.length,
    completedSessions,
    totalBilledAmount,
    byAssessmentType,
  };
}

// Report billable usage when a session is completed
export async function recordBillableUsage(
  partner: PartnerAccount,
  session: AssessmentSession
): Promise<void> {
  const pricePerAssessment = partner.pricePerAssessment ?? 500;
  
  // Create billable usage event
  const usageEvent = await storage.createUsageEvent({
    partnerId: partner.id,
    apiKeyId: session.apiKeyId,
    sessionId: session.id,
    eventType: "session_completed",
    assessmentType: session.assessmentType,
    billable: true,
    billedAmount: pricePerAssessment,
    metadata: {
      externalUserId: session.externalUserId || "",
      completedAt: new Date().toISOString(),
    } as Record<string, any>,
  });

  // If partner has Stripe billing set up, report to Stripe
  if (partner.stripeSubscriptionId && partner.stripeCustomerId) {
    await reportUsageToStripe(partner, usageEvent, 1);
  }

  console.log(`[Partner Billing] Recorded billable usage for session ${session.id}, amount: ${pricePerAssessment} pence`);
}
