/**
 * Unit Tests for Airwallex Checkout
 *
 * Tests cover:
 * - Successful initialization and redirect with demo and prod environments
 * - Error handling for SDK initialization failures
 * - Error handling for redirect failures
 * - Fallback values for optional parameters (currency, countryCode)
 * - Result validation (payments module availability)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { redirectToAirwallexCheckout } from '@/lib/airwallexCheckout';

// Mock the @airwallex/components-sdk module
vi.mock('@airwallex/components-sdk');

describe('redirectToAirwallexCheckout', () => {
  let mockInit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockInit = vi.fn();
    vi.doMock('@airwallex/components-sdk', () => ({
      init: mockInit,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('Environment Configuration', () => {
    it('should initialize with demo environment when airwallexEnv is "demo"', async () => {
      const mockRedirectToCheckout = vi.fn();
      mockInit.mockResolvedValueOnce({
        payments: {
          redirectToCheckout: mockRedirectToCheckout,
        },
      });

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await redirectToAirwallexCheckout(params);

      expect(mockInit).toHaveBeenCalledWith({
        env: 'demo',
        enabledElements: ['payments'],
      });
    });

    it('should initialize with prod environment when airwallexEnv is not "demo"', async () => {
      const mockRedirectToCheckout = vi.fn();
      mockInit.mockResolvedValueOnce({
        payments: {
          redirectToCheckout: mockRedirectToCheckout,
        },
      });

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        airwallexEnv: 'prod',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await redirectToAirwallexCheckout(params);

      expect(mockInit).toHaveBeenCalledWith({
        env: 'prod',
        enabledElements: ['payments'],
      });
    });

    it('should default to prod environment for unknown airwallexEnv values', async () => {
      const mockRedirectToCheckout = vi.fn();
      mockInit.mockResolvedValueOnce({
        payments: {
          redirectToCheckout: mockRedirectToCheckout,
        },
      });

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        airwallexEnv: 'staging',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await redirectToAirwallexCheckout(params);

      expect(mockInit).toHaveBeenCalledWith({
        env: 'prod',
        enabledElements: ['payments'],
      });
    });
  });

  describe('Successful Checkout Flow', () => {
    it('should successfully redirect to checkout with all parameters', async () => {
      const mockRedirectToCheckout = vi.fn();
      mockInit.mockResolvedValueOnce({
        payments: {
          redirectToCheckout: mockRedirectToCheckout,
        },
      });

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'USD',
        countryCode: 'US',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await redirectToAirwallexCheckout(params);

      expect(mockRedirectToCheckout).toHaveBeenCalledWith({
        mode: 'payment',
        intent_id: 'test-intent-123',
        client_secret: 'test-secret-123',
        currency: 'USD',
        country_code: 'US',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      });
    });

    it('should call redirectToCheckout without throwing', async () => {
      const mockRedirectToCheckout = vi.fn();
      mockInit.mockResolvedValueOnce({
        payments: {
          redirectToCheckout: mockRedirectToCheckout,
        },
      });

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await expect(redirectToAirwallexCheckout(params)).resolves.not.toThrow();
    });
  });

  describe('Currency Fallback', () => {
    it('should use GBP as default currency when currency is empty string', async () => {
      const mockRedirectToCheckout = vi.fn();
      mockInit.mockResolvedValueOnce({
        payments: {
          redirectToCheckout: mockRedirectToCheckout,
        },
      });

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: '',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await redirectToAirwallexCheckout(params);

      expect(mockRedirectToCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'GBP',
        })
      );
    });

    it('should use provided currency when it is truthy', async () => {
      const mockRedirectToCheckout = vi.fn();
      mockInit.mockResolvedValueOnce({
        payments: {
          redirectToCheckout: mockRedirectToCheckout,
        },
      });

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'EUR',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await redirectToAirwallexCheckout(params);

      expect(mockRedirectToCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'EUR',
        })
      );
    });
  });

  describe('Country Code Handling', () => {
    it('should include countryCode when provided', async () => {
      const mockRedirectToCheckout = vi.fn();
      mockInit.mockResolvedValueOnce({
        payments: {
          redirectToCheckout: mockRedirectToCheckout,
        },
      });

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        countryCode: 'GB',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await redirectToAirwallexCheckout(params);

      expect(mockRedirectToCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          country_code: 'GB',
        })
      );
    });

    it('should set countryCode to undefined when not provided', async () => {
      const mockRedirectToCheckout = vi.fn();
      mockInit.mockResolvedValueOnce({
        payments: {
          redirectToCheckout: mockRedirectToCheckout,
        },
      });

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await redirectToAirwallexCheckout(params);

      expect(mockRedirectToCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          country_code: undefined,
        })
      );
    });
  });

  describe('SDK Initialization Errors', () => {
    it('should throw error with message when init fails with error message', async () => {
      const initError = new Error('SDK connection failed');
      mockInit.mockRejectedValueOnce(initError);

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await expect(redirectToAirwallexCheckout(params)).rejects.toThrow(
        'Airwallex SDK initialization failed: SDK connection failed'
      );
    });

    it('should throw error with "Unknown error" fallback when init error has no message', async () => {
      const initError = { message: undefined };
      mockInit.mockRejectedValueOnce(initError);

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await expect(redirectToAirwallexCheckout(params)).rejects.toThrow(
        'Airwallex SDK initialization failed: Unknown error'
      );
    });

    it('should throw error with "Unknown error" fallback when init error is non-Error object', async () => {
      mockInit.mockRejectedValueOnce({ code: 'INIT_ERROR' });

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await expect(redirectToAirwallexCheckout(params)).rejects.toThrow(
        'Airwallex SDK initialization failed: Unknown error'
      );
    });

    it('should log error to console when init fails', async () => {
      const initError = new Error('SDK connection failed');
      mockInit.mockRejectedValueOnce(initError);

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      try {
        await redirectToAirwallexCheckout(params);
      } catch (e) {
        // Expected
      }

      expect(console.error).toHaveBeenCalledWith('[Airwallex] SDK init failed:', initError);
    });
  });

  describe('Payments Module Validation', () => {
    it('should throw error when result has no payments property', async () => {
      mockInit.mockResolvedValueOnce({});

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await expect(redirectToAirwallexCheckout(params)).rejects.toThrow(
        'Failed to initialize Airwallex payments module'
      );
    });

    it('should throw error when payments is null', async () => {
      mockInit.mockResolvedValueOnce({ payments: null });

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await expect(redirectToAirwallexCheckout(params)).rejects.toThrow(
        'Failed to initialize Airwallex payments module'
      );
    });

    it('should throw error when payments is undefined', async () => {
      mockInit.mockResolvedValueOnce({ payments: undefined });

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await expect(redirectToAirwallexCheckout(params)).rejects.toThrow(
        'Failed to initialize Airwallex payments module'
      );
    });

    it('should throw error when result is null', async () => {
      mockInit.mockResolvedValueOnce(null);

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await expect(redirectToAirwallexCheckout(params)).rejects.toThrow(
        'Failed to initialize Airwallex payments module'
      );
    });
  });

  describe('Redirect Errors', () => {
    it('should throw error with message when redirectToCheckout fails', async () => {
      const mockRedirectToCheckout = vi.fn();
      const redirectError = new Error('Redirect failed');
      mockRedirectToCheckout.mockImplementationOnce(() => {
        throw redirectError;
      });

      mockInit.mockResolvedValueOnce({
        payments: {
          redirectToCheckout: mockRedirectToCheckout,
        },
      });

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await expect(redirectToAirwallexCheckout(params)).rejects.toThrow(
        'Airwallex checkout redirect failed: Redirect failed'
      );
    });

    it('should throw error with "Unknown error" fallback when redirectToCheckout error has no message', async () => {
      const mockRedirectToCheckout = vi.fn();
      mockRedirectToCheckout.mockImplementationOnce(() => {
        throw { message: undefined };
      });

      mockInit.mockResolvedValueOnce({
        payments: {
          redirectToCheckout: mockRedirectToCheckout,
        },
      });

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await expect(redirectToAirwallexCheckout(params)).rejects.toThrow(
        'Airwallex checkout redirect failed: Unknown error'
      );
    });

    it('should log error to console when redirectToCheckout fails', async () => {
      const mockRedirectToCheckout = vi.fn();
      const redirectError = new Error('Redirect failed');
      mockRedirectToCheckout.mockImplementationOnce(() => {
        throw redirectError;
      });

      mockInit.mockResolvedValueOnce({
        payments: {
          redirectToCheckout: mockRedirectToCheckout,
        },
      });

      const params = {
        intentId: 'test-intent-123',
        clientSecret: 'test-secret-123',
        currency: 'GBP',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      try {
        await redirectToAirwallexCheckout(params);
      } catch (e) {
        // Expected
      }

      expect(console.error).toHaveBeenCalledWith('[Airwallex] redirectToCheckout failed:', redirectError);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete successful flow with demo environment', async () => {
      const mockRedirectToCheckout = vi.fn();
      mockInit.mockResolvedValueOnce({
        payments: {
          redirectToCheckout: mockRedirectToCheckout,
        },
      });

      const params = {
        intentId: 'intent-demo-123',
        clientSecret: 'secret-demo-456',
        currency: 'GBP',
        countryCode: 'GB',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await redirectToAirwallexCheckout(params);

      expect(mockInit).toHaveBeenCalledWith({
        env: 'demo',
        enabledElements: ['payments'],
      });

      expect(mockRedirectToCheckout).toHaveBeenCalledWith({
        mode: 'payment',
        intent_id: 'intent-demo-123',
        client_secret: 'secret-demo-456',
        currency: 'GBP',
        country_code: 'GB',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      });
    });

    it('should handle complete successful flow with prod environment', async () => {
      const mockRedirectToCheckout = vi.fn();
      mockInit.mockResolvedValueOnce({
        payments: {
          redirectToCheckout: mockRedirectToCheckout,
        },
      });

      const params = {
        intentId: 'intent-prod-123',
        clientSecret: 'secret-prod-456',
        currency: 'USD',
        countryCode: 'US',
        airwallexEnv: 'prod',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await redirectToAirwallexCheckout(params);

      expect(mockInit).toHaveBeenCalledWith({
        env: 'prod',
        enabledElements: ['payments'],
      });

      expect(mockRedirectToCheckout).toHaveBeenCalledWith({
        mode: 'payment',
        intent_id: 'intent-prod-123',
        client_secret: 'secret-prod-456',
        currency: 'USD',
        country_code: 'US',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      });
    });

    it('should apply fallbacks for optional parameters in successful flow', async () => {
      const mockRedirectToCheckout = vi.fn();
      mockInit.mockResolvedValueOnce({
        payments: {
          redirectToCheckout: mockRedirectToCheckout,
        },
      });

      const params = {
        intentId: 'intent-123',
        clientSecret: 'secret-123',
        currency: '',
        airwallexEnv: 'demo',
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail',
      };

      await redirectToAirwallexCheckout(params);

      expect(mockRedirectToCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'GBP',
          country_code: undefined,
        })
      );
    });
  });
});
