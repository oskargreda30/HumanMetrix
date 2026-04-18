import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
const mockSession = vi.hoisted(() => vi.fn((_req: any, _res: any, next: any) => next()));
vi.mock('express-session', () => ({ default: vi.fn(() => mockSession) }));

const mockPgStoreInstance = vi.hoisted(() => ({ on: vi.fn() }));
const MockPgStoreClass = vi.hoisted(() => vi.fn(() => mockPgStoreInstance));
vi.mock('connect-pg-simple', () => ({ default: vi.fn(() => MockPgStoreClass) }));

vi.mock('../../server/db', () => ({ pool: {} }));

const mockStorage = vi.hoisted(() => ({
  getUser: vi.fn(),
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  createFreeAssessmentsForUser: vi.fn(),
  getUserByAutoLoginToken: vi.fn(),
  clearAutoLoginToken: vi.fn(),
}));
vi.mock('../../server/storage', () => ({ storage: mockStorage }));

vi.mock('../../server/security-monitor', () => ({
  trackFailedLogin: vi.fn(),
  clearFailedLoginAttempts: vi.fn(),
}));

import { isAuthenticated, populateUser, setSameSiteNone } from '../../server/auth';

function makeReq(overrides: Record<string, any> = {}): any {
  return {
    session: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    body: {},
    headers: {},
    ...overrides,
  };
}

function makeRes(): any {
  const res: any = {
    statusCode: 200,
    _json: null,
    status: vi.fn(function (code: number) { res.statusCode = code; return res; }),
    json: vi.fn(function (data: any) { res._json = data; return res; }),
  };
  return res;
}


describe('isAuthenticated middleware (real server/auth.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when session has no userId', async () => {
    const req = makeReq({ session: {} });
    const res = makeRes();
    const next = vi.fn();

    await isAuthenticated(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res._json).toMatchObject({ message: 'Not authenticated' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when userId present but user not found in storage', async () => {
    mockStorage.getUser.mockResolvedValue(undefined);
    const req = makeReq({ session: { userId: 'ghost-id' } });
    const res = makeRes();
    const next = vi.fn();

    await isAuthenticated(req, res, next);

    expect(mockStorage.getUser).toHaveBeenCalledWith('ghost-id');
    expect(res.statusCode).toBe(401);
    expect(res._json).toMatchObject({ message: 'User not found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches user to request and calls next() for valid session', async () => {
    const user = { id: 'user-1', email: 'alice@example.com', role: 'candidate' };
    mockStorage.getUser.mockResolvedValue(user);
    const req = makeReq({ session: { userId: 'user-1' } });
    const res = makeRes();
    const next = vi.fn();

    await isAuthenticated(req, res, next);

    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it('does not call next() after sending 401 (ensures no double response)', async () => {
    const req = makeReq({ session: {} });
    const res = makeRes();
    const next = vi.fn();

    await isAuthenticated(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledOnce();
  });
});

describe('populateUser middleware (real server/auth.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next() without touching storage when session has no userId', async () => {
    const req = makeReq({ session: {} });
    const res = makeRes();
    const next = vi.fn();

    await populateUser(req, res, next);

    expect(mockStorage.getUser).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeUndefined();
  });

  it('populates req.user and calls next() when userId is valid', async () => {
    const user = { id: 'user-2', email: 'bob@example.com', role: 'partner_admin' };
    mockStorage.getUser.mockResolvedValue(user);
    const req = makeReq({ session: { userId: 'user-2' } });
    const res = makeRes();
    const next = vi.fn();

    await populateUser(req, res, next);

    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledOnce();
  });

  it('still calls next() when userId is set but user is not found (non-blocking)', async () => {
    mockStorage.getUser.mockResolvedValue(undefined);
    const req = makeReq({ session: { userId: 'deleted-user' } });
    const res = makeRes();
    const next = vi.fn();

    await populateUser(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeUndefined();
  });
});

describe('setSameSiteNone helper (real server/auth.ts)', () => {
  it('sets sameSite to none on session cookie when cookie exists', () => {
    const req = makeReq({ session: { cookie: { sameSite: 'lax' } } });
    const res = makeRes();
    const next = vi.fn();

    setSameSiteNone(req, res, next);

    expect(req.session.cookie.sameSite).toBe('none');
    expect(next).toHaveBeenCalledOnce();
  });

  it('still calls next() when session has no cookie property', () => {
    const req = makeReq({ session: {} });
    const res = makeRes();
    const next = vi.fn();

    setSameSiteNone(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

describe('bcrypt password operations used by auth flow', () => {
  it('hashes and verifies a password correctly (underlying crypto used by login)', async () => {
    const plaintext = 'S3cur3P@ssw0rd!';
    const hash = await bcrypt.hash(plaintext, 10);

    expect(hash).not.toBe(plaintext);
    expect(hash).toMatch(/^\$2[aby]\$/);

    const valid = await bcrypt.compare(plaintext, hash);
    expect(valid).toBe(true);

    const invalid = await bcrypt.compare('wrongpassword', hash);
    expect(invalid).toBe(false);
  });

  it('different bcrypt calls produce different salts (no hash reuse)', async () => {
    const hash1 = await bcrypt.hash('password', 10);
    const hash2 = await bcrypt.hash('password', 10);
    expect(hash1).not.toBe(hash2);
  });
});

