import crypto from 'crypto';

const AIRWALLEX_BASE_URL = (process.env.AIRWALLEX_ENVIRONMENT || 'prod') === 'demo'
  ? 'https://api-demo.airwallex.com'
  : 'https://api.airwallex.com';

let cachedToken: { token: string; expiresAt: number } | null = null;

export function isAirwallexConfigured(): boolean {
  return !!(process.env.AIRWALLEX_CLIENT_ID && process.env.AIRWALLEX_API_KEY);
}

async function getAuthToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const clientId = process.env.AIRWALLEX_CLIENT_ID;
  const apiKey = process.env.AIRWALLEX_API_KEY;

  if (!clientId || !apiKey) {
    throw new Error('Airwallex credentials not configured');
  }

  const env = process.env.AIRWALLEX_ENVIRONMENT || 'prod';
  console.log(`[Airwallex] Authenticating with ${env} API at ${AIRWALLEX_BASE_URL}`);

  const response = await fetch(`${AIRWALLEX_BASE_URL}/api/v1/authentication/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      'x-api-key': apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Airwallex] Auth failed: ${response.status} ${errorText}`);
    throw new Error(`Airwallex authentication failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const token = data.token;
  const expiresAt = Date.now() + (data.expires_in ? data.expires_in * 1000 : 1800000);

  cachedToken = { token, expiresAt };
  console.log(`[Airwallex] Authenticated successfully, token expires in ${Math.round((expiresAt - Date.now()) / 1000)}s`);

  return token;
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
  const token = await getAuthToken();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  const body: any = {
    request_id: requestId,
    amount: params.amount,
    currency: params.currency.toUpperCase(),
    merchant_order_id: params.merchantOrderId,
    return_url: params.returnUrl,
    descriptor: 'HumanMetrix Assessment',
  };

  if (params.customerEmail) {
    body.order = {
      type: 'physical_goods',
    };
  }

  if (params.metadata) {
    body.metadata = params.metadata;
  }

  console.log(`[Airwallex] Creating payment intent: amount=${body.amount}, currency=${body.currency}, merchantOrderId=${body.merchant_order_id}`);

  const response = await fetch(`${AIRWALLEX_BASE_URL}/api/v1/pa/payment_intents/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Airwallex] createPaymentIntent failed: ${response.status} ${errorText}`);
    throw new Error(`Airwallex createPaymentIntent failed: ${response.status} ${errorText}`);
  }

  const paymentIntent = await response.json();

  console.log(`[Airwallex] Payment intent created: ${paymentIntent.id}, status=${paymentIntent.status}`);

  return {
    id: paymentIntent.id || '',
    clientSecret: paymentIntent.client_secret || '',
    status: paymentIntent.status || '',
    amount: paymentIntent.amount || 0,
    currency: paymentIntent.currency || '',
  };
}

export async function getPaymentIntent(paymentIntentId: string): Promise<any> {
  const token = await getAuthToken();

  const response = await fetch(`${AIRWALLEX_BASE_URL}/api/v1/pa/payment_intents/${paymentIntentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Airwallex] getPaymentIntent failed: ${response.status} ${errorText}`);
    throw new Error(`Airwallex getPaymentIntent failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function confirmPaymentIntent(paymentIntentId: string, returnUrl: string): Promise<any> {
  const token = await getAuthToken();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  const response = await fetch(`${AIRWALLEX_BASE_URL}/api/v1/pa/payment_intents/${paymentIntentId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      request_id: requestId,
      return_url: returnUrl,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Airwallex confirmPaymentIntent failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export function formatAmountForAirwallex(amountInPence: number): number {
  return amountInPence / 100;
}

export function formatAmountFromAirwallex(amount: number): number {
  return Math.round(amount * 100);
}

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
  const token = await getAuthToken();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  const body: any = {
    request_id: requestId,
    email: params.email,
    merchant_customer_id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
  };

  if (params.businessName) {
    body.business_name = params.businessName;
  }

  if (params.firstName || params.lastName) {
    body.first_name = params.firstName || '';
    body.last_name = params.lastName || '';
  }

  if (params.metadata) {
    body.metadata = params.metadata;
  }

  const response = await fetch(`${AIRWALLEX_BASE_URL}/api/v1/pa/customers/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Airwallex createCustomer failed: ${response.status} ${errorText}`);
  }

  const customer = await response.json();

  return {
    id: customer.id || '',
    email: customer.email || params.email,
  };
}

export async function getCustomer(customerId: string): Promise<any> {
  const token = await getAuthToken();

  const response = await fetch(`${AIRWALLEX_BASE_URL}/api/v1/pa/customers/${customerId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Airwallex getCustomer failed: ${response.status} ${errorText}`);
  }

  return response.json();
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
  const token = await getAuthToken();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  const body: any = {
    request_id: requestId,
    amount: params.amount,
    currency: params.currency.toUpperCase(),
    title: params.title,
  };

  if (params.description) {
    body.description = params.description;
  }

  if (params.expiresAt) {
    body.expires_at = params.expiresAt.toISOString();
  }

  if (params.metadata) {
    body.metadata = params.metadata;
  }

  const response = await fetch(`${AIRWALLEX_BASE_URL}/api/v1/pa/payment_links/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Airwallex createPaymentLink failed: ${response.status} ${errorText}`);
  }

  const paymentLink = await response.json();

  return {
    id: paymentLink.id || '',
    url: paymentLink.url || '',
    status: paymentLink.status || '',
  };
}
