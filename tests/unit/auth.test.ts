import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSessionMiddleware = vi.fn((_req: any, _res: any, next: any) => next());
const mockSession = vi.hoisted(() => vi.fn(() => mockSessionMiddleware));

const mockPgStoreInstance = vi.hoisted(() => ({
  on: vi.fn(),
}));
const MockPgStoreClass = vi.hoisted(() => vi.fn(() => mockPgStoreInstance));
const mockConnectPg = vi.hoisted(() => vi.fn(() => MockPgStoreClass));

vi.mock('express-session', () => ({
  default: mockSession,
}));

vi.mock('connect-pg-simple', () => ({
  default: mockConnectPg,
}));

vi.mock('../../server/db', () => ({
  pool: { mockPool: true },
}));

const mockBcrypt = vi.hoisted(() => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));
vi.mock('bcryptjs', () => ({
  default: mockBcrypt,
}));

const mockStorage = vi.hoisted(() => ({
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  getUserByAutoLoginToken: vi.fn(),
  clearAutoLoginToken: vi.fn(),
  createFreeAssessmentsForUser: vi.fn(),
  setResetToken: vi.fn(),
  getUserByResetToken: vi.fn(),
  updatePassword: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock('../../server/storage', () => ({
  storage: mockStorage,
}));

const mockIsValidEmail = vi.hoisted(() => vi.fn());
const mockIsValidName = vi.hoisted(() => vi.fn());
const mockNormalizeEmail = vi.hoisted(() => vi.fn());
vi.mock('@shared/validation', () => ({
  isValidEmail: mockIsValidEmail,
  isValidName: mockIsValidName,
  normalizeEmail: mockNormalizeEmail,
}));

const mockTrackFailedLogin = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockClearFailedLoginAttempts = vi.hoisted(() => vi.fn());
vi.mock('../../server/security-monitor', () => ({
  trackFailedLogin: mockTrackFailedLogin,
  clearFailedLoginAttempts: mockClearFailedLoginAttempts,
}));

const mockSendPasswordResetEmail = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('../../server/email', () => ({
  sendPasswordResetEmail: mockSendPasswordResetEmail,
}));

const intervalCapture = vi.hoisted(() => {
  const holder: { cb: (() => void) | null } = { cb: null };
  const _orig = globalThis.setInterval;
  globalThis.setInterval = ((fn: any, ms: any) => {
    if (ms === 60000) {
      holder.cb = fn;
    }
    return 999 as any;
  }) as any;
  return { holder, restore: () => { globalThis.setInterval = _orig; } };
});

import { getSession, setupAuth, isAuthenticated, populateUser } from '../../server/auth';

intervalCapture.restore();

function createMockReq(overrides: any = {}) {
  const session: any = {
    userId: undefined,
    id: 'test-session-id',
    save: vi.fn((cb: any) => cb(null)),
    destroy: vi.fn((cb: any) => cb(null)),
    regenerate: vi.fn((cb: any) => cb(null)),
  };
  return {
    body: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    session,
    secure: false,
    path: '/test',
    get: vi.fn(),
    ...overrides,
  };
}

function createMockRes() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
}

const mockUser = {
  id: 1,
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  passwordHash: 'hashed-password',
  profileImageUrl: null,
  resetToken: null,
  resetTokenExpiry: null,
  autoLoginToken: null,
  autoLoginTokenExpiry: null,
};

describe('Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsValidEmail.mockReturnValue(true);
    mockIsValidName.mockReturnValue(true);
    mockNormalizeEmail.mockImplementation((e: string) => e.toLowerCase());
  });

  describe('setInterval cleanup', () => {
    it('captured interval callback exists', () => {
      expect(intervalCapture.holder.cb).toBeDefined();
    });

    it('runs cleanup on empty map without errors', () => {
      intervalCapture.holder.cb!();
    });

    it('removes expired entries when interval fires with future time', async () => {
      const appForCleanup: any = {
        set: vi.fn(),
        use: vi.fn(),
        post: vi.fn(),
        get: vi.fn(),
      };
      await setupAuth(appForCleanup);

      const loginHandler = appForCleanup.post.mock.calls.find(
        (c: any[]) => c[0] === '/api/login'
      )?.[1];

      const req = createMockReq({ body: { email: 'cleanup-entry@test.com', password: 'pass' } });
      const res = createMockRes();
      mockStorage.getUserByEmail.mockResolvedValue(null);
      await loginHandler(req, res);

      const futureTime = Date.now() + 20 * 60 * 1000;
      const spy = vi.spyOn(Date, 'now').mockReturnValue(futureTime);
      try {
        intervalCapture.holder.cb!();
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('checkAuthRateLimit - expired entry resets', () => {
    it('resets count when entry has expired resetTime', async () => {
      const appForSetup: any = {
        set: vi.fn(),
        use: vi.fn(),
        post: vi.fn(),
        get: vi.fn(),
      };
      await setupAuth(appForSetup);

      const loginHandler = appForSetup.post.mock.calls.find(
        (c: any[]) => c[0] === '/api/login'
      )?.[1];

      const req1 = createMockReq({ body: { email: 'expiry-rl-new@test.com', password: 'p' } });
      const res1 = createMockRes();
      mockStorage.getUserByEmail.mockResolvedValue(null);
      await loginHandler(req1, res1);

      const realNow = Date.now();
      const spy = vi.spyOn(Date, 'now').mockReturnValue(realNow + 16 * 60 * 1000);

      const req2 = createMockReq({ body: { email: 'expiry-rl-new@test.com', password: 'p' } });
      const res2 = createMockRes();
      await loginHandler(req2, res2);
      expect(res2.status).toHaveBeenCalledWith(401);
      spy.mockRestore();
    });
  });

  describe('getSession()', () => {
    it('creates session with production mode logging', () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      getSession();

      expect(mockConnectPg).toHaveBeenCalled();
      expect(MockPgStoreClass).toHaveBeenCalledWith(
        expect.objectContaining({
          createTableIfMissing: true,
          tableName: 'sessions',
        })
      );
      expect(mockPgStoreInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockSession).toHaveBeenCalledWith(
        expect.objectContaining({
          resave: false,
          saveUninitialized: false,
          cookie: expect.objectContaining({
            httpOnly: true,
            secure: true,
            sameSite: 'none',
          }),
        })
      );

      consoleSpy.mockRestore();
      process.env.NODE_ENV = origEnv;
    });

    it('creates session without production logging when not production', () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      getSession();

      expect(mockSession).toHaveBeenCalled();

      process.env.NODE_ENV = origEnv;
    });

    it('session store error handler logs error', () => {
      getSession();
      const errorHandler = mockPgStoreInstance.on.mock.calls.find(
        (c: any[]) => c[0] === 'error'
      )?.[1];
      expect(errorHandler).toBeDefined();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      errorHandler(new Error('store error'));
      consoleSpy.mockRestore();
    });
  });

  describe('setupAuth()', () => {
    let app: any;
    let routes: Record<string, any>;
    let middlewares: any[];

    beforeEach(async () => {
      routes = {};
      middlewares = [];
      app = {
        set: vi.fn(),
        use: vi.fn((...args: any[]) => {
          if (typeof args[0] === 'function') {
            middlewares.push(args[0]);
          }
        }),
        post: vi.fn((path: string, handler: any) => {
          routes[`POST ${path}`] = handler;
        }),
        get: vi.fn((path: string, handler: any) => {
          routes[`GET ${path}`] = handler;
        }),
      };

      await setupAuth(app);
    });

    it('sets trust proxy and registers routes', () => {
      expect(app.set).toHaveBeenCalledWith('trust proxy', 1);
      expect(routes['POST /api/login']).toBeDefined();
      expect(routes['POST /api/signup']).toBeDefined();
      expect(routes['POST /api/logout']).toBeDefined();
      expect(routes['POST /api/request-password-reset']).toBeDefined();
      expect(routes['POST /api/reset-password']).toBeDefined();
      expect(routes['POST /api/change-password']).toBeDefined();
      expect(routes['POST /api/auth/auto-login']).toBeDefined();
    });

    describe('proxy warning middleware', () => {
      it('warns in production when not secure and no https header', () => {
        const origEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const proxyMiddleware = middlewares[middlewares.length - 1];
        const req = createMockReq({ secure: false });
        req.get.mockReturnValue(undefined);
        const res = createMockRes();
        const next = vi.fn();

        proxyMiddleware(req, res, next);
        expect(next).toHaveBeenCalled();

        consoleSpy.mockRestore();
        process.env.NODE_ENV = origEnv;
      });

      it('does not warn in non-production', () => {
        const origEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const proxyMiddleware = middlewares[middlewares.length - 1];
        const req = createMockReq({ secure: false });
        req.get.mockReturnValue(undefined);
        const res = createMockRes();
        const next = vi.fn();

        proxyMiddleware(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
        process.env.NODE_ENV = origEnv;
      });

      it('does not warn in production when secure', () => {
        const origEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const proxyMiddleware = middlewares[middlewares.length - 1];
        const req = createMockReq({ secure: true });
        const res = createMockRes();
        const next = vi.fn();

        proxyMiddleware(req, res, next);
        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
        process.env.NODE_ENV = origEnv;
      });

      it('does not warn in production when X-Forwarded-Proto is https', () => {
        const origEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const proxyMiddleware = middlewares[middlewares.length - 1];
        const req = createMockReq({ secure: false });
        req.get.mockImplementation((header: string) => {
          if (header === 'X-Forwarded-Proto') return 'https';
          return undefined;
        });
        const res = createMockRes();
        const next = vi.fn();

        proxyMiddleware(req, res, next);
        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
        process.env.NODE_ENV = origEnv;
      });
    });

    describe('POST /api/login', () => {
      const getHandler = () => routes['POST /api/login'];

      it('returns 400 when email or password missing', async () => {
        const req = createMockReq({ body: {} });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Email and password required' });
      });

      it('returns 400 when email missing', async () => {
        const req = createMockReq({ body: { password: 'pass' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
      });

      it('returns 400 when password missing', async () => {
        const req = createMockReq({ body: { email: 'test@test.com' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
      });

      it('returns 400 for invalid email format', async () => {
        mockIsValidEmail.mockReturnValue(false);
        const req = createMockReq({ body: { email: 'bad', password: 'pass' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email format' });
      });

      it('returns 429 when rate limited', async () => {
        const handler = getHandler();
        for (let i = 0; i < 16; i++) {
          const req = createMockReq({ body: { email: 'ratelimit@test.com', password: 'pass' } });
          const res = createMockRes();
          mockStorage.getUserByEmail.mockResolvedValue(null);
          await handler(req, res);
        }
        const req = createMockReq({ body: { email: 'ratelimit@test.com', password: 'pass' } });
        const res = createMockRes();
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith({ message: 'Too many login attempts. Please try again later.' });
      });

      it('returns 401 when user not found', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(null);
        const req = createMockReq({ body: { email: 'nouser@test.com', password: 'pass' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
        expect(mockTrackFailedLogin).toHaveBeenCalled();
      });

      it('returns 401 when password is wrong', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(mockUser);
        mockBcrypt.compare.mockResolvedValue(false);
        const req = createMockReq({ body: { email: 'test@example.com', password: 'wrong' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(mockTrackFailedLogin).toHaveBeenCalled();
      });

      it('returns user data on successful login', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(mockUser);
        mockBcrypt.compare.mockResolvedValue(true);
        const req = createMockReq({ body: { email: 'test@example.com', password: 'correct' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.json).toHaveBeenCalledWith({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
        });
        expect(req.session.userId).toBe(mockUser.id);
        expect(req.session.save).toHaveBeenCalled();
        expect(mockClearFailedLoginAttempts).toHaveBeenCalledWith('test@example.com');
      });

      it('handles session save error during login', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(mockUser);
        mockBcrypt.compare.mockResolvedValue(true);
        const req = createMockReq({ body: { email: 'test@example.com', password: 'correct' } });
        req.session.save = vi.fn((cb: any) => cb(new Error('save failed')));
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Login failed' });
      });

      it('returns 500 on unexpected error', async () => {
        mockStorage.getUserByEmail.mockRejectedValue(new Error('db error'));
        const req = createMockReq({ body: { email: 'test2@example.com', password: 'pass' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Login failed' });
      });

      it('uses socket remoteAddress when ip is undefined', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(null);
        const req = createMockReq({
          body: { email: 'socketip@test.com', password: 'pass' },
          ip: undefined,
          socket: { remoteAddress: '192.168.1.1' },
        });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
      });

      it('uses "unknown" when ip and socket are unavailable', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(null);
        const req = createMockReq({
          body: { email: 'noip@test.com', password: 'pass' },
          ip: undefined,
          socket: {},
        });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
      });

      it('wrong password with socket.remoteAddress for failed login tracking', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(mockUser);
        mockBcrypt.compare.mockResolvedValue(false);
        const req = createMockReq({
          body: { email: 'wrongpw-noip@test.com', password: 'wrong' },
          ip: undefined,
          socket: { remoteAddress: '10.0.0.5' },
        });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(mockTrackFailedLogin).toHaveBeenCalledWith('wrongpw-noip@test.com', '10.0.0.5');
      });

      it('user not found with socket.remoteAddress for failed login tracking', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(null);
        const req = createMockReq({
          body: { email: 'notfound-noip@test.com', password: 'pass' },
          ip: undefined,
          socket: { remoteAddress: '10.0.0.6' },
        });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(mockTrackFailedLogin).toHaveBeenCalledWith('notfound-noip@test.com', '10.0.0.6');
      });
    });

    describe('POST /api/auth/auto-login', () => {
      const getHandler = () => routes['POST /api/auth/auto-login'];

      it('returns 400 when token missing', async () => {
        const req = createMockReq({ body: {} });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Token required' });
      });

      it('returns 400 when token is not a string', async () => {
        const req = createMockReq({ body: { token: 123 } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
      });

      it('returns 401 when user not found by token', async () => {
        mockStorage.getUserByAutoLoginToken.mockResolvedValue(null);
        const req = createMockReq({ body: { token: 'invalid-token' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired login link' });
      });

      it('returns 401 when token is expired', async () => {
        const expiredUser = {
          ...mockUser,
          autoLoginTokenExpiry: new Date(Date.now() - 10000).toISOString(),
        };
        mockStorage.getUserByAutoLoginToken.mockResolvedValue(expiredUser);
        mockStorage.clearAutoLoginToken.mockResolvedValue(undefined);
        const req = createMockReq({ body: { token: 'expired-token' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(mockStorage.clearAutoLoginToken).toHaveBeenCalledWith(mockUser.id);
      });

      it('returns user data on successful auto-login', async () => {
        const validUser = {
          ...mockUser,
          autoLoginTokenExpiry: new Date(Date.now() + 60000).toISOString(),
        };
        mockStorage.getUserByAutoLoginToken.mockResolvedValue(validUser);
        mockStorage.clearAutoLoginToken.mockResolvedValue(undefined);
        const req = createMockReq({ body: { token: 'valid-token' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.json).toHaveBeenCalledWith({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
        });
        expect(mockStorage.clearAutoLoginToken).toHaveBeenCalledWith(mockUser.id);
        expect(req.session.save).toHaveBeenCalled();
      });

      it('succeeds when autoLoginTokenExpiry is null (no expiry)', async () => {
        const noExpiryUser = {
          ...mockUser,
          autoLoginTokenExpiry: null,
        };
        mockStorage.getUserByAutoLoginToken.mockResolvedValue(noExpiryUser);
        mockStorage.clearAutoLoginToken.mockResolvedValue(undefined);
        const req = createMockReq({ body: { token: 'no-expiry-token' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: mockUser.id }));
      });

      it('handles session save error during auto-login', async () => {
        const validUser = {
          ...mockUser,
          autoLoginTokenExpiry: new Date(Date.now() + 60000).toISOString(),
        };
        mockStorage.getUserByAutoLoginToken.mockResolvedValue(validUser);
        mockStorage.clearAutoLoginToken.mockResolvedValue(undefined);
        const req = createMockReq({ body: { token: 'valid-token' } });
        req.session.save = vi.fn((cb: any) => cb(new Error('save error')));
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Auto-login failed' });
      });

      it('returns 500 on unexpected error', async () => {
        mockStorage.getUserByAutoLoginToken.mockRejectedValue(new Error('db err'));
        const req = createMockReq({ body: { token: 'crash-token' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Auto-login failed' });
      });
    });

    describe('POST /api/signup', () => {
      const getHandler = () => routes['POST /api/signup'];

      it('returns 400 when email or password missing', async () => {
        const req = createMockReq({ body: {} });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Email and password required' });
      });

      it('returns 400 for invalid email', async () => {
        mockIsValidEmail.mockReturnValue(false);
        const req = createMockReq({ body: { email: 'bad', password: 'password123' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email format' });
      });

      it('returns 429 when rate limited', async () => {
        const handler = getHandler();
        for (let i = 0; i < 16; i++) {
          const req = createMockReq({ body: { email: 'signuprl@test.com', password: 'pass' } });
          const res = createMockRes();
          mockStorage.getUserByEmail.mockResolvedValue({ id: 1 });
          await handler(req, res);
        }
        const req = createMockReq({ body: { email: 'signuprl@test.com', password: 'pass' } });
        const res = createMockRes();
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(429);
      });

      it('returns 400 for invalid first name', async () => {
        mockIsValidName.mockReturnValueOnce(false);
        const req = createMockReq({
          body: { email: 'test@test.com', password: 'password123', firstName: '<script>' },
        });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid first name format' });
      });

      it('returns 400 for invalid last name', async () => {
        mockIsValidName.mockReturnValueOnce(true).mockReturnValueOnce(false);
        const req = createMockReq({
          body: { email: 'test@test.com', password: 'password123', firstName: 'John', lastName: '<script>' },
        });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid last name format' });
      });

      it('returns 400 when email already registered', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(mockUser);
        const req = createMockReq({
          body: { email: 'test@example.com', password: 'password123' },
        });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Email already registered' });
      });

      it('creates user and returns data on success', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(null);
        mockBcrypt.hash.mockResolvedValue('hashed');
        mockStorage.createUser.mockResolvedValue(mockUser);
        mockStorage.createFreeAssessmentsForUser.mockResolvedValue(undefined);
        const req = createMockReq({
          body: { email: 'new@test.com', password: 'password123', firstName: 'New', lastName: 'User' },
        });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 10);
        expect(mockStorage.createUser).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'new@test.com',
            passwordHash: 'hashed',
            firstName: 'New',
            lastName: 'User',
            profileImageUrl: null,
          })
        );
        expect(mockStorage.createFreeAssessmentsForUser).toHaveBeenCalledWith(mockUser.id);
        expect(req.session.regenerate).toHaveBeenCalled();
        expect(req.session.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
        });
      });

      it('creates user without names when not provided', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(null);
        mockBcrypt.hash.mockResolvedValue('hashed');
        mockStorage.createUser.mockResolvedValue(mockUser);
        mockStorage.createFreeAssessmentsForUser.mockResolvedValue(undefined);
        const req = createMockReq({
          body: { email: 'noname@test.com', password: 'password123' },
        });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(mockStorage.createUser).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: null,
            lastName: null,
          })
        );
      });

      it('handles session regenerate error during signup', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(null);
        mockBcrypt.hash.mockResolvedValue('hashed');
        mockStorage.createUser.mockResolvedValue(mockUser);
        mockStorage.createFreeAssessmentsForUser.mockResolvedValue(undefined);
        const req = createMockReq({
          body: { email: 'regen@test.com', password: 'password123' },
        });
        req.session.regenerate = vi.fn((cb: any) => cb(new Error('regenerate failed')));
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Signup failed' });
      });

      it('handles session save error during signup', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(null);
        mockBcrypt.hash.mockResolvedValue('hashed');
        mockStorage.createUser.mockResolvedValue(mockUser);
        mockStorage.createFreeAssessmentsForUser.mockResolvedValue(undefined);
        const req = createMockReq({
          body: { email: 'saveerr@test.com', password: 'password123' },
        });
        req.session.save = vi.fn((cb: any) => cb(new Error('save failed')));
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
      });

      it('returns 500 on unexpected error', async () => {
        mockStorage.getUserByEmail.mockRejectedValue(new Error('db error'));
        const req = createMockReq({
          body: { email: 'crash@test.com', password: 'password123' },
        });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Signup failed' });
      });

      it('uses socket remoteAddress fallback for rate limit ip', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(null);
        mockBcrypt.hash.mockResolvedValue('hashed');
        mockStorage.createUser.mockResolvedValue(mockUser);
        mockStorage.createFreeAssessmentsForUser.mockResolvedValue(undefined);
        const req = createMockReq({
          body: { email: 'socketrl@test.com', password: 'password123' },
          ip: undefined,
          socket: { remoteAddress: '10.0.0.1' },
        });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.json).toHaveBeenCalled();
      });

      it('uses "unknown" fallback when ip and socket.remoteAddress are both undefined', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(null);
        mockBcrypt.hash.mockResolvedValue('hashed');
        mockStorage.createUser.mockResolvedValue(mockUser);
        mockStorage.createFreeAssessmentsForUser.mockResolvedValue(undefined);
        const req = createMockReq({
          body: { email: 'signupnoip@test.com', password: 'password123' },
          ip: undefined,
          socket: {},
        });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.json).toHaveBeenCalled();
      });
    });

    describe('POST /api/logout', () => {
      const getHandler = () => routes['POST /api/logout'];

      it('returns success on logout', () => {
        const req = createMockReq();
        const res = createMockRes();
        getHandler()(req, res);
        expect(req.session.destroy).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
      });

      it('returns 500 on destroy error', () => {
        const req = createMockReq();
        req.session.destroy = vi.fn((cb: any) => cb(new Error('destroy failed')));
        const res = createMockRes();
        getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Logout failed' });
      });
    });

    describe('POST /api/request-password-reset', () => {
      const getHandler = () => routes['POST /api/request-password-reset'];

      it('returns 400 when email missing', async () => {
        const req = createMockReq({ body: {} });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Email required' });
      });

      it('returns 400 for invalid email', async () => {
        mockIsValidEmail.mockReturnValue(false);
        const req = createMockReq({ body: { email: 'bad' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email format' });
      });

      it('returns generic message when user not found (security)', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(null);
        const req = createMockReq({ body: { email: 'noone@test.com' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.json).toHaveBeenCalledWith({ message: 'If the email exists, a reset link has been sent' });
      });

      it('sends reset email when user found', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(mockUser);
        mockStorage.setResetToken.mockResolvedValue(undefined);
        const req = createMockReq({ body: { email: 'test@example.com' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(mockStorage.setResetToken).toHaveBeenCalledWith(
          mockUser.id,
          expect.any(String),
          expect.any(Date)
        );
        expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
          mockUser.email,
          mockUser.firstName,
          expect.any(String)
        );
        expect(res.json).toHaveBeenCalledWith({ message: 'If the email exists, a reset link has been sent' });
      });

      it('uses "User" as fallback name when firstName is null', async () => {
        const userNoName = { ...mockUser, firstName: null };
        mockStorage.getUserByEmail.mockResolvedValue(userNoName);
        mockStorage.setResetToken.mockResolvedValue(undefined);
        const req = createMockReq({ body: { email: 'test@example.com' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
          userNoName.email,
          'User',
          expect.any(String)
        );
      });

      it('returns 500 on unexpected error', async () => {
        mockStorage.getUserByEmail.mockRejectedValue(new Error('db error'));
        const req = createMockReq({ body: { email: 'err@test.com' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Failed to process password reset request' });
      });
    });

    describe('POST /api/reset-password', () => {
      const getHandler = () => routes['POST /api/reset-password'];

      it('returns 400 when token or newPassword missing', async () => {
        const req = createMockReq({ body: {} });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Token and new password required' });
      });

      it('returns 400 when token missing', async () => {
        const req = createMockReq({ body: { newPassword: 'newpass123' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
      });

      it('returns 400 when password too short', async () => {
        const req = createMockReq({ body: { token: 'valid', newPassword: 'short' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Password must be at least 8 characters' });
      });

      it('returns 400 for invalid/missing reset token', async () => {
        mockStorage.getUserByResetToken.mockResolvedValue(null);
        const req = createMockReq({ body: { token: 'invalid', newPassword: 'newpassword123' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired reset token' });
      });

      it('returns 400 for user without resetTokenExpiry', async () => {
        mockStorage.getUserByResetToken.mockResolvedValue({ ...mockUser, resetTokenExpiry: null });
        const req = createMockReq({ body: { token: 'tok', newPassword: 'newpassword123' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired reset token' });
      });

      it('returns 400 when token is expired', async () => {
        const expiredUser = {
          ...mockUser,
          resetTokenExpiry: new Date(Date.now() - 10000),
        };
        mockStorage.getUserByResetToken.mockResolvedValue(expiredUser);
        const req = createMockReq({ body: { token: 'expired', newPassword: 'newpassword123' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Reset token has expired' });
      });

      it('resets password successfully', async () => {
        const validUser = {
          ...mockUser,
          resetTokenExpiry: new Date(Date.now() + 60000),
        };
        mockStorage.getUserByResetToken.mockResolvedValue(validUser);
        mockBcrypt.hash.mockResolvedValue('newhashed');
        mockStorage.updatePassword.mockResolvedValue(undefined);
        const req = createMockReq({ body: { token: 'valid', newPassword: 'newpassword123' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
        expect(mockStorage.updatePassword).toHaveBeenCalledWith(validUser.id, 'newhashed');
        expect(res.json).toHaveBeenCalledWith({ message: 'Password reset successfully' });
      });

      it('returns 500 on unexpected error', async () => {
        mockStorage.getUserByResetToken.mockRejectedValue(new Error('db error'));
        const req = createMockReq({ body: { token: 'x', newPassword: 'newpassword123' } });
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Failed to reset password' });
      });
    });

    describe('POST /api/change-password', () => {
      const getHandler = () => routes['POST /api/change-password'];

      it('returns 401 when not authenticated', async () => {
        const req = createMockReq();
        req.session.userId = undefined;
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
      });

      it('returns 400 when currentPassword or newPassword missing', async () => {
        const req = createMockReq({ body: {} });
        req.session.userId = 1;
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Current and new password required' });
      });

      it('returns 400 when new password too short', async () => {
        const req = createMockReq({
          body: { currentPassword: 'old', newPassword: 'short' },
        });
        req.session.userId = 1;
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'New password must be at least 8 characters' });
      });

      it('returns 401 when user not found', async () => {
        mockStorage.getUser.mockResolvedValue(null);
        const req = createMockReq({
          body: { currentPassword: 'oldpass', newPassword: 'newpassword123' },
        });
        req.session.userId = 999;
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
      });

      it('returns 401 when current password is wrong', async () => {
        mockStorage.getUser.mockResolvedValue(mockUser);
        mockBcrypt.compare.mockResolvedValue(false);
        const req = createMockReq({
          body: { currentPassword: 'wrongold', newPassword: 'newpassword123' },
        });
        req.session.userId = 1;
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Current password is incorrect' });
      });

      it('changes password successfully', async () => {
        mockStorage.getUser.mockResolvedValue(mockUser);
        mockBcrypt.compare.mockResolvedValue(true);
        mockBcrypt.hash.mockResolvedValue('newhash');
        mockStorage.updatePassword.mockResolvedValue(undefined);
        const req = createMockReq({
          body: { currentPassword: 'correct', newPassword: 'newpassword123' },
        });
        req.session.userId = 1;
        const res = createMockRes();
        await getHandler()(req, res);
        expect(mockBcrypt.compare).toHaveBeenCalledWith('correct', mockUser.passwordHash);
        expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
        expect(mockStorage.updatePassword).toHaveBeenCalledWith(mockUser.id, 'newhash');
        expect(res.json).toHaveBeenCalledWith({ message: 'Password changed successfully' });
      });

      it('returns 500 on unexpected error', async () => {
        mockStorage.getUser.mockRejectedValue(new Error('db error'));
        const req = createMockReq({
          body: { currentPassword: 'old', newPassword: 'newpassword123' },
        });
        req.session.userId = 1;
        const res = createMockRes();
        await getHandler()(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Failed to change password' });
      });
    });
  });

  describe('isAuthenticated middleware', () => {
    it('returns 401 when no userId in session', async () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();
      await isAuthenticated(req as any, res as any, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when user not found in storage', async () => {
      mockStorage.getUser.mockResolvedValue(null);
      const req = createMockReq();
      req.session.userId = 999;
      const res = createMockRes();
      const next = vi.fn();
      await isAuthenticated(req as any, res as any, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
      expect(next).not.toHaveBeenCalled();
    });

    it('attaches user and calls next when authenticated', async () => {
      mockStorage.getUser.mockResolvedValue(mockUser);
      const req = createMockReq();
      req.session.userId = 1;
      const res = createMockRes();
      const next = vi.fn();
      await isAuthenticated(req as any, res as any, next);
      expect((req as any).user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('populateUser middleware', () => {
    it('calls next without setting user when no userId in session', async () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();
      await populateUser(req as any, res as any, next);
      expect((req as any).user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('populates user when userId exists and user found', async () => {
      mockStorage.getUser.mockResolvedValue(mockUser);
      const req = createMockReq();
      req.session.userId = 1;
      const res = createMockRes();
      const next = vi.fn();
      await populateUser(req as any, res as any, next);
      expect((req as any).user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('calls next without user when userId exists but user not found', async () => {
      mockStorage.getUser.mockResolvedValue(null);
      const req = createMockReq();
      req.session.userId = 999;
      const res = createMockRes();
      const next = vi.fn();
      await populateUser(req as any, res as any, next);
      expect((req as any).user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });
});
