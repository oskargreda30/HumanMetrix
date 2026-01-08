import { Airwallex } from '@airwallex/node-sdk';

let airwallexClient: Airwallex | null = null;

export function getAirwallexClient(): Airwallex {
  if (!airwallexClient) {
    const clientId = process.env.AIRWALLEX_CLIENT_ID;
    const apiKey = process.env.AIRWALLEX_API_KEY;

    if (!clientId || !apiKey) {
      throw new Error('Airwallex credentials not configured. Please set AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY environment variables.');
    }

    const env = process.env.NODE_ENV === 'production' ? 'prod' : 'demo';

    airwallexClient = new Airwallex({
      clientId,
      apiKey,
      env,
      apiVersion: '2025-02-14',
      timeout: 30000,
      retry: 3,
    });

    console.log(`[Airwallex] Client initialized in ${env} mode`);
  }

  return airwallexClient;
}

export function isAirwallexConfigured(): boolean {
  return !!(process.env.AIRWALLEX_CLIENT_ID && process.env.AIRWALLEX_API_KEY);
}

interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  merchantOrderId: string;
  returnUrl: string;
  customerEmail?: string;
  description?: string;
  metadata?: Record<string, string>;
}

interface PaymentIntentResult {
  id: string;
  clientSecret: string;
  status: string;
  amount: number;
  currency: string;
}

export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
  const client = getAirwallexClient();

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  const paymentIntentParams: any = {
    request_id: requestId,
    amount: params.amount,
    currency: params.currency.toUpperCase(),
    merchant_order_id: params.merchantOrderId,
    return_url: params.returnUrl,
    descriptor: 'HumanMetrix Assessment',
  };

  if (params.customerEmail) {
    paymentIntentParams.customer = {
      email: params.customerEmail,
    };
  }

  if (params.metadata) {
    paymentIntentParams.metadata = params.metadata;
  }

  const paymentIntent = await client.paymentAcceptance.paymentIntents.create(paymentIntentParams);

  return {
    id: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    status: paymentIntent.status,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
  };
}

export async function getPaymentIntent(paymentIntentId: string): Promise<any> {
  const client = getAirwallexClient();
  return client.paymentAcceptance.paymentIntents.retrieve(paymentIntentId);
}

export async function confirmPaymentIntent(paymentIntentId: string, returnUrl: string): Promise<any> {
  const client = getAirwallexClient();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  return client.paymentAcceptance.paymentIntents.confirm(paymentIntentId, {
    request_id: requestId,
    return_url: returnUrl,
  });
}

export function formatAmountForAirwallex(amountInPence: number): number {
  return amountInPence / 100;
}

export function formatAmountFromAirwallex(amount: number): number {
  return Math.round(amount * 100);
}
