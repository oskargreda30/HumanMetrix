interface AirwallexCheckoutParams {
  intentId: string;
  clientSecret: string;
  currency: string;
  airwallexEnv: string;
  successUrl: string;
  failUrl: string;
}

export async function redirectToAirwallexCheckout(params: AirwallexCheckoutParams): Promise<void> {
  const { init } = await import('@airwallex/components-sdk');
  const sdkEnv = params.airwallexEnv === 'demo' ? 'demo' : 'prod';
  const result = await init({
    env: sdkEnv,
    enabledElements: ['payments'],
  });
  if (!result.payments) {
    throw new Error('Failed to initialize Airwallex payments');
  }
  result.payments.redirectToCheckout({
    mode: 'payment',
    intent_id: params.intentId,
    client_secret: params.clientSecret,
    currency: params.currency || 'GBP',
    successUrl: params.successUrl,
    failUrl: params.failUrl,
  });
}
