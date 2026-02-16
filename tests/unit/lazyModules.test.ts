import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('lazyModules', () => {
  let getModuleStats: typeof import('../../server/lazyModules').getModuleStats;
  let preloadModules: typeof import('../../server/lazyModules').preloadModules;
  let getOpenAI: typeof import('../../server/lazyModules').getOpenAI;
  let getStripe: typeof import('../../server/lazyModules').getStripe;
  let getJsPDF: typeof import('../../server/lazyModules').getJsPDF;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../server/lazyModules');
    getModuleStats = mod.getModuleStats;
    preloadModules = mod.preloadModules;
    getOpenAI = mod.getOpenAI;
    getStripe = mod.getStripe;
    getJsPDF = mod.getJsPDF;
  });

  describe('getModuleStats', () => {
    it('returns correct initial state (all not loaded)', () => {
      const stats = getModuleStats();
      expect(stats.openai.loaded).toBe(false);
      expect(stats.openai.loading).toBe(false);
      expect(stats.stripe.loaded).toBe(false);
      expect(stats.stripe.loading).toBe(false);
      expect(stats.jspdf.loaded).toBe(false);
      expect(stats.jspdf.loading).toBe(false);
    });
  });

  describe('preloadModules', () => {
    it('does not preload in non-production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      preloadModules();
      const callsAfter = setTimeoutSpy.mock.calls.filter(
        (call) => typeof call[0] === 'function'
      );
      expect(callsAfter.length).toBe(0);

      setTimeoutSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('schedules preloading in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((() => 0) as any);
      preloadModules();
      expect(setTimeoutSpy).toHaveBeenCalledTimes(2);

      setTimeoutSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('lazy loading functions', () => {
    it('getOpenAI loads the OpenAI module', async () => {
      const instance = await getOpenAI();
      expect(instance).toBeDefined();

      const stats = getModuleStats();
      expect(stats.openai.loaded).toBe(true);
      expect(stats.openai.loading).toBe(false);
    });

    it('getStripe loads the Stripe module', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
      const instance = await getStripe();
      expect(instance).toBeDefined();

      const stats = getModuleStats();
      expect(stats.stripe.loaded).toBe(true);
      expect(stats.stripe.loading).toBe(false);
    });

    it('getJsPDF loads the jsPDF module', async () => {
      const JsPDFClass = await getJsPDF();
      expect(JsPDFClass).toBeDefined();

      const stats = getModuleStats();
      expect(stats.jspdf.loaded).toBe(true);
      expect(stats.jspdf.loading).toBe(false);
    });
  });
});
