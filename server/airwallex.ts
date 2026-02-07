import { Airwallex } from '@airwallex/node-sdk';

let airwallexClient: Airwallex | null = null;

export function getAirwallexClient(): Airwallex {
  if (!airwallexClient) {
    const clientId = process.env.AIRWALLEX_CLIENT_ID;
    const apiKey = process.env.AIRWALLEX_API_KEY;

    if (!clientId || !apiKey) {
      throw new Error('Airwallex credentials not configured. Please set AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY environment variables.');
    }

    const env = process.env.AIRWALLEX_ENVIRONMENT || 'prod';

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

interface CreateCustomerParams {
  email: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  metadata?: Record<string, string>;
}

interface CustomerResult {
  id: string;
  email: string;
}

export async function createCustomer(params: CreateCustomerParams): Promise<CustomerResult> {
  const client = getAirwallexClient();
  
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  const customerParams: any = {
    request_id: requestId,
    email: params.email,
    merchant_customer_id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
  };
  
  if (params.businessName) {
    customerParams.business_name = params.businessName;
  }
  
  if (params.firstName || params.lastName) {
    customerParams.first_name = params.firstName || '';
    customerParams.last_name = params.lastName || '';
  }
  
  if (params.metadata) {
    customerParams.metadata = params.metadata;
  }
  
  const customer = await client.paymentAcceptance.customers.createCustomer(customerParams);
  
  return {
    id: customer.id || '',
    email: customer.email || params.email,
  };
}

export async function getCustomer(customerId: string): Promise<any> {
  const client = getAirwallexClient();
  return client.paymentAcceptance.customers.getCustomer(customerId);
}

interface CreatePaymentLinkParams {
  amount: number;
  currency: string;
  title: string;
  description?: string;
  expiresAt?: Date;
  metadata?: Record<string, string>;
}

interface PaymentLinkResult {
  id: string;
  url: string;
  status: string;
}

export async function createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResult> {
  const client = getAirwallexClient();
  
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  const linkParams: any = {
    request_id: requestId,
    amount: params.amount,
    currency: params.currency.toUpperCase(),
    title: params.title,
  };
  
  if (params.description) {
    linkParams.description = params.description;
  }
  
  if (params.expiresAt) {
    linkParams.expires_at = params.expiresAt.toISOString();
  }
  
  if (params.metadata) {
    linkParams.metadata = params.metadata;
  }
  
  // Create payment link via Airwallex API
  const paymentLink = await (client as any).paymentAcceptance.paymentLinks.createPaymentLink(linkParams);
  
  return {
    id: paymentLink.id || '',
    url: paymentLink.url || '',
    status: paymentLink.status || '',
  };
}
