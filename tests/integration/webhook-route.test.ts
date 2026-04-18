import { describe, it, expect, vi, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import Stripe from 'stripe';

// (vitest hoists vi.mock to the top of the module regardless of source position)

vi.mock('express-session', () => ({ default: vi.fn(() => (_: any, __: any, next: any) => next()) }));
vi.mock('connect-pg-simple', () => ({ default: vi.fn(() => class {}) }));
vi.mock('../../server/db', () => ({ pool: {}, db: {} }));

vi.mock('../../server/airwallex', () => ({
  getAirwallexWebhookSecret: vi.fn().mockReturnValue(null),
  verifyAirwallexWebhookSignature: vi.fn().mockReturnValue(true),
}));

vi.mock('../../server/storage', () => ({
  storage: {
    acquireStripeEventLock: vi.fn().mockResolvedValue(true),
    markStripeEventProcessed: vi.fn().mockResolvedValue(undefined),
    getPartnerAccount: vi.fn().mockResolvedValue(null),
    updatePartnerAccount: vi.fn().mockResolvedValue(undefined),
    getPurchase: vi.fn().mockResolvedValue(null),
    getUser: vi.fn().mockImplementation((id: string) =>
      Promise.resolve(id === 'user-abc' ? { id: 'user-abc', email: 'tester@example.com', name: 'Test User' } : null)
    ),
    getUserByEmail: vi.fn().mockResolvedValue(null),
    getAssessmentResult: vi.fn().mockResolvedValue(null),
    getResultsByUser: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../server/email', () => ({
  sendBillingFailureNotification: vi.fn().mockResolvedValue(undefined),
  sendBillingFailureAdminNotification: vi.fn().mockResolvedValue(undefined),
  sendPaymentReceiptWithPdf: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
  sendPartnerBulkInvitationEmail: vi.fn().mockResolvedValue(undefined),
  sendPayment3DSRequiredEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../server/security-monitor', () => ({
  SecurityMonitor: { getInstance: vi.fn(() => ({ recordFailedAuth: vi.fn(), isBlocked: vi.fn().mockReturnValue(false) })) },
}));

import { isAuthenticated } from '../../server/auth';
import { registerWebhookRoutes } from '../../server/webhook-routes';
import { storage } from '../../server/storage';


const WEBHOOK_SECRET = 'whsec_route_level_test_secret_abc123';

const stripe = new Stripe('sk_test_dummy_key_for_tests', {
  apiVersion: '2025-09-30.clover',
});

function buildSignedRequest(
  payload: string,
  secret: string,
  opts: { timestampOffset?: number } = {}
): { header: string; body: string } {
  const timestamp = Math.floor(Date.now() / 1000) + (opts.timestampOffset ?? 0);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp });
  return { header, body: payload };
}

const SAMPLE_EVENT = JSON.stringify({
  id: 'evt_route_test_001',
  type: 'unknown.event.type',
  object: 'event',
  data: { object: {} },
  api_version: '2024-06-20',
  created: Math.floor(Date.now() / 1000),
  livemode: false,
  pending_webhooks: 0,
  request: null,
});


describe('POST /api/webhooks/stripe — route-level signature enforcement', () => {
  let app: express.Express;

  beforeAll(() => {
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
    app = express();
    registerWebhookRoutes(app);
  });

  it('accepts a correctly-signed request and returns 200', async () => {
    const { header, body } = buildSignedRequest(SAMPLE_EVENT, WEBHOOK_SECRET);
    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', header)
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it('rejects a request where the payload was tampered with (returns 400)', async () => {
    const original = JSON.stringify({ id: 'evt_tamper', type: 'x', object: 'event', data: { object: {} } });
    const { header } = buildSignedRequest(original, WEBHOOK_SECRET);
    const tampered = original.replace('evt_tamper', 'evt_TAMPERED');
    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', header)
      .send(tampered);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Webhook Error/);
  });

  it('rejects a request signed with the wrong webhook secret (returns 400)', async () => {
    const { header, body } = buildSignedRequest(SAMPLE_EVENT, 'whsec_completely_wrong_secret');
    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', header)
      .send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Webhook Error/);
  });

  it('rejects a request with a stale timestamp (> 300 s tolerance)', async () => {
    const { header, body } = buildSignedRequest(SAMPLE_EVENT, WEBHOOK_SECRET, { timestampOffset: -601 });
    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', header)
      .send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Webhook Error/);
  });
});


describe('GET /api/results — access control (isAuthenticated guard)', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    app.use((req: any, _res, next) => {
      req.session = req.headers['x-test-auth'] === 'true'
        ? { userId: 'user-abc' }
        : {};
      next();
    });

    app.get('/api/results', isAuthenticated, async (req: any, res) => {
      try {
        const results = await storage.getResultsByUser(req.user.id);
        res.json(results);
      } catch {
        res.status(500).json({ message: 'Failed to fetch results' });
      }
    });
  });

  it('returns 401 when the user is not authenticated', async () => {
    const res = await request(app).get('/api/results').set('Accept', 'application/json');
    expect(res.status).toBe(401);
  });

  it('returns 200 with results array when authenticated', async () => {
    const res = await request(app)
      .get('/api/results')
      .set('x-test-auth', 'true')
      .set('Accept', 'application/json');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('calls storage.getResultsByUser with the authenticated user id', async () => {
    vi.mocked(storage.getResultsByUser).mockResolvedValueOnce([]);
    const res = await request(app)
      .get('/api/results')
      .set('x-test-auth', 'true')
      .set('Accept', 'application/json');
    expect(res.status).toBe(200);
    expect(storage.getResultsByUser).toHaveBeenCalledWith('user-abc');
  });
});
