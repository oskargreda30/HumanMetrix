import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage = vi.hoisted(() => ({
  getPartnerAccount: vi.fn(),
  dispatchPartnerNotification: vi.fn(),
  getPartnerTeamMembersByRole: vi.fn(),
}));

vi.mock('../../server/storage', () => ({
  storage: mockStorage,
}));

const mockSendPartnerSecurityAlert = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('../../server/email', () => ({
  sendPartnerSecurityAlert: (...args: any[]) => mockSendPartnerSecurityAlert(...args),
  sendPartnerQuotaWarning70: vi.fn().mockResolvedValue(undefined),
  sendPartnerQuotaWarning90: vi.fn().mockResolvedValue(undefined),
  sendPartnerMonthlySummary: vi.fn().mockResolvedValue(undefined),
}));

import {
  notifyTeamMemberRoleChanged,
  notifyApiKeyRegenerated,
  trackApiAuthFailure,
  trackNewIpAccess,
} from '../../server/partner-notifications';

describe('Partner Notifications (Comprehensive)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.dispatchPartnerNotification.mockResolvedValue(undefined);
  });

  describe('notifyTeamMemberRoleChanged()', () => {
    it('creates notification with correct data', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        notificationPreferences: {},
      });

      await notifyTeamMemberRoleChanged(
        'p1', 'member-1', 'user@test.com', 'John Doe', 'member', 'admin', 'tm-1', 'user-actor'
      );

      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId: 'p1',
          type: 'team_member_role_changed',
          title: 'Team Member Role Updated',
          message: expect.stringContaining('John Doe'),
          message: expect.stringContaining('Member'),
          message: expect.stringContaining('Admin'),
          metadata: expect.objectContaining({
            memberId: 'member-1',
            memberEmail: 'user@test.com',
            memberName: 'John Doe',
            oldRole: 'member',
            newRole: 'admin',
          }),
          actorTeamMemberId: 'tm-1',
          actorUserId: 'user-actor',
          subjectTeamMemberId: 'member-1',
        })
      );
    });

    it('skips when notification type is disabled', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        notificationPreferences: { team_member_role_changed: false },
      });

      await notifyTeamMemberRoleChanged(
        'p1', 'member-1', 'user@test.com', 'John', 'member', 'admin'
      );

      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });

    it('uses email as displayName when name is null', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        notificationPreferences: {},
      });

      await notifyTeamMemberRoleChanged(
        'p1', 'member-1', 'user@test.com', null, 'viewer', 'admin'
      );

      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('user@test.com'),
        })
      );
    });

    it('defaults to enabled when partner has null preferences', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        notificationPreferences: null,
      });

      await notifyTeamMemberRoleChanged(
        'p1', 'member-1', 'user@test.com', 'John', 'member', 'admin'
      );

      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalled();
    });

    it('defaults to enabled when partner is not found', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue(null);

      await notifyTeamMemberRoleChanged(
        'p-missing', 'member-1', 'user@test.com', 'John', 'member', 'admin'
      );

      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalled();
    });

    it('maps role labels correctly (billing_admin)', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        notificationPreferences: {},
      });

      await notifyTeamMemberRoleChanged(
        'p1', 'member-1', 'user@test.com', 'Jane', 'viewer', 'billing_admin'
      );

      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Billing Admin'),
        })
      );
    });
  });

  describe('notifyApiKeyRegenerated()', () => {
    it('creates notification with correct type and message', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        companyName: 'Test Corp',
      });
      mockStorage.getPartnerTeamMembersByRole.mockResolvedValue([
        { email: 'admin@test.com' },
      ]);

      await notifyApiKeyRegenerated('p1', 'tm-1', 'user-1');

      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId: 'p1',
          type: 'api_key_regenerated',
          title: 'API Key Regenerated',
          message: expect.stringContaining('regenerated'),
          actorTeamMemberId: 'tm-1',
          actorUserId: 'user-1',
        })
      );
    });

    it('sends security alert emails to admin members', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        companyName: 'Test Corp',
      });
      mockStorage.getPartnerTeamMembersByRole.mockResolvedValue([
        { email: 'admin@test.com' },
        { email: 'billing@test.com' },
      ]);

      await notifyApiKeyRegenerated('p1', 'tm-1', 'user-1');

      expect(mockSendPartnerSecurityAlert).toHaveBeenCalledTimes(2);
      expect(mockSendPartnerSecurityAlert).toHaveBeenCalledWith(
        'admin@test.com',
        'Test Corp',
        'API Key Regenerated',
        expect.any(String)
      );
      expect(mockSendPartnerSecurityAlert).toHaveBeenCalledWith(
        'billing@test.com',
        'Test Corp',
        'API Key Regenerated',
        expect.any(String)
      );
    });

    it('handles missing partner gracefully', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue(null);

      await notifyApiKeyRegenerated('p-missing');

      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
      expect(mockSendPartnerSecurityAlert).not.toHaveBeenCalled();
    });

    it('skips email for members without email', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        companyName: 'Test Corp',
      });
      mockStorage.getPartnerTeamMembersByRole.mockResolvedValue([
        { email: null },
        { email: 'valid@test.com' },
      ]);

      await notifyApiKeyRegenerated('p1');

      expect(mockSendPartnerSecurityAlert).toHaveBeenCalledTimes(1);
      expect(mockSendPartnerSecurityAlert).toHaveBeenCalledWith(
        'valid@test.com',
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
    });

    it('works without optional actor parameters', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        companyName: 'Test Corp',
      });
      mockStorage.getPartnerTeamMembersByRole.mockResolvedValue([]);

      await notifyApiKeyRegenerated('p1');

      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId: 'p1',
          type: 'api_key_regenerated',
        })
      );
    });
  });

  describe('trackApiAuthFailure()', () => {
    it('first failure creates entry without notification', async () => {
      await trackApiAuthFailure('partner-fail-1', 'hm_test_abcd', '1.2.3.4');
      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });

    it('below threshold (5) does not trigger notification', async () => {
      for (let i = 0; i < 4; i++) {
        await trackApiAuthFailure('partner-fail-2', 'hm_test_abcd', '1.2.3.4');
      }
      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });

    it('reaching threshold (5) triggers notification', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-fail-3',
        companyName: 'Test Corp',
      });
      mockStorage.getPartnerTeamMembersByRole.mockResolvedValue([
        { email: 'admin@test.com' },
      ]);

      for (let i = 0; i < 5; i++) {
        await trackApiAuthFailure('partner-fail-3', 'hm_test_abcd1234', '1.2.3.4');
      }

      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'api_auth_failed',
          title: 'Multiple Failed API Authentication Attempts',
          message: expect.stringContaining('5'),
        })
      );
    });

    it('sends email to admin members on threshold breach', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-fail-4',
        companyName: 'Acme Corp',
      });
      mockStorage.getPartnerTeamMembersByRole.mockResolvedValue([
        { email: 'admin@acme.com' },
      ]);

      for (let i = 0; i < 5; i++) {
        await trackApiAuthFailure('partner-fail-4', 'hm_test_abcdefgh1234', '10.0.0.1');
      }

      expect(mockSendPartnerSecurityAlert).toHaveBeenCalledWith(
        'admin@acme.com',
        'Acme Corp',
        'Failed API Authentication Attempts',
        expect.stringContaining('10.0.0.1')
      );
    });

    it('does not notify twice within same window', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-fail-5',
        companyName: 'Test Corp',
      });
      mockStorage.getPartnerTeamMembersByRole.mockResolvedValue([]);

      for (let i = 0; i < 10; i++) {
        await trackApiAuthFailure('partner-fail-5', 'hm_test_abcd', '1.2.3.4');
      }

      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('trackNewIpAccess()', () => {
    it('does not notify on first IP (only 1 known IP)', async () => {
      await trackNewIpAccess('partner-ip-c1', '10.0.0.1');
      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });

    it('does not notify for unknown IP string', async () => {
      await trackNewIpAccess('partner-ip-c2', 'unknown');
      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });

    it('does not notify for empty IP string', async () => {
      await trackNewIpAccess('partner-ip-c3', '');
      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });

    it('notifies on second unique IP', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-ip-c4',
        companyName: 'Test Corp',
        notificationPreferences: {},
      });

      await trackNewIpAccess('partner-ip-c4', '10.0.0.1');
      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();

      await trackNewIpAccess('partner-ip-c4', '10.0.0.2');
      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'new_ip_access',
          title: 'New IP Address Detected',
          message: expect.stringContaining('10.0.0.2'),
        })
      );
    });

    it('does not re-notify for already known IP', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-ip-c5',
        companyName: 'Test Corp',
        notificationPreferences: {},
      });

      await trackNewIpAccess('partner-ip-c5', '10.0.0.1');
      await trackNewIpAccess('partner-ip-c5', '10.0.0.2');
      mockStorage.dispatchPartnerNotification.mockClear();

      await trackNewIpAccess('partner-ip-c5', '10.0.0.2');
      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });

    it('notification message includes IP count', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-ip-c6',
        companyName: 'Test Corp',
        notificationPreferences: {},
      });

      await trackNewIpAccess('partner-ip-c6', '10.0.0.1');
      await trackNewIpAccess('partner-ip-c6', '10.0.0.2');

      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            newIpAddress: '10.0.0.2',
            totalKnownIps: 2,
          }),
        })
      );
    });

    it('skips notification when new_ip_access is disabled', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-ip-c7',
        companyName: 'Test Corp',
        notificationPreferences: { new_ip_access: false },
      });

      await trackNewIpAccess('partner-ip-c7', '10.0.0.1');
      await trackNewIpAccess('partner-ip-c7', '10.0.0.2');

      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });

    it('third unique IP within cooldown does not re-notify', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-ip-c8',
        companyName: 'Test Corp',
        notificationPreferences: {},
      });

      await trackNewIpAccess('partner-ip-c8', '10.0.0.1');
      await trackNewIpAccess('partner-ip-c8', '10.0.0.2');
      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalledTimes(1);
      mockStorage.dispatchPartnerNotification.mockClear();

      await trackNewIpAccess('partner-ip-c8', '10.0.0.3');
      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });
  });
});
