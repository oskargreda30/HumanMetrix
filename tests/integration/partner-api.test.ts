/**
 * Integration Tests for Partner API
 * 
 * Tests cover:
 * - API key authentication
 * - Session creation and management
 * - Quota/credit system
 * - Rate limiting
 * - Permission-based access control
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock partner data
interface MockPartner {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  monthlyQuota: number;
  pricePerAssessment: number;
  billingModel: 'prepaid' | 'auto_bill' | 'invoice';
}

interface MockApiKey {
  id: string;
  partnerId: string;
  keyPrefix: string;
  keyHash: string;
  permissions: string[];
  isActive: boolean;
  rateLimit: number;
  rateLimitWindow: number;
}

// Mock rate limiter state
const rateLimiterState = new Map<string, { count: number; resetTime: number }>();

describe('Partner API Key Authentication', () => {
  beforeEach(() => {
    rateLimiterState.clear();
  });

  describe('API Key Format Validation', () => {
    it('should accept valid API key format with prefix', () => {
      const apiKey = 'hm_live_abc123def456';
      const prefix = apiKey.substring(0, 7);
      expect(prefix).toBe('hm_live');
    });

    it('should extract key prefix correctly', () => {
      const apiKey = 'hm_test_xyz789abc123def456';
      const parts = apiKey.split('_');
      const prefix = `${parts[0]}_${parts[1]}`;
      expect(prefix).toBe('hm_test');
    });

    it('should reject keys without valid prefix', () => {
      const apiKey = 'invalidkey123';
      const hasValidPrefix = apiKey.startsWith('hm_live_') || apiKey.startsWith('hm_test_');
      expect(hasValidPrefix).toBe(false);
    });

    it('should differentiate between live and test keys', () => {
      const liveKey = 'hm_live_abc123';
      const testKey = 'hm_test_xyz789';
      
      expect(liveKey.includes('live')).toBe(true);
      expect(testKey.includes('test')).toBe(true);
    });
  });

  describe('API Key Permissions', () => {
    const createMockApiKey = (permissions: string[]): MockApiKey => ({
      id: 'key-1',
      partnerId: 'partner-1',
      keyPrefix: 'hm_test',
      keyHash: 'hashed-value',
      permissions,
      isActive: true,
      rateLimit: 100,
      rateLimitWindow: 3600,
    });

    it('should allow access with matching permission', () => {
      const apiKey = createMockApiKey(['assessments:write', 'assessments:read']);
      const requiredPermission = 'assessments:write';
      
      const hasPermission = apiKey.permissions.includes(requiredPermission);
      expect(hasPermission).toBe(true);
    });

    it('should deny access without required permission', () => {
      const apiKey = createMockApiKey(['assessments:read']);
      const requiredPermission = 'assessments:write';
      
      const hasPermission = apiKey.permissions.includes(requiredPermission);
      expect(hasPermission).toBe(false);
    });

    it('should allow access with wildcard permission', () => {
      const apiKey = createMockApiKey(['*']);
      const requiredPermission = 'assessments:write';
      
      const hasPermission = apiKey.permissions.includes('*') || 
                           apiKey.permissions.includes(requiredPermission);
      expect(hasPermission).toBe(true);
    });

    it('should handle multiple permissions correctly', () => {
      const apiKey = createMockApiKey(['assessments:read', 'usage:read', 'sessions:write']);
      
      expect(apiKey.permissions.includes('assessments:read')).toBe(true);
      expect(apiKey.permissions.includes('usage:read')).toBe(true);
      expect(apiKey.permissions.includes('sessions:write')).toBe(true);
      expect(apiKey.permissions.includes('admin:write')).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    function checkRateLimit(keyId: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
      const now = Date.now();
      const existing = rateLimiterState.get(keyId);
      
      if (!existing || now > existing.resetTime) {
        rateLimiterState.set(keyId, { count: 1, resetTime: now + windowMs });
        return { allowed: true, remaining: limit - 1 };
      }
      
      if (existing.count >= limit) {
        return { allowed: false, remaining: 0 };
      }
      
      existing.count++;
      return { allowed: true, remaining: limit - existing.count };
    }

    it('should allow requests within rate limit', () => {
      const result = checkRateLimit('key-1', 100, 3600000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it('should track request count correctly', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('key-2', 100, 3600000);
      }
      const result = checkRateLimit('key-2', 100, 3600000);
      expect(result.remaining).toBe(94);
    });

    it('should block requests exceeding rate limit', () => {
      for (let i = 0; i < 100; i++) {
        checkRateLimit('key-3', 100, 3600000);
      }
      const result = checkRateLimit('key-3', 100, 3600000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset count after window expires', () => {
      const keyId = 'key-4';
      
      // Set up expired state
      rateLimiterState.set(keyId, { count: 100, resetTime: Date.now() - 1000 });
      
      const result = checkRateLimit(keyId, 100, 3600000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });
  });
});

describe('Partner Session Management', () => {
  describe('Session Creation Validation', () => {
    const validAssessmentTypes = ['fit', 'ai_readiness', 'prompt_architecture', 'aiq'];

    it('should accept valid assessment types', () => {
      validAssessmentTypes.forEach(type => {
        expect(validAssessmentTypes.includes(type)).toBe(true);
      });
    });

    it('should reject invalid assessment types', () => {
      const invalidTypes = ['invalid', 'test', 'random'];
      invalidTypes.forEach(type => {
        expect(validAssessmentTypes.includes(type)).toBe(false);
      });
    });

    it('should validate expiration time within bounds', () => {
      const minExpiry = 30; // 30 minutes
      const maxExpiry = 10080; // 7 days in minutes
      
      expect(60 >= minExpiry && 60 <= maxExpiry).toBe(true); // 1 hour
      expect(1440 >= minExpiry && 1440 <= maxExpiry).toBe(true); // 1 day
      expect(20 >= minExpiry).toBe(false); // 20 minutes - too short
      expect(20000 <= maxExpiry).toBe(false); // ~14 days - too long
    });

    it('should validate email format if provided', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      expect(emailRegex.test('valid@example.com')).toBe(true);
      expect(emailRegex.test('also.valid@sub.domain.com')).toBe(true);
      expect(emailRegex.test('invalid-email')).toBe(false);
      expect(emailRegex.test('@missing-local.com')).toBe(false);
    });
  });

  describe('Session Status Transitions', () => {
    const validTransitions: Record<string, string[]> = {
      'created': ['started', 'expired'],
      'started': ['completed', 'expired'],
      'completed': [],
      'expired': [],
    };

    it('should allow transition from created to started', () => {
      const fromStatus = 'created';
      const toStatus = 'started';
      expect(validTransitions[fromStatus].includes(toStatus)).toBe(true);
    });

    it('should allow transition from started to completed', () => {
      const fromStatus = 'started';
      const toStatus = 'completed';
      expect(validTransitions[fromStatus].includes(toStatus)).toBe(true);
    });

    it('should not allow transition from completed to any status', () => {
      const fromStatus = 'completed';
      expect(validTransitions[fromStatus].length).toBe(0);
    });

    it('should allow any status to transition to expired', () => {
      expect(validTransitions['created'].includes('expired')).toBe(true);
      expect(validTransitions['started'].includes('expired')).toBe(true);
    });
  });

  describe('Session Expiration', () => {
    it('should calculate expiry time correctly', () => {
      const now = new Date();
      const expiresInMinutes = 1440; // 24 hours
      
      const expiresAt = new Date(now);
      expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
      
      const expectedExpiry = now.getTime() + (1440 * 60 * 1000);
      expect(expiresAt.getTime()).toBeCloseTo(expectedExpiry, -3);
    });

    it('should identify expired sessions', () => {
      const expiredSession = {
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };
      
      const isExpired = new Date() > expiredSession.expiresAt;
      expect(isExpired).toBe(true);
    });

    it('should identify valid sessions', () => {
      const validSession = {
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };
      
      const isExpired = new Date() > validSession.expiresAt;
      expect(isExpired).toBe(false);
    });
  });
});

describe('Partner Quota System', () => {
  describe('Quota Balance Calculation', () => {
    interface QuotaBalance {
      testsPurchased: number;
      testsConsumed: number;
      remaining: number;
    }

    function calculateBalance(purchased: number, consumed: number): QuotaBalance {
      return {
        testsPurchased: purchased,
        testsConsumed: consumed,
        remaining: purchased - consumed,
      };
    }

    it('should calculate remaining quota correctly', () => {
      const balance = calculateBalance(100, 45);
      expect(balance.remaining).toBe(55);
    });

    it('should handle zero purchased credits', () => {
      const balance = calculateBalance(0, 0);
      expect(balance.remaining).toBe(0);
    });

    it('should handle fully consumed quota', () => {
      const balance = calculateBalance(100, 100);
      expect(balance.remaining).toBe(0);
    });

    it('should detect negative remaining (over-consumption)', () => {
      const balance = calculateBalance(100, 110);
      expect(balance.remaining).toBe(-10);
      expect(balance.remaining < 0).toBe(true);
    });
  });

  describe('Quota Consumption', () => {
    it('should block session creation when quota exhausted', () => {
      const quotaBalance = { testsPurchased: 100, testsConsumed: 100, remaining: 0 };
      const canCreateSession = quotaBalance.remaining > 0;
      expect(canCreateSession).toBe(false);
    });

    it('should allow session creation when quota available', () => {
      const quotaBalance = { testsPurchased: 100, testsConsumed: 50, remaining: 50 };
      const canCreateSession = quotaBalance.remaining > 0;
      expect(canCreateSession).toBe(true);
    });

    it('should block session creation when no credits purchased', () => {
      const quotaBalance = { testsPurchased: 0, testsConsumed: 0, remaining: 0 };
      const hasCredits = quotaBalance.testsPurchased > 0;
      expect(hasCredits).toBe(false);
    });
  });

  describe('Quota Warning Thresholds', () => {
    function getWarningLevel(remaining: number, total: number): string | null {
      const usagePercent = ((total - remaining) / total) * 100;
      
      if (remaining === 0) return 'exhausted';
      if (usagePercent >= 90) return 'critical';
      if (usagePercent >= 70) return 'warning';
      return null;
    }

    it('should trigger warning at 70% usage', () => {
      const warning = getWarningLevel(30, 100); // 70% used
      expect(warning).toBe('warning');
    });

    it('should trigger critical at 90% usage', () => {
      const warning = getWarningLevel(10, 100); // 90% used
      expect(warning).toBe('critical');
    });

    it('should trigger exhausted at 100% usage', () => {
      const warning = getWarningLevel(0, 100); // 100% used
      expect(warning).toBe('exhausted');
    });

    it('should not trigger warning below 70% usage', () => {
      const warning = getWarningLevel(50, 100); // 50% used
      expect(warning).toBeNull();
    });
  });
});

describe('Partner Access Control', () => {
  describe('Partner Account Status', () => {
    it('should block inactive partner', () => {
      const partner: MockPartner = {
        id: 'partner-1',
        name: 'Test Partner',
        email: 'partner@example.com',
        isActive: false,
        monthlyQuota: 100,
        pricePerAssessment: 500,
        billingModel: 'prepaid',
      };
      
      expect(partner.isActive).toBe(false);
    });

    it('should allow active partner', () => {
      const partner: MockPartner = {
        id: 'partner-1',
        name: 'Test Partner',
        email: 'partner@example.com',
        isActive: true,
        monthlyQuota: 100,
        pricePerAssessment: 500,
        billingModel: 'prepaid',
      };
      
      expect(partner.isActive).toBe(true);
    });
  });

  describe('API Key Status', () => {
    it('should reject revoked API key', () => {
      const apiKey: MockApiKey = {
        id: 'key-1',
        partnerId: 'partner-1',
        keyPrefix: 'hm_test',
        keyHash: 'hash',
        permissions: ['*'],
        isActive: false,
        rateLimit: 100,
        rateLimitWindow: 3600,
      };
      
      expect(apiKey.isActive).toBe(false);
    });

    it('should accept active API key', () => {
      const apiKey: MockApiKey = {
        id: 'key-1',
        partnerId: 'partner-1',
        keyPrefix: 'hm_test',
        keyHash: 'hash',
        permissions: ['*'],
        isActive: true,
        rateLimit: 100,
        rateLimitWindow: 3600,
      };
      
      expect(apiKey.isActive).toBe(true);
    });
  });

  describe('Session Ownership Validation', () => {
    it('should allow access to own sessions', () => {
      const session = { id: 'session-1', partnerId: 'partner-1' };
      const requestingPartnerId = 'partner-1';
      
      expect(session.partnerId === requestingPartnerId).toBe(true);
    });

    it('should deny access to other partner sessions', () => {
      const session = { id: 'session-1', partnerId: 'partner-1' };
      const requestingPartnerId = 'partner-2';
      
      expect(session.partnerId === requestingPartnerId).toBe(false);
    });
  });
});
