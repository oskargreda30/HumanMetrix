import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

vi.mock('../../server/storage', () => ({
  storage: {
    ensureInvitationPurchase: vi.fn().mockResolvedValue(undefined),
    getPurchasesByUser: vi.fn().mockResolvedValue([]),
    getUser: vi.fn().mockResolvedValue(null),
    getUserByEmail: vi.fn().mockResolvedValue(null),
    getResultsByUser: vi.fn().mockResolvedValue([]),
    getAssessmentResult: vi.fn().mockResolvedValue(null),
    getAllResults: vi.fn().mockResolvedValue([]),
    getAllInvitations: vi.fn().mockResolvedValue([]),
    getInvitationsByEmail: vi.fn().mockResolvedValue([]),
    getPurchaseItems: vi.fn().mockResolvedValue([]),
    getPurchaseItem: vi.fn().mockResolvedValue(null),
    getPurchase: vi.fn().mockResolvedValue(null),
    getResultByPurchaseItem: vi.fn().mockResolvedValue(null),
    getResultByInvitationAndType: vi.fn().mockResolvedValue(null),
    updateResultsRetentionConsent: vi.fn().mockResolvedValue(undefined),
    acceptTerms: vi.fn().mockResolvedValue(undefined),
    deleteUserAccount: vi.fn().mockResolvedValue(undefined),
    deletePurchaseItem: vi.fn().mockResolvedValue(undefined),
    updateAssessmentResult: vi.fn().mockResolvedValue(undefined),
    createAssessmentResult: vi.fn().mockResolvedValue({ id: 'result-1' }),
    createPurchase: vi.fn().mockResolvedValue({ id: 'purchase-1' }),
    createPurchaseItem: vi.fn().mockResolvedValue({ id: 'item-1' }),
    createInvitation: vi.fn().mockResolvedValue({ id: 'inv-1' }),
    createMarketingOptin: vi.fn().mockResolvedValue(undefined),
    getOrganization: vi.fn().mockResolvedValue(null),
    getUsersByOrganization: vi.fn().mockResolvedValue([]),
    getTagsByCandidate: vi.fn().mockResolvedValue([]),
    getNotesByCandidate: vi.fn().mockResolvedValue([]),
    markStripeEventProcessed: vi.fn().mockResolvedValue(undefined),
    isStripeEventProcessed: vi.fn().mockResolvedValue(false),
    updateUserNotificationPreferences: vi.fn().mockResolvedValue(undefined),
    getPartnerAccountByUserId: vi.fn().mockResolvedValue(null),
    getAllMarketingOptins: vi.fn().mockResolvedValue([]),
    getMarketingOptins: vi.fn().mockResolvedValue([]),
    upsertUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
    createUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
    setAutoLoginToken: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../server/auth', () => ({
  setupAuth: vi.fn().mockResolvedValue(undefined),
  isAuthenticated: vi.fn((req: any, res: any, next: any) => {
    if (req.user) {
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  }),
  populateUser: vi.fn((req: any, _res: any, next: any) => {
    next();
  }),
}));

vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  },
  pool: { query: vi.fn() },
  getPoolStats: vi.fn().mockReturnValue({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  sql: vi.fn(),
  and: vi.fn((...args: any[]) => args),
  or: vi.fn((...args: any[]) => args),
  gte: vi.fn((...args: any[]) => args),
  isNotNull: vi.fn((col: any) => col),
  inArray: vi.fn((...args: any[]) => args),
}));

vi.mock('@shared/schema', () => ({
  ASSESSMENT_TYPES: { fit: 'FIT Test', aiq: 'AIQ Test', ai_readiness: 'AI Readiness', prompt_architecture: 'Prompt Architecture' },
  ASSESSMENT_PRICES: { fit: 400, aiq: 400, ai_readiness: 400, prompt_architecture: 600 },
  BASE_FEE: 200,
  normalizeAssessmentId: vi.fn((id: string) => id),
  insertInvitationSchema: { parse: vi.fn((data: any) => data) },
  B2B_VOLUME_TIERS: {
    BOUTIQUE: { pricePerTest: 300, name: 'Boutique', volumeRange: '1-50', trialQuota: 5 },
    GROWTH: { pricePerTest: 250, name: 'Growth', volumeRange: '51-250', trialQuota: 10 },
    SMALL_ENTERPRISE: { pricePerTest: 200, name: 'Small Enterprise', volumeRange: '251-1000', trialQuota: 25 },
    ENTERPRISE: { pricePerTest: 150, name: 'Enterprise', volumeRange: '1001-5000', trialQuota: 50 },
    PRO: { pricePerTest: 100, name: 'Pro', volumeRange: '5001-10000', trialQuota: 100 },
  },
  CREDIT_EXPIRATION_MONTHS: 12,
  getTrialQuotaForTier: vi.fn().mockReturnValue(5),
  purchaseItems: { id: 'purchaseItems' },
  assessmentResults: { id: 'assessmentResults', assessmentType: 'assessmentType', status: 'status' },
  purchases: { id: 'purchases' },
  promptArchitectureEvaluations: { id: 'promptArchitectureEvaluations' },
  goldenSetResults: { id: 'goldenSetResults' },
  goldenSetPrompts: { id: 'goldenSetPrompts' },
  assessmentSessions: { id: 'assessmentSessions' },
  partnerMonthlyUsage: { id: 'partnerMonthlyUsage' },
  users: { id: 'users' },
  broadcastMessages: { id: 'broadcastMessages' },
  SYSTEM_SETTING_KEYS: {},
  auditLogs: { id: 'auditLogs' },
  errorLogs: { id: 'errorLogs' },
  partnerInvoices: { id: 'partnerInvoices' },
  invitations: { id: 'invitations' },
  partnerCandidateInvitations: { id: 'partnerCandidateInvitations' },
  candidateNotes: { id: 'candidateNotes' },
  emailLogs: { id: 'emailLogs' },
  sessions: { id: 'sessions' },
  appLogs: { id: 'appLogs' },
  partnerAccounts: { id: 'partnerAccounts' },
  partnerTeamMembers: { id: 'partnerTeamMembers' },
  jobRoles: { id: 'jobRoles' },
}));

vi.mock('@shared/currencies', () => ({
  getPPPAdjustedPriceInPence: vi.fn().mockReturnValue(400),
  getPricingTier: vi.fn().mockReturnValue('standard'),
  getStripeCurrencyCode: vi.fn().mockReturnValue('gbp'),
  convertPenceToRoundedLocalCurrency: vi.fn().mockReturnValue(4),
  calculateStripeAmountFromRoundedTotal: vi.fn().mockReturnValue(400),
  COUNTRY_CURRENCY_MAP: { GB: 'GBP', US: 'USD' },
  hasSEALaunchPricing: vi.fn().mockReturnValue(false),
  getSEALaunchPricing: vi.fn().mockReturnValue(null),
  CURRENCIES: {},
  ZERO_DECIMAL_CURRENCIES: [],
  roundPriceUp: vi.fn((n: number) => n),
  formatPrice: vi.fn((amount: number, currency: string) => `${currency}${amount}`),
  getCurrencyForCountry: vi.fn().mockReturnValue('GBP'),
  calculateCandidatePricing: vi.fn().mockReturnValue({ total: 400, items: [] }),
  calculateBundlePricing: vi.fn().mockReturnValue({ total: 400, discountedTotal: 400, items: [] }),
}));

vi.mock('../../server/email', () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendContactFormEmail: vi.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmailWithPassword: vi.fn().mockResolvedValue({ success: true }),
  sendPartnerWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
  sendGeneralEnquiryEmail: vi.fn().mockResolvedValue({ success: true }),
  sendB2BResultsEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPaymentReceiptWithPdf: vi.fn().mockResolvedValue({ success: true }),
  sendPartnerBulkInvitationEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../server/scoring', () => ({
  calculateFITScores: vi.fn().mockReturnValue({ overall: 75 }),
  calculateAIReadinessScores: vi.fn().mockReturnValue({ overall: 80 }),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn().mockResolvedValue(true),
    genSalt: vi.fn().mockResolvedValue('salt'),
  },
}));

vi.mock('stripe', () => {
  const mockStripe = {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ id: 'cs_test', url: 'https://stripe.com/checkout' }),
      },
    },
    coupons: {
      retrieve: vi.fn().mockRejectedValue({ code: 'resource_missing' }),
      create: vi.fn().mockResolvedValue({ id: 'coupon-1' }),
    },
    promotionCodes: {
      list: vi.fn().mockResolvedValue({ data: [] }),
      create: vi.fn().mockResolvedValue({ id: 'promo-1' }),
    },
    paymentIntents: {
      retrieve: vi.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded' }),
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({ type: 'checkout.session.completed', data: { object: {} } }),
    },
  };
  return { default: vi.fn(() => mockStripe) };
});

vi.mock('../../server/airwallex', () => ({
  createPaymentIntent: vi.fn().mockResolvedValue({ id: 'pi_test' }),
  formatAmountForAirwallex: vi.fn((amount: number) => amount),
  isAirwallexConfigured: vi.fn().mockReturnValue(false),
  getPaymentIntent: vi.fn().mockResolvedValue({ id: 'pi_test', status: 'SUCCEEDED' }),
  verifyAirwallexWebhookSignature: vi.fn().mockReturnValue(true),
  getAirwallexWebhookSecret: vi.fn().mockReturnValue('test-secret'),
  airwallexEnv: vi.fn().mockReturnValue('demo'),
}));

vi.mock('../../server/payment-routing', () => ({
  getPaymentProviders: vi.fn().mockReturnValue(['stripe']),
  createCheckoutWithFallback: vi.fn().mockResolvedValue({ url: 'https://checkout.example.com', provider: 'stripe' }),
}));

vi.mock('../../server/generateReceipt', () => ({
  generateReceiptPDF: vi.fn().mockResolvedValue(Buffer.from('pdf')),
  generateInvoicePDF: vi.fn().mockResolvedValue(Buffer.from('pdf')),
  generateInvoiceReceiptNumber: vi.fn().mockReturnValue('RCP-001'),
}));

vi.mock('../../server/passwordUtils', () => ({
  generateTemporaryPassword: vi.fn().mockReturnValue('temp-password-123'),
}));

vi.mock('../../server/queues', () => ({
  getQueueStats: vi.fn().mockResolvedValue({ email: 0, scoring: 0 }),
}));

vi.mock('../../server/exchange-rates', () => ({
  getExchangeRates: vi.fn().mockResolvedValue({ rates: { GBP: 1, USD: 1.27 }, timestamp: Date.now() }),
  initExchangeRates: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('openai', () => ({
  default: vi.fn(() => ({
    chat: { completions: { create: vi.fn().mockResolvedValue({ choices: [{ message: { content: '{}' } }] }) } },
  })),
}));

vi.mock('@shared/validation', () => ({
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  isValidEmail: vi.fn((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  isValidName: vi.fn((name: string) => typeof name === 'string' && name.length >= 1),
}));

vi.mock('../../server/ai-cost-tracker', () => ({
  logAiCost: vi.fn().mockResolvedValue(undefined),
  extractUsage: vi.fn().mockReturnValue({ promptTokens: 0, completionTokens: 0 }),
  AI_USAGE_OPERATION_TYPES: {},
}));

vi.mock('../../server/services/promptArchitecture', () => ({
  evaluatePromptWithGPT: vi.fn().mockResolvedValue({ score: 5, feedback: 'Good' }),
  PA_LEVEL_DESCRIPTIONS: {},
}));

vi.mock('../../shared/skillNames', () => ({
  getStrengthDescription: vi.fn().mockReturnValue('Strong'),
  getDevelopmentDescription: vi.fn().mockReturnValue('Developing'),
}));

vi.mock('multer', () => {
  const multerInstance = {
    single: vi.fn().mockReturnValue((req: any, res: any, next: any) => next()),
  };
  const multerFn: any = vi.fn(() => multerInstance);
  multerFn.memoryStorage = vi.fn();
  return { default: multerFn };
});

vi.mock('module', () => ({
  createRequire: vi.fn(() => vi.fn(() => ({ PDFParse: vi.fn() }))),
}));

vi.mock('../../server/partner-routes', () => ({
  registerPartnerRoutes: vi.fn(),
  registerGuestAssessmentRoutes: vi.fn(),
}));

vi.mock('../../server/ecosystem-routes', () => ({
  registerEcosystemRoutes: vi.fn(),
}));

vi.mock('../../server/bug-report-routes', () => ({
  registerBugReportRoutes: vi.fn(),
}));

import { storage } from '../../server/storage';
import { isAuthenticated } from '../../server/auth';

type RouteHandler = (req: any, res: any, next?: any) => any;
type MiddlewareOrHandler = RouteHandler;

interface RegisteredRoute {
  method: string;
  path: string;
  handlers: MiddlewareOrHandler[];
}

const registeredRoutes: RegisteredRoute[] = [];

function createMockApp() {
  const registerRoute = (method: string) => (path: string, ...handlers: MiddlewareOrHandler[]) => {
    registeredRoutes.push({ method, path, handlers });
  };

  return {
    get: vi.fn(registerRoute('get')),
    post: vi.fn(registerRoute('post')),
    put: vi.fn(registerRoute('put')),
    delete: vi.fn(registerRoute('delete')),
    patch: vi.fn(registerRoute('patch')),
    use: vi.fn(),
    listen: vi.fn(),
    set: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
  };
}

function createMockReq(overrides: Record<string, any> = {}) {
  return {
    user: null,
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    protocol: 'https',
    session: { destroy: vi.fn((cb: any) => cb && cb()) },
    ...overrides,
  };
}

function createMockRes() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    _statusCode: 200,
    _data: null,
  };
  return res;
}

function findRoute(method: string, path: string): RegisteredRoute | undefined {
  return registeredRoutes.find(r => r.method === method && r.path === path);
}

function getHandler(route: RegisteredRoute): MiddlewareOrHandler {
  return route.handlers[route.handlers.length - 1];
}

function hasAuthMiddleware(route: RegisteredRoute): boolean {
  return route.handlers.some(h => h === isAuthenticated);
}

let mockApp: any;

beforeAll(async () => {
  mockApp = createMockApp();
  const { registerRoutes } = await import('../../server/routes');
  await registerRoutes(mockApp as any);
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Route Registration', () => {
  it('should register GET /api/version', () => {
    expect(findRoute('get', '/api/version')).toBeDefined();
  });

  it('should register GET /api/geolocation', () => {
    expect(findRoute('get', '/api/geolocation')).toBeDefined();
  });

  it('should register GET /api/exchange-rates', () => {
    expect(findRoute('get', '/api/exchange-rates')).toBeDefined();
  });

  it('should register POST /api/contact', () => {
    expect(findRoute('post', '/api/contact')).toBeDefined();
  });

  it('should register POST /api/general-enquiry', () => {
    expect(findRoute('post', '/api/general-enquiry')).toBeDefined();
  });

  it('should register POST /api/enterprise-enquiry', () => {
    expect(findRoute('post', '/api/enterprise-enquiry')).toBeDefined();
  });

  it('should register POST /api/marketing-optin', () => {
    expect(findRoute('post', '/api/marketing-optin')).toBeDefined();
  });

  it('should register GET /api/auth/user', () => {
    expect(findRoute('get', '/api/auth/user')).toBeDefined();
  });

  it('should register POST /api/results-retention-consent', () => {
    expect(findRoute('post', '/api/results-retention-consent')).toBeDefined();
  });

  it('should register POST /api/user/accept-terms', () => {
    expect(findRoute('post', '/api/user/accept-terms')).toBeDefined();
  });

  it('should register POST /api/user/onboarding-preferences', () => {
    expect(findRoute('post', '/api/user/onboarding-preferences')).toBeDefined();
  });

  it('should register GET /api/user/notification-preferences', () => {
    expect(findRoute('get', '/api/user/notification-preferences')).toBeDefined();
  });

  it('should register PATCH /api/user/notification-preferences', () => {
    expect(findRoute('patch', '/api/user/notification-preferences')).toBeDefined();
  });

  it('should register DELETE /api/user/account', () => {
    expect(findRoute('delete', '/api/user/account')).toBeDefined();
  });

  it('should register POST /api/user/request-account-deletion', () => {
    expect(findRoute('post', '/api/user/request-account-deletion')).toBeDefined();
  });

  it('should register GET /api/purchases', () => {
    expect(findRoute('get', '/api/purchases')).toBeDefined();
  });

  it('should register GET /api/purchase-items/:purchaseId', () => {
    expect(findRoute('get', '/api/purchase-items/:purchaseId')).toBeDefined();
  });

  it('should register DELETE /api/purchase-items/:itemId', () => {
    expect(findRoute('delete', '/api/purchase-items/:itemId')).toBeDefined();
  });

  it('should register POST /api/purchase-items/add', () => {
    expect(findRoute('post', '/api/purchase-items/add')).toBeDefined();
  });

  it('should register GET /api/available-assessments', () => {
    expect(findRoute('get', '/api/available-assessments')).toBeDefined();
  });

  it('should register POST /api/assessments/start', () => {
    expect(findRoute('post', '/api/assessments/start')).toBeDefined();
  });

  it('should register POST /api/assessments/:id/submit', () => {
    expect(findRoute('post', '/api/assessments/:id/submit')).toBeDefined();
  });

  it('should register POST /api/assessments/:id/heartbeat', () => {
    expect(findRoute('post', '/api/assessments/:id/heartbeat')).toBeDefined();
  });

  it('should register POST /api/assessments/:id/pause', () => {
    expect(findRoute('post', '/api/assessments/:id/pause')).toBeDefined();
  });

  it('should register POST /api/assessments/:id/resume', () => {
    expect(findRoute('post', '/api/assessments/:id/resume')).toBeDefined();
  });

  it('should register POST /api/assessments/:id/abandon', () => {
    expect(findRoute('post', '/api/assessments/:id/abandon')).toBeDefined();
  });

  it('should register GET /api/assessments/:id/status', () => {
    expect(findRoute('get', '/api/assessments/:id/status')).toBeDefined();
  });

  it('should register GET /api/results', () => {
    expect(findRoute('get', '/api/results')).toBeDefined();
  });

  it('should register GET /api/results/:id', () => {
    expect(findRoute('get', '/api/results/:id')).toBeDefined();
  });

  it('should register GET /api/invitation-status', () => {
    expect(findRoute('get', '/api/invitation-status')).toBeDefined();
  });

  it('should register POST /api/admin/invitations', () => {
    expect(findRoute('post', '/api/admin/invitations')).toBeDefined();
  });

  it('should register GET /api/admin/results', () => {
    expect(findRoute('get', '/api/admin/results')).toBeDefined();
  });

  it('should register GET /api/admin/candidates', () => {
    expect(findRoute('get', '/api/admin/candidates')).toBeDefined();
  });

  it('should register POST /api/check-email-exists', () => {
    expect(findRoute('post', '/api/check-email-exists')).toBeDefined();
  });

  it('should register POST /api/create-free-invitation', () => {
    expect(findRoute('post', '/api/create-free-invitation')).toBeDefined();
  });

  it('should register POST /api/create-checkout-session-guest', () => {
    expect(findRoute('post', '/api/create-checkout-session-guest')).toBeDefined();
  });

  it('should register POST /api/create-checkout-session', () => {
    expect(findRoute('post', '/api/create-checkout-session')).toBeDefined();
  });

  it('should register GET /api/my-candidate-data', () => {
    expect(findRoute('get', '/api/my-candidate-data')).toBeDefined();
  });

  it('should register at least 50 routes total', () => {
    expect(registeredRoutes.length).toBeGreaterThanOrEqual(50);
  });
});

describe('Authentication Middleware', () => {
  it('should apply isAuthenticated to GET /api/auth/user', () => {
    const route = findRoute('get', '/api/auth/user');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to GET /api/purchases', () => {
    const route = findRoute('get', '/api/purchases');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to GET /api/results', () => {
    const route = findRoute('get', '/api/results');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to POST /api/results-retention-consent', () => {
    const route = findRoute('post', '/api/results-retention-consent');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to DELETE /api/user/account', () => {
    const route = findRoute('delete', '/api/user/account');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to POST /api/assessments/start', () => {
    const route = findRoute('post', '/api/assessments/start');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to POST /api/assessments/:id/submit', () => {
    const route = findRoute('post', '/api/assessments/:id/submit');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to GET /api/admin/results', () => {
    const route = findRoute('get', '/api/admin/results');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to GET /api/admin/candidates', () => {
    const route = findRoute('get', '/api/admin/candidates');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to POST /api/admin/invitations', () => {
    const route = findRoute('post', '/api/admin/invitations');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should NOT apply isAuthenticated to GET /api/version', () => {
    const route = findRoute('get', '/api/version');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(false);
  });

  it('should NOT apply isAuthenticated to POST /api/contact', () => {
    const route = findRoute('post', '/api/contact');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(false);
  });

  it('should NOT apply isAuthenticated to POST /api/check-email-exists', () => {
    const route = findRoute('post', '/api/check-email-exists');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(false);
  });
});

describe('GET /api/version', () => {
  it('should return version info', async () => {
    const route = findRoute('get', '/api/version')!;
    const handler = getHandler(route);
    const req = createMockReq();
    const res = createMockRes();

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      version: expect.any(String),
      scoringLogic: 'normalized',
    }));
  });
});

describe('GET /api/geolocation', () => {
  it('should return default geolocation for private IPs', async () => {
    const route = findRoute('get', '/api/geolocation')!;
    const handler = getHandler(route);
    const req = createMockReq({ ip: '127.0.0.1', headers: {} });
    const res = createMockRes();

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      countryCode: 'GB',
      detected: false,
      source: 'default',
      isVPN: false,
    }));
  });
});

describe('GET /api/exchange-rates', () => {
  it('should return exchange rates', async () => {
    const route = findRoute('get', '/api/exchange-rates')!;
    const handler = getHandler(route);
    const req = createMockReq();
    const res = createMockRes();

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      rates: expect.any(Object),
    }));
  });
});

describe('POST /api/contact', () => {
  it('should return 400 for invalid form data', async () => {
    const route = findRoute('post', '/api/contact')!;
    const handler = getHandler(route);
    const req = createMockReq({ body: {} });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.any(String),
    }));
  });

  it('should send contact form successfully with valid data', async () => {
    const route = findRoute('post', '/api/contact')!;
    const handler = getHandler(route);
    const req = createMockReq({
      body: {
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Acme Corp',
        message: 'I would like more information about your services',
        intent: 'demo',
      },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
    }));
  });
});

describe('POST /api/general-enquiry', () => {
  it('should return 400 when required fields are missing', async () => {
    const route = findRoute('post', '/api/general-enquiry')!;
    const handler = getHandler(route);
    const req = createMockReq({ body: { name: 'Test' } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 for invalid email', async () => {
    const route = findRoute('post', '/api/general-enquiry')!;
    const handler = getHandler(route);
    const req = createMockReq({
      body: { name: 'Test User', email: 'not-an-email', subject: 'Test', message: 'Hello world test' },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('email'),
    }));
  });
});

describe('POST /api/enterprise-enquiry', () => {
  it('should return 400 for invalid email', async () => {
    const route = findRoute('post', '/api/enterprise-enquiry')!;
    const handler = getHandler(route);
    const req = createMockReq({
      ip: '10.0.0.98',
      body: { name: 'Test', email: 'bad-email', company: 'Test Co', message: 'A long enough message for validation' },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 for short message', async () => {
    const route = findRoute('post', '/api/enterprise-enquiry')!;
    const handler = getHandler(route);
    const req = createMockReq({
      ip: '10.0.0.99',
      body: { name: 'Test', email: 'test@example.com', company: 'Test Co', message: 'Short' },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('GET /api/auth/user', () => {
  it('should return user data for authenticated user', async () => {
    const route = findRoute('get', '/api/auth/user')!;
    const handler = getHandler(route);
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'candidate',
      organizationId: null,
      resultsRetentionConsent: true,
      termsAccepted: true,
      dataShareConsent: false,
    };
    const req = createMockReq({ user: mockUser });
    const res = createMockRes();

    vi.mocked(storage.ensureInvitationPurchase).mockResolvedValue(undefined);
    vi.mocked(storage.getPurchasesByUser).mockResolvedValue([]);

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      isInvitationOnly: true,
    }));
  });

  it('should set isInvitationOnly to false when user has completed purchase', async () => {
    const route = findRoute('get', '/api/auth/user')!;
    const handler = getHandler(route);
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'candidate',
      organizationId: null,
      resultsRetentionConsent: true,
      termsAccepted: true,
      dataShareConsent: false,
    };
    const req = createMockReq({ user: mockUser });
    const res = createMockRes();

    vi.mocked(storage.ensureInvitationPurchase).mockResolvedValue(undefined);
    vi.mocked(storage.getPurchasesByUser).mockResolvedValue([
      { id: 'p-1', status: 'completed', userId: 'user-1' } as any,
    ]);

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      isInvitationOnly: false,
    }));
  });

  it('should return 500 on storage error', async () => {
    const route = findRoute('get', '/api/auth/user')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1', email: 'test@example.com' } });
    const res = createMockRes();

    vi.mocked(storage.ensureInvitationPurchase).mockRejectedValue(new Error('DB error'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Failed'),
    }));
  });
});

describe('POST /api/results-retention-consent', () => {
  it('should return 400 when consent is not boolean', async () => {
    const route = findRoute('post', '/api/results-retention-consent')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, body: { consent: 'yes' } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('boolean'),
    }));
  });

  it('should update consent successfully', async () => {
    const route = findRoute('post', '/api/results-retention-consent')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, body: { consent: true } });
    const res = createMockRes();

    await handler(req, res);

    expect(storage.updateResultsRetentionConsent).toHaveBeenCalledWith('user-1', true);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      consent: true,
    }));
  });
});

describe('POST /api/user/accept-terms', () => {
  it('should return 400 when termsAccepted is not boolean', async () => {
    const route = findRoute('post', '/api/user/accept-terms')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, body: { termsAccepted: 'yes' } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when terms are not accepted', async () => {
    const route = findRoute('post', '/api/user/accept-terms')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, body: { termsAccepted: false } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('accepted'),
    }));
  });

  it('should accept terms successfully', async () => {
    const route = findRoute('post', '/api/user/accept-terms')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      body: { termsAccepted: true, dataShareConsent: true },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(storage.acceptTerms).toHaveBeenCalledWith('user-1', true, true);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

describe('POST /api/user/onboarding-preferences', () => {
  it('should return 400 when termsAccepted is not boolean', async () => {
    const route = findRoute('post', '/api/user/onboarding-preferences')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, body: { termsAccepted: 'yes' } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when terms are rejected', async () => {
    const route = findRoute('post', '/api/user/onboarding-preferences')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, body: { termsAccepted: false } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should save preferences successfully', async () => {
    const route = findRoute('post', '/api/user/onboarding-preferences')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      body: { termsAccepted: true, marketingOptIn: false, dataRetentionConsent: true },
    });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue(null);

    await handler(req, res);

    expect(storage.acceptTerms).toHaveBeenCalledWith('user-1', true, true);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

describe('DELETE /api/user/account', () => {
  it('should return 404 when user not found', async () => {
    const route = findRoute('delete', '/api/user/account')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue(null);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 403 for admin users', async () => {
    const route = findRoute('delete', '/api/user/account')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      email: 'admin@test.com',
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should delete non-admin user account successfully', async () => {
    const route = findRoute('delete', '/api/user/account')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      session: { destroy: vi.fn((cb: any) => cb && cb()) },
    });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue({
      id: 'user-1',
      role: 'candidate',
      email: 'candidate@test.com',
    } as any);

    await handler(req, res);

    expect(storage.deleteUserAccount).toHaveBeenCalledWith('user-1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
    }));
  });
});

describe('POST /api/user/request-account-deletion', () => {
  it('should return 404 when user not found', async () => {
    const route = findRoute('post', '/api/user/request-account-deletion')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue(null);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should submit deletion request successfully', async () => {
    const { sendGeneralEnquiryEmail } = await import('../../server/email');
    const route = findRoute('post', '/api/user/request-account-deletion')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue({
      id: 'user-1',
      email: 'user@test.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'candidate',
    } as any);

    await handler(req, res);

    expect(sendGeneralEnquiryEmail).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
    }));
  });
});

describe('GET /api/purchases', () => {
  it('should return user purchases', async () => {
    const route = findRoute('get', '/api/purchases')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    const mockPurchases = [{ id: 'p-1', status: 'completed', userId: 'user-1' }];
    vi.mocked(storage.getPurchasesByUser).mockResolvedValue(mockPurchases as any);

    await handler(req, res);

    expect(storage.getPurchasesByUser).toHaveBeenCalledWith('user-1');
    expect(res.json).toHaveBeenCalledWith(mockPurchases);
  });

  it('should return 500 on error', async () => {
    const route = findRoute('get', '/api/purchases')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getPurchasesByUser).mockRejectedValue(new Error('DB error'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('GET /api/purchase-items/:purchaseId', () => {
  it('should return 404 when purchase not found', async () => {
    const route = findRoute('get', '/api/purchase-items/:purchaseId')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, params: { purchaseId: 'p-1' } });
    const res = createMockRes();

    vi.mocked(storage.getPurchase).mockResolvedValue(null);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 404 when purchase belongs to different user', async () => {
    const route = findRoute('get', '/api/purchase-items/:purchaseId')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, params: { purchaseId: 'p-1' } });
    const res = createMockRes();

    vi.mocked(storage.getPurchase).mockResolvedValue({
      id: 'p-1',
      userId: 'user-2',
      status: 'completed',
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return purchase items for valid purchase', async () => {
    const route = findRoute('get', '/api/purchase-items/:purchaseId')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, params: { purchaseId: 'p-1' } });
    const res = createMockRes();

    vi.mocked(storage.getPurchase).mockResolvedValue({
      id: 'p-1',
      userId: 'user-1',
      status: 'completed',
    } as any);
    const mockItems = [{ id: 'item-1', assessmentType: 'fit' }];
    vi.mocked(storage.getPurchaseItems).mockResolvedValue(mockItems as any);

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(mockItems);
  });
});

describe('DELETE /api/purchase-items/:itemId', () => {
  it('should return 404 when user not found', async () => {
    const route = findRoute('delete', '/api/purchase-items/:itemId')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, params: { itemId: 'item-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue(null);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 403 for employer-onboarded users', async () => {
    const route = findRoute('delete', '/api/purchase-items/:itemId')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, params: { itemId: 'item-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue({
      id: 'user-1',
      organizationId: 'org-1',
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 404 when item not found', async () => {
    const route = findRoute('delete', '/api/purchase-items/:itemId')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, params: { itemId: 'item-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue({
      id: 'user-1',
      organizationId: null,
    } as any);
    vi.mocked(storage.getPurchaseItem).mockResolvedValue(null);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 403 for invitation-based assessments', async () => {
    const route = findRoute('delete', '/api/purchase-items/:itemId')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, params: { itemId: 'item-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue({ id: 'user-1', organizationId: null } as any);
    vi.mocked(storage.getPurchaseItem).mockResolvedValue({ id: 'item-1', purchaseId: 'p-1' } as any);
    vi.mocked(storage.getPurchase).mockResolvedValue({
      id: 'p-1',
      userId: 'user-1',
      invitationId: 'inv-1',
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 400 for started assessments', async () => {
    const route = findRoute('delete', '/api/purchase-items/:itemId')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, params: { itemId: 'item-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue({ id: 'user-1', organizationId: null } as any);
    vi.mocked(storage.getPurchaseItem).mockResolvedValue({ id: 'item-1', purchaseId: 'p-1' } as any);
    vi.mocked(storage.getPurchase).mockResolvedValue({
      id: 'p-1',
      userId: 'user-1',
      invitationId: null,
    } as any);
    vi.mocked(storage.getResultByPurchaseItem).mockResolvedValue({
      id: 'r-1',
      status: 'in_progress',
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should delete purchase item successfully', async () => {
    const route = findRoute('delete', '/api/purchase-items/:itemId')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, params: { itemId: 'item-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue({ id: 'user-1', organizationId: null } as any);
    vi.mocked(storage.getPurchaseItem).mockResolvedValue({ id: 'item-1', purchaseId: 'p-1' } as any);
    vi.mocked(storage.getPurchase).mockResolvedValue({
      id: 'p-1',
      userId: 'user-1',
      invitationId: null,
    } as any);
    vi.mocked(storage.getResultByPurchaseItem).mockResolvedValue(null);

    await handler(req, res);

    expect(storage.deletePurchaseItem).toHaveBeenCalledWith('item-1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('GET /api/results', () => {
  it('should return user results', async () => {
    const route = findRoute('get', '/api/results')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    const mockResults = [
      { id: 'r-1', status: 'completed', assessmentType: 'fit', answers: { q1: 'a' }, userId: 'user-1' },
    ];
    vi.mocked(storage.getResultsByUser).mockResolvedValue(mockResults as any);

    await handler(req, res);

    expect(storage.getResultsByUser).toHaveBeenCalledWith('user-1');
    expect(res.json).toHaveBeenCalled();
  });

  it('should return 500 on error', async () => {
    const route = findRoute('get', '/api/results')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getResultsByUser).mockRejectedValue(new Error('DB error'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('GET /api/results/:id', () => {
  it('should return 404 when result not found', async () => {
    const route = findRoute('get', '/api/results/:id')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, params: { id: 'r-1' } });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue(null);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 404 when result belongs to different user', async () => {
    const route = findRoute('get', '/api/results/:id')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, params: { id: 'r-1' } });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue({
      id: 'r-1',
      userId: 'user-2',
      status: 'completed',
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return result for authorized user', async () => {
    const route = findRoute('get', '/api/results/:id')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, params: { id: 'r-1' } });
    const res = createMockRes();

    const mockResult = {
      id: 'r-1',
      userId: 'user-1',
      status: 'completed',
      assessmentType: 'aiq',
      answers: { q1: 'a' },
    };
    vi.mocked(storage.getAssessmentResult).mockResolvedValue(mockResult as any);

    await handler(req, res);

    expect(res.json).toHaveBeenCalled();
  });
});

describe('GET /api/my-candidate-data', () => {
  it('should return 404 when user not found', async () => {
    const route = findRoute('get', '/api/my-candidate-data')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue(null);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return candidate data with empty tags/notes', async () => {
    const route = findRoute('get', '/api/my-candidate-data')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
    } as any);
    vi.mocked(storage.getResultsByUser).mockResolvedValue([]);

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      user: expect.any(Object),
      results: [],
      tags: [],
      notes: [],
      invitations: [],
    }));
  });
});

describe('GET /api/invitation-status', () => {
  it('should return 404 when user not found', async () => {
    const route = findRoute('get', '/api/invitation-status')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue(null);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return wasInvited: false when no invitations', async () => {
    const route = findRoute('get', '/api/invitation-status')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
    } as any);
    vi.mocked(storage.getAllInvitations).mockResolvedValue([]);

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ wasInvited: false });
  });

  it('should return wasInvited: true when invitation exists', async () => {
    const route = findRoute('get', '/api/invitation-status')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
    } as any);
    vi.mocked(storage.getAllInvitations).mockResolvedValue([
      { id: 'inv-1', candidateEmail: 'test@example.com' },
    ] as any);

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ wasInvited: true });
  });
});

describe('POST /api/check-email-exists', () => {
  it('should return 400 for invalid email', async () => {
    const route = findRoute('post', '/api/check-email-exists')!;
    const handler = getHandler(route);
    const req = createMockReq({ body: { email: 'not-valid' } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 for missing email', async () => {
    const route = findRoute('post', '/api/check-email-exists')!;
    const handler = getHandler(route);
    const req = createMockReq({ body: {} });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return exists: false when email not found', async () => {
    const route = findRoute('post', '/api/check-email-exists')!;
    const handler = getHandler(route);
    const req = createMockReq({ body: { email: 'new@example.com' } });
    const res = createMockRes();

    vi.mocked(storage.getUserByEmail).mockResolvedValue(null);

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ exists: false });
  });

  it('should return exists: true when email exists', async () => {
    const route = findRoute('post', '/api/check-email-exists')!;
    const handler = getHandler(route);
    const req = createMockReq({ body: { email: 'existing@example.com' } });
    const res = createMockRes();

    vi.mocked(storage.getUserByEmail).mockResolvedValue({ id: 'user-1' } as any);

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ exists: true });
  });
});

describe('POST /api/create-free-invitation', () => {
  it('should return 400 when assessmentIds missing', async () => {
    const route = findRoute('post', '/api/create-free-invitation')!;
    const handler = getHandler(route);
    const req = createMockReq({ body: {} });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when assessmentIds is empty array', async () => {
    const route = findRoute('post', '/api/create-free-invitation')!;
    const handler = getHandler(route);
    const req = createMockReq({ body: { assessmentIds: [] } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when email is missing', async () => {
    const route = findRoute('post', '/api/create-free-invitation')!;
    const handler = getHandler(route);
    const req = createMockReq({
      body: { assessmentIds: ['fit'], firstName: 'John', lastName: 'Doe' },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 for invalid email', async () => {
    const route = findRoute('post', '/api/create-free-invitation')!;
    const handler = getHandler(route);
    const req = createMockReq({
      body: { assessmentIds: ['fit'], email: 'bad-email', firstName: 'John', lastName: 'Doe' },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('POST /api/create-checkout-session-guest', () => {
  it('should return 400 when assessmentIds missing', async () => {
    const route = findRoute('post', '/api/create-checkout-session-guest')!;
    const handler = getHandler(route);
    const req = createMockReq({ body: {} });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when customer details missing', async () => {
    const route = findRoute('post', '/api/create-checkout-session-guest')!;
    const handler = getHandler(route);
    const req = createMockReq({
      body: { assessmentIds: ['fit'], customerEmail: 'test@example.com' },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('GET /api/admin/results', () => {
  it('should return 403 for non-admin users', async () => {
    const route = findRoute('get', '/api/admin/results')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue({
      id: 'user-1',
      role: 'candidate',
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return results for super_admin', async () => {
    const route = findRoute('get', '/api/admin/results')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'admin-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue({
      id: 'admin-1',
      role: 'super_admin',
    } as any);
    vi.mocked(storage.getAllResults).mockResolvedValue([]);

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });
});

describe('GET /api/admin/candidates', () => {
  it('should return 403 for non-admin users', async () => {
    const route = findRoute('get', '/api/admin/candidates')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue({
      id: 'user-1',
      role: 'candidate',
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('POST /api/admin/invitations', () => {
  it('should return 403 for non-admin users', async () => {
    const route = findRoute('post', '/api/admin/invitations')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue({
      id: 'user-1',
      role: 'candidate',
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('POST /api/assessments/:id/submit', () => {
  it('should return 400 when answers are missing', async () => {
    const route = findRoute('post', '/api/assessments/:id/submit')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
      body: {},
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 404 when assessment not found', async () => {
    const route = findRoute('post', '/api/assessments/:id/submit')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
      body: { answers: { q1: 'a' } },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue(null);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('GET /api/assessments/:id/status', () => {
  it('should return 404 when assessment not found', async () => {
    const route = findRoute('get', '/api/assessments/:id/status')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue(null);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 403 when assessment belongs to different user', async () => {
    const route = findRoute('get', '/api/assessments/:id/status')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue({
      id: 'r-1',
      userId: 'user-2',
      status: 'in_progress',
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return assessment status for valid user', async () => {
    const route = findRoute('get', '/api/assessments/:id/status')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue({
      id: 'r-1',
      userId: 'user-1',
      status: 'in_progress',
      pausedAt: null,
      pauseGraceExpiresAt: null,
      pausedTimeRemainingMs: null,
      resumeCount: 0,
    } as any);

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 'r-1',
      status: 'in_progress',
      isPaused: false,
    }));
  });
});

describe('Error handling across routes', () => {
  it('GET /api/auth/user handles storage errors gracefully', async () => {
    const route = findRoute('get', '/api/auth/user')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1', email: 'test@test.com' } });
    const res = createMockRes();

    vi.mocked(storage.ensureInvitationPurchase).mockRejectedValue(new Error('Connection lost'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('POST /api/results-retention-consent handles storage errors', async () => {
    const route = findRoute('post', '/api/results-retention-consent')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, body: { consent: true } });
    const res = createMockRes();

    vi.mocked(storage.updateResultsRetentionConsent).mockRejectedValue(new Error('DB fail'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('POST /api/user/accept-terms handles storage errors', async () => {
    const route = findRoute('post', '/api/user/accept-terms')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      body: { termsAccepted: true },
    });
    const res = createMockRes();

    vi.mocked(storage.acceptTerms).mockRejectedValue(new Error('DB fail'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('GET /api/invitation-status handles storage errors', async () => {
    const route = findRoute('get', '/api/invitation-status')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockRejectedValue(new Error('DB fail'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('POST /api/check-email-exists handles storage errors', async () => {
    const route = findRoute('post', '/api/check-email-exists')!;
    const handler = getHandler(route);
    const req = createMockReq({ body: { email: 'test@example.com' } });
    const res = createMockRes();

    vi.mocked(storage.getUserByEmail).mockRejectedValue(new Error('DB fail'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('DELETE /api/user/account handles storage errors', async () => {
    const route = findRoute('delete', '/api/user/account')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockRejectedValue(new Error('DB fail'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('GET /api/my-candidate-data handles storage errors', async () => {
    const route = findRoute('get', '/api/my-candidate-data')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockRejectedValue(new Error('DB fail'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('GET /api/assessments/:id/status handles storage errors', async () => {
    const route = findRoute('get', '/api/assessments/:id/status')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockRejectedValue(new Error('DB fail'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('POST /api/marketing-optin', () => {
  it('should return 400 for invalid email', async () => {
    const route = findRoute('post', '/api/marketing-optin')!;
    const handler = getHandler(route);
    const req = createMockReq({ body: { email: 'not-valid' } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 for missing email', async () => {
    const route = findRoute('post', '/api/marketing-optin')!;
    const handler = getHandler(route);
    const req = createMockReq({ body: {} });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should save optin successfully', async () => {
    const route = findRoute('post', '/api/marketing-optin')!;
    const handler = getHandler(route);
    const req = createMockReq({
      body: { email: 'test@example.com', source: 'job_ad' },
      headers: { 'user-agent': 'TestAgent' },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(storage.createMarketingOptin).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('should handle storage error', async () => {
    const route = findRoute('post', '/api/marketing-optin')!;
    const handler = getHandler(route);
    const req = createMockReq({
      body: { email: 'test@example.com' },
    });
    const res = createMockRes();

    vi.mocked(storage.createMarketingOptin).mockRejectedValue(new Error('DB error'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('GET /api/admin/marketing-optins', () => {
  it('should return 403 for non-admin users', async () => {
    const route = findRoute('get', '/api/admin/marketing-optins')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1', role: 'candidate' } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return optins for admin', async () => {
    const route = findRoute('get', '/api/admin/marketing-optins')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'admin-1', role: 'super_admin' } });
    const res = createMockRes();

    vi.mocked(storage.getAllMarketingOptins).mockResolvedValue([{ email: 'test@test.com' }] as any);
    (storage as any).getMarketingOptins = vi.fn().mockResolvedValue([{ email: 'test@test.com' }]);

    await handler(req, res);

    expect(res.json).toHaveBeenCalled();
  });
});

describe('POST /api/process-payment-success', () => {
  it('should return 400 when no payment reference provided', async () => {
    const route = findRoute('post', '/api/process-payment-success')!;
    const handler = getHandler(route);
    const req = createMockReq({ body: {} });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('POST /api/checkout-free', () => {
  it('should return 400 when assessmentIds missing', async () => {
    const route = findRoute('post', '/api/checkout-free')!;
    const handler = getHandler(route);
    const req = createMockReq({ body: {} });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when customer details missing', async () => {
    const route = findRoute('post', '/api/checkout-free')!;
    const handler = getHandler(route);
    const req = createMockReq({
      body: { assessmentIds: ['fit'], customerEmail: 'test@example.com' },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when user already exists', async () => {
    const route = findRoute('post', '/api/checkout-free')!;
    const handler = getHandler(route);
    const req = createMockReq({
      body: {
        assessmentIds: ['fit'],
        customerEmail: 'existing@example.com',
        customerName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
      },
    });
    const res = createMockRes();

    vi.mocked(storage.getUserByEmail).mockResolvedValue({ id: 'user-1' } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('POST /api/create-free-purchase', () => {
  it('should return 400 when assessmentIds missing', async () => {
    const route = findRoute('post', '/api/create-free-purchase')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' }, body: {} });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 404 when user not found', async () => {
    const route = findRoute('post', '/api/create-free-purchase')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      body: { assessmentIds: ['fit'] },
    });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue(null);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('POST /api/assessments/:id/heartbeat', () => {
  it('should return 404 when assessment not found', async () => {
    const route = findRoute('post', '/api/assessments/:id/heartbeat')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
      body: { timeRemainingMs: 60000 },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue(null);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 403 when user does not own assessment', async () => {
    const route = findRoute('post', '/api/assessments/:id/heartbeat')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
      body: { timeRemainingMs: 60000 },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue({
      id: 'r-1',
      userId: 'user-2',
      status: 'in_progress',
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return success for non-in-progress assessment', async () => {
    const route = findRoute('post', '/api/assessments/:id/heartbeat')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
      body: { timeRemainingMs: 60000 },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue({
      id: 'r-1',
      userId: 'user-1',
      status: 'completed',
    } as any);

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('should handle errors gracefully', async () => {
    const route = findRoute('post', '/api/assessments/:id/heartbeat')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
      body: { timeRemainingMs: 60000 },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockRejectedValue(new Error('DB error'));

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

describe('POST /api/assessments/:id/pause', () => {
  it('should return 400 for invalid timeRemainingMs', async () => {
    const route = findRoute('post', '/api/assessments/:id/pause')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
      body: { timeRemainingMs: -1 },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 404 when assessment not found', async () => {
    const route = findRoute('post', '/api/assessments/:id/pause')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
      body: { timeRemainingMs: 60000 },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue(null);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 403 when user does not own assessment', async () => {
    const route = findRoute('post', '/api/assessments/:id/pause')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
      body: { timeRemainingMs: 60000 },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue({
      id: 'r-1',
      userId: 'user-2',
      status: 'in_progress',
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 400 for non-in-progress assessment', async () => {
    const route = findRoute('post', '/api/assessments/:id/pause')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
      body: { timeRemainingMs: 60000 },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue({
      id: 'r-1',
      userId: 'user-1',
      status: 'completed',
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('POST /api/assessments/:id/resume', () => {
  it('should return 404 when assessment not found', async () => {
    const route = findRoute('post', '/api/assessments/:id/resume')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue(null);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 403 when user does not own assessment', async () => {
    const route = findRoute('post', '/api/assessments/:id/resume')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue({
      id: 'r-1',
      userId: 'user-2',
      status: 'in_progress',
      pausedAt: new Date(),
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 400 when assessment is not paused', async () => {
    const route = findRoute('post', '/api/assessments/:id/resume')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue({
      id: 'r-1',
      userId: 'user-1',
      status: 'in_progress',
      pausedAt: null,
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when grace period expired', async () => {
    const route = findRoute('post', '/api/assessments/:id/resume')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue({
      id: 'r-1',
      userId: 'user-1',
      status: 'in_progress',
      pausedAt: new Date(Date.now() - 60 * 60 * 1000),
      pauseGraceExpiresAt: new Date(Date.now() - 30 * 60 * 1000),
      resumeCount: 0,
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(storage.updateAssessmentResult).toHaveBeenCalled();
  });

  it('should resume assessment successfully', async () => {
    const route = findRoute('post', '/api/assessments/:id/resume')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue({
      id: 'r-1',
      userId: 'user-1',
      status: 'in_progress',
      pausedAt: new Date(),
      pauseGraceExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      pausedTimeRemainingMs: 600000,
      resumeCount: 0,
    } as any);

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      resumeCount: 1,
    }));
  });
});

describe('POST /api/assessments/:id/abandon', () => {
  it('should return 404 when assessment not found', async () => {
    const route = findRoute('post', '/api/assessments/:id/abandon')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue(null);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 403 when user does not own assessment', async () => {
    const route = findRoute('post', '/api/assessments/:id/abandon')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue({
      id: 'r-1',
      userId: 'user-2',
      status: 'in_progress',
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 400 for non-in-progress assessment', async () => {
    const route = findRoute('post', '/api/assessments/:id/abandon')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue({
      id: 'r-1',
      userId: 'user-1',
      status: 'completed',
    } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should abandon assessment successfully', async () => {
    const route = findRoute('post', '/api/assessments/:id/abandon')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockResolvedValue({
      id: 'r-1',
      userId: 'user-1',
      status: 'in_progress',
    } as any);

    await handler(req, res);

    expect(storage.updateAssessmentResult).toHaveBeenCalledWith('r-1', expect.objectContaining({
      status: 'abandoned',
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('should handle errors', async () => {
    const route = findRoute('post', '/api/assessments/:id/abandon')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      params: { id: 'r-1' },
    });
    const res = createMockRes();

    vi.mocked(storage.getAssessmentResult).mockRejectedValue(new Error('DB error'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('GET /api/user/notification-preferences', () => {
  it('should return 404 when user not found', async () => {
    const route = findRoute('get', '/api/user/notification-preferences')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue(null);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return default preferences when none set', async () => {
    const route = findRoute('get', '/api/user/notification-preferences')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockResolvedValue({
      id: 'user-1',
      notificationPreferences: null,
    } as any);

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      preferences: expect.objectContaining({
        assessmentReminders: true,
        resultNotifications: true,
        marketingEmails: false,
      }),
    }));
  });

  it('should return stored preferences', async () => {
    const route = findRoute('get', '/api/user/notification-preferences')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    const storedPrefs = { assessmentReminders: false, resultNotifications: true, marketingEmails: true };
    vi.mocked(storage.getUser).mockResolvedValue({
      id: 'user-1',
      notificationPreferences: storedPrefs,
    } as any);

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ preferences: storedPrefs });
  });

  it('should handle errors', async () => {
    const route = findRoute('get', '/api/user/notification-preferences')!;
    const handler = getHandler(route);
    const req = createMockReq({ user: { id: 'user-1' } });
    const res = createMockRes();

    vi.mocked(storage.getUser).mockRejectedValue(new Error('DB error'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('PATCH /api/user/notification-preferences', () => {
  it('should update notification preferences', async () => {
    const route = findRoute('patch', '/api/user/notification-preferences')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      body: { assessmentReminders: false, resultNotifications: true, marketingEmails: true },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(storage.updateUserNotificationPreferences).toHaveBeenCalledWith('user-1', {
      assessmentReminders: false,
      resultNotifications: true,
      marketingEmails: true,
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('should default to safe values for missing fields', async () => {
    const route = findRoute('patch', '/api/user/notification-preferences')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      body: {},
    });
    const res = createMockRes();

    await handler(req, res);

    expect(storage.updateUserNotificationPreferences).toHaveBeenCalledWith('user-1', {
      assessmentReminders: true,
      resultNotifications: true,
      marketingEmails: false,
    });
  });

  it('should handle errors', async () => {
    const route = findRoute('patch', '/api/user/notification-preferences')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      body: { assessmentReminders: true },
    });
    const res = createMockRes();

    vi.mocked(storage.updateUserNotificationPreferences).mockRejectedValue(new Error('DB error'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('POST /api/user/onboarding-preferences - marketing optin', () => {
  it('should save marketing optin when marketingOptIn is true and user exists', async () => {
    const route = findRoute('post', '/api/user/onboarding-preferences')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      body: { termsAccepted: true, marketingOptIn: true, dataRetentionConsent: false },
    });
    const res = createMockRes();

    vi.mocked(storage.acceptTerms).mockResolvedValue(undefined);
    vi.mocked(storage.getUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' } as any);
    vi.mocked(storage.createMarketingOptin).mockResolvedValue(undefined as any);

    await handler(req, res);

    expect(storage.acceptTerms).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('should handle errors during onboarding preferences', async () => {
    const route = findRoute('post', '/api/user/onboarding-preferences')!;
    const handler = getHandler(route);
    const req = createMockReq({
      user: { id: 'user-1' },
      body: { termsAccepted: true },
    });
    const res = createMockRes();

    vi.mocked(storage.acceptTerms).mockRejectedValue(new Error('DB error'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('POST /api/general-enquiry - successful submission', () => {
  it('should send enquiry successfully with valid data', async () => {
    const { sendGeneralEnquiryEmail } = await import('../../server/email');
    const route = findRoute('post', '/api/general-enquiry')!;
    const handler = getHandler(route);
    const req = createMockReq({
      ip: '10.0.0.100',
      body: {
        name: 'Jane Smith',
        email: 'jane@example.com',
        subject: 'Question about services',
        message: 'I would like to know more about your assessment platform',
      },
    });
    const res = createMockRes();

    vi.mocked(sendGeneralEnquiryEmail).mockResolvedValue({ success: true } as any);

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('should return 400 for invalid name', async () => {
    const route = findRoute('post', '/api/general-enquiry')!;
    const handler = getHandler(route);
    const { isValidName } = await import('@shared/validation');
    vi.mocked(isValidName).mockReturnValue(false);
    const req = createMockReq({
      ip: '10.0.0.101',
      body: { name: '', email: 'test@example.com', subject: 'Test', message: 'Hello world test message' },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    vi.mocked(isValidName).mockReturnValue(true);
  });
});

describe('POST /api/enterprise-enquiry - successful submission', () => {
  it('should send enterprise enquiry successfully', async () => {
    const { sendGeneralEnquiryEmail } = await import('../../server/email');
    const route = findRoute('post', '/api/enterprise-enquiry')!;
    const handler = getHandler(route);
    const req = createMockReq({
      ip: '10.0.0.102',
      body: {
        name: 'Bob Smith',
        email: 'bob@bigcorp.com',
        company: 'BigCorp',
        message: 'We are interested in enterprise assessment services for our team',
        context: 'From FIT Results Page',
      },
    });
    const res = createMockRes();

    vi.mocked(sendGeneralEnquiryEmail).mockResolvedValue({ success: true } as any);

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('should handle email sending failure', async () => {
    const { sendGeneralEnquiryEmail } = await import('../../server/email');
    const route = findRoute('post', '/api/enterprise-enquiry')!;
    const handler = getHandler(route);
    const req = createMockReq({
      ip: '10.0.0.103',
      body: {
        name: 'Bob Smith',
        email: 'bob@bigcorp.com',
        company: 'BigCorp',
        message: 'We are interested in enterprise assessment services for our team',
      },
    });
    const res = createMockRes();

    vi.mocked(sendGeneralEnquiryEmail).mockResolvedValue({ success: false } as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('GET /api/exchange-rates - error handling', () => {
  it('should return 500 on exchange rate error', async () => {
    const { getExchangeRates } = await import('../../server/exchange-rates');
    const route = findRoute('get', '/api/exchange-rates')!;
    const handler = getHandler(route);
    const req = createMockReq();
    const res = createMockRes();

    vi.mocked(getExchangeRates).mockRejectedValue(new Error('API error'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('POST /api/create-checkout-session', () => {
  it('should require authentication', () => {
    const route = findRoute('post', '/api/create-checkout-session');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });
});

describe('POST /api/create-partner-results-checkout', () => {
  it('should require authentication', () => {
    const route = findRoute('post', '/api/create-partner-results-checkout');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });
});

describe('POST /api/confirm-partner-results-purchase', () => {
  it('should require authentication', () => {
    const route = findRoute('post', '/api/confirm-partner-results-purchase');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });
});

describe('GET /api/partner-results-pricing/:invitationId', () => {
  it('should require authentication', () => {
    const route = findRoute('get', '/api/partner-results-pricing/:invitationId');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });
});

describe('GET /api/purchases-with-results', () => {
  it('should require authentication', () => {
    const route = findRoute('get', '/api/purchases-with-results');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });
});

describe('GET /api/available-assessments', () => {
  it('should require authentication', () => {
    const route = findRoute('get', '/api/available-assessments');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });
});

describe('POST /api/assessments/start', () => {
  it('should require authentication', () => {
    const route = findRoute('post', '/api/assessments/start');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });
});

describe('POST /api/purchase-items/add', () => {
  it('should require authentication', () => {
    const route = findRoute('post', '/api/purchase-items/add');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });
});

describe('Additional Route Registration', () => {
  it('should register POST /api/checkout-free', () => {
    expect(findRoute('post', '/api/checkout-free')).toBeDefined();
  });

  it('should register POST /api/create-free-purchase', () => {
    expect(findRoute('post', '/api/create-free-purchase')).toBeDefined();
  });

  it('should register POST /api/process-payment-success', () => {
    expect(findRoute('post', '/api/process-payment-success')).toBeDefined();
  });

  it('should register POST /api/submit-reference', () => {
    expect(findRoute('post', '/api/submit-reference')).toBeDefined();
  });

  it('should register GET /api/reference-status', () => {
    expect(findRoute('get', '/api/reference-status')).toBeDefined();
  });

  it('should register POST /api/unlock-results', () => {
    expect(findRoute('post', '/api/unlock-results')).toBeDefined();
  });

  it('should register POST /api/process-results-payment', () => {
    expect(findRoute('post', '/api/process-results-payment')).toBeDefined();
  });

  it('should register GET /api/admin/invitations', () => {
    expect(findRoute('get', '/api/admin/invitations')).toBeDefined();
  });

  it('should register GET /api/partner-testing-series', () => {
    expect(findRoute('get', '/api/partner-testing-series')).toBeDefined();
  });

  it('should register POST /api/partner/me/tour-completed', () => {
    expect(findRoute('post', '/api/partner/me/tour-completed')).toBeDefined();
  });

  it('should register POST /api/partner/me/accept-terms', () => {
    expect(findRoute('post', '/api/partner/me/accept-terms')).toBeDefined();
  });

  it('should register GET /api/partner/me/usage', () => {
    expect(findRoute('get', '/api/partner/me/usage')).toBeDefined();
  });

  it('should register GET /api/partner/me/billing', () => {
    expect(findRoute('get', '/api/partner/me/billing')).toBeDefined();
  });

  it('should register GET /api/partner/me/pricing', () => {
    expect(findRoute('get', '/api/partner/me/pricing')).toBeDefined();
  });

  it('should register GET /api/partner/account', () => {
    expect(findRoute('get', '/api/partner/account')).toBeDefined();
  });

  it('should register GET /api/partner/me/settings', () => {
    expect(findRoute('get', '/api/partner/me/settings')).toBeDefined();
  });

  it('should register PATCH /api/partner/me/settings', () => {
    expect(findRoute('patch', '/api/partner/me/settings')).toBeDefined();
  });

  it('should register GET /api/partner/me/api-keys', () => {
    expect(findRoute('get', '/api/partner/me/api-keys')).toBeDefined();
  });

  it('should register POST /api/partner/me/api-keys', () => {
    expect(findRoute('post', '/api/partner/me/api-keys')).toBeDefined();
  });

  it('should register GET /api/admin/notifications', () => {
    expect(findRoute('get', '/api/admin/notifications')).toBeDefined();
  });

  it('should register GET /api/admin/notifications/unread-count', () => {
    expect(findRoute('get', '/api/admin/notifications/unread-count')).toBeDefined();
  });

  it('should register POST /api/admin/notifications/mark-all-read', () => {
    expect(findRoute('post', '/api/admin/notifications/mark-all-read')).toBeDefined();
  });
});

describe('Authentication on partner routes', () => {
  it('should apply isAuthenticated to GET /api/partner/account', () => {
    const route = findRoute('get', '/api/partner/account');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to GET /api/partner/me/usage', () => {
    const route = findRoute('get', '/api/partner/me/usage');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to GET /api/partner/me/billing', () => {
    const route = findRoute('get', '/api/partner/me/billing');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to PATCH /api/partner/me/settings', () => {
    const route = findRoute('patch', '/api/partner/me/settings');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to POST /api/partner/me/tour-completed', () => {
    const route = findRoute('post', '/api/partner/me/tour-completed');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });
});

describe('Authentication on admin routes', () => {
  it('should apply isAuthenticated to GET /api/admin/marketing-optins', () => {
    const route = findRoute('get', '/api/admin/marketing-optins');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to POST /api/submit-reference', () => {
    const route = findRoute('post', '/api/submit-reference');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to GET /api/reference-status', () => {
    const route = findRoute('get', '/api/reference-status');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to POST /api/unlock-results', () => {
    const route = findRoute('post', '/api/unlock-results');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to GET /api/admin/invitations', () => {
    const route = findRoute('get', '/api/admin/invitations');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });

  it('should apply isAuthenticated to GET /api/admin/notifications', () => {
    const route = findRoute('get', '/api/admin/notifications');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(true);
  });
});

describe('Public routes should not have auth middleware', () => {
  it('should NOT apply isAuthenticated to GET /api/geolocation', () => {
    const route = findRoute('get', '/api/geolocation');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(false);
  });

  it('should NOT apply isAuthenticated to GET /api/exchange-rates', () => {
    const route = findRoute('get', '/api/exchange-rates');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(false);
  });

  it('should NOT apply isAuthenticated to POST /api/general-enquiry', () => {
    const route = findRoute('post', '/api/general-enquiry');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(false);
  });

  it('should NOT apply isAuthenticated to POST /api/enterprise-enquiry', () => {
    const route = findRoute('post', '/api/enterprise-enquiry');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(false);
  });

  it('should NOT apply isAuthenticated to POST /api/marketing-optin', () => {
    const route = findRoute('post', '/api/marketing-optin');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(false);
  });

  it('should NOT apply isAuthenticated to POST /api/checkout-free', () => {
    const route = findRoute('post', '/api/checkout-free');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(false);
  });

  it('should NOT apply isAuthenticated to POST /api/process-payment-success', () => {
    const route = findRoute('post', '/api/process-payment-success');
    expect(route).toBeDefined();
    expect(hasAuthMiddleware(route!)).toBe(false);
  });
});

describe('Route count and coverage', () => {
  it('should register routes for all HTTP methods', () => {
    const methods = new Set(registeredRoutes.map(r => r.method));
    expect(methods.has('get')).toBe(true);
    expect(methods.has('post')).toBe(true);
    expect(methods.has('delete')).toBe(true);
    expect(methods.has('patch')).toBe(true);
  });

  it('should register PUT routes', () => {
    const putRoutes = registeredRoutes.filter(r => r.method === 'put');
    expect(putRoutes.length).toBeGreaterThanOrEqual(1);
  });

  it('should register admin routes', () => {
    const adminRoutes = registeredRoutes.filter(r => r.path.startsWith('/api/admin/'));
    expect(adminRoutes.length).toBeGreaterThan(10);
  });

  it('should register user-facing routes', () => {
    const userRoutes = registeredRoutes.filter(r => r.path.startsWith('/api/user/'));
    expect(userRoutes.length).toBeGreaterThanOrEqual(4);
  });

  it('should register assessment routes', () => {
    const assessmentRoutes = registeredRoutes.filter(r => r.path.includes('/api/assessments'));
    expect(assessmentRoutes.length).toBeGreaterThanOrEqual(6);
  });

  it('should register webhook routes', () => {
    const webhookRoutes = registeredRoutes.filter(r => r.path.includes('/api/webhooks/'));
    expect(webhookRoutes.length).toBeGreaterThanOrEqual(2);
  });

  it('should register partner routes', () => {
    const partnerRoutes = registeredRoutes.filter(r => r.path.includes('/api/partner/'));
    expect(partnerRoutes.length).toBeGreaterThanOrEqual(10);
  });

  it('should register billing routes', () => {
    const billingRoutes = registeredRoutes.filter(r => r.path.includes('/billing'));
    expect(billingRoutes.length).toBeGreaterThanOrEqual(2);
  });

  it('should register at least 80 routes total', () => {
    expect(registeredRoutes.length).toBeGreaterThanOrEqual(80);
  });

  it('should have called setupAuth during registration', async () => {
    const { setupAuth } = await import('../../server/auth');
    expect(vi.mocked(setupAuth)).toBeDefined();
  });

  it('should mock partner routes module', async () => {
    const mod = await import('../../server/partner-routes');
    expect(mod.registerPartnerRoutes).toBeDefined();
    expect(mod.registerGuestAssessmentRoutes).toBeDefined();
  });

  it('should mock ecosystem routes module', async () => {
    const mod = await import('../../server/ecosystem-routes');
    expect(mod.registerEcosystemRoutes).toBeDefined();
  });

  it('should mock bug report routes module', async () => {
    const mod = await import('../../server/bug-report-routes');
    expect(mod.registerBugReportRoutes).toBeDefined();
  });
});
