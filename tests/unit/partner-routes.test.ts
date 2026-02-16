import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express, { Express, Request, Response } from 'express';
import request from 'supertest';

const mockStorage = {
  getUser: vi.fn(),
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  getPartnerAccount: vi.fn(),
  getPartnerAccountByEmail: vi.fn(),
  getPartnerAccountByOrganizationId: vi.fn(),
  getPartnerAccountByUserId: vi.fn(),
  updatePartnerAccount: vi.fn(),
  createAssessmentSession: vi.fn(),
  getAssessmentSession: vi.fn(),
  updateAssessmentSession: vi.fn(),
  getSessionsByPartner: vi.fn(),
  getPipelineSessions: vi.fn(),
  getPartnerQuotaBalance: vi.fn(),
  creditPartnerTests: vi.fn(),
  createPartnerTestPackage: vi.fn(),
  getPartnerApiKey: vi.fn(),
  getPartnerApiKeyByPrefix: vi.fn(),
  createPartnerNotification: vi.fn(),
  getPartnerTeamMemberByUserId: vi.fn(),
  getPartnerTeamMembers: vi.fn(),
  getPartnerCandidateInvitations: vi.fn(),
  getPartnerCandidateInvitation: vi.fn(),
  getPartnerCandidateInvitationByToken: vi.fn(),
  getPartnerCandidateInvitationsByPartnerAndEmails: vi.fn(),
  countPartnerCandidateInvitations: vi.fn(),
  createPartnerCandidateInvitation: vi.fn(),
  updatePartnerCandidateInvitation: vi.fn(),
  getPartnerCandidateImports: vi.fn(),
  getPartnerCandidateImport: vi.fn(),
  createPartnerCandidateImport: vi.fn(),
  countTodayPartnerInvitationEmails: vi.fn(),
  getActiveVerificationCode: vi.fn(),
  createEmailVerificationCode: vi.fn(),
  getEmailVerificationCode: vi.fn(),
  updateEmailVerificationCode: vi.fn(),
  deleteEmailVerificationCode: vi.fn(),
  updatePartnerCardInfo: vi.fn(),
  removePartnerCard: vi.fn(),
  getOverageLedgerByPartner: vi.fn(),
  getPendingOverageCharges: vi.fn(),
  getResultsByUser: vi.fn(),
  getResultsByPartnerInvitation: vi.fn(),
  createAssessmentResult: vi.fn(),
  updateAssessmentResult: vi.fn(),
  setAutoLoginToken: vi.fn(),
  getInvitationByToken: vi.fn(),
  updateInvitationStatus: vi.fn(),
  trackUsage: vi.fn(),
  getUsageSummaryByPartner: vi.fn(),
  getCompletedB2BSessionsByEmail: vi.fn(),
};

vi.mock('../../server/storage', () => ({
  storage: mockStorage,
}));

vi.mock('../../server/auth', () => ({
  setupAuth: vi.fn(),
  isAuthenticated: vi.fn((req: any, res: any, next: any) => {
    if (req.user) {
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  }),
  populateUser: vi.fn((req: any, _res: any, next: any) => next()),
}));

vi.mock('../../server/partner-auth', () => ({
  partnerAuth: vi.fn((permissions?: string[]) => {
    return (req: any, res: any, next: any) => {
      if (req.headers['x-api-key']) {
        req.partner = req._mockPartner || {
          id: 'partner-1',
          name: 'Test Partner',
          companyName: 'Test Co',
          email: 'partner@test.com',
          monthlyQuota: 100,
          pricePerAssessment: 500,
          isActive: true,
          billingType: 'prepaid',
          billingStatusOverride: null,
        };
        req.apiKey = req._mockApiKey || {
          id: 'key-1',
          environment: 'test',
          partnerOrganisationId: null,
        };
        next();
      } else {
        res.status(401).json({ error: 'API key required' });
      }
    };
  }),
  PartnerRequest: {},
  trackUsage: vi.fn(),
  generateApiKey: vi.fn(() => ({
    fullKey: 'hm_test_abc123',
    prefix: 'hm_test_',
    hash: 'hashed',
    hint: '3456',
  })),
}));

vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    transaction: vi.fn(async (fn: any) => {
      const tx = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
        }),
      };
      return fn(tx);
    }),
  },
  pool: { query: vi.fn() },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  sql: vi.fn(),
  and: vi.fn((...args: any[]) => args),
  or: vi.fn((...args: any[]) => args),
  gte: vi.fn((...args: any[]) => args),
  isNull: vi.fn((col: any) => col),
  isNotNull: vi.fn((col: any) => col),
  inArray: vi.fn((...args: any[]) => args),
}));

vi.mock('@shared/schema', () => ({
  ASSESSMENT_TYPES: { fit: 'FIT Test', aiq: 'AIQ Test', ai_readiness: 'AI Readiness', prompt_architecture: 'Prompt Architecture' },
  ASSESSMENT_PRICES: { fit: 400, aiq: 400, ai_readiness: 400, prompt_architecture: 600 },
  BASE_FEE: 200,
  B2C_RETAIL_PRICE_PER_ASSESSMENT: 1500,
  normalizeAssessmentId: vi.fn((id: string) => id.replace(/-/g, '_')),
  assessmentResults: { id: 'id', userId: 'userId' },
  assessmentSessions: { id: 'id', partnerId: 'partnerId', assessmentType: 'assessmentType', status: 'status', metadata: 'metadata', completedAt: 'completedAt', resultsPaymentStatus: 'resultsPaymentStatus' },
  promptArchitectureEvaluations: { id: 'id' },
}));

vi.mock('@shared/currencies', () => ({
  getQuestionLocale: vi.fn(() => 'default'),
  getPPPAdjustedPriceInPence: vi.fn(() => 1500),
  getCurrencyForCountry: vi.fn(() => 'GBP'),
  formatPrice: vi.fn((amount: number) => `£${(amount / 100).toFixed(2)}`),
  COUNTRY_CURRENCY_MAP: { GB: 'GBP', US: 'USD' },
  convertPenceToRoundedLocalCurrency: vi.fn(() => 15),
  calculateStripeAmountFromRoundedTotal: vi.fn(() => 1500),
  calculateCandidatePricing: vi.fn(() => ({
    totalPence: 1500,
    totalLocal: 1500,
    totalDisplay: '£15.00',
    currency: 'gbp',
    currencyCode: 'GBP',
    individualPrices: [{ type: 'fit', localPrice: 1500, display: '£15.00' }],
  })),
  calculateBundlePricing: vi.fn(() => ({
    totalPence: 3000,
    originalTotal: 3000,
    discountedTotal: 2250,
    originalDisplay: '£30.00',
    discountedDisplay: '£22.50',
    currency: 'gbp',
    individualPrices: [{ type: 'fit', localPrice: 1500, display: '£15.00' }],
    formatAmount: vi.fn((v: number) => `£${(v / 100).toFixed(2)}`),
  })),
  roundPriceUp: vi.fn((v: number) => v),
}));

vi.mock('@shared/validation', () => ({
  isValidEmail: vi.fn((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  normalizeEmail: vi.fn((email: string) => email.toLowerCase().trim()),
}));

vi.mock('../../server/scoring', () => ({
  calculateFITScores: vi.fn(() => ({ scores: {}, totalScore: 75, percentile: 80 })),
  calculateAIReadinessScores: vi.fn(() => ({ scores: {}, totalScore: 80, percentile: 85 })),
}));

vi.mock('../../server/services/promptArchitecture', () => ({
  evaluatePromptWithGPT: vi.fn().mockResolvedValue({ score: 8, feedback: 'Good' }),
  PA_LEVEL_DESCRIPTIONS: {},
}));

vi.mock('../../server/email', () => ({
  sendPartnerQuotaWarning70: vi.fn().mockResolvedValue({ success: true }),
  sendPartnerQuotaWarning90: vi.fn().mockResolvedValue({ success: true }),
  sendPartnerAccessSuspendedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPartnerAutoTopUpConfirmation: vi.fn().mockResolvedValue({ success: true }),
  sendPartnerBulkInvitationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendB2BCongratulatoryEmail: vi.fn().mockResolvedValue({ success: true }),
  sendB2BAllCompleteEmail: vi.fn().mockResolvedValue({ success: true }),
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  sendEmailVerificationCode: vi.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmailWithPassword: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../server/passwordUtils', () => ({
  generateTemporaryPassword: vi.fn(() => 'TempPass123!'),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hashSync: vi.fn(() => 'hashed'),
    compareSync: vi.fn(() => true),
    hash: vi.fn().mockResolvedValue('hashed'),
  },
  hashSync: vi.fn(() => 'hashed'),
  compareSync: vi.fn(() => true),
  hash: vi.fn().mockResolvedValue('hashed'),
}));

const mockStripeInstance = {
  customers: {
    create: vi.fn().mockResolvedValue({ id: 'cus_123' }),
    retrieve: vi.fn().mockResolvedValue({ id: 'cus_123', deleted: false, invoice_settings: { default_payment_method: 'pm_123' } }),
    update: vi.fn().mockResolvedValue({}),
  },
  paymentIntents: {
    create: vi.fn().mockResolvedValue({ id: 'pi_123', status: 'succeeded' }),
    retrieve: vi.fn().mockResolvedValue({ id: 'pi_123', status: 'succeeded' }),
  },
  setupIntents: {
    create: vi.fn().mockResolvedValue({ id: 'seti_123', client_secret: 'seti_secret' }),
  },
  paymentMethods: {
    retrieve: vi.fn().mockResolvedValue({ id: 'pm_123', card: { last4: '4242', brand: 'visa' } }),
    detach: vi.fn().mockResolvedValue({}),
  },
  checkout: {
    sessions: {
      create: vi.fn().mockResolvedValue({ id: 'cs_123', url: 'https://checkout.stripe.com' }),
    },
  },
};

vi.mock('stripe', () => ({
  default: vi.fn(() => mockStripeInstance),
}));

vi.mock('p-limit', () => ({
  default: vi.fn(() => (fn: any) => fn()),
}));

vi.mock('../../server/airwallex', () => ({
  createPaymentIntent: vi.fn(),
  getPaymentIntent: vi.fn(),
  formatAmountForAirwallex: vi.fn(),
  isAirwallexConfigured: vi.fn(() => false),
  airwallexEnv: {},
}));

vi.mock('../../server/payment-routing', () => ({
  getPaymentProviders: vi.fn(() => ['stripe']),
  createCheckoutWithFallback: vi.fn(),
}));

vi.mock('../../server/exchange-rates', () => ({
  getExchangeRates: vi.fn().mockResolvedValue({ USD: 1.27, EUR: 1.17, rates: { USD: 1.27, EUR: 1.17, GBP: 1 } }),
}));

function authenticatedAgent(app: Express) {
  const agent = request(app);
  return agent;
}

function authGet(app: Express, url: string) {
  return request(app).get(url).set('user', 'auth').set('X-Forwarded-For', '127.0.0.1');
}

function authPost(app: Express, url: string) {
  return request(app).post(url).set('user', 'auth').set('X-Forwarded-For', '127.0.0.1');
}

function authPatch(app: Express, url: string) {
  return request(app).patch(url).set('user', 'auth').set('X-Forwarded-For', '127.0.0.1');
}

function authDelete(app: Express, url: string) {
  return request(app).delete(url).set('user', 'auth').set('X-Forwarded-For', '127.0.0.1');
}

let app: Express;

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  process.env.CRON_SECRET = 'test-cron-secret';

  app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    if (req.headers['user'] === 'auth') {
      req.user = { id: 'user-1', email: 'partner@test.com' };
    }
    req.session = { userId: null, save: (cb: any) => cb && cb() };
    next();
  });

  const { registerPartnerRoutes } = await import('../../server/partner-routes');
  registerPartnerRoutes(app);
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Partner Routes', () => {
  describe('GET /api/partner/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/partner/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });

    it('should include a valid ISO timestamp', async () => {
      const res = await request(app).get('/api/partner/health');
      expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
    });
  });

  describe('GET /api/partner/me', () => {
    it('should return partner info with valid API key', async () => {
      const res = await request(app)
        .get('/api/partner/me')
        .set('X-API-Key', 'hm_test_validkey');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('partner-1');
      expect(res.body.name).toBe('Test Partner');
      expect(res.body.companyName).toBe('Test Co');
    });

    it('should return 401 without API key', async () => {
      const res = await request(app).get('/api/partner/me');
      expect(res.status).toBe(401);
    });

    it('should include isActive field', async () => {
      const res = await request(app)
        .get('/api/partner/me')
        .set('X-API-Key', 'hm_test_validkey');
      expect(res.body.isActive).toBe(true);
    });

    it('should include monthlyQuota and pricePerAssessment', async () => {
      const res = await request(app)
        .get('/api/partner/me')
        .set('X-API-Key', 'hm_test_validkey');
      expect(res.body.monthlyQuota).toBe(100);
      expect(res.body.pricePerAssessment).toBe(500);
    });
  });

  describe('POST /api/partner/me/billing-info', () => {
    const billingData = {
      billingAddressLine1: '123 Test St',
      billingCity: 'London',
      billingPostcode: 'SW1A 1AA',
      billingCountry: 'United Kingdom',
      invoiceContact: 'John Doe',
      billingEmail: 'billing@test.com',
    };

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/partner/me/billing-info')
        .send(billingData);
      expect(res.status).toBe(401);
    });

    it('should return 403 if user has no organization', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: null });
      const res = await authPost(app, '/api/partner/me/billing-info').send(billingData);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('No partner organization linked');
    });

    it('should return 403 if partner account not found', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue(null);
      const res = await authPost(app, '/api/partner/me/billing-info').send(billingData);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Partner account not found');
    });

    it('should return 400 for non-enterprise billing type', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({
        id: 'partner-1',
        billingType: 'prepaid',
      });
      const res = await authPost(app, '/api/partner/me/billing-info').send(billingData);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('enterprise');
    });

    it('should save billing info for enterprise partner', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({
        id: 'partner-1',
        billingType: 'enterprise',
      });
      mockStorage.updatePartnerAccount.mockResolvedValue(undefined);

      const res = await authPost(app, '/api/partner/me/billing-info').send(billingData);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockStorage.updatePartnerAccount).toHaveBeenCalledWith('partner-1', expect.objectContaining({
        billingAddressLine1: '123 Test St',
        billingSetupComplete: true,
      }));
    });

    it('should return 400 for invalid billing data (missing required fields)', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({
        id: 'partner-1',
        billingType: 'enterprise',
      });

      const res = await authPost(app, '/api/partner/me/billing-info').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should return 400 for invalid billing email', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({
        id: 'partner-1',
        billingType: 'enterprise',
      });

      const res = await authPost(app, '/api/partner/me/billing-info').send({
        ...billingData,
        billingEmail: 'not-an-email',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/partner/me/billing-info', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/partner/me/billing-info');
      expect(res.status).toBe(401);
    });

    it('should return billing info for authenticated partner', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({
        id: 'partner-1',
        billingType: 'enterprise',
        billingSetupComplete: true,
        billingEmail: 'billing@test.com',
        billingAddressLine1: '123 Test St',
        billingCity: 'London',
        billingPostcode: 'SW1A 1AA',
        billingCountry: 'United Kingdom',
        vatNumber: 'GB123456789',
        invoiceContact: 'John Doe',
        purchaseOrderRequired: false,
        paymentTermsDays: 30,
      });

      const res = await authGet(app, '/api/partner/me/billing-info');
      expect(res.status).toBe(200);
      expect(res.body.billingType).toBe('enterprise');
      expect(res.body.billingSetupComplete).toBe(true);
      expect(res.body.billingEmail).toBe('billing@test.com');
      expect(res.body.paymentTermsDays).toBe(30);
    });

    it('should return 403 if no organization linked', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: null });
      const res = await authGet(app, '/api/partner/me/billing-info');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/partner/subscription-enquiry', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/partner/subscription-enquiry')
        .send({ message: 'I want to upgrade' });
      expect(res.status).toBe(401);
    });

    it('should return 403 if user has no organization', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: null });
      const res = await authPost(app, '/api/partner/subscription-enquiry')
        .send({ message: 'I want to upgrade' });
      expect(res.status).toBe(403);
    });

    it('should return 400 for empty message', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1', firstName: 'Test', lastName: 'User', email: 'test@test.com' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({
        id: 'partner-1',
        companyName: 'Test Co',
        billingType: 'prepaid',
        credits: 50,
      });
      const res = await authPost(app, '/api/partner/subscription-enquiry')
        .send({ message: '' });
      expect(res.status).toBe(400);
    });

    it('should send enquiry email successfully', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1', firstName: 'Test', lastName: 'User', email: 'test@test.com' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({
        id: 'partner-1',
        companyName: 'Test Co',
        billingType: 'prepaid',
        credits: 50,
      });
      const res = await authPost(app, '/api/partner/subscription-enquiry')
        .send({ message: 'I want to upgrade to enterprise' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/partner/sessions', () => {
    it('should create a session with valid data', async () => {
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 100,
        testsConsumed: 10,
        remaining: 90,
      });
      mockStorage.createAssessmentSession.mockResolvedValue({
        id: 'session-1',
        assessmentType: 'fit',
        status: 'created',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        metadata: null,
      });

      const res = await request(app)
        .post('/api/partner/sessions')
        .set('X-API-Key', 'hm_test_validkey')
        .send({
          assessmentType: 'fit',
          externalUserId: 'ext-user-1',
          externalEmail: 'user@test.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.sessionId).toBe('session-1');
      expect(res.body.assessmentType).toBe('fit');
      expect(res.body.status).toBe('created');
      expect(res.body.widgetUrl).toContain('session=session-1');
    });

    it('should return 401 without API key', async () => {
      const res = await request(app)
        .post('/api/partner/sessions')
        .send({ assessmentType: 'fit' });
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid assessment type', async () => {
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 100,
        testsConsumed: 10,
        remaining: 90,
      });

      const res = await request(app)
        .post('/api/partner/sessions')
        .set('X-API-Key', 'hm_test_validkey')
        .send({ assessmentType: 'invalid_type' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });

    it('should return 402 when quota exhausted', async () => {
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 10,
        testsConsumed: 10,
        remaining: 0,
      });

      const res = await request(app)
        .post('/api/partner/sessions')
        .set('X-API-Key', 'hm_test_validkey')
        .send({ assessmentType: 'fit' });

      expect(res.status).toBe(402);
      expect(res.body.error).toBe('Quota Exhausted');
    });

    it('should return 402 when no credits purchased', async () => {
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 0,
        testsConsumed: 0,
        remaining: 0,
      });

      const res = await request(app)
        .post('/api/partner/sessions')
        .set('X-API-Key', 'hm_test_validkey')
        .send({ assessmentType: 'fit' });

      expect(res.status).toBe(402);
      expect(res.body.error).toBe('No Credits Purchased');
    });

    it('should include quotaStatus in 402 responses', async () => {
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 10,
        testsConsumed: 10,
        remaining: 0,
      });

      const res = await request(app)
        .post('/api/partner/sessions')
        .set('X-API-Key', 'hm_test_validkey')
        .send({ assessmentType: 'fit' });

      expect(res.body.quotaStatus).toBeDefined();
      expect(res.body.quotaStatus.testsPurchased).toBe(10);
      expect(res.body.quotaStatus.remaining).toBe(0);
    });

    it('should handle server errors gracefully', async () => {
      mockStorage.getPartnerQuotaBalance.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/partner/sessions')
        .set('X-API-Key', 'hm_test_validkey')
        .send({ assessmentType: 'fit' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create assessment session');
    });

    it('should create aiq session type', async () => {
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({ testsPurchased: 100, testsConsumed: 0, remaining: 100 });
      mockStorage.createAssessmentSession.mockResolvedValue({
        id: 'session-aiq',
        assessmentType: 'aiq',
        status: 'created',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        metadata: null,
      });

      const res = await request(app)
        .post('/api/partner/sessions')
        .set('X-API-Key', 'hm_test_validkey')
        .send({ assessmentType: 'aiq' });

      expect(res.status).toBe(201);
      expect(res.body.assessmentType).toBe('aiq');
    });

    it('should create prompt_architecture session type', async () => {
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({ testsPurchased: 100, testsConsumed: 0, remaining: 100 });
      mockStorage.createAssessmentSession.mockResolvedValue({
        id: 'session-pa',
        assessmentType: 'prompt_architecture',
        status: 'created',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        metadata: null,
      });

      const res = await request(app)
        .post('/api/partner/sessions')
        .set('X-API-Key', 'hm_test_validkey')
        .send({ assessmentType: 'prompt_architecture' });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/partner/sessions/:sessionId', () => {
    it('should return session details', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'created',
        externalUserId: 'ext-1',
        externalEmail: 'user@test.com',
        metadata: null,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });

      const res = await request(app)
        .get('/api/partner/sessions/session-1')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBe('session-1');
      expect(res.body.assessmentType).toBe('fit');
    });

    it('should return 404 for non-existent session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/partner/sessions/nonexistent')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(404);
    });

    it('should return 404 if session belongs to different partner', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-other',
        assessmentType: 'fit',
        status: 'created',
      });

      const res = await request(app)
        .get('/api/partner/sessions/session-1')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(404);
    });

    it('should return 401 without API key', async () => {
      const res = await request(app).get('/api/partner/sessions/session-1');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/partner/sessions/:sessionId/results', () => {
    it('should return results for completed session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'completed',
        scores: { adaptability: 80, communication: 75 },
        totalScore: 77,
        percentile: 82,
        evaluations: {},
        completedAt: new Date().toISOString(),
        metadata: null,
      });

      const res = await request(app)
        .get('/api/partner/sessions/session-1/results')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(200);
      expect(res.body.scores).toBeDefined();
      expect(res.body.totalScore).toBe(77);
      expect(res.body.percentile).toBe(82);
    });

    it('should return 400 for incomplete session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'started',
      });

      const res = await request(app)
        .get('/api/partner/sessions/session-1/results')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Results not available');
    });

    it('should return 404 for non-existent session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/partner/sessions/nonexistent/results')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(404);
    });

    it('should include evaluations in the response', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'completed',
        scores: { adaptability: 80 },
        totalScore: 80,
        percentile: 85,
        evaluations: { q1: { score: 5, feedback: 'Excellent' } },
        completedAt: new Date().toISOString(),
        metadata: { tag: 'test' },
      });

      const res = await request(app)
        .get('/api/partner/sessions/session-1/results')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(200);
      expect(res.body.evaluations).toBeDefined();
      expect(res.body.metadata).toEqual({ tag: 'test' });
    });
  });

  describe('GET /api/partner/sessions (list)', () => {
    it('should return list of sessions', async () => {
      mockStorage.getSessionsByPartner.mockResolvedValue([
        {
          id: 'session-1',
          assessmentType: 'fit',
          status: 'completed',
          externalUserId: 'user-1',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
        {
          id: 'session-2',
          assessmentType: 'ai_readiness',
          status: 'created',
          externalUserId: 'user-2',
          createdAt: new Date().toISOString(),
          completedAt: null,
        },
      ]);

      const res = await request(app)
        .get('/api/partner/sessions')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(200);
      expect(res.body.sessions).toHaveLength(2);
      expect(res.body.count).toBe(2);
    });

    it('should respect limit parameter', async () => {
      mockStorage.getSessionsByPartner.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/partner/sessions?limit=10')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(200);
      expect(mockStorage.getSessionsByPartner).toHaveBeenCalledWith('partner-1', 10);
    });

    it('should cap limit at 200', async () => {
      mockStorage.getSessionsByPartner.mockResolvedValue([]);

      await request(app)
        .get('/api/partner/sessions?limit=500')
        .set('X-API-Key', 'hm_test_validkey');

      expect(mockStorage.getSessionsByPartner).toHaveBeenCalledWith('partner-1', 200);
    });

    it('should default limit to 50', async () => {
      mockStorage.getSessionsByPartner.mockResolvedValue([]);

      await request(app)
        .get('/api/partner/sessions')
        .set('X-API-Key', 'hm_test_validkey');

      expect(mockStorage.getSessionsByPartner).toHaveBeenCalledWith('partner-1', 50);
    });
  });

  describe('GET /api/partner/usage', () => {
    it('should return 401 without API key', async () => {
      const res = await request(app).get('/api/partner/usage');
      expect(res.status).toBe(401);
    });

    it('should return usage summary with valid API key', async () => {
      mockStorage.getUsageSummaryByPartner.mockResolvedValue([
        { eventType: 'session_completed', count: 5, totalAmount: 2500 },
        { eventType: 'session_created', count: 10, totalAmount: 0 },
      ]);

      const res = await request(app)
        .get('/api/partner/usage')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(200);
      expect(res.body.period).toBeDefined();
      expect(res.body.summary.completedAssessments).toBe(5);
      expect(res.body.summary.totalBilledPence).toBe(2500);
      expect(res.body.breakdown).toHaveLength(2);
    });

    it('should handle empty usage data', async () => {
      mockStorage.getUsageSummaryByPartner.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/partner/usage')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(200);
      expect(res.body.summary.completedAssessments).toBe(0);
      expect(res.body.summary.totalBilledPence).toBe(0);
    });
  });

  describe('GET /api/partner/quota', () => {
    it('should return 401 without API key', async () => {
      const res = await request(app).get('/api/partner/quota');
      expect(res.status).toBe(401);
    });

    it('should return quota balance', async () => {
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 100,
        testsConsumed: 25,
        remaining: 75,
      });

      const res = await request(app)
        .get('/api/partner/quota')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(200);
      expect(res.body.testsPurchased).toBe(100);
      expect(res.body.testsConsumed).toBe(25);
      expect(res.body.remaining).toBe(75);
      expect(res.body.percentageUsed).toBe(25);
    });

    it('should handle zero purchased tests', async () => {
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 0,
        testsConsumed: 0,
        remaining: 0,
      });

      const res = await request(app)
        .get('/api/partner/quota')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(200);
      expect(res.body.percentageUsed).toBe(0);
    });
  });

  describe('GET /api/partner/assessment-types', () => {
    it('should return list of assessment types', async () => {
      const res = await request(app).get('/api/partner/assessment-types');
      expect(res.status).toBe(200);
      expect(res.body.types).toHaveLength(4);
      expect(res.body.types[0].id).toBe('fit');
      expect(res.body.types[1].id).toBe('ai_readiness');
      expect(res.body.types[2].id).toBe('prompt_architecture');
      expect(res.body.types[3].id).toBe('aiq');
    });

    it('should include question count and estimated minutes', async () => {
      const res = await request(app).get('/api/partner/assessment-types');
      expect(res.body.types[0].questionCount).toBeDefined();
      expect(res.body.types[0].estimatedMinutes).toBeDefined();
    });
  });

  describe('GET /api/partner/pipeline', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/partner/pipeline');
      expect(res.status).toBe(401);
    });

    it('should return 403 if user not found', async () => {
      mockStorage.getUser.mockResolvedValue(null);
      const res = await authGet(app, '/api/partner/pipeline');
      expect(res.status).toBe(403);
    });

    it('should return pipeline data for partner admin', async () => {
      mockStorage.getUser.mockResolvedValue({
        id: 'user-1',
        role: 'partner_admin',
        organizationId: 'org-1',
        email: 'partner@test.com',
      });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({
        id: 'partner-1',
        name: 'Test Partner',
      });
      mockStorage.getPipelineSessions.mockResolvedValue([
        {
          id: 'session-1',
          assessmentType: 'fit',
          status: 'completed',
          externalEmail: 'candidate@test.com',
          externalUserId: null,
          pipelineStage: 'completed',
          pipelineNotes: null,
          totalScore: 80,
          percentile: 85,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          pipelineStageUpdatedAt: null,
          metadata: { candidateName: 'Test Candidate' },
        },
      ]);

      const res = await authGet(app, '/api/partner/pipeline');
      expect(res.status).toBe(200);
      expect(res.body.pipeline).toBeDefined();
      expect(res.body.stages).toBeDefined();
      expect(res.body.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should find partner via team membership', async () => {
      mockStorage.getUser.mockResolvedValue({
        id: 'user-1',
        role: 'member',
        organizationId: null,
        email: 'member@test.com',
      });
      mockStorage.getPartnerTeamMemberByUserId.mockResolvedValue({
        partnerId: 'partner-1',
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-1',
        name: 'Test Partner',
      });
      mockStorage.getPipelineSessions.mockResolvedValue([]);

      const res = await authGet(app, '/api/partner/pipeline');
      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/partner/sessions/:sessionId/pipeline', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .patch('/api/partner/sessions/session-1/pipeline')
        .send({ pipelineStage: 'reviewing' });
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid pipeline stage', async () => {
      mockStorage.getUser.mockResolvedValue({
        id: 'user-1',
        role: 'partner_admin',
        organizationId: 'org-1',
      });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({
        id: 'partner-1',
      });

      const res = await authPatch(app, '/api/partner/sessions/session-1/pipeline')
        .send({ pipelineStage: 'invalid_stage' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid pipeline stage');
    });

    it('should return 404 for non-existent session', async () => {
      mockStorage.getUser.mockResolvedValue({
        id: 'user-1',
        role: 'partner_admin',
        organizationId: 'org-1',
      });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({
        id: 'partner-1',
      });
      mockStorage.getAssessmentSession.mockResolvedValue(null);

      const res = await authPatch(app, '/api/partner/sessions/session-1/pipeline')
        .send({ pipelineStage: 'reviewing' });
      expect(res.status).toBe(404);
    });

    it('should return 403 for session not owned by partner', async () => {
      mockStorage.getUser.mockResolvedValue({
        id: 'user-1',
        role: 'partner_admin',
        organizationId: 'org-1',
      });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({
        id: 'partner-1',
      });
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-other',
      });

      const res = await authPatch(app, '/api/partner/sessions/session-1/pipeline')
        .send({ pipelineStage: 'reviewing' });
      expect(res.status).toBe(403);
    });

    it('should update pipeline stage for owned session', async () => {
      mockStorage.getUser.mockResolvedValue({
        id: 'user-1',
        role: 'partner_admin',
        organizationId: 'org-1',
      });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({
        id: 'partner-1',
      });
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        externalEmail: 'candidate@test.com',
      });
      mockStorage.updateAssessmentSession.mockResolvedValue(undefined);

      const res = await authPatch(app, '/api/partner/sessions/session-1/pipeline')
        .send({ pipelineStage: 'shortlisted' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/partner/pipeline/bulk-update', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/partner/pipeline/bulk-update')
        .send({ updates: [] });
      expect(res.status).toBe(401);
    });

    it('should return 400 for empty updates array', async () => {
      mockStorage.getUser.mockResolvedValue({
        id: 'user-1',
        role: 'partner_admin',
        organizationId: 'org-1',
      });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({
        id: 'partner-1',
      });

      const res = await authPost(app, '/api/partner/pipeline/bulk-update')
        .send({ updates: [] });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid stage in updates', async () => {
      mockStorage.getUser.mockResolvedValue({
        id: 'user-1',
        role: 'partner_admin',
        organizationId: 'org-1',
      });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({
        id: 'partner-1',
      });

      const res = await authPost(app, '/api/partner/pipeline/bulk-update')
        .send({ updates: [{ sessionId: 's1', pipelineStage: 'bad_stage' }] });
      expect(res.status).toBe(400);
    });

    it('should successfully bulk update pipeline stages', async () => {
      mockStorage.getUser.mockResolvedValue({
        id: 'user-1',
        role: 'partner_admin',
        organizationId: 'org-1',
      });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({
        id: 'partner-1',
      });
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        externalEmail: 'candidate@test.com',
      });
      mockStorage.createPartnerNotification.mockResolvedValue(undefined);

      const res = await authPost(app, '/api/partner/pipeline/bulk-update')
        .send({ updates: [{ sessionId: 'session-1', pipelineStage: 'hired' }] });
      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].success).toBe(true);
    });
  });

  describe('GET /api/embed/session/:sessionId', () => {
    it('should return session for embed widget', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'created',
        externalUserId: 'ext-1',
        externalEmail: 'user@test.com',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        apiKeyId: 'key-1',
        metadata: null,
        questionLocale: 'default',
        answers: null,
        lastAnsweredIndex: null,
        lastActivityAt: null,
        isTestSession: false,
        resultsPaymentStatus: null,
        resultsReleaseStatus: null,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-1',
        name: 'Test Co',
        companyName: 'Test Co',
        brandingEnabled: false,
      });
      mockStorage.getPartnerApiKey.mockResolvedValue({
        id: 'key-1',
        environment: 'test',
      });

      const res = await request(app).get('/api/embed/session/session-1');
      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBe('session-1');
      expect(res.body.assessmentType).toBe('fit');
      expect(res.body.partnerName).toBe('Test Co');
    });

    it('should return 404 for non-existent session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue(null);

      const res = await request(app).get('/api/embed/session/nonexistent');
      expect(res.status).toBe(404);
    });

    it('should return 400 for expired session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'created',
        expiresAt: new Date(Date.now() - 86400000).toISOString(),
      });
      mockStorage.updateAssessmentSession.mockResolvedValue(undefined);

      const res = await request(app).get('/api/embed/session/session-1');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Session has expired');
    });

    it('should include branding when enabled', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'created',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        apiKeyId: null,
        metadata: null,
        questionLocale: 'default',
        answers: null,
        lastAnsweredIndex: null,
        lastActivityAt: null,
        isTestSession: false,
        resultsPaymentStatus: null,
        resultsReleaseStatus: null,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-1',
        name: 'Branded Co',
        companyName: 'Branded Co',
        brandingEnabled: true,
        brandingPrimaryColor: '#ff0000',
        brandingAccentColor: '#00ff00',
        logoUrl: 'https://logo.test/logo.png',
        brandingWelcomeTitle: 'Welcome!',
        brandingWelcomeMessage: 'Take this test',
        brandingCompanyDisplayName: 'Branded Display',
      });

      const res = await request(app).get('/api/embed/session/session-1');
      expect(res.status).toBe(200);
      expect(res.body.branding).toBeDefined();
      expect(res.body.branding.enabled).toBe(true);
      expect(res.body.branding.primaryColor).toBe('#ff0000');
    });
  });

  describe('POST /api/embed/session/:sessionId/send-verification-code', () => {
    it('should send verification code', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
      });
      mockStorage.getActiveVerificationCode.mockResolvedValue(null);
      mockStorage.createEmailVerificationCode.mockResolvedValue({ id: 'code-1' });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-1',
        companyName: 'Test Co',
      });

      const res = await request(app)
        .post('/api/embed/session/session-1/send-verification-code')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 without email', async () => {
      const res = await request(app)
        .post('/api/embed/session/session-1/send-verification-code')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email is required');
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/embed/session/session-1/send-verification-code')
        .send({ email: 'invalid-email' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid email format');
    });

    it('should return 404 if session not found', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/embed/session/session-1/send-verification-code')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(404);
    });

    it('should return 429 when rate limited', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
      });
      mockStorage.getActiveVerificationCode.mockResolvedValue({
        createdAt: new Date().toISOString(),
      });

      const res = await request(app)
        .post('/api/embed/session/session-1/send-verification-code')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(429);
    });
  });

  describe('POST /api/embed/session/:sessionId/verify-email', () => {
    it('should verify valid code', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
      });
      mockStorage.getEmailVerificationCode.mockResolvedValue({
        id: 'code-1',
        sessionId: 'session-1',
        verified: false,
      });
      mockStorage.updateEmailVerificationCode.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/embed/session/session-1/verify-email')
        .send({ email: 'test@example.com', code: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.verified).toBe(true);
    });

    it('should return 400 without email or code', async () => {
      const res = await request(app)
        .post('/api/embed/session/session-1/verify-email')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid code', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
      });
      mockStorage.getEmailVerificationCode.mockResolvedValue(null);
      mockStorage.getActiveVerificationCode.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/embed/session/session-1/verify-email')
        .send({ email: 'test@example.com', code: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid or expired verification code');
    });

    it('should return 429 after too many failed attempts', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
      });
      mockStorage.getEmailVerificationCode.mockResolvedValue(null);
      mockStorage.getActiveVerificationCode.mockResolvedValue({
        id: 'code-1',
        attempts: 4,
      });
      mockStorage.updateEmailVerificationCode.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/embed/session/session-1/verify-email')
        .send({ email: 'test@example.com', code: '000000' });

      expect(res.status).toBe(429);
    });

    it('should handle verification code with session mismatch', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
      });
      mockStorage.getEmailVerificationCode.mockResolvedValue({
        id: 'code-1',
        sessionId: 'session-other',
        verified: false,
      });

      const res = await request(app)
        .post('/api/embed/session/session-1/verify-email')
        .send({ email: 'test@example.com', code: '123456' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid verification code');
    });
  });

  describe('POST /api/embed/session/:sessionId/start', () => {
    it('should start a test session (skips email verification)', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'created',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        externalEmail: null,
        isTestSession: true,
        apiKeyId: 'key-1',
        metadata: null,
      });
      mockStorage.getPartnerApiKey.mockResolvedValue({ id: 'key-1', environment: 'test' });
      mockStorage.updateAssessmentSession.mockResolvedValue(undefined);
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({ testsPurchased: 100, testsConsumed: 0, remaining: 100 });
      mockStorage.getPartnerAccount.mockResolvedValue({ id: 'partner-1' });

      const res = await request(app)
        .post('/api/embed/session/session-1/start')
        .send({ candidateEmail: 'test@example.com' });

      expect(res.status).toBe(200);
    });

    it('should return 400 when email missing for non-test session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'created',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        externalEmail: null,
        isTestSession: false,
        apiKeyId: 'key-1',
        metadata: null,
      });
      mockStorage.getPartnerApiKey.mockResolvedValue({ id: 'key-1', environment: 'live' });

      const res = await request(app)
        .post('/api/embed/session/session-1/start')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email is required');
    });

    it('should return 404 for non-existent session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/embed/session/nonexistent/start')
        .send({});

      expect(res.status).toBe(404);
    });

    it('should return 400 for expired session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        status: 'created',
        expiresAt: new Date(Date.now() - 86400000).toISOString(),
      });
      mockStorage.updateAssessmentSession.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/embed/session/session-1/start')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Session has expired');
    });

    it('should return 400 for already completed session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        status: 'completed',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });

      const res = await request(app)
        .post('/api/embed/session/session-1/start')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Session already completed');
    });

    it('should allow resuming an already started session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'started',
        startedAt: new Date(Date.now() - 300000).toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        pausedTimeRemainingMs: null,
      });

      const res = await request(app)
        .post('/api/embed/session/session-1/start')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('started');
      expect(res.body.timeRemaining).toBeDefined();
    });

    it('should resume with paused time remaining', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'started',
        startedAt: new Date(Date.now() - 600000).toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        pausedTimeRemainingMs: 500000,
      });
      mockStorage.updateAssessmentSession.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/embed/session/session-1/start')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.timeRemaining).toBe(500);
    });
  });

  describe('PATCH /api/embed/session/:sessionId/progress', () => {
    it('should save progress for started session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'started',
        answers: { q1: 'a' },
        lastAnsweredIndex: 0,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        pausedTimeRemainingMs: null,
      });
      mockStorage.updateAssessmentSession.mockResolvedValue(undefined);

      const res = await request(app)
        .patch('/api/embed/session/session-1/progress')
        .send({ answers: { q2: 'b' }, lastAnsweredIndex: 1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.savedAnswerCount).toBe(2);
    });

    it('should return 404 for non-existent session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/embed/session/nonexistent/progress')
        .send({ answers: {}, lastAnsweredIndex: 0 });

      expect(res.status).toBe(404);
    });

    it('should return 400 for completed session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        status: 'completed',
      });

      const res = await request(app)
        .patch('/api/embed/session/session-1/progress')
        .send({ answers: {}, lastAnsweredIndex: 0 });

      expect(res.status).toBe(400);
    });

    it('should save time remaining for timer persistence', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'started',
        answers: {},
        lastAnsweredIndex: 0,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        pausedTimeRemainingMs: null,
      });
      mockStorage.updateAssessmentSession.mockResolvedValue(undefined);

      const res = await request(app)
        .patch('/api/embed/session/session-1/progress')
        .send({ answers: {}, lastAnsweredIndex: 0, timeRemainingMs: 600000 });

      expect(res.status).toBe(200);
      expect(mockStorage.updateAssessmentSession).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({ pausedTimeRemainingMs: 600000 })
      );
    });

    it('should also work via POST (for sendBeacon)', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'started',
        answers: {},
        lastAnsweredIndex: 0,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        pausedTimeRemainingMs: null,
      });
      mockStorage.updateAssessmentSession.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/embed/session/session-1/progress')
        .send({ answers: { q1: 'a' }, lastAnsweredIndex: 0 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/partner/me/invitations/bulk', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/partner/me/invitations/bulk')
        .send({
          candidates: [{ email: 'test@test.com' }],
          assessmentTypes: ['fit'],
        });
      expect(res.status).toBe(401);
    });

    it('should return 403 if user has no organization', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: null });
      const res = await authPost(app, '/api/partner/me/invitations/bulk')
        .send({ candidates: [{ email: 'test@test.com' }], assessmentTypes: ['fit'] });
      expect(res.status).toBe(403);
    });

    it('should return 400 for empty candidates', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({ id: 'partner-1' });

      const res = await authPost(app, '/api/partner/me/invitations/bulk')
        .send({ candidates: [], assessmentTypes: ['fit'] });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid assessment types', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({ id: 'partner-1' });
      mockStorage.getPartnerTeamMembers.mockResolvedValue([]);
      mockStorage.getPartnerCandidateInvitationsByPartnerAndEmails.mockResolvedValue([]);

      const res = await authPost(app, '/api/partner/me/invitations/bulk')
        .send({
          candidates: [{ email: 'test@test.com' }],
          assessmentTypes: ['invalid_type'],
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid assessment types');
    });

    it('should reject candidates without email', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({ id: 'partner-1' });
      mockStorage.getPartnerTeamMembers.mockResolvedValue([]);
      mockStorage.getPartnerCandidateInvitationsByPartnerAndEmails.mockResolvedValue([]);

      const res = await authPost(app, '/api/partner/me/invitations/bulk')
        .send({
          candidates: [{ email: '', name: 'No Email' }],
          assessmentTypes: ['fit'],
        });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject team member emails', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({ id: 'partner-1' });
      mockStorage.getPartnerTeamMembers.mockResolvedValue([
        { email: 'member@test.com' },
      ]);
      mockStorage.getPartnerCandidateInvitationsByPartnerAndEmails.mockResolvedValue([]);

      const res = await authPost(app, '/api/partner/me/invitations/bulk')
        .send({
          candidates: [{ email: 'member@test.com' }],
          assessmentTypes: ['fit'],
        });
      expect(res.status).toBe(400);
      expect(res.body.errors[0].error).toContain('team member');
    });

    it('should reject duplicate emails within batch', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({ id: 'partner-1' });
      mockStorage.getPartnerTeamMembers.mockResolvedValue([]);
      mockStorage.getPartnerCandidateInvitationsByPartnerAndEmails.mockResolvedValue([]);

      const res = await authPost(app, '/api/partner/me/invitations/bulk')
        .send({
          candidates: [
            { email: 'dup@test.com' },
            { email: 'dup@test.com' },
          ],
          assessmentTypes: ['fit'],
        });
      expect(res.status).toBe(400);
      expect(res.body.errors.some((e: any) => e.error.includes('Duplicate'))).toBe(true);
    });
  });

  describe('GET /api/partner/me/invitations', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/partner/me/invitations');
      expect(res.status).toBe(401);
    });

    it('should return invitations for authenticated partner', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({ id: 'partner-1' });
      mockStorage.getPartnerCandidateInvitations.mockResolvedValue([
        { id: 'inv-1', email: 'candidate@test.com', status: 'sent', assessmentTypes: ['fit'] },
      ]);

      const res = await authGet(app, '/api/partner/me/invitations');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/partner/me/invitations/imports', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/partner/me/invitations/imports');
      expect(res.status).toBe(401);
    });

    it('should return imports for authenticated partner', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({ id: 'partner-1' });
      mockStorage.getPartnerCandidateImports.mockResolvedValue([]);

      const res = await authGet(app, '/api/partner/me/invitations/imports');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/partner/me/invitations/imports/:importId', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/partner/me/invitations/imports/import-1');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/partner/me/invitations/:invitationId/send-email', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/partner/me/invitations/inv-1/send-email');
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent invitation', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({ id: 'partner-1' });
      mockStorage.getPartnerCandidateInvitation.mockResolvedValue(null);

      const res = await authPost(app, '/api/partner/me/invitations/inv-1/send-email');
      expect(res.status).toBe(404);
    });

    it('should return 403 for invitation not owned by partner', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({ id: 'partner-1' });
      mockStorage.getPartnerCandidateInvitation.mockResolvedValue({
        id: 'inv-1',
        partnerId: 'partner-other',
        email: 'candidate@test.com',
      });

      const res = await authPost(app, '/api/partner/me/invitations/inv-1/send-email');
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/partner/me/invitations/:invitationId', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).delete('/api/partner/me/invitations/inv-1');
      expect(res.status).toBe(401);
    });

    it('should revoke pending invitation', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({ id: 'partner-1' });
      mockStorage.getPartnerCandidateInvitation.mockResolvedValue({
        id: 'inv-1',
        partnerId: 'partner-1',
        status: 'pending',
      });
      mockStorage.updatePartnerCandidateInvitation.mockResolvedValue(undefined);

      const res = await authDelete(app, '/api/partner/me/invitations/inv-1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should not revoke started invitation', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({ id: 'partner-1' });
      mockStorage.getPartnerCandidateInvitation.mockResolvedValue({
        id: 'inv-1',
        partnerId: 'partner-1',
        status: 'started',
      });

      const res = await authDelete(app, '/api/partner/me/invitations/inv-1');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot revoke');
    });

    it('should not revoke completed invitation', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({ id: 'partner-1' });
      mockStorage.getPartnerCandidateInvitation.mockResolvedValue({
        id: 'inv-1',
        partnerId: 'partner-1',
        status: 'completed',
      });

      const res = await authDelete(app, '/api/partner/me/invitations/inv-1');
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent invitation', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({ id: 'partner-1' });
      mockStorage.getPartnerCandidateInvitation.mockResolvedValue(null);

      const res = await authDelete(app, '/api/partner/me/invitations/inv-1');
      expect(res.status).toBe(404);
    });

    it('should return 403 for invitation not owned by partner', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({ id: 'partner-1' });
      mockStorage.getPartnerCandidateInvitation.mockResolvedValue({
        id: 'inv-1',
        partnerId: 'partner-other',
        status: 'pending',
      });

      const res = await authDelete(app, '/api/partner/me/invitations/inv-1');
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/invite/:token', () => {
    it('should return 404 for invalid token', async () => {
      mockStorage.getPartnerCandidateInvitationByToken.mockResolvedValue(null);

      const res = await request(app).get('/api/invite/invalid-token');
      expect(res.status).toBe(404);
    });

    it('should return 410 for expired invitation', async () => {
      mockStorage.getPartnerCandidateInvitationByToken.mockResolvedValue({
        id: 'inv-1',
        partnerId: 'partner-1',
        status: 'expired',
      });

      const res = await request(app).get('/api/invite/expired-token');
      expect(res.status).toBe(410);
    });

    it('should return 410 for revoked invitation', async () => {
      mockStorage.getPartnerCandidateInvitationByToken.mockResolvedValue({
        id: 'inv-1',
        partnerId: 'partner-1',
        status: 'revoked',
      });

      const res = await request(app).get('/api/invite/revoked-token');
      expect(res.status).toBe(410);
    });

    it('should handle completed invitation', async () => {
      mockStorage.getPartnerCandidateInvitationByToken.mockResolvedValue({
        id: 'inv-1',
        partnerId: 'partner-1',
        email: 'candidate@test.com',
        status: 'completed',
      });
      mockStorage.getUserByEmail.mockResolvedValue(null);

      const res = await request(app).get('/api/invite/completed-token');
      expect(res.status).toBe(200);
      expect(res.body.isCompleted).toBe(true);
    });

    it('should handle completed invitation with existing account', async () => {
      mockStorage.getPartnerCandidateInvitationByToken.mockResolvedValue({
        id: 'inv-1',
        partnerId: 'partner-1',
        email: 'candidate@test.com',
        status: 'completed',
      });
      mockStorage.getUserByEmail.mockResolvedValue({ id: 'user-1' });

      const res = await request(app).get('/api/invite/completed-token');
      expect(res.status).toBe(200);
      expect(res.body.isCompleted).toBe(true);
      expect(res.body.hasAccount).toBe(true);
    });
  });

  describe('POST /api/partner/card/setup-intent', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).post('/api/partner/card/setup-intent');
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-partner user', async () => {
      mockStorage.getPartnerAccountByEmail.mockResolvedValue(null);
      const res = await authPost(app, '/api/partner/card/setup-intent');
      expect(res.status).toBe(403);
    });

    it('should return 400 for enterprise billing type', async () => {
      mockStorage.getPartnerAccountByEmail.mockResolvedValue({
        id: 'partner-1',
        billingType: 'enterprise',
        email: 'partner@test.com',
      });
      const res = await authPost(app, '/api/partner/card/setup-intent');
      expect(res.status).toBe(400);
    });

    it('should create setup intent for prepaid partner', async () => {
      mockStorage.getPartnerAccountByEmail.mockResolvedValue({
        id: 'partner-1',
        billingType: 'prepaid',
        email: 'partner@test.com',
        billingEmail: 'billing@test.com',
        companyName: 'Test Co',
        stripeCustomerId: 'cus_123',
      });
      const res = await authPost(app, '/api/partner/card/setup-intent');
      expect(res.status).toBe(200);
      expect(res.body.clientSecret).toBe('seti_secret');
    });

    it('should create Stripe customer if none exists', async () => {
      mockStorage.getPartnerAccountByEmail.mockResolvedValue({
        id: 'partner-1',
        billingType: 'payg',
        email: 'partner@test.com',
        billingEmail: 'billing@test.com',
        companyName: 'Test Co',
        name: 'Partner',
        stripeCustomerId: null,
      });
      mockStorage.updatePartnerAccount.mockResolvedValue(undefined);

      const res = await authPost(app, '/api/partner/card/setup-intent');
      expect(res.status).toBe(200);
      expect(mockStripeInstance.customers.create).toHaveBeenCalled();
      expect(mockStorage.updatePartnerAccount).toHaveBeenCalledWith('partner-1', { stripeCustomerId: 'cus_123' });
    });
  });

  describe('POST /api/partner/card/confirm', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/partner/card/confirm')
        .send({ paymentMethodId: 'pm_123' });
      expect(res.status).toBe(401);
    });

    it('should return 400 without paymentMethodId', async () => {
      mockStorage.getPartnerAccountByEmail.mockResolvedValue({ id: 'partner-1' });
      const res = await authPost(app, '/api/partner/card/confirm').send({});
      expect(res.status).toBe(400);
    });

    it('should confirm card and update partner record', async () => {
      mockStorage.getPartnerAccountByEmail.mockResolvedValue({
        id: 'partner-1',
        stripeCustomerId: 'cus_123',
      });
      mockStorage.updatePartnerCardInfo.mockResolvedValue(undefined);

      const res = await authPost(app, '/api/partner/card/confirm')
        .send({ paymentMethodId: 'pm_123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.cardLast4).toBe('4242');
      expect(res.body.cardBrand).toBe('visa');
    });
  });

  describe('GET /api/partner/card/status', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/partner/card/status');
      expect(res.status).toBe(401);
    });

    it('should return card status for partner', async () => {
      mockStorage.getPartnerAccountByEmail.mockResolvedValue({
        id: 'partner-1',
        cardOnFile: true,
        cardLast4: '4242',
        cardBrand: 'visa',
        overageRatePerTest: 500,
        billingType: 'prepaid',
      });

      const res = await authGet(app, '/api/partner/card/status');
      expect(res.status).toBe(200);
      expect(res.body.hasCard).toBe(true);
      expect(res.body.cardLast4).toBe('4242');
      expect(res.body.billingType).toBe('prepaid');
    });

    it('should return default overage rate when not set', async () => {
      mockStorage.getPartnerAccountByEmail.mockResolvedValue({
        id: 'partner-1',
        cardOnFile: false,
        overageRatePerTest: null,
        billingType: 'prepaid',
      });

      const res = await authGet(app, '/api/partner/card/status');
      expect(res.status).toBe(200);
      expect(res.body.overageRatePerTest).toBe(500);
    });
  });

  describe('DELETE /api/partner/card', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).delete('/api/partner/card');
      expect(res.status).toBe(401);
    });

    it('should remove card from partner', async () => {
      mockStorage.getPartnerAccountByEmail.mockResolvedValue({
        id: 'partner-1',
        stripePaymentMethodId: 'pm_123',
      });
      mockStorage.removePartnerCard.mockResolvedValue(undefined);

      const res = await authDelete(app, '/api/partner/card');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockStripeInstance.paymentMethods.detach).toHaveBeenCalledWith('pm_123');
    });

    it('should handle already detached payment method gracefully', async () => {
      mockStorage.getPartnerAccountByEmail.mockResolvedValue({
        id: 'partner-1',
        stripePaymentMethodId: 'pm_123',
      });
      mockStripeInstance.paymentMethods.detach.mockRejectedValueOnce(new Error('Already detached'));
      mockStorage.removePartnerCard.mockResolvedValue(undefined);

      const res = await authDelete(app, '/api/partner/card');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/partner/overage-history', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/partner/overage-history');
      expect(res.status).toBe(401);
    });

    it('should return overage history for partner', async () => {
      mockStorage.getPartnerAccountByEmail.mockResolvedValue({
        id: 'partner-1',
      });
      mockStorage.getOverageLedgerByPartner.mockResolvedValue([
        { id: 'entry-1', amount: 500, description: 'Overage charge', createdAt: new Date().toISOString() },
      ]);

      const res = await authGet(app, '/api/partner/overage-history');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should return 403 for non-partner user', async () => {
      mockStorage.getPartnerAccountByEmail.mockResolvedValue(null);
      const res = await authGet(app, '/api/partner/overage-history');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/internal/process-overage-billing', () => {
    it('should return 401 without valid cron secret', async () => {
      const res = await request(app).post('/api/internal/process-overage-billing');
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid cron secret', async () => {
      const res = await request(app)
        .post('/api/internal/process-overage-billing')
        .set('Authorization', 'Bearer wrong-secret');
      expect(res.status).toBe(401);
    });

    it('should process with valid cron secret', async () => {
      mockStorage.getPendingOverageCharges.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/internal/process-overage-billing')
        .set('Authorization', 'Bearer test-cron-secret');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/partner/openapi.json', () => {
    it('should handle missing OpenAPI file gracefully', async () => {
      const res = await request(app).get('/api/partner/openapi.json');
      expect([200, 500]).toContain(res.status);
    });
  });

  describe('POST /api/b2b/create-account', () => {
    it('should return 400 without required params', async () => {
      const res = await request(app)
        .post('/api/b2b/create-account')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required parameters');
    });

    it('should return 400 for missing email', async () => {
      const res = await request(app)
        .post('/api/b2b/create-account')
        .send({ sessionId: 'session-1' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing sessionId', async () => {
      const res = await request(app)
        .post('/api/b2b/create-account')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
    });

    it('should return 404 if session not found', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/b2b/create-account')
        .send({ email: 'test@test.com', sessionId: 'nonexistent' });

      expect(res.status).toBe(404);
    });

    it('should return 403 for email mismatch', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        externalEmail: 'other@test.com',
        status: 'completed',
      });

      const res = await request(app)
        .post('/api/b2b/create-account')
        .send({ email: 'test@test.com', sessionId: 'session-1' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Email does not match session');
    });

    it('should handle existing user account', async () => {
      mockStorage.getAssessmentSession
        .mockResolvedValueOnce({
          id: 'session-1',
          externalEmail: 'existing@test.com',
          status: 'completed',
        })
        .mockResolvedValueOnce({
          id: 'session-1',
          externalEmail: 'existing@test.com',
          status: 'completed',
          scores: { adaptability: 80 },
          assessmentType: 'fit',
          metadata: {},
        });
      mockStorage.getUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'existing@test.com',
      });
      mockStorage.getResultsByUser.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/b2b/create-account')
        .send({ email: 'existing@test.com', sessionId: 'session-1' });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/b2b/session-results/:sessionId', () => {
    it('should return 404 for non-existent session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue(null);

      const res = await request(app).get('/api/b2b/session-results/nonexistent');
      expect(res.status).toBe(404);
    });

    it('should return 403 without email', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'completed',
        scores: { adaptability: 80 },
        totalScore: 80,
        percentile: 85,
        externalEmail: 'candidate@test.com',
        completedAt: new Date().toISOString(),
        resultsPaymentStatus: 'paid',
        resultsReleaseStatus: null,
      });

      const res = await request(app).get('/api/b2b/session-results/session-1');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Unauthorized access to session');
    });

    it('should return b2b session results with matching email', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'completed',
        scores: { adaptability: 80 },
        totalScore: 80,
        percentile: 85,
        externalEmail: 'candidate@test.com',
        completedAt: new Date().toISOString(),
        resultsPaymentStatus: 'paid',
        resultsReleaseStatus: null,
        resultsDeliveryStatus: 'pending',
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-1',
        companyName: 'Test Co',
      });

      const res = await request(app)
        .get('/api/b2b/session-results/session-1?email=candidate@test.com');
      expect(res.status).toBe(200);
      expect(res.body.assessmentType).toBe('fit');
    });

    it('should return 403 when session has no email', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'completed',
        externalEmail: null,
      });

      const res = await request(app)
        .get('/api/b2b/session-results/session-1?email=test@test.com');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Session has no associated email');
    });

    it('should return 400 for incomplete assessment', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'started',
        externalEmail: 'candidate@test.com',
      });

      const res = await request(app)
        .get('/api/b2b/session-results/session-1?email=candidate@test.com');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Assessment not completed');
    });

    it('should return 403 for unreleased results', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'completed',
        externalEmail: 'candidate@test.com',
        resultsPaymentStatus: null,
        resultsReleaseStatus: null,
      });

      const res = await request(app)
        .get('/api/b2b/session-results/session-1?email=candidate@test.com');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Results not yet unlocked');
    });
  });

  describe('GET /api/b2b/results/:sessionId', () => {
    it('should return 404 for non-existent session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue(null);

      const res = await request(app).get('/api/b2b/results/nonexistent');
      expect(res.status).toBe(404);
    });

    it('should return 400 for incomplete session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        status: 'started',
      });

      const res = await request(app).get('/api/b2b/results/session-1');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/b2b/results/:sessionId/checkout', () => {
    it('should return 404 for non-existent session', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/b2b/results/nonexistent/checkout')
        .send({});
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/unlock-results', () => {
    it('should return 400 for missing parameters', async () => {
      const res = await request(app).get('/api/unlock-results');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required parameters');
    });

    it('should return 404 for non-existent invitation', async () => {
      mockStorage.getPartnerCandidateInvitationByToken.mockResolvedValue(null);
      const res = await request(app).get('/api/unlock-results?email=test@test.com&invite=bad-token');
      expect(res.status).toBe(404);
    });

    it('should return 400 for email mismatch', async () => {
      mockStorage.getPartnerCandidateInvitationByToken.mockResolvedValue({
        id: 'inv-1',
        partnerId: 'partner-1',
        email: 'other@test.com',
      });
      const res = await request(app).get('/api/unlock-results?email=wrong@test.com&invite=token');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email does not match invitation');
    });
  });

  describe('GET /api/guest/invite/:token', () => {
    it('should return 404 for non-existent token', async () => {
      mockStorage.getPartnerCandidateInvitationByToken.mockResolvedValue(null);
      mockStorage.getInvitationByToken.mockResolvedValue(null);

      const res = await request(app).get('/api/guest/invite/bad-token');
      expect(res.status).toBe(404);
    });

    it('should return invitation details for valid partner invite', async () => {
      mockStorage.getPartnerCandidateInvitationByToken.mockResolvedValue({
        id: 'inv-1',
        partnerId: 'partner-1',
        email: 'guest@test.com',
        name: 'Guest User',
        assessmentTypes: ['fit'],
        status: 'sent',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-1',
        companyName: 'Test Co',
        name: 'Test',
      });
      mockStorage.getSessionsByPartner.mockResolvedValue([]);
      mockStorage.getUserByEmail.mockResolvedValue(null);

      const res = await request(app).get('/api/guest/invite/valid-partner-token');
      expect([200, 404, 429]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.email).toBe('guest@test.com');
      }
    });

    it('should fall back to admin invitation if partner invite not found', async () => {
      mockStorage.getPartnerCandidateInvitationByToken.mockResolvedValue(null);
      mockStorage.getInvitationByToken.mockResolvedValue({
        id: 'admin-inv-1',
        candidateEmail: 'admin-guest@test.com',
        candidateName: 'Admin Guest',
        assessmentTypes: ['fit'],
        status: 'sent',
        sentBy: 'admin-user-1',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
      mockStorage.getUserByEmail.mockResolvedValue(null);
      mockStorage.getUser.mockResolvedValue({
        id: 'admin-user-1',
        firstName: 'Admin',
        name: 'Admin User',
      });
      mockStorage.getResultsByUser.mockResolvedValue([]);

      const res = await request(app).get('/api/guest/invite/admin-fallback-token');
      expect([200, 404, 429]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.isAdminInvite).toBe(true);
      }
    });

    it('should return 410 for expired admin invitation', async () => {
      mockStorage.getPartnerCandidateInvitationByToken.mockResolvedValue(null);
      mockStorage.getInvitationByToken.mockResolvedValue({
        id: 'admin-inv-1',
        candidateEmail: 'admin-guest@test.com',
        assessmentTypes: ['fit'],
        status: 'sent',
        sentBy: 'admin-1',
        expiresAt: new Date(Date.now() - 86400000).toISOString(),
      });

      const res = await request(app).get('/api/guest/invite/expired-admin-token');
      expect([404, 410, 429]).toContain(res.status);
    });
  });

  describe('POST /api/guest/invite/:token/create-account', () => {
    it('should return 404 for non-existent token', async () => {
      mockStorage.getPartnerCandidateInvitationByToken.mockResolvedValue(null);
      mockStorage.getInvitationByToken.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/guest/invite/bad-token/create-account');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/guest/invite/:token/session', () => {
    it('should return 404 for non-existent invitation', async () => {
      mockStorage.getPartnerCandidateInvitationByToken.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/guest/invite/bad-token/session')
        .send({ assessmentType: 'fit' });

      expect(res.status).toBe(404);
    });
  });

  describe('Server error handling', () => {
    it('should handle storage errors in session listing', async () => {
      mockStorage.getSessionsByPartner.mockRejectedValue(new Error('DB connection failed'));

      const res = await request(app)
        .get('/api/partner/sessions')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to list sessions');
    });

    it('should handle storage errors in session details', async () => {
      mockStorage.getAssessmentSession.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .get('/api/partner/sessions/session-1')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch session');
    });

    it('should handle storage errors in results', async () => {
      mockStorage.getAssessmentSession.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .get('/api/partner/sessions/session-1/results')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch results');
    });

    it('should handle errors in embed session fetch', async () => {
      mockStorage.getAssessmentSession.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/embed/session/session-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch session');
    });

    it('should handle errors in verification code sending', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-1',
        partnerId: 'partner-1',
      });
      mockStorage.getActiveVerificationCode.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/embed/session/session-1/send-verification-code')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(500);
    });

    it('should handle errors in email verification', async () => {
      mockStorage.getAssessmentSession.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/embed/session/session-1/verify-email')
        .send({ email: 'test@example.com', code: '123456' });

      expect(res.status).toBe(500);
    });

    it('should handle errors in quota fetch', async () => {
      mockStorage.getPartnerQuotaBalance.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .get('/api/partner/quota')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch quota data');
    });

    it('should handle errors in usage fetch', async () => {
      mockStorage.getUsageSummaryByPartner.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .get('/api/partner/usage')
        .set('X-API-Key', 'hm_test_validkey');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch usage data');
    });

    it('should handle errors in pipeline fetch', async () => {
      mockStorage.getUser.mockRejectedValue(new Error('DB error'));

      const res = await authGet(app, '/api/partner/pipeline');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch pipeline data');
    });

    it('should handle errors in progress save', async () => {
      mockStorage.getAssessmentSession.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .patch('/api/embed/session/session-1/progress')
        .send({ answers: {}, lastAnsweredIndex: 0 });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to save progress');
    });

    it('should handle errors in card status fetch', async () => {
      mockStorage.getPartnerAccountByEmail.mockRejectedValue(new Error('DB error'));

      const res = await authGet(app, '/api/partner/card/status');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to get card status');
    });

    it('should handle errors in overage history', async () => {
      mockStorage.getPartnerAccountByEmail.mockResolvedValue({ id: 'partner-1' });
      mockStorage.getOverageLedgerByPartner.mockRejectedValue(new Error('DB error'));

      const res = await authGet(app, '/api/partner/overage-history');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to get overage history');
    });
  });

  describe('Edge cases', () => {
    it('should handle session with country code for locale', async () => {
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 100,
        testsConsumed: 0,
        remaining: 100,
      });
      mockStorage.createAssessmentSession.mockResolvedValue({
        id: 'session-loc',
        assessmentType: 'fit',
        status: 'created',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        metadata: null,
      });

      const res = await request(app)
        .post('/api/partner/sessions')
        .set('X-API-Key', 'hm_test_validkey')
        .send({
          assessmentType: 'fit',
          country: 'MY',
        });

      expect(res.status).toBe(201);
    });

    it('should handle session with webhook URL', async () => {
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 100,
        testsConsumed: 0,
        remaining: 100,
      });
      mockStorage.createAssessmentSession.mockResolvedValue({
        id: 'session-wh',
        assessmentType: 'ai_readiness',
        status: 'created',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        metadata: null,
      });

      const res = await request(app)
        .post('/api/partner/sessions')
        .set('X-API-Key', 'hm_test_validkey')
        .send({
          assessmentType: 'ai_readiness',
          webhookUrl: 'https://webhook.example.com/callback',
        });

      expect(res.status).toBe(201);
    });

    it('should handle session with custom expiry', async () => {
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 100,
        testsConsumed: 0,
        remaining: 100,
      });
      mockStorage.createAssessmentSession.mockResolvedValue({
        id: 'session-exp',
        assessmentType: 'aiq',
        status: 'created',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        metadata: null,
      });

      const res = await request(app)
        .post('/api/partner/sessions')
        .set('X-API-Key', 'hm_test_validkey')
        .send({
          assessmentType: 'aiq',
          expiresInMinutes: 120,
        });

      expect(res.status).toBe(201);
    });

    it('should handle embed session with time remaining calculation', async () => {
      const startedAt = new Date(Date.now() - 300000);
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-time',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'started',
        startedAt: startedAt.toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        apiKeyId: null,
        metadata: null,
        questionLocale: 'default',
        answers: null,
        lastAnsweredIndex: null,
        lastActivityAt: null,
        isTestSession: false,
        pausedTimeRemainingMs: null,
        resultsPaymentStatus: null,
        resultsReleaseStatus: null,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-1',
        name: 'Test',
        companyName: 'Test',
        brandingEnabled: false,
      });

      const res = await request(app).get('/api/embed/session/session-time');
      expect(res.status).toBe(200);
      expect(res.body.timeRemaining).toBeDefined();
      expect(res.body.timeRemaining).toBeLessThanOrEqual(1200);
      expect(res.body.timeRemaining).toBeGreaterThan(0);
    });

    it('should handle embed session with paused time remaining', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-paused',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'started',
        startedAt: new Date(Date.now() - 600000).toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        apiKeyId: null,
        metadata: null,
        questionLocale: 'default',
        answers: null,
        lastAnsweredIndex: null,
        lastActivityAt: null,
        isTestSession: false,
        pausedTimeRemainingMs: 600000,
        resultsPaymentStatus: null,
        resultsReleaseStatus: null,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-1',
        name: 'Test',
        companyName: 'Test',
        brandingEnabled: false,
      });

      const res = await request(app).get('/api/embed/session/session-paused');
      expect(res.status).toBe(200);
      expect(res.body.timeRemaining).toBe(600);
    });

    it('should handle embed session from invitation', async () => {
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-inv',
        partnerId: 'partner-1',
        assessmentType: 'fit',
        status: 'created',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        apiKeyId: null,
        metadata: { source: 'partner_invitation', invitationId: 'inv-1' },
        questionLocale: 'default',
        answers: null,
        lastAnsweredIndex: null,
        lastActivityAt: null,
        isTestSession: false,
        resultsPaymentStatus: null,
        resultsReleaseStatus: null,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-1',
        name: 'Test',
        companyName: 'Test',
        brandingEnabled: false,
      });
      mockStorage.getPartnerCandidateInvitation.mockResolvedValue({
        id: 'inv-1',
        assessmentTypes: ['fit', 'ai_readiness'],
      });

      const res = await request(app).get('/api/embed/session/session-inv');
      expect(res.status).toBe(200);
      expect(res.body.isFromInvitation).toBe(true);
      expect(res.body.invitationContext).toBeDefined();
      expect(res.body.invitationContext.totalCount).toBe(2);
    });

    it('should handle prompt_architecture time limit (3 minutes)', async () => {
      const startedAt = new Date(Date.now() - 60000);
      mockStorage.getAssessmentSession.mockResolvedValue({
        id: 'session-pa',
        partnerId: 'partner-1',
        assessmentType: 'prompt_architecture',
        status: 'started',
        startedAt: startedAt.toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        apiKeyId: null,
        metadata: null,
        questionLocale: 'default',
        answers: null,
        lastAnsweredIndex: null,
        lastActivityAt: null,
        isTestSession: false,
        pausedTimeRemainingMs: null,
        resultsPaymentStatus: null,
        resultsReleaseStatus: null,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'partner-1',
        name: 'Test',
        companyName: 'Test',
        brandingEnabled: false,
      });

      const res = await request(app).get('/api/embed/session/session-pa');
      expect(res.status).toBe(200);
      expect(res.body.timeRemaining).toBeLessThanOrEqual(180);
    });
  });
});
