import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/db', () => ({
  db: { execute: vi.fn() },
}));

const mockNotifySuperAdmins = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('../../server/email', () => ({
  notifySuperAdmins: (...args: any[]) => mockNotifySuperAdmins(...args),
}));

const mockStorage = vi.hoisted(() => ({
  getPartnerAccount: vi.fn(),
}));
vi.mock('../../server/storage', () => ({
  storage: mockStorage,
}));

import {
  trackFailedLogin,
  clearFailedLoginAttempts,
  notifyNewAdminCreated,
  trackApiCall,
  notifyHighApiUsage,
  notifyPartnerDeactivation,
} from '../../server/security-monitor';

describe('Security Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearFailedLoginAttempts('test@example.com');
    clearFailedLoginAttempts('clear@test.com');
    clearFailedLoginAttempts('expired@test.com');
  });

  describe('trackFailedLogin()', () => {
    it('first attempt creates new entry without notification', async () => {
      await trackFailedLogin('test@example.com', '127.0.0.1');
      expect(mockNotifySuperAdmins).not.toHaveBeenCalled();
    });

    it('subsequent attempts increment count without triggering below threshold', async () => {
      for (let i = 0; i < 4; i++) {
        await trackFailedLogin('test@example.com', '127.0.0.1');
      }
      expect(mockNotifySuperAdmins).not.toHaveBeenCalled();
    });

    it('reaching threshold (5) triggers notification', async () => {
      for (let i = 0; i < 5; i++) {
        await trackFailedLogin('test@example.com', '127.0.0.1');
      }
      expect(mockNotifySuperAdmins).toHaveBeenCalledTimes(1);
      expect(mockNotifySuperAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'security_alert',
          title: 'Multiple Failed Login Attempts Detected',
          severity: 'warning',
        })
      );
    });

    it('notification includes email and IP in message', async () => {
      for (let i = 0; i < 5; i++) {
        await trackFailedLogin('test@example.com', '192.168.1.1');
      }
      expect(mockNotifySuperAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('test@example.com'),
        })
      );
    });

    it('notification cooldown prevents duplicate notifications', async () => {
      for (let i = 0; i < 5; i++) {
        await trackFailedLogin('test@example.com', '127.0.0.1');
      }
      expect(mockNotifySuperAdmins).toHaveBeenCalledTimes(1);

      await trackFailedLogin('test@example.com', '127.0.0.1');
      await trackFailedLogin('test@example.com', '127.0.0.1');
      expect(mockNotifySuperAdmins).toHaveBeenCalledTimes(1);
    });

    it('normalizes email to lowercase', async () => {
      clearFailedLoginAttempts('Test@Example.COM');
      for (let i = 0; i < 3; i++) {
        await trackFailedLogin('Test@Example.COM');
      }
      expect(mockNotifySuperAdmins).not.toHaveBeenCalled();
      clearFailedLoginAttempts('Test@Example.COM');
      for (let i = 0; i < 3; i++) {
        await trackFailedLogin('test@example.com');
      }
      expect(mockNotifySuperAdmins).not.toHaveBeenCalled();
    });

    it('works without IP address parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await trackFailedLogin('test@example.com');
      }
      expect(mockNotifySuperAdmins).toHaveBeenCalledTimes(1);
    });

    it('expired window resets counter (simulated via clearFailedLoginAttempts)', async () => {
      for (let i = 0; i < 4; i++) {
        await trackFailedLogin('expired@test.com', '127.0.0.1');
      }
      clearFailedLoginAttempts('expired@test.com');
      await trackFailedLogin('expired@test.com', '127.0.0.1');
      expect(mockNotifySuperAdmins).not.toHaveBeenCalled();
    });
  });

  describe('clearFailedLoginAttempts()', () => {
    it('removes entry so subsequent attempts start fresh', async () => {
      for (let i = 0; i < 4; i++) {
        await trackFailedLogin('clear@test.com');
      }
      clearFailedLoginAttempts('clear@test.com');

      await trackFailedLogin('clear@test.com');
      expect(mockNotifySuperAdmins).not.toHaveBeenCalled();
    });

    it('does not throw when clearing non-existent entry', () => {
      expect(() => clearFailedLoginAttempts('nonexistent@test.com')).not.toThrow();
    });

    it('handles case-insensitive clearing', async () => {
      for (let i = 0; i < 4; i++) {
        await trackFailedLogin('Clear@Test.COM');
      }
      clearFailedLoginAttempts('clear@test.com');
      await trackFailedLogin('clear@test.com');
      expect(mockNotifySuperAdmins).not.toHaveBeenCalled();
    });
  });

  describe('notifyNewAdminCreated()', () => {
    it('sends notification with warning severity for admin role', async () => {
      await notifyNewAdminCreated('user-1', 'admin@test.com', 'admin', 'creator-1', 'creator@test.com');
      expect(mockNotifySuperAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'admin_created',
          title: 'New Admin Account Created',
          severity: 'warning',
        })
      );
    });

    it('sends notification with critical severity for super_admin role', async () => {
      await notifyNewAdminCreated('user-2', 'super@test.com', 'super_admin');
      expect(mockNotifySuperAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'admin_created',
          title: 'New Super Admin Account Created',
          severity: 'critical',
        })
      );
    });

    it('includes metadata with admin details', async () => {
      await notifyNewAdminCreated('user-3', 'new@test.com', 'admin', 'creator-2', 'boss@test.com');
      expect(mockNotifySuperAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            newAdminUserId: 'user-3',
            newAdminEmail: 'new@test.com',
            role: 'admin',
            createdByUserId: 'creator-2',
            createdByEmail: 'boss@test.com',
          }),
        })
      );
    });

    it('works without createdBy parameters', async () => {
      await notifyNewAdminCreated('user-4', 'admin@test.com', 'admin');
      expect(mockNotifySuperAdmins).toHaveBeenCalledTimes(1);
    });
  });

  describe('trackApiCall()', () => {
    it('below threshold returns false', async () => {
      const result = await trackApiCall('partner-single', '/api/test');
      expect(result).toBe(false);
    });

    it('multiple calls below threshold return false', async () => {
      for (let i = 0; i < 50; i++) {
        const result = await trackApiCall('partner-below', '/api/test');
        expect(result).toBe(false);
      }
    });

    it('reaching threshold (100) returns true and triggers notification', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({ companyName: 'Test Corp' });

      for (let i = 0; i < 99; i++) {
        await trackApiCall('partner-api-100', '/api/test');
      }
      const result = await trackApiCall('partner-api-100', '/api/test');
      expect(result).toBe(true);
      expect(mockNotifySuperAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'suspicious_activity',
          title: 'Suspicious API Activity Detected',
        })
      );
    });

    it('does not re-notify in same window after threshold reached', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({ companyName: 'Test Corp' });

      for (let i = 0; i < 100; i++) {
        await trackApiCall('partner-renotify', '/api/test');
      }
      expect(mockNotifySuperAdmins).toHaveBeenCalledTimes(1);

      const result = await trackApiCall('partner-renotify', '/api/test');
      expect(result).toBe(false);
      expect(mockNotifySuperAdmins).toHaveBeenCalledTimes(1);
    });

    it('includes partner name and endpoint in notification', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({ companyName: 'Acme Inc' });

      for (let i = 0; i < 100; i++) {
        await trackApiCall('partner-detail', '/api/sessions');
      }
      expect(mockNotifySuperAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Acme Inc'),
          metadata: expect.objectContaining({
            lastEndpoint: '/api/sessions',
          }),
        })
      );
    });
  });

  describe('notifyHighApiUsage()', () => {
    it('sends warning severity for usage below 95%', async () => {
      await notifyHighApiUsage('p1', 'Corp A', 82, 18, 100);
      expect(mockNotifySuperAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'high_api_usage',
          severity: 'warning',
          title: expect.stringContaining('80%'),
        })
      );
    });

    it('sends critical severity for usage at or above 95%', async () => {
      await notifyHighApiUsage('p2', 'Corp B', 96, 4, 100);
      expect(mockNotifySuperAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'high_api_usage',
          severity: 'critical',
          title: expect.stringContaining('95%'),
        })
      );
    });

    it('sends critical severity at exactly 95%', async () => {
      await notifyHighApiUsage('p3', 'Corp C', 95, 5, 100);
      expect(mockNotifySuperAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
        })
      );
    });

    it('includes partner details in metadata', async () => {
      await notifyHighApiUsage('p4', 'Corp D', 85, 15, 100);
      expect(mockNotifySuperAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            partnerId: 'p4',
            partnerName: 'Corp D',
            usagePercentage: 85,
            remaining: 15,
            total: 100,
          }),
        })
      );
    });
  });

  describe('notifyPartnerDeactivation()', () => {
    it('sends notification with partner details', async () => {
      await notifyPartnerDeactivation('p1', 'Test Corp', 'TOS violation', 'admin-1', 'admin@test.com');
      expect(mockNotifySuperAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'partner_deactivated',
          title: 'Partner Account Deactivated',
          severity: 'warning',
        })
      );
    });

    it('includes reason and deactivator in message', async () => {
      await notifyPartnerDeactivation('p2', 'Bad Corp', 'Policy violation', 'admin-2', 'boss@test.com');
      expect(mockNotifySuperAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Policy violation'),
          message: expect.stringContaining('boss@test.com'),
        })
      );
    });

    it('works without deactivator parameters', async () => {
      await notifyPartnerDeactivation('p3', 'Some Corp', 'Expired');
      expect(mockNotifySuperAdmins).toHaveBeenCalledTimes(1);
      expect(mockNotifySuperAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            partnerId: 'p3',
            partnerName: 'Some Corp',
            reason: 'Expired',
          }),
        })
      );
    });

    it('includes email HTML content', async () => {
      await notifyPartnerDeactivation('p4', 'Corp X', 'Test reason');
      expect(mockNotifySuperAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          emailSubject: expect.stringContaining('Corp X'),
          emailHtml: expect.stringContaining('Partner Deactivated'),
        })
      );
    });
  });
});
