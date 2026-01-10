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

  const paymentIntent = await client.paymentAcceptance.paymentIntents.createPaymentIntent(paymentIntentParams);

  return {
    id: paymentIntent.id || '',
    clientSecret: paymentIntent.client_secret || '',
    status: paymentIntent.status || '',
    amount: paymentIntent.amount || 0,
    currency: paymentIntent.currency || '',
  };
}

export async function getPaymentIntent(paymentIntentId: string): Promise<any> {
  const client = getAirwallexClient();
  // Use the list endpoint and filter by ID as a workaround
  const result = await client.paymentAcceptance.paymentIntents.listPaymentIntents({
    page_num: 0,
    page_size: 100,
  });
  // Find the specific payment intent by ID from the list
  const items = (result as any).items || [];
  return items.find((item: any) => item.id === paymentIntentId) || result;
}

export async function confirmPaymentIntent(paymentIntentId: string, returnUrl: string): Promise<any> {
  const client = getAirwallexClient();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  // Use the correct form for confirmPaymentIntent - first arg is the intent ID as string
  return client.paymentAcceptance.paymentIntents.confirmPaymentIntent(
    paymentIntentId,
    {
      request_id: requestId,
      return_url: returnUrl,
    }
  );
}

export function formatAmountForAirwallex(amountInPence: number): number {
  return amountInPence / 100;
}

export function formatAmountFromAirwallex(amount: number): number {
  return Math.round(amount * 100);
}

import crypto from 'crypto';

export function verifyAirwallexWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  webhookSecret: string
): boolean {
  if (!webhookSecret) {
    console.warn('[Airwallex Webhook] No webhook secret configured, skipping signature verification');
    return true;
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export interface AirwallexWebhookEvent {
  id: string;
  name: string;
  account_id: string;
  data: {
    object: any;
  };
  created_at: string;
}
