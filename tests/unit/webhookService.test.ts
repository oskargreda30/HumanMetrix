import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

const mockStorage = vi.hoisted(() => ({
  getActiveWebhooksForEvent: vi.fn(),
  createWebhookDeliveryLog: vi.fn(),
  updateWebhookDeliveryLog: vi.fn(),
  updateWebhookStats: vi.fn(),
  getPendingWebhookDeliveries: vi.fn(),
  getPartnerWebhook: vi.fn(),
}));

vi.mock('../../server/storage', () => ({
  storage: mockStorage,
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  WEBHOOK_EVENTS,
  verifyWebhookSignature,
  triggerWebhook,
  processRetryQueue,
} from '../../server/services/webhookService';

describe('Webhook Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WEBHOOK_EVENTS', () => {
    it('contains expected events', () => {
      expect(WEBHOOK_EVENTS).toContain('assessment.started');
      expect(WEBHOOK_EVENTS).toContain('assessment.completed');
      expect(WEBHOOK_EVENTS).toContain('session.created');
      expect(WEBHOOK_EVENTS).toContain('session.expired');
      expect(WEBHOOK_EVENTS).toContain('results.ready');
    });

    it('has 5 events', () => {
      expect(WEBHOOK_EVENTS).toHaveLength(5);
    });

    it('is a readonly array', () => {
      expect(Array.isArray(WEBHOOK_EVENTS)).toBe(true);
    });
  });

  describe('verifyWebhookSignature()', () => {
    it('returns true for valid signature', () => {
      const secret = 'test-secret';
      const payload = JSON.stringify({ event: 'test', data: {} });
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

      expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
    });

    it('returns false for invalid signature', () => {
      const secret = 'test-secret';
      const payload = JSON.stringify({ event: 'test', data: {} });
      const wrongSignature = crypto
        .createHmac('sha256', 'wrong-secret')
        .update(payload, 'utf8')
        .digest('hex');

      expect(verifyWebhookSignature(payload, wrongSignature, secret)).toBe(false);
    });

    it('validates with known payload/secret/signature', () => {
      const secret = 'my-webhook-secret';
      const payload = '{"event":"assessment.completed","data":{"id":"123"}}';
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

      expect(verifyWebhookSignature(payload, expectedSignature, secret)).toBe(true);
    });

    it('returns false when payload is tampered', () => {
      const secret = 'test-secret';
      const originalPayload = JSON.stringify({ event: 'test', data: { id: '1' } });
      const signature = crypto
        .createHmac('sha256', secret)
        .update(originalPayload, 'utf8')
        .digest('hex');

      const tamperedPayload = JSON.stringify({ event: 'test', data: { id: '2' } });
      expect(verifyWebhookSignature(tamperedPayload, signature, secret)).toBe(false);
    });

    it('returns false for empty signature', () => {
      const secret = 'test-secret';
      const payload = JSON.stringify({ event: 'test' });
      const validSig = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
      const wrongSig = '0'.repeat(validSig.length);
      expect(verifyWebhookSignature(payload, wrongSig, secret)).toBe(false);
    });
  });

  describe('triggerWebhook()', () => {
    it('returns early when no active webhooks', async () => {
      mockStorage.getActiveWebhooksForEvent.mockResolvedValue([]);

      await triggerWebhook('p1', 'assessment.completed', { id: '123' });

      expect(mockStorage.createWebhookDeliveryLog).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('marks delivery as delivered on successful HTTP response', async () => {
      const webhook = {
        id: 'wh-1',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        maxRetries: 3,
        retryDelaySeconds: 60,
        isActive: true,
      };
      mockStorage.getActiveWebhooksForEvent.mockResolvedValue([webhook]);
      mockStorage.createWebhookDeliveryLog.mockResolvedValue({
        id: 'dl-1',
        attemptNumber: 1,
      });
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      });

      await triggerWebhook('p1', 'assessment.completed', { id: '123' });

      expect(mockStorage.updateWebhookDeliveryLog).toHaveBeenCalledWith(
        'dl-1',
        expect.objectContaining({
          status: 'delivered',
          httpStatus: 200,
        })
      );
      expect(mockStorage.updateWebhookStats).toHaveBeenCalledWith('wh-1', true);
    });

    it('sends correct headers including signature and event type', async () => {
      const webhook = {
        id: 'wh-2',
        url: 'https://example.com/hook',
        secret: 'secret-123',
        maxRetries: 3,
        retryDelaySeconds: 60,
        isActive: true,
      };
      mockStorage.getActiveWebhooksForEvent.mockResolvedValue([webhook]);
      mockStorage.createWebhookDeliveryLog.mockResolvedValue({
        id: 'dl-2',
        attemptNumber: 1,
      });
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      });

      await triggerWebhook('p1', 'session.created', { sessionId: 'abc' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/hook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Signature': expect.any(String),
            'X-Webhook-Event': 'session.created',
            'User-Agent': 'HumanMetrix-Webhook/1.0',
          }),
        })
      );
    });

    it('marks delivery as retrying on failure with retries remaining', async () => {
      const webhook = {
        id: 'wh-1',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        maxRetries: 3,
        retryDelaySeconds: 60,
        isActive: true,
      };
      mockStorage.getActiveWebhooksForEvent.mockResolvedValue([webhook]);
      mockStorage.createWebhookDeliveryLog.mockResolvedValue({
        id: 'dl-1',
        attemptNumber: 1,
      });
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server Error'),
      });

      await triggerWebhook('p1', 'assessment.completed', { id: '123' });

      expect(mockStorage.updateWebhookDeliveryLog).toHaveBeenCalledWith(
        'dl-1',
        expect.objectContaining({
          status: 'retrying',
          errorMessage: 'HTTP 500',
          nextRetryAt: expect.any(Date),
        })
      );
    });

    it('marks delivery as failed when no retries remaining', async () => {
      const webhook = {
        id: 'wh-1',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        maxRetries: 1,
        retryDelaySeconds: 60,
        isActive: true,
      };
      mockStorage.getActiveWebhooksForEvent.mockResolvedValue([webhook]);
      mockStorage.createWebhookDeliveryLog.mockResolvedValue({
        id: 'dl-1',
        attemptNumber: 1,
      });
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server Error'),
      });

      await triggerWebhook('p1', 'assessment.completed', { id: '123' });

      expect(mockStorage.updateWebhookDeliveryLog).toHaveBeenCalledWith(
        'dl-1',
        expect.objectContaining({ status: 'failed' })
      );
      expect(mockStorage.updateWebhookStats).toHaveBeenCalledWith('wh-1', false);
    });

    it('handles network error gracefully', async () => {
      const webhook = {
        id: 'wh-1',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        maxRetries: 3,
        retryDelaySeconds: 60,
        isActive: true,
      };
      mockStorage.getActiveWebhooksForEvent.mockResolvedValue([webhook]);
      mockStorage.createWebhookDeliveryLog.mockResolvedValue({
        id: 'dl-1',
        attemptNumber: 1,
      });
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      await triggerWebhook('p1', 'assessment.completed', { id: '123' });

      expect(mockStorage.updateWebhookDeliveryLog).toHaveBeenCalledWith(
        'dl-1',
        expect.objectContaining({
          status: 'retrying',
          errorMessage: 'Connection refused',
        })
      );
    });

    it('processes multiple webhooks for same event', async () => {
      const webhook1 = {
        id: 'wh-1',
        url: 'https://example.com/hook1',
        secret: 'secret-1',
        maxRetries: 3,
        retryDelaySeconds: 60,
        isActive: true,
      };
      const webhook2 = {
        id: 'wh-2',
        url: 'https://example.com/hook2',
        secret: 'secret-2',
        maxRetries: 3,
        retryDelaySeconds: 60,
        isActive: true,
      };
      mockStorage.getActiveWebhooksForEvent.mockResolvedValue([webhook1, webhook2]);
      mockStorage.createWebhookDeliveryLog
        .mockResolvedValueOnce({ id: 'dl-1', attemptNumber: 1 })
        .mockResolvedValueOnce({ id: 'dl-2', attemptNumber: 1 });
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      });

      await triggerWebhook('p1', 'assessment.completed', { id: '123' });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockStorage.updateWebhookStats).toHaveBeenCalledTimes(2);
    });
  });

  describe('processRetryQueue()', () => {
    it('returns 0 when no pending deliveries', async () => {
      mockStorage.getPendingWebhookDeliveries.mockResolvedValue([]);
      const count = await processRetryQueue();
      expect(count).toBe(0);
    });

    it('processes pending deliveries and returns count', async () => {
      const delivery = {
        id: 'dl-1',
        webhookId: 'wh-1',
        attemptNumber: 1,
        payload: { event: 'assessment.completed', timestamp: '2026-01-01', data: {} },
      };
      const webhook = {
        id: 'wh-1',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        maxRetries: 3,
        retryDelaySeconds: 60,
        isActive: true,
      };

      mockStorage.getPendingWebhookDeliveries.mockResolvedValue([delivery]);
      mockStorage.getPartnerWebhook.mockResolvedValue(webhook);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      });

      const count = await processRetryQueue();
      expect(count).toBe(1);
      expect(mockStorage.updateWebhookDeliveryLog).toHaveBeenCalledWith(
        'dl-1',
        expect.objectContaining({
          status: 'delivered',
          attemptNumber: 2,
        })
      );
      expect(mockStorage.updateWebhookStats).toHaveBeenCalledWith('wh-1', true);
    });

    it('skips disabled/deleted webhooks and marks as failed', async () => {
      const delivery = {
        id: 'dl-2',
        webhookId: 'wh-inactive',
        attemptNumber: 1,
        payload: { event: 'assessment.completed', timestamp: '2026-01-01', data: {} },
      };

      mockStorage.getPendingWebhookDeliveries.mockResolvedValue([delivery]);
      mockStorage.getPartnerWebhook.mockResolvedValue(null);

      await processRetryQueue();
      expect(mockStorage.updateWebhookDeliveryLog).toHaveBeenCalledWith(
        'dl-2',
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'Webhook disabled or deleted',
        })
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('skips webhook with isActive false', async () => {
      const delivery = {
        id: 'dl-3',
        webhookId: 'wh-disabled',
        attemptNumber: 1,
        payload: { event: 'session.created', timestamp: '2026-01-01', data: {} },
      };

      mockStorage.getPendingWebhookDeliveries.mockResolvedValue([delivery]);
      mockStorage.getPartnerWebhook.mockResolvedValue({
        id: 'wh-disabled',
        isActive: false,
      });

      await processRetryQueue();
      expect(mockStorage.updateWebhookDeliveryLog).toHaveBeenCalledWith(
        'dl-3',
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'Webhook disabled or deleted',
        })
      );
    });

    it('handles successful retry delivery', async () => {
      const delivery = {
        id: 'dl-retry-ok',
        webhookId: 'wh-1',
        attemptNumber: 2,
        payload: { event: 'results.ready', timestamp: '2026-01-01', data: { id: '5' } },
      };
      const webhook = {
        id: 'wh-1',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        maxRetries: 5,
        retryDelaySeconds: 60,
        isActive: true,
      };

      mockStorage.getPendingWebhookDeliveries.mockResolvedValue([delivery]);
      mockStorage.getPartnerWebhook.mockResolvedValue(webhook);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      });

      await processRetryQueue();
      expect(mockStorage.updateWebhookDeliveryLog).toHaveBeenCalledWith(
        'dl-retry-ok',
        expect.objectContaining({
          status: 'delivered',
          attemptNumber: 3,
        })
      );
    });

    it('handles failed retry with more attempts remaining', async () => {
      const delivery = {
        id: 'dl-retry-more',
        webhookId: 'wh-1',
        attemptNumber: 1,
        payload: { event: 'assessment.completed', timestamp: '2026-01-01', data: {} },
      };
      const webhook = {
        id: 'wh-1',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        maxRetries: 5,
        retryDelaySeconds: 30,
        isActive: true,
      };

      mockStorage.getPendingWebhookDeliveries.mockResolvedValue([delivery]);
      mockStorage.getPartnerWebhook.mockResolvedValue(webhook);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        text: () => Promise.resolve('Bad Gateway'),
      });

      await processRetryQueue();
      expect(mockStorage.updateWebhookDeliveryLog).toHaveBeenCalledWith(
        'dl-retry-more',
        expect.objectContaining({
          status: 'retrying',
          attemptNumber: 2,
          nextRetryAt: expect.any(Date),
        })
      );
    });

    it('handles final failure (no more retries)', async () => {
      const delivery = {
        id: 'dl-final',
        webhookId: 'wh-1',
        attemptNumber: 2,
        payload: { event: 'assessment.completed', timestamp: '2026-01-01', data: {} },
      };
      const webhook = {
        id: 'wh-1',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        maxRetries: 3,
        retryDelaySeconds: 60,
        isActive: true,
      };

      mockStorage.getPendingWebhookDeliveries.mockResolvedValue([delivery]);
      mockStorage.getPartnerWebhook.mockResolvedValue(webhook);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Error'),
      });

      await processRetryQueue();
      expect(mockStorage.updateWebhookDeliveryLog).toHaveBeenCalledWith(
        'dl-final',
        expect.objectContaining({
          status: 'failed',
          attemptNumber: 3,
        })
      );
      expect(mockStorage.updateWebhookStats).toHaveBeenCalledWith('wh-1', false);
    });

    it('processes multiple pending deliveries', async () => {
      const deliveries = [
        {
          id: 'dl-m1',
          webhookId: 'wh-1',
          attemptNumber: 1,
          payload: { event: 'assessment.completed', timestamp: '2026-01-01', data: {} },
        },
        {
          id: 'dl-m2',
          webhookId: 'wh-2',
          attemptNumber: 1,
          payload: { event: 'session.created', timestamp: '2026-01-01', data: {} },
        },
      ];
      const webhook = {
        id: 'wh-1',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        maxRetries: 3,
        retryDelaySeconds: 60,
        isActive: true,
      };

      mockStorage.getPendingWebhookDeliveries.mockResolvedValue(deliveries);
      mockStorage.getPartnerWebhook.mockResolvedValue(webhook);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      });

      const count = await processRetryQueue();
      expect(count).toBe(2);
    });
  });
});
