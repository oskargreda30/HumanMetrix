import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage = vi.hoisted(() => ({
  getPartnerAccount: vi.fn(),
  updatePartnerAccount: vi.fn(),
  getUsageEventsByPartner: vi.fn(),
  createUsageEvent: vi.fn(),
}));

vi.mock('../../server/storage', () => ({
  storage: mockStorage,
}));

const mockStripeFns = vi.hoisted(() => ({
  subscriptionsRetrieve: vi.fn(),
  subscriptionsCreate: vi.fn(),
  customersCreate: vi.fn(),
  invoicesList: vi.fn(),
  invoicesUpcoming: vi.fn(),
  meterEventsCreate: vi.fn(),
}));

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      subscriptions: {
        retrieve: mockStripeFns.subscriptionsRetrieve,
        create: mockStripeFns.subscriptionsCreate,
      },
      customers: {
        create: mockStripeFns.customersCreate,
      },
      invoices: {
        list: mockStripeFns.invoicesList,
        upcoming: mockStripeFns.invoicesUpcoming,
      },
      billing: {
        meterEvents: {
          create: mockStripeFns.meterEventsCreate,
        },
      },
    })),
  };
});

import {
  reportUsageToStripe,
  getPartnerBillingInfo,
  createStripeCustomerForPartner,
  createMeteredSubscription,
  getMonthlyUsageSummary,
  recordBillableUsage,
} from '../../server/partner-billing';

describe('Partner Billing Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reportUsageToStripe()', () => {
    it('returns error when partner has no subscription', async () => {
      const partner = { id: 'p1', stripeSubscriptionId: null } as any;
      const usageEvent = { id: 'ue-1' } as any;

      const result = await reportUsageToStripe(partner, usageEvent);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No Stripe subscription');
    });

    it('reports usage to Stripe when subscription exists', async () => {
      const partner = {
        id: 'p1',
        stripeSubscriptionId: 'sub-123',
        stripeCustomerId: 'cus-123',
      } as any;
      const usageEvent = { id: 'ue-1' } as any;

      mockStripeFns.subscriptionsRetrieve.mockResolvedValue({
        items: {
          data: [
            {
              id: 'si-1',
              price: { recurring: { usage_type: 'metered' } },
            },
          ],
        },
      });
      mockStripeFns.meterEventsCreate.mockResolvedValue({ id: 'me-1' });

      const result = await reportUsageToStripe(partner, usageEvent, 1);
      expect(result.success).toBe(true);
      expect(result.usageRecordId).toBe('me-1');
    });

    it('returns error when no metered item found', async () => {
      const partner = {
        id: 'p1',
        stripeSubscriptionId: 'sub-123',
        stripeCustomerId: 'cus-123',
      } as any;
      const usageEvent = { id: 'ue-1' } as any;

      mockStripeFns.subscriptionsRetrieve.mockResolvedValue({
        items: {
          data: [
            {
              id: 'si-1',
              price: { recurring: { usage_type: 'licensed' } },
            },
          ],
        },
      });

      const result = await reportUsageToStripe(partner, usageEvent);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No metered subscription item');
    });
  });

  describe('getPartnerBillingInfo()', () => {
    it('returns correct structure with usage data', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        pricePerAssessment: 500,
        stripeCustomerId: null,
      });
      mockStorage.getUsageEventsByPartner.mockResolvedValue([
        { id: 'ue-1', billable: true, eventType: 'session_completed', billedAmount: 500 },
        { id: 'ue-2', billable: false, eventType: 'session_created' },
        { id: 'ue-3', billable: true, eventType: 'session_completed', billedAmount: 500 },
      ]);

      const result = await getPartnerBillingInfo('p1');
      expect(result.currentPeriodUsage).toBe(2);
      expect(result.currentPeriodCost).toBe(1000);
      expect(result.billingPeriodStart).toBeInstanceOf(Date);
      expect(result.billingPeriodEnd).toBeInstanceOf(Date);
      expect(result.invoices).toEqual([]);
      expect(result.upcomingInvoice).toBeNull();
    });

    it('throws when partner not found', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue(null);
      await expect(getPartnerBillingInfo('p-missing')).rejects.toThrow('Partner not found');
    });

    it('fetches invoices from Stripe when customer exists', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        pricePerAssessment: 500,
        stripeCustomerId: 'cus-123',
      });
      mockStorage.getUsageEventsByPartner.mockResolvedValue([]);
      mockStripeFns.invoicesList.mockResolvedValue({
        data: [
          {
            id: 'inv-1',
            number: 'INV-001',
            status: 'paid',
            amount_due: 5000,
            currency: 'gbp',
            created: 1700000000,
            status_transitions: { paid_at: 1700000100 },
            hosted_invoice_url: 'https://stripe.com/inv-1',
            invoice_pdf: 'https://stripe.com/inv-1.pdf',
          },
        ],
      });
      mockStripeFns.invoicesUpcoming.mockRejectedValue({ code: 'invoice_upcoming_none' });

      const result = await getPartnerBillingInfo('p1');
      expect(result.invoices).toHaveLength(1);
      expect(result.invoices[0].id).toBe('inv-1');
    });
  });

  describe('createStripeCustomerForPartner()', () => {
    it('returns existing customer ID if already set', async () => {
      const partner = {
        id: 'p1',
        stripeCustomerId: 'cus-existing',
      } as any;

      const result = await createStripeCustomerForPartner(partner);
      expect(result).toEqual({ customerId: 'cus-existing' });
      expect(mockStripeFns.customersCreate).not.toHaveBeenCalled();
    });

    it('creates new customer when none exists', async () => {
      const partner = {
        id: 'p1',
        stripeCustomerId: null,
        billingEmail: 'billing@test.com',
        email: 'main@test.com',
        companyName: 'Test Corp',
        name: 'Test',
      } as any;

      mockStripeFns.customersCreate.mockResolvedValue({ id: 'cus-new' });
      mockStorage.updatePartnerAccount.mockResolvedValue(undefined);

      const result = await createStripeCustomerForPartner(partner);
      expect(result).toEqual({ customerId: 'cus-new' });
      expect(mockStripeFns.customersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'billing@test.com',
          name: 'Test Corp',
        })
      );
      expect(mockStorage.updatePartnerAccount).toHaveBeenCalledWith('p1', {
        stripeCustomerId: 'cus-new',
      });
    });

    it('returns null on Stripe error', async () => {
      const partner = {
        id: 'p1',
        stripeCustomerId: null,
        billingEmail: null,
        email: 'main@test.com',
        companyName: 'Test Corp',
        name: 'Test',
      } as any;

      mockStripeFns.customersCreate.mockRejectedValue(new Error('Stripe error'));

      const result = await createStripeCustomerForPartner(partner);
      expect(result).toBeNull();
    });
  });

  describe('createMeteredSubscription()', () => {
    it('creates subscription with existing Stripe customer', async () => {
      const partner = {
        id: 'p1',
        stripeCustomerId: 'cus-123',
        name: 'Test',
      } as any;

      mockStripeFns.subscriptionsCreate.mockResolvedValue({ id: 'sub-new' });
      mockStorage.updatePartnerAccount.mockResolvedValue(undefined);

      const result = await createMeteredSubscription(partner, 'price-123');
      expect(result).toEqual({ subscriptionId: 'sub-new' });
      expect(mockStripeFns.subscriptionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus-123',
          items: [{ price: 'price-123' }],
        })
      );
    });

    it('creates customer first if none exists', async () => {
      const partner = {
        id: 'p1',
        stripeCustomerId: null,
        billingEmail: 'billing@test.com',
        email: 'main@test.com',
        companyName: 'Test Corp',
        name: 'Test',
      } as any;

      mockStripeFns.customersCreate.mockResolvedValue({ id: 'cus-new' });
      mockStorage.updatePartnerAccount.mockResolvedValue(undefined);
      mockStorage.getPartnerAccount.mockResolvedValue({
        ...partner,
        stripeCustomerId: 'cus-new',
      });
      mockStripeFns.subscriptionsCreate.mockResolvedValue({ id: 'sub-new' });

      const result = await createMeteredSubscription(partner, 'price-123');
      expect(result).toEqual({ subscriptionId: 'sub-new' });
      expect(mockStripeFns.customersCreate).toHaveBeenCalled();
    });

    it('returns null on subscription creation failure', async () => {
      const partner = {
        id: 'p1',
        stripeCustomerId: 'cus-123',
        name: 'Test',
      } as any;

      mockStripeFns.subscriptionsCreate.mockRejectedValue(new Error('Stripe error'));

      const result = await createMeteredSubscription(partner, 'price-123');
      expect(result).toBeNull();
    });
  });

  describe('getMonthlyUsageSummary()', () => {
    it('returns aggregated usage data', async () => {
      mockStorage.getUsageEventsByPartner.mockResolvedValue([
        { id: 'ue-1', billable: true, eventType: 'session_completed', assessmentType: 'fit', billedAmount: 500 },
        { id: 'ue-2', billable: true, eventType: 'session_completed', assessmentType: 'ai_readiness', billedAmount: 500 },
        { id: 'ue-3', billable: true, eventType: 'session_completed', assessmentType: 'fit', billedAmount: 500 },
        { id: 'ue-4', billable: false, eventType: 'session_created' },
        { id: 'ue-5', billable: false, eventType: 'session_created' },
      ]);

      const result = await getMonthlyUsageSummary('p1');
      expect(result.completedSessions).toBe(3);
      expect(result.totalBilledAmount).toBe(1500);
      expect(result.byAssessmentType).toEqual({ fit: 2, ai_readiness: 1 });
    });

    it('returns zeros when no usage', async () => {
      mockStorage.getUsageEventsByPartner.mockResolvedValue([]);

      const result = await getMonthlyUsageSummary('p1');
      expect(result.totalSessions).toBe(0);
      expect(result.completedSessions).toBe(0);
      expect(result.totalBilledAmount).toBe(0);
      expect(result.byAssessmentType).toEqual({});
    });
  });

  describe('recordBillableUsage()', () => {
    it('creates billable usage event', async () => {
      const partner = {
        id: 'p1',
        pricePerAssessment: 500,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
      } as any;
      const session = {
        id: 'session-1',
        apiKeyId: 'key-1',
        assessmentType: 'fit',
        externalUserId: 'ext-1',
      } as any;

      mockStorage.createUsageEvent.mockResolvedValue({ id: 'ue-new' });

      await recordBillableUsage(partner, session);

      expect(mockStorage.createUsageEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId: 'p1',
          sessionId: 'session-1',
          eventType: 'session_completed',
          billable: true,
          billedAmount: 500,
        })
      );
    });

    it('reports to Stripe when subscription exists', async () => {
      const partner = {
        id: 'p1',
        pricePerAssessment: 500,
        stripeSubscriptionId: 'sub-123',
        stripeCustomerId: 'cus-123',
      } as any;
      const session = {
        id: 'session-1',
        apiKeyId: 'key-1',
        assessmentType: 'fit',
        externalUserId: 'ext-1',
      } as any;

      mockStorage.createUsageEvent.mockResolvedValue({ id: 'ue-new' });
      mockStripeFns.subscriptionsRetrieve.mockResolvedValue({
        items: {
          data: [
            { id: 'si-1', price: { recurring: { usage_type: 'metered' } } },
          ],
        },
      });
      mockStripeFns.meterEventsCreate.mockResolvedValue({ id: 'me-1' });

      await recordBillableUsage(partner, session);

      expect(mockStripeFns.meterEventsCreate).toHaveBeenCalled();
    });

    it('uses default pricePerAssessment of 500 when not set', async () => {
      const partner = {
        id: 'p1',
        pricePerAssessment: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
      } as any;
      const session = {
        id: 'session-1',
        apiKeyId: 'key-1',
        assessmentType: 'fit',
        externalUserId: null,
      } as any;

      mockStorage.createUsageEvent.mockResolvedValue({ id: 'ue-new' });

      await recordBillableUsage(partner, session);

      expect(mockStorage.createUsageEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          billedAmount: 500,
        })
      );
    });
  });
});
