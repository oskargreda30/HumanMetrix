/**
 * Unit Tests for Partner Notification System
 * 
 * Tests cover:
 * - Notification types and categories
 * - Role-based notification routing
 * - Purchase CTA buttons for PAYG partners
 * - Low balance alert thresholds
 */

import { describe, it, expect } from 'vitest';

// Notification types
type NotificationType = 
  | 'credits_purchased'
  | 'low_balance'
  | 'credits_exhausted'
  | 'assessment_completed'
  | 'team_member_invited'
  | 'api_key_created'
  | 'quota_alert';

// Partner billing types
type BillingType = 'prepaid' | 'auto_bill' | 'invoice' | 'payg';

// Role-based visibility
type PartnerRole = 'owner' | 'admin' | 'billing' | 'developer' | 'viewer';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

// Check if notification should show Purchase CTA
function shouldShowPurchaseCTA(
  notificationType: NotificationType,
  billingType: BillingType
): boolean {
  // Only show Purchase CTA for PAYG (prepaid) partners
  if (billingType !== 'prepaid' && billingType !== 'payg') {
    return false;
  }
  
  // Show CTA for credits-related notifications
  const ctaNotificationTypes: NotificationType[] = [
    'credits_purchased',
    'low_balance',
    'credits_exhausted',
    'quota_alert',
  ];
  
  return ctaNotificationTypes.includes(notificationType);
}

// Get low balance threshold based on partner settings
function getLowBalanceThreshold(prepaidBalance: number, customThreshold?: number): number {
  if (customThreshold !== undefined) {
    return customThreshold;
  }
  
  // Default threshold: 20% of balance or 5, whichever is higher
  return Math.max(5, Math.floor(prepaidBalance * 0.2));
}

// Check if balance is below threshold
function isLowBalance(currentBalance: number, threshold: number): boolean {
  return currentBalance <= threshold && currentBalance > 0;
}

// Check if credits are exhausted
function isCreditsExhausted(currentBalance: number): boolean {
  return currentBalance <= 0;
}

// Role-based notification visibility
const ROLE_NOTIFICATION_ACCESS: Record<PartnerRole, NotificationType[]> = {
  owner: [
    'credits_purchased', 'low_balance', 'credits_exhausted', 
    'assessment_completed', 'team_member_invited', 'api_key_created', 'quota_alert'
  ],
  admin: [
    'credits_purchased', 'low_balance', 'credits_exhausted',
    'assessment_completed', 'team_member_invited', 'api_key_created', 'quota_alert'
  ],
  billing: [
    'credits_purchased', 'low_balance', 'credits_exhausted', 'quota_alert'
  ],
  developer: [
    'assessment_completed', 'api_key_created'
  ],
  viewer: [
    'assessment_completed'
  ],
};

function canViewNotification(role: PartnerRole, notificationType: NotificationType): boolean {
  const allowedTypes = ROLE_NOTIFICATION_ACCESS[role];
  return allowedTypes.includes(notificationType);
}

// Generate notification message for credits purchased
function generateCreditsPurchasedMessage(credits: number, newBalance: number): string {
  return `${credits} credits have been added to your account. New balance: ${newBalance} credits.`;
}

// Generate low balance alert message
function generateLowBalanceMessage(currentBalance: number): string {
  return `Your credit balance is running low. You have ${currentBalance} credits remaining. Consider purchasing more to avoid service interruption.`;
}

describe('Notification Purchase CTA', () => {
  describe('PAYG Partner CTAs', () => {
    it('should show Purchase CTA for credits_purchased on PAYG partners', () => {
      expect(shouldShowPurchaseCTA('credits_purchased', 'prepaid')).toBe(true);
      expect(shouldShowPurchaseCTA('credits_purchased', 'payg')).toBe(true);
    });

    it('should show Purchase CTA for low_balance on PAYG partners', () => {
      expect(shouldShowPurchaseCTA('low_balance', 'prepaid')).toBe(true);
      expect(shouldShowPurchaseCTA('low_balance', 'payg')).toBe(true);
    });

    it('should show Purchase CTA for credits_exhausted on PAYG partners', () => {
      expect(shouldShowPurchaseCTA('credits_exhausted', 'prepaid')).toBe(true);
    });

    it('should show Purchase CTA for quota_alert on PAYG partners', () => {
      expect(shouldShowPurchaseCTA('quota_alert', 'prepaid')).toBe(true);
    });
  });

  describe('Non-PAYG Partners (No CTA)', () => {
    it('should not show Purchase CTA for auto_bill partners', () => {
      expect(shouldShowPurchaseCTA('credits_purchased', 'auto_bill')).toBe(false);
      expect(shouldShowPurchaseCTA('low_balance', 'auto_bill')).toBe(false);
    });

    it('should not show Purchase CTA for invoice partners', () => {
      expect(shouldShowPurchaseCTA('credits_purchased', 'invoice')).toBe(false);
      expect(shouldShowPurchaseCTA('low_balance', 'invoice')).toBe(false);
    });
  });

  describe('Non-Credit Notifications (No CTA)', () => {
    it('should not show Purchase CTA for assessment_completed', () => {
      expect(shouldShowPurchaseCTA('assessment_completed', 'prepaid')).toBe(false);
    });

    it('should not show Purchase CTA for team_member_invited', () => {
      expect(shouldShowPurchaseCTA('team_member_invited', 'prepaid')).toBe(false);
    });

    it('should not show Purchase CTA for api_key_created', () => {
      expect(shouldShowPurchaseCTA('api_key_created', 'prepaid')).toBe(false);
    });
  });
});

describe('Low Balance Thresholds', () => {
  describe('Default Threshold Calculation', () => {
    it('should use 20% of balance when greater than 5', () => {
      const threshold = getLowBalanceThreshold(100);
      expect(threshold).toBe(20);
    });

    it('should use minimum of 5 when 20% is less', () => {
      const threshold = getLowBalanceThreshold(10);
      expect(threshold).toBe(5); // 20% of 10 = 2, but minimum is 5
    });

    it('should use custom threshold when provided', () => {
      const threshold = getLowBalanceThreshold(100, 15);
      expect(threshold).toBe(15);
    });
  });

  describe('Low Balance Detection', () => {
    it('should detect low balance when at threshold', () => {
      expect(isLowBalance(5, 5)).toBe(true);
    });

    it('should detect low balance when below threshold', () => {
      expect(isLowBalance(3, 5)).toBe(true);
    });

    it('should not flag as low when above threshold', () => {
      expect(isLowBalance(10, 5)).toBe(false);
    });

    it('should not flag zero balance as low (that is exhausted)', () => {
      expect(isLowBalance(0, 5)).toBe(false);
    });
  });

  describe('Credits Exhausted Detection', () => {
    it('should detect exhausted when balance is zero', () => {
      expect(isCreditsExhausted(0)).toBe(true);
    });

    it('should detect exhausted when balance is negative', () => {
      expect(isCreditsExhausted(-5)).toBe(true);
    });

    it('should not flag positive balance as exhausted', () => {
      expect(isCreditsExhausted(1)).toBe(false);
    });
  });
});

describe('Role-Based Notification Access', () => {
  describe('Owner Access', () => {
    it('should have access to all notification types', () => {
      const allTypes: NotificationType[] = [
        'credits_purchased', 'low_balance', 'credits_exhausted',
        'assessment_completed', 'team_member_invited', 'api_key_created', 'quota_alert'
      ];
      
      allTypes.forEach(type => {
        expect(canViewNotification('owner', type)).toBe(true);
      });
    });
  });

  describe('Admin Access', () => {
    it('should have access to all notification types', () => {
      expect(canViewNotification('admin', 'credits_purchased')).toBe(true);
      expect(canViewNotification('admin', 'assessment_completed')).toBe(true);
    });
  });

  describe('Billing Access', () => {
    it('should have access to billing-related notifications', () => {
      expect(canViewNotification('billing', 'credits_purchased')).toBe(true);
      expect(canViewNotification('billing', 'low_balance')).toBe(true);
      expect(canViewNotification('billing', 'credits_exhausted')).toBe(true);
      expect(canViewNotification('billing', 'quota_alert')).toBe(true);
    });

    it('should not have access to non-billing notifications', () => {
      expect(canViewNotification('billing', 'assessment_completed')).toBe(false);
      expect(canViewNotification('billing', 'api_key_created')).toBe(false);
    });
  });

  describe('Developer Access', () => {
    it('should have access to developer-relevant notifications', () => {
      expect(canViewNotification('developer', 'assessment_completed')).toBe(true);
      expect(canViewNotification('developer', 'api_key_created')).toBe(true);
    });

    it('should not have access to billing notifications', () => {
      expect(canViewNotification('developer', 'credits_purchased')).toBe(false);
      expect(canViewNotification('developer', 'low_balance')).toBe(false);
    });
  });

  describe('Viewer Access', () => {
    it('should only have access to assessment_completed', () => {
      expect(canViewNotification('viewer', 'assessment_completed')).toBe(true);
    });

    it('should not have access to other notifications', () => {
      expect(canViewNotification('viewer', 'credits_purchased')).toBe(false);
      expect(canViewNotification('viewer', 'api_key_created')).toBe(false);
      expect(canViewNotification('viewer', 'team_member_invited')).toBe(false);
    });
  });
});

describe('Notification Message Generation', () => {
  describe('Credits Purchased Messages', () => {
    it('should generate correct credits purchased message', () => {
      const message = generateCreditsPurchasedMessage(50, 150);
      expect(message).toContain('50 credits');
      expect(message).toContain('150 credits');
    });

    it('should handle single credit purchase', () => {
      const message = generateCreditsPurchasedMessage(1, 11);
      expect(message).toContain('1 credits');
    });
  });

  describe('Low Balance Messages', () => {
    it('should generate correct low balance message', () => {
      const message = generateLowBalanceMessage(5);
      expect(message).toContain('5 credits');
      expect(message).toContain('running low');
    });
  });
});

describe('Notification Filtering', () => {
  const sampleNotifications: Notification[] = [
    { id: '1', type: 'credits_purchased', title: 'Credits Added', message: 'Test', read: false, createdAt: new Date() },
    { id: '2', type: 'low_balance', title: 'Low Balance', message: 'Test', read: true, createdAt: new Date() },
    { id: '3', type: 'assessment_completed', title: 'Assessment Done', message: 'Test', read: false, createdAt: new Date() },
  ];

  it('should filter unread notifications', () => {
    const unread = sampleNotifications.filter(n => !n.read);
    expect(unread.length).toBe(2);
  });

  it('should filter by notification type', () => {
    const billingNotifications = sampleNotifications.filter(n => 
      ['credits_purchased', 'low_balance', 'credits_exhausted', 'quota_alert'].includes(n.type)
    );
    expect(billingNotifications.length).toBe(2);
  });

  it('should count unread notifications', () => {
    const unreadCount = sampleNotifications.filter(n => !n.read).length;
    expect(unreadCount).toBe(2);
  });
});
