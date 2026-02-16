import { describe, it, expect } from 'vitest';
import {
  ROLE_LEVELS,
  NOTIFICATION_MIN_ROLE,
  canReceiveNotification,
  getEligibleRoles,
  type NotificationRole,
  type NotificationType,
} from '@shared/notification-types';

describe('shared/notification-types', () => {
  describe('ROLE_LEVELS', () => {
    it('has all 5 roles', () => {
      expect(Object.keys(ROLE_LEVELS)).toHaveLength(5);
    });

    it('returns correct numeric levels', () => {
      expect(ROLE_LEVELS.viewer).toBe(1);
      expect(ROLE_LEVELS.member).toBe(2);
      expect(ROLE_LEVELS.developer).toBe(3);
      expect(ROLE_LEVELS.admin).toBe(4);
      expect(ROLE_LEVELS.owner).toBe(5);
    });

    it('maintains hierarchy order', () => {
      expect(ROLE_LEVELS.viewer).toBeLessThan(ROLE_LEVELS.member);
      expect(ROLE_LEVELS.member).toBeLessThan(ROLE_LEVELS.developer);
      expect(ROLE_LEVELS.developer).toBeLessThan(ROLE_LEVELS.admin);
      expect(ROLE_LEVELS.admin).toBeLessThan(ROLE_LEVELS.owner);
    });
  });

  describe('NOTIFICATION_MIN_ROLE', () => {
    it('exists and has entries', () => {
      expect(NOTIFICATION_MIN_ROLE).toBeDefined();
      expect(Object.keys(NOTIFICATION_MIN_ROLE).length).toBeGreaterThan(0);
    });

    it('viewer-level notifications', () => {
      expect(NOTIFICATION_MIN_ROLE.assessment_completed).toBe('viewer');
      expect(NOTIFICATION_MIN_ROLE.results_ready).toBe('viewer');
      expect(NOTIFICATION_MIN_ROLE.assessment_started).toBe('viewer');
      expect(NOTIFICATION_MIN_ROLE.assessment_all_completed).toBe('viewer');
    });

    it('member-level notifications', () => {
      expect(NOTIFICATION_MIN_ROLE.new_candidate).toBe('member');
      expect(NOTIFICATION_MIN_ROLE.invitation_sent).toBe('member');
      expect(NOTIFICATION_MIN_ROLE.invitation_accepted).toBe('member');
      expect(NOTIFICATION_MIN_ROLE.invitation_expired).toBe('member');
      expect(NOTIFICATION_MIN_ROLE.bulk_invitation_completed).toBe('member');
      expect(NOTIFICATION_MIN_ROLE.usage_alert).toBe('member');
    });

    it('developer-level notifications', () => {
      expect(NOTIFICATION_MIN_ROLE.api_key_created).toBe('developer');
      expect(NOTIFICATION_MIN_ROLE.api_key_rotated).toBe('developer');
      expect(NOTIFICATION_MIN_ROLE.webhook_created).toBe('developer');
      expect(NOTIFICATION_MIN_ROLE.webhook_failed).toBe('developer');
      expect(NOTIFICATION_MIN_ROLE.integration_connected).toBe('developer');
    });

    it('admin-level notifications', () => {
      expect(NOTIFICATION_MIN_ROLE.purchase_success).toBe('admin');
      expect(NOTIFICATION_MIN_ROLE.payment_failed).toBe('admin');
      expect(NOTIFICATION_MIN_ROLE.quota_warning).toBe('admin');
      expect(NOTIFICATION_MIN_ROLE.team_member_invited).toBe('admin');
      expect(NOTIFICATION_MIN_ROLE.security_alert).toBe('admin');
      expect(NOTIFICATION_MIN_ROLE.suspicious_activity).toBe('admin');
    });
  });

  describe('canReceiveNotification()', () => {
    it('viewer can receive viewer-level notifications', () => {
      expect(canReceiveNotification('viewer', 'assessment_completed')).toBe(true);
      expect(canReceiveNotification('viewer', 'results_ready')).toBe(true);
    });

    it('viewer cannot receive member-level notifications', () => {
      expect(canReceiveNotification('viewer', 'new_candidate')).toBe(false);
      expect(canReceiveNotification('viewer', 'invitation_sent')).toBe(false);
    });

    it('viewer cannot receive admin-level notifications', () => {
      expect(canReceiveNotification('viewer', 'purchase_success')).toBe(false);
      expect(canReceiveNotification('viewer', 'security_alert')).toBe(false);
    });

    it('member can receive viewer-level notifications', () => {
      expect(canReceiveNotification('member', 'assessment_completed')).toBe(true);
    });

    it('member can receive member-level notifications', () => {
      expect(canReceiveNotification('member', 'new_candidate')).toBe(true);
    });

    it('member cannot receive developer-level notifications', () => {
      expect(canReceiveNotification('member', 'api_key_created')).toBe(false);
    });

    it('developer can receive developer-level notifications', () => {
      expect(canReceiveNotification('developer', 'api_key_created')).toBe(true);
      expect(canReceiveNotification('developer', 'webhook_failed')).toBe(true);
    });

    it('developer can receive lower-level notifications', () => {
      expect(canReceiveNotification('developer', 'assessment_completed')).toBe(true);
      expect(canReceiveNotification('developer', 'new_candidate')).toBe(true);
    });

    it('developer cannot receive admin-level notifications', () => {
      expect(canReceiveNotification('developer', 'purchase_success')).toBe(false);
    });

    it('admin can receive all notification levels', () => {
      expect(canReceiveNotification('admin', 'assessment_completed')).toBe(true);
      expect(canReceiveNotification('admin', 'new_candidate')).toBe(true);
      expect(canReceiveNotification('admin', 'api_key_created')).toBe(true);
      expect(canReceiveNotification('admin', 'purchase_success')).toBe(true);
      expect(canReceiveNotification('admin', 'security_alert')).toBe(true);
    });

    it('owner can receive all notification levels', () => {
      expect(canReceiveNotification('owner', 'assessment_completed')).toBe(true);
      expect(canReceiveNotification('owner', 'new_candidate')).toBe(true);
      expect(canReceiveNotification('owner', 'api_key_created')).toBe(true);
      expect(canReceiveNotification('owner', 'purchase_success')).toBe(true);
      expect(canReceiveNotification('owner', 'security_alert')).toBe(true);
    });
  });

  describe('getEligibleRoles()', () => {
    it('viewer-level notification returns all roles', () => {
      const roles = getEligibleRoles('assessment_completed');
      expect(roles).toContain('viewer');
      expect(roles).toContain('member');
      expect(roles).toContain('developer');
      expect(roles).toContain('admin');
      expect(roles).toContain('owner');
    });

    it('member-level notification excludes viewer', () => {
      const roles = getEligibleRoles('new_candidate');
      expect(roles).not.toContain('viewer');
      expect(roles).toContain('member');
      expect(roles).toContain('developer');
      expect(roles).toContain('admin');
      expect(roles).toContain('owner');
    });

    it('developer-level notification excludes viewer and member', () => {
      const roles = getEligibleRoles('api_key_created');
      expect(roles).not.toContain('viewer');
      expect(roles).not.toContain('member');
      expect(roles).toContain('developer');
      expect(roles).toContain('admin');
      expect(roles).toContain('owner');
    });

    it('admin-level notification only includes admin and owner', () => {
      const roles = getEligibleRoles('purchase_success');
      expect(roles).not.toContain('viewer');
      expect(roles).not.toContain('member');
      expect(roles).not.toContain('developer');
      expect(roles).toContain('admin');
      expect(roles).toContain('owner');
    });
  });
});
