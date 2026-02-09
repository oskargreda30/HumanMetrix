interface AirwallexCheckoutParams {
  intentId: string;
  clientSecret: string;
  currency: string;
  countryCode?: string;
  airwallexEnv: string;
  successUrl: string;
  failUrl: string;
}

export async function redirectToAirwallexCheckout(params: AirwallexCheckoutParams): Promise<void> {
  const { init } = await import('@airwallex/components-sdk');
  const sdkEnv = params.airwallexEnv === 'demo' ? 'demo' : 'prod';

  let result;
  try {
    result = await init({
      env: sdkEnv,
      enabledElements: ['payments'],
    });
  } catch (initErr: any) {
    console.error('[Airwallex] SDK init failed:', initErr);
    throw new Error(`Airwallex SDK initialization failed: ${initErr.message || 'Unknown error'}`);
  }

  if (!result?.payments) {
    throw new Error('Failed to initialize Airwallex payments module');
  }

  const checkoutOptions = {
    mode: 'payment' as const,
    intent_id: params.intentId,
    client_secret: params.clientSecret,
    currency: params.currency || 'GBP',
    country_code: params.countryCode || undefined,
    successUrl: params.successUrl,
    failUrl: params.failUrl,
  };

  try {
    result.payments.redirectToCheckout(checkoutOptions);
  } catch (redirectErr: any) {
    console.error('[Airwallex] redirectToCheckout failed:', redirectErr);
    throw new Error(`Airwallex checkout redirect failed: ${redirectErr.message || 'Unknown error'}`);
  }
}
