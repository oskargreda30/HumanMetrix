import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/airwallex', () => ({
  isAirwallexConfigured: vi.fn(),
}));

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({})),
  };
});

import { isAirwallexConfigured } from '../../server/airwallex';
import {
  getPaymentProviders,
  supportsOffSessionBilling,
  createCheckoutWithFallback,
  type PaymentCheckoutResult,
} from '../../server/payment-routing';

const mockIsAirwallexConfigured = isAirwallexConfigured as ReturnType<typeof vi.fn>;

describe('payment-routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPaymentProviders', () => {
    it('both available, no preference -> airwallex primary', () => {
      mockIsAirwallexConfigured.mockReturnValue(true);
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';

      const config = getPaymentProviders();
      expect(config.primary).toBe('airwallex');
      expect(config.fallback).toBe('stripe');
    });

    it('only stripe available -> stripe primary, no fallback', () => {
      mockIsAirwallexConfigured.mockReturnValue(false);
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';

      const config = getPaymentProviders();
      expect(config.primary).toBe('stripe');
      expect(config.fallback).toBeNull();
    });

    it('only airwallex available -> airwallex primary, no fallback', () => {
      mockIsAirwallexConfigured.mockReturnValue(true);
      delete process.env.STRIPE_SECRET_KEY;

      const config = getPaymentProviders();
      expect(config.primary).toBe('airwallex');
      expect(config.fallback).toBeNull();
    });

    it('neither available -> throws error', () => {
      mockIsAirwallexConfigured.mockReturnValue(false);
      delete process.env.STRIPE_SECRET_KEY;

      expect(() => getPaymentProviders()).toThrow('No payment provider is configured');
    });

    it('partner prefers stripe -> stripe primary', () => {
      mockIsAirwallexConfigured.mockReturnValue(true);
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';

      const config = getPaymentProviders('stripe');
      expect(config.primary).toBe('stripe');
      expect(config.fallback).toBe('airwallex');
    });

    it('partner prefers airwallex -> airwallex primary', () => {
      mockIsAirwallexConfigured.mockReturnValue(true);
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';

      const config = getPaymentProviders('airwallex');
      expect(config.primary).toBe('airwallex');
      expect(config.fallback).toBe('stripe');
    });

    it('partner prefers stripe but not available -> airwallex primary', () => {
      mockIsAirwallexConfigured.mockReturnValue(true);
      delete process.env.STRIPE_SECRET_KEY;

      const config = getPaymentProviders('stripe');
      expect(config.primary).toBe('airwallex');
      expect(config.fallback).toBeNull();
    });
  });

  describe('supportsOffSessionBilling', () => {
    it('returns true for stripe', () => {
      expect(supportsOffSessionBilling('stripe')).toBe(true);
    });

    it('returns false for airwallex', () => {
      expect(supportsOffSessionBilling('airwallex')).toBe(false);
    });
  });

  describe('createCheckoutWithFallback', () => {
    const successResult: PaymentCheckoutResult = {
      provider: 'airwallex',
      url: 'https://checkout.example.com',
    };

    const stripeResult: PaymentCheckoutResult = {
      provider: 'stripe',
      url: 'https://stripe.checkout.com',
    };

    it('primary succeeds -> returns primary result', async () => {
      const airwallexFn = vi.fn().mockResolvedValue(successResult);
      const stripeFn = vi.fn().mockResolvedValue(stripeResult);

      const result = await createCheckoutWithFallback('airwallex', 'stripe', airwallexFn, stripeFn);
      expect(result).toEqual(successResult);
      expect(airwallexFn).toHaveBeenCalledTimes(1);
      expect(stripeFn).not.toHaveBeenCalled();
    });

    it('primary fails, fallback succeeds -> returns fallback result', async () => {
      const airwallexFn = vi.fn().mockRejectedValue(new Error('Airwallex down'));
      const stripeFn = vi.fn().mockResolvedValue(stripeResult);

      const result = await createCheckoutWithFallback('airwallex', 'stripe', airwallexFn, stripeFn);
      expect(result).toEqual(stripeResult);
      expect(airwallexFn).toHaveBeenCalledTimes(1);
      expect(stripeFn).toHaveBeenCalledTimes(1);
    });

    it('primary fails, no fallback -> throws primary error', async () => {
      const primaryError = new Error('Airwallex down');
      const airwallexFn = vi.fn().mockRejectedValue(primaryError);
      const stripeFn = vi.fn();

      await expect(
        createCheckoutWithFallback('airwallex', null, airwallexFn, stripeFn)
      ).rejects.toThrow('Airwallex down');
    });

    it('both fail -> throws combined error message', async () => {
      const airwallexFn = vi.fn().mockRejectedValue(new Error('Airwallex down'));
      const stripeFn = vi.fn().mockRejectedValue(new Error('Stripe down'));

      await expect(
        createCheckoutWithFallback('airwallex', 'stripe', airwallexFn, stripeFn)
      ).rejects.toThrow('Both payment providers failed');
    });
  });
});
