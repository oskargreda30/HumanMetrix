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

describe('Partner Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.dispatchPartnerNotification.mockResolvedValue(undefined);
  });

  describe('notifyTeamMemberRoleChanged()', () => {
    it('dispatches notification when enabled', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        notificationPreferences: {},
      });

      await notifyTeamMemberRoleChanged(
        'p1', 'member-1', 'user@test.com', 'John', 'member', 'admin'
      );

      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId: 'p1',
          type: 'team_member_role_changed',
          title: 'Team Member Role Updated',
        })
      );
    });

    it('skips notification when disabled by partner preferences', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        notificationPreferences: { team_member_role_changed: false },
      });

      await notifyTeamMemberRoleChanged(
        'p1', 'member-1', 'user@test.com', 'John', 'member', 'admin'
      );

      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });

    it('uses email as display name when name is null', async () => {
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
  });

  describe('notifyApiKeyRegenerated()', () => {
    it('dispatches notification and sends email to admin members', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        companyName: 'Test Corp',
      });
      mockStorage.getPartnerTeamMembersByRole.mockResolvedValue([
        { email: 'admin@test.com' },
        { email: 'billing@test.com' },
      ]);

      await notifyApiKeyRegenerated('p1', 'tm-1', 'user-1');

      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId: 'p1',
          type: 'api_key_regenerated',
          title: 'API Key Regenerated',
        })
      );

      expect(mockSendPartnerSecurityAlert).toHaveBeenCalledTimes(2);
      expect(mockSendPartnerSecurityAlert).toHaveBeenCalledWith(
        'admin@test.com',
        'Test Corp',
        'API Key Regenerated',
        expect.any(String)
      );
    });

    it('returns early if partner not found', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue(null);

      await notifyApiKeyRegenerated('p-missing');

      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });
  });

  describe('trackApiAuthFailure()', () => {
    it('first attempt creates entry without notification', async () => {
      await trackApiAuthFailure('partner-track-1', 'hm_test_abcd', '1.2.3.4');
      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });

    it('below threshold (5) does not notify', async () => {
      for (let i = 0; i < 4; i++) {
        await trackApiAuthFailure('partner-track-2', 'hm_test_abcd', '1.2.3.4');
      }
      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });

    it('at threshold (5) notifies', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-track-3',
        companyName: 'Test Corp',
      });
      mockStorage.getPartnerTeamMembersByRole.mockResolvedValue([
        { email: 'admin@test.com' },
      ]);

      for (let i = 0; i < 5; i++) {
        await trackApiAuthFailure('partner-track-3', 'hm_test_abcd1234', '1.2.3.4');
      }

      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'api_auth_failed',
          title: 'Multiple Failed API Authentication Attempts',
        })
      );
    });
  });

  describe('trackNewIpAccess()', () => {
    it('does not notify on first IP (only 1 known IP)', async () => {
      await trackNewIpAccess('partner-ip-1', '10.0.0.1');
      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });

    it('does not notify for unknown/empty IP', async () => {
      await trackNewIpAccess('partner-ip-2', 'unknown');
      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();

      await trackNewIpAccess('partner-ip-2', '');
      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });

    it('notifies on second unique IP', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-ip-3',
        companyName: 'Test Corp',
        notificationPreferences: {},
      });

      await trackNewIpAccess('partner-ip-3', '10.0.0.1');
      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();

      await trackNewIpAccess('partner-ip-3', '10.0.0.2');
      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'new_ip_access',
          title: 'New IP Address Detected',
        })
      );
    });

    it('does not notify for same IP again', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-ip-4',
        companyName: 'Test Corp',
        notificationPreferences: {},
      });

      await trackNewIpAccess('partner-ip-4', '10.0.0.1');
      await trackNewIpAccess('partner-ip-4', '10.0.0.2');
      mockStorage.dispatchPartnerNotification.mockClear();

      await trackNewIpAccess('partner-ip-4', '10.0.0.2');
      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });
  });

  describe('isNotificationEnabled() (tested via notifyTeamMemberRoleChanged)', () => {
    it('defaults to enabled when no preferences set', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        notificationPreferences: null,
      });

      await notifyTeamMemberRoleChanged(
        'p1', 'member-1', 'user@test.com', 'John', 'member', 'admin'
      );

      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalled();
    });

    it('defaults to enabled when partner not found', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue(null);

      await notifyTeamMemberRoleChanged(
        'p-nonexistent', 'member-1', 'user@test.com', 'John', 'member', 'admin'
      );

      expect(mockStorage.dispatchPartnerNotification).toHaveBeenCalled();
    });

    it('disables notification when explicitly set to false', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        notificationPreferences: { team_member_role_changed: false },
      });

      await notifyTeamMemberRoleChanged(
        'p1', 'member-1', 'user@test.com', 'John', 'member', 'admin'
      );

      expect(mockStorage.dispatchPartnerNotification).not.toHaveBeenCalled();
    });
  });
});
