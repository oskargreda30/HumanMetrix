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

  if (partnerPaymentProvider === 'stripe') {
    return {
      primary: 'stripe',
      fallback: airwallexAvailable ? 'airwallex' : null,
    };
  }

  if (partnerPaymentProvider === 'airwallex' || !partnerPaymentProvider) {
    return {
      primary: airwallexAvailable ? 'airwallex' : 'stripe',
      fallback: airwallexAvailable && stripeAvailable ? 'stripe' : null,
    };
  }

  return {
    primary: airwallexAvailable ? 'airwallex' : 'stripe',
    fallback: airwallexAvailable && stripeAvailable ? 'stripe' : null,
  };
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
    console.error(`[Payment Routing] Primary provider (${primaryProvider}) failed:`, primaryError.message);

    if (fallbackFn && fallbackProvider) {
      console.log(`[Payment Routing] Attempting fallback provider (${fallbackProvider})...`);
      try {
        const result = await fallbackFn();
        console.log(`[Payment Routing] Fallback provider (${fallbackProvider}) succeeded`);
        return result;
      } catch (fallbackError: any) {
        console.error(`[Payment Routing] Fallback provider (${fallbackProvider}) also failed:`, fallbackError.message);
        throw new Error(`Both payment providers failed. Primary (${primaryProvider}): ${primaryError.message}. Fallback (${fallbackProvider}): ${fallbackError.message}`);
      }
    }

    throw primaryError;
  }
}
