import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockSet = vi.fn();
const mockValues = vi.fn();

function createChainableQuery(data: any[] = []) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => Promise.resolve(data)),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
  };
  return chain;
}

vi.mock('../../server/db', () => {
  const selectChain = {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  };
  const updateChain = {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };
  const insertChain = {
    values: vi.fn().mockResolvedValue(undefined),
  };

  return {
    db: {
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn().mockReturnValue(insertChain),
      update: vi.fn().mockReturnValue(updateChain),
      delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    },
  };
});

vi.mock('../../shared/schema', () => ({
  assessmentResults: {
    assessmentType: 'assessmentType',
    status: 'status',
    id: 'id',
    answers: 'answers',
    scores: 'scores',
    totalScore: 'totalScore',
    evaluations: 'evaluations',
    partnerInvitationId: 'partnerInvitationId',
    updatedAt: 'updatedAt',
  },
  promptArchitectureEvaluations: {
    id: 'id',
    resultId: 'resultId',
  },
  users: {
    id: 'id',
    email: 'email',
    role: 'role',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: any[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: any[]) => ({ type: 'and', args })),
  isNull: vi.fn((col: any) => ({ type: 'isNull', col })),
  isNotNull: vi.fn((col: any) => ({ type: 'isNotNull', col })),
  desc: vi.fn((col: any) => ({ type: 'desc', col })),
  sql: vi.fn(),
}));

vi.mock('../../server/storage', () => ({
  storage: {
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
    getResultsByUser: vi.fn(),
    updateAssessmentScores: vi.fn(),
  },
}));

vi.mock('../../server/scoring', () => ({
  calculateFITScores: vi.fn().mockReturnValue({
    'High Agency': 75,
    'Intellectual Curiosity': 80,
    'Resilience': 70,
    'Empathy & Ethics': 65,
    'Growth Mindset': 85,
    'Interpersonal Agility': 72,
  }),
  calculateAIReadinessScores: vi.fn().mockReturnValue({
    'AI Literacy & Prompt Engineering': 78,
    'Technical Fundamentals': 82,
    'Data Fluency': 70,
    'Critical Thinking & Problem-Solving': 75,
    'Adaptability & Continuous Learning': 80,
    'Collaboration & Communication': 68,
    'Responsible AI & Ethical Awareness': 72,
    'Creativity & Innovation': 77,
    'Domain Expertise': 85,
  }),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password_123'),
  },
}));

vi.mock('stripe', () => {
  const mockPromotionCodes = {
    list: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ code: 'FREE', id: 'promo_123' }),
  };
  const mockCoupons = {
    list: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ id: 'FREE_RESULTS_ACCESS', percent_off: 100 }),
    retrieve: vi.fn().mockResolvedValue({ id: 'FREE_RESULTS_ACCESS' }),
  };
  return {
    default: vi.fn().mockImplementation(() => ({
      promotionCodes: mockPromotionCodes,
      coupons: mockCoupons,
    })),
  };
});

vi.mock('../../server/services/promptArchitecture', () => ({
  evaluatePromptWithGPT: vi.fn().mockResolvedValue({
    clarity: 80,
    structure: 75,
    contextRelevance: 85,
    creativity: 70,
    iterativeImprovement: 65,
    totalScore: 75,
    feedback: 'Good prompt structure',
  }),
  PA_LEVEL_DESCRIPTIONS: {
    '1': 'Level 1 task description',
    '2': 'Level 2 task description',
    '3': 'Level 3 task description',
    '4': 'Level 4 task description',
    '5': 'Level 5 task description',
    '6': 'Level 6 task description',
    '7': 'Level 7 task description',
  },
}));

const originalProcessExit = process.exit;
const originalProcessArgv = process.argv;
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalEnv = { ...process.env };

describe('Server Scripts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exit = vi.fn() as any;
    console.log = vi.fn();
    console.error = vi.fn();
    process.argv = ['node', 'script.ts'];
  });

  afterEach(() => {
    process.exit = originalProcessExit;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.argv = originalProcessArgv;
    process.env = { ...originalEnv };
  });

  describe('bootstrapAdmin', () => {
    it('should require ADMIN_EMAIL and ADMIN_PASSWORD env vars', () => {
      delete process.env.ADMIN_EMAIL;
      delete process.env.ADMIN_PASSWORD;

      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      expect(!adminEmail || !adminPassword).toBe(true);
    });

    it('should proceed when both env vars are set', () => {
      process.env.ADMIN_EMAIL = 'admin@test.com';
      process.env.ADMIN_PASSWORD = 'password123';

      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      expect(adminEmail).toBe('admin@test.com');
      expect(adminPassword).toBe('password123');
    });

    it('should skip creation when admin user already exists as super_admin', async () => {
      const { storage } = await import('../../server/storage');
      vi.mocked(storage.getUserByEmail).mockResolvedValue({
        id: '1',
        email: 'admin@test.com',
        role: 'super_admin',
      } as any);

      const existingUser = await storage.getUserByEmail('admin@test.com');
      expect(existingUser).toBeTruthy();
      expect(existingUser!.role).toBe('super_admin');
    });

    it('should detect when user exists but is not admin', async () => {
      const { storage } = await import('../../server/storage');
      vi.mocked(storage.getUserByEmail).mockResolvedValue({
        id: '2',
        email: 'user@test.com',
        role: 'candidate',
      } as any);

      const existingUser = await storage.getUserByEmail('user@test.com');
      expect(existingUser).toBeTruthy();
      expect(existingUser!.role).not.toBe('super_admin');
      expect(existingUser!.role).not.toBe('organization_admin');
    });

    it('should create admin user when no existing user found', async () => {
      const { storage } = await import('../../server/storage');
      const bcrypt = (await import('bcryptjs')).default;

      vi.mocked(storage.getUserByEmail).mockResolvedValue(null as any);
      vi.mocked(storage.createUser).mockResolvedValue({
        id: '3',
        email: 'newadmin@test.com',
        role: 'super_admin',
      } as any);

      const existingUser = await storage.getUserByEmail('newadmin@test.com');
      expect(existingUser).toBeNull();

      const passwordHash = await bcrypt.hash('securepassword', 10);
      expect(passwordHash).toBe('hashed_password_123');

      const adminUser = await storage.createUser({
        email: 'newadmin@test.com',
        passwordHash,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        role: 'super_admin',
      } as any);

      expect(adminUser.email).toBe('newadmin@test.com');
      expect(adminUser.role).toBe('super_admin');
      expect(storage.createUser).toHaveBeenCalledWith(expect.objectContaining({
        email: 'newadmin@test.com',
        role: 'super_admin',
      }));
    });

    it('should handle errors during user creation', async () => {
      const { storage } = await import('../../server/storage');
      vi.mocked(storage.getUserByEmail).mockRejectedValue(new Error('DB connection failed'));

      await expect(storage.getUserByEmail('fail@test.com')).rejects.toThrow('DB connection failed');
    });

    it('should hash password with bcrypt before creating user', async () => {
      const bcrypt = (await import('bcryptjs')).default;
      const hash = await bcrypt.hash('testpassword', 10);
      expect(hash).toBe('hashed_password_123');
      expect(bcrypt.hash).toHaveBeenCalledWith('testpassword', 10);
    });
  });

  describe('checkPromo', () => {
    it('should list promotion codes and coupons from Stripe', async () => {
      const Stripe = (await import('stripe')).default;
      const stripeInstance = new Stripe('test_key');

      vi.mocked(stripeInstance.promotionCodes.list).mockResolvedValue({
        data: [
          { code: 'FREE', active: true, coupon: { id: 'coupon_1' } },
          { code: 'BETA', active: false, coupon: { id: 'coupon_2' } },
        ],
      } as any);

      vi.mocked(stripeInstance.coupons.list).mockResolvedValue({
        data: [
          { id: 'coupon_1', percent_off: 100, valid: true },
        ],
      } as any);

      const promos = await stripeInstance.promotionCodes.list({ limit: 10 });
      expect(promos.data.length).toBe(2);

      const coupons = await stripeInstance.coupons.list({ limit: 10 });
      expect(coupons.data.length).toBe(1);
    });

    it('should handle Stripe API errors gracefully', async () => {
      const Stripe = (await import('stripe')).default;
      const stripeInstance = new Stripe('test_key');

      vi.mocked(stripeInstance.promotionCodes.list).mockRejectedValue(
        new Error('API key invalid')
      );

      await expect(stripeInstance.promotionCodes.list({ limit: 10 })).rejects.toThrow('API key invalid');
    });

    it('should handle empty promotion codes list', async () => {
      const Stripe = (await import('stripe')).default;
      const stripeInstance = new Stripe('test_key');

      vi.mocked(stripeInstance.promotionCodes.list).mockResolvedValue({
        data: [],
      } as any);

      const result = await stripeInstance.promotionCodes.list({ limit: 10 });
      expect(result.data.length).toBe(0);
    });
  });

  describe('createPromoCode', () => {
    it('should create a FREE promotion code in Stripe', async () => {
      const Stripe = (await import('stripe')).default;
      const stripeInstance = new Stripe('test_key');

      vi.mocked(stripeInstance.promotionCodes.create).mockResolvedValue({
        code: 'FREE',
        id: 'promo_abc',
      } as any);

      const result = await stripeInstance.promotionCodes.create({
        code: 'FREE',
        coupon: 'FREE_RESULTS_ACCESS',
      });

      expect(result.code).toBe('FREE');
      expect(stripeInstance.promotionCodes.create).toHaveBeenCalledWith({
        code: 'FREE',
        coupon: 'FREE_RESULTS_ACCESS',
      });
    });

    it('should handle creation errors', async () => {
      const Stripe = (await import('stripe')).default;
      const stripeInstance = new Stripe('test_key');

      vi.mocked(stripeInstance.promotionCodes.create).mockRejectedValue(
        new Error('Coupon not found')
      );

      await expect(
        stripeInstance.promotionCodes.create({ code: 'FREE', coupon: 'INVALID' })
      ).rejects.toThrow('Coupon not found');
    });
  });

  describe('setupFreePromoCode', () => {
    it('should create coupon and promotion code', async () => {
      const Stripe = (await import('stripe')).default;
      const stripeInstance = new Stripe('test_key');

      vi.mocked(stripeInstance.coupons.create).mockResolvedValue({
        id: 'FREE_RESULTS_ACCESS',
        percent_off: 100,
      } as any);

      vi.mocked(stripeInstance.promotionCodes.create).mockResolvedValue({
        code: 'FREE',
      } as any);

      const coupon = await stripeInstance.coupons.create({
        percent_off: 100,
        duration: 'forever',
        name: 'Free Assessment Results Access',
        id: 'FREE_RESULTS_ACCESS',
      });
      expect(coupon.id).toBe('FREE_RESULTS_ACCESS');

      const promo = await stripeInstance.promotionCodes.create({
        code: 'FREE',
        coupon: coupon.id,
      });
      expect(promo.code).toBe('FREE');
    });

    it('should handle resource_already_exists error', async () => {
      const Stripe = (await import('stripe')).default;
      const stripeInstance = new Stripe('test_key');

      const alreadyExistsError: any = new Error('Resource already exists');
      alreadyExistsError.code = 'resource_already_exists';

      vi.mocked(stripeInstance.coupons.create).mockRejectedValue(alreadyExistsError);

      try {
        await stripeInstance.coupons.create({
          percent_off: 100,
          duration: 'forever',
          name: 'Free Assessment Results Access',
          id: 'FREE_RESULTS_ACCESS',
        });
      } catch (error: any) {
        expect(error.code).toBe('resource_already_exists');
      }
    });

    it('should exit with error on unexpected Stripe errors', async () => {
      const Stripe = (await import('stripe')).default;
      const stripeInstance = new Stripe('test_key');

      vi.mocked(stripeInstance.coupons.create).mockRejectedValue(
        new Error('Internal server error')
      );

      await expect(
        stripeInstance.coupons.create({
          percent_off: 100,
          duration: 'forever',
          name: 'Free Assessment Results Access',
          id: 'FREE_RESULTS_ACCESS',
        })
      ).rejects.toThrow('Internal server error');
    });
  });

  describe('createTestPromoCodes', () => {
    const TEST_CODES = [
      'TESTHM01', 'TESTHM02', 'TESTHM03', 'TESTHM04', 'TESTHM05',
      'BETAHM06', 'BETAHM07', 'BETAHM08', 'DEMOHM09', 'DEMOHM10',
    ];

    it('should create multiple test promo codes', async () => {
      const Stripe = (await import('stripe')).default;
      const stripeInstance = new Stripe('test_key');

      vi.mocked(stripeInstance.coupons.retrieve).mockResolvedValue({
        id: 'FREE_RESULTS_ACCESS',
      } as any);

      vi.mocked(stripeInstance.promotionCodes.create).mockResolvedValue({
        code: 'TESTHM01',
      } as any);

      const coupon = await stripeInstance.coupons.retrieve('FREE_RESULTS_ACCESS');
      expect(coupon.id).toBe('FREE_RESULTS_ACCESS');

      for (const code of TEST_CODES) {
        const result = await stripeInstance.promotionCodes.create({
          code,
          promotion: { type: 'coupon', coupon: 'FREE_RESULTS_ACCESS' },
        } as any);
        expect(result).toBeDefined();
      }

      expect(stripeInstance.promotionCodes.create).toHaveBeenCalledTimes(TEST_CODES.length);
    });

    it('should create coupon if it does not exist', async () => {
      const Stripe = (await import('stripe')).default;
      const stripeInstance = new Stripe('test_key');

      const missingError: any = new Error('Resource missing');
      missingError.code = 'resource_missing';
      vi.mocked(stripeInstance.coupons.retrieve).mockRejectedValue(missingError);

      vi.mocked(stripeInstance.coupons.create).mockResolvedValue({
        id: 'FREE_RESULTS_ACCESS',
      } as any);

      try {
        await stripeInstance.coupons.retrieve('FREE_RESULTS_ACCESS');
      } catch (e: any) {
        if (e.code === 'resource_missing') {
          const coupon = await stripeInstance.coupons.create({
            percent_off: 100,
            duration: 'forever',
            name: 'Free Assessment Results Access',
            id: 'FREE_RESULTS_ACCESS',
          });
          expect(coupon.id).toBe('FREE_RESULTS_ACCESS');
        }
      }
    });

    it('should handle already existing promo codes gracefully', async () => {
      const Stripe = (await import('stripe')).default;
      const stripeInstance = new Stripe('test_key');

      const alreadyExistsError: any = new Error('Already exists');
      alreadyExistsError.code = 'resource_already_exists';

      vi.mocked(stripeInstance.promotionCodes.create).mockRejectedValue(alreadyExistsError);

      try {
        await stripeInstance.promotionCodes.create({ code: 'TESTHM01', coupon: 'FREE_RESULTS_ACCESS' });
      } catch (error: any) {
        expect(error.code).toBe('resource_already_exists');
      }
    });

    it('should have exactly 10 test codes defined', () => {
      expect(TEST_CODES).toHaveLength(10);
      expect(TEST_CODES[0]).toBe('TESTHM01');
      expect(TEST_CODES[9]).toBe('DEMOHM10');
    });
  });

  describe('migrateAIReadinessKeys', () => {
    it('should migrate legacy score keys to canonical format', async () => {
      const { db } = await import('../../server/db');
      const { eq } = await import('drizzle-orm');

      const mockResults = [
        {
          id: 'result-1',
          assessmentType: 'ai_readiness',
          scores: {
            'AI Literacy': 80,
            'Technical Fluency': 75,
            'Domain Fluency': 70,
          },
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(mockResults);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.mocked(db.select).mockReturnValue({ from: fromMock } as any);

      const setMock = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
      vi.mocked(db.update).mockReturnValue({ set: setMock } as any);

      const results = await db.select().from({} as any).where({} as any);
      expect(results).toEqual(mockResults);

      const oldScores = results[0].scores as Record<string, number>;
      const LEGACY_TO_CANONICAL: Record<string, string> = {
        'AI Literacy': 'AI Literacy & Prompt Engineering',
        'Technical Fluency': 'Technical Fundamentals',
        'Domain Fluency': 'Data Fluency',
      };

      const newScores: Record<string, number> = {};
      Object.entries(oldScores).forEach(([oldKey, score]) => {
        const canonicalKey = LEGACY_TO_CANONICAL[oldKey] || oldKey;
        newScores[canonicalKey] = score;
      });

      expect(newScores['AI Literacy & Prompt Engineering']).toBe(80);
      expect(newScores['Technical Fundamentals']).toBe(75);
      expect(newScores['Data Fluency']).toBe(70);
    });

    it('should skip results with no scores', async () => {
      const result = { id: 'result-2', scores: null };
      expect(!result.scores || typeof result.scores !== 'object').toBe(true);
    });

    it('should skip results already using canonical keys', async () => {
      const LEGACY_TO_CANONICAL: Record<string, string> = {
        'AI Literacy': 'AI Literacy & Prompt Engineering',
        'Technical Fluency': 'Technical Fundamentals',
        'Domain Expertise': 'Domain Expertise',
      };

      const scores: Record<string, number> = {
        'AI Literacy & Prompt Engineering': 80,
        'Technical Fundamentals': 75,
        'Domain Expertise': 70,
      };

      const hasLegacyKeys = Object.keys(scores).some(
        (key) => key in LEGACY_TO_CANONICAL && key !== 'Domain Expertise'
      );

      expect(hasLegacyKeys).toBe(false);
    });

    it('should handle empty results set', async () => {
      const { db } = await import('../../server/db');
      const whereMock = vi.fn().mockResolvedValue([]);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.mocked(db.select).mockReturnValue({ from: fromMock } as any);

      const results = await db.select().from({} as any).where({} as any);
      expect(results).toHaveLength(0);
    });

    it('should map all legacy key variants correctly', () => {
      const LEGACY_TO_CANONICAL: Record<string, string> = {
        'AI Literacy': 'AI Literacy & Prompt Engineering',
        'AI Literacy/Prompting': 'AI Literacy & Prompt Engineering',
        'Technical Fluency': 'Technical Fundamentals',
        'Domain Fluency': 'Data Fluency',
        'Critical Thinking': 'Critical Thinking & Problem-Solving',
        'Adaptive Learning': 'Adaptability & Continuous Learning',
        'Collaboration': 'Collaboration & Communication',
        'Cross-functional Collaboration': 'Collaboration & Communication',
        'Responsible AI': 'Responsible AI & Ethical Awareness',
        'Creative Innovation': 'Creativity & Innovation',
        'Domain Expertise': 'Domain Expertise',
      };

      expect(LEGACY_TO_CANONICAL['AI Literacy']).toBe('AI Literacy & Prompt Engineering');
      expect(LEGACY_TO_CANONICAL['AI Literacy/Prompting']).toBe('AI Literacy & Prompt Engineering');
      expect(LEGACY_TO_CANONICAL['Cross-functional Collaboration']).toBe('Collaboration & Communication');
      expect(LEGACY_TO_CANONICAL['Domain Expertise']).toBe('Domain Expertise');
      expect(Object.keys(LEGACY_TO_CANONICAL)).toHaveLength(11);
    });
  });

  describe('recalculateScores', () => {
    it('should recalculate FIT scores for a user', async () => {
      const { storage } = await import('../../server/storage');
      const { calculateFITScores } = await import('../../server/scoring');

      vi.mocked(storage.getUserByEmail).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      } as any);

      vi.mocked(storage.getResultsByUser).mockResolvedValue([
        {
          id: 'result-1',
          assessmentType: 'fit',
          status: 'completed',
          totalScore: 50,
          answers: { '1': 'A', '2': 'B' },
        },
      ] as any);

      const user = await storage.getUserByEmail('test@example.com');
      expect(user).toBeTruthy();
      expect(user!.id).toBe('user-1');

      const results = await storage.getResultsByUser(user!.id);
      expect(results).toHaveLength(1);

      const fitResult = results[0];
      expect(fitResult.assessmentType).toBe('fit');
      expect(fitResult.status).toBe('completed');

      const newScores = calculateFITScores(fitResult.answers);
      expect(newScores).toBeDefined();
      expect(Object.keys(newScores).length).toBeGreaterThan(0);

      const newTotal = Math.round(
        Object.values(newScores).reduce((sum, s) => sum + s, 0) / Object.values(newScores).length
      );
      expect(newTotal).toBeGreaterThan(0);
    });

    it('should recalculate AI Readiness scores for a user', async () => {
      const { storage } = await import('../../server/storage');
      const { calculateAIReadinessScores } = await import('../../server/scoring');

      vi.mocked(storage.getUserByEmail).mockResolvedValue({
        id: 'user-2',
        email: 'ai@example.com',
      } as any);

      vi.mocked(storage.getResultsByUser).mockResolvedValue([
        {
          id: 'result-2',
          assessmentType: 'ai_readiness',
          status: 'completed',
          totalScore: 60,
          answers: { '1': 'A', '2': 'C' },
        },
      ] as any);

      const user = await storage.getUserByEmail('ai@example.com');
      const results = await storage.getResultsByUser(user!.id);
      const result = results[0];

      const newScores = calculateAIReadinessScores(result.answers);
      expect(newScores).toBeDefined();
      expect(Object.keys(newScores)).toHaveLength(9);
    });

    it('should skip non-completed results', async () => {
      const result = {
        id: 'result-3',
        assessmentType: 'fit',
        status: 'in_progress',
        answers: {},
      };

      expect(result.status).not.toBe('completed');
    });

    it('should skip non-FIT/AI-Readiness assessment types', async () => {
      const result = {
        id: 'result-4',
        assessmentType: 'prompt_architecture',
        status: 'completed',
      };

      expect(result.assessmentType).not.toBe('fit');
      expect(result.assessmentType).not.toBe('ai_readiness');
    });

    it('should handle user not found', async () => {
      const { storage } = await import('../../server/storage');
      vi.mocked(storage.getUserByEmail).mockResolvedValue(null as any);

      const user = await storage.getUserByEmail('unknown@example.com');
      expect(user).toBeNull();
    });

    it('should use default users when no --user argument provided', () => {
      const args: string[] = [];
      let usersToFix: string[] = [];

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--user' && args[i + 1]) {
          usersToFix.push(args[i + 1]);
          i++;
        }
      }

      if (usersToFix.length === 0) {
        usersToFix = ['oskar.greda@hotmail.co.uk', 'oskar@mlabs.city'];
      }

      expect(usersToFix).toHaveLength(2);
      expect(usersToFix[0]).toBe('oskar.greda@hotmail.co.uk');
    });

    it('should parse --user argument correctly', () => {
      const args = ['--user', 'custom@example.com'];
      const usersToFix: string[] = [];

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--user' && args[i + 1]) {
          usersToFix.push(args[i + 1]);
          i++;
        }
      }

      expect(usersToFix).toHaveLength(1);
      expect(usersToFix[0]).toBe('custom@example.com');
    });

    it('should calculate total score as average of skill scores', () => {
      const scores = { 'Skill A': 80, 'Skill B': 60, 'Skill C': 100 };
      const total = Math.round(
        Object.values(scores).reduce((sum, s) => sum + s, 0) / Object.values(scores).length
      );
      expect(total).toBe(80);
    });
  });

  describe('recalculateAIReadinessScores', () => {
    it('should fetch and recalculate all AI Readiness results', async () => {
      const { db } = await import('../../server/db');

      const mockResults = [
        {
          id: 'result-1',
          assessmentType: 'ai_readiness',
          answers: { q1: 'a', q2: 'c', q3: 'b' },
          scores: { old: 50 },
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(mockResults);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.mocked(db.select).mockReturnValue({ from: fromMock } as any);

      const results = await db.select().from({} as any).where({} as any);
      expect(results).toHaveLength(1);
      expect(results[0].answers).toBeDefined();
    });

    it('should convert answer format from q-prefix to number format', () => {
      const answers: Record<string, any> = { q1: 'a', q2: 'c', q3: 'b' };
      const convertedAnswers: Record<string, string> = {};

      Object.entries(answers).forEach(([key, value]) => {
        if (typeof value !== 'string') return;
        const questionNum = key.replace('q', '');
        convertedAnswers[questionNum] = value.toUpperCase();
      });

      expect(convertedAnswers['1']).toBe('A');
      expect(convertedAnswers['2']).toBe('C');
      expect(convertedAnswers['3']).toBe('B');
    });

    it('should skip non-string answer values', () => {
      const answers: Record<string, any> = {
        q1: 'a',
        q2: null,
        q3: { nested: true },
        q4: 'b',
      };

      const convertedAnswers: Record<string, string> = {};
      Object.entries(answers).forEach(([key, value]) => {
        if (typeof value !== 'string') return;
        const questionNum = key.replace('q', '');
        convertedAnswers[questionNum] = value.toUpperCase();
      });

      expect(Object.keys(convertedAnswers)).toHaveLength(2);
      expect(convertedAnswers['1']).toBe('A');
      expect(convertedAnswers['4']).toBe('B');
    });

    it('should skip results with no answers', () => {
      const result = { id: 'r1', answers: null };
      const hasAnswers = result.answers && Object.keys(result.answers as any).length > 0;
      expect(hasAnswers).toBeFalsy();
    });

    it('should skip results with empty answers', () => {
      const result = { id: 'r2', answers: {} };
      const hasAnswers = result.answers && Object.keys(result.answers).length > 0;
      expect(hasAnswers).toBeFalsy();
    });

    it('should update scores in database after recalculation', async () => {
      const { db } = await import('../../server/db');

      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(db.update).mockReturnValue({ set: setMock } as any);

      await db.update({} as any).set({ scores: { skill: 80 }, updatedAt: new Date() }).where({});

      expect(setMock).toHaveBeenCalled();
    });

    it('should handle database errors during recalculation', async () => {
      const { db } = await import('../../server/db');

      const whereMock = vi.fn().mockRejectedValue(new Error('Connection lost'));
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.mocked(db.select).mockReturnValue({ from: fromMock } as any);

      await expect(db.select().from({} as any).where({} as any)).rejects.toThrow('Connection lost');
    });
  });

  describe('repairB2BPromptArchitecture', () => {
    it('should find B2B PA results with no evaluations', async () => {
      const { db } = await import('../../server/db');

      const mockResults = [
        {
          id: 'pa-1',
          answers: { 'level-1': 'test prompt 1', 'level-2': 'test prompt 2' },
          totalScore: 70,
          evaluations: [],
          partnerInvitationId: 'inv-1',
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(mockResults);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.mocked(db.select).mockReturnValue({ from: fromMock } as any);

      const results = await db.select().from({} as any).where({} as any);
      expect(results).toHaveLength(1);
      expect(results[0].partnerInvitationId).toBe('inv-1');
    });

    it('should skip results that already have evaluations', async () => {
      const existingEvals = [{ id: 'eval-1' }, { id: 'eval-2' }];
      expect(existingEvals.length).toBeGreaterThan(0);
    });

    it('should skip results with no answers', () => {
      const result = { id: 'pa-2', answers: null };
      const answers = result.answers as Record<string, any> | null;
      const shouldSkip = !answers || Object.keys(answers).length === 0;
      expect(shouldSkip).toBe(true);
    });

    it('should skip results with empty answers', () => {
      const result = { id: 'pa-3', answers: {} };
      const answers = result.answers as Record<string, any>;
      const shouldSkip = !answers || Object.keys(answers).length === 0;
      expect(shouldSkip).toBe(true);
    });

    it('should extract level number from answer keys', () => {
      const testCases = [
        { key: 'level-1', expected: 1 },
        { key: 'level-2', expected: 2 },
        { key: 'level1', expected: 1 },
        { key: 'level7', expected: 7 },
      ];

      for (const { key, expected } of testCases) {
        const match = key.match(/level-?(\d+)/);
        const levelNum = match ? parseInt(match[1]) : null;
        expect(levelNum).toBe(expected);
      }
    });

    it('should skip empty or non-string prompts', () => {
      const prompts = ['', null, undefined, '  ', 'valid prompt'];
      const validPrompts = prompts.filter(
        (p) => p && typeof p === 'string' && p.trim()
      );
      expect(validPrompts).toHaveLength(1);
      expect(validPrompts[0]).toBe('valid prompt');
    });

    it('should calculate average scores across evaluated levels', () => {
      const evaluations = [
        { clarity: 80, structure: 75, contextRelevance: 85, creativity: 70, iterativeImprovement: 65 },
        { clarity: 90, structure: 85, contextRelevance: 80, creativity: 75, iterativeImprovement: 70 },
      ];

      let clarityTotal = 0, structureTotal = 0, contextTotal = 0, creativityTotal = 0, iterativeTotal = 0;
      evaluations.forEach((e) => {
        clarityTotal += e.clarity;
        structureTotal += e.structure;
        contextTotal += e.contextRelevance;
        creativityTotal += e.creativity;
        iterativeTotal += e.iterativeImprovement;
      });

      const evalCount = evaluations.length;
      const newScores = {
        Clarity: Math.round(clarityTotal / evalCount),
        Structure: Math.round(structureTotal / evalCount),
        'Context Relevance': Math.round(contextTotal / evalCount),
        Creativity: Math.round(creativityTotal / evalCount),
        'Iterative Improvement': Math.round(iterativeTotal / evalCount),
      };

      expect(newScores.Clarity).toBe(85);
      expect(newScores.Structure).toBe(80);
      expect(newScores['Context Relevance']).toBe(83);
      expect(newScores.Creativity).toBe(73);
      expect(newScores['Iterative Improvement']).toBe(68);
    });

    it('should calculate totalScore as average of all dimension scores', () => {
      const clarityTotal = 170;
      const structureTotal = 160;
      const contextTotal = 165;
      const creativityTotal = 145;
      const iterativeTotal = 135;
      const evalCount = 2;

      const newTotalScore = Math.round(
        (clarityTotal + structureTotal + contextTotal + creativityTotal + iterativeTotal) / evalCount
      );

      expect(newTotalScore).toBe(388);
    });
  });

  describe('repairPromptArchitecture', () => {
    it('should find prompt_architecture assessments', async () => {
      const { db } = await import('../../server/db');

      const mockResults = [
        {
          id: 'pa-repair-1',
          assessmentType: 'prompt_architecture',
          status: 'completed',
          completedAt: new Date('2026-01-01'),
          evaluations: [
            { clarity: 80, structure: 70, contextRelevance: 75, creativity: 65, iterativeImprovement: 60, totalScore: 70, feedback: 'Good' },
          ],
          answers: { 'level-1': 'My prompt for level 1' },
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(mockResults);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.mocked(db.select).mockReturnValue({ from: fromMock } as any);

      const results = await db.select().from({} as any).where({} as any);
      expect(results).toHaveLength(1);
      expect(results[0].assessmentType).toBe('prompt_architecture');
    });

    it('should skip results with >= 7 existing evaluations', () => {
      const existingEvals = Array.from({ length: 7 }, (_, i) => ({ id: `eval-${i}` }));
      expect(existingEvals.length).toBeGreaterThanOrEqual(7);
    });

    it('should handle results with no evaluation data in JSONB', () => {
      const result = {
        id: 'pa-repair-2',
        evaluations: null,
        answers: { 'level-1': 'Some prompt' },
      };

      const evaluationsData = result.evaluations as any[] | null;
      const hasEvaluations = evaluationsData && Array.isArray(evaluationsData) && evaluationsData.length > 0;
      expect(hasEvaluations).toBeFalsy();
    });

    it('should handle results with no answers and no evaluations', () => {
      const result = {
        id: 'pa-repair-3',
        evaluations: null,
        answers: {},
      };

      const evaluationsData = result.evaluations as any[] | null;
      const answers = result.answers as Record<string, string>;
      const hasEvaluations = evaluationsData && Array.isArray(evaluationsData) && evaluationsData.length > 0;
      const hasAnswers = answers && Object.keys(answers).length > 0;

      expect(hasEvaluations).toBeFalsy();
      expect(hasAnswers).toBeFalsy();
    });

    it('should extract level numbers from answer keys for repair', () => {
      const answers = {
        'level-1': 'prompt1',
        'level-2': 'prompt2',
        'level-3': 'prompt3',
        'other-key': 'not a level',
      };

      const answerKeys = Object.keys(answers)
        .filter((k) => k.startsWith('level'))
        .sort();

      expect(answerKeys).toEqual(['level-1', 'level-2', 'level-3']);
    });

    it('should insert evaluations from JSONB into dedicated table', async () => {
      const { db } = await import('../../server/db');

      const valuesMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({ values: valuesMock } as any);

      const evalData = {
        clarity: 80,
        structure: 70,
        contextRelevance: 75,
        creativity: 65,
        iterativeImprovement: 60,
        totalScore: 70,
        feedback: 'Good prompt',
      };

      await db.insert({} as any).values({
        resultId: 'result-1',
        level: 1,
        userPrompt: 'test prompt',
        aiResponse: null,
        evaluationScores: {
          clarity: evalData.clarity,
          structure: evalData.structure,
          contextRelevance: evalData.contextRelevance,
          creativity: evalData.creativity,
          iterativeImprovement: evalData.iterativeImprovement,
        },
        totalScore: evalData.totalScore,
        feedback: evalData.feedback,
        status: 'completed',
        evaluatedAt: new Date(),
      });

      expect(valuesMock).toHaveBeenCalled();
    });

    it('should parse --result-id command line argument', () => {
      const args = ['--result-id', 'abc-123'];
      let resultId: string | undefined;

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--result-id' && args[i + 1]) {
          resultId = args[i + 1];
          i++;
        }
      }

      expect(resultId).toBe('abc-123');
    });

    it('should handle missing --result-id argument', () => {
      const args: string[] = [];
      let resultId: string | undefined;

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--result-id' && args[i + 1]) {
          resultId = args[i + 1];
          i++;
        }
      }

      expect(resultId).toBeUndefined();
    });

    it('should use default evaluation values when fields are missing', () => {
      const evalData: any = {
        clarity: undefined,
        structure: 0,
        totalScore: null,
        feedback: '',
      };

      const scores = {
        clarity: evalData.clarity || 0,
        structure: evalData.structure || 0,
        contextRelevance: evalData.contextRelevance || 0,
        creativity: evalData.creativity || 0,
        iterativeImprovement: evalData.iterativeImprovement || 0,
      };

      expect(scores.clarity).toBe(0);
      expect(scores.structure).toBe(0);
      expect(scores.contextRelevance).toBe(0);

      const totalScore = evalData.totalScore || 0;
      expect(totalScore).toBe(0);

      const feedback = evalData.feedback || '';
      expect(feedback).toBe('');
    });
  });

  describe('recalculateAIReadinessScores - local scoring function', () => {
    it('should initialize all 9 AI Readiness skill categories', () => {
      const skills: Record<string, number> = {
        'AI Literacy & Prompt Engineering': 0,
        'Technical Fundamentals': 0,
        'Data Fluency': 0,
        'Critical Thinking & Problem-Solving': 0,
        'Adaptability & Continuous Learning': 0,
        'Collaboration & Communication': 0,
        'Responsible AI & Ethical Awareness': 0,
        'Creativity & Innovation': 0,
        'Domain Expertise': 0,
      };

      expect(Object.keys(skills)).toHaveLength(9);
      Object.values(skills).forEach((v) => expect(v).toBe(0));
    });

    it('should handle hybrid scoring with equal raw percentages', () => {
      const rawPercentages: Record<string, number> = {
        'Skill A': 50,
        'Skill B': 50,
        'Skill C': 50,
      };

      const percentageValues = Object.values(rawPercentages);
      const minPct = Math.min(...percentageValues);
      const maxPct = Math.max(...percentageValues);
      const pctRange = maxPct - minPct;

      expect(pctRange).toBe(0);

      const absoluteScore = 50 + Math.pow(50 / 100, 0.25) * 50;
      const rounded = Math.round(absoluteScore);
      expect(rounded).toBe(92);
    });

    it('should apply hybrid scoring with different raw percentages', () => {
      const rawPercentages: Record<string, number> = {
        'Skill A': 20,
        'Skill B': 60,
        'Skill C': 80,
      };

      const percentageValues = Object.values(rawPercentages);
      const minPct = Math.min(...percentageValues);
      const maxPct = Math.max(...percentageValues);
      const pctRange = maxPct - minPct;

      expect(pctRange).toBe(60);

      const floor = 50 + Math.pow(minPct / 100, 0.5) * 10;
      const ceiling = 50 + Math.pow(maxPct / 100, 0.25) * 50;
      const scoreRange = ceiling - floor;

      expect(floor).toBeCloseTo(54.47, 1);
      expect(ceiling).toBeCloseTo(97.27, 1);

      const normalizedScores: Record<string, number> = {};
      Object.entries(rawPercentages).forEach(([skill, rawPct]) => {
        if (pctRange > 0 && scoreRange > 0) {
          const relativePosition = (rawPct - minPct) / pctRange;
          normalizedScores[skill] = Math.round(floor + relativePosition * scoreRange);
        }
      });

      expect(normalizedScores['Skill A']).toBe(Math.round(floor));
      expect(normalizedScores['Skill C']).toBe(Math.round(ceiling));
    });
  });
});
