import { isAirwallexConfigured } from "./airwallex";
import Stripe from "stripe";

export type PaymentProvider = 'airwallex' | 'stripe';

export interface PaymentProviderConfig {
  primary: PaymentProvider;
  fallback: PaymentProvider | null;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: "2025-09-30.acacia" as any,
});

function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getPaymentProviders(partnerPaymentProvider?: string): PaymentProviderConfig {
  const airwallexAvailable = isAirwallexConfigured();
  const stripeAvailable = isStripeConfigured();

  if (!airwallexAvailable && !stripeAvailable) {
    console.error('[Payment Routing] No payment provider configured!');
    throw new Error('No payment provider is configured. Please set up Airwallex or Stripe credentials.');
  }

  let config: PaymentProviderConfig;

  if (partnerPaymentProvider === 'stripe') {
    if (!stripeAvailable) {
      config = { primary: 'airwallex', fallback: null };
    } else {
      config = {
        primary: 'stripe',
        fallback: airwallexAvailable ? 'airwallex' : null,
      };
    }
  } else if (partnerPaymentProvider === 'airwallex') {
    if (!airwallexAvailable) {
      config = { primary: 'stripe', fallback: null };
    } else {
      config = {
        primary: 'airwallex',
        fallback: stripeAvailable ? 'stripe' : null,
      };
    }
  } else {
    config = {
      primary: airwallexAvailable ? 'airwallex' : 'stripe',
      fallback: airwallexAvailable && stripeAvailable ? 'stripe' : null,
    };
  }

  console.log(`[Payment Routing] Selected: primary=${config.primary}, fallback=${config.fallback || 'none'} (airwallex=${airwallexAvailable ? 'yes' : 'no'}, stripe=${stripeAvailable ? 'yes' : 'no'}, partnerPref=${partnerPaymentProvider || 'default'})`);
  return config;
}

export function supportsOffSessionBilling(provider: PaymentProvider): boolean {
  return provider === 'stripe';
}

export function getStripeClient(): Stripe {
  return stripe;
}

export interface PaymentCheckoutResult {
  provider: PaymentProvider;
  url?: string;
  intentId?: string;
  clientSecret?: string;
  sessionId?: string;
  amount?: number;
  currency?: string;
  returnUrl?: string;
  packageId?: string;
}

export async function createCheckoutWithFallback(
  primaryProvider: PaymentProvider,
  fallbackProvider: PaymentProvider | null,
  airwallexFn: () => Promise<PaymentCheckoutResult>,
  stripeFn: () => Promise<PaymentCheckoutResult>,
): Promise<PaymentCheckoutResult> {
  const primaryFn = primaryProvider === 'airwallex' ? airwallexFn : stripeFn;
  const fallbackFn = fallbackProvider
    ? (fallbackProvider === 'airwallex' ? airwallexFn : stripeFn)
    : null;

  try {
    return await primaryFn();
  } catch (primaryError: any) {
    const primaryDetail = primaryError.message || String(primaryError);
    const primaryCode = primaryError.statusCode || primaryError.status || primaryError.code || '';
    console.error(`[Payment Routing] Primary provider (${primaryProvider}) failed: code=${primaryCode}, message=${primaryDetail}`);

    if (fallbackFn && fallbackProvider) {
      console.log(`[Payment Routing] Attempting fallback provider (${fallbackProvider})...`);
      try {
        const result = await fallbackFn();
        console.log(`[Payment Routing] Fallback provider (${fallbackProvider}) succeeded`);
        return result;
      } catch (fallbackError: any) {
        const fallbackDetail = fallbackError.message || String(fallbackError);
        const fallbackCode = fallbackError.statusCode || fallbackError.status || fallbackError.code || '';
        console.error(`[Payment Routing] Fallback provider (${fallbackProvider}) also failed: code=${fallbackCode}, message=${fallbackDetail}`);
        throw new Error(`Both payment providers failed. Primary (${primaryProvider}): ${primaryDetail}. Fallback (${fallbackProvider}): ${fallbackDetail}`);
      }
    }

    throw primaryError;
  }
}
