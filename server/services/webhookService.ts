import crypto from 'crypto';
import { storage } from '../storage';
import type { PartnerWebhook } from '@shared/schema';

export const WEBHOOK_EVENTS = [
  'assessment.started',
  'assessment.completed',
  'session.created',
  'session.expired',
  'results.ready',
] as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[number];

interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, any>;
}

const DEFAULT_TIMEOUT_SECONDS = 30;

function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

async function deliverWebhook(
  webhook: PartnerWebhook,
  payload: WebhookPayload,
  deliveryLogId?: string
): Promise<{ success: boolean; statusCode?: number; error?: string; responseBody?: string }> {
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, webhook.secret);
  const timestamp = Date.now().toString();
  
  try {
    const controller = new AbortController();
    const timeoutMs = DEFAULT_TIMEOUT_SECONDS * 1000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-Event': payload.event,
        'X-Webhook-Delivery-Id': deliveryLogId || crypto.randomUUID(),
        'User-Agent': 'HumanMetrix-Webhook/1.0',
      },
      body: payloadString,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const responseBody = await response.text().catch(() => '');
    
    if (response.ok) {
      return { success: true, statusCode: response.status, responseBody };
    } else {
      return { 
        success: false, 
        statusCode: response.status, 
        error: `HTTP ${response.status}`,
        responseBody 
      };
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request timeout' };
    }
    return { success: false, error: error.message || 'Network error' };
  }
}

function calculateNextRetry(attempt: number, retryDelaySeconds: number): Date {
  const delayMs = retryDelaySeconds * 1000 * Math.pow(2, attempt - 1);
  return new Date(Date.now() + delayMs);
}

export async function triggerWebhook(
  partnerId: string,
  eventType: WebhookEventType,
  data: Record<string, any>,
  sessionId?: string
): Promise<void> {
  const webhooks = await storage.getActiveWebhooksForEvent(partnerId, eventType);
  
  if (webhooks.length === 0) return;
  
  const payload: WebhookPayload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    data,
  };
  
  for (const webhook of webhooks) {
    const deliveryLog = await storage.createWebhookDeliveryLog({
      webhookId: webhook.id,
      partnerId,
      eventType,
      payload: payload as any,
      sessionId,
      status: 'pending',
      attemptNumber: 1,
    });
    
    const result = await deliverWebhook(webhook, payload, deliveryLog.id);
    
    if (result.success) {
      await storage.updateWebhookDeliveryLog(deliveryLog.id, {
        status: 'delivered',
        httpStatus: result.statusCode,
        responseBody: result.responseBody?.substring(0, 5000),
        deliveredAt: new Date(),
      });
      await storage.updateWebhookStats(webhook.id, true);
    } else {
      const shouldRetry = deliveryLog.attemptNumber < (webhook.maxRetries || 3);
      
      if (shouldRetry) {
        await storage.updateWebhookDeliveryLog(deliveryLog.id, {
          status: 'retrying',
          httpStatus: result.statusCode,
          responseBody: result.responseBody?.substring(0, 5000),
          errorMessage: result.error,
          nextRetryAt: calculateNextRetry(deliveryLog.attemptNumber, webhook.retryDelaySeconds || 60),
        });
      } else {
        await storage.updateWebhookDeliveryLog(deliveryLog.id, {
          status: 'failed',
          httpStatus: result.statusCode,
          responseBody: result.responseBody?.substring(0, 5000),
          errorMessage: result.error,
        });
        await storage.updateWebhookStats(webhook.id, false);
      }
    }
  }
}

export async function processRetryQueue(): Promise<number> {
  const pendingDeliveries = await storage.getPendingWebhookDeliveries();
  let processedCount = 0;
  
  for (const delivery of pendingDeliveries) {
    const webhook = await storage.getPartnerWebhook(delivery.webhookId);
    if (!webhook || !webhook.isActive) {
      await storage.updateWebhookDeliveryLog(delivery.id, { status: 'failed', errorMessage: 'Webhook disabled or deleted' });
      continue;
    }
    
    const payload = delivery.payload as WebhookPayload;
    const result = await deliverWebhook(webhook, payload, delivery.id);
    const newAttemptNumber = delivery.attemptNumber + 1;
    
    if (result.success) {
      await storage.updateWebhookDeliveryLog(delivery.id, {
        status: 'delivered',
        attemptNumber: newAttemptNumber,
        httpStatus: result.statusCode,
        responseBody: result.responseBody?.substring(0, 5000),
        deliveredAt: new Date(),
      });
      await storage.updateWebhookStats(webhook.id, true);
    } else {
      const shouldRetry = newAttemptNumber < (webhook.maxRetries || 3);
      
      if (shouldRetry) {
        await storage.updateWebhookDeliveryLog(delivery.id, {
          status: 'retrying',
          attemptNumber: newAttemptNumber,
          httpStatus: result.statusCode,
          responseBody: result.responseBody?.substring(0, 5000),
          errorMessage: result.error,
          nextRetryAt: calculateNextRetry(newAttemptNumber, webhook.retryDelaySeconds || 60),
        });
      } else {
        await storage.updateWebhookDeliveryLog(delivery.id, {
          status: 'failed',
          attemptNumber: newAttemptNumber,
          httpStatus: result.statusCode,
          responseBody: result.responseBody?.substring(0, 5000),
          errorMessage: result.error,
        });
        await storage.updateWebhookStats(webhook.id, false);
      }
    }
    
    processedCount++;
  }
  
  return processedCount;
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
